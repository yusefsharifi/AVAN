import { Global, Module } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { PermissionsService } from '../modules/permissions/permissions.service';
import { PermissionsGuard } from './guards/permissions.guard';

@Global()
@Module({
  providers: [AuditService, PermissionsService, PermissionsGuard],
  exports: [AuditService, PermissionsService, PermissionsGuard],
})
export class CommonModule {}
