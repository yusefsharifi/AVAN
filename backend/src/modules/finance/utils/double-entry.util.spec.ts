import { validateDoubleEntry, calculateInvoiceLine, daysBetween, calculateDSO, calculateDPO } from './double-entry.util';

describe('Double Entry Utility', () => {
  describe('validateDoubleEntry', () => {
    it('should reject empty lines', () => {
      const result = validateDoubleEntry([]);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('سند باید حداقل یک ردیف داشته باشد');
    });

    it('should reject null/undefined lines', () => {
      const result = validateDoubleEntry(null as any);
      expect(result.isValid).toBe(false);
    });

    it('should accept valid double-entry voucher', () => {
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
        { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1000 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.totalDebit).toBe(1000);
      expect(result.totalCredit).toBe(1000);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject when debit != credit', () => {
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
        { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 500 },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept when debit and credit differ by 1 Rial (epsilon)', () => {
      // BUG-004 fix: epsilon comparison allows 1 Rial tolerance
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Debit', debitAccountId: 'acc1', debitAmount: 1000 },
        { lineNumber: 2, description: 'Credit', creditAccountId: 'acc2', creditAmount: 1001 },
      ]);

      expect(result.isValid).toBe(true);
    });

    it('should reject line with both debit and credit', () => {
      const result = validateDoubleEntry([
        {
          lineNumber: 1,
          description: 'Invalid',
          debitAccountId: 'acc1',
          debitAmount: 1000,
          creditAccountId: 'acc2',
          creditAmount: 1000,
        },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('نمی‌توان همزمان بدهکار و بستانکار باشد');
    });

    it('should reject line with neither debit nor credit', () => {
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Empty line' },
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('باید بدهکار یا بستانکار وارد شود');
    });

    it('should handle multi-line voucher', () => {
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Cash debit', debitAccountId: 'cash', debitAmount: 5000 },
        { lineNumber: 2, description: 'Revenue credit', creditAccountId: 'revenue', creditAmount: 3000 },
        { lineNumber: 3, description: 'Tax credit', creditAccountId: 'tax', creditAmount: 2000 },
      ]);

      expect(result.isValid).toBe(true);
      expect(result.totalDebit).toBe(5000);
      expect(result.totalCredit).toBe(5000);
    });

    it('should handle large amounts', () => {
      const result = validateDoubleEntry([
        { lineNumber: 1, description: 'Big debit', debitAccountId: 'acc1', debitAmount: 999999999999 },
        { lineNumber: 2, description: 'Big credit', creditAccountId: 'acc2', creditAmount: 999999999999 },
      ]);

      expect(result.isValid).toBe(true);
    });
  });

  describe('calculateInvoiceLine', () => {
    it('should calculate line total with default 9% tax', () => {
      const result = calculateInvoiceLine({ quantity: 10, unitPrice: 100000 });

      expect(result.lineSubtotal).toBe(1000000);
      expect(result.lineDiscount).toBe(0);
      expect(result.lineTax).toBe(90000); // 9% of 1,000,000
      expect(result.lineTotal).toBe(1090000);
    });

    it('should apply discount before tax', () => {
      const result = calculateInvoiceLine({ quantity: 10, unitPrice: 100000, discount: 10 });

      expect(result.lineSubtotal).toBe(1000000);
      expect(result.lineDiscount).toBe(100000); // 10% of 1,000,000
      expect(result.lineTax).toBe(81000); // 9% of 900,000
      expect(result.lineTotal).toBe(981000);
    });

    it('should use custom tax rate', () => {
      const result = calculateInvoiceLine({ quantity: 1, unitPrice: 1000000, taxRate: 0 });

      expect(result.lineTax).toBe(0);
      expect(result.lineTotal).toBe(1000000);
    });

    it('should handle zero quantity', () => {
      const result = calculateInvoiceLine({ quantity: 0, unitPrice: 100000 });

      expect(result.lineSubtotal).toBe(0);
      expect(result.lineTotal).toBe(0);
    });
  });

  describe('daysBetween', () => {
    it('should calculate days between dates', () => {
      const d1 = new Date('2026-01-01');
      const d2 = new Date('2026-01-10');
      expect(daysBetween(d1, d2)).toBe(9);
    });

    it('should return 0 for same date', () => {
      const d = new Date('2026-01-01');
      expect(daysBetween(d, d)).toBe(0);
    });

    it('should return negative for reversed dates', () => {
      const d1 = new Date('2026-01-10');
      const d2 = new Date('2026-01-01');
      expect(daysBetween(d1, d2)).toBe(-9);
    });
  });

  describe('calculateDSO', () => {
    it('should calculate Days Sales Outstanding', () => {
      // AR = 10,000,000, Annual Revenue = 365,000,000 => DSO = 10
      expect(calculateDSO(10000000, 365000000)).toBe(10);
    });

    it('should return 0 when revenue is 0', () => {
      expect(calculateDSO(10000000, 0)).toBe(0);
    });

    it('should handle large values', () => {
      const dso = calculateDSO(100000000000, 365000000000);
      expect(dso).toBe(100);
    });
  });

  describe('calculateDPO', () => {
    it('should calculate Days Payable Outstanding', () => {
      // AP = 5,000,000, Annual COGS = 182,500,000 => DPO = 10
      expect(calculateDPO(5000000, 182500000)).toBe(10);
    });

    it('should return 0 when COGS is 0', () => {
      expect(calculateDPO(5000000, 0)).toBe(0);
    });
  });
});
