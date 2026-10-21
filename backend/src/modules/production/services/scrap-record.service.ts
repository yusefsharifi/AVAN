import { Injectable, Logger } from '@nestjs/common';
import { ScrapRecord } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateScrapRecordDto } from '../dto/create-dtos';

@Injectable()
export class ScrapRecordService {
  private readonly logger = new Logger(ScrapRecordService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateScrapRecordDto): Promise<ScrapRecord> {
    this.logger.log('Creating scrap record');
    return this.prisma.scrapRecord.create({ data: { ...dto } });
  }

  async findAll(params: { workOrderId?: string } = {}): Promise<ScrapRecord[]> {
    return this.prisma.scrapRecord.findMany({
      where: params.workOrderId ? { workOrderId: params.workOrderId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ScrapRecord> {
    const record = await this.prisma.scrapRecord.findUnique({ where: { id } });
    if (!record) throw new AppException('PRODUCTION_SCRAP_NOT_FOUND');
    return record;
  }
}
