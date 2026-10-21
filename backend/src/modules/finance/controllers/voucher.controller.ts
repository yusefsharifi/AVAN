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
import { AccountingVoucherService } from '../services/accounting-voucher.service';
import { CreateVoucherDto } from '../dto/create-voucher.dto';
import { FilterVouchersDto } from '../dto/filter.dto';

@ApiTags('Finance - Vouchers')
@ApiBearerAuth()
@Controller('/finance/vouchers')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class VoucherController {
  constructor(private readonly voucherService: AccountingVoucherService) {}

  @Post()
  @RequirePermission('finance.vouchers.vouchers.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create accounting voucher' })
  async create(
    @Body() dto: CreateVoucherDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.voucherService.create(dto, userId, `${user.firstName || ''} ${user.lastName || ''}`.trim() || userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.vouchers.vouchers.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'List vouchers' })
  async findAll(@Query() filter: FilterVouchersDto, @ZoneId() zoneId: string) {
    const result = await this.voucherService.findAll({ ...filter, zoneId });
    return { success: true, ...result };
  }

  @Get('trial-balance')
  @RequirePermission('finance.vouchers.vouchers.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get trial balance' })
  async getTrialBalance(
    @ZoneId() zoneId: string,
    @Query('asOfDate') asOfDate: string,
  ) {
    const data = await this.voucherService.getTrialBalance(zoneId, asOfDate || new Date().toISOString().split('T')[0]);
    return { success: true, data };
  }

  @Get('ledger/:accountId')
  @RequirePermission('finance.vouchers.vouchers.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get account ledger' })
  async getLedger(
    @Param('accountId') accountId: string,
    @ZoneId() zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.voucherService.getLedger(
      accountId,
      zoneId,
      fromDate || new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
      toDate || new Date().toISOString().split('T')[0],
    );
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.vouchers.vouchers.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get voucher by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.voucherService.findById(id);
    return { success: true, data };
  }

  @Patch(':id/review')
  @RequirePermission('finance.vouchers.vouchers.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Review voucher' })
  async review(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.voucherService.review(id, userId);
    return { success: true, data };
  }

  @Patch(':id/approve')
  @RequirePermission('finance.vouchers.vouchers.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Approve voucher' })
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.voucherService.approve(id, userId);
    return { success: true, data };
  }

  @Post(':id/post')
  @RequirePermission('finance.vouchers.vouchers.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Post voucher to ledger' })
  async post(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.voucherService.post(id, userId);
    return { success: true, data };
  }

  @Post(':id/void')
  @RequirePermission('finance.vouchers.vouchers.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Void voucher' })
  async void(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.voucherService.void(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/reverse')
  @RequirePermission('finance.vouchers.vouchers.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create reversal voucher' })
  async reverse(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser() user: any,
  ) {
    const data = await this.voucherService.createReversal(
      id,
      reason,
      userId,
      `${user.firstName || ''} ${user.lastName || ''}`.trim() || userId,
    );
    return { success: true, data };
  }
}
