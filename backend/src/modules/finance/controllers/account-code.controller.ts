import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
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
import { ResolveZoneId } from '../../../common/decorators/resolve-zone.decorator';
import { AccountCodeService } from '../services/account-code.service';
import { CreateAccountCodeDto, UpdateAccountCodeDto } from '../dto/account-code.dto';

@ApiTags('Finance - Chart of Accounts')
@ApiBearerAuth()
@Controller('/finance/accounts')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AccountCodeController {
  constructor(private readonly accountCodeService: AccountCodeService) {}

  @Post()
  @RequirePermission('finance.accounts.accounts.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create account code' })
  async create(
    @Body() dto: CreateAccountCodeDto,
    @CurrentUser('sub') userId: string,
    // Step-4 TASK 3: body.zoneId → session zone → 400 (SUPER_ADMIN must choose).
    @ResolveZoneId() zoneId: string,
  ) {
    const data = await this.accountCodeService.create({ ...dto, zoneId }, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.accounts.accounts.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'List all account codes' })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.accountCodeService.findAll(zoneId);
    return { success: true, data };
  }

  @Get('tree')
  @RequirePermission('finance.accounts.accounts.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get hierarchical account tree' })
  async getTree(@ZoneId() zoneId: string) {
    const data = await this.accountCodeService.findTree(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.accounts.accounts.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get account detail' })
  async findById(@Param('id') id: string) {
    const data = await this.accountCodeService.findById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.accounts.accounts.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update account code' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountCodeDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.accountCodeService.update(id, dto, userId);
    return { success: true, data };
  }

  @Post('seed')
  @RequirePermission('finance.accounts.accounts.create')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Seed chart of accounts' })
  async seed(@ResolveZoneId() zoneId: string, @CurrentUser('sub') userId: string) {
    const data = await this.accountCodeService.seedChartOfAccounts(zoneId, userId);
    return { success: true, data };
  }
}
