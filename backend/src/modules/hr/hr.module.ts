import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

// Services
import { EmployeeService } from './services/employee.service';
import { AttendanceService } from './services/attendance.service';
import { LeaveService } from './services/leave.service';
import { PayrollService } from './services/payroll.service';
import { PerformanceReviewService } from './services/performance-review.service';
import { EmployeeLoanService } from './services/employee-loan.service';
import { DepartmentService } from './services/department.service';
import { HrGatewayService } from './services/hr-gateway.service';

// Controllers
import { EmployeeController } from './controllers/employee.controller';
import { AttendanceController } from './controllers/attendance.controller';
import { LeaveController } from './controllers/leave.controller';
import { PayrollController } from './controllers/payroll.controller';
import { PerformanceController } from './controllers/performance.controller';
import { LoanController } from './controllers/loan.controller';
import { DepartmentController } from './controllers/department.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    EmployeeController,
    AttendanceController,
    LeaveController,
    PayrollController,
    PerformanceController,
    LoanController,
    DepartmentController,
  ],
  providers: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    PerformanceReviewService,
    EmployeeLoanService,
    DepartmentService,
    HrGatewayService,
  ],
  exports: [
    EmployeeService,
    AttendanceService,
    LeaveService,
    PayrollService,
    PerformanceReviewService,
    EmployeeLoanService,
    DepartmentService,
    HrGatewayService,
  ],
})
export class HrModule implements OnModuleInit {
  private readonly logger = new Logger(HrModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly prisma: PrismaService,
    private readonly attendanceService: AttendanceService,
    private readonly leaveService: LeaveService,
    private readonly employeeService: EmployeeService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing HR module BullMQ workers...');

    const worker = this.bull.registerWorker('hr', async (job) => {
      this.logger.log(`Processing HR job: ${job.name}`);
      switch (job.name) {
        case 'process-daily-attendance':
          await this.processDailyAttendance(job.data);
          break;
        case 'check-leave-returns':
          await this.checkLeaveReturns(job.data);
          break;
        case 'reset-annual-leave':
          await this.resetAnnualLeave(job.data);
          break;
        case 'check-contract-expiry':
          await this.checkContractExpiry(job.data);
          break;
        case 'check-probation-end':
          await this.checkProbationEnd(job.data);
          break;
        case 'monthly-payroll-reminder':
          await this.processPayrollReminder(job.data);
          break;
        case 'birthday-reminder':
          await this.processBirthdayReminder(job.data);
          break;
        default:
          this.logger.warn(`Unknown HR job: ${job.name}`);
      }
    });

    // Schedule recurring jobs
    const queue = this.bull.getQueue('hr');

    // process-daily-attendance: every day at 23:30 Tehran (20:00 UTC)
    queue.add('process-daily-attendance', {}, { repeat: { pattern: '0 20 * * *' } });

    // check-leave-returns: every morning at 07:00 Tehran (03:30 UTC)
    queue.add('check-leave-returns', {}, { repeat: { pattern: '30 3 * * *' } });

    // reset-annual-leave: 1st of Farvardin (March 21 UTC) at 02:00 Tehran
    queue.add('reset-annual-leave', {}, { repeat: { pattern: '0 21 20 3 *' } });

    // check-contract-expiry: daily at 08:00 Tehran (04:30 UTC)
    queue.add('check-contract-expiry', {}, { repeat: { pattern: '30 4 * * *' } });

    // check-probation-end: daily at 07:00 Tehran (03:30 UTC)
    queue.add('check-probation-end', {}, { repeat: { pattern: '30 3 * * *' } });

    // monthly-payroll-reminder: 25th of each month at 09:00 Tehran (05:30 UTC)
    queue.add('monthly-payroll-reminder', {}, { repeat: { pattern: '30 5 25 * *' } });

    // birthday-reminder: daily at 08:00 Tehran (04:30 UTC)
    queue.add('birthday-reminder', {}, { repeat: { pattern: '30 4 * * *' } });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // JOB PROCESSORS
  // ═══════════════════════════════════════════════════════════════════════════

  private async processDailyAttendance(_data: any): Promise<void> {
    this.logger.log('Processing daily attendance: marking absent employees...');
    const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE' } });
    const today = new Date().toISOString().split('T')[0];

    for (const zone of zones) {
      try {
        await this.attendanceService.processAbsences(zone.id, today);
      } catch (err) {
        this.logger.error(`Error processing attendance for zone ${zone.id}: ${err}`);
      }
    }
  }

  private async checkLeaveReturns(_data: any): Promise<void> {
    this.logger.log('Checking leave returns...');
    // Find employees whose leave ends today
    const today = new Date().toISOString().split('T')[0];
    const endingLeaves = await this.prisma.leaveRequest.findMany({
      where: { status: 'APPROVED', endDate: today },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true } } },
    });

    for (const leave of endingLeaves) {
      await this.prisma.leaveRequest.update({
        where: { id: leave.id },
        data: { status: 'TAKEN' },
      });
      this.logger.log(`Leave ended for ${leave.employee.firstNameFa} ${leave.employee.lastNameFa}`);
    }
  }

  private async resetAnnualLeave(_data: any): Promise<void> {
    this.logger.log('Resetting annual leave balances...');
    const companies = await this.prisma.company.findMany({ where: { isActive: true } });
    for (const company of companies) {
      try {
        await this.leaveService.resetAnnualLeaveBalances(company.id);
      } catch (err) {
        this.logger.error(`Error resetting leave for company ${company.id}: ${err}`);
      }
    }
  }

  private async checkContractExpiry(_data: any): Promise<void> {
    this.logger.log('Checking contract expiry...');
    const today = new Date();
    const in60Days = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);

    const expiringContracts = await this.prisma.employeeContract.findMany({
      where: {
        isCurrent: true,
        endDate: { gte: today.toISOString().split('T')[0], lte: in60Days.toISOString().split('T')[0] },
      },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true } } },
    });

    this.logger.log(`Found ${expiringContracts.length} expiring contracts`);
  }

  private async checkProbationEnd(_data: any): Promise<void> {
    this.logger.log('Checking probation end dates...');
    const today = new Date().toISOString().split('T')[0];

    const probationEnding = await this.prisma.employee.findMany({
      where: { status: 'PROBATION', probationEndDate: today },
    });

    for (const emp of probationEnding) {
      await this.prisma.employee.update({
        where: { id: emp.id },
        data: { status: 'ACTIVE' },
      });
      this.logger.log(`Probation ended for ${emp.firstNameFa} ${emp.lastNameFa}, moved to ACTIVE`);
    }
  }

  private async processPayrollReminder(_data: any): Promise<void> {
    this.logger.log('Sending payroll reminder to HR managers...');
    // This would send notifications to HR managers to run payroll
  }

  private async processBirthdayReminder(_data: any): Promise<void> {
    this.logger.log('Checking employee birthdays...');
    const today = new Date().toISOString().split('T')[0];
    const monthDay = today.substring(5); // MM-DD

    const birthdayEmployees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: { id: true, firstNameFa: true, lastNameFa: true, dateOfBirth: true },
    });

    const todayBirthdays = birthdayEmployees.filter((e) => e.dateOfBirth?.substring(5) === monthDay);
    this.logger.log(`Found ${todayBirthdays.length} employees with birthdays today`);
  }
}
