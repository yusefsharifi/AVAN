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
import { LeaseContractService } from '../services/lease-contract.service';
import { CreateLeaseContractDto } from '../dto/create-lease.dto';
import { FilterLeasesDto } from '../dto/filter.dto';

@ApiTags('Finance - Leases')
@ApiBearerAuth()
@Controller('/finance/leases')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class LeaseController {
  constructor(private readonly leaseService: LeaseContractService) {}

  @Post()
  @RequirePermission('finance.leases.leases.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create lease contract' })
  async create(
    @Body() dto: CreateLeaseContractDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.leaseService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.leases.leases.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List lease contracts' })
  async findAll(@Query() filter: FilterLeasesDto, @ZoneId() zoneId: string) {
    const result = await this.leaseService.findAll({ ...filter, zoneId });
    return { success: true, ...result };
  }

  @Get('expiring')
  @RequirePermission('finance.leases.leases.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get expiring contracts' })
  async getExpiring(
    @ZoneId() zoneId: string,
    @Query('withinDays') withinDays?: number,
  ) {
    const data = await this.leaseService.getExpiringContracts(zoneId, withinDays || 60);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('finance.leases.leases.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get lease statistics' })
  async getStats(@ZoneId() zoneId: string) {
    const data = await this.leaseService.getContractStats(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.leases.leases.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get contract by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.leaseService.findById(id);
    return { success: true, data };
  }

  @Post(':id/suspend')
  @RequirePermission('finance.leases.leases.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Suspend contract' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.leaseService.suspend(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/terminate')
  @RequirePermission('finance.leases.leases.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Terminate contract' })
  async terminate(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.leaseService.terminate(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/renew')
  @RequirePermission('finance.leases.leases.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Renew contract' })
  async renew(
    @Param('id') id: string,
    @Body('newEndDate') newEndDate: string,
    @Body('newMonthlyRent') newMonthlyRent?: number,
    @CurrentUser('sub') userId?: string,
  ) {
    const data = await this.leaseService.renew(id, new Date(newEndDate), newMonthlyRent, userId);
    return { success: true, data };
  }

  @Get(':id/payments')
  @RequirePermission('finance.leases.leases.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get payment schedule' })
  async getPayments(@Param('id') id: string) {
    const contract = await this.leaseService.findById(id);
    return { success: true, data: contract.paymentSchedule };
  }

  @Post(':id/payments/:pid/record')
  @RequirePermission('finance.leases.leases.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Record lease payment' })
  async recordPayment(
    @Param('id') contractId: string,
    @Param('pid') leasePaymentId: string,
    @Body('amount') amount: number,
    @Body('method') method: string,
    @Body('reference') reference?: string,
  ) {
    const data = await this.leaseService.recordLeasePayment(contractId, leasePaymentId, amount, method, reference);
    return { success: true, data };
  }
}
