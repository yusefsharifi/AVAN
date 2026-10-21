import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { FilterVouchersDto } from '../dto/filter.dto';
import { validateDoubleEntry } from '../utils/double-entry.util';
import { isFinancialEqual, isFinancialNotEqual, isFinancialZero } from '../utils/financial-compare';
import { FinanceGatewayService } from './finance-gateway.service';

@Injectable()
export class AccountingVoucherService {
  private readonly logger = new Logger(AccountingVoucherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: FinanceGatewayService,
  ) {}

  async create(dto: CreateVoucherDto, createdBy: string, preparedByName: string): Promise<any> {
    // 1. Generate voucher number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.financeVoucherSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);

    // Get zone code for voucher number
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    const zoneCode = zone?.code || 'ZN';
    const voucherNumber = `ACC-${zoneCode}-${year}-${seq.toString().padStart(7, '0')}`;

    // 2. Validate lines using double-entry rules
    const validation = validateDoubleEntry(dto.lines);
    if (!validation.isValid) {
      throw new AppException('VOUCHER_UNBALANCED', { details: { errors: validation.errors } });
    }

    // 3. Verify financial period is open for this date
    const gregorianDate = new Date(dto.date);
    const period = await this.prisma.financialPeriod.findFirst({
      where: {
        zoneId: dto.zoneId,
        startDate: { lte: gregorianDate },
        endDate: { gte: gregorianDate },
        status: 'OPEN',
      },
    });

    if (!period) {
      throw new AppException('VOUCHER_PERIOD_CLOSED');
    }

    // 4. Verify all account codes exist and are active
    // BUG-PERSIST-006: the same account may legally appear on several lines
    // (e.g. debit on line 1, credit on line 2). Prisma's `in` filter returns
    // distinct rows, so comparing that count against a list containing
    // duplicates rejected every such voucher with ACCOUNT_NOT_FOUND.
    const allAccountIds = [...new Set(
      dto.lines.flatMap((l) => [l.debitAccountId, l.creditAccountId]).filter(Boolean),
    )] as string[];

    if (allAccountIds.length > 0) {
      const accounts = await this.prisma.accountCode.findMany({
        where: { id: { in: allAccountIds } },
      });

      const inactiveAccount = accounts.find((a) => !a.isActive);
      if (inactiveAccount) {
        throw new AppException('ACCOUNT_INACTIVE', {
          details: { accountCode: inactiveAccount.code, nameFa: inactiveAccount.nameFa },
        });
      }

      if (accounts.length !== allAccountIds.length) {
        throw new AppException('ACCOUNT_NOT_FOUND');
      }
    }

    // 5. Create voucher with lines
    const voucher = await this.prisma.accountingVoucher.create({
      data: {
        zoneId: dto.zoneId,
        voucherNumber,
        type: dto.type as any,
        date: dto.date,
        gregorianDate,
        description: dto.description,
        reference: dto.reference,
        sourceModule: dto.sourceModule,
        sourceEntityId: dto.sourceEntityId,
        totalDebit: BigInt(validation.totalDebit),
        totalCredit: BigInt(validation.totalCredit),
        preparedBy: createdBy,
        preparedByName,
        currencyCode: dto.currencyCode || 'IRR',
        exchangeRate: dto.exchangeRate || 1,
        notes: dto.notes,
        lines: {
          create: dto.lines.map((line) => ({
            lineNumber: line.lineNumber,
            description: line.description,
            debitAccountId: line.debitAccountId,
            creditAccountId: line.creditAccountId,
            debitAmount: BigInt(line.debitAmount || 0),
            creditAmount: BigInt(line.creditAmount || 0),
            costCenterId: line.costCenterId,
            partyId: line.partyId,
            partyName: line.partyName,
            taxRate: line.taxRate,
            taxAmount: line.taxRate
              ? BigInt(Math.round(((line.debitAmount || 0) * line.taxRate) / 100))
              : undefined,
            reference: line.reference,
          })),
        },
      },
      include: { lines: true },
    });

    // 6. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: voucher.id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_CREATED',
      metadata: {
        voucherNumber,
        type: dto.type,
        totalDebit: validation.totalDebit,
        totalCredit: validation.totalCredit,
        sourceModule: dto.sourceModule,
      },
    });

    return voucher;
  }

  async review(id: string, reviewerId: string): Promise<any> {
    const voucher = await this.findById(id);

    if (voucher.status !== 'DRAFT') {
      throw new AppException('VOUCHER_INVALID_STATUS', {
        details: { currentStatus: voucher.status, requiredStatus: 'DRAFT' },
      });
    }

    // BUG-004: Verify balance with epsilon comparison
    if (isFinancialNotEqual(Number(voucher.totalDebit), Number(voucher.totalCredit))) {
      throw new AppException('VOUCHER_UNBALANCED');
    }

    const updated = await this.prisma.accountingVoucher.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: voucher.zoneId,
      userId: reviewerId,
      targetId: id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_REVIEWED',
      metadata: { voucherNumber: voucher.voucherNumber },
    });

    this.gateway.emitVoucherReviewed({
      zoneId: voucher.zoneId,
      voucherId: id,
      voucherNumber: voucher.voucherNumber,
      reviewedBy: reviewerId,
    });

    return updated;
  }

  async approve(id: string, approverId: string): Promise<any> {
    const voucher = await this.findById(id);

    if (voucher.status !== 'REVIEWED') {
      throw new AppException('VOUCHER_INVALID_STATUS', {
        details: { currentStatus: voucher.status, requiredStatus: 'REVIEWED' },
      });
    }

    const updated = await this.prisma.accountingVoucher.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: new Date(),
      },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: voucher.zoneId,
      userId: approverId,
      targetId: id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_APPROVED',
      metadata: { voucherNumber: voucher.voucherNumber },
    });

    this.gateway.emitVoucherApproved({
      zoneId: voucher.zoneId,
      voucherId: id,
      voucherNumber: voucher.voucherNumber,
      approvedBy: approverId,
    });

    return updated;
  }

  async post(id: string, postedBy: string): Promise<any> {
    const voucher = await this.findById(id);

    if (voucher.status !== 'APPROVED') {
      throw new AppException('VOUCHER_INVALID_STATUS', {
        details: { currentStatus: voucher.status, requiredStatus: 'APPROVED' },
      });
    }

    // BUG-004: Verify balance with epsilon comparison
    if (isFinancialNotEqual(Number(voucher.totalDebit), Number(voucher.totalCredit))) {
      throw new AppException('VOUCHER_UNBALANCED');
    }

    // Verify financial period is open
    const period = await this.prisma.financialPeriod.findFirst({
      where: {
        zoneId: voucher.zoneId,
        startDate: { lte: voucher.gregorianDate },
        endDate: { gte: voucher.gregorianDate },
        status: 'OPEN',
      },
    });

    if (!period) {
      throw new AppException('FINANCIAL_PERIOD_NOT_OPEN');
    }

    // Update status to POSTED
    const updated = await this.prisma.accountingVoucher.update({
      where: { id },
      data: { status: 'POSTED' },
      include: { lines: true },
    });

    // Update budget actual amounts for expense accounts
    const year = voucher.gregorianDate.getFullYear();
    for (const line of voucher.lines) {
      const accountId = line.debitAccountId || line.creditAccountId;
      if (accountId && line.debitAmount > 0) {
        // Debit on expense account = increase actual
        const account = await this.prisma.accountCode.findUnique({ where: { id: accountId } });
        if (account && account.type === 'EXPENSE') {
          await this.updateBudgetActual(accountId, voucher.zoneId, Number(line.debitAmount), year);
        }
      }
    }

    // Audit log
    await this.audit.log({
      zoneId: voucher.zoneId,
      userId: postedBy,
      targetId: id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_POSTED',
      metadata: { voucherNumber: voucher.voucherNumber, totalDebit: voucher.totalDebit },
    });

    // Emit WebSocket event
    this.gateway.emitVoucherPosted({
      zoneId: voucher.zoneId,
      voucherId: id,
      voucherNumber: voucher.voucherNumber,
      type: voucher.type,
      totalDebit: Number(voucher.totalDebit),
      date: voucher.date,
    });

    return updated;
  }

  async void(id: string, reason: string, voidedBy: string): Promise<any> {
    const voucher = await this.findById(id);

    if (voucher.status === 'POSTED') {
      throw new AppException('VOUCHER_CANNOT_VOID_POSTED');
    }

    if (!['DRAFT', 'REVIEWED', 'APPROVED'].includes(voucher.status)) {
      throw new AppException('VOUCHER_INVALID_STATUS');
    }

    const updated = await this.prisma.accountingVoucher.update({
      where: { id },
      data: {
        status: 'VOIDED',
        notes: `${voucher.notes || ''}\nابطال شده: ${reason}`,
      },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: voucher.zoneId,
      userId: voidedBy,
      targetId: id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_VOIDED',
      metadata: { voucherNumber: voucher.voucherNumber, reason },
    });

    this.gateway.emitVoucherVoided({
      zoneId: voucher.zoneId,
      voucherId: id,
      voucherNumber: voucher.voucherNumber,
      reason,
    });

    return updated;
  }

  async createReversal(id: string, reason: string, createdBy: string, preparedByName: string): Promise<any> {
    const original = await this.findById(id);

    if (original.status !== 'POSTED') {
      throw new AppException('VOUCHER_INVALID_STATUS', {
        details: { message: ' فقط اسناد ثبت شده قابل برگشت هستند' },
      });
    }

    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.financeVoucherSeq(original.zoneId, year);
    const seq = await this.redis.incr(seqKey);

    const zone = await this.prisma.zone.findUnique({ where: { id: original.zoneId } });
    const zoneCode = zone?.code || 'ZN';
    const voucherNumber = `ACC-${zoneCode}-${year}-${seq.toString().padStart(7, '0')}`;

    const reversalVoucher = await this.prisma.accountingVoucher.create({
      data: {
        zoneId: original.zoneId,
        voucherNumber,
        type: original.type as any,
        date: new Date().toISOString().split('T')[0],
        gregorianDate: new Date(),
        description: `برگشت سند ${original.voucherNumber}: ${reason}`,
        reference: original.voucherNumber,
        sourceModule: original.sourceModule,
        sourceEntityId: original.sourceEntityId,
        totalDebit: original.totalDebit,
        totalCredit: original.totalCredit,
        preparedBy: createdBy,
        preparedByName,
        currencyCode: original.currencyCode,
        exchangeRate: original.exchangeRate,
        notes: `سند برگشتی از: ${original.voucherNumber}\nدلیل: ${reason}`,
        lines: {
          create: original.lines.map((line, idx) => ({
            lineNumber: idx + 1,
            description: `برگشت: ${line.description}`,
            debitAccountId: line.creditAccountId,
            creditAccountId: line.debitAccountId,
            debitAmount: line.creditAmount,
            creditAmount: line.debitAmount,
            costCenterId: line.costCenterId,
            partyId: line.partyId,
            partyName: line.partyName,
            reference: original.voucherNumber,
          })),
        },
      },
      include: { lines: true },
    });

    await this.audit.log({
      zoneId: original.zoneId,
      userId: createdBy,
      targetId: reversalVoucher.id,
      targetType: 'AccountingVoucher',
      action: 'VOUCHER_REVERSED',
      metadata: {
        originalVoucherNumber: original.voucherNumber,
        reversalVoucherNumber: voucherNumber,
        reason,
      },
    });

    return reversalVoucher;
  }

  async findAll(filter: FilterVouchersDto): Promise<{ data: any[]; meta: any }> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.sourceModule) where.sourceModule = filter.sourceModule;

    if (filter.fromDate || filter.toDate) {
      where.gregorianDate = {};
      if (filter.fromDate) where.gregorianDate.gte = new Date(filter.fromDate);
      if (filter.toDate) where.gregorianDate.lte = new Date(filter.toDate);
    }

    if (filter.search) {
      where.OR = [
        { voucherNumber: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
        { reference: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;

    const data = await this.prisma.accountingVoucher.findMany({
      where,
      orderBy: { gregorianDate: 'desc' },
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: { lines: true },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: { limit, hasMore, cursor: hasMore ? items[items.length - 1].id : null },
    };
  }

  async findById(id: string): Promise<any> {
    const voucher = await this.prisma.accountingVoucher.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!voucher) {
      throw new AppException('VOUCHER_NOT_FOUND');
    }

    return voucher;
  }

  async findBySource(sourceModule: string, sourceEntityId: string): Promise<any | null> {
    return this.prisma.accountingVoucher.findFirst({
      where: { sourceModule, sourceEntityId, deletedAt: null },
      include: { lines: true },
    });
  }

  async getTrialBalance(zoneId: string, asOfDate: string): Promise<any> {
    const cacheKey = REDIS_KEYS.financeTrialBalance(zoneId, asOfDate);
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const asOf = new Date(asOfDate);

    // Get all posted vouchers up to the date
    const vouchers = await this.prisma.accountingVoucher.findMany({
      where: {
        zoneId,
        status: 'POSTED',
        gregorianDate: { lte: asOf },
        deletedAt: null,
      },
      include: { lines: true },
    });

    // Aggregate by account
    const accountTotals = new Map<string, { totalDebit: number; totalCredit: number }>();

    for (const voucher of vouchers) {
      for (const line of voucher.lines) {
        if (line.debitAccountId) {
          const current = accountTotals.get(line.debitAccountId) || { totalDebit: 0, totalCredit: 0 };
          current.totalDebit += Number(line.debitAmount);
          accountTotals.set(line.debitAccountId, current);
        }
        if (line.creditAccountId) {
          const current = accountTotals.get(line.creditAccountId) || { totalDebit: 0, totalCredit: 0 };
          current.totalCredit += Number(line.creditAmount);
          accountTotals.set(line.creditAccountId, current);
        }
      }
    }

    // Get account details
    const accountIds = Array.from(accountTotals.keys());
    const accounts = await this.prisma.accountCode.findMany({
      where: { id: { in: accountIds } },
    });

    const accountMap = new Map(accounts.map((a) => [a.id, a]));

    let totalDebit = 0;
    let totalCredit = 0;

    const result = Array.from(accountTotals.entries()).map(([id, totals]) => {
      const account = accountMap.get(id);
      const balance = totals.totalDebit - totals.totalCredit;
      totalDebit += totals.totalDebit;
      totalCredit += totals.totalCredit;

      return {
        code: account?.code,
        nameFa: account?.nameFa,
        type: account?.type,
        normalBalance: account?.normalBalance,
        totalDebit: totals.totalDebit,
        totalCredit: totals.totalCredit,
        balance,
      };
    });

    const trialBalance = {
      accounts: result,
      totalDebit,
      totalCredit,
      isBalanced: isFinancialEqual(totalDebit, totalCredit),
    };

    await this.redis.set(cacheKey, JSON.stringify(trialBalance), 3600);

    return trialBalance;
  }

  async getLedger(
    accountCodeId: string,
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<any> {
    const account = await this.prisma.accountCode.findUnique({ where: { id: accountCodeId } });
    if (!account) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    const from = new Date(fromDate);
    const to = new Date(toDate);

    const vouchers = await this.prisma.accountingVoucher.findMany({
      where: {
        zoneId,
        status: 'POSTED',
        gregorianDate: { gte: from, lte: to },
        deletedAt: null,
      },
      include: { lines: true },
      orderBy: { gregorianDate: 'asc' },
    });

    let runningBalance = 0;
    const entries: any[] = [];

    for (const voucher of vouchers) {
      for (const line of voucher.lines) {
        if (line.debitAccountId === accountCodeId) {
          runningBalance += Number(line.debitAmount);
          entries.push({
            date: voucher.gregorianDate,
            voucherNumber: voucher.voucherNumber,
            description: line.description,
            debit: Number(line.debitAmount),
            credit: 0,
            balance: runningBalance,
          });
        }
        if (line.creditAccountId === accountCodeId) {
          runningBalance -= Number(line.creditAmount);
          entries.push({
            date: voucher.gregorianDate,
            voucherNumber: voucher.voucherNumber,
            description: line.description,
            debit: 0,
            credit: Number(line.creditAmount),
            balance: runningBalance,
          });
        }
      }
    }

    return {
      account: {
        code: account.code,
        nameFa: account.nameFa,
        type: account.type,
        normalBalance: account.normalBalance,
      },
      entries,
      closingBalance: runningBalance,
      period: { fromDate, toDate },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Auto-voucher creation methods (called by other modules)
  // ═══════════════════════════════════════════════════════════════════════════

  async createFromWeighRecord(weighRecord: any): Promise<any> {
    const zoneId = weighRecord.zoneId;
    const chargeAmount = Number(weighRecord.chargeAmount || 0);
    const taxRate = 9;
    const taxAmount = Math.round(chargeAmount * taxRate / 100);
    const revenueAmount = chargeAmount - taxAmount;

    // Find account codes for this zone
    const arAccount = await this.findAccountByCode('1201', zoneId);
    const revenueAccount = await this.findAccountByCode('4101', zoneId);
    const taxAccount = await this.findAccountByCode('2202', zoneId);

    if (!arAccount || !revenueAccount || !taxAccount) {
      throw new AppException('ACCOUNT_NOT_FOUND', { details: { message: 'سرفصل‌های حسابداری یافت نشد' } });
    }

    return this.create(
      {
        zoneId,
        type: 'JOURNAL' as any,
        date: new Date().toISOString().split('T')[0],
        description: `سند وزن‌کشی باسکول - ${weighRecord.vehiclePlate}`,
        sourceModule: 'WEIGH',
        sourceEntityId: weighRecord.id,
        lines: [
          {
            lineNumber: 1,
            description: `بدهکار بابت وزن‌کشی ${weighRecord.netWeight} تن`,
            debitAccountId: arAccount.id,
            debitAmount: chargeAmount,
            creditAccountId: undefined,
            creditAmount: 0,
          },
          {
            lineNumber: 2,
            description: 'درآمد وزن‌کشی',
            debitAccountId: undefined,
            debitAmount: 0,
            creditAccountId: revenueAccount.id,
            creditAmount: revenueAmount,
          },
          {
            lineNumber: 3,
            description: 'مالیات بر ارزش افزوده (۹٪)',
            debitAccountId: undefined,
            debitAmount: 0,
            creditAccountId: taxAccount.id,
            creditAmount: taxAmount,
          },
        ],
      },
      weighRecord.operatorId,
      weighRecord.operatorName || weighRecord.operatorId,
    );
  }

  async createFromPermitFee(permit: any, feeAmount: number): Promise<any> {
    const zoneId = permit.zoneId;
    const taxRate = 9;
    const taxAmount = Math.round(feeAmount * taxRate / 100);
    const revenueAmount = feeAmount - taxAmount;

    const arAccount = await this.findAccountByCode('1201', zoneId);
    const revenueAccount = await this.findAccountByCode('4102', zoneId);
    const taxAccount = await this.findAccountByCode('2202', zoneId);

    if (!arAccount || !revenueAccount || !taxAccount) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    return this.create(
      {
        zoneId,
        type: 'JOURNAL' as any,
        date: new Date().toISOString().split('T')[0],
        description: `فیس مجوز - ${permit.permitNumber}`,
        sourceModule: 'PERMIT',
        sourceEntityId: permit.id,
        lines: [
          {
            lineNumber: 1,
            description: `بدهکار بابت فیس مجوز ${permit.permitNumber}`,
            debitAccountId: arAccount.id,
            debitAmount: feeAmount,
          },
          {
            lineNumber: 2,
            description: 'درآمد مجوزها',
            creditAccountId: revenueAccount.id,
            creditAmount: revenueAmount,
          },
          {
            lineNumber: 3,
            description: 'مالیات بر ارزش افزوده (۹٪)',
            creditAccountId: taxAccount.id,
            creditAmount: taxAmount,
          },
        ],
      },
      permit.issuedBy || permit.zoneId,
      permit.issuedByName || 'سیستم',
    );
  }

  async createFromLeaseInvoice(contract: any, amount: number): Promise<any> {
    const zoneId = contract.zoneId;
    const taxRate = 9;
    const taxAmount = Math.round(amount * taxRate / 100);
    const revenueAmount = amount - taxAmount;

    const arAccount = await this.findAccountByCode('1201', zoneId);
    const revenueAccount = await this.findAccountByCode('4103', zoneId);
    const taxAccount = await this.findAccountByCode('2202', zoneId);

    if (!arAccount || !revenueAccount || !taxAccount) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    return this.create(
      {
        zoneId,
        type: 'JOURNAL' as any,
        date: new Date().toISOString().split('T')[0],
        description: `اجاره ماهانه - قرارداد ${contract.contractNumber}`,
        sourceModule: 'LEASE',
        sourceEntityId: contract.id,
        lines: [
          {
            lineNumber: 1,
            description: `بدهکار بابت اجاره ${contract.contractNumber}`,
            debitAccountId: arAccount.id,
            debitAmount: amount,
          },
          {
            lineNumber: 2,
            description: 'درآمد اجاره واحدها',
            creditAccountId: revenueAccount.id,
            creditAmount: revenueAmount,
          },
          {
            lineNumber: 3,
            description: 'مالیات بر ارزش افزوده (۹٪)',
            creditAccountId: taxAccount.id,
            creditAmount: taxAmount,
          },
        ],
      },
      contract.createdBy || contract.zoneId,
      'سیستم',
    );
  }

  async createFromPayment(invoice: any, payment: any): Promise<any> {
    const zoneId = invoice.zoneId;
    const amount = Number(payment.amount);

    const bankAccount = await this.findAccountByCode('1102', zoneId);
    const arAccount = await this.findAccountByCode('1201', zoneId);

    if (!bankAccount || !arAccount) {
      throw new AppException('ACCOUNT_NOT_FOUND');
    }

    return this.create(
      {
        zoneId,
        type: 'RECEIPT' as any,
        date: new Date().toISOString().split('T')[0],
        description: `دریافت وجه فاکتور ${invoice.invoiceNumber}`,
        sourceModule: 'INVOICE',
        sourceEntityId: invoice.id,
        lines: [
          {
            lineNumber: 1,
            description: `واریز به حساب بانکی`,
            debitAccountId: bankAccount.id,
            debitAmount: amount,
          },
          {
            lineNumber: 2,
            description: `تسویه فاکتور ${invoice.invoiceNumber}`,
            creditAccountId: arAccount.id,
            creditAmount: amount,
          },
        ],
      },
      payment.recordedBy,
      'سیستم',
    );
  }

  async createFromCommercialOrder(order: any, direction: string): Promise<any> {
    const zoneId = order.zoneId;
    const grandTotal = Number(order.grandTotal || 0);
    const taxRate = 9;
    const taxAmount = Math.round(grandTotal * taxRate / 100);
    const netAmount = grandTotal - taxAmount;

    if (direction === 'SALES') {
      const arAccount = await this.findAccountByCode('1201', zoneId);
      const revenueAccount = await this.findAccountByCode('4200', zoneId);
      const taxAccount = await this.findAccountByCode('2202', zoneId);

      return this.create(
        {
          zoneId,
          type: 'SALES' as any,
          date: new Date().toISOString().split('T')[0],
          description: `فاکتور فروش بازرگانی - ${order.orderNumber || order.id}`,
          sourceModule: 'COMMERCIAL',
          sourceEntityId: order.id,
          lines: [
            { lineNumber: 1, description: 'بدهکار بابت فروش', debitAccountId: arAccount?.id, debitAmount: grandTotal },
            { lineNumber: 2, description: 'درآمد فروش محصول', creditAccountId: revenueAccount?.id, creditAmount: netAmount },
            { lineNumber: 3, description: 'مالیات بر ارزش افزوده', creditAccountId: taxAccount?.id, creditAmount: taxAmount },
          ],
        },
        order.createdBy || zoneId,
        'سیستم',
      );
    } else {
      // PURCHASE
      const inventoryAccount = await this.findAccountByCode('1301', zoneId);
      const taxInputAccount = await this.findAccountByCode('2202', zoneId);
      const apAccount = await this.findAccountByCode('2101', zoneId);

      return this.create(
        {
          zoneId,
          type: 'PURCHASE' as any,
          date: new Date().toISOString().split('T')[0],
          description: `سند خرید بازرگانی - ${order.orderNumber || order.id}`,
          sourceModule: 'COMMERCIAL',
          sourceEntityId: order.id,
          lines: [
            { lineNumber: 1, description: 'موجودی کالا', debitAccountId: inventoryAccount?.id, debitAmount: netAmount },
            { lineNumber: 2, description: 'مالیات پرداختنی (ورودی)', debitAccountId: taxInputAccount?.id, debitAmount: taxAmount },
            { lineNumber: 3, description: 'بستانکاران تجاری', creditAccountId: apAccount?.id, creditAmount: grandTotal },
          ],
        },
        order.createdBy || zoneId,
        'سیستم',
      );
    }
  }

  async createFromPurchaseRequest(pr: any, amount: number): Promise<any> {
    const zoneId = pr.zoneId;

    // Determine which expense account to use (default to 5201 — هزینه تعمیرات و نگهداری)
    const expenseCode = pr.expenseAccountCode || '5201';
    const expenseAccount = await this.findAccountByCode(expenseCode, zoneId);
    const apAccount = await this.findAccountByCode('2101', zoneId);

    if (!expenseAccount || !apAccount) {
      throw new AppException('ACCOUNT_NOT_FOUND', {
        details: { message: 'سرفصل حساب هزینه یا بستانکاران تجاری یافت نشد' },
      });
    }

    return this.create(
      {
        zoneId,
        type: 'PURCHASE' as any,
        date: new Date().toISOString().split('T')[0],
        description: `سند خرید - درخواست خرید ${pr.requestNumber || pr.id}`,
        sourceModule: 'PROCUREMENT',
        sourceEntityId: pr.id,
        lines: [
          {
            lineNumber: 1,
            description: `هزینه خرید ${pr.description || pr.itemName || ''}`,
            debitAccountId: expenseAccount.id,
            debitAmount: amount,
          },
          {
            lineNumber: 2,
            description: 'بستانکاران تجاری',
            creditAccountId: apAccount.id,
            creditAmount: amount,
          },
        ],
      },
      pr.requestedBy || pr.createdBy || zoneId,
      'سیستم',
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private helpers
  // ═══════════════════════════════════════════════════════════════════════════

  private async findAccountByCode(code: string, zoneId: string): Promise<any | null> {
    return this.prisma.accountCode.findFirst({
      where: { code, zoneId, isActive: true },
    });
  }

  private async updateBudgetActual(
    accountCodeId: string,
    zoneId: string,
    amount: number,
    year: number,
  ): Promise<void> {
    const budget = await this.prisma.budget.findFirst({
      where: { zoneId, fiscalYear: year, status: { in: ['APPROVED', 'ACTIVE'] } },
    });

    if (!budget) return;

    const budgetLine = await this.prisma.budgetLine.findFirst({
      where: { budgetId: budget.id, accountCodeId },
    });

    if (budgetLine) {
      await this.prisma.budgetLine.update({
        where: { id: budgetLine.id },
        data: { actualAmount: { increment: BigInt(amount) } },
      });
    }
  }
}
