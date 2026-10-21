import { Injectable, Logger } from '@nestjs/common';
import { ProductionSalesOrder, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateSalesOrderDto, UpdateSalesOrderDto } from '../dto/create-dtos';

@Injectable()
export class ProductionSalesOrderService {
  private readonly logger = new Logger(ProductionSalesOrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSalesOrderDto): Promise<ProductionSalesOrder> {
    const orderNumber = dto.orderNumber ?? `SO-${Date.now().toString(36).toUpperCase()}`;
    this.logger.log(`Creating production sales order ${orderNumber}`);
    const data: Prisma.ProductionSalesOrderCreateInput = {
      ...dto,
      orderNumber,
      lines: (dto.lines ?? []) as unknown as Prisma.InputJsonValue,
    };
    return this.prisma.productionSalesOrder.create({ data });
  }

  async findAll(): Promise<ProductionSalesOrder[]> {
    return this.prisma.productionSalesOrder.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string): Promise<ProductionSalesOrder> {
    const order = await this.prisma.productionSalesOrder.findUnique({ where: { id } });
    if (!order) throw new AppException('PRODUCTION_SALES_ORDER_NOT_FOUND');
    return order;
  }

  async update(id: string, dto: UpdateSalesOrderDto): Promise<ProductionSalesOrder> {
    const existing = await this.findById(id);
    const { lines, ...rest } = dto;
    const data: Prisma.ProductionSalesOrderUpdateInput = { ...rest };
    if (lines !== undefined) data.lines = lines as unknown as Prisma.InputJsonValue;
    // Status transitions mirror the frontend: confirm/complete stamp their timestamps
    if (dto.status === 'confirmed' && !existing.confirmedAt && !dto.confirmedAt) {
      data.confirmedAt = new Date().toISOString();
    }
    if (dto.status === 'completed' && !existing.completedAt && !dto.completedAt) {
      data.completedAt = new Date().toISOString();
    }
    return this.prisma.productionSalesOrder.update({ where: { id }, data });
  }
}
