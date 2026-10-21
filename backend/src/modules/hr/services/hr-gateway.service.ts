import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class HrGatewayService {
  private readonly logger = new Logger(HrGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ATTENDANCE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  emitClockIn(data: {
    companyId: string;
    employeeId: string;
    employeeName: string;
    clockIn: string;
    gateId?: string;
    method?: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'attendance:clock-in', {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      clockIn: data.clockIn,
      gateId: data.gateId,
      method: data.method,
    });
  }

  emitClockOut(data: {
    companyId: string;
    employeeId: string;
    employeeName: string;
    clockOut: string;
    workedHours: number;
    overtimeHours: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'attendance:clock-out', {
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      clockOut: data.clockOut,
      workedHours: data.workedHours,
      overtimeHours: data.overtimeHours,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  emitLeaveRequested(data: {
    managerId: string;
    requestId: string;
    requestNumber: string;
    employeeName: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    days: number;
  }): void {
    this.gateway.emitToRoom(`user:${data.managerId}`, 'leave:requested', {
      requestId: data.requestId,
      requestNumber: data.requestNumber,
      employeeName: data.employeeName,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      days: data.days,
    });
  }

  emitLeaveApproved(data: {
    employeeId: string;
    requestId: string;
    leaveType: string;
    startDate: string;
    endDate: string;
    approvedBy: string;
  }): void {
    this.gateway.emitToRoom(`user:${data.employeeId}`, 'leave:approved', {
      requestId: data.requestId,
      leaveType: data.leaveType,
      startDate: data.startDate,
      endDate: data.endDate,
      approvedBy: data.approvedBy,
    });
  }

  emitLeaveRejected(data: {
    employeeId: string;
    requestId: string;
    leaveType: string;
    rejectionReason: string;
  }): void {
    this.gateway.emitToRoom(`user:${data.employeeId}`, 'leave:rejected', {
      requestId: data.requestId,
      leaveType: data.leaveType,
      rejectionReason: data.rejectionReason,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PAYROLL EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  emitPayrollCalculated(data: {
    companyId: string;
    payrollId: string;
    period: string;
    totalGross: bigint;
    totalNet: bigint;
    employeeCount: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'payroll:calculated', {
      payrollId: data.payrollId,
      period: data.period,
      totalGross: data.totalGross.toString(),
      totalNet: data.totalNet.toString(),
      employeeCount: data.employeeCount,
    });
  }

  emitPayslipReady(data: {
    employeeId: string;
    payslipId: string;
    period: string;
    netSalary: bigint;
    pdfUrl?: string;
  }): void {
    this.gateway.emitToRoom(`user:${data.employeeId}`, 'payroll:payslip:ready', {
      payslipId: data.payslipId,
      period: data.period,
      netSalary: data.netSalary.toString(),
      pdfUrl: data.pdfUrl,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PERFORMANCE EVENTS
  // ═══════════════════════════════════════════════════════════════════════════

  emitReviewSubmitted(data: {
    employeeId: string;
    reviewId: string;
    period: string;
    reviewerName: string;
    overallRating: string;
  }): void {
    this.gateway.emitToRoom(`user:${data.employeeId}`, 'performance:review:submitted', {
      reviewId: data.reviewId,
      period: data.period,
      reviewerName: data.reviewerName,
      overallRating: data.overallRating,
    });
  }
}
