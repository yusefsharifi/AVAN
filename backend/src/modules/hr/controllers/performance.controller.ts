import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PerformanceReviewService } from '../services/performance-review.service';
import { CreatePerformanceReviewDto } from '../dto/create-dtos';

@Controller('/hr/performance')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PerformanceController {
  constructor(private readonly performanceService: PerformanceReviewService) {}

  @Post()
  @RequirePermission('hr.performance.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreatePerformanceReviewDto, @CurrentUser('sub') userId: string) {
    const data = await this.performanceService.create(dto, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.performance.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(
    @Query('companyId') companyId: string,
    @Query() filter: any,
  ) {
    const data = await this.performanceService.findAll(companyId, filter);
    return data;
  }

  @Get('my-reviews')
  @RequirePermission('hr.performance.list.view')
  @Roles('COMPANY_STAFF')
  async getMyReviews(@Query('employeeId') employeeId: string) {
    const data = await this.performanceService.getEmployeeReviewHistory(employeeId);
    return { data };
  }

  @Get('team/:deptId')
  @RequirePermission('hr.performance.list.view')
  @Roles('COMPANY_MANAGER')
  async getTeamPerformance(@Param('deptId') departmentId: string, @Query('period') period: string) {
    const data = await this.performanceService.getTeamPerformance(departmentId, period);
    return { data };
  }

  @Get(':id')
  @RequirePermission('hr.performance.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    const data = await this.performanceService.findById(id);
    return { data };
  }

  @Post(':id/submit')
  @RequirePermission('hr.performance.list.create')
  @Roles('COMPANY_MANAGER')
  async submit(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.performanceService.submit(id, userId);
    return { data };
  }

  @Post(':id/acknowledge')
  @RequirePermission('hr.performance.list.create')
  @Roles('COMPANY_STAFF')
  async acknowledge(@Param('id') id: string, @Body() body: { comment: string; employeeId: string }) {
    const data = await this.performanceService.employeeAcknowledge(id, body.comment, body.employeeId);
    return { data };
  }
}
