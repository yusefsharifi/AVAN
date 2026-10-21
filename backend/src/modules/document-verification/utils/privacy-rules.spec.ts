// ═══════════════════════════════════════════════════════════════════════════════
// M22: Privacy Rules Engine — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

import {
  applyPrivacyRules,
  maskName,
  maskNumber,
  maskDate,
  detectPlatform,
  PRIVACY_RULES,
} from './privacy-rules';

describe('PrivacyRulesEngine', () => {
  describe('applyPrivacyRules', () => {
    it('should only return allowed fields for LETTER', () => {
      const rawData = {
        registryNumber: 'LTR-001',
        subject: 'Test Letter',
        direction: 'OUTGOING',
        type: 'OFFICIAL',
        senderOrgName: 'HR',
        status: 'SENT',
        createdAt: new Date(),
        body: 'SECRET BODY',
        internalNotes: 'Internal',
        classification: 'UNCLASSIFIED',
      };

      const result = applyPrivacyRules(rawData, 'LETTER');
      expect(result).toHaveProperty('registryNumber', 'LTR-001');
      expect(result).toHaveProperty('subject', 'Test Letter');
      expect(result).toHaveProperty('senderOrgName', 'HR');
      expect(result).not.toHaveProperty('body');
      expect(result).not.toHaveProperty('internalNotes');
      expect(result).not.toHaveProperty('classification');
    });

    it('should only return allowed fields for PERMIT', () => {
      const rawData = {
        permitNumber: 'PRM-001',
        type: 'ACTIVITY_LICENSE',
        typeFa: 'پروانه فعالیت',
        holderName: 'Test Co',
        validFrom: new Date(),
        validUntil: new Date(),
        status: 'ACTIVE',
        locationDescription: 'Building A',
        allowedActivities: ['Manufacturing'],
        issuedByOrg: 'Zone Admin',
        issuedAt: new Date(),
        conditionsSummary: { pending: 2, fulfilled: 3, total: 5 },
        holderNationalId: '1234567890',
        internalNotes: 'Internal',
      };

      const result = applyPrivacyRules(rawData, 'PERMIT');
      expect(result).toHaveProperty('permitNumber', 'PRM-001');
      expect(result).toHaveProperty('holderName', 'Test Co');
      expect(result).toHaveProperty('conditionsSummary');
      expect(result).not.toHaveProperty('holderNationalId');
      expect(result).not.toHaveProperty('internalNotes');
    });

    it('should handle missing fields gracefully', () => {
      const rawData = { registryNumber: 'LTR-002' };
      const result = applyPrivacyRules(rawData, 'LETTER');
      expect(result).toHaveProperty('registryNumber', 'LTR-002');
      expect(result).not.toHaveProperty('subject');
    });

    it('should return all fields for unknown doc type', () => {
      const rawData = { a: 1, b: 2 };
      const result = applyPrivacyRules(rawData, 'UNKNOWN_TYPE');
      expect(result).toEqual({ a: 1, b: 2 });
    });

    it('should mask employee names for TRAINING_CERT', () => {
      const rawData = {
        trainingPlanName: 'HSE Safety',
        category: 'SAFETY',
        employeeNameMasked: 'علی محمدی',
        companyName: 'Test Co',
        zoneName: 'Zone',
        trainingDate: '1403-01-01',
        passed: true,
      };
      const result = applyPrivacyRules(rawData, 'TRAINING_CERT');
      expect(result).toHaveProperty('employeeNameMasked', 'علی محمدی');
      expect(result).toHaveProperty('trainingPlanName', 'HSE Safety');
    });
  });

  describe('maskName', () => {
    it('should mask Persian name correctly', () => {
      expect(maskName('علی محمدی')).toBe('ع. محمدی');
    });

    it('should mask English name correctly', () => {
      expect(maskName('John Smith')).toBe('J. Smith');
    });

    it('should handle single-word names', () => {
      const result = maskName('علی');
      expect(result).toMatch(/^ع\.\*+ی$/);
    });

    it('should handle empty string', () => {
      expect(maskName('')).toBe('');
    });

    it('should handle three-part names', () => {
      expect(maskName('علی محمد رضایی')).toBe('ع. رضایی');
    });
  });

  describe('maskNumber', () => {
    it('should show first 3 and last 3 digits', () => {
      expect(maskNumber('1234567890')).toBe('123****890');
    });

    it('should handle short numbers', () => {
      expect(maskNumber('12345')).toBe('12345');
    });

    it('should handle empty string', () => {
      expect(maskNumber('')).toBe('');
    });

    it('should mask 8-digit national ID', () => {
      const result = maskNumber('12345678');
      expect(result).toHaveLength(8);
      expect(result.slice(0, 3)).toBe('123');
      expect(result.slice(-3)).toBe('678');
    });
  });

  describe('maskDate', () => {
    it('should mask Jalali date correctly', () => {
      expect(maskDate('1380-05-15')).toBe('1380-**-**');
    });

    it('should handle partial dates', () => {
      expect(maskDate('1380')).toBe('1380');
    });

    it('should handle empty string', () => {
      expect(maskDate('')).toBe('');
    });
  });

  describe('detectPlatform', () => {
    it('should detect mobile', () => {
      expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)')).toBe('mobile');
    });

    it('should detect Android', () => {
      expect(detectPlatform('Mozilla/5.0 (Linux; Android 11)')).toBe('mobile');
    });

    it('should detect tablet', () => {
      expect(detectPlatform('Mozilla/5.0 (iPad; CPU OS 15_0 like Mac OS X)')).toBe('mobile');
    });

    it('should detect web/desktop', () => {
      expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0')).toBe('web');
    });

    it('should default to api for empty user-agent', () => {
      expect(detectPlatform(undefined)).toBe('api');
      expect(detectPlatform('')).toBe('api');
    });
  });

  describe('PRIVACY_RULES', () => {
    it('should have rules for all 11 document types', () => {
      expect(Object.keys(PRIVACY_RULES)).toHaveLength(11);
    });

    it('each rule should have at least one allowed field', () => {
      for (const [type, rule] of Object.entries(PRIVACY_RULES)) {
        expect(rule.allowedFields.length).toBeGreaterThan(0);
      }
    });

    it('LETTER rule should include registryNumber', () => {
      expect(PRIVACY_RULES.LETTER.allowedFields).toContain('registryNumber');
    });

    it('SIGNATURE rule should not include private key fields', () => {
      const fields = PRIVACY_RULES.SIGNATURE.allowedFields;
      expect(fields).not.toContain('privateKey');
      expect(fields).not.toContain('documentHash');
      expect(fields).not.toContain('signedByIp');
    });

    it('COMPANY rule should not include financial data', () => {
      const fields = PRIVACY_RULES.COMPANY.allowedFields;
      expect(fields).not.toContain('creditLimit');
      expect(fields).not.toContain('creditUsed');
      expect(fields).not.toContain('healthScore');
      expect(fields).not.toContain('ceoNationalId');
    });
  });
});
