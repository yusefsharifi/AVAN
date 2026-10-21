import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { RequestLeaveDto, ApproveLeaveDto, FilterLeavesDto } from '../dto/create-dtos';
import type { PaginatedResult, LeaveCalendarDto, LeaveStatsDto } from '../dto/enums';
import { HrGatewayService } from './hr-gateway.service';
import { countWorkdays, getCurrentJalaliDate, jalaliToDate, dateToJalali, addJalaliDays } from '../utils/hr.utils';

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUEST LEAVE
  // ═══════════════════════════════════════════════════════════════════════════

  async request(dto: RequestLeaveDto, requestedBy: string): Promise<any> {
    // 1. Generate requestNumber
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    const companyCode = company?.nameEn?.substring(0, 3).toUpperCase() || 'COM';
    const year = getCurrentJalaliDate().split('-')[0];
    const seqKey = `hr:leave:seq:${dto.companyId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const requestNumber = `LVR-${companyCode}-${year}-${String(seq).padStart(5, '0')}`;

    // 2. Calculate days count (workdays only)
    let daysCount: number;
    if (dto.isHalfDay) {
      daysCount = 0.5;
    } else {
      // Get zone holidays
      const holidays = await this.prisma.zoneHoliday.findMany({
        where: { zoneId: dto.zoneId },
        select: { date: true },
      });
      const holidaySet = new Set(holidays.map((h) => h.date));
      daysCount = countWorkdays(dto.startDate, dto.endDate, holidaySet);
    }

    // 3. Check leave balance
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    if (['ANNUAL', 'SICK', 'PERSONAL'].includes(dto.leaveType)) {
      let balance = 0;
      switch (dto.leaveType) {
        case 'ANNUAL': balance = Number(employee.annualLeaveBalance); break;
        case 'SICK': balance = Number(employee.sickLeaveBalance); break;
        case 'PERSONAL': balance = Number(employee.personalLeaveBalance); break;
      }
      if (balance < daysCount) {
        throw new AppException('LEAVE_INSUFFICIENT_BALANCE');
      }
    }

    // 4. Check for overlapping approved leaves
    const overlapping = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId: dto.employeeId,
        status: 'APPROVED',
        startDate: { lte: dto.endDate },
        endDate: { gte: dto.startDate },
      },
    });
    if (overlapping) {
      throw new AppException('LEAVE_OVERLAP');
    }

    // 5. Create leave request
    const leaveRequest = await this.prisma.leaveRequest.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        leaveType: dto.leaveType,
        requestNumber,
        startDate: dto.startDate,
        endDate: dto.endDate,
        daysCount,
        isHalfDay: dto.isHalfDay || false,
        halfDayPeriod: dto.halfDayPeriod,
        reason: dto.reason,
        status: 'PENDING',
        attachmentKeys: dto.attachmentKeys || [],
        notes: dto.notes,
      },
    });

    // 6. Notify manager
    if (employee.reportingManagerId) {
      this.gateway.emitLeaveRequested({
        managerId: employee.reportingManagerId,
        requestId: leaveRequest.id,
        requestNumber,
        employeeName: `${employee.firstNameFa} ${employee.lastNameFa}`,
        leaveType: dto.leaveType,
        startDate: dto.startDate,
        endDate: dto.endDate,
        days: daysCount,
      });
    }

    // 7. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'LEAVE_REQUESTED',
      targetType: 'LeaveRequest',
      targetId: leaveRequest.id,
      userId: requestedBy,
      metadata: { requestNumber, leaveType: dto.leaveType, daysCount, startDate: dto.startDate, endDate: dto.endDate },
    });

    return leaveRequest;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE / REJECT
  // ═══════════════════════════════════════════════════════════════════════════

  async approve(id: string, dto: ApproveLeaveDto, approverId: string): Promise<any> {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) throw new AppException('LEAVE_NOT_FOUND');
    if (leaveRequest.status !== 'PENDING') throw new AppException('LEAVE_INVALID_STATUS');

    const employee = await this.prisma.employee.findUnique({ where: { id: leaveRequest.employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    if (dto.approved) {
      // 1. Update status
      const updated = await this.prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedAt: new Date(),
          approverId,
        },
      });

      // 2. Deduct from leave balance
      const balanceField = this.getBalanceField(leaveRequest.leaveType);
      if (balanceField) {
        await (this.prisma as any).employee.update({
          where: { id: employee.id },
          data: { [balanceField]: { decrement: Number(leaveRequest.daysCount) } },
        });
      }

      // 3. Create attendance records for leave period
      const holidays = await this.prisma.zoneHoliday.findMany({
        where: { zoneId: leaveRequest.zoneId },
        select: { date: true },
      });
      const holidaySet = new Set(holidays.map((h) => h.date));

      let current = leaveRequest.startDate;
      const end = leaveRequest.endDate;
      while (current <= end) {
        const date = jalaliToDate(current);
        const dayOfWeek = date.getDay();
        // Skip weekends (Thu=4, Fri=5) and holidays
        if (dayOfWeek !== 4 && dayOfWeek !== 5 && !holidaySet.has(current)) {
          await this.prisma.attendanceRecord.upsert({
            where: { employeeId_workDate: { employeeId: employee.id, workDate: current } },
            update: { status: 'ON_LEAVE' },
            create: {
              zoneId: leaveRequest.zoneId,
              companyId: leaveRequest.companyId,
              employeeId: employee.id,
              workDate: current,
              status: 'ON_LEAVE',
            },
          });
        }
        current = addJalaliDays(current, 1);
      }

      // 4. Notify employee
      this.gateway.emitLeaveApproved({
        employeeId: employee.id,
        requestId: id,
        leaveType: leaveRequest.leaveType,
        startDate: leaveRequest.startDate,
        endDate: leaveRequest.endDate,
        approvedBy: approverId,
      });

      await this.audit.log({
        zoneId: leaveRequest.zoneId,
        action: 'LEAVE_APPROVED',
        targetType: 'LeaveRequest',
        targetId: id,
        userId: approverId,
        metadata: { daysCount: leaveRequest.daysCount },
      });

      return updated;
    } else {
      // Reject
      const updated = await this.prisma.leaveRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.rejectionReason,
          approverId,
        },
      });

      this.gateway.emitLeaveRejected({
        employeeId: employee.id,
        requestId: id,
        leaveType: leaveRequest.leaveType,
        rejectionReason: dto.rejectionReason || '',
      });

      await this.audit.log({
        zoneId: leaveRequest.zoneId,
        action: 'LEAVE_REJECTED',
        targetType: 'LeaveRequest',
        targetId: id,
        userId: approverId,
        metadata: { reason: dto.rejectionReason },
      });

      return updated;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CANCEL
  // ═══════════════════════════════════════════════════════════════════════════

  async cancel(id: string, cancelledBy: string): Promise<any> {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({ where: { id } });
    if (!leaveRequest) throw new AppException('LEAVE_NOT_FOUND');

    if (!['PENDING', 'APPROVED'].includes(leaveRequest.status)) {
      throw new AppException('LEAVE_CANNOT_CANCEL');
    }

    // If approved and already started, cannot cancel
    if (leaveRequest.status === 'APPROVED') {
      const today = getCurrentJalaliDate();
      if (leaveRequest.startDate <= today) {
        throw new AppException('LEAVE_CANNOT_CANCEL');
      }

      // Restore leave balance
      const balanceField = this.getBalanceField(leaveRequest.leaveType);
      if (balanceField) {
        await (this.prisma as any).employee.update({
          where: { id: leaveRequest.employeeId },
          data: { [balanceField]: { increment: Number(leaveRequest.daysCount) } },
        });
      }
    }

    const updated = await this.prisma.leaveRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.log({
      zoneId: leaveRequest.zoneId,
      action: 'LEAVE_CANCELLED',
      targetType: 'LeaveRequest',
      targetId: id,
      userId: cancelledBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterLeavesDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    if (filter.leaveType) where.leaveType = filter.leaveType;
    if (filter.fromDate) where.startDate = { gte: filter.fromDate };
    if (filter.toDate) {
      where.endDate = where.endDate ? { ...where.endDate, lte: filter.toDate } : { lte: filter.toDate };
    }

    const limit = filter.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    return {
      data,
      meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined },
    };
  }

  async findById(id: string): Promise<any> {
    const request = await this.prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
    });
    if (!request) throw new AppException('LEAVE_NOT_FOUND');
    return request;
  }

  async getLeaveCalendar(companyId: string, year: number, month: number): Promise<LeaveCalendarDto[]> {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        companyId,
        status: 'APPROVED',
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true } } },
    });

    return leaves.map((l) => ({
      employeeId: l.employeeId,
      employeeName: `${l.employee.firstNameFa} ${l.employee.lastNameFa}`,
      leaveType: l.leaveType,
      startDate: l.startDate,
      endDate: l.endDate,
      days: Number(l.daysCount),
    }));
  }

  async getPendingApprovals(managerId: string, zoneId: string): Promise<any[]> {
    return this.prisma.leaveRequest.findMany({
      where: {
        zoneId,
        status: 'PENDING',
        employee: { reportingManagerId: managerId },
      },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countWorkdays(startDate: string, endDate: string, zoneId: string): Promise<number> {
    const holidays = await this.prisma.zoneHoliday.findMany({
      where: { zoneId },
      select: { date: true },
    });
    const holidaySet = new Set(holidays.map((h) => h.date));
    return countWorkdays(startDate, endDate, holidaySet);
  }

  async resetAnnualLeaveBalances(companyId: string): Promise<void> {
    // Reset annual leave balance for all active employees
    // Apply carry-over rules (max 10 days)
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', deletedAt: null },
    });

    for (const emp of employees) {
      const currentBalance = Number(emp.annualLeaveBalance);
      const carryOver = Math.min(currentBalance, 10);

      await this.prisma.employee.update({
        where: { id: emp.id },
        data: { annualLeaveBalance: 26 + carryOver }, // 26 days standard + carry over
      });
    }

    if (employees.length > 0) {
      await this.audit.log({
        zoneId: employees[0].zoneId,
        action: 'LEAVE_BALANCE_RESET',
        targetType: 'Employee',
        targetId: companyId,
        userId: 'SYSTEM',
        metadata: { employeeCount: employees.length },
      });
    }
  }

  async getLeaveStats(zoneId: string, companyId?: string): Promise<LeaveStatsDto> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;

    const requests = await this.prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { firstNameFa: true, lastNameFa: true } } },
    });

    const totalRequests = requests.length;
    const pending = requests.filter((r) => r.status === 'PENDING').length;
    const approved = requests.filter((r) => r.status === 'APPROVED').length;
    const rejected = requests.filter((r) => r.status === 'REJECTED').length;

    // By type
    const typeMap = new Map<string, { count: number; totalDays: number }>();
    for (const r of requests) {
      const existing = typeMap.get(r.leaveType) || { count: 0, totalDays: 0 };
      existing.count++;
      existing.totalDays += Number(r.daysCount);
      typeMap.set(r.leaveType, existing);
    }
    const byType = Array.from(typeMap.entries()).map(([leaveType, v]) => ({
      leaveType,
      count: v.count,
      totalDays: v.totalDays,
    }));

    // Top absentees
    const empMap = new Map<string, { name: string; totalDays: number }>();
    for (const r of requests.filter((r) => r.status === 'APPROVED')) {
      const key = r.employeeId;
      const existing = empMap.get(key) || { name: `${r.employee.firstNameFa} ${r.employee.lastNameFa}`, totalDays: 0 };
      existing.totalDays += Number(r.daysCount);
      empMap.set(key, existing);
    }
    const topAbsentees = Array.from(empMap.entries())
      .map(([employeeId, v]) => ({ employeeId, ...v }))
      .sort((a, b) => b.totalDays - a.totalDays)
      .slice(0, 10);

    return { totalRequests, pending, approved, rejected, byType, topAbsentees };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private getBalanceField(leaveType: string): string | null {
    switch (leaveType) {
      case 'ANNUAL': return 'annualLeaveBalance';
      case 'SICK': return 'sickLeaveBalance';
      case 'PERSONAL': return 'personalLeaveBalance';
      default: return null;
    }
  }
}
