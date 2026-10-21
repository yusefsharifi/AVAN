// ═══════════════════════════════════════════════════════════════════════════════
// M7: Hash Chain Utility — Blockchain-style Integrity
// ═══════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of input string
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generate QR hash for a letter
 * Format: SHA256(registryNumber + zoneId + subject + createdAt)
 */
export function computeLetterQrHash(
  registryNumber: string,
  zoneId: string,
  subject: string,
  createdAt: string,
): string {
  return sha256(`${registryNumber}${zoneId}${subject}${createdAt}`);
}

/**
 * Generate hash chain entry for a letter
 * Genesis: SHA256("GENESIS" + registryNumber + body)
 * Chain: SHA256(previousHash + registryNumber + body)
 */
export function computeLetterHashChain(
  previousHash: string | null | undefined,
  registryNumber: string,
  body: string,
): string {
  if (!previousHash) {
    return sha256(`GENESIS${registryNumber}${body}`);
  }
  return sha256(`${previousHash}${registryNumber}${body}`);
}

/**
 * Generate audit entry hash
 * Format: SHA256(previousEntryHash + action + actorId + timestamp)
 */
export function computeAuditEntryHash(
  previousEntryHash: string | null | undefined,
  action: string,
  actorId: string | null | undefined,
  timestamp: string,
): string {
  const prev = previousEntryHash || 'GENESIS';
  return sha256(`${prev}${action}${actorId || 'SYSTEM'}${timestamp}`);
}

/**
 * Verify a letter's hash chain integrity
 */
export function verifyLetterHashChain(
  letters: Array<{
    hashChain: string | null;
    previousHash: string | null;
    registryNumber: string;
    body: string;
  }>,
): boolean {
  for (let i = 0; i < letters.length; i++) {
    const letter = letters[i];
    const expectedHash = computeLetterHashChain(
      i === 0 ? null : letters[i - 1].hashChain,
      letter.registryNumber,
      letter.body,
    );
    if (letter.hashChain !== expectedHash) {
      return false;
    }
  }
  return true;
}

/**
 * Verify audit entries chain integrity
 */
export function verifyAuditChain(
  entries: Array<{
    hash: string;
    previousHash: string | null;
    action: string;
    actorId: string | null;
    timestamp: Date;
  }>,
): boolean {
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const expectedHash = computeAuditEntryHash(
      i === 0 ? null : entries[i - 1].hash,
      entry.action,
      entry.actorId,
      entry.timestamp.toISOString(),
    );
    if (entry.hash !== expectedHash) {
      return false;
    }
  }
  return true;
}

/**
 * Compute authenticity score for a letter
 * 0-100 score based on:
 * - approvalChain complete: +25
 * - dispatch record exists: +25
 * - hash chain valid: +25
 * - SLA not breached: +25
 */
export function computeAuthenticityScore(params: {
  approvalComplete: boolean;
  hasDispatchRecord: boolean;
  hashChainValid: boolean;
  slaNotBreached: boolean;
}): number {
  let score = 0;
  if (params.approvalComplete) score += 25;
  if (params.hasDispatchRecord) score += 25;
  if (params.hashChainValid) score += 25;
  if (params.slaNotBreached) score += 25;
  return score;
}

/**
 * Generate QR payload for a letter
 * Format: "IDOP:LETTER:{registryNumber}:{qrHash}"
 */
export function generateLetterQrPayload(
  registryNumber: string,
  qrHash: string,
): string {
  return `IDOP:LETTER:${registryNumber}:${qrHash}`;
}
