import { Injectable, Logger } from '@nestjs/common';
import { ProductionWorkOrder, ProductionWorkOrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateWorkOrderDto, UpdateWorkOrderDto, UpdateWorkOrderStatusDto } from '../dto/create-dtos';

@Injectable()
export class ProductionWorkOrderService {
  private readonly logger = new Logger(ProductionWorkOrderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkOrderDto): Promise<ProductionWorkOrder> {
    const workOrderNumber = dto.workOrderNumber ?? `WO-${Date.now().toString(36).toUpperCase()}`;
    this.logger.log(`Creating production work order ${workOrderNumber}`);
    return this.prisma.productionWorkOrder.create({
      data: { ...dto, workOrderNumber },
    });
  }

  async findAll(params: { status?: ProductionWorkOrderStatus; lineId?: string } = {}): Promise<ProductionWorkOrder[]> {
    return this.prisma.productionWorkOrder.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(params.lineId ? { lineId: params.lineId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<ProductionWorkOrder> {
    const order = await this.prisma.productionWorkOrder.findUnique({ where: { id } });
    if (!order) throw new AppException('PRODUCTION_WORK_ORDER_NOT_FOUND');
    return order;
  }

  async update(id: string, dto: UpdateWorkOrderDto): Promise<ProductionWorkOrder> {
    await this.findById(id);
    return this.prisma.productionWorkOrder.update({ where: { id }, data: { ...dto } });
  }

  async updateStatus(id: string, dto: UpdateWorkOrderStatusDto): Promise<ProductionWorkOrder> {
    const existing = await this.findById(id);
    const data: Prisma.ProductionWorkOrderUpdateInput = { status: dto.status };
    if (dto.actualQuantity !== undefined) data.actualQuantity = dto.actualQuantity;
    if (dto.scrapQuantity !== undefined) data.scrapQuantity = dto.scrapQuantity;
    // Mirror frontend transitions: first start / completion stamp their timestamps
    if (dto.status === 'in_progress' && !existing.actualStart) {
      data.actualStart = new Date().toISOString();
    }
    if (dto.status === 'completed' && !existing.actualEnd) {
      data.actualEnd = new Date().toISOString();
    }
    return this.prisma.productionWorkOrder.update({ where: { id }, data });
  }
}
