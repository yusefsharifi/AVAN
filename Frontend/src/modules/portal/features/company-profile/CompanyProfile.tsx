import { useState } from 'react';
import { usePortalStore } from '../../store';
import { COMPANY_STATUS_CONFIG } from '../../constants';
import { OverviewTab } from './tabs/OverviewTab';
import { ShipmentsTab } from './tabs/ShipmentsTab';
import { FinancialsTab } from './tabs/FinancialsTab';
import { PermitsTab } from './tabs/PermitsTab';
import { TimelineTab } from './tabs/TimelineTab';
import { ArrowRight, Building2, Settings, Download, MoreHorizontal } from 'lucide-react';

type Tab = 'overview' | 'shipments' | 'finance' | 'permits' | 'timeline';

interface CompanyProfileProps {
  onBack: () => void;
}

export function CompanyProfile({ onBack }: CompanyProfileProps) {
  const { activeCompanyId, companies, setActiveCompany } = usePortalStore();
  const company = companies.find(c => c.id === activeCompanyId);
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  if (!company) return null;

  const statusCfg = COMPANY_STATUS_CONFIG[company.status];

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'shipments', label: 'بارنامه‌ها', count: company.totalShipmentsYTD },
    { id: 'finance', label: 'مالی' },
    { id: 'permits', label: 'مجوزها', count: company.permits.length },
    { id: 'timeline', label: 'تایملاین' },
  ];

  return (
    <div className="h-full flex flex-col" dir="rtl">
      {/* Header */}
      <div className="border-b border-border px-5 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">{company.name}</h1>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
              </div>
              <p className="text-xs text-muted-foreground">{company.code} · واحد {company.unitNumber} · {company.type === 'manufacturing' ? 'تولیدی' : company.type === 'trading' ? 'بازرگانی' : 'خدماتی'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground"><Download className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground"><Settings className="w-4 h-4" /></button>
            <button className="p-2 rounded-lg border border-border hover:bg-secondary text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></button>
          </div>
        </div>
        {/* Quick Stats */}
        <div className="flex items-center gap-6 text-xs">
          <span className="text-muted-foreground">مساحت: <span className="text-foreground font-semibold" dir="ltr">{company.areaSqm.toLocaleString('fa-IR')} م²</span></span>
          <span className="text-muted-foreground">بارنامه YTD: <span className="text-foreground font-semibold" dir="ltr">{company.totalShipmentsYTD.toLocaleString('fa-IR')}</span></span>
          <span className="text-muted-foreground">میانگین پردازش: <span className="text-foreground font-semibold" dir="ltr">{company.avgProcessingTime} دقیقه</span></span>
          <span className="text-muted-foreground">امتیاز HSE: <span className={`font-semibold ${company.hseRating >= 80 ? 'text-emerald-600' : company.hseRating >= 60 ? 'text-amber-600' : 'text-red-600'}`} dir="ltr">{company.hseRating}</span></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-5 border-b border-border flex-shrink-0">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
            {tab.label}
            {tab.count !== undefined && <span className="mr-1.5 text-[10px] bg-secondary px-1.5 py-0.5 rounded-full">{tab.count.toLocaleString('fa-IR')}</span>}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {activeTab === 'overview' && <OverviewTab company={company} />}
        {activeTab === 'shipments' && <ShipmentsTab companyId={company.id} />}
        {activeTab === 'finance' && <FinancialsTab companyId={company.id} />}
        {activeTab === 'permits' && <PermitsTab permits={company.permits} />}
        {activeTab === 'timeline' && <TimelineTab companyId={company.id} companyName={company.name} />}
      </div>
    </div>
  );
}