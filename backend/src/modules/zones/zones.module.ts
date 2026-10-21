import { Module } from '@nestjs/common';
import { ZoneService } from './zones.service';
import { ZonesController } from './zones.controller';

@Module({
  controllers: [ZonesController],
  providers: [ZoneService],
  exports: [ZoneService],
})
export class ZonesModule {}
