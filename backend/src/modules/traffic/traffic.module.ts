import { Module } from '@nestjs/common';
import { TrafficController } from './traffic.controller';
import { GuardPortalModule } from '../guard-portal/guard-portal.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [GuardPortalModule, PrismaModule],
  controllers: [TrafficController],
})
export class TrafficModule {}
