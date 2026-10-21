import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { BullModule } from './bull/bull.module';
import { MqttModule } from './mqtt/mqtt.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ZonesModule } from './modules/zones/zones.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { PlotsModule } from './modules/plots/plots.module';
import { GuardPortalModule } from './modules/guard-portal/guard-portal.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { BlacklistModule } from './modules/blacklist/blacklist.module';
import { TrafficModule } from './modules/traffic/traffic.module';
import { LogisticsModule } from './modules/logistics/logistics.module';
import { VisitorsModule } from './modules/visitors/visitors.module';
import { PermitsModule } from './modules/permits/permits.module';
import { CorrespondenceModule } from './modules/correspondence/correspondence.module';
import { WorkflowModule } from './modules/workflow/workflow.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { FinanceModule } from './modules/finance/finance.module';
import { B2bModule } from './modules/b2b/b2b.module';
import { GatewayModule } from './gateway/gateway.module';
// SECURITY FIX (COMP-001): Register all 10 previously missing modules
import { IotModule } from './modules/iot/iot.module';
import { HrModule } from './modules/hr/hr.module';
import { CmmsModule } from './modules/cmms/cmms.module';
import { HseModule } from './modules/hse/hse.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { DocumentVerificationModule } from './modules/document-verification/document-verification.module';
import { DigitalSignatureModule } from './modules/digital-signature/digital-signature.module';
import { CommercialModule } from './modules/commercial/commercial.module';
import { ProductionModule } from './modules/production/production.module';
import { HealthModule } from './health/health.module';
import { CommonModule } from './common/common.module';
import { RolesModule } from './modules/roles/roles.module';

@Global()
@Module({
  imports: [
    // Infrastructure
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    HealthModule,
    PrismaModule,
    RedisModule,
    BullModule,
    MqttModule,
    EventEmitterModule.forRoot(),
    GatewayModule,
    // Core modules
    AuthModule,
    UsersModule,
    ZonesModule,
    CompaniesModule,
    PlotsModule,
    GuardPortalModule,
    VehiclesModule,
    BlacklistModule,
    TrafficModule,
    LogisticsModule,
    VisitorsModule,
    PermitsModule,
    CorrespondenceModule,
    WorkflowModule,
    NotificationsModule,
    FinanceModule,
    B2bModule,
    // SECURITY FIX (COMP-001): Previously missing modules — now registered
    IotModule,
    HrModule,
    CmmsModule,
    HseModule,
    InventoryModule,
    ReportingModule,
    SuperAdminModule,
    DocumentVerificationModule,
    DigitalSignatureModule,
    CommercialModule,
    ProductionModule,
    RolesModule,
  ],
})
export class AppModule {}
