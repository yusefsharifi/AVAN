#!/usr/bin/env ts-node
/**
 * BUG-007-MIGRATION: Re-encrypt existing sealed bids from v1 (SHA-256) to v2 (PBKDF2).
 *
 * Usage:
 *   npx ts-node src/modules/b2b/scripts/migrate-bid-encryption.ts [--dry-run]
 *
 * Environment variables required:
 *   DATABASE_URL — PostgreSQL connection string
 *   BID_ENCRYPTION_SECRET — The zone secret key used for encryption
 *
 * What it does:
 *   1. Finds all bids with encrypted financial data
 *   2. Detects which ones use v1 (legacy SHA-256) encryption
 *   3. Decrypts with old SHA-256 key derivation
 *   4. Re-encrypts with new PBKDF2 key derivation
 *   5. Updates the database record
 *
 * Safety:
 *   - Use --dry-run to preview changes without writing
 *   - Each bid is migrated in a transaction
 *   - Original data is preserved until re-encryption succeeds
 */

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════
// Legacy v1 functions (copied from old implementation for migration)
// ═══════════════════════════════════════════════════════════════════════════

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const ENCODING = 'utf8';
const KDF_VERSION_PREFIX = 'v2:';
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_KEY_LENGTH = 32;
const PBKDF2_DIGEST = 'sha512';

function deriveKeyLegacySHA256(zoneSecretKey: string): Buffer {
  return crypto.createHash('sha256').update(zoneSecretKey).digest();
}

function deriveKeyPBKDF2(zoneSecretKey: string, zoneId?: string): Buffer {
  if (!zoneSecretKey || zoneSecretKey.trim().length === 0) {
    throw new Error('zoneSecretKey must not be empty');
  }
  const salt = zoneId
    ? crypto.createHash('sha256').update(`idop-b2b-salt:${zoneId}`).digest()
    : crypto.createHash('sha256').update('idop-b2b-salt:default').digest();
  return crypto.pbkdf2Sync(zoneSecretKey, salt, PBKDF2_ITERATIONS, PBKDF2_KEY_LENGTH, PBKDF2_DIGEST);
}

function detectKdfVersion(encryptedData: string): 'v1' | 'v2' {
  return encryptedData.startsWith(KDF_VERSION_PREFIX) ? 'v2' : 'v1';
}

function decryptAesGcm(raw: string, key: Buffer): Record<string, unknown> {
  const parts = raw.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted data format');
  const iv = Buffer.from(parts[0], 'hex');
  const tag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
  decipher.setAuthTag(tag);
  let decrypted = decipher.update(ciphertext, 'hex', ENCODING);
  decrypted += decipher.final(ENCODING);
  return JSON.parse(decrypted);
}

function decryptV1(encryptedData: string, zoneSecretKey: string): Record<string, unknown> {
  const key = deriveKeyLegacySHA256(zoneSecretKey);
  return decryptAesGcm(encryptedData, key);
}

function encryptV2(data: Record<string, unknown>, zoneSecretKey: string, zoneId?: string): string {
  const key = deriveKeyPBKDF2(zoneSecretKey, zoneId);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const plaintext = JSON.stringify(data);
  let encrypted = cipher.update(plaintext, ENCODING, 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${KDF_VERSION_PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// Migration Logic
// ═══════════════════════════════════════════════════════════════════════════

interface MigrationResult {
  totalBids: number;
  v1Bids: number;
  v2Bids: number;
  migrated: number;
  failed: number;
  skipped: number;
}

async function migrateBidEncryption(dryRun: boolean = false): Promise<MigrationResult> {
  const zoneSecretKey = process.env.BID_ENCRYPTION_SECRET;
  if (!zoneSecretKey) {
    throw new Error('BID_ENCRYPTION_SECRET environment variable is required');
  }

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('BUG-007 Migration: Re-encrypt sealed bids (SHA-256 → PBKDF2)');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE MIGRATION'}`);
  console.log('');

  // Find all bids with encrypted financial data
  // Note: The exact field name depends on your Prisma schema
  // Adjust 'encryptedFinancials' to match your actual field name
  const bids = await prisma.bid.findMany({
    where: {
      // Only bids that have encrypted data
      // Adjust this filter based on your schema
      id: { not: undefined },
    },
    select: {
      id: true,
      rfqId: true,
      supplierId: true,
      zoneId: true,
      encryptedFinancialData: true,
    },
  });

  const result: MigrationResult = {
    totalBids: bids.length,
    v1Bids: 0,
    v2Bids: 0,
    migrated: 0,
    failed: 0,
    skipped: 0,
  };

  console.log(`Found ${bids.length} total bids`);

  for (const bid of bids) {
    const encryptedData = (bid as any).encryptedFinancialData;
    if (!encryptedData) {
      result.skipped++;
      continue;
    }

    const version = detectKdfVersion(encryptedData);

    if (version === 'v2') {
      result.v2Bids++;
      continue; // Already migrated
    }

    result.v1Bids++;

    try {
      // Decrypt with legacy SHA-256
      const plaintext = decryptV1(encryptedData, zoneSecretKey);

      if (dryRun) {
        console.log(`[DRY RUN] Would migrate bid ${bid.id} (RFQ: ${bid.rfqId})`);
        result.migrated++;
        continue;
      }

      // Re-encrypt with PBKDF2
      const reencrypted = encryptV2(plaintext, zoneSecretKey, bid.zoneId);

      // Update database
      await prisma.bid.update({
        where: { id: bid.id },
        data: {
          encryptedFinancialData: reencrypted,
        } as any,
      });

      console.log(`✅ Migrated bid ${bid.id} (RFQ: ${bid.rfqId})`);
      result.migrated++;
    } catch (error) {
      console.error(`❌ Failed to migrate bid ${bid.id}:`, error);
      result.failed++;
    }
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  try {
    const result = await migrateBidEncryption(dryRun);

    console.log('');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Migration Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total bids:    ${result.totalBids}`);
    console.log(`Already v2:    ${result.v2Bids}`);
    console.log(`Need v1→v2:    ${result.v1Bids}`);
    console.log(`Migrated:      ${result.migrated}`);
    console.log(`Failed:        ${result.failed}`);
    console.log(`Skipped:       ${result.skipped}`);
    console.log('═══════════════════════════════════════════════════════════════');

    if (dryRun) {
      console.log('');
      console.log('⚠️  This was a DRY RUN. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    }

    if (result.failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
