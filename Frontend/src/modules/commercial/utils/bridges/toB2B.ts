import type { RFQ, Bid } from '@/modules/b2b-exchange/types';
import type { Proforma } from '@/modules/commercial/types';

export function bidToProforma(rfq: RFQ, bid: Bid): Omit<Proforma, 'id' | 'proformaNumber' | 'createdAt' | 'updatedAt' | 'versions' | 'currentVersion' | 'currentApproverIndex'> {
  return {
    direction: 'purchase',
    status: 'draft',
    partyId: bid.supplierId,
    partyName: bid.supplierCompanyName,
    partyCode: bid.supplierId,
    contactName: bid.supplierContactName,
    contactPhone: bid.supplierContactPhone,
    validUntil: bid.submittedAt
      ? bid.submittedAt + 10 // Simplified - should calculate actual date
      : '',
    paymentTerms: bid.paymentTerms,
    currencyCode: bid.currency,
    exchangeRate: 1,
    lines: [{
      id: `line-${bid.id}`,
      itemCode: rfq.categoryId,
      itemName: rfq.title,
      quantity: rfq.quantity,
      unitPrice: bid.unitPrice,
      discount: 0,
      taxRate: 9,
      lineTotal: bid.totalPrice,
      notes: bid.technicalResponse,
    }],
    rfqId: rfq.id,
    bidId: bid.id,
    tags: ['from-rfq', rfq.categoryPath[0]],
    // ... other fields
  };
}