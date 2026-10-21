import { Module } from '@nestjs/common';
import { VisitorService } from './visitor.service';
import { GroupVisitService } from './group-visit.service';
import { RecurringPermitService } from './recurring-permit.service';
import { VisitorBlacklistService } from './visitor-blacklist.service';
import { VisitorController } from './controllers/visitor.controller';
import { WalkInController } from './controllers/walk-in.controller';
import { GroupVisitController } from './controllers/group-visit.controller';
import { RecurringPermitController } from './controllers/recurring-permit.controller';
import { VisitorBlacklistController } from './controllers/blacklist.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { BullModule } from '../../bull/bull.module';
import { GatewayModule } from '../../gateway/gateway.module';
import { AuditService } from '../../common/services/audit.service';

@Module({
  imports: [PrismaModule, RedisModule, BullModule, GatewayModule],
  controllers: [
    VisitorController,
    WalkInController,
    GroupVisitController,
    RecurringPermitController,
    VisitorBlacklistController,
  ],
  providers: [
    VisitorService,
    GroupVisitService,
    RecurringPermitService,
    VisitorBlacklistService,
    AuditService,
  ],
  exports: [
    VisitorService,
    GroupVisitService,
    RecurringPermitService,
    VisitorBlacklistService,
  ],
})
export class VisitorsModule {}
