import { Module } from '@nestjs/common';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  controllers: [RolesController],
  providers: [RolesService, PermissionsService, PermissionsGuard],
  exports: [RolesService, PermissionsService, PermissionsGuard],
})
export class RolesModule {}
