import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { FinancialPeriodService } from '../services/financial-period.service';
import { CreatePeriodDto } from '../dto/period.dto';

@ApiTags('Finance - Periods')
@ApiBearerAuth()
@Controller('/finance/periods')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class PeriodController {
  constructor(private readonly periodService: FinancialPeriodService) {}

  @Post()
  @RequirePermission('finance.periods.periods.create')
  @ApiOperation({ summary: 'Create financial period' })
  async create(
    @Body() dto: CreatePeriodDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.periodService.create(dto, zoneId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.periods.periods.view')
  @ApiOperation({ summary: 'List periods' })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.periodService.findAll(zoneId);
    return { success: true, data };
  }

  @Get('current')
  @RequirePermission('finance.periods.periods.view')
  @ApiOperation({ summary: 'Get current open period' })
  async getCurrent(@ZoneId() zoneId: string) {
    const data = await this.periodService.findCurrent(zoneId);
    return { success: true, data };
  }

  @Post(':id/close')
  @RequirePermission('finance.periods.periods.create')
  @ApiOperation({ summary: 'Close period' })
  async close(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.periodService.close(id, userId);
    return { success: true, data };
  }

  @Post(':id/lock')
  @RequirePermission('finance.periods.periods.create')
  @ApiOperation({ summary: 'Lock period (permanent)' })
  async lock(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.periodService.lock(id, userId);
    return { success: true, data };
  }
}
