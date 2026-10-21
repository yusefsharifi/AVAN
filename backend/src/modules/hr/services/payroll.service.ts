import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { RunPayrollDto, ApprovePayrollDto } from '../dto/create-dtos';
import type { PayslipCalculationResult, PayrollStatsDto } from '../dto/enums';
import { HrGatewayService } from './hr-gateway.service';
import { computeIncomeTax, computeOvertimePay, computeSocialSecurity } from '../utils/hr.utils';

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RUN PAYROLL
  // ═══════════════════════════════════════════════════════════════════════════

  async runPayroll(dto: RunPayrollDto, runBy: string): Promise<any> {
    // 1. Check no existing payroll for this period
    const existing = await this.prisma.payroll.findUnique({
      where: { companyId_periodYear_periodMonth: { companyId: dto.companyId, periodYear: dto.periodYear, periodMonth: dto.periodMonth } },
    });
    if (existing) {
      throw new AppException('PAYROLL_ALREADY_EXISTS');
    }

    // 2. Get employees
    const where: any = { companyId: dto.companyId, status: 'ACTIVE', deletedAt: null };
    if (dto.employeeIds && dto.employeeIds.length > 0) {
      where.id = { in: dto.employeeIds };
    }
    const employees = await this.prisma.employee.findMany({ where });

    if (employees.length === 0) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }

    // 3. Create Payroll record
    const payroll = await this.prisma.payroll.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        status: 'PROCESSING',
        employeeCount: employees.length,
        createdBy: runBy,
        runAt: new Date(),
      },
    });

    // 4. Calculate payslips for each employee
    let totalGross = 0n;
    let totalNet = 0n;
    let totalTax = 0n;
    let totalInsurance = 0n;
    let totalDeductions = 0n;
    let totalAllowances = 0n;

    for (const emp of employees) {
      try {
        const bonusAmount = dto.bonusOverrides?.[emp.id] ? BigInt(dto.bonusOverrides[emp.id]) : undefined;
        const calc = await this.calculatePayslip(emp.id, dto.periodMonth, dto.periodYear, bonusAmount);

        const payslip = await this.prisma.payslip.create({
          data: {
            payrollId: payroll.id,
            employeeId: emp.id,
            companyId: dto.companyId,
            zoneId: dto.zoneId,
            periodMonth: dto.periodMonth,
            periodYear: dto.periodYear,
            workDays: calc.workDays,
            presentDays: calc.presentDays,
            absentDays: calc.absentDays,
            leaveDays: calc.leaveDays,
            overtimeHours: calc.overtimeHours,
            baseSalary: calc.baseSalary,
            housingAllowance: calc.housingAllowance,
            transportAllowance: calc.transportAllowance,
            foodAllowance: calc.foodAllowance,
            overtimePay: calc.overtimePay,
            bonusAmount: calc.bonusAmount,
            otherEarnings: calc.otherEarnings,
            grossSalary: calc.grossSalary,
            incomeTax: calc.incomeTax,
            socialSecurityEmployee: calc.socialSecurityEmployee,
            loanDeduction: calc.loanDeduction,
            absenceDeduction: calc.absenceDeductionTotal,
            otherDeductions: calc.otherDeductions,
            totalDeductions: calc.totalDeductions,
            netSalary: calc.netSalary,
            socialSecurityEmployer: calc.socialSecurityEmployer,
            status: 'DRAFT',
          },
        });

        totalGross += calc.grossSalary;
        totalNet += calc.netSalary;
        totalTax += calc.incomeTax;
        totalInsurance += calc.socialSecurityEmployee;
        totalDeductions += calc.totalDeductions;
        totalAllowances += calc.housingAllowance + calc.transportAllowance + calc.foodAllowance;

        // Deduct loan installments
        if (calc.loanDeduction > 0n) {
          await this.processLoanDeductions(emp.id, payslip.id, dto.periodMonth, dto.periodYear);
        }

        // Emit payslip ready event
        this.gateway.emitPayslipReady({
          employeeId: emp.id,
          payslipId: payslip.id,
          period: `${dto.periodYear}-${String(dto.periodMonth).padStart(2, '0')}`,
          netSalary: calc.netSalary,
        });
      } catch (err) {
        this.logger.error(`Error calculating payslip for employee ${emp.id}: ${err}`);
      }
    }

    // 5. Update payroll totals
    const updatedPayroll = await this.prisma.payroll.update({
      where: { id: payroll.id },
      data: {
        status: 'REVIEW',
        totalGross,
        totalNet,
        totalTax,
        totalInsurance,
        totalDeductions,
        totalAllowances,
      },
    });

    // 6. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'PAYROLL_RUN',
      targetType: 'Payroll',
      targetId: payroll.id,
      userId: runBy,
      metadata: {
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        employeeCount: employees.length,
        totalGross: totalGross.toString(),
        totalNet: totalNet.toString(),
      },
    });

    // 7. Emit socket event
    this.gateway.emitPayrollCalculated({
      companyId: dto.companyId,
      payrollId: payroll.id,
      period: `${dto.periodYear}-${String(dto.periodMonth).padStart(2, '0')}`,
      totalGross,
      totalNet,
      employeeCount: employees.length,
    });

    return updatedPayroll;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CALCULATE PAYSLIP
  // ═══════════════════════════════════════════════════════════════════════════

  async calculatePayslip(
    employeeId: string,
    periodMonth: number,
    periodYear: number,
    bonusAmount?: bigint,
  ): Promise<PayslipCalculationResult> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const monthStr = String(periodMonth).padStart(2, '0');
    const startDate = `${periodYear}-${monthStr}-01`;
    const endDate = `${periodYear}-${monthStr}-31`;

    // Step 1: Get attendance summary
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
    });

    const workDays = this.countWorkdaysInMonth(periodYear, periodMonth);
    const presentDays = attendanceRecords.filter((r) => r.status === 'PRESENT').length;
    const absentDays = attendanceRecords.filter((r) => r.status === 'ABSENT').length;
    const leaveDays = attendanceRecords.reduce((sum, r) => {
      return r.status === 'ON_LEAVE' ? sum + 1 : sum;
    }, 0);
    const overtimeMinutes = attendanceRecords.reduce((sum, r) => sum + r.overtimeMinutes, 0);
    const overtimeHours = Math.round(overtimeMinutes / 60 * 100) / 100;

    // Step 2: Calculate base earnings
    const baseSalary = employee.baseSalary;
    const dailyRate = baseSalary / BigInt(workDays || 26);
    const absenceDeduction = dailyRate * BigInt(absentDays);
    const effectiveBaseSalary = baseSalary - absenceDeduction;

    // Step 3: Add allowances
    const housingAllowance = employee.housingAllowance;
    const transportAllowance = employee.transportAllowance;
    const foodAllowance = employee.foodAllowance;
    let grossSalary = effectiveBaseSalary + housingAllowance + transportAllowance + foodAllowance;

    // Step 4: Overtime pay
    const overtimePay = computeOvertimePay(
      effectiveBaseSalary,
      workDays || 26,
      overtimeHours, // simplified: treat all as weekday
      0,
    );
    grossSalary += overtimePay + (bonusAmount || 0n);

    // Step 5: Income tax
    const incomeTax = computeIncomeTax(grossSalary);

    // Step 6: Social security
    const socialSecurity = computeSocialSecurity(grossSalary);

    // Step 7: Loan deductions
    const loanDeduction = await this.getActiveLoanDeductions(employeeId, periodMonth, periodYear);

    // Step 8: Calculate net salary
    const totalDeductions = incomeTax + socialSecurity.employee + loanDeduction;
    const netSalary = grossSalary > totalDeductions ? grossSalary - totalDeductions : 0n;

    return {
      employeeId,
      employeeName: `${employee.firstNameFa} ${employee.lastNameFa}`,
      workDays,
      presentDays,
      absentDays,
      leaveDays,
      overtimeHours,
      baseSalary: baseSalary,
      absenceDeduction,
      effectiveBaseSalary,
      housingAllowance,
      transportAllowance,
      foodAllowance,
      overtimePay,
      bonusAmount: bonusAmount || 0n,
      otherEarnings: 0n,
      grossSalary,
      incomeTax,
      socialSecurityEmployee: socialSecurity.employee,
      socialSecurityEmployer: socialSecurity.employer,
      loanDeduction,
      absenceDeductionTotal: absenceDeduction,
      otherDeductions: 0n,
      totalDeductions,
      netSalary,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INCOME TAX (public wrapper)
  // ═══════════════════════════════════════════════════════════════════════════

  computeIncomeTax(monthlySalary: bigint): bigint {
    return computeIncomeTax(monthlySalary);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE PAYROLL
  // ═══════════════════════════════════════════════════════════════════════════

  async approvePayroll(payrollId: string, dto: ApprovePayrollDto, approvedBy: string): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new AppException('PAYROLL_NOT_FOUND');
    if (payroll.status !== 'REVIEW') throw new AppException('PAYROLL_INVALID_STATUS');

    // 1. Generate payslip PDFs
    const payslips = await this.prisma.payslip.findMany({ where: { payrollId } });
    for (const payslip of payslips) {
      try {
        const { pdfKey } = await this.generatePayslipPdf(payslip.id);
        await this.prisma.payslip.update({
          where: { id: payslip.id },
          data: { pdfKey, status: 'ISSUED' },
        });
      } catch (err) {
        this.logger.error(`Error generating payslip PDF for ${payslip.id}: ${err}`);
      }
    }

    // 2. Update payroll status
    const updated = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedBy,
      },
    });

    // 3. Audit log
    await this.audit.log({
      zoneId: payroll.zoneId,
      action: 'PAYROLL_APPROVED',
      targetType: 'Payroll',
      targetId: payrollId,
      userId: approvedBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MARK AS PAID
  // ═══════════════════════════════════════════════════════════════════════════

  async markAsPaid(payrollId: string, paidBy: string): Promise<any> {
    const payroll = await this.prisma.payroll.findUnique({ where: { id: payrollId } });
    if (!payroll) throw new AppException('PAYROLL_NOT_FOUND');
    if (payroll.status !== 'APPROVED') throw new AppException('PAYROLL_INVALID_STATUS');

    const updated = await this.prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      },
    });

    // Send payslips to employees
    const payslips = await this.prisma.payslip.findMany({ where: { payrollId } });
    for (const payslip of payslips) {
      await this.prisma.payslip.update({
        where: { id: payslip.id },
        data: { status: 'SENT' },
      });
    }

    await this.audit.log({
      zoneId: payroll.zoneId,
      action: 'PAYROLL_PAID',
      targetType: 'Payroll',
      targetId: payrollId,
      userId: paidBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERATE PAYSLIP PDF
  // ═══════════════════════════════════════════════════════════════════════════

  async generatePayslipPdf(payslipId: string): Promise<{ pdfKey: string }> {
    const payslip = await this.prisma.payslip.findUnique({
      where: { id: payslipId },
      include: {
        employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true, bankName: true, bankAccountNumber: true } },
        payroll: { select: { periodMonth: true, periodYear: true } },
      },
    });
    if (!payslip) throw new AppException('PAYSLIP_NOT_FOUND');

    // Generate PDF key (actual PDF generation with puppeteer would happen here)
    const pdfKey = `hr-payslips/${payslip.companyId}/${payslip.periodYear}/${payslip.periodMonth}/${payslip.employeeId}.pdf`;

    return { pdfKey };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findPayrolls(companyId: string, zoneId: string): Promise<any[]> {
    return this.prisma.payroll.findMany({
      where: { companyId, zoneId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  async getPayslips(payrollId: string, employeeId?: string): Promise<any[]> {
    const where: any = { payrollId };
    if (employeeId) where.employeeId = employeeId;

    return this.prisma.payslip.findMany({
      where,
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
    });
  }

  async getMyPayslips(employeeId: string, year?: number): Promise<any[]> {
    const where: any = { employeeId };
    if (year) where.periodYear = year;

    return this.prisma.payslip.findMany({
      where,
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  async getPayrollStats(zoneId: string, companyId?: string): Promise<PayrollStatsDto> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;

    const payrolls = await this.prisma.payroll.findMany({ where });
    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    const currentMonthPayroll = payrolls.find(
      (p) => p.periodMonth === currentMonth && p.periodYear === currentYear,
    );

    // Get payslips for average salary
    const payslips = await this.prisma.payslip.findMany({
      where,
      select: { grossSalary: true, overtimePay: true },
    });

    const grossSalaries = payslips.map((p) => p.grossSalary);
    const avgSalary = grossSalaries.length > 0
      ? grossSalaries.reduce((a, b) => a + b, 0n) / BigInt(grossSalaries.length)
      : 0n;
    const minSalary = grossSalaries.length > 0 ? grossSalaries.reduce((a, b) => (a < b ? a : b)) : 0n;
    const maxSalary = grossSalaries.length > 0 ? grossSalaries.reduce((a, b) => (a > b ? a : b)) : 0n;

    const overtimeCostMonth = payslips.reduce((sum, p) => sum + p.overtimePay, 0n);

    // Last 12 months trend
    const totalPayroll12Months: { month: string; amount: bigint }[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(currentYear, currentMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const payroll = payrolls.find((p) => p.periodMonth === m && p.periodYear === y);
      totalPayroll12Months.push({
        month: `${y}-${String(m).padStart(2, '0')}`,
        amount: payroll?.totalGross || 0n,
      });
    }

    return {
      currentMonthGross: currentMonthPayroll?.totalGross || 0n,
      currentMonthNet: currentMonthPayroll?.totalNet || 0n,
      currentMonthTax: currentMonthPayroll?.totalTax || 0n,
      currentMonthInsurance: currentMonthPayroll?.totalInsurance || 0n,
      totalPayroll12Months,
      avgSalary,
      minSalary,
      maxSalary,
      overtimeCostMonth,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private countWorkdaysInMonth(year: number, month: number): number {
    // Approximate: 26 workdays per month (22 weekdays minus some holidays)
    return 26;
  }

  private async getActiveLoanDeductions(employeeId: string, month: number, year: number): Promise<bigint> {
    const loans = await this.prisma.employeeLoan.findMany({
      where: {
        employeeId,
        status: 'DISBURSED',
      },
    });

    let totalDeduction = 0n;
    for (const loan of loans) {
      const installment = await this.prisma.loanInstallment.findFirst({
        where: {
          loanId: loan.id,
          status: 'PENDING',
          dueDate: `${year}-${String(month).padStart(2, '0')}`,
        },
      });
      if (installment) {
        totalDeduction += installment.amount;
      }
    }

    return totalDeduction;
  }

  private async processLoanDeductions(employeeId: string, payslipId: string, month: number, year: number): Promise<void> {
    const loans = await this.prisma.employeeLoan.findMany({
      where: { employeeId, status: 'DISBURSED' },
    });

    for (const loan of loans) {
      const installment = await this.prisma.loanInstallment.findFirst({
        where: {
          loanId: loan.id,
          status: 'PENDING',
          dueDate: `${year}-${String(month).padStart(2, '0')}`,
        },
      });
      if (installment) {
        await this.prisma.loanInstallment.update({
          where: { id: installment.id },
          data: { status: 'DEDUCTED', deductedAt: new Date(), payslipId },
        });
      }
    }
  }
}
