import { useMemo } from 'react';
import type { AgingReportItem } from '../types';

export function useAgingReport(invoices: { customerId: string; customerName: string; totalAmount: number; daysOverdue: number }[]) {
  const report = useMemo(() => {
    const grouped: Record<string, AgingReportItem> = {};
    invoices.forEach(inv => {
      if (!grouped[inv.customerId]) grouped[inv.customerId] = { customerId: inv.customerId, customerName: inv.customerName, current: 0, d1to30: 0, d31to60: 0, d61to90: 0, d90plus: 0, total: 0 };
      const g = grouped[inv.customerId];
      if (inv.daysOverdue <= 0) g.current += inv.totalAmount;
      else if (inv.daysOverdue <= 30) g.d1to30 += inv.totalAmount;
      else if (inv.daysOverdue <= 60) g.d31to60 += inv.totalAmount;
      else if (inv.daysOverdue <= 90) g.d61to90 += inv.totalAmount;
      else g.d90plus += inv.totalAmount;
      g.total += inv.totalAmount;
    });
    return Object.values(grouped);
  }, [invoices]);
  
  const totals = useMemo(() => ({
    current: report.reduce((s, r) => s + r.current, 0),
    d1to30: report.reduce((s, r) => s + r.d1to30, 0),
    d31to60: report.reduce((s, r) => s + r.d31to60, 0),
    d61to90: report.reduce((s, r) => s + r.d61to90, 0),
    d90plus: report.reduce((s, r) => s + r.d90plus, 0),
    total: report.reduce((s, r) => s + r.total, 0),
  }), [report]);
  
  return { report, totals };
}
