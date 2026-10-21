import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { CommercialContractService } from '../services/commercial-contract.service';
import { CreateCommercialContractDto, AddAddendumDto } from '../dto/create-dtos';

@ApiTags('Commercial - Contracts')
@ApiBearerAuth()
@Controller('/commercial/contracts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ContractController {
  constructor(private readonly contractService: CommercialContractService) {}

  @Post()
  @RequirePermission('commercial.contract.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create contract' })
  async create(@Body() dto: CreateCommercialContractDto, @CurrentUser('sub') userId: string) {
    const data = await this.contractService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('commercial.contract.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List contracts' })
  async findAll(@ZoneId() zoneId: string, @Query() filter: any) {
    const result = await this.contractService.findAll(zoneId, filter);
    return { success: true, ...result };
  }

  @Get('expiring')
  @RequirePermission('commercial.contract.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get expiring contracts' })
  async getExpiring(@ZoneId() zoneId: string, @Query('withinDays') withinDays?: number) {
    const data = await this.contractService.getExpiringContracts(zoneId, withinDays || 30);
    return { success: true, data };
  }

  @Get('calendar')
  @RequirePermission('commercial.contract.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Milestone calendar' })
  async getCalendar(
    @ZoneId() zoneId: string,
    @Query('month') month: number,
    @Query('year') year: number,
  ) {
    const data = await this.contractService.getMilestoneCalendar(zoneId, month, year);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('commercial.contract.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get contract by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.contractService.findById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('commercial.contract.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update contract' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCommercialContractDto>,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.contractService.update(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/activate')
  @RequirePermission('commercial.contract.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Activate contract' })
  async activate(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.contractService.activate(id, userId);
    return { success: true, data };
  }

  @Post(':id/suspend')
  @RequirePermission('commercial.contract.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Suspend contract' })
  async suspend(@Param('id') id: string, @Body('reason') reason: string) {
    const data = await this.contractService.suspend(id, reason);
    return { success: true, data };
  }

  @Post(':id/terminate')
  @RequirePermission('commercial.contract.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Terminate contract' })
  async terminate(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.contractService.terminate(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/renew')
  @RequirePermission('commercial.contract.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Renew contract' })
  async renew(
    @Param('id') id: string,
    @Body('newEndDate') newEndDate: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.contractService.renew(id, newEndDate, userId);
    return { success: true, data };
  }

  @Post(':id/addenda')
  @RequirePermission('commercial.contract.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Add addendum' })
  async addAddendum(
    @Param('id') contractId: string,
    @Body() dto: AddAddendumDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.contractId = contractId;
    const data = await this.contractService.addAddendum(dto, userId);
    return { success: true, data };
  }

  @Patch(':id/schedule/:sid/pay')
  @RequirePermission('commercial.contract.list.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Record schedule payment' })
  async recordSchedulePayment(
    @Param('sid') scheduleId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.contractService.recordPaymentSchedulePayment(
      scheduleId,
      new Date(),
      userId,
    );
    return { success: true, data };
  }

  @Patch(':id/deliverables/:did')
  @RequirePermission('commercial.contract.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update deliverable status' })
  async updateDeliverable(
    @Param('did') deliverableId: string,
    @Body('status') status: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.contractService.updateDeliverableStatus(deliverableId, status, userId);
    return { success: true, data };
  }
}
