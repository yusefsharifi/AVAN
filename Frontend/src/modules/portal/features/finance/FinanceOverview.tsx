import { useState } from 'react';
import { KpiWidget } from '../../components/KpiWidget';
import { DataTable, Column } from '../../components/DataTable';
import { useDebounceSearch } from '../../hooks';
import { INVOICE_STATUS_CONFIG } from '../../constants';
import type { Invoice } from '../../types';
import { TrendingUp, TrendingDown, CreditCard, AlertCircle, Plus, Download } from 'lucide-react';

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', companyId: 'C-001', contractId: '', invoiceNumber: 'INV-2024-0001', description: 'اجاره مرداد', amount: 48000000, taxAmount: 4800000, totalAmount: 52800000, currency: 'IRR', status: 'paid', dueDate: '۱۴۰۳/۰۵/۰۱', paidAt: '۱۴۰۳/۰۴/۲۸', approvalFlow: [], reconciliationStatus: 'matched', createdAt: '۱۴۰۳/۰۴/۰۱' },
  { id: 'INV-002', companyId: 'C-002', contractId: '', invoiceNumber: 'INV-2024-0002', description: 'اجاره مرداد', amount: 68000000, taxAmount: 6800000, totalAmount: 74800000, currency: 'IRR', status: 'pending_approval', dueDate: '۱۴۰۳/۰۵/۰۱', approvalFlow: [], reconciliationStatus: 'unmatched', createdAt: '۱۴۰۳/۰۴/۰۱' },
  { id: 'INV-003', companyId: 'C-003', contractId: '', invoiceNumber: 'INV-2024-0003', description: 'هزینه آب و برق', amount: 12500000, taxAmount: 1250000, totalAmount: 13750000, currency: 'IRR', status: 'overdue', dueDate: '۱۴۰۳/۰۴/۱۰', approvalFlow: [], reconciliationStatus: 'unmatched', createdAt: '۱۴۰۳/۰۳/۱۰' },
  { id: 'INV-004', companyId: 'C-001', contractId: '', invoiceNumber: 'INV-2024-0004', description: 'خدمات تأسیسات', amount: 8200000, taxAmount: 820000, totalAmount: 9020000, currency: 'IRR', status: 'approved', dueDate: '۱۴۰۳/۰۴/۳۰', approvalFlow: [], reconciliationStatus: 'matched', createdAt: '۱۴۰۳/۰۴/۱۰' },
];

export function FinanceOverview() {
  const { debouncedQuery, search } = useDebounceSearch();
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = MOCK_INVOICES.filter(i => {
    if (debouncedQuery && !i.invoiceNumber.includes(debouncedQuery) && !i.description.includes(debouncedQuery)) return false;
    if (statusFilter && i.status !== statusFilter) return false;
    return true;
  });

  const totalPaid = MOCK_INVOICES.filter(i => i.status === 'paid').reduce((s, i) => s + i.totalAmount, 0);
  const totalPending = MOCK_INVOICES.filter(i => i.status === 'pending_approval' || i.status === 'approved').reduce((s, i) => s + i.totalAmount, 0);
  const totalOverdue = MOCK_INVOICES.filter(i => i.status === 'overdue').reduce((s, i) => s + i.totalAmount, 0);

  const columns: Column<Invoice>[] = [
    { key: 'invoiceNumber', header: 'Invoice', headerFa: 'شماره فاکتور', sortable: true, render: (row) => <span className="font-mono text-primary" dir="ltr">{row.invoiceNumber}</span> },
    { key: 'description', header: 'Description', headerFa: 'شرح', sortable: true },
    { key: 'totalAmount', header: 'Amount', headerFa: 'مبلغ', render: (row) => <span className="font-semibold font-mono" dir="ltr">{row.totalAmount.toLocaleString()} ریال</span> },
    { key: 'status', header: 'Status', headerFa: 'وضعیت', render: (row) => { const cfg = INVOICE_STATUS_CONFIG[row.status]; return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span>; } },
    { key: 'dueDate', header: 'Due Date', headerFa: 'سررسید', sortable: true },
  ];

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">امور مالی</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>فاکتور جدید</span></button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiWidget label="Paid" labelFa="پرداخت شده" value={`${(totalPaid / 1000000).toFixed(0)}M`} unit="تومان" icon={TrendingUp} color="bg-emerald-50 text-emerald-600" />
        <KpiWidget label="Pending" labelFa="در انتظار" value={`${(totalPending / 1000000).toFixed(0)}M`} unit="تومان" icon={CreditCard} color="bg-amber-50 text-amber-600" />
        <KpiWidget label="Overdue" labelFa="سررسید گذشته" value={`${(totalOverdue / 1000000).toFixed(0)}M`} unit="تومان" icon={AlertCircle} color="bg-red-50 text-red-600" />
        <KpiWidget label="Total" labelFa="تعداد فاکتورها" value={MOCK_INVOICES.length} icon={TrendingDown} color="bg-blue-50 text-blue-600" />
      </div>
      <div className="flex-1 bg-card rounded-xl border border-border">
        <DataTable columns={columns} data={filtered} keyExtractor={(row) => row.id} emptyMessage="فاکتوری یافت نشد" />
      </div>
    </div>
  );
}
