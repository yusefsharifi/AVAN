import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

/**
 * Finance-specific WebSocket event emitter.
 * Wraps the global IdopGateway with typed finance events.
 *
 * Clients join rooms via:
 *   socket.emit('finance:join', { zoneId, companyId })
 *
 * Server emits:
 *   finance:voucher:posted     → zone:{zoneId}
 *   finance:voucher:reviewed   → zone:{zoneId}
 *   finance:voucher:approved   → zone:{zoneId}
 *   finance:invoice:issued     → company:{companyId}
 *   finance:invoice:overdue    → company:{companyId} + zone:{zoneId}
 *   finance:payment:recorded   → company:{companyId}
 *   finance:lease:billing      → company:{companyId}
 *   finance:lease:expiring     → company:{companyId} + zone:{zoneId}
 *   finance:budget:exceeded    → zone:{zoneId}
 *   finance:kpi:update         → zone:{zoneId}
 */
@Injectable()
export class FinanceGatewayService {
  private readonly logger = new Logger(FinanceGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Voucher Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitVoucherPosted(data: {
    zoneId: string;
    voucherId: string;
    voucherNumber: string;
    type: string;
    totalDebit: number;
    date: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:voucher:posted', {
      voucherId: data.voucherId,
      voucherNumber: data.voucherNumber,
      type: data.type,
      amount: data.totalDebit,
      date: data.date,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted finance:voucher:posted for ${data.voucherNumber}`);
  }

  emitVoucherReviewed(data: {
    zoneId: string;
    voucherId: string;
    voucherNumber: string;
    reviewedBy: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:voucher:reviewed', {
      voucherId: data.voucherId,
      voucherNumber: data.voucherNumber,
      reviewedBy: data.reviewedBy,
      timestamp: new Date().toISOString(),
    });
  }

  emitVoucherApproved(data: {
    zoneId: string;
    voucherId: string;
    voucherNumber: string;
    approvedBy: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:voucher:approved', {
      voucherId: data.voucherId,
      voucherNumber: data.voucherNumber,
      approvedBy: data.approvedBy,
      timestamp: new Date().toISOString(),
    });
  }

  emitVoucherVoided(data: {
    zoneId: string;
    voucherId: string;
    voucherNumber: string;
    reason: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:voucher:voided', {
      voucherId: data.voucherId,
      voucherNumber: data.voucherNumber,
      reason: data.reason,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Invoice Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitInvoiceIssued(data: {
    zoneId: string;
    companyId?: string;
    invoiceId: string;
    invoiceNumber: string;
    type: string;
    grandTotal: number;
    dueDate?: string;
  }): void {
    // Emit to company room if companyId exists
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:invoice:issued', {
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        type: data.type,
        grandTotal: data.grandTotal,
        dueDate: data.dueDate,
        timestamp: new Date().toISOString(),
      });
    }

    // Also emit to zone room for zone manager dashboard
    this.gateway.emitToZone(data.zoneId, 'finance:invoice:issued', {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      type: data.type,
      grandTotal: data.grandTotal,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:invoice:issued for ${data.invoiceNumber}`);
  }

  emitInvoiceOverdue(data: {
    zoneId: string;
    companyId?: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    overdueDays: number;
  }): void {
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:invoice:overdue', {
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        amount: data.amount,
        overdueDays: data.overdueDays,
        timestamp: new Date().toISOString(),
      });
    }

    this.gateway.emitToZone(data.zoneId, 'finance:invoice:overdue', {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      overdueDays: data.overdueDays,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:invoice:overdue for ${data.invoiceNumber} (${data.overdueDays} days)`);
  }

  emitInvoiceCancelled(data: {
    zoneId: string;
    companyId?: string;
    invoiceId: string;
    invoiceNumber: string;
  }): void {
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:invoice:cancelled', {
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Payment Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitPaymentRecorded(data: {
    zoneId: string;
    companyId?: string;
    invoiceId: string;
    invoiceNumber: string;
    paymentAmount: number;
    remainingAmount: number;
    method: string;
  }): void {
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:payment:recorded', {
        invoiceId: data.invoiceId,
        invoiceNumber: data.invoiceNumber,
        paymentAmount: data.paymentAmount,
        remainingAmount: data.remainingAmount,
        method: data.method,
        timestamp: new Date().toISOString(),
      });
    }

    this.gateway.emitToZone(data.zoneId, 'finance:payment:recorded', {
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      paymentAmount: data.paymentAmount,
      remainingAmount: data.remainingAmount,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:payment:recorded for ${data.invoiceNumber}: ${data.paymentAmount}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lease Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitLeaseBilling(data: {
    zoneId: string;
    companyId: string;
    contractId: string;
    contractNumber: string;
    invoiceId: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:lease:billing', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      invoiceId: data.invoiceId,
      invoiceNumber: data.invoiceNumber,
      amount: data.amount,
      dueDate: data.dueDate,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitToZone(data.zoneId, 'finance:lease:billing', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      companyId: data.companyId,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:lease:billing for contract ${data.contractNumber}`);
  }

  emitLeaseExpiring(data: {
    zoneId: string;
    companyId: string;
    companyName: string;
    contractId: string;
    contractNumber: string;
    endDate: string;
    daysRemaining: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:lease:expiring', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      companyName: data.companyName,
      endDate: data.endDate,
      daysRemaining: data.daysRemaining,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitToZone(data.zoneId, 'finance:lease:expiring', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      companyName: data.companyName,
      endDate: data.endDate,
      daysRemaining: data.daysRemaining,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:lease:expiring for ${data.contractNumber} (${data.daysRemaining} days)`);
  }

  emitLeaseTerminated(data: {
    zoneId: string;
    companyId?: string;
    contractId: string;
    contractNumber: string;
    reason: string;
  }): void {
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'finance:lease:terminated', {
        contractId: data.contractId,
        contractNumber: data.contractNumber,
        reason: data.reason,
        timestamp: new Date().toISOString(),
      });
    }

    this.gateway.emitToZone(data.zoneId, 'finance:lease:terminated', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Budget Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitBudgetExceeded(data: {
    zoneId: string;
    budgetId: string;
    accountCode: string;
    accountName: string;
    budgeted: number;
    actual: number;
    excess: number;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:budget:exceeded', {
      budgetId: data.budgetId,
      accountCode: data.accountCode,
      accountName: data.accountName,
      budgeted: data.budgeted,
      actual: data.actual,
      excess: data.excess,
      timestamp: new Date().toISOString(),
    });

    this.logger.debug(`Emitted finance:budget:exceeded for ${data.accountCode}: excess ${data.excess}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // KPI Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitKpiUpdate(zoneId: string, kpiData: Record<string, unknown>): void {
    this.gateway.emitToZone(zoneId, 'finance:kpi:update', {
      ...kpiData,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Period Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitPeriodClosed(data: {
    zoneId: string;
    periodId: string;
    periodName: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:period:closed', {
      periodId: data.periodId,
      periodName: data.periodName,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitToSuperAdmin('finance:period:closed', {
      zoneId: data.zoneId,
      periodId: data.periodId,
      periodName: data.periodName,
      timestamp: new Date().toISOString(),
    });
  }

  emitPeriodLocked(data: {
    zoneId: string;
    periodId: string;
    periodName: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'finance:period:locked', {
      periodId: data.periodId,
      periodName: data.periodName,
      timestamp: new Date().toISOString(),
    });

    this.gateway.emitToSuperAdmin('finance:period:locked', {
      zoneId: data.zoneId,
      periodId: data.periodId,
      periodName: data.periodName,
      timestamp: new Date().toISOString(),
    });
  }
}
