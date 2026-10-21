import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateEmployeeLoanDto } from '../dto/create-dtos';
import { HrGatewayService } from './hr-gateway.service';
import { computeLoanInstallment } from '../utils/hr.utils';

@Injectable()
export class EmployeeLoanService {
  private readonly logger = new Logger(EmployeeLoanService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreateEmployeeLoanDto, createdBy: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    // Generate loan number
    const loanNumber = `LN-${employee.employeeNumber}-${Date.now().toString(36).toUpperCase()}`;

    // Calculate monthly deduction
    const monthlyDeduction = computeLoanInstallment(
      BigInt(dto.amount),
      dto.installmentCount,
      dto.interestRate || 0,
    );

    // Create loan
    const loan = await this.prisma.employeeLoan.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        loanNumber,
        type: dto.type,
        amount: BigInt(dto.amount),
        interestRate: dto.interestRate || 0,
        installmentCount: dto.installmentCount,
        monthlyDeduction,
        status: 'PENDING',
        notes: dto.notes,
      },
    });

    // Generate installment schedule
    const startMonth = new Date().getMonth() + 1;
    const startYear = new Date().getFullYear();

    for (let i = 0; i < dto.installmentCount; i++) {
      const installmentMonth = startMonth + i;
      const year = startYear + Math.floor((installmentMonth - 1) / 12);
      const month = ((installmentMonth - 1) % 12) + 1;
      const monthStr = String(month).padStart(2, '0');

      await this.prisma.loanInstallment.create({
        data: {
          loanId: loan.id,
          dueDate: `${year}-${monthStr}`,
          amount: monthlyDeduction,
          status: 'PENDING',
        },
      });
    }

    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'LOAN_CREATED',
      targetType: 'EmployeeLoan',
      targetId: loan.id,
      userId: createdBy,
      metadata: { loanNumber, amount: String(dto.amount), installmentCount: dto.installmentCount },
    });

    return loan;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE
  // ═══════════════════════════════════════════════════════════════════════════

  async approve(id: string, approvedBy: string): Promise<any> {
    const loan = await this.prisma.employeeLoan.findUnique({ where: { id } });
    if (!loan) throw new AppException('LOAN_NOT_FOUND');
    if (loan.status !== 'PENDING') throw new AppException('LOAN_ALREADY_APPROVED');

    const updated = await this.prisma.employeeLoan.update({
      where: { id },
      data: {
        status: 'DISBURSED',
        approvedBy,
        approvedAt: new Date(),
        disbursedAt: new Date(),
      },
    });

    await this.audit.log({
      zoneId: loan.zoneId,
      action: 'LOAN_APPROVED',
      targetType: 'EmployeeLoan',
      targetId: id,
      userId: approvedBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DEDUCT INSTALLMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async deductInstallment(loanId: string, payslipId: string, month: string): Promise<any> {
    const installment = await this.prisma.loanInstallment.findFirst({
      where: { loanId, dueDate: month, status: 'PENDING' },
    });

    if (!installment) {
      throw new AppException('LOAN_INSTALLMENT_NOT_FOUND');
    }

    const updated = await this.prisma.loanInstallment.update({
      where: { id: installment.id },
      data: { status: 'DEDUCTED', deductedAt: new Date(), payslipId },
    });

    // Check if loan is completed
    const pendingInstallments = await this.prisma.loanInstallment.count({
      where: { loanId, status: 'PENDING' },
    });

    if (pendingInstallments === 0) {
      await this.prisma.employeeLoan.update({
        where: { id: loanId },
        data: { status: 'COMPLETED' },
      });
    }

    await this.audit.log({
      zoneId: '',
      action: 'LOAN_INSTALLMENT_DEDUCTED',
      targetType: 'LoanInstallment',
      targetId: installment.id,
      userId: 'SYSTEM',
      metadata: { loanId, payslipId, month },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findByEmployee(employeeId: string): Promise<any[]> {
    return this.prisma.employeeLoan.findMany({
      where: { employeeId },
      include: { installments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<any> {
    const loan = await this.prisma.employeeLoan.findUnique({
      where: { id },
      include: { installments: true, employee: { select: { firstNameFa: true, lastNameFa: true } } },
    });
    if (!loan) throw new AppException('LOAN_NOT_FOUND');
    return loan;
  }

  async getActiveDeductions(employeeId: string): Promise<bigint> {
    const loans = await this.prisma.employeeLoan.findMany({
      where: { employeeId, status: 'DISBURSED' },
    });

    return loans.reduce((sum, loan) => sum + loan.monthlyDeduction, 0n);
  }

  async findAll(companyId: string): Promise<any[]> {
    return this.prisma.employeeLoan.findMany({
      where: { companyId },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
