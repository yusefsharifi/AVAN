import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

/**
 * B2B-specific WebSocket event emitter.
 * Wraps the global IdopGateway with typed B2B events.
 *
 * Events emitted by SERVER:
 *   rfq:published              → zone:{zoneId} + category:{categoryId}
 *   rfq:new-bid                → company:{buyerCompanyId}
 *   rfq:bid-submitted          → company:{supplierId}
 *   rfq:deadline-approaching   → company:{supplierId}
 *   rfq:closed                 → zone:{zoneId}
 *   rfq:awarded                → company:{supplierId} (winner)
 *   rfq:rejected               → company:{supplierId} (loser)
 *   rfq:clarification:answered → rfq:{rfqId}:bidders
 *   bid:unsealed               → company:{buyerCompanyId}
 *   bid:withdrawn              → company:{buyerCompanyId}
 */
@Injectable()
export class B2bGatewayService {
  private readonly logger = new Logger(B2bGatewayService.name);

  constructor(private readonly gateway: IdopGateway) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // RFQ Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitRfqPublished(data: {
    zoneId: string;
    categoryId: string;
    rfqId: string;
    rfqNumber: string;
    title: string;
    buyerName: string;
    quantity: number;
    unit: string;
    submissionDeadline: Date;
    categoryPath: string[];
  }): void {
    const payload = {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      title: data.title,
      buyerName: data.buyerName,
      quantity: data.quantity,
      unit: data.unit,
      submissionDeadline: data.submissionDeadline,
      categoryPath: data.categoryPath,
      timestamp: new Date().toISOString(),
    };

    this.gateway.emitToZone(data.zoneId, 'rfq:published', payload);
    this.gateway.emitToRoom(`category:${data.categoryId}`, 'rfq:published', payload);
    this.logger.debug(`Emitted rfq:published for ${data.rfqNumber}`);
  }

  emitNewBidToBuyer(data: {
    buyerCompanyId: string;
    rfqId: string;
    rfqNumber: string;
    bidCount: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.buyerCompanyId}`, 'rfq:new-bid', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      bidCount: data.bidCount,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted rfq:new-bid for ${data.rfqNumber} (${data.bidCount} bids)`);
  }

  emitBidSubmittedToSupplier(data: {
    supplierId: string;
    rfqId: string;
    rfqNumber: string;
    bidId: string;
    submittedAt: Date;
  }): void {
    this.gateway.emitToRoom(`company:${data.supplierId}`, 'rfq:bid-submitted', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      bidId: data.bidId,
      submittedAt: data.submittedAt,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted rfq:bid-submitted to supplier ${data.supplierId}`);
  }

  emitDeadlineApproaching(data: {
    supplierId: string;
    rfqId: string;
    rfqNumber: string;
    hoursRemaining: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.supplierId}`, 'rfq:deadline-approaching', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      hoursRemaining: data.hoursRemaining,
      timestamp: new Date().toISOString(),
    });
  }

  emitRfqClosed(data: {
    zoneId: string;
    rfqId: string;
    rfqNumber: string;
    bidCount: number;
    status: string;
  }): void {
    this.gateway.emitToZone(data.zoneId, 'rfq:closed', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      bidCount: data.bidCount,
      status: data.status,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted rfq:closed for ${data.rfqNumber}`);
  }

  emitRfqAwarded(data: {
    supplierId: string;
    rfqId: string;
    rfqNumber: string;
    bidId: string;
    awardNote: string;
    autoConvertedToPO: boolean;
    proformaId?: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.supplierId}`, 'rfq:awarded', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      bidId: data.bidId,
      awardNote: data.awardNote,
      autoConvertedToPO: data.autoConvertedToPO,
      proformaId: data.proformaId,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted rfq:awarded to winner ${data.supplierId}`);
  }

  emitRfqRejected(data: {
    supplierId: string;
    rfqId: string;
    rfqNumber: string;
    rejectionReason: string;
  }): void {
    this.gateway.emitToRoom(`company:${data.supplierId}`, 'rfq:rejected', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      rejectionReason: data.rejectionReason,
      timestamp: new Date().toISOString(),
    });
  }

  emitClarificationAnswered(data: {
    rfqId: string;
    clarificationId: string;
    question: string;
    answer: string;
    answeredAt: Date;
  }): void {
    this.gateway.emitToRoom(`rfq:${data.rfqId}:bidders`, 'rfq:clarification:answered', {
      clarificationId: data.clarificationId,
      question: data.question,
      answer: data.answer,
      answeredAt: data.answeredAt,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted rfq:clarification:answered for rfq ${data.rfqId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Bid Events
  // ═══════════════════════════════════════════════════════════════════════════

  emitBidUnsealed(data: {
    buyerCompanyId: string;
    rfqId: string;
    bids: { bidId: string; supplierId: string; finalPrice: number; rank: number }[];
  }): void {
    this.gateway.emitToRoom(`company:${data.buyerCompanyId}`, 'bid:unsealed', {
      rfqId: data.rfqId,
      bids: data.bids,
      timestamp: new Date().toISOString(),
    });
    this.logger.debug(`Emitted bid:unsealed for rfq ${data.rfqId}`);
  }

  emitBidWithdrawn(data: {
    buyerCompanyId: string;
    rfqId: string;
    rfqNumber: string;
    bidId: string;
    remainingCount: number;
  }): void {
    this.gateway.emitToRoom(`company:${data.buyerCompanyId}`, 'bid:withdrawn', {
      rfqId: data.rfqId,
      rfqNumber: data.rfqNumber,
      bidId: data.bidId,
      remainingCount: data.remainingCount,
      timestamp: new Date().toISOString(),
    });
  }
}
