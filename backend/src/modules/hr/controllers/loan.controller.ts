import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { EmployeeLoanService } from '../services/employee-loan.service';
import { CreateEmployeeLoanDto } from '../dto/create-dtos';

@Controller('/hr/loans')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class LoanController {
  constructor(private readonly loanService: EmployeeLoanService) {}

  @Post()
  @RequirePermission('hr.loan.list.create')
  @Roles('COMPANY_MANAGER')
  async create(@Body() dto: CreateEmployeeLoanDto, @CurrentUser('sub') userId: string) {
    const data = await this.loanService.create(dto, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.loan.list.view')
  @Roles('COMPANY_STAFF')
  async findAll(@Query('companyId') companyId: string) {
    const data = await this.loanService.findAll(companyId);
    return { data };
  }

  @Get('employee/:eid')
  @RequirePermission('hr.loan.list.view')
  @Roles('COMPANY_STAFF')
  async findByEmployee(@Param('eid') employeeId: string) {
    const data = await this.loanService.findByEmployee(employeeId);
    return { data };
  }

  @Get(':id')
  @RequirePermission('hr.loan.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    const data = await this.loanService.findById(id);
    return { data };
  }

  @Post(':id/approve')
  @RequirePermission('hr.loan.list.create')
  @Roles('COMPANY_ADMIN')
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.loanService.approve(id, userId);
    return { data };
  }
}
