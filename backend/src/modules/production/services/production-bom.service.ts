import { Injectable, Logger } from '@nestjs/common';
import { ProductionBom, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateBomDto, UpdateBomDto } from '../dto/create-dtos';

@Injectable()
export class ProductionBomService {
  private readonly logger = new Logger(ProductionBomService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBomDto): Promise<ProductionBom> {
    const bomNumber = dto.bomNumber ?? `BOM-${Date.now().toString(36).toUpperCase()}`;
    this.logger.log(`Creating production BOM ${bomNumber}`);
    const data: Prisma.ProductionBomCreateInput = {
      ...dto,
      bomNumber,
      lines: (dto.lines ?? []) as unknown as Prisma.InputJsonValue,
    };
    return this.prisma.productionBom.create({ data });
  }

  async findAll(): Promise<ProductionBom[]> {
    return this.prisma.productionBom.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string): Promise<ProductionBom> {
    const bom = await this.prisma.productionBom.findUnique({ where: { id } });
    if (!bom) throw new AppException('PRODUCTION_BOM_NOT_FOUND');
    return bom;
  }

  async update(id: string, dto: UpdateBomDto): Promise<ProductionBom> {
    await this.findById(id);
    const { lines, ...rest } = dto;
    const data: Prisma.ProductionBomUpdateInput = { ...rest };
    if (lines !== undefined) data.lines = lines as unknown as Prisma.InputJsonValue;
    return this.prisma.productionBom.update({ where: { id }, data });
  }
}
