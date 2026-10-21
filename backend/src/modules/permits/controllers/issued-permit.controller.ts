import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
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
import { IssuedPermitService } from '../services/issued-permit.service';
import { IssuePermitDto } from '../dto/issue-permit.dto';
import { SuspendPermitDto } from '../dto/suspend-permit.dto';
import { RenewPermitDto } from '../dto/renew-permit.dto';
import { FulfillConditionDto } from '../dto/fulfill-condition.dto';
import { FilterIssuedPermitsDto } from '../dto/filter-permits.dto';

@ApiTags('Issued Permits')
@ApiBearerAuth()
@Controller('/permits')
@UseGuards(JwtGuard, RolesGuard, ZoneGuard, PermissionsGuard)
export class IssuedPermitController {
  constructor(private readonly issuedPermitService: IssuedPermitService) {}

  @Post('issue')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Issue permit from approved request' })
  async issue(
    @Body() dto: IssuePermitDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.issuedPermitService.issue(dto, userId, zoneId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List issued permits' })
  async findAll(
    @Query() filter: FilterIssuedPermitsDto,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.issuedPermitService.findAll({ ...filter, zoneId });
    return { success: true, ...result };
  }

  @Get('expiring')
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get expiring permits' })
  async getExpiring(
    @ZoneId() zoneId: string,
    @Query('withinDays') withinDays?: number,
  ) {
    const data = await this.issuedPermitService.getExpiringPermits(zoneId, withinDays || 30);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get permit statistics' })
  async getStats(
    @ZoneId() zoneId: string,
    @Query('companyId') companyId?: string,
  ) {
    const data = await this.issuedPermitService.getPermitStats(zoneId, companyId);
    return { success: true, data };
  }

  @Get('company-dashboard')
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('COMPANY_ADMIN', 'COMPANY_MANAGER')
  @ApiOperation({ summary: 'Get company permit dashboard' })
  async getCompanyDashboard(
    @CurrentUser('companyId') companyId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.issuedPermitService.getCompanyPermitDashboard(companyId, zoneId);
    return { success: true, data };
  }

  @Get('verify')
  @RequirePermission('permits.issued-permit.list.view')
  @ApiOperation({ summary: 'Verify permit by QR hash (PUBLIC)' })
  async verify(@Query('qrHash') qrHash: string) {
    const data = await this.issuedPermitService.verifyByQrHash(qrHash);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Get permit by ID' })
  async findById(
    @Param('id') id: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.issuedPermitService.findById(id, zoneId);
    return { success: true, data };
  }

  @Post(':id/suspend')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Suspend permit' })
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendPermitDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.issuedPermitService.suspend(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/reinstate')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Reinstate suspended permit' })
  async reinstate(
    @Param('id') id: string,
    @Body('notes') notes: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.issuedPermitService.reinstate(id, notes, userId);
    return { success: true, data };
  }

  @Post(':id/revoke')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Revoke permit' })
  async revoke(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.issuedPermitService.revoke(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/renew')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Request permit renewal' })
  async renew(
    @Param('id') id: string,
    @Body() dto: RenewPermitDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.issuedPermitService.renew({ ...dto, existingPermitId: id }, userId, zoneId);
    return { success: true, data };
  }

  @Get(':id/conditions')
  @RequirePermission('permits.issued-permit.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get open conditions' })
  async getConditions(@Param('id') id: string) {
    const data = await this.issuedPermitService.getOpenConditions(id);
    return { success: true, data };
  }

  @Post(':id/conditions/fulfill')
  @RequirePermission('permits.issued-permit.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Fulfill a condition' })
  async fulfillCondition(
    @Param('id') permitId: string,
    @Body() dto: FulfillConditionDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.issuedPermitService.fulfillCondition(dto, userId);
    return { success: true, data };
  }
}
