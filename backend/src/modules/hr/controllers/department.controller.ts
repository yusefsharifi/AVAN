import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { DepartmentService } from '../services/department.service';
import { CreateDepartmentDto, CreatePositionDto } from '../dto/create-dtos';

@Controller('/hr/departments')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class DepartmentController {
  constructor(private readonly departmentService: DepartmentService) {}

  @Post()
  @RequirePermission('hr.department.list.create')
  @Roles('COMPANY_ADMIN')
  async createDepartment(@Body() dto: CreateDepartmentDto, @CurrentUser('sub') userId: string) {
    const data = await this.departmentService.createDepartment(dto, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.department.list.view')
  @Roles('COMPANY_STAFF')
  async findDepartments(@Query('companyId') companyId: string) {
    const data = await this.departmentService.findDepartments(companyId);
    return { data };
  }

  @Get('tree')
  @RequirePermission('hr.department.list.view')
  @Roles('COMPANY_STAFF')
  async getTree(@Query('companyId') companyId: string) {
    const data = await this.departmentService.getDepartmentTree(companyId);
    return { data };
  }

  @Get(':id/positions')
  @RequirePermission('hr.department.list.view')
  @Roles('COMPANY_STAFF')
  async getPositions(@Param('id') departmentId: string) {
    const data = await this.departmentService.getPositions(departmentId);
    return { data };
  }

  @Patch(':id')
  @RequirePermission('hr.department.list.update')
  @Roles('COMPANY_ADMIN')
  async updateDepartment(@Param('id') id: string, @Body() dto: Partial<CreateDepartmentDto>) {
    const data = await this.departmentService.updateDepartment(id, dto);
    return { data };
  }

  @Post('positions')
  @RequirePermission('hr.department.list.create')
  @Roles('COMPANY_ADMIN')
  async createPosition(@Body() dto: CreatePositionDto, @CurrentUser('sub') userId: string) {
    const data = await this.departmentService.createPosition(dto, userId);
    return { data };
  }

  @Patch('positions/:id')
  @RequirePermission('hr.department.list.update')
  @Roles('COMPANY_ADMIN')
  async updatePosition(@Param('id') id: string, @Body() dto: Partial<CreatePositionDto>) {
    const data = await this.departmentService.updatePosition(id, dto);
    return { data };
  }
}
