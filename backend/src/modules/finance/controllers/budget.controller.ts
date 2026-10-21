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
import { BudgetService } from '../services/budget.service';
import { CreateBudgetDto } from '../dto/create-budget.dto';

@ApiTags('Finance - Budgets')
@ApiBearerAuth()
@Controller('/finance/budgets')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  @RequirePermission('finance.budgeting.budgets.create')
  @ApiOperation({ summary: 'Create budget' })
  async create(
    @Body() dto: CreateBudgetDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.budgetService.create({ ...dto, zoneId }, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.budgeting.budgets.view')
  @ApiOperation({ summary: 'List budgets' })
  async findAll(
    @ZoneId() zoneId: string,
    @Query('fiscalYear') fiscalYear?: number,
  ) {
    const data = await this.budgetService.findAll(zoneId, fiscalYear);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.budgeting.budgets.view')
  @ApiOperation({ summary: 'Get budget detail' })
  async findById(@Param('id') id: string) {
    const data = await this.budgetService.findById(id);
    return { success: true, data };
  }

  @Post(':id/approve')
  @RequirePermission('finance.budgeting.budgets.create')
  @ApiOperation({ summary: 'Approve budget' })
  async approve(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.budgetService.approve(id, userId);
    return { success: true, data };
  }

  @Get(':id/variance')
  @RequirePermission('finance.budgeting.budgets.view')
  @ApiOperation({ summary: 'Budget variance report' })
  async getVariance(@Param('id') id: string) {
    const data = await this.budgetService.getVarianceReport(id);
    return { success: true, data };
  }
}
