import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateBankAccountDto, UpdateBankAccountDto, RecordBankTransactionDto, ReconcileBankDto } from '../dto/bank-account.dto';
import { isFinancialZero } from '../utils/financial-compare';

@Injectable()
export class BankAccountService {
  private readonly logger = new Logger(BankAccountService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(zoneId: string, dto: CreateBankAccountDto): Promise<any> {
    const account = await this.prisma.bankAccount.create({
      data: {
        zoneId,
        bankName: dto.bankName,
        bankCode: dto.bankCode,
        accountNumber: dto.accountNumber,
        iban: dto.iban,
        accountType: dto.accountType,
        currencyCode: dto.currencyCode || 'IRR',
        ownerName: dto.ownerName,
        isDefault: dto.isDefault ?? false,
        notes: dto.notes,
      },
    });

    await this.audit.log({
      zoneId,
      targetId: account.id,
      targetType: 'BankAccount',
      action: 'BANK_ACCOUNT_CREATED',
      metadata: { bankName: dto.bankName, accountNumber: dto.accountNumber },
    });

    return account;
  }

  async update(id: string, dto: UpdateBankAccountDto): Promise<any> {
    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new AppException('BANK_ACCOUNT_NOT_FOUND');
    }

    return this.prisma.bankAccount.update({
      where: { id },
      data: {
        ...(dto.bankName !== undefined && { bankName: dto.bankName }),
        ...(dto.bankCode !== undefined && { bankCode: dto.bankCode }),
        ...(dto.accountNumber !== undefined && { accountNumber: dto.accountNumber }),
        ...(dto.iban !== undefined && { iban: dto.iban }),
        ...(dto.accountType !== undefined && { accountType: dto.accountType }),
        ...(dto.ownerName !== undefined && { ownerName: dto.ownerName }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async findAll(zoneId: string): Promise<any[]> {
    return this.prisma.bankAccount.findMany({
      where: { zoneId, isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const account = await this.prisma.bankAccount.findUnique({
      where: { id },
      include: { transactions: { orderBy: { transactionDate: 'desc' }, take: 10 } },
    });

    if (!account) {
      throw new AppException('BANK_ACCOUNT_NOT_FOUND');
    }

    return account;
  }

  async getBalance(id: string): Promise<number> {
    const cacheKey = REDIS_KEYS.financeBankBalance(id);
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      return parseInt(cached, 10);
    }

    const account = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!account) {
      throw new AppException('BANK_ACCOUNT_NOT_FOUND');
    }

    await this.redis.set(cacheKey, account.balance.toString(), 300);
    return Number(account.balance);
  }

  async recordTransaction(
    bankAccountId: string,
    type: string,
    amount: number,
    description: string,
    reference?: string,
    voucherId?: string,
  ): Promise<any> {
    const account = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account) {
      throw new AppException('BANK_ACCOUNT_NOT_FOUND');
    }

    const currentBalance = Number(account.balance);
    let newBalance: number;

    if (type === 'CREDIT') {
      newBalance = currentBalance + amount;
    } else {
      newBalance = currentBalance - amount;
      if (newBalance < 0) {
        throw new AppException('BANK_INSUFFICIENT_BALANCE');
      }
    }

    // Update account balance and create transaction atomically
    const [updatedAccount, transaction] = await this.prisma.$transaction([
      this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { balance: BigInt(newBalance) },
      }),
      this.prisma.bankTransaction.create({
        data: {
          zoneId: account.zoneId,
          bankAccountId,
          type: type as any,
          amount: BigInt(amount),
          balance: BigInt(newBalance),
          description,
          referenceNumber: reference,
          transactionDate: new Date(),
          voucherId,
        },
      }),
    ]);

    // Update Redis cache
    const cacheKey = REDIS_KEYS.financeBankBalance(bankAccountId);
    await this.redis.set(cacheKey, newBalance.toString(), 300);

    await this.audit.log({
      zoneId: account.zoneId,
      targetId: bankAccountId,
      targetType: 'BankTransaction',
      action: 'BANK_TRANSACTION_RECORDED',
      metadata: {
        type,
        amount,
        newBalance,
        description,
        reference,
      },
    });

    return transaction;
  }

  async reconcile(
    bankAccountId: string,
    dto: ReconcileBankDto,
    reconciledBy: string,
  ): Promise<any> {
    const account = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
    if (!account) {
      throw new AppException('BANK_ACCOUNT_NOT_FOUND');
    }

    const systemBalance = Number(account.balance);
    const statementBalance = dto.statementBalance;
    const difference = systemBalance - statementBalance;

    const unreconciledTransactions = await this.prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        isReconciled: false,
        transactionDate: { lte: new Date(dto.statementDate) },
      },
    });

    // Mark transactions as reconciled
    if (difference === 0) {
      await this.prisma.bankTransaction.updateMany({
        where: {
          bankAccountId,
          isReconciled: false,
          transactionDate: { lte: new Date(dto.statementDate) },
        },
        data: {
          isReconciled: true,
          reconciledAt: new Date(),
        },
      });

      await this.prisma.bankAccount.update({
        where: { id: bankAccountId },
        data: { lastReconciled: new Date() },
      });
    }

    await this.audit.log({
      zoneId: account.zoneId,
      userId: reconciledBy,
      targetId: bankAccountId,
      targetType: 'BankAccount',
      action: 'BANK_RECONCILED',
      metadata: {
        systemBalance,
        statementBalance,
        difference,
        unreconciledCount: unreconciledTransactions.length,
      },
    });

    return {
      systemBalance,
      statementBalance,
      difference,
      unreconciledTransactions: unreconciledTransactions.length,
      isBalanced: isFinancialZero(difference),
    };
  }

  async getTransactionHistory(
    bankAccountId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<any[]> {
    return this.prisma.bankTransaction.findMany({
      where: {
        bankAccountId,
        transactionDate: { gte: fromDate, lte: toDate },
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  async getTreasuryDashboard(zoneId: string): Promise<any> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { zoneId, isActive: true },
    });

    const totalCash = accounts.reduce((sum, a) => sum + Number(a.balance), 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayInflows, todayOutflows, pendingPayments] = await Promise.all([
      this.prisma.bankTransaction.aggregate({
        where: {
          bankAccountId: { in: accounts.map((a) => a.id) },
          type: 'CREDIT',
          transactionDate: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      this.prisma.bankTransaction.aggregate({
        where: {
          bankAccountId: { in: accounts.map((a) => a.id) },
          type: 'DEBIT',
          transactionDate: { gte: today, lt: tomorrow },
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          zoneId,
          status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
          deletedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
    ]);

    return {
      totalCash,
      accounts: accounts.map((a) => ({
        id: a.id,
        bankName: a.bankName,
        accountNumber: a.accountNumber,
        balance: Number(a.balance),
        currencyCode: a.currencyCode,
      })),
      todayInflows: Number(todayInflows._sum.amount || 0),
      todayOutflows: Number(todayOutflows._sum.amount || 0),
      pendingPayments: Number(pendingPayments._sum.remainingAmount || 0),
    };
  }
}
