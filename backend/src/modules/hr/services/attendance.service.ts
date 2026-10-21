import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ClockInDto, ManualAttendanceDto, FilterAttendanceDto } from '../dto/create-dtos';
import type { PaginatedResult, TeamAttendanceDto, AttendanceSummaryDto } from '../dto/enums';
import { HrGatewayService } from './hr-gateway.service';
import { getCurrentJalaliDate, jalaliDaysDifference, jalaliToDate, dateToJalali } from '../utils/hr.utils';

@Injectable()
export class AttendanceService {
  private readonly logger = new Logger(AttendanceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOCK IN
  // ═══════════════════════════════════════════════════════════════════════════

  async clockIn(dto: ClockInDto, zoneId: string): Promise<any> {
    // 1. Find employee
    let employee: any;
    if (dto.rfidCardNumber) {
      employee = await this.prisma.employee.findFirst({
        where: { rfidCardNumber: dto.rfidCardNumber, deletedAt: null },
      });
    } else {
      employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    }

    if (!employee || employee.deletedAt) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }
    if (employee.status !== 'ACTIVE') {
      throw new AppException('EMPLOYEE_NOT_ACTIVE');
    }

    const workDate = getCurrentJalaliDate();
    const now = new Date();

    // 2. Find or create today's record
    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
    });

    if (existing) {
      // Already clocked in — update if earlier
      if (existing.clockIn && now < existing.clockIn) {
        const updated = await this.prisma.attendanceRecord.update({
          where: { id: existing.id },
          data: {
            clockIn: now,
            clockInMethod: dto.method || 'RFID_GATE',
            clockInGateId: dto.gateId,
          },
        });
        return updated;
      }
      return existing;
    }

    // 3. Calculate late minutes (assuming 07:00 start)
    const scheduledStart = new Date(now);
    scheduledStart.setHours(7, 0, 0, 0);
    const lateMinutes = now > scheduledStart
      ? Math.floor((now.getTime() - scheduledStart.getTime()) / 60000)
      : 0;

    // 4. Create attendance record
    const record = await this.prisma.attendanceRecord.create({
      data: {
        zoneId: employee.zoneId,
        companyId: employee.companyId,
        employeeId: employee.id,
        workDate,
        clockIn: now,
        clockInMethod: dto.method || 'RFID_GATE',
        clockInGateId: dto.gateId,
        scheduledStart,
        status: 'PRESENT',
        lateMinutes,
      },
    });

    // 5. Emit socket event
    this.gateway.emitClockIn({
      companyId: employee.companyId,
      employeeId: employee.id,
      employeeName: `${employee.firstNameFa} ${employee.lastNameFa}`,
      clockIn: now.toISOString(),
      gateId: dto.gateId,
      method: dto.method || 'RFID_GATE',
    });

    // 6. Create audit log
    await this.audit.log({
      zoneId,
      action: 'ATTENDANCE_CLOCK_IN',
      targetType: 'AttendanceRecord',
      targetId: record.id,
      userId: employee.id,
      metadata: { method: dto.method, gateId: dto.gateId, lateMinutes },
    });

    return record;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CLOCK OUT
  // ═══════════════════════════════════════════════════════════════════════════

  async clockOut(dto: ClockInDto, zoneId: string): Promise<any> {
    const employee = dto.rfidCardNumber
      ? await this.prisma.employee.findFirst({ where: { rfidCardNumber: dto.rfidCardNumber, deletedAt: null } })
      : await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });

    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const workDate = getCurrentJalaliDate();
    const now = new Date();

    const record = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_workDate: { employeeId: employee.id, workDate } },
    });

    if (!record) {
      throw new AppException('ATTENDANCE_NO_CLOCK_IN');
    }

    if (!record.clockIn) {
      throw new AppException('ATTENDANCE_NO_CLOCK_IN');
    }

    // Calculate worked minutes
    const diffMs = now.getTime() - record.clockIn.getTime();
    const workedMinutes = Math.floor(diffMs / 60000) - record.breakMinutes;
    const scheduledMinutes = record.scheduledStart && record.scheduledEnd
      ? Math.floor((record.scheduledEnd.getTime() - record.scheduledStart.getTime()) / 60000)
      : 480; // default 8 hours

    const regularMinutes = Math.min(workedMinutes, scheduledMinutes);
    const overtimeMinutes = Math.max(0, workedMinutes - scheduledMinutes);
    const earlyLeaveMin = Math.max(0, scheduledMinutes - workedMinutes);

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: now,
        clockOutMethod: dto.method || 'RFID_GATE',
        clockOutGateId: dto.gateId,
        workedMinutes,
        regularMinutes,
        overtimeMinutes,
        earlyLeaveMin,
      },
    });

    // Emit socket event
    this.gateway.emitClockOut({
      companyId: employee.companyId,
      employeeId: employee.id,
      employeeName: `${employee.firstNameFa} ${employee.lastNameFa}`,
      clockOut: now.toISOString(),
      workedHours: Math.round(workedMinutes / 60 * 100) / 100,
      overtimeHours: Math.round(overtimeMinutes / 60 * 100) / 100,
    });

    await this.audit.log({
      zoneId,
      action: 'ATTENDANCE_CLOCK_OUT',
      targetType: 'AttendanceRecord',
      targetId: record.id,
      userId: employee.id,
      metadata: { workedMinutes, overtimeMinutes },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MANUAL ATTENDANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async recordManual(dto: ManualAttendanceDto, recordedBy: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: { employeeId_workDate: { employeeId: dto.employeeId, workDate: dto.workDate } },
    });

    const clockIn = new Date(dto.clockIn);
    const clockOut = dto.clockOut ? new Date(dto.clockOut) : null;

    let workedMinutes = 0;
    if (clockOut) {
      workedMinutes = Math.floor((clockOut.getTime() - clockIn.getTime()) / 60000);
    }

    if (existing) {
      return this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          clockIn,
          clockOut,
          workedMinutes,
          status: dto.status || 'PRESENT',
          isManualOverride: true,
          overrideReason: dto.reason,
          overrideBy: recordedBy,
        },
      });
    }

    const record = await this.prisma.attendanceRecord.create({
      data: {
        zoneId: employee.zoneId,
        companyId: employee.companyId,
        employeeId: dto.employeeId,
        workDate: dto.workDate,
        clockIn,
        clockOut,
        workedMinutes,
        status: dto.status || 'PRESENT',
        isManualOverride: true,
        overrideReason: dto.reason,
        overrideBy: recordedBy,
      },
    });

    await this.audit.log({
      zoneId: employee.zoneId,
      action: 'ATTENDANCE_MANUAL_OVERRIDE',
      targetType: 'AttendanceRecord',
      targetId: record.id,
      userId: recordedBy,
      metadata: { reason: dto.reason, employeeId: dto.employeeId },
    });

    return record;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // APPROVE
  // ═══════════════════════════════════════════════════════════════════════════

  async approve(recordId: string, approvedBy: string): Promise<any> {
    const record = await this.prisma.attendanceRecord.findUnique({ where: { id: recordId } });
    if (!record) throw new AppException('ATTENDANCE_NOT_FOUND');

    const updated = await this.prisma.attendanceRecord.update({
      where: { id: recordId },
      data: { isApproved: true, approvedBy },
    });

    await this.audit.log({
      zoneId: record.zoneId,
      action: 'ATTENDANCE_APPROVED',
      targetType: 'AttendanceRecord',
      targetId: recordId,
      userId: approvedBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async getMonthlyAttendance(employeeId: string, year: number, month: number): Promise<any[]> {
    const monthStr = String(month).padStart(2, '0');
    const startDate = `${year}-${monthStr}-01`;
    const endDate = `${year}-${monthStr}-31`;

    return this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        workDate: { gte: startDate, lte: endDate },
      },
      orderBy: { workDate: 'asc' },
    });
  }

  async getTeamAttendance(companyId: string, workDate: string): Promise<TeamAttendanceDto> {
    const employees = await this.prisma.employee.findMany({
      where: { companyId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, firstNameFa: true, lastNameFa: true },
    });

    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        companyId,
        workDate,
      },
    });

    const recordMap = new Map(records.map((r) => [r.employeeId, r]));

    let present = 0;
    let absent = 0;
    let onLeave = 0;
    let late = 0;

    const employeeData = employees.map((emp) => {
      const record = recordMap.get(emp.id);
      const status = record ? record.status : 'ABSENT';

      if (status === 'PRESENT') present++;
      else if (status === 'ABSENT') absent++;
      else if (status === 'ON_LEAVE') onLeave++;
      else if (record && record.lateMinutes > 0) late++;

      return {
        employeeId: emp.id,
        name: `${emp.firstNameFa} ${emp.lastNameFa}`,
        status,
        clockIn: record?.clockIn?.toISOString(),
        clockOut: record?.clockOut?.toISOString(),
      };
    });

    return {
      date: workDate,
      totalEmployees: employees.length,
      present,
      absent,
      onLeave,
      late,
      employees: employeeData,
    };
  }

  async getAttendanceSummary(
    employeeId: string,
    fromDate: string,
    toDate: string,
  ): Promise<AttendanceSummaryDto> {
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        employeeId,
        workDate: { gte: fromDate, lte: toDate },
      },
    });

    const workDays = jalaliDaysDifference(fromDate, toDate) + 1;
    const presentDays = records.filter((r) => r.status === 'PRESENT').length;
    const absentDays = records.filter((r) => r.status === 'ABSENT').length;
    const leaveDays = records.reduce((sum, r) => {
      if (r.status === 'ON_LEAVE') return sum + 1;
      return sum;
    }, 0);

    const totalWorkedHours = records.reduce((sum, r) => sum + r.workedMinutes, 0) / 60;
    const overtimeHours = records.reduce((sum, r) => sum + r.overtimeMinutes, 0) / 60;
    const lateCount = records.filter((r) => r.lateMinutes > 0).length;
    const lateMinutesTotal = records.reduce((sum, r) => sum + r.lateMinutes, 0);
    const earlyLeaveCount = records.filter((r) => r.earlyLeaveMin > 0).length;

    return {
      workDays,
      presentDays,
      absentDays,
      leaveDays,
      totalWorkedHours: Math.round(totalWorkedHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      lateCount,
      lateMinutesTotal,
      earlyLeaveCount,
    };
  }

  async findAll(filter: FilterAttendanceDto): Promise<PaginatedResult<any>> {
    const where: any = {};
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.employeeId) where.employeeId = filter.employeeId;
    if (filter.status) where.status = filter.status;
    if (filter.fromDate) where.workDate = { gte: filter.fromDate };
    if (filter.toDate) {
      where.workDate = where.workDate ? { ...where.workDate, lte: filter.toDate } : { lte: filter.toDate };
    }

    const limit = filter.limit || 50;

    const [data, total] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where,
        take: limit,
        orderBy: { workDate: 'desc' },
        include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
      }),
      this.prisma.attendanceRecord.count({ where }),
    ]);

    return {
      data,
      meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined },
    };
  }

  async findById(id: string): Promise<any> {
    const record = await this.prisma.attendanceRecord.findUnique({
      where: { id },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
    });
    if (!record) throw new AppException('ATTENDANCE_NOT_FOUND');
    return record;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ABSENCE PROCESSING (called by job)
  // ═══════════════════════════════════════════════════════════════════════════

  async processAbsences(zoneId: string, workDate: string): Promise<void> {
    // Find active employees with no attendance record for today
    const activeEmployees = await this.prisma.employee.findMany({
      where: { zoneId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, companyId: true },
    });

    const existingRecords = await this.prisma.attendanceRecord.findMany({
      where: {
        zoneId,
        workDate,
      },
      select: { employeeId: true },
    });

    const recordedIds = new Set(existingRecords.map((r) => r.employeeId));

    // Check for approved leaves
    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        zoneId,
        status: 'APPROVED',
        startDate: { lte: workDate },
        endDate: { gte: workDate },
      },
      select: { employeeId: true },
    });

    const onLeaveIds = new Set(approvedLeaves.map((l) => l.employeeId));

    for (const emp of activeEmployees) {
      if (recordedIds.has(emp.id)) continue;

      const status = onLeaveIds.has(emp.id) ? 'ON_LEAVE' : 'ABSENT';

      await this.prisma.attendanceRecord.create({
        data: {
          zoneId,
          companyId: emp.companyId,
          employeeId: emp.id,
          workDate,
          status,
        },
      });
    }
  }
}
