import { Module } from '@nestjs/common';
import { BlacklistController } from './blacklist.controller';
import { GuardPortalModule } from '../guard-portal/guard-portal.module';

@Module({
  imports: [GuardPortalModule],
  controllers: [BlacklistController],
})
export class BlacklistModule {}
