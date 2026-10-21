import { Injectable, Logger } from '@nestjs/common';
import { QualityCheck, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateQualityCheckDto } from '../dto/create-dtos';

@Injectable()
export class QualityCheckService {
  private readonly logger = new Logger(QualityCheckService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQualityCheckDto): Promise<QualityCheck> {
    const checkNumber = dto.checkNumber ?? `QC-${Date.now().toString(36).toUpperCase()}`;
    // Mirror the frontend: derive defect rate from sample size when not provided
    const sampleSize = dto.sampleSize ?? 0;
    const defectCount = dto.defectCount ?? 0;
    const defectRate = dto.defectRate ?? (sampleSize > 0 ? Math.round((defectCount / sampleSize) * 100 * 100) / 100 : 0);
    this.logger.log(`Creating quality check ${checkNumber}`);
    const data: Prisma.QualityCheckCreateInput = {
      ...dto,
      checkNumber,
      sampleSize,
      defectCount,
      defectRate,
      parameters: (dto.parameters ?? []) as unknown as Prisma.InputJsonValue,
      attachments: (dto.attachments ?? []) as unknown as Prisma.InputJsonValue,
    };
    return this.prisma.qualityCheck.create({ data });
  }

  async findAll(params: { workOrderId?: string; result?: string } = {}): Promise<QualityCheck[]> {
    return this.prisma.qualityCheck.findMany({
      where: {
        ...(params.workOrderId ? { workOrderId: params.workOrderId } : {}),
        ...(params.result ? { result: params.result as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<QualityCheck> {
    const check = await this.prisma.qualityCheck.findUnique({ where: { id } });
    if (!check) throw new AppException('PRODUCTION_QC_NOT_FOUND');
    return check;
  }
}
