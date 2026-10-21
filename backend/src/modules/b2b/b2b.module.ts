import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { BullService } from '../../bull/bull.service';
import { PrismaService } from '../../prisma/prisma.service';

// Services
import { RfqService } from './services/rfq.service';
import { BidService } from './services/bid.service';
import { BidEvaluationService } from './services/bid-evaluation.service';
import { AwardService } from './services/award.service';
import { ProductCatalogService } from './services/product-catalog.service';
import { SupplierProfileService } from './services/supplier-profile.service';
import { B2bGatewayService } from './services/b2b-gateway.service';

// Controllers
import { RfqController } from './controllers/rfq.controller';
import { BidController } from './controllers/bid.controller';
import { EvaluationController } from './controllers/evaluation.controller';
import { AwardController } from './controllers/award.controller';
import { CatalogController } from './controllers/catalog.controller';
import { SupplierController } from './controllers/supplier.controller';

// Jobs
import { registerB2bJobs } from './jobs/b2b-jobs';

@Module({
  imports: [GatewayModule],
  controllers: [
    RfqController,
    BidController,
    EvaluationController,
    AwardController,
    CatalogController,
    SupplierController,
  ],
  providers: [
    RfqService,
    BidService,
    BidEvaluationService,
    AwardService,
    ProductCatalogService,
    SupplierProfileService,
    B2bGatewayService,
  ],
  exports: [
    RfqService,
    BidService,
    BidEvaluationService,
    AwardService,
    ProductCatalogService,
    SupplierProfileService,
    B2bGatewayService,
  ],
})
export class B2bModule implements OnModuleInit {
  private readonly logger = new Logger(B2bModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly rfqService: RfqService,
    private readonly bidEvaluationService: BidEvaluationService,
    private readonly supplierProfileService: SupplierProfileService,
    private readonly productCatalogService: ProductCatalogService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    // Register B2B BullMQ job handlers
    registerB2bJobs(this.bull, {
      rfqService: this.rfqService,
      bidEvaluationService: this.bidEvaluationService,
      supplierProfileService: this.supplierProfileService,
      productCatalogService: this.productCatalogService,
      prisma: this.prisma,
      logger: this.logger,
    });

    this.logger.log('B2B Exchange module initialized');
  }
}
