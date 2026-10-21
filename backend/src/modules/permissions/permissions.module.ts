import { Module } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

/**
 * PermissionsModule — provides PermissionsService.
 *
 * Note: PermissionsService is also exported globally via CommonModule.
 * This module exists for explicit imports by feature modules that need it.
 */
@Module({
  providers: [PermissionsService],
  exports: [PermissionsService],
})
export class PermissionsModule {}
