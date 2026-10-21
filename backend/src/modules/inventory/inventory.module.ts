import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

import { WarehouseService } from './services/warehouse.service';
import { ItemService } from './services/item.service';
import { StockService } from './services/stock.service';
import { MaterialRequisitionService } from './services/material-requisition.service';
import { GoodsReceiptService } from './services/goods-receipt.service';
import { PurchaseRequestService } from './services/purchase-request.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { PhysicalCountService } from './services/physical-count.service';
import { VendorService } from './services/vendor.service';
import { InventoryGatewayService } from './services/inventory-gateway.service';

import { WarehouseController } from './controllers/warehouse.controller';
import { ItemController } from './controllers/item.controller';
import { StockController } from './controllers/stock.controller';
import { RequisitionController } from './controllers/requisition.controller';
import { GoodsReceiptController } from './controllers/goods-receipt.controller';
import { PurchaseRequestController } from './controllers/purchase-request.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { VendorController } from './controllers/vendor.controller';
import { PhysicalCountController } from './controllers/physical-count.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    WarehouseController, ItemController, StockController, RequisitionController,
    GoodsReceiptController, PurchaseRequestController, PurchaseOrderController,
    VendorController, PhysicalCountController,
  ],
  providers: [
    WarehouseService, ItemService, StockService, MaterialRequisitionService,
    GoodsReceiptService, PurchaseRequestService, PurchaseOrderService,
    PhysicalCountService, VendorService, InventoryGatewayService,
  ],
  exports: [
    WarehouseService, ItemService, StockService, MaterialRequisitionService,
    GoodsReceiptService, PurchaseRequestService, PurchaseOrderService,
    PhysicalCountService, VendorService, InventoryGatewayService,
  ],
})
export class InventoryModule implements OnModuleInit {
  private readonly logger = new Logger(InventoryModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly prisma: PrismaService,
    private readonly itemService: ItemService,
    private readonly stockService: StockService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Inventory module BullMQ workers...');

    this.bull.registerWorker('inventory', async (job) => {
      this.logger.log(`Processing Inventory job: ${job.name}`);
      switch (job.name) {
        case 'check-low-stock': await this.processLowStock(job.data); break;
        case 'check-expiry': await this.processExpiry(job.data); break;
        case 'daily-inventory-snapshot': await this.processSnapshot(job.data); break;
        default: this.logger.warn(`Unknown Inventory job: ${job.name}`);
      }
    });

    const queue = this.bull.getQueue('inventory');

    // check-low-stock: daily at 08:00 Tehran (04:30 UTC)
    queue.add('check-low-stock', {}, { repeat: { pattern: '30 4 * * *' } });
    // check-expiry: daily at 09:00 Tehran (05:30 UTC)
    queue.add('check-expiry', {}, { repeat: { pattern: '30 5 * * *' } });
    // daily-inventory-snapshot: 23:45 Tehran (20:15 UTC)
    queue.add('daily-inventory-snapshot', {}, { repeat: { pattern: '15 20 * * *' } });
  }

  private async processLowStock(_data: any): Promise<void> {
    this.logger.log('Checking low stock items...');
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        const lowStock = await this.itemService.getLowStockItems(zone.id);
        this.logger.log(`Zone ${zone.code}: ${lowStock.length} low stock items`);
      } catch (err) {
        this.logger.error(`Error checking low stock for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processExpiry(_data: any): Promise<void> {
    this.logger.log('Checking expiring items...');
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    for (const zone of zones) {
      try {
        const expiring = await this.itemService.getExpiringItems(zone.id, 30);
        this.logger.log(`Zone ${zone.code}: ${expiring.length} expiring items`);
      } catch (err) {
        this.logger.error(`Error checking expiry for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async processSnapshot(_data: any): Promise<void> {
    this.logger.log('Processing daily inventory snapshot...');
  }
}
