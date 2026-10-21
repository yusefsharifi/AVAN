import { Injectable, Logger } from '@nestjs/common';
import { NonConformanceReport, NcrStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateNcrDto, UpdateNcrDto } from '../dto/create-dtos';

@Injectable()
export class NcrService {
  private readonly logger = new Logger(NcrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateNcrDto): Promise<NonConformanceReport> {
    const ncrNumber = dto.ncrNumber ?? `NCR-${Date.now().toString(36).toUpperCase()}`;
    this.logger.log(`Creating NCR ${ncrNumber}`);
    return this.prisma.nonConformanceReport.create({ data: { ...dto, ncrNumber } });
  }

  async findAll(params: { status?: NcrStatus; workOrderId?: string } = {}): Promise<NonConformanceReport[]> {
    return this.prisma.nonConformanceReport.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.workOrderId ? { workOrderId: params.workOrderId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<NonConformanceReport> {
    const ncr = await this.prisma.nonConformanceReport.findUnique({ where: { id } });
    if (!ncr) throw new AppException('PRODUCTION_NCR_NOT_FOUND');
    return ncr;
  }

  async update(id: string, dto: UpdateNcrDto): Promise<NonConformanceReport> {
    const existing = await this.findById(id);
    const data: Prisma.NonConformanceReportUpdateInput = { ...dto };
    // Mirror the frontend: closing an NCR stamps closedAt when not provided
    if (dto.status === 'closed' && !existing.closedAt && !dto.closedAt) {
      data.closedAt = new Date().toISOString();
    }
    return this.prisma.nonConformanceReport.update({ where: { id }, data });
  }
}
