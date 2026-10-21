import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ResolveZoneId } from '../../../common/decorators/resolve-zone.decorator';
import { EmployeeService } from '../services/employee.service';
import { CreateEmployeeDto, FilterEmployeesDto } from '../dto/create-dtos';

@Controller('/hr/employees')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class EmployeeController {
  constructor(private readonly employeeService: EmployeeService) {}

  @Post()
  @RequirePermission('hr.employee.list.create')
  @Roles('COMPANY_MANAGER')
  async create(
    @Body() dto: CreateEmployeeDto,
    @CurrentUser('sub') userId: string,
    // Step-4 TASK 3: dto.zoneId → session zone → 400 (SUPER_ADMIN must choose).
    @ResolveZoneId() zoneId: string,
  ) {
    const data = await this.employeeService.create({ ...dto, zoneId }, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.employee.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query() filter: FilterEmployeesDto) {
    const data = await this.employeeService.findAll(filter);
    return data;
  }

  @Get('stats')
  @RequirePermission('hr.employee.list.view')
  @Roles('COMPANY_STAFF')
  async getStats(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    const data = await this.employeeService.getEmployeeStats(zoneId, companyId);
    return { data };
  }

  @Get('org-chart')
  @RequirePermission('hr.employee.list.view')
  @Roles('COMPANY_STAFF')
  async getOrgChart(@Query('companyId') companyId: string, @Query('zoneId') zoneId: string) {
    const data = await this.employeeService.getOrgChart(companyId, zoneId);
    return { data };
  }

  @Get(':id')
  @RequirePermission('hr.employee.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    const data = await this.employeeService.findById(id);
    return { data };
  }

  @Patch(':id')
  @RequirePermission('hr.employee.list.update')
  @Roles('COMPANY_MANAGER')
  async update(@Param('id') id: string, @Body() dto: Partial<CreateEmployeeDto>, @CurrentUser('sub') userId: string) {
    const data = await this.employeeService.update(id, dto, userId);
    return { data };
  }

  @Post(':id/terminate')
  @RequirePermission('hr.employee.list.create')
  @Roles('COMPANY_ADMIN')
  async terminate(
    @Param('id') id: string,
    @Body() body: { reason: string; terminationDate: string },
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.employeeService.terminate(id, body.reason, body.terminationDate, userId);
    return { data };
  }

  @Patch(':id/salary')
  @RequirePermission('hr.employee.list.update')
  @Roles('COMPANY_ADMIN')
  async updateSalary(
    @Param('id') id: string,
    @Body() body: { newBaseSalary: number; effectiveDate: string; reason: string },
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.employeeService.updateSalary(id, body.newBaseSalary, body.effectiveDate, body.reason, userId);
    return { data };
  }

  @Get(':id/leave-balance')
  @RequirePermission('hr.employee.list.view')
  @Roles('COMPANY_STAFF')
  async getLeaveBalance(@Param('id') id: string) {
    const data = await this.employeeService.getLeaveBalance(id);
    return { data };
  }
}
