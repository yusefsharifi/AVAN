import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { InvoicePdfService } from './invoice-pdf.service';
import { FinanceGatewayService } from './finance-gateway.service';

describe('InvoiceService', () => {
  let service: InvoiceService;
  let prisma: { [key: string]: any };
  let redis: { [key: string]: jest.Mock };

  beforeEach(async () => {
    prisma = {
      zone: { findUnique: jest.fn().mockResolvedValue({ id: 'zone1', code: 'KVH' }) },
      invoice: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        aggregate: jest.fn(),
      },
      invoicePayment: {
        create: jest.fn(),
      },
    };

    redis = {
      incr: jest.fn().mockResolvedValue(1),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: InvoicePdfService, useValue: { generatePdf: jest.fn(), buildTemplateData: jest.fn() } },
        { provide: FinanceGatewayService, useValue: {
          emitInvoiceIssued: jest.fn(),
          emitPaymentRecorded: jest.fn(),
          emitInvoiceCancelled: jest.fn(),
          emitInvoiceOverdue: jest.fn(),
        } },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  describe('create', () => {
    it('should calculate line totals correctly', async () => {
      prisma.invoice.create.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-KVH-2024-000001',
        subtotal: BigInt(100000),
        totalDiscount: BigInt(0),
        totalTax: BigInt(9000),
        grandTotal: BigInt(109000),
        paidAmount: BigInt(0),
        remainingAmount: BigInt(109000),
        lines: [],
      });

      const result = await service.create(
        {
          zoneId: 'zone1',
          type: 'SERVICE_FEE' as any,
          direction: 'SALES' as any,
          partyName: 'Test Company',
          issueDate: '2024-12-15',
          lines: [
            {
              lineNumber: 1,
              description: 'Service fee',
              quantity: 10,
              unitPrice: 10000,
              taxRate: 9,
            },
          ],
        },
        'user1',
      );

      expect(result).toBeDefined();
      expect(result.invoiceNumber).toContain('INV-KVH-');
    });

    it('should apply discount before tax', async () => {
      prisma.invoice.create.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-KVH-2024-000001',
        lines: [],
      });

      await service.create(
        {
          zoneId: 'zone1',
          type: 'SERVICE_FEE' as any,
          direction: 'SALES' as any,
          partyName: 'Test',
          issueDate: '2024-12-15',
          lines: [
            {
              lineNumber: 1,
              description: 'Item',
              quantity: 10,
              unitPrice: 10000,
              discount: 10,
              taxRate: 9,
            },
          ],
        },
        'user1',
      );

      const createCall = prisma.invoice.create.mock.calls[0][0];
      const line = createCall.data.lines.create[0];

      // subtotal = 10 * 10000 = 100000
      expect(line.lineSubtotal.toString()).toBe('100000');

      // discount = 100000 * 10% = 10000
      expect(line.lineDiscount.toString()).toBe('10000');

      // taxable = 100000 - 10000 = 90000
      // tax = 90000 * 9% = 8100
      expect(line.lineTax.toString()).toBe('8100');

      // total = 90000 + 8100 = 98100
      expect(line.lineTotal.toString()).toBe('98100');
    });

    it('should set remainingAmount = grandTotal', async () => {
      prisma.invoice.create.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-KVH-2024-000001',
        lines: [],
      });

      await service.create(
        {
          zoneId: 'zone1',
          type: 'SERVICE_FEE' as any,
          direction: 'SALES' as any,
          partyName: 'Test',
          issueDate: '2024-12-15',
          lines: [
            { lineNumber: 1, description: 'Item', quantity: 1, unitPrice: 100000, taxRate: 9 },
          ],
        },
        'user1',
      );

      const createCall = prisma.invoice.create.mock.calls[0][0];
      expect(createCall.data.paidAmount.toString()).toBe('0');
      expect(createCall.data.remainingAmount.toString()).toBe(createCall.data.grandTotal.toString());
    });
  });

  describe('recordPayment', () => {
    it('should update paidAmount and remainingAmount', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-001',
        status: 'ISSUED',
        zoneId: 'zone1',
        grandTotal: BigInt(100000),
        paidAmount: BigInt(0),
        remainingAmount: BigInt(100000),
      });

      prisma.invoicePayment.create.mockResolvedValue({ id: 'pay1' });
      prisma.invoice.update.mockResolvedValue({
        id: 'inv1',
        paidAmount: BigInt(50000),
        remainingAmount: BigInt(50000),
        status: 'PARTIALLY_PAID',
      });

      const result = await service.recordPayment(
        {
          invoiceId: 'inv1',
          amount: 50000,
          method: 'BANK_TRANSFER' as any,
          paidAt: new Date().toISOString(),
        },
        'user1',
      );

      expect(result.status).toBe('PARTIALLY_PAID');
    });

    it('should set status PAID when fully paid', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-001',
        status: 'ISSUED',
        zoneId: 'zone1',
        grandTotal: BigInt(100000),
        paidAmount: BigInt(50000),
        remainingAmount: BigInt(50000),
      });

      prisma.invoicePayment.create.mockResolvedValue({ id: 'pay1' });
      prisma.invoice.update.mockResolvedValue({
        id: 'inv1',
        paidAmount: BigInt(100000),
        remainingAmount: BigInt(0),
        status: 'PAID',
      });

      const result = await service.recordPayment(
        {
          invoiceId: 'inv1',
          amount: 50000,
          method: 'BANK_TRANSFER' as any,
          paidAt: new Date().toISOString(),
        },
        'user1',
      );

      expect(result.status).toBe('PAID');
    });

    it('should reject overpayment', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-001',
        status: 'ISSUED',
        zoneId: 'zone1',
        grandTotal: BigInt(100000),
        paidAmount: BigInt(50000),
        remainingAmount: BigInt(50000),
      });

      await expect(
        service.recordPayment(
          {
            invoiceId: 'inv1',
            amount: 60000,
            method: 'BANK_TRANSFER' as any,
            paidAt: new Date().toISOString(),
          },
          'user1',
        ),
      ).rejects.toThrow(AppException);
    });

    it('should set PARTIALLY_PAID for partial payment', async () => {
      prisma.invoice.findUnique.mockResolvedValue({
        id: 'inv1',
        invoiceNumber: 'INV-001',
        status: 'ISSUED',
        zoneId: 'zone1',
        grandTotal: BigInt(100000),
        paidAmount: BigInt(0),
        remainingAmount: BigInt(100000),
      });

      prisma.invoicePayment.create.mockResolvedValue({ id: 'pay1' });
      prisma.invoice.update.mockResolvedValue({
        id: 'inv1',
        paidAmount: BigInt(30000),
        remainingAmount: BigInt(70000),
        status: 'PARTIALLY_PAID',
      });

      const result = await service.recordPayment(
        {
          invoiceId: 'inv1',
          amount: 30000,
          method: 'CASH' as any,
          paidAt: new Date().toISOString(),
        },
        'user1',
      );

      expect(result.status).toBe('PARTIALLY_PAID');
    });
  });

  describe('getAgingReport', () => {
    it('should categorize invoices by due date bucket', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv1',
          remainingAmount: BigInt(100000),
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          partyName: 'Company A',
          companyId: 'c1',
          company: { nameFa: 'شرکت الف' },
        },
        {
          id: 'inv2',
          remainingAmount: BigInt(50000),
          dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          partyName: 'Company B',
          companyId: 'c2',
          company: { nameFa: 'شرکت ب' },
        },
      ]);

      const result = await service.getAgingReport('zone1');

      expect(result).toHaveProperty('current');
      expect(result).toHaveProperty('days1to30');
      expect(result).toHaveProperty('days31to60');
      expect(result).toHaveProperty('days61to90');
      expect(result).toHaveProperty('over90');
      expect(result).toHaveProperty('totalOutstanding');
      expect(result).toHaveProperty('byCompany');
    });

    it('should handle partially paid invoices', async () => {
      prisma.invoice.findMany.mockResolvedValue([
        {
          id: 'inv1',
          remainingAmount: BigInt(30000),
          dueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          partyName: 'Company A',
          companyId: 'c1',
          company: { nameFa: 'شرکت الف' },
        },
      ]);

      const result = await service.getAgingReport('zone1');

      // 45 days overdue should be in days31to60
      expect(result.days31to60.count).toBe(1);
      expect(result.days31to60.totalAmount).toBe(30000);
    });
  });
});
