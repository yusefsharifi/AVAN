import { Suspense, lazy } from 'react';
import { useInventoryStore } from './store';
import { useInventoryStats } from './hooks';
import InventorySidebar from './components/InventorySidebar';
import { useFinanceStore } from '@/modules/finance/store';
import {
  Warehouse, Package, Truck, TruckIcon, ClipboardCheck, BarChart3,
  LayoutDashboard, Bell, Settings, Loader2, Landmark,
  Send, ArrowLeftRight, Boxes,
} from 'lucide-react';

const WarehouseList = lazy(() => import('./features/warehouse-setup/WarehouseList'));
const ItemCatalog = lazy(() => import('./features/item-master/ItemCatalog'));
const GRNList = lazy(() => import('./features/inbound/GRNList'));
const RequisitionList = lazy(() => import('./features/outbound/RequisitionList'));
const DispatchFulfillment = lazy(() => import('./features/dispatch/DispatchFulfillment'));
const TransferOrders = lazy(() => import('./features/transfers/TransferOrders'));
const LotTracking = lazy(() => import('./features/lots/LotTracking'));
const CountSchedule = lazy(() => import('./features/cycle-count/CountSchedule'));
const StockStatusReport = lazy(() => import('./features/reports/StockStatusReport'));

type View = 'dashboard' | 'warehouse_setup' | 'item_master' | 'inbound' | 'outbound' | 'dispatch' | 'transfers' | 'lots' | 'cycle_count' | 'reports';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'warehouse_setup', label: ' تنظیم انبار', icon: Warehouse },
  { id: 'item_master', label: 'کالا و اقلام', icon: Package },
  { id: 'inbound', label: 'ورود کالا (GRN)', icon: Truck },
  { id: 'outbound', label: 'درخواست مواد (MR)', icon: TruckIcon },
  { id: 'dispatch', label: 'حواله خروج (DO)', icon: Send },
  { id: 'transfers', label: 'انتقال بین‌انباری', icon: ArrowLeftRight },
  { id: 'lots', label: 'بچ / سریال', icon: Boxes },
  { id: 'cycle_count', label: 'انبارگردانی', icon: ClipboardCheck },
  { id: 'reports', label: 'گزارشات', icon: BarChart3 },
];

export function InventoryScreen() {
  const { activeTab, setActiveTab } = useInventoryStore();
  const stats = useInventoryStats();

  return (
    <div className="h-full flex" dir="rtl">
      <InventorySidebar
        activeTab={activeTab as View}
        onChange={setActiveTab}
        badges={{
          pendingGRN: stats.pendingGRN,
          pendingMR: stats.pendingApprovalMR,
          variance: stats.varianceAlerts,
        }}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">{NAV_ITEMS.find(n => n.id === activeTab)?.label || 'داشبورد انبار'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg hover:bg-secondary"><Bell className="w-4 h-4 text-muted-foreground" /></button>
            <button className="p-1.5 rounded-lg hover:bg-secondary"><Settings className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            {activeTab === 'dashboard' && <DashboardView stats={stats} />}
            {activeTab === 'warehouse_setup' && <WarehouseList />}
            {activeTab === 'item_master' && <ItemCatalog />}
            {activeTab === 'inbound' && <GRNList />}
            {activeTab === 'outbound' && <RequisitionList />}
            {activeTab === 'dispatch' && <DispatchFulfillment />}
            {activeTab === 'transfers' && <TransferOrders />}
            {activeTab === 'lots' && <LotTracking />}
            {activeTab === 'cycle_count' && <CountSchedule />}
            {activeTab === 'reports' && <StockStatusReport />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ── Dashboard View ───────────────────────────────────────────────────────────

function DashboardView({ stats }: { stats: ReturnType<typeof useInventoryStats> }) {
  const { accounts, vouchers } = useFinanceStore();
  const inventoryAccount = accounts.find(a => a.code === '1104');
  const cogsAccount = accounts.find(a => a.code === '5003');
  const pendingInventoryVouchers = vouchers.filter(v => v.referenceType === 'inventory' && v.status === 'draft').length;

  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">داشبورد مدیریت انبار</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'تعداد کل اقلام', value: stats.totalItems, color: 'bg-blue-50 border-blue-200' },
          { label: 'ارزش کل موجودی', value: new Intl.NumberFormat('fa-IR').format(stats.totalValue) + ' ریال', color: 'bg-emerald-50 border-emerald-200' },
          { label: 'اقلام کم‌موجودی', value: stats.lowStockCount, color: 'bg-red-50 border-red-200' },
          { label: 'هشدار انحراف', value: stats.varianceAlerts, color: 'bg-amber-50 border-amber-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-foreground" dir="ltr">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Finance cross-module widget */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-accent shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{(inventoryAccount?.currentBalance ?? 0).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">مانده حساب موجودی کالا (۱۱۰۴ — از مالی)</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-amber-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{(cogsAccount?.currentBalance ?? 0).toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">بهای تمام‌شده کالای فروش‌رفته (۵۰۰۳ — از مالی)</p>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 flex items-center gap-3">
          <Landmark className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-lg font-bold text-foreground" dir="ltr">{pendingInventoryVouchers}</p>
            <p className="text-[11px] text-muted-foreground">سند حسابداری انبار در انتظار تأیید (از مالی)</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground text-right mb-3">ورود کالا</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">GRN در انتظار بازرسی</span><span className="font-semibold text-foreground" dir="ltr">{stats.pendingGRN}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">پذیرش شده امروز</span><span className="font-semibold text-emerald-600" dir="ltr">{stats.acceptedTodayGRN}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">ارزش دریافتی امروز</span><span className="font-semibold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(stats.valueReceivedToday)}</span></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground text-right mb-3">خروج کالا</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">درخواست در انتظار تأیید</span><span className="font-semibold text-foreground" dir="ltr">{stats.pendingApprovalMR}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">در حال آماده‌سازی</span><span className="font-semibold text-amber-600" dir="ltr">{stats.inPickingMR}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">تحویل شده امروز</span><span className="font-semibold text-emerald-600" dir="ltr">{stats.issuedTodayMR}</span></div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="text-sm font-bold text-foreground text-right mb-3">انبارگردانی</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">زمان‌بندی شده</span><span className="font-semibold text-blue-600" dir="ltr">{stats.countScheduled}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">در حال اجرا</span><span className="font-semibold text-amber-600" dir="ltr">{stats.countInProgress}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">تکمیل شده</span><span className="font-semibold text-emerald-600" dir="ltr">{stats.countCompleted}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InventoryScreen;
