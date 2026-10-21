import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ENCODING = 'utf8';

// BUG-007: PBKDF2 parameters — 100k iterations meets OWASP 2023 recommendation
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32; // 256 bits for AES-256
const PBKDF2_DIGEST = 'sha512';

// BUG-007-MIGRATION: KDF version prefix for detecting encryption version
const KDF_VERSION_PREFIX = 'v2:';

// ═══════════════════════════════════════════════════════════════════════════
// KEY DERIVATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BUG-007: Derive a 256-bit key from a zone secret using PBKDF2.
 * Uses zone ID as salt (deterministic — same zone always produces the same key).
 * 100k iterations + SHA-512 meets OWASP 2023 recommendations.
 */
function deriveKeyPBKDF2(zoneSecretKey: string, zoneId?: string): Buffer {
  if (!zoneSecretKey || zoneSecretKey.trim().length === 0) {
    throw new Error('zoneSecretKey must not be empty');
  }

  const salt = zoneId
    ? crypto.createHash('sha256').update(`idop-b2b-salt:${zoneId}`).digest()
    : crypto.createHash('sha256').update('idop-b2b-salt:default').digest();

  return crypto.pbkdf2Sync(
    zoneSecretKey,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEY_LENGTH,
    PBKDF2_DIGEST,
  );
}

/**
 * BUG-007-MIGRATION: Legacy SHA-256 key derivation (insecure, for decrypting old bids only).
 * DO NOT use for new encryptions.
 */
function deriveKeyLegacySHA256(zoneSecretKey: string): Buffer {
  return crypto.createHash('sha256').update(zoneSecretKey).digest();
}

// ═══════════════════════════════════════════════════════════════════════════
// ENCRYPTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Encrypt bid financial data using AES-256-GCM with PBKDF2 key derivation.
 * Format: v2:iv:tag:ciphertext (v2 prefix indicates PBKDF2 encryption).
 */
export function encryptBidFinancials(
  data: Record<string, unknown>,
  zoneSecretKey: string,
  zoneId?: string,
): string {
  const key = deriveKeyPBKDF2(zoneSecretKey, zoneId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;

  const plaintext = JSON.stringify(data);
  let encrypted = cipher.update(plaintext, ENCODING, 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // BUG-007-MIGRATION: v2 prefix identifies PBKDF2-encrypted data
  return `${KDF_VERSION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DECRYPTION (backward-compatible)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Detect KDF version from encrypted data format.
 * - v2: prefix = PBKDF2 (new, secure)
 * - no prefix = legacy SHA-256 (old, insecure)
 */
export function detectKdfVersion(encryptedData: string): 'v1' | 'v2' {
  return encryptedData.startsWith(KDF_VERSION_PREFIX) ? 'v2' : 'v1';
}

/**
 * Decrypt bid financial data with automatic KDF version detection.
 * Supports both v1 (legacy SHA-256) and v2 (PBKDF2) encryption.
 * Only called after RFQ deadline has passed (bids unsealed).
 */
export function decryptBidFinancials(
  encryptedData: string,
  zoneSecretKey: string,
  zoneId?: string,
): Record<string, unknown> {
  const version = detectKdfVersion(encryptedData);

  if (version === 'v2') {
    // BUG-007: New PBKDF2 encryption
    return decryptV2(encryptedData, zoneSecretKey, zoneId);
  } else {
    // BUG-007-MIGRATION: Legacy SHA-256 encryption
    return decryptV1(encryptedData, zoneSecretKey);
  }
}

/**
 * Decrypt v2 (PBKDF2) encrypted data.
 * Format: v2:iv:tag:ciphertext
 */
function decryptV2(
  encryptedData: string,
  zoneSecretKey: string,
  zoneId?: string,
): Record<string, unknown> {
  // Remove v2 prefix
  const raw = encryptedData.slice(KDF_VERSION_PREFIX.length);
  const key = deriveKeyPBKDF2(zoneSecretKey, zoneId);
  return decryptAesGcm(raw, key);
}

/**
 * BUG-007-MIGRATION: Decrypt v1 (legacy SHA-256) encrypted data.
 * Format: iv:tag:ciphertext (no prefix)
 * DO NOT use for new encryptions.
 */
function decryptV1(
  encryptedData: string,
  zoneSecretKey: string,
): Record<string, unknown> {
  const key = deriveKeyLegacySHA256(zoneSecretKey);
  return decryptAesGcm(encryptedData, key);
}

/**
 * Common AES-256-GCM decryption logic.
 */
function decryptAesGcm(raw: string, key: Buffer): Record<string, unknown> {
  const parts = raw.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertext, 'hex', ENCODING);
  decrypted += decipher.final(ENCODING);

  return JSON.parse(decrypted);
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * BUG-007-MIGRATION: Re-encrypt data from v1 (SHA-256) to v2 (PBKDF2).
 * Used by migration script to upgrade existing sealed bids.
 */
export function reencryptV1ToV2(
  encryptedData: string,
  zoneSecretKey: string,
  zoneId?: string,
): string {
  const version = detectKdfVersion(encryptedData);
  if (version === 'v2') {
    throw new Error('Data is already v2 encrypted');
  }

  // Decrypt with legacy SHA-256
  const plaintext = decryptV1(encryptedData, zoneSecretKey);

  // Re-encrypt with PBKDF2
  return encryptBidFinancials(plaintext, zoneSecretKey, zoneId);
}

/**
 * Check if data needs migration (is still v1).
 */
export function needsMigration(encryptedData: string): boolean {
  return detectKdfVersion(encryptedData) === 'v1';
}

/**
 * Generate a random zone secret key for development/testing.
 */
export function generateZoneSecretKey(): string {
  return crypto.randomBytes(32).toString('hex');
}
