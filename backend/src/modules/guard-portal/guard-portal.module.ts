import { Module } from '@nestjs/common';
import { GuardPortalService } from './guard-portal.service';
import { GuardPortalController } from './guard-portal.controller';

@Module({
  controllers: [GuardPortalController],
  providers: [GuardPortalService],
  exports: [GuardPortalService],
})
export class GuardPortalModule {}
