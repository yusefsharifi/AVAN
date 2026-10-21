import type { Proforma } from '@/modules/commercial/types';
import type { Letter } from '@/modules/correspondence/types';

export function proformaToLetter(proforma: Proforma): Partial<Letter> {
  return {
    direction: proforma.direction === 'sales' ? 'outgoing' : 'incoming',
    type: 'request',
    classification: 'unclassified',
    priority: proforma.grandTotal > 2_000_000_000 ? 'high' : 'normal',
    subject: `پیش‌فاکتور ${proforma.direction === 'sales' ? 'فروش' : 'خرید'} شماره ${proforma.proformaNumber}`,
    body: `پیش‌فاکتور شماره ${proforma.proformaNumber} برای ${proforma.direction === 'sales' ? 'فروش' : 'خرید'} به طرف مقابل${proforma.direction === 'sales' ? ' است' : 'ات'}.
    
    جزئیات:
    - تاریخ صدور: ${formatJalaliDateTime(proforma.issueDate)}
    - تاریخ اعتبار: ${formatJalaliDateTime(proforma.validUntil)}
    - مبلغ کل: ${formatCurrency(proforma.grandTotal)}
    - شرایط پرداخت: ${proforma.paymentTerms}
    - روش تحویل: ${proforma.deliveryLocation || '—'}
    
    با سلامتی،
    ${proforma.direction === 'sales' ? 'واحد بازرگانی' : proforma.partyName}`,
    sender: proforma.direction === 'sales' ? 'واحد بازرگانی' : proforma.partyName,
    senderOrg: proforma.direction === 'sales' ? 'شرکت' : proforma.partyName,
    recipients: [{ name: proforma.partyName, org: proforma.partyName, action: 'action' }],
    slaHours: 72,
    status: 'sent',
    tags: ['proforma', proforma.direction],
    topic: 'بازرگانی',
    referenceNumber: proforma.proformaNumber,
  };
}

export function orderConfirmationToLetter(order: any): Partial<Letter> {
  return {
    direction: 'outgoing',
    type: 'confirmation',
    classification: 'unclassified',
    priority: 'normal',
    subject: `تایید سفارش شماره ${order.orderNumber}`,
    body: `سفارش شماره ${order.orderNumber} با موفقیت تایید شده است.
    
    جزئیات:
    - مبلغ کل: ${formatCurrency(order.grandTotal)}
    - تاریخ تحویل: ${formatJalaliDateTime(order.deliveryDate)}
    - شرایط پرداخت: ${order.paymentTerms}
    
    با سلامتی،
    واحد بازرگانی`,
    sender: 'واحد بازرگانی',
    senderOrg: 'شرکت',
    recipients: [{ name: order.partyName, org: order.partyName, action: 'action' }],
    slaHours: 48,
    status: 'sent',
    tags: ['order', 'confirmation'],
    topic: 'بازرگانی',
    referenceNumber: order.orderNumber,
  };
}

export function collectionReminderToLetter(caseItem: any, level: string): Partial<Letter> {
  return {
    direction: 'outgoing',
    type: 'reminder',
    classification: 'unclassified',
    priority: level === 'demand_letter' ? 'high' : 'normal',
    subject: `یادآوری مبلغی ${formatCurrency(caseItem.originalAmount)}`,
    body: `با سلام،
    
    یادآوری می‌شود که مبلغی ${formatCurrency(caseItem.originalAmount)} شما از طرف
    ${caseItem.partyName} هنوز پرداخت نشده است.
    
    این یادآوری به عنوان ${level} در نظر گرفته شده است.
    لطفاً در عرض ${level === 'demand_letter' ? '7' : '3'} روز آینده پرداخت کنید.
    
    با سلامتی،
    واحد بازرگانی`,
    sender: 'واحد بازرگانی',
    senderOrg: 'شرکت',
    recipients: [{ name: caseItem.partyName, org: caseItem.partyName, action: 'action' }],
    slaHours: level === 'demand_letter' ? 24 : 48,
    status: level === 'demand_letter' ? 'sent' : 'draft',
    tags: ['collection', level],
    topic: 'مطالبات',
    referenceNumber: caseItem.id,
  };
}