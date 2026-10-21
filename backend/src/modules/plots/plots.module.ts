import { Module } from '@nestjs/common';
import { PlotService } from './plots.service';
import { PlotsController } from './plots.controller';

@Module({
  controllers: [PlotsController],
  providers: [PlotService],
  exports: [PlotService],
})
export class PlotsModule {}
