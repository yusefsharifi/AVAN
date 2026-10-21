import { useState } from 'react';
import { DataTable, Column } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { useDebounceSearch } from '../../hooks';
import { CONTRACTOR_STATUS_CONFIG, GRADE_CONFIG } from '../../constants';
import type { Contractor } from '../../types';
import { Plus, Download, Shield, AlertTriangle } from 'lucide-react';

const MOCK_CONTRACTORS: Contractor[] = [
  { id: 'CTR-001', companyId: 'C-001', name: 'شرکت تأسیسات آریا', companyName: 'آریا تأسیسات', workType: 'تعمیرات تأسیسات', workers: [], maxWorkersAllowed: 10, certifications: [], insurancePolicy: { policyNumber: 'INS-001', provider: 'بیمه ایران', coverageAmount: 500000000, issueDate: '۱۴۰۳/۰۱/۰۱', expiryDate: '۱۴۰۳/۱۲/۲۹' }, hseScore: 85, incidents: [], dailyChecklists: [], kpi: { onTimeDeliveryRate: 92, safetyViolationCount: 1, qualityScore: 88, avgResponseTime: 4, lastEvaluationDate: '۱۴۰۳/۰۳/۱۵', overallGrade: 'A' }, rfidCards: [], gateAccessEnabled: true, status: 'active', createdAt: '۱۴۰۳/۰۱/۰۱' },
  { id: 'CTR-002', companyId: 'C-002', name: 'برق‌کاران صنعتی البرز', companyName: 'البرز الکتریک', workType: 'برق صنعتی', workers: [], maxWorkersAllowed: 8, certifications: [], insurancePolicy: { policyNumber: 'INS-002', provider: 'بیمه آسیا', coverageAmount: 300000000, issueDate: '۱۴۰۳/۰۲/۰۱', expiryDate: '۱۴۰۳/۰۴/۳۰' }, hseScore: 72, incidents: [], dailyChecklists: [], kpi: { onTimeDeliveryRate: 85, safetyViolationCount: 3, qualityScore: 78, avgResponseTime: 6, lastEvaluationDate: '۱۴۰۳/۰۲/۲۰', overallGrade: 'B' }, rfidCards: [], gateAccessEnabled: true, status: 'active', createdAt: '۱۴۰۳/۰۲/۰۱' },
  { id: 'CTR-003', companyId: 'C-003', name: 'ایمن‌سازان پارس', companyName: 'ایمن پارس', workType: 'ایمنی و آتش‌نشانی', workers: [], maxWorkersAllowed: 5, certifications: [], insurancePolicy: { policyNumber: 'INS-003', provider: 'بیمه پاسارگاد', coverageAmount: 400000000, issueDate: '۱۴۰۳/۰۱/۱۵', expiryDate: '۱۴۰۳/۰۷/۱۵' }, hseScore: 95, incidents: [], dailyChecklists: [], kpi: { onTimeDeliveryRate: 98, safetyViolationCount: 0, qualityScore: 95, avgResponseTime: 2, lastEvaluationDate: '۱۴۰۳/۰۴/۰۱', overallGrade: 'A' }, rfidCards: [], gateAccessEnabled: true, status: 'active', createdAt: '۱۴۰۳/۰۱/۱۵' },
  { id: 'CTR-004', companyId: 'C-001', name: 'نظافت صنعتی پاک', companyName: 'پاک صنعت', workType: 'نظافت و نگهداری', workers: [], maxWorkersAllowed: 6, certifications: [], insurancePolicy: { policyNumber: 'INS-004', provider: 'بیمه ایران', coverageAmount: 200000000, issueDate: '۱۴۰۲/۱۰/۰۱', expiryDate: '۱۴۰۳/۰۳/۰۱' }, hseScore: 65, incidents: [], dailyChecklists: [], kpi: { onTimeDeliveryRate: 78, safetyViolationCount: 5, qualityScore: 70, avgResponseTime: 8, lastEvaluationDate: '۱۴۰۳/۰۳/۰۱', overallGrade: 'C' }, rfidCards: [], gateAccessEnabled: true, status: 'active', createdAt: '۱۴۰۲/۱۰/۰۱' },
];

export function ContractorsView() {
  const { debouncedQuery, search } = useDebounceSearch();
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = MOCK_CONTRACTORS.filter(c => {
    if (debouncedQuery && !c.name.includes(debouncedQuery) && !c.companyName.includes(debouncedQuery)) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Contractor>[] = [
    { key: 'name', header: 'Name', headerFa: 'نام پیمانکار', sortable: true },
    { key: 'workType', header: 'Work Type', headerFa: 'نوع فعالیت', sortable: true },
    { key: 'hseScore', header: 'HSE', headerFa: 'امتیاز HSE', render: (row) => <span className={`font-semibold ${row.hseScore >= 80 ? 'text-emerald-600' : row.hseScore >= 60 ? 'text-amber-600' : 'text-red-600'}`} dir="ltr">{row.hseScore}</span> },
    { key: 'kpi', header: 'Grade', headerFa: 'رتبه', render: (row) => { const cfg = GRADE_CONFIG[row.kpi.overallGrade]; return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa} ({row.kpi.overallGrade})</span>; } },
    { key: 'status', header: 'Status', headerFa: 'وضعیت', render: (row) => { const cfg = CONTRACTOR_STATUS_CONFIG[row.status]; return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span>; } },
  ];

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">پیمانکاران</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>پیمانکار جدید</span></button>
        </div>
      </div>
      <FilterBar
        filters={[{ key: 'status', label: 'وضعیت', type: 'select', options: Object.entries(CONTRACTOR_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.fa })) }]}
        values={{ search: debouncedQuery, status: statusFilter }}
        onChange={(key, val) => { if (key === 'search') search(val); else setStatusFilter(val); }}
        onClear={() => { search(''); setStatusFilter(''); }}
      />
      <div className="flex-1 bg-card rounded-xl border border-border">
        <DataTable columns={columns} data={filtered} keyExtractor={(row) => row.id} emptyMessage="پیمانکاری یافت نشد" />
      </div>
    </div>
  );
}
