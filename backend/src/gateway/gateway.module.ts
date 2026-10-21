import { Global, Module } from '@nestjs/common';
import { IdopGateway } from './idop.gateway';

@Global()
@Module({
  providers: [IdopGateway],
  exports: [IdopGateway],
})
export class GatewayModule {}
