import { Suspense, lazy } from 'react';
import { useProcurementStore } from './store/useProcurementStore';
import {
  LayoutDashboard, Building2, ClipboardList, MessageSquare, ShoppingCart,
  PackageCheck, FileSignature, BarChart3, Bell, Settings, Loader2,
} from 'lucide-react';

const ProcurementDashboard = lazy(() => import('./features/dashboard/ProcurementDashboard'));
const VendorMaster = lazy(() => import('./features/vendors/VendorMaster'));
const PurchaseRequestList = lazy(() => import('./features/purchase-requests/PurchaseRequestList'));
const RFQManagement = lazy(() => import('./features/rfq/RFQManagement'));
const PurchaseOrderList = lazy(() => import('./features/purchase-orders/PurchaseOrderList'));
const POReceiving = lazy(() => import('./features/receiving/POReceiving'));
const VendorContracts = lazy(() => import('./features/contracts/VendorContracts'));
const ProcurementReports = lazy(() => import('./features/reports/ProcurementReports'));

type View = 'dashboard' | 'vendors' | 'purchase_requests' | 'rfq' | 'purchase_orders' | 'receiving' | 'contracts' | 'reports';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'vendors', label: 'تأمین‌کنندگان', icon: Building2 },
  { id: 'purchase_requests', label: 'درخواست‌های خرید', icon: ClipboardList },
  { id: 'rfq', label: 'استعلام قیمت (RFQ)', icon: MessageSquare },
  { id: 'purchase_orders', label: 'سفارشات خرید (PO)', icon: ShoppingCart },
  { id: 'receiving', label: 'دریافت کالا', icon: PackageCheck },
  { id: 'contracts', label: 'قراردادها', icon: FileSignature },
  { id: 'reports', label: 'گزارشات', icon: BarChart3 },
];

export function ProcurementScreen() {
  const { activeTab, setActiveTab, purchaseRequests, rfqs, purchaseOrders, getExpiringContracts, getProcurementStats } = useProcurementStore();
  const stats = getProcurementStats();

  const pendingPRs = purchaseRequests.filter((p) => p.status === 'pending_approval').length;
  const openRFQs = rfqs.filter((r) => r.status === 'sent').length;
  const receivingCount = purchaseOrders.filter((po) => ['sent', 'partially_received'].includes(po.status)).length;
  const expiringContracts = getExpiringContracts(60).length;

  return (
    <div className="h-full flex" dir="rtl">
      <aside className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="text-right">
            <p className="text-[9px] text-accent uppercase tracking-widest font-medium">PROCUREMENT MODULE</p>
            <p className="text-sm font-bold text-white mt-0.5">مدیریت خرید و تأمین‌کنندگان</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badge = item.id === 'purchase_requests' ? pendingPRs : item.id === 'rfq' ? openRFQs : item.id === 'receiving' ? receivingCount : item.id === 'contracts' ? expiringContracts : 0;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex h-12 w-full items-center gap-3 justify-end rounded-lg px-3 text-sm transition-colors ${isActive ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}>
                <span>{item.label}</span>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {badge > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{badge}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="bg-sidebar-accent rounded-lg p-3 space-y-1">
            <p className="text-[10px] text-sidebar-foreground/70 text-right">مانده پرداختنی</p>
            <p className="text-sm font-bold text-white text-right" dir="ltr">{stats.totalPayablesOutstanding.toLocaleString('fa-IR')} ریال</p>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">{NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'داشبورد خرید'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg hover:bg-secondary"><Bell className="w-4 h-4 text-muted-foreground" /></button>
            <button className="p-1.5 rounded-lg hover:bg-secondary"><Settings className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            {activeTab === 'dashboard' && <ProcurementDashboard />}
            {activeTab === 'vendors' && <VendorMaster />}
            {activeTab === 'purchase_requests' && <PurchaseRequestList />}
            {activeTab === 'rfq' && <RFQManagement />}
            {activeTab === 'purchase_orders' && <PurchaseOrderList />}
            {activeTab === 'receiving' && <POReceiving />}
            {activeTab === 'contracts' && <VendorContracts />}
            {activeTab === 'reports' && <ProcurementReports />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
