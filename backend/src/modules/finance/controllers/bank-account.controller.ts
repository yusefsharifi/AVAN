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
import { BankAccountService } from '../services/bank-account.service';
import { CreateBankAccountDto, UpdateBankAccountDto, ReconcileBankDto } from '../dto/bank-account.dto';

@ApiTags('Finance - Bank Accounts')
@ApiBearerAuth()
@Controller('/finance/bank-accounts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class BankAccountController {
  constructor(private readonly bankAccountService: BankAccountService) {}

  @Post()
  @RequirePermission('finance.banking.bank-accounts.create')
  @ApiOperation({ summary: 'Create bank account' })
  async create(@ZoneId() zoneId: string, @Body() dto: CreateBankAccountDto) {
    const data = await this.bankAccountService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.banking.bank-accounts.view')
  @ApiOperation({ summary: 'List bank accounts' })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.bankAccountService.findAll(zoneId);
    return { success: true, data };
  }

  @Get('treasury-dashboard')
  @RequirePermission('finance.banking.bank-accounts.view')
  @ApiOperation({ summary: 'Get treasury dashboard' })
  async getTreasuryDashboard(@ZoneId() zoneId: string) {
    const data = await this.bankAccountService.getTreasuryDashboard(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.banking.bank-accounts.view')
  @ApiOperation({ summary: 'Get bank account detail' })
  async findById(@Param('id') id: string) {
    const data = await this.bankAccountService.findById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.banking.bank-accounts.update')
  @ApiOperation({ summary: 'Update bank account' })
  async update(@Param('id') id: string, @Body() dto: UpdateBankAccountDto) {
    const data = await this.bankAccountService.update(id, dto);
    return { success: true, data };
  }

  @Get(':id/transactions')
  @RequirePermission('finance.banking.bank-accounts.view')
  @ApiOperation({ summary: 'Get transaction history' })
  async getTransactions(
    @Param('id') id: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    const data = await this.bankAccountService.getTransactionHistory(
      id,
      fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      toDate ? new Date(toDate) : new Date(),
    );
    return { success: true, data };
  }

  @Post(':id/reconcile')
  @RequirePermission('finance.banking.bank-accounts.create')
  @ApiOperation({ summary: 'Bank reconciliation' })
  async reconcile(
    @Param('id') id: string,
    @Body() dto: ReconcileBankDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.bankAccountService.reconcile(id, dto, userId);
    return { success: true, data };
  }
}
