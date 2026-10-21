import { Module } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

// Services
import { ProformaService } from './services/proforma.service';
import { CommercialOrderService } from './services/commercial-order.service';
import { CollectionService } from './services/collection.service';
import { CommercialContractService } from './services/commercial-contract.service';
import { CommercialPartyService } from './services/commercial-party.service';
import { CommercialGatewayService } from './services/commercial-gateway.service';

// Controllers
import { ProformaController } from './controllers/proforma.controller';
import { OrderController } from './controllers/order.controller';
import { CollectionController } from './controllers/collection.controller';
import { ContractController } from './controllers/contract.controller';
import { PartyController } from './controllers/party.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    ProformaController,
    OrderController,
    CollectionController,
    ContractController,
    PartyController,
  ],
  providers: [
    ProformaService,
    CommercialOrderService,
    CollectionService,
    CommercialContractService,
    CommercialPartyService,
    CommercialGatewayService,
  ],
  exports: [
    ProformaService,
    CommercialOrderService,
    CollectionService,
    CommercialContractService,
    CommercialPartyService,
    CommercialGatewayService,
  ],
})
export class CommercialModule {}
