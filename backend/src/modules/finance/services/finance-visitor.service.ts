import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateFinanceVisitorDto, UpdateFinanceVisitorDto } from '../dto/visitor.dto';

/**
 * Finance sales-agent visitors (Step 7 / TASK A).
 *
 * This is the commission-earning field agent that `BuyerSeller.visitorId`
 * points at — NOT the guard-portal `VisitorRequest`. See schema.prisma for the
 * full note on why the two were kept apart.
 *
 * `commissionRate` is a percentage, so it is a Prisma `Float` and stays a plain
 * number at the boundary (no BigInt conversion — it is a rate, not an amount).
 * Every read is zone-scoped.
 */
@Injectable()
export class FinanceVisitorService {
  private readonly logger = new Logger(FinanceVisitorService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Returns exactly the eight fields the frontend `Visitor` declares. */
  private static present(row: any): Record<string, unknown> {
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      phone: row.phone ?? '',
      region: row.region ?? '',
      commissionRate: row.commissionRate ?? 0,
      status: row.status,
      notes: row.notes ?? '',
    };
  }

  async findAll(zoneId: string): Promise<Record<string, unknown>[]> {
    const rows = await this.prisma.financeVisitor.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => FinanceVisitorService.present(row));
  }

  async findOne(zoneId: string, id: string): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeVisitor.findFirst({ where: { id, zoneId } });
    if (!row) throw new AppException('FINANCE_VISITOR_NOT_FOUND');
    return FinanceVisitorService.present(row);
  }

  async create(zoneId: string, dto: CreateFinanceVisitorDto): Promise<Record<string, unknown>> {
    const row = await this.prisma.financeVisitor.create({
      data: {
        zoneId,
        code: dto.code,
        name: dto.name,
        phone: dto.phone ?? '',
        region: dto.region ?? '',
        commissionRate: dto.commissionRate ?? 0,
        status: dto.status ?? 'active',
        notes: dto.notes ?? '',
      },
    });
    this.logger.log(`visitor created zone=${zoneId} code=${dto.code}`);
    return FinanceVisitorService.present(row);
  }

  async update(
    zoneId: string,
    id: string,
    dto: UpdateFinanceVisitorDto,
  ): Promise<Record<string, unknown>> {
    const existing = await this.prisma.financeVisitor.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_VISITOR_NOT_FOUND');

    const row = await this.prisma.financeVisitor.update({
      where: { id },
      data: {
        ...(dto.code !== undefined && { code: dto.code }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.region !== undefined && { region: dto.region }),
        ...(dto.commissionRate !== undefined && { commissionRate: dto.commissionRate }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
    return FinanceVisitorService.present(row);
  }

  async remove(zoneId: string, id: string): Promise<void> {
    const existing = await this.prisma.financeVisitor.findFirst({ where: { id, zoneId } });
    if (!existing) throw new AppException('FINANCE_VISITOR_NOT_FOUND');
    await this.prisma.financeVisitor.delete({ where: { id } });
  }
}
