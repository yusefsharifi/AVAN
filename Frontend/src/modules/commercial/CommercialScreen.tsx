// src/modules/commercial/CommercialScreen.tsx
import { useState, Suspense, lazy } from 'react';
import {
  LayoutDashboard, FileText, ShoppingCart,
  Scroll, AlertCircle, Users, Briefcase,
} from 'lucide-react';

const CommercialDashboard = lazy(() => import('./features/dashboard/CommercialDashboard'));
const ProformaList        = lazy(() => import('./features/proforma/ProformaList'));
const OrderList           = lazy(() => import('./features/orders/OrderList'));
const ContractList        = lazy(() => import('./features/contracts/ContractList'));
const AgingDashboard      = lazy(() => import('./features/collection/AgingDashboard'));
const PartyList           = lazy(() => import('./features/crm-lite/PartyList'));

type TabId = 'dashboard' | 'proformas' | 'orders' | 'contracts' | 'collection' | 'parties';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard',  label: 'داشبورد',         icon: LayoutDashboard },
  { id: 'proformas',  label: 'پیش‌فاکتورها',    icon: FileText        },
  { id: 'orders',     label: 'سفارشات',          icon: ShoppingCart    },
  { id: 'contracts',  label: 'قراردادها',        icon: Scroll          },
  { id: 'collection', label: 'وصول مطالبات',    icon: AlertCircle     },
  { id: 'parties',    label: 'مشتریان / تأمین', icon: Users           },
];

function Loader() {
  return (
    <div className="flex items-center justify-center h-full pt-32">
      <span className="text-muted-foreground text-sm">در حال بارگذاری...</span>
    </div>
  );
}

function TabContent({ tab }: { tab: TabId }) {
  return (
    <Suspense fallback={<Loader />}>
      {tab === 'dashboard'  && <CommercialDashboard />}
      {tab === 'proformas'  && <ProformaList />}
      {tab === 'orders'     && <OrderList />}
      {tab === 'contracts'  && <ContractList />}
      {tab === 'collection' && <AgingDashboard />}
      {tab === 'parties'    && <PartyList />}
    </Suspense>
  );
}

export default function CommercialScreen() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');

  return (
    <div dir="rtl" className="flex h-full overflow-hidden">
      <aside className="w-52 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground flex flex-col gap-0.5 p-2 overflow-y-auto">
        <div className="px-3 py-2 mb-1">
          <span className="text-xs font-semibold text-sidebar-foreground/60">واحد بازرگانی</span>
        </div>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={[
              'flex min-h-12 items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors text-right',
              activeTab === id
                ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white font-medium'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white',
            ].join(' ')}
          >
            <Icon className="w-4 h-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </aside>
      <main className="flex-1 overflow-auto bg-secondary">
        <TabContent tab={activeTab} />
      </main>
    </div>
  );
}
