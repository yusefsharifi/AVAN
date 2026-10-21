import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateBudgetDto } from '../dto/create-budget.dto';
import { FinanceGatewayService } from './finance-gateway.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: FinanceGatewayService,
  ) {}

  async create(dto: CreateBudgetDto, createdBy: string): Promise<any> {
    // Check for existing budget for this zone and year
    const existing = await this.prisma.budget.findFirst({
      where: { zoneId: dto.zoneId, fiscalYear: dto.fiscalYear },
    });

    if (existing) {
      throw new AppException('BUDGET_EXCEEDED', {
        details: { message: `بودجه سال ${dto.fiscalYear} قبلاً تعریف شده است` },
      });
    }

    const totalAmount = dto.lines.reduce((sum, line) => sum + line.amount, 0);

    const budget = await this.prisma.budget.create({
      data: {
        zoneId: dto.zoneId,
        name: dto.name,
        fiscalYear: dto.fiscalYear,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        totalAmount: BigInt(totalAmount),
        createdBy,
        lines: {
          create: dto.lines.map((line) => ({
            accountCodeId: line.accountCodeId,
            costCenterId: line.costCenterId,
            amount: BigInt(line.amount),
            q1Amount: BigInt(line.q1Amount || 0),
            q2Amount: BigInt(line.q2Amount || 0),
            q3Amount: BigInt(line.q3Amount || 0),
            q4Amount: BigInt(line.q4Amount || 0),
            description: line.description,
          })),
        },
      },
      include: { lines: { include: { account: true } } },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: budget.id,
      targetType: 'Budget',
      action: 'BUDGET_CREATED',
      metadata: { name: dto.name, fiscalYear: dto.fiscalYear, totalAmount },
    });

    return budget;
  }

  async approve(id: string, approvedBy: string): Promise<any> {
    const budget = await this.findById(id);

    if (budget.status !== 'DRAFT') {
      throw new AppException('BUDGET_NOT_APPROVED', {
        details: { currentStatus: budget.status },
      });
    }

    const updated = await this.prisma.budget.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        approvedAt: new Date(),
      },
      include: { lines: { include: { account: true } } },
    });

    await this.audit.log({
      zoneId: budget.zoneId,
      userId: approvedBy,
      targetId: id,
      targetType: 'Budget',
      action: 'BUDGET_APPROVED',
      metadata: { name: budget.name, fiscalYear: budget.fiscalYear },
    });

    return updated;
  }

  async findAll(zoneId: string, fiscalYear?: number): Promise<any[]> {
    const where: any = { zoneId };
    if (fiscalYear) where.fiscalYear = fiscalYear;

    return this.prisma.budget.findMany({
      where,
      orderBy: { fiscalYear: 'desc' },
      include: { lines: { include: { account: true } } },
    });
  }

  async findById(id: string): Promise<any> {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { lines: { include: { account: true } } },
    });

    if (!budget) {
      throw new AppException('BUDGET_NOT_FOUND');
    }

    return budget;
  }

  async checkBudget(
    accountCodeId: string,
    zoneId: string,
    amount: number,
    date: string,
  ): Promise<{ hasBudget: boolean; available: number; isOverBudget: boolean }> {
    const year = new Date(date).getFullYear();

    const budget = await this.prisma.budget.findFirst({
      where: { zoneId, fiscalYear: year, status: { in: ['APPROVED', 'ACTIVE'] } },
    });

    if (!budget) {
      return { hasBudget: false, available: 0, isOverBudget: false };
    }

    const budgetLine = await this.prisma.budgetLine.findFirst({
      where: { budgetId: budget.id, accountCodeId },
    });

    if (!budgetLine) {
      return { hasBudget: false, available: 0, isOverBudget: false };
    }

    const budgeted = Number(budgetLine.amount);
    const actual = Number(budgetLine.actualAmount);
    const available = budgeted - actual;
    const isOverBudget = actual + amount > budgeted;

    return {
      hasBudget: true,
      available,
      isOverBudget,
    };
  }

  async updateActual(
    accountCodeId: string,
    zoneId: string,
    amount: number,
    date: string,
  ): Promise<void> {
    const year = new Date(date).getFullYear();

    const budget = await this.prisma.budget.findFirst({
      where: { zoneId, fiscalYear: year, status: { in: ['APPROVED', 'ACTIVE'] } },
    });

    if (!budget) return;

    const budgetLine = await this.prisma.budgetLine.findFirst({
      where: { budgetId: budget.id, accountCodeId },
    });

    if (!budgetLine) return;

    await this.prisma.budgetLine.update({
      where: { id: budgetLine.id },
      data: { actualAmount: { increment: BigInt(amount) } },
    });

    // Check if budget exceeded
    const updated = await this.prisma.budgetLine.findUnique({ where: { id: budgetLine.id } });
    if (updated && Number(updated.actualAmount) > Number(updated.amount)) {
      await this.audit.log({
        zoneId,
        targetId: budget.id,
        targetType: 'Budget',
        action: 'BUDGET_EXCEEDED',
        metadata: {
          accountCodeId,
          budgeted: Number(updated.amount),
          actual: Number(updated.actualAmount),
          excess: Number(updated.actualAmount) - Number(updated.amount),
        },
      });

      const account = await this.prisma.accountCode.findUnique({ where: { id: accountCodeId } });
      this.gateway.emitBudgetExceeded({
        zoneId,
        budgetId: budget.id,
        accountCode: account?.code || accountCodeId,
        accountName: account?.nameFa || '',
        budgeted: Number(updated.amount),
        actual: Number(updated.actualAmount),
        excess: Number(updated.actualAmount) - Number(updated.amount),
      });
    }
  }

  async getVarianceReport(budgetId: string): Promise<any> {
    const budget = await this.findById(budgetId);

    const lines = budget.lines.map((line: any) => {
      const budgeted = Number(line.amount);
      const actual = Number(line.actualAmount);
      const variance = budgeted - actual;
      const variancePct = budgeted > 0 ? Math.round((variance / budgeted) * 100) : 0;

      return {
        accountCode: line.account.code,
        accountNameFa: line.account.nameFa,
        budgeted,
        actual,
        variance,
        variancePct,
      };
    });

    return {
      budgetId: budget.id,
      budgetName: budget.name,
      fiscalYear: budget.fiscalYear,
      lines,
      totalBudgeted: lines.reduce((sum: number, l: any) => sum + l.budgeted, 0),
      totalActual: lines.reduce((sum: number, l: any) => sum + l.actual, 0),
      totalVariance: lines.reduce((sum: number, l: any) => sum + l.variance, 0),
    };
  }
}
