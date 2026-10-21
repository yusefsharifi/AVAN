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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { PermitInspectionService } from '../services/permit-inspection.service';
import { CreatePermitInspectionDto } from '../dto/create-inspection.dto';
import { CompleteInspectionDto } from '../dto/complete-inspection.dto';

@ApiTags('Permit Inspections')
@ApiBearerAuth()
@Controller('/permit-inspections')
@UseGuards(JwtGuard, RolesGuard, ZoneGuard, PermissionsGuard)
export class InspectionController {
  constructor(private readonly inspectionService: PermitInspectionService) {}

  @Get('my-schedule')
  @RequirePermission('permits.inspection.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get inspector schedule' })
  async getMySchedule(
    @CurrentUser('sub') userId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.inspectionService.getInspectorSchedule(userId, fromDate, toDate);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('permits.inspection.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get inspection by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.inspectionService['findById'](id);
    return { success: true, data };
  }

  @Patch(':id/complete')
  @RequirePermission('permits.inspection.list.update')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Complete inspection' })
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteInspectionDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.inspectionService.complete(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/reschedule')
  @RequirePermission('permits.inspection.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Reschedule inspection' })
  async reschedule(
    @Param('id') id: string,
    @Body('newDate') newDate: string,
    @Body('reason') reason: string,
  ) {
    const data = await this.inspectionService.reschedule(id, newDate, reason);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission('permits.inspection.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Cancel inspection' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const data = await this.inspectionService.cancel(id, reason);
    return { success: true, data };
  }
}
