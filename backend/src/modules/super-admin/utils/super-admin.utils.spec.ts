import { encrypt, decrypt, generateTempPassword, hashPassword, getCpuUsage, getMemoryUsage, getDiskUsage, RETENTION_POLICIES, DEFAULT_CONFIG } from './super-admin.utils';

describe('super-admin.utils', () => {
  describe('encrypt / decrypt', () => {
    const key = 'test-encryption-key-32-chars-long!!';

    it('should encrypt and decrypt back to original value', () => {
      const original = 'my-secret-api-key-12345';
      const encrypted = encrypt(original, key);

      expect(encrypted).not.toBe(original);
      expect(encrypted).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

      const decrypted = decrypt(encrypted, key);
      expect(decrypted).toBe(original);
    });

    it('should produce different ciphertext each time (random IV)', () => {
      const encrypted1 = encrypt('same-value', key);
      const encrypted2 = encrypt('same-value', key);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should fail decryption with wrong key', () => {
      const encrypted = encrypt('secret', key);

      expect(() => decrypt(encrypted, 'wrong-key-32-chars-long!!!!')).toThrow();
    });

    it('should handle empty string', () => {
      const encrypted = encrypt('', key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe('');
    });

    it('should handle unicode / Persian text', () => {
      const persianText = 'کلید مخفی ۱۲۳۴۵';
      const encrypted = encrypt(persianText, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(persianText);
    });

    it('should handle long strings', () => {
      const longString = 'A'.repeat(10000);
      const encrypted = encrypt(longString, key);
      const decrypted = decrypt(encrypted, key);

      expect(decrypted).toBe(longString);
    });
  });

  describe('generateTempPassword', () => {
    it('should generate 12-character password by default', () => {
      const password = generateTempPassword();

      expect(password).toHaveLength(12);
    });

    it('should generate custom length password', () => {
      const password = generateTempPassword(20);

      expect(password).toHaveLength(20);
    });

    it('should contain uppercase and lowercase letters', () => {
      const password = generateTempPassword();

      expect(password).toMatch(/[A-Z]/);
      expect(password).toMatch(/[a-z]/);
    });

    it('should contain digits', () => {
      const password = generateTempPassword();

      expect(password).toMatch(/[0-9]/);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set<string>();
      for (let i = 0; i < 50; i++) {
        passwords.add(generateTempPassword());
      }

      // Extremely unlikely to get duplicates in 50 tries
      expect(passwords.size).toBe(50);
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const hash = await hashPassword('mypassword');

      expect(hash).toBeDefined();
      expect(hash).not.toBe('mypassword');
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should produce different hashes for same input (bcrypt salt)', async () => {
      const hash1 = await hashPassword('mypassword');
      const hash2 = await hashPassword('mypassword');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getCpuUsage', () => {
    it('should return a number between 0 and 100', async () => {
      const usage = await getCpuUsage();

      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });
  });

  describe('getMemoryUsage', () => {
    it('should return a percentage between 0 and 100', () => {
      const usage = getMemoryUsage();

      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });
  });

  describe('getDiskUsage', () => {
    it('should return a percentage between 0 and 100', async () => {
      const usage = await getDiskUsage();

      expect(typeof usage).toBe('number');
      expect(usage).toBeGreaterThanOrEqual(0);
      expect(usage).toBeLessThanOrEqual(100);
    });
  });

  describe('RETENTION_POLICIES', () => {
    it('should be an array of retention policies', () => {
      expect(Array.isArray(RETENTION_POLICIES)).toBe(true);
      expect(RETENTION_POLICIES.length).toBeGreaterThan(0);
    });

    it('should have module and retentionDays for each entry', () => {
      for (const policy of RETENTION_POLICIES) {
        expect(policy).toHaveProperty('module');
        expect(policy).toHaveProperty('retentionDays');
        expect(typeof policy.retentionDays).toBe('number');
        expect(policy.retentionDays).toBeGreaterThan(0);
      }
    });

    it('should include GLOBAL_AUDIT_LOG with 365-day retention', () => {
      const auditPolicy = RETENTION_POLICIES.find(p => p.module === 'GLOBAL_AUDIT_LOG');
      expect(auditPolicy).toBeDefined();
      expect(auditPolicy!.retentionDays).toBe(365);
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have SMS configuration', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('SMS_PROVIDER');
      expect(DEFAULT_CONFIG).toHaveProperty('SMS_API_KEY');
    });

    it('should have EMAIL configuration', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('EMAIL_HOST');
      expect(DEFAULT_CONFIG).toHaveProperty('EMAIL_PORT');
    });

    it('should have MQTT configuration', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('MQTT_BROKER_URL');
    });

    it('should have SECURITY configuration', () => {
      expect(DEFAULT_CONFIG).toHaveProperty('PASSWORD_MIN_LENGTH');
      expect(DEFAULT_CONFIG).toHaveProperty('MAX_LOGIN_ATTEMPTS');
    });

    it('should have all entries with value, description, and isEncrypted', () => {
      for (const [key, config] of Object.entries(DEFAULT_CONFIG)) {
        expect(config).toHaveProperty('value');
        expect(config).toHaveProperty('description');
        expect(config).toHaveProperty('isEncrypted');
        expect(typeof config.value).toBe('string');
        expect(typeof config.description).toBe('string');
        expect(typeof config.isEncrypted).toBe('boolean');
      }
    });
  });
});
