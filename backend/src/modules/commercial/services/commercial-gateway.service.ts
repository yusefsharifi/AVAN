import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class CommercialGatewayService {
  private readonly logger = new Logger(CommercialGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Proforma Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitProformaCreated(data: {
    companyId: string;
    proformaId: string;
    proformaNumber: string;
    direction: string;
    partyName: string;
    grandTotal: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:created', {
      proformaId: data.proformaId,
      proformaNumber: data.proformaNumber,
      direction: data.direction,
      partyName: data.partyName,
      grandTotal: data.grandTotal,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaStepApproved(data: {
    companyId: string;
    proformaId: string;
    stepOrder: number;
    roleFa: string;
    comment?: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:step:approved', {
      proformaId: data.proformaId,
      stepOrder: data.stepOrder,
      roleFa: data.roleFa,
      comment: data.comment,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaInternallyApproved(data: {
    companyId: string;
    proformaId: string;
    proformaNumber: string;
    grandTotal: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:internally-approved', {
      proformaId: data.proformaId,
      proformaNumber: data.proformaNumber,
      grandTotal: data.grandTotal,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaPartyAccepted(data: {
    companyId: string;
    proformaId: string;
    proformaNumber: string;
    partyName: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:party:accepted', {
      proformaId: data.proformaId,
      proformaNumber: data.proformaNumber,
      partyName: data.partyName,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaPartyRejected(data: {
    companyId: string;
    proformaId: string;
    proformaNumber: string;
    partyName: string;
    note?: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:party:rejected', {
      proformaId: data.proformaId,
      proformaNumber: data.proformaNumber,
      partyName: data.partyName,
      note: data.note,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaConverted(data: {
    companyId: string;
    proformaId: string;
    orderId: string;
    orderNumber: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:converted', {
      proformaId: data.proformaId,
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      timestamp: new Date().toISOString(),
    });
  }

  emitProformaExpiring(data: {
    companyId: string;
    proformaId: string;
    proformaNumber: string;
    daysRemaining: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'proforma:expiring', {
      proformaId: data.proformaId,
      proformaNumber: data.proformaNumber,
      daysRemaining: data.daysRemaining,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Order Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitOrderStatusChanged(data: {
    companyId: string;
    orderId: string;
    orderNumber: string;
    newStatus: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'order:status:changed', {
      orderId: data.orderId,
      orderNumber: data.orderNumber,
      newStatus: data.newStatus,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderMilestoneCompleted(data: {
    companyId: string;
    orderId: string;
    milestoneId: string;
    label: string;
    type: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'order:milestone:completed', {
      orderId: data.orderId,
      milestoneId: data.milestoneId,
      label: data.label,
      type: data.type,
      timestamp: new Date().toISOString(),
    });
  }

  emitOrderMilestoneOverdue(data: {
    companyId: string;
    zoneId: string;
    orderId: string;
    milestoneId: string;
    label: string;
    dueDate: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'order:milestone:overdue', {
      orderId: data.orderId,
      milestoneId: data.milestoneId,
      label: data.label,
      dueDate: data.dueDate,
      timestamp: new Date().toISOString(),
    });
    this.gateway.emitToZone(data.zoneId, 'order:milestone:overdue', {
      orderId: data.orderId,
      milestoneId: data.milestoneId,
      label: data.label,
      dueDate: data.dueDate,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Collection Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitCollectionCaseEscalated(data: {
    zoneId: string;
    caseId: string;
    partyName: string;
    newStatus: string;
    daysOverdue: number;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'collection:case:escalated', {
      caseId: data.caseId,
      partyName: data.partyName,
      newStatus: data.newStatus,
      daysOverdue: data.daysOverdue,
      timestamp: new Date().toISOString(),
    });
  }

  emitCollectionInstallmentPaid(data: {
    companyId: string;
    caseId: string;
    installmentId: string;
    amount: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'collection:installment:paid', {
      caseId: data.caseId,
      installmentId: data.installmentId,
      amount: data.amount,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Contract Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitContractExpiring(data: {
    companyId: string;
    zoneId: string;
    contractId: string;
    contractNumber: string;
    partyName: string;
    endDate: string;
    daysRemaining: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'contract:expiring', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      partyName: data.partyName,
      endDate: data.endDate,
      daysRemaining: data.daysRemaining,
      timestamp: new Date().toISOString(),
    });
    this.gateway.emitToZone(data.zoneId, 'contract:expiring', {
      contractId: data.contractId,
      contractNumber: data.contractNumber,
      partyName: data.partyName,
      endDate: data.endDate,
      daysRemaining: data.daysRemaining,
      companyId: data.companyId,
      timestamp: new Date().toISOString(),
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Credit Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitCreditLimitWarning(data: {
    companyId: string;
    partyId: string;
    partyName: string;
    utilizationPercent: number;
    available: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'credit:limit:warning', {
      partyId: data.partyId,
      partyName: data.partyName,
      utilizationPercent: data.utilizationPercent,
      available: data.available,
      timestamp: new Date().toISOString(),
    });
  }
}
