import type { CommercialOrder } from '@/modules/commercial/types';
import type { SalesDocument, PurchaseDocument } from '@/modules/finance/types/purchaseSales.types';

export function orderToFinanceDocument(order: CommercialOrder): SalesDocument | PurchaseDocument {
  return {
    id: `fin-${order.id}`,
    documentNumber: order.orderNumber.replace(/^(SO|PO)/, order.direction === 'sales' ? 'INV-S' : 'INV-P'),
    date: order.updatedAt,
    type: order.direction === 'sales' ? 'sales_invoice' : 'purchase_invoice',
    lines: order.lines,
    grandTotal: order.grandTotal,
    status: 'prepared',
    totalBeforeDiscount: order.totalBeforeDiscount,
    totalDiscount: order.totalDiscount,
    totalTax: order.totalTax,
    currencyCode: order.currencyCode,
    exchangeRate: order.exchangeRate,
    // Add other required fields as needed
  };
}