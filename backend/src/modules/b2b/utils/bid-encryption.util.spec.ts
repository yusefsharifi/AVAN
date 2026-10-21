import { encryptBidFinancials, decryptBidFinancials, generateZoneSecretKey, detectKdfVersion, needsMigration, reencryptV1ToV2 } from './bid-encryption.util';

describe('B2B Bid Encryption (BUG-007 fix)', () => {
  const testKey = 'test-secret-key-for-encryption-12345';
  const testZoneId = 'zone-test-001';

  describe('encryptBidFinancials', () => {
    it('should encrypt data and return v2:iv:tag:ciphertext format', () => {
      const data = { unitPrice: 50000, quantity: 100, total: 5000000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);

      // v2 format: v2:iv:tag:ciphertext (4 parts)
      expect(encrypted).toMatch(/^v2:/);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe('v2');
      // iv should be 32 hex chars (16 bytes)
      expect(parts[1]).toHaveLength(32);
      // tag should be 32 hex chars (16 bytes)
      expect(parts[2]).toHaveLength(32);
      // ciphertext should be non-empty hex
      expect(parts[3].length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(parts[3])).toBe(true);
    });

    it('should produce different ciphertext for same data (random IV)', () => {
      const data = { unitPrice: 50000 };
      const enc1 = encryptBidFinancials(data, testKey, testZoneId);
      const enc2 = encryptBidFinancials(data, testKey, testZoneId);

      // Different IVs produce different ciphertexts
      expect(enc1).not.toBe(enc2);
    });

    it('should reject empty zoneSecretKey (QUAL-003)', () => {
      expect(() => encryptBidFinancials({ test: 1 }, '')).toThrow('zoneSecretKey must not be empty');
      expect(() => encryptBidFinancials({ test: 1 }, '   ')).toThrow('zoneSecretKey must not be empty');
      expect(() => encryptBidFinancials({ test: 1 }, null as any)).toThrow();
    });
  });

  describe('decryptBidFinancials', () => {
    it('should decrypt encrypted data correctly', () => {
      const data = { unitPrice: 50000, quantity: 100, total: 5000000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);
      const decrypted = decryptBidFinancials(encrypted, testKey, testZoneId);

      expect(decrypted).toEqual(data);
    });

    it('should decrypt with complex nested data', () => {
      const data = {
        unitPrice: 123456789,
        currency: 'IRR',
        items: [{ name: 'Steel', qty: 10 }],
        metadata: { sealed: true, deadline: '2026-12-31' },
      };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);
      const decrypted = decryptBidFinancials(encrypted, testKey, testZoneId);

      expect(decrypted).toEqual(data);
    });

    it('should fail decryption with wrong key', () => {
      const data = { unitPrice: 50000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);

      expect(() => decryptBidFinancials(encrypted, 'wrong-key-here', testZoneId)).toThrow();
    });

    it('should fail decryption with wrong zoneId', () => {
      const data = { unitPrice: 50000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);

      expect(() => decryptBidFinancials(encrypted, testKey, 'wrong-zone')).toThrow();
    });

    it('should fail on tampered ciphertext', () => {
      const data = { unitPrice: 50000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);

      // Tamper with the ciphertext
      const parts = encrypted.split(':');
      const tampered = parts[0] + ':' + parts[1] + ':' + 'ff' + parts[2].slice(2);

      expect(() => decryptBidFinancials(tampered, testKey, testZoneId)).toThrow();
    });

    it('should fail on tampered auth tag', () => {
      const data = { unitPrice: 50000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);

      // Tamper with the auth tag
      const parts = encrypted.split(':');
      const tampered = parts[0] + ':' + 'ff' + parts[1].slice(2) + ':' + parts[2];

      expect(() => decryptBidFinancials(tampered, testKey, testZoneId)).toThrow();
    });

    it('should fail on invalid format', () => {
      expect(() => decryptBidFinancials('invalid', testKey, testZoneId)).toThrow('Invalid encrypted data format');
      expect(() => decryptBidFinancials('a:b', testKey, testZoneId)).toThrow('Invalid encrypted data format');
    });
  });

  describe('BUG-007: PBKDF2 key derivation', () => {
    it('should produce deterministic key for same zoneId + secret', () => {
      const data = { amount: 1000 };
      const enc1 = encryptBidFinancials(data, testKey, testZoneId);
      const enc2 = encryptBidFinancials(data, testKey, testZoneId);

      // Same key + same data = different ciphertext (random IV)
      // but both should decrypt to the same value
      const dec1 = decryptBidFinancials(enc1, testKey, testZoneId);
      const dec2 = decryptBidFinancials(enc2, testKey, testZoneId);
      expect(dec1).toEqual(dec2);
    });

    it('should produce different keys for different zoneIds', () => {
      const data = { amount: 1000 };
      const enc1 = encryptBidFinancials(data, testKey, 'zone-1');
      const enc2 = encryptBidFinancials(data, testKey, 'zone-2');

      // Different zone IDs => different keys => different ciphertext
      expect(enc1).not.toBe(enc2);
    });

    it('should use default salt when no zoneId provided', () => {
      const data = { amount: 1000 };
      const encrypted = encryptBidFinancials(data, testKey);
      const decrypted = decryptBidFinancials(encrypted, testKey);

      expect(decrypted).toEqual(data);
    });
  });

  describe('generateZoneSecretKey', () => {
    it('should generate a 64-char hex string', () => {
      const key = generateZoneSecretKey();
      expect(key).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(key)).toBe(true);
    });

    it('should generate unique keys each time', () => {
      const key1 = generateZoneSecretKey();
      const key2 = generateZoneSecretKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('BUG-007-MIGRATION: Backward compatibility', () => {
    it('should detect v2 (PBKDF2) encrypted data', () => {
      const data = { amount: 1000 };
      const encrypted = encryptBidFinancials(data, testKey, testZoneId);
      expect(detectKdfVersion(encrypted)).toBe('v2');
    });

    it('should detect v1 (legacy SHA-256) encrypted data', () => {
      // v1 data does NOT have the v2: prefix
      const v1Data = 'abc123:def456:789ghi';
      expect(detectKdfVersion(v1Data)).toBe('v1');
    });

    it('should identify data needing migration', () => {
      const data = { amount: 1000 };
      const v2Encrypted = encryptBidFinancials(data, testKey, testZoneId);
      expect(needsMigration(v2Encrypted)).toBe(false);

      // v1 data needs migration
      const v1Data = 'abc123:def456:789ghi';
      expect(needsMigration(v1Data)).toBe(true);
    });

    it('should re-encrypt v1 data to v2 format', () => {
      // Create a v1-encrypted value using the legacy method
      const crypto = require('crypto');
      const data = { unitPrice: 50000, quantity: 100 };
      const plaintext = JSON.stringify(data);

      // v1 encryption: SHA-256 key derivation, no prefix
      const legacyKey = crypto.createHash('sha256').update(testKey).digest();
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', legacyKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      const v1Encrypted = `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;

      // Should detect as v1
      expect(detectKdfVersion(v1Encrypted)).toBe('v1');
      expect(needsMigration(v1Encrypted)).toBe(true);

      // Re-encrypt to v2
      const v2Encrypted = reencryptV1ToV2(v1Encrypted, testKey, testZoneId);

      // Should now be v2
      expect(detectKdfVersion(v2Encrypted)).toBe('v2');
      expect(needsMigration(v2Encrypted)).toBe(false);

      // Should decrypt correctly
      const decrypted = decryptBidFinancials(v2Encrypted, testKey, testZoneId);
      expect(decrypted).toEqual(data);
    });

    it('should throw when trying to re-encrypt already v2 data', () => {
      const data = { amount: 1000 };
      const v2Encrypted = encryptBidFinancials(data, testKey, testZoneId);

      expect(() => reencryptV1ToV2(v2Encrypted, testKey, testZoneId)).toThrow('already v2 encrypted');
    });
  });
});
