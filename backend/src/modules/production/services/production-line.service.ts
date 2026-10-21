import { Injectable, Logger } from '@nestjs/common';
import { ProductionLine, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateProductionLineDto, UpdateProductionLineDto } from '../dto/create-dtos';

@Injectable()
export class ProductionLineService {
  private readonly logger = new Logger(ProductionLineService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductionLineDto): Promise<ProductionLine> {
    this.logger.log(`Creating production line ${dto.code}`);
    return this.prisma.productionLine.create({ data: { ...dto } });
  }

  async findAll(zoneId?: string): Promise<ProductionLine[]> {
    return this.prisma.productionLine.findMany({
      where: zoneId ? { zoneId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Step-4 TASK 6(b): PATCH /production/lines/:id — status/name/OEE updates.
   * Delegates straight to the existing Prisma model; no new business rules, and
   * `zoneId` is not writable here so a line can't be moved between zones.
   */
  async update(id: string, dto: UpdateProductionLineDto): Promise<ProductionLine> {
    this.logger.log(`Updating production line ${id}`);
    const data: Prisma.ProductionLineUpdateInput = { ...dto };
    return this.prisma.productionLine.update({ where: { id }, data });
  }
}
