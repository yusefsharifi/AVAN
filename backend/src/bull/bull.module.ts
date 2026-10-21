import { Global, Module } from '@nestjs/common';
import { BullService } from './bull.service';

@Global()
@Module({
  providers: [BullService],
  exports: [BullService],
})
export class BullModule {}
