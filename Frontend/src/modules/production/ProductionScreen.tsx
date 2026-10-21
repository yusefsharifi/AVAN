import { Suspense, lazy } from 'react';
import { useProductionStore } from './store/useProductionStore';
import { useProductionStats } from './hooks';
import {
  LayoutDashboard, ShoppingCart, CalendarDays, ClipboardList, Cpu, ShieldCheck,
  Layers, BarChart3, Bell, Settings, Loader2,
} from 'lucide-react';

const ProductionDashboard = lazy(() => import('./features/dashboard/ProductionDashboard'));
const SalesOrderList = lazy(() => import('./features/orders/SalesOrderList'));
const ProductionPlanBoard = lazy(() => import('./features/planning/ProductionPlanBoard'));
const WorkOrderList = lazy(() => import('./features/work-orders/WorkOrderList'));
const MachineManagement = lazy(() => import('./features/machines/MachineManagement'));
const QualityControl = lazy(() => import('./features/quality/QualityControl'));
const BomManager = lazy(() => import('./features/bom/BomManager'));
const ProductionReports = lazy(() => import('./features/reports/ProductionReports'));

type View = 'dashboard' | 'orders' | 'planning' | 'work_orders' | 'machines' | 'quality' | 'bom' | 'reports';

const NAV_ITEMS: { id: View; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
  { id: 'orders', label: 'سفارشات فروش', icon: ShoppingCart },
  { id: 'planning', label: 'برنامه‌ریزی تولید', icon: CalendarDays },
  { id: 'work_orders', label: 'دستورات کار', icon: ClipboardList },
  { id: 'machines', label: 'ماشین‌آلات', icon: Cpu },
  { id: 'quality', label: 'کنترل کیفیت', icon: ShieldCheck },
  { id: 'bom', label: 'BOM', icon: Layers },
  { id: 'reports', label: 'گزارشات', icon: BarChart3 },
];

export function ProductionScreen() {
  const { activeTab, setActiveTab, productionLines, workOrders, getMRPRequirements } = useProductionStore();
  const stats = useProductionStats();

  const activeWOs = workOrders.filter((w) => w.status === 'in_progress').length;
  const linesRunning = productionLines.filter((l) => l.currentStatus === 'running').length;
  const activeWoIds = workOrders.filter((w) => w.status !== 'completed' && w.status !== 'cancelled').map((w) => w.id);
  const mrpShortages = getMRPRequirements(activeWoIds).filter((r) => r.suggestPR).length;

  return (
    <div className="h-full flex" dir="rtl">
      {/* Sidebar */}
      <aside className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-sidebar-border">
          <div className="text-right">
            <p className="text-[9px] text-accent uppercase tracking-widest font-medium">PRODUCTION MODULE</p>
            <p className="text-sm font-bold text-white mt-0.5">مدیریت تولید و برنامه‌ریزی</p>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex h-12 w-full items-center gap-3 justify-end rounded-lg px-3 text-sm transition-colors ${isActive ? 'border-r-2 border-sidebar-primary bg-sidebar-active text-white font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}>
                <span>{item.label}</span>
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.id === 'planning' && mrpShortages > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{mrpShortages}</span>}
                {item.id === 'work_orders' && activeWOs > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{activeWOs}</span>}
                {item.id === 'quality' && stats.openNCRs > 0 && <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">{stats.openNCRs}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="bg-sidebar-accent rounded-lg p-3 space-y-2">
            <p className="text-[10px] text-sidebar-foreground/70 text-right">وضعیت تولید جاری</p>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white" dir="ltr">{linesRunning}/{productionLines.length}</span>
              <span className="text-[10px] text-sidebar-foreground/70">خطوط فعال</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white" dir="ltr">{stats.overallOEE}٪</span>
              <span className="text-[10px] text-sidebar-foreground/70">OEE میانگین</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-1">
              <div className={`h-1 rounded-full ${stats.overallOEE >= 85 ? 'bg-emerald-400' : stats.overallOEE >= 70 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${stats.overallOEE}%` }} />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-primary">{NAV_ITEMS.find((n) => n.id === activeTab)?.label || 'داشبورد تولید'}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg hover:bg-secondary"><Bell className="w-4 h-4 text-muted-foreground" /></button>
            <button className="p-1.5 rounded-lg hover:bg-secondary"><Settings className="w-4 h-4 text-muted-foreground" /></button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-5">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>}>
            {activeTab === 'dashboard' && <ProductionDashboard />}
            {activeTab === 'orders' && <SalesOrderList />}
            {activeTab === 'planning' && <ProductionPlanBoard />}
            {activeTab === 'work_orders' && <WorkOrderList />}
            {activeTab === 'machines' && <MachineManagement />}
            {activeTab === 'quality' && <QualityControl />}
            {activeTab === 'bom' && <BomManager />}
            {activeTab === 'reports' && <ProductionReports />}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
