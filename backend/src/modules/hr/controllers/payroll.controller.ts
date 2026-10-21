import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PayrollService } from '../services/payroll.service';
import { RunPayrollDto, ApprovePayrollDto } from '../dto/create-dtos';

@Controller('/hr/payroll')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @Post('run')
  @RequirePermission('hr.payroll.list.create')
  @Roles('COMPANY_ADMIN')
  async runPayroll(@Body() dto: RunPayrollDto, @CurrentUser('sub') userId: string) {
    const data = await this.payrollService.runPayroll(dto, userId);
    return { data };
  }

  @Get()
  @RequirePermission('hr.payroll.list.view')
  @Roles('COMPANY_STAFF')
  async findPayrolls(@Query('companyId') companyId: string, @Query('zoneId') zoneId: string) {
    const data = await this.payrollService.findPayrolls(companyId, zoneId);
    return { data };
  }

  @Get('stats')
  @RequirePermission('hr.payroll.list.view')
  @Roles('COMPANY_STAFF')
  async getStats(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    const data = await this.payrollService.getPayrollStats(zoneId, companyId);
    return { data };
  }

  @Get(':id')
  @RequirePermission('hr.payroll.list.view')
  @Roles('COMPANY_STAFF')
  async findById(@Param('id') id: string) {
    const data = await this.payrollService.getPayslips(id);
    return { data };
  }

  @Get(':id/payslips')
  @RequirePermission('hr.payroll.list.view')
  @Roles('COMPANY_STAFF')
  async getPayslips(@Param('id') payrollId: string, @Query('employeeId') employeeId?: string) {
    const data = await this.payrollService.getPayslips(payrollId, employeeId);
    return { data };
  }

  @Post(':id/approve')
  @RequirePermission('hr.payroll.list.create')
  @Roles('COMPANY_ADMIN')
  async approve(@Param('id') payrollId: string, @Body() dto: ApprovePayrollDto, @CurrentUser('sub') userId: string) {
    const data = await this.payrollService.approvePayroll(payrollId, dto, userId);
    return { data };
  }

  @Post(':id/mark-paid')
  @RequirePermission('hr.payroll.list.create')
  @Roles('COMPANY_ADMIN')
  async markAsPaid(@Param('id') payrollId: string, @CurrentUser('sub') userId: string) {
    const data = await this.payrollService.markAsPaid(payrollId, userId);
    return { data };
  }

  @Get('my/:employeeId')
  @RequirePermission('hr.payroll.list.view')
  @Roles('COMPANY_STAFF')
  async getMyPayslips(@Param('employeeId') employeeId: string, @Query('year') year?: number) {
    const data = await this.payrollService.getMyPayslips(employeeId, year);
    return { data };
  }

  @Post('payslip/:id/pdf')
  @RequirePermission('hr.payroll.list.create')
  @Roles('COMPANY_STAFF')
  async getPayslipPdf(@Param('id') payslipId: string) {
    const data = await this.payrollService.generatePayslipPdf(payslipId);
    return { data };
  }
}
