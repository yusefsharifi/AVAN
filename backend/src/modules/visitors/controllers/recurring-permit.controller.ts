import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecurringPermitService } from '../recurring-permit.service';
import { CreateRecurringPermitDto } from '../dto/create-recurring-permit.dto';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Recurring Visitor Permits')
@ApiBearerAuth()
@Controller('/recurring-permits')
@UseGuards(JwtGuard, ZoneGuard, PermissionsGuard)
export class RecurringPermitController {
  constructor(private readonly recurringPermitService: RecurringPermitService) {}

  @Post()
  @RequirePermission('visitors.recurring-permit.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create recurring permit' })
  create(
    @Body() dto: CreateRecurringPermitDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.recurringPermitService.create(dto, userId);
  }

  @Get()
  @RequirePermission('visitors.recurring-permit.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List recurring permits' })
  findAll(
    @CurrentUser('zoneId') zoneId: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.recurringPermitService.findAll(
      zoneId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Get('expiring')
  @RequirePermission('visitors.recurring-permit.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get expiring permits' })
  getExpiring(
    @CurrentUser('zoneId') zoneId: string,
    @Query('withinDays') withinDays?: string,
  ) {
    return this.recurringPermitService.getExpiringPermits(
      zoneId,
      parseInt(withinDays || '30', 10),
    );
  }

  @Post('validate')
  @RequirePermission('visitors.recurring-permit.list.create')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Validate recurring permit QR at gate' })
  validate(
    @Body('qrPayload') qrPayload: string,
    @Body('gateId') gateId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.recurringPermitService.validate(qrPayload, gateId, zoneId);
  }

  @Get(':id')
  @RequirePermission('visitors.recurring-permit.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Permit detail' })
  findById(@Param('id') id: string) {
    return this.recurringPermitService.findById(id);
  }

  @Patch(':id/renew')
  @RequirePermission('visitors.recurring-permit.list.update')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Renew recurring permit' })
  renew(
    @Param('id') id: string,
    @Body('newValidUntil') newValidUntil: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.recurringPermitService.renew(id, newValidUntil, userId);
  }

  @Post(':id/revoke')
  @RequirePermission('visitors.recurring-permit.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Revoke recurring permit' })
  revoke(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.recurringPermitService.revoke(id, reason, userId);
  }
}
