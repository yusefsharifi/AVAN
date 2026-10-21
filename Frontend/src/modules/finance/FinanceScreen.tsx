import { useState, lazy, Suspense } from 'react';
import { useFinanceStore } from './store';
import { useJournalEntry, useTrialBalance, useAgingReport, useFinancialRatios, useBudgetVariance, useDepreciationSchedule, useBankReconciliation, useApprovalWorkflow } from './hooks';
import { AccountTree, VoucherForm, AgingReport, FinancialStatement, BudgetVsActual, CashFlowForecast, ReportsHub } from './components';
import PlaceholderView from './components/PlaceholderView';
import { formatAmount } from './utils';
import { ACCOUNT_CATEGORY_CONFIG, VOUCHER_STATUS_CONFIG, COST_CENTER_TYPE_CONFIG, PROJECT_STATUS_CONFIG, PROJECT_TYPE_CONFIG } from './constants';
import type { CostCenter, Project, IntercompanyTransaction } from './types';
import {
  LayoutDashboard, BookOpen, Receipt, CreditCard, Wallet, Building2, FileText, Calculator,
  Bell, Plus, Download, Settings, Layers, Target, GitBranch,
  CheckCircle, AlertCircle, Clock, BarChart3, RefreshCw, ChevronDown, ChevronLeft,
  Home, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';

// ── Lazy loaded screens ───────────────────────────────────────────────────────
const PurchaseSalesScreen = lazy(() => import('./features/purchase-sales/PurchaseSalesScreen'));
const ReceiptsPaymentsScreen = lazy(() => import('./features/receipts-payments/ReceiptsPaymentsScreen'));

// ── Types ─────────────────────────────────────────────────────────────────────
type View =
  | 'dashboard' | 'coa' | 'journal'
  | 'ar' | 'ap' | 'treasury' | 'fixed_assets' | 'depreciation'
  | 'tax' | 'reports' | 'approvals'
  | 'cost_centers' | 'projects' | 'consolidation'
  | 'purchase_sales' | 'receipts_payments'
  | 'bank_reconciliation';

// ── Sidebar structure ─────────────────────────────────────────────────────────
const SIDEBAR_GROUPS: {
  label: string;
  items: { id: View; label: string; icon: React.ElementType }[];
}[] = [
  {
    label: 'حسابداری عمومی',
    items: [
      { id: 'dashboard', label: 'داشبورد مالی', icon: LayoutDashboard },
      { id: 'coa', label: 'دفتر کل', icon: BookOpen },
      { id: 'journal', label: 'اسناد حسابداری', icon: Receipt },
      { id: 'reports', label: 'گزارشات', icon: BarChart3 },
      { id: 'approvals', label: 'صف تأیید', icon: CheckCircle },
    ],
  },
  {
    label: 'دریافت و پرداخت',
    items: [
      { id: 'receipts_payments', label: 'اسناد دریافت و پرداخت', icon: CreditCard },
      { id: 'bank_reconciliation', label: 'تطبیق حساب بانکی', icon: Building2 },
    ],
  },
  {
    label: 'خرید و فروش',
    items: [
      { id: 'purchase_sales', label: 'فاکتور خرید و فروش', icon: FileText },
    ],
  },
  {
    label: 'بدهکاران و بستانکاران',
    items: [
      { id: 'ar', label: 'بدهکاران (AR)', icon: CreditCard },
      { id: 'ap', label: 'بستانکاران (AP)', icon: Wallet },
    ],
  },
  {
    label: 'اموال و دارایی‌ها',
    items: [
      { id: 'fixed_assets', label: 'ثبت اموال', icon: FileText },
      { id: 'depreciation', label: 'محاسبه استهلاک', icon: RefreshCw },
    ],
  },
  {
    label: 'بودجه و پروژه',
    items: [
      { id: 'cost_centers', label: 'مراکز هزینه', icon: Layers },
      { id: 'projects', label: 'پروژه‌ها', icon: Target },
    ],
  },
  {
    label: 'مالیات و ادغام',
    items: [
      { id: 'tax', label: 'مدیریت مالیات', icon: Calculator },
      { id: 'consolidation', label: 'ادغام مالی', icon: GitBranch },
    ],
  },
];

// ── Sidebar ───────────────────────────────────────────────────────────────────
function FinanceSidebar({
  activeTab,
  onSelect,
  pendingCount,
}: {
  activeTab: View;
  onSelect: (v: View) => void;
  pendingCount: number;
}) {
  const [openGroups, setOpenGroups] = useState<string[]>(['حسابداری عمومی', 'دریافت و پرداخت', 'خرید و فروش']);

  const toggleGroup = (label: string) =>
    setOpenGroups(prev => prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]);

  return (
    <aside className="w-56 bg-sidebar text-sidebar-foreground text-xs flex flex-col shrink-0 overflow-y-auto print:hidden" dir="rtl">
      <div className="p-3 border-b border-sidebar-border">
        <p className="text-sidebar-primary font-bold text-sm">ماژول مالی</p>
        <p className="text-sidebar-foreground/75 text-[10px] mt-0.5">سیستم حسابداری یکپارچه</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {SIDEBAR_GROUPS.map(group => {
          const isOpen = openGroups.includes(group.label);
          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className="flex min-h-12 w-full items-center justify-between rounded px-2 py-2 text-sidebar-foreground/80 hover:bg-sidebar-accent transition-colors"
              >
                <span className="font-semibold text-[10px] uppercase tracking-wider text-sidebar-foreground/75">{group.label}</span>
                {isOpen ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
              </button>

              {isOpen && (
                <div className="mr-2 border-r border-sidebar-border mt-0.5 space-y-0.5">
                  {group.items.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={`flex min-h-9 w-full items-center gap-2 border-r-2 px-3 py-2 text-right transition-colors ${
                          isActive
                            ? 'border-sidebar-primary bg-sidebar-active text-white font-semibold'
                            : 'border-transparent text-sidebar-foreground/70 hover:border-sidebar-primary hover:bg-sidebar-accent hover:text-white'
                        }`}
                      >
                        <Icon size={13} className="shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.id === 'approvals' && pendingCount > 0 && (
                          <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

// ── Main FinanceScreen ────────────────────────────────────────────────────────
export function FinanceScreen() {
  const { accounts, vouchers, getFinancialStats, getAccountTree } = useFinanceStore();
  const [activeTab, setActiveTab] = useState<View>('dashboard');
  const { ratios } = useFinancialRatios();
  const { data: trialBalanceData, totals: trialBalanceTotals } = useTrialBalance();
  const { data: budgetData, summary: budgetSummary } = useBudgetVariance();
  const { entries: depreciationEntries, totalMonthlyDepreciation } = useDepreciationSchedule();
  const { pendingCount } = useApprovalWorkflow();
  const stats = getFinancialStats();

  const allLabels: Record<View, string> = {
    dashboard: 'داشبورد مالی',
    coa: 'دفتر کل',
    journal: 'اسناد حسابداری',
    purchase_sales: 'خرید و فروش',
    receipts_payments: 'دریافت و پرداخت',
    cost_centers: 'مراکز هزینه',
    projects: 'پروژه‌ها',
    ar: 'بدهکاران',
    ap: 'بستانکاران',
    treasury: 'خزانه',
    fixed_assets: 'ثبت اموال',
    depreciation: 'محاسبه استهلاک',
    tax: 'مدیریت مالیات',
    consolidation: 'ادغام مالی',
    reports: 'گزارشات مالی',
    approvals: 'صف تأیید',
    bank_reconciliation: 'تطبیق حساب بانکی',
  };

  const Loader = () => (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
      در حال بارگذاری...
    </div>
  );

  return (
    <div className="h-full flex" dir="rtl">
      <FinanceSidebar activeTab={activeTab} onSelect={setActiveTab} pendingCount={pendingCount} />

      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border px-5 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Home className="w-3.5 h-3.5" />
            <ChevronRight className="w-3 h-3" />
            <span>مالی</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-bold text-primary">{allLabels[activeTab]}</span>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-1.5 rounded-lg hover:bg-secondary">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {pendingCount > 0 && (
                <span className="absolute -top-0.5 -left-0.5 bg-red-500 text-white text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
            <button className="p-1.5 rounded-lg hover:bg-secondary">
              <Settings className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              ratios={ratios}
              trialBalanceTotals={trialBalanceTotals}
              budgetSummary={budgetSummary}
              depreciationEntries={depreciationEntries}
              totalMonthlyDepreciation={totalMonthlyDepreciation}
            />
          )}
          {activeTab === 'coa' && <CoAView accounts={accounts} />}
          {activeTab === 'journal' && <JournalView />}
          {activeTab === 'purchase_sales' && (
            <Suspense fallback={<Loader />}><PurchaseSalesScreen /></Suspense>
          )}
          {activeTab === 'receipts_payments' && (
            <Suspense fallback={<Loader />}><ReceiptsPaymentsScreen /></Suspense>
          )}
          {activeTab === 'cost_centers' && <CostCentersView />}
          {activeTab === 'projects' && <ProjectsView />}
          {activeTab === 'ar' && <ARView />}
          {activeTab === 'ap' && <APView />}
          {activeTab === 'treasury' && <TreasuryView />}
          {activeTab === 'fixed_assets' && <FixedAssetsViewWrapper />}
          {activeTab === 'depreciation' && <DepreciationViewWrapper />}
          {activeTab === 'tax' && <TaxView />}
          {activeTab === 'consolidation' && <ConsolidationView />}
          {activeTab === 'reports' && <ReportsHub />}
          {activeTab === 'approvals' && <ApprovalsView />}
          {activeTab === 'bank_reconciliation' && <BankReconciliationView />}
        </div>
      </div>
    </div>
  );
}

// ── Dashboard View ─────────────────────────────────────────────────────────────
function DashboardView({ stats, ratios, trialBalanceTotals, budgetSummary, depreciationEntries, totalMonthlyDepreciation }: any) {
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">داشبورد مالی</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'دارایی‌ها', value: formatAmount(stats.totalAssets), color: 'bg-emerald-50 border-emerald-200' },
          { label: 'بدهی‌ها', value: formatAmount(stats.totalLiabilities), color: 'bg-red-50 border-red-200' },
          { label: 'درآمدها', value: formatAmount(stats.totalRevenue), color: 'bg-blue-50 border-blue-200' },
          { label: 'سود خالص', value: formatAmount(stats.netIncome), color: 'bg-amber-50 border-amber-200' },
        ].map(kpi => (
          <div key={kpi.label} className={`rounded-xl border p-4 ${kpi.color}`}>
            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
            <p className="text-lg font-bold text-foreground" dir="ltr">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <FinancialStatement type="trial_balance" />
        <BudgetVsActual />
      </div>
    </div>
  );
}

// ── CoA View ───────────────────────────────────────────────────────────────────
function CoAView({ accounts }: { accounts: any[] }) {
  const { selectedAccountId, selectAccount } = useFinanceStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const tree = accounts.filter(a => a.level === 1);
  const selected = accounts.find((a: any) => a.id === selectedAccountId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">دفتر کل — نمودار حساب‌ها</h1>
        <button
          onClick={() => setShowAddForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /><span>حساب جدید</span>
        </button>
      </div>

      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold text-foreground mb-3">افزودن حساب جدید</p>
          <div className="grid grid-cols-2 gap-3">
            {[['کد حساب', 'مثال: 1105'], ['نام حساب (فارسی)', ''], ['نام حساب (انگلیسی)', '']].map(([label, ph]) => (
              <div key={label}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input placeholder={ph} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع حساب</label>
              <select className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary">
                <option>دارایی</option><option>بدهی</option><option>حقوق صاحبان</option>
                <option>درآمد</option><option>هزینه</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { toast.success('حساب جدید افزوده شد'); setShowAddForm(false); }} className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold">ذخیره</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <AccountTree accounts={tree} onSelect={selectAccount} selectedId={selectedAccountId} />
        </div>
        <div className="bg-card rounded-xl border border-border p-5">
          {selected ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-foreground text-right">{selected.nameFa}</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">کد</span><span className="font-mono" dir="ltr">{selected.code}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">نوع</span><span className={ACCOUNT_CATEGORY_CONFIG[selected.category]?.color}>{ACCOUNT_CATEGORY_CONFIG[selected.category]?.fa}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">مانده</span><span className="font-mono font-semibold" dir="ltr">{formatAmount(selected.currentBalance)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">مانده اول دوره</span><span className="font-mono" dir="ltr">{formatAmount(selected.openingBalance)}</span></div>
              </div>
              <div className="pt-3 border-t border-border flex gap-2">
                <button className="flex-1 py-1.5 text-xs border border-border rounded-lg text-muted-foreground hover:bg-secondary">ویرایش</button>
                <button className="flex-1 py-1.5 text-xs bg-accent text-white rounded-lg">کارتکس</button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">یک حساب را از درخت انتخاب کنید</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Journal View ───────────────────────────────────────────────────────────────
function JournalView() {
  const { vouchers, postVoucher, reverseVoucher } = useFinanceStore();
  const [showForm, setShowForm] = useState(true);
  const [selectedVoucherId, setSelectedVoucherId] = useState<string | null>(null);
  const [reverseReason, setReverseReason] = useState('');
  const [showReverseModal, setShowReverseModal] = useState(false);

  const selectedVoucher = vouchers.find(v => v.id === selectedVoucherId);

  const handlePost = (id: string) => {
    try {
      postVoucher(id);
      toast.success('سند با موفقیت ثبت شد');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleReverse = () => {
    if (!selectedVoucherId || !reverseReason.trim()) return;
    try {
      reverseVoucher(selectedVoucherId, reverseReason);
      toast.success('سند واگردانی شد');
      setShowReverseModal(false);
      setReverseReason('');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">اسناد حسابداری</h1>
        <button
          onClick={() => setShowForm(f => !f)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold"
        >
          <Plus className="w-3.5 h-3.5" /><span>{showForm ? 'بستن فرم' : 'سند جدید'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Voucher list */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">لیست اسناد ({vouchers.length})</h3>
          </div>
          <div className="divide-y divide-border max-h-[500px] overflow-auto">
            {vouchers.map(v => (
              <div
                key={v.id}
                onClick={() => setSelectedVoucherId(prev => prev === v.id ? null : v.id)}
                className={`p-4 hover:bg-secondary/30 transition-colors cursor-pointer ${selectedVoucherId === v.id ? 'bg-accent/5 border-r-2 border-accent' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-foreground" dir="ltr">{v.voucherNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${VOUCHER_STATUS_CONFIG[v.status]?.color} ${VOUCHER_STATUS_CONFIG[v.status]?.bg}`}>
                    {VOUCHER_STATUS_CONFIG[v.status]?.fa}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{v.description}</p>
                <div className="flex items-center gap-4 mt-1">
                  <span className="text-[10px] text-muted-foreground" dir="ltr">{v.date?.slice(0, 10)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    بدهکار: <span className="font-mono" dir="ltr">{formatAmount(v.totalDebit)}</span>
                  </span>
                </div>

                {/* Action buttons when selected */}
                {selectedVoucherId === v.id && (
                  <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    {v.status === 'draft' && (
                      <button
                        onClick={() => handlePost(v.id)}
                        className="flex-1 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-500"
                      >
                        <CheckCircle className="w-3 h-3 inline ml-1" />ثبت نهایی
                      </button>
                    )}
                    {v.status === 'posted' && (
                      <button
                        onClick={() => setShowReverseModal(true)}
                        className="flex-1 py-1.5 rounded-lg bg-red-100 text-red-700 text-[11px] font-semibold hover:bg-red-200"
                      >
                        <AlertCircle className="w-3 h-3 inline ml-1" />واگردانی
                      </button>
                    )}
                    {/* Details */}
                    {v.entries.length > 0 && (
                      <div className="w-full mt-2">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-right py-1 text-muted-foreground">کد حساب</th>
                              <th className="text-right py-1 text-muted-foreground">بدهکار</th>
                              <th className="text-right py-1 text-muted-foreground">بستانکار</th>
                            </tr>
                          </thead>
                          <tbody>
                            {v.entries.map(e => (
                              <tr key={e.id} className="border-b border-border/30">
                                <td className="py-1 font-mono" dir="ltr">{e.accountCode}</td>
                                <td className="py-1 text-emerald-700" dir="ltr">{e.debit ? formatAmount(e.debit) : '—'}</td>
                                <td className="py-1 text-red-700" dir="ltr">{e.credit ? formatAmount(e.credit) : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* VoucherForm */}
        {showForm && (
          <div className="bg-card rounded-xl border border-border p-5">
            <h3 className="text-sm font-bold text-foreground text-right mb-4">ثبت سند جدید</h3>
            <VoucherForm onSuccess={() => {}} />
          </div>
        )}
      </div>

      {/* Reverse Modal */}
      {showReverseModal && selectedVoucher && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-md space-y-4" dir="rtl">
            <h2 className="font-bold text-foreground">واگردانی سند {selectedVoucher.voucherNumber}</h2>
            <p className="text-xs text-muted-foreground">این عمل یک سند معکوس ایجاد می‌کند. دلیل واگردانی را وارد کنید:</p>
            <input
              dir="rtl"
              value={reverseReason}
              onChange={e => setReverseReason(e.target.value)}
              placeholder="دلیل واگردانی..."
              className="w-full border border-border rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-red-400"
            />
            <div className="flex gap-2">
              <button onClick={handleReverse} disabled={!reverseReason.trim()} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold disabled:opacity-40">واگردانی</button>
              <button onClick={() => setShowReverseModal(false)} className="flex-1 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── AR View ────────────────────────────────────────────────────────────────────
function ARView() {
  const [showAddForm, setShowAddForm] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">بدهکاران — حساب‌های دریافتنی</h1>
        <button onClick={() => setShowAddForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /><span>ثبت طلب جدید</span>
        </button>
      </div>
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">فرم ثبت طلب جدید</p>
          <div className="grid grid-cols-3 gap-3">
            {[['طرف حساب', ''], ['شماره فاکتور', ''], ['تاریخ', '۱۴۰۳/۰۴/۰۱'], ['مبلغ (ریال)', '0'], ['سررسید', '۱۴۰۳/۰۵/۰۱'], ['توضیحات', '']].map(([label, ph]) => (
              <div key={label}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input placeholder={ph} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { toast.success('طلب جدید ثبت شد'); setShowAddForm(false); }} className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold">ذخیره</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
          </div>
        </div>
      )}
      <AgingReport />
    </div>
  );
}

// ── AP View ────────────────────────────────────────────────────────────────────
function APView() {
  const [showAddForm, setShowAddForm] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">بستانکاران — حساب‌های پرداختنی</h1>
        <button onClick={() => setShowAddForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /><span>ثبت بدهی جدید</span>
        </button>
      </div>
      {showAddForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">فرم ثبت بدهی جدید</p>
          <div className="grid grid-cols-3 gap-3">
            {[['تأمین‌کننده', ''], ['شماره فاکتور خرید', ''], ['تاریخ', '۱۴۰۳/۰۴/۰۱'], ['مبلغ (ریال)', '0'], ['سررسید پرداخت', '۱۴۰۳/۰۵/۰۱'], ['توضیحات', '']].map(([label, ph]) => (
              <div key={label}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input placeholder={ph} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { toast.success('بدهی جدید ثبت شد'); setShowAddForm(false); }} className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold">ذخیره</button>
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
          </div>
        </div>
      )}
      <div className="bg-card rounded-xl border border-border p-5">
        <p className="text-sm text-muted-foreground text-center py-4">گزارش سنی بستانکاران</p>
        <AgingReport />
      </div>
    </div>
  );
}

// ── Treasury View ──────────────────────────────────────────────────────────────
function TreasuryView() {
  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-foreground">خزانه و مدیریت وجوه</h1>
      <CashFlowForecast />
    </div>
  );
}

// ── Fixed Assets (wrapper to route to full page) ───────────────────────────────
const AssetRegisterPage = lazy(() => import('./pages/AssetRegister'));
function FixedAssetsViewWrapper() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>}>
      <AssetRegisterPage />
    </Suspense>
  );
}

// ── Depreciation (wrapper) ─────────────────────────────────────────────────────
const DepreciationPage = lazy(() => import('./pages/DepreciationRun'));
function DepreciationViewWrapper() {
  return (
    <Suspense fallback={<div className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>}>
      <DepreciationPage />
    </Suspense>
  );
}

// ── Tax View ───────────────────────────────────────────────────────────────────
function TaxView() {
  const [vatRate, setVatRate] = useState(9);
  const [whtRate, setWhtRate] = useState(3);
  return (
    <div className="space-y-5">
      <h1 className="text-lg font-bold text-foreground">مدیریت مالیات</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{vatRate}٪</p>
          <p className="text-xs text-muted-foreground mt-1">نرخ ارزش افزوده</p>
          <div className="flex gap-1 mt-2 justify-center">
            <button onClick={() => setVatRate(r => Math.max(0, r - 1))} className="px-2 py-0.5 border rounded text-xs">-</button>
            <button onClick={() => setVatRate(r => Math.min(25, r + 1))} className="px-2 py-0.5 border rounded text-xs">+</button>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{whtRate}٪</p>
          <p className="text-xs text-muted-foreground mt-1">مالیات تکلیفی</p>
          <div className="flex gap-1 mt-2 justify-center">
            <button onClick={() => setWhtRate(r => Math.max(0, r - 1))} className="px-2 py-0.5 border rounded text-xs">-</button>
            <button onClick={() => setWhtRate(r => Math.min(25, r + 1))} className="px-2 py-0.5 border rounded text-xs">+</button>
          </div>
        </div>
      </div>
      <div className="bg-card rounded-xl border border-border p-5">
        <h3 className="text-sm font-bold mb-3">محاسبه ارزش افزوده</h3>
        <TaxCalculator vatRate={vatRate} whtRate={whtRate} />
      </div>
    </div>
  );
}

function TaxCalculator({ vatRate, whtRate }: { vatRate: number; whtRate: number }) {
  const [base, setBase] = useState('');
  const amount = Number(base) || 0;
  const vat = Math.round(amount * vatRate / 100);
  const wht = Math.round(amount * whtRate / 100);
  const total = amount + vat;
  const net = total - wht;
  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground mb-1 block">مبلغ پایه (ریال)</label>
        <input type="number" value={base} onChange={e => setBase(e.target.value)} className="border border-border rounded-lg py-2 px-3 text-sm w-full bg-secondary focus:outline-none" placeholder="0" dir="ltr" />
      </div>
      {amount > 0 && (
        <div className="space-y-2 text-sm">
          {[
            ['مبلغ پایه', amount, 'text-foreground'],
            [`ارزش افزوده (${vatRate}٪)`, vat, 'text-amber-600'],
            ['جمع کل', total, 'text-foreground font-bold'],
            [`مالیات تکلیفی (${whtRate}٪)`, -wht, 'text-red-600'],
            ['خالص دریافتی', net, 'text-emerald-700 font-bold'],
          ].map(([label, value, cls]) => (
            <div key={String(label)} className="flex justify-between border-b border-border/30 pb-1">
              <span className="text-muted-foreground">{label}</span>
              <span className={`font-mono ${cls}`} dir="ltr">{Number(value).toLocaleString('fa-IR')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Approvals View ─────────────────────────────────────────────────────────────
function ApprovalsView() {
  const { pendingApprovals, approve, reject } = useApprovalWorkflow();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-foreground">صف تأیید</h1>
      <div className="grid grid-cols-3 gap-4 mb-4">
        {[
          { label: 'در انتظار', count: pendingApprovals.filter(a => a.status === 'pending').length, color: 'text-amber-600' },
          { label: 'تأیید شده', count: pendingApprovals.filter(a => a.status === 'approved').length, color: 'text-emerald-600' },
          { label: 'رد شده', count: pendingApprovals.filter(a => a.status === 'rejected').length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border">
        <div className="divide-y divide-border">
          {pendingApprovals.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">موردی برای تأیید وجود ندارد</p>
          ) : pendingApprovals.map(a => (
            <div key={a.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground" dir="ltr">{a.referenceNumber}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.status === 'pending' ? 'bg-amber-50 text-amber-700' : a.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {a.status === 'pending' ? 'در انتظار' : a.status === 'approved' ? 'تأیید شده' : 'رد شده'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{a.type === 'journal_voucher' ? 'سند حسابداری' : 'پرداخت'} — {a.preparedBy} — {a.date}</p>
                <p className="text-xs font-mono text-foreground mt-1" dir="ltr">{formatAmount(a.amount)}</p>
              </div>
              {a.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { approve(a.id); toast.success('تأیید شد'); }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500"
                  >
                    <CheckCircle className="w-3.5 h-3.5 inline ml-1" />تأیید
                  </button>
                  <button
                    onClick={() => setRejectId(a.id)}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500"
                  >
                    <AlertCircle className="w-3.5 h-3.5 inline ml-1" />رد
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectId && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
          <div className="bg-white rounded-xl p-5 w-full max-w-sm space-y-4" dir="rtl">
            <h2 className="font-bold">دلیل رد کردن</h2>
            <input
              dir="rtl"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="دلیل..."
              className="w-full border border-border rounded-lg py-2 px-3 text-sm focus:outline-none"
            />
            <div className="flex gap-2">
              <button onClick={() => { reject(rejectId, rejectReason); setRejectId(null); setRejectReason(''); toast.error('رد شد'); }} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold">رد</button>
              <button onClick={() => setRejectId(null)} className="flex-1 py-2 rounded-lg border border-border text-sm">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Bank Reconciliation View ───────────────────────────────────────────────────
function BankReconciliationView() {
  const { bankItems, bookItems, match, isReconciled } = useBankReconciliation();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<string | null>(null);

  const handleMatch = () => {
    if (!selectedBank || !selectedBook) return;
    match(selectedBank, selectedBook);
    setSelectedBank(null);
    setSelectedBook(null);
    toast.success('تطبیق انجام شد');
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">تطبیق حساب بانکی</h1>
        {isReconciled && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5" />حساب تطبیق شده
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Bank Statement */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-blue-50">
            <h3 className="text-sm font-bold text-blue-800">صورتحساب بانکی</h3>
          </div>
          <div className="divide-y divide-border">
            {bankItems.map(item => (
              <div
                key={item.id}
                onClick={() => !item.matched && setSelectedBank(prev => prev === item.id ? null : item.id)}
                className={`p-3 flex items-center justify-between transition-colors
                  ${item.matched ? 'opacity-50 bg-emerald-50/30' : selectedBank === item.id ? 'bg-blue-50 cursor-pointer' : 'hover:bg-secondary/30 cursor-pointer'}`}
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{item.description}</p>
                  <p className={`text-xs font-mono mt-0.5 ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                    {item.amount.toLocaleString('fa-IR')} ریال
                  </p>
                </div>
                {item.matched
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  : selectedBank === item.id
                    ? <div className="w-4 h-4 rounded-full bg-blue-500 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>

        {/* Book items */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-3 border-b border-border bg-amber-50">
            <h3 className="text-sm font-bold text-amber-800">ردیف‌های دفاتر</h3>
          </div>
          <div className="divide-y divide-border">
            {bookItems.map(item => (
              <div
                key={item.id}
                onClick={() => !item.matched && setSelectedBook(prev => prev === item.id ? null : item.id)}
                className={`p-3 flex items-center justify-between transition-colors
                  ${item.matched ? 'opacity-50 bg-emerald-50/30' : selectedBook === item.id ? 'bg-amber-50 cursor-pointer' : 'hover:bg-secondary/30 cursor-pointer'}`}
              >
                <div>
                  <p className="text-xs font-medium text-foreground">{item.description}</p>
                  <p className={`text-xs font-mono mt-0.5 ${item.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`} dir="ltr">
                    {item.amount.toLocaleString('fa-IR')} ریال
                  </p>
                </div>
                {item.matched
                  ? <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  : selectedBook === item.id
                    ? <div className="w-4 h-4 rounded-full bg-amber-500 shrink-0" />
                    : <div className="w-4 h-4 rounded-full border-2 border-border shrink-0" />
                }
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedBank && selectedBook && (
        <div className="flex justify-center">
          <button
            onClick={handleMatch}
            className="px-6 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90"
          >
            تطبیق این دو ردیف
          </button>
        </div>
      )}
    </div>
  );
}

// ── Cost Centers View ─────────────────────────────────────────────────────────
const MOCK_COST_CENTERS: CostCenter[] = [
  { id: 'CC-001', code: 'CC-001', name: 'Production Line A', nameFa: 'خط تولید A', type: 'production_line', companyId: 'C-001', managerId: 'U001', managerName: 'احمد کریمی', budget: { annual: 2400000000, ytdActual: 800000000, ytdCommitted: 150000000, remaining: 1450000000 }, status: 'active', description: 'خط تولید اصلی پلاستیک', createdAt: '۱۴۰۱/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
  { id: 'CC-002', code: 'CC-002', name: 'Warehouse', nameFa: 'انبار مرکزی', type: 'warehouse', companyId: 'C-001', managerId: 'U002', managerName: 'نادر قاسمی', budget: { annual: 800000000, ytdActual: 200000000, ytdCommitted: 50000000, remaining: 550000000 }, status: 'active', description: 'انبار مواد اولیه', createdAt: '۱۴۰۱/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
  { id: 'CC-003', code: 'CC-003', name: 'Admin', nameFa: 'واحد اداری', type: 'admin', companyId: 'C-001', managerId: 'U003', managerName: 'مریم رضایی', budget: { annual: 1200000000, ytdActual: 400000000, ytdCommitted: 0, remaining: 800000000 }, status: 'active', description: 'واحد اداری و پشتیبانی', createdAt: '۱۴۰۱/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
  { id: 'CC-004', code: 'CC-004', name: 'Maintenance', nameFa: 'تعمیر و نگهداری', type: 'maintenance', companyId: 'C-001', managerId: 'U004', managerName: 'کمال صادقی', budget: { annual: 600000000, ytdActual: 245000000, ytdCommitted: 80000000, remaining: 275000000 }, status: 'active', description: 'تعمیرات دوره‌ای', createdAt: '۱۴۰۱/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
];

function CostCentersView() {
  const [showForm, setShowForm] = useState(false);
  const [centers, setCenters] = useState(MOCK_COST_CENTERS);
  const [form, setForm] = useState({ nameFa: '', code: '', manager: '', budget: '', type: 'production_line' });

  const totalBudget = centers.reduce((s, c) => s + c.budget.annual, 0);
  const totalActual = centers.reduce((s, c) => s + c.budget.ytdActual, 0);
  const totalCommitted = centers.reduce((s, c) => s + c.budget.ytdCommitted, 0);
  const utilizationPct = totalBudget > 0 ? ((totalActual + totalCommitted) / totalBudget) * 100 : 0;

  const handleSave = () => {
    if (!form.nameFa.trim() || !form.code.trim()) { toast.error('نام و کد الزامی است'); return; }
    const newCC: CostCenter = {
      id: `CC-${Date.now()}`, code: form.code, name: form.nameFa, nameFa: form.nameFa,
      type: form.type as any, companyId: 'C-001', managerId: '', managerName: form.manager,
      budget: { annual: Number(form.budget) || 0, ytdActual: 0, ytdCommitted: 0, remaining: Number(form.budget) || 0 },
      status: 'active', description: '', createdAt: new Date().toLocaleDateString('fa-IR'), updatedAt: new Date().toLocaleDateString('fa-IR'),
    };
    setCenters(prev => [newCC, ...prev]);
    toast.success('مرکز هزینه جدید افزوده شد');
    setShowForm(false);
    setForm({ nameFa: '', code: '', manager: '', budget: '', type: 'production_line' });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">مراکز هزینه</h1>
        <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
          <Plus className="w-3.5 h-3.5" /><span>مرکز هزینه جدید</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">افزودن مرکز هزینه جدید</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'code', label: 'کد مرکز', ph: 'CC-006' },
              { key: 'nameFa', label: 'نام مرکز', ph: 'نام فارسی' },
              { key: 'manager', label: 'مدیر', ph: 'نام مدیر' },
              { key: 'budget', label: 'بودجه سالانه (ریال)', ph: '0' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input placeholder={ph} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary">
                <option value="production_line">خط تولید</option>
                <option value="warehouse">انبار</option>
                <option value="admin">اداری</option>
                <option value="maintenance">تعمیر و نگهداری</option>
                <option value="sales">فروش</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold">ذخیره</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'بودجه سالانه', value: formatAmount(totalBudget), color: '' },
          { label: 'هزینه واقعی YTD', value: formatAmount(totalActual), color: 'text-emerald-600' },
          { label: 'تعهدات', value: formatAmount(totalCommitted), color: 'text-amber-600' },
          { label: 'نرخ بهره‌برداری', value: `${Math.round(utilizationPct)}٪`, color: utilizationPct > 90 ? 'text-red-600' : 'text-emerald-600' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-lg font-bold ${k.color || 'text-foreground'}`} dir="ltr">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-bold text-right">لیست مراکز هزینه</h3></div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['وضعیت بودجه', 'مانده', 'تعهد', 'واقعی', 'بودجه', 'مدیر', 'نوع', 'نام مرکز', 'کد'].map(h => (
                <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {centers.map(cc => {
              const usedPct = cc.budget.annual > 0 ? ((cc.budget.ytdActual + cc.budget.ytdCommitted) / cc.budget.annual) * 100 : 0;
              return (
                <tr key={cc.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3">
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div className={`h-2 rounded-full ${usedPct > 90 ? 'bg-red-500' : usedPct > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(usedPct, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{Math.round(usedPct)}٪</span>
                  </td>
                  <td className="py-3 px-3 text-xs font-mono" dir="ltr">{formatAmount(cc.budget.remaining)}</td>
                  <td className="py-3 px-3 text-xs font-mono" dir="ltr">{formatAmount(cc.budget.ytdCommitted)}</td>
                  <td className="py-3 px-3 text-xs font-mono" dir="ltr">{formatAmount(cc.budget.ytdActual)}</td>
                  <td className="py-3 px-3 text-xs font-mono" dir="ltr">{formatAmount(cc.budget.annual)}</td>
                  <td className="py-3 px-3 text-xs">{cc.managerName}</td>
                  <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{COST_CENTER_TYPE_CONFIG?.[cc.type]?.fa || cc.type}</span></td>
                  <td className="py-3 px-3 text-xs font-semibold">{cc.nameFa}</td>
                  <td className="py-3 px-3 text-xs font-mono text-primary">{cc.code}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Projects View ──────────────────────────────────────────────────────────────
const MOCK_PROJECTS: Project[] = [
  { id: 'PRJ-001', code: 'PRJ-2024-001', name: 'Expansion Phase 2', nameFa: 'فاز توسعه کارخانه', companyId: 'C-001', companyName: 'شرکت پلاستیک ایران', projectType: 'construction', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹', status: 'active', totalBudget: 5000000000, actualCost: 1800000000, estimatedCostToComplete: 3200000000, variance: 0, variancePercent: 0, wipAccountId: 'WIP-001', budgetLines: [], milestones: [{ id: 'M-001', name: 'Foundation', nameFa: 'زیرسازی', dueDate: '۱۴۰۳/۰۳/۳۱', completedDate: '۱۴۰۳/۰۳/۲۸', status: 'completed', budgetAllocated: 1500000000, actualSpent: 1450000000 }, { id: 'M-002', name: 'Structure', nameFa: 'اسکلت', dueDate: '۱۴۰۳/۰۶/۳۱', status: 'in_progress', budgetAllocated: 2000000000, actualSpent: 350000000 }], managerId: 'U001', managerName: 'احمد کریمی', completionPercent: 36, createdAt: '۱۴۰۳/۰۱/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
  { id: 'PRJ-002', code: 'PRJ-2024-002', name: 'ERP Implementation', nameFa: 'پیاده‌سازی ERP', companyId: 'C-001', companyName: 'شرکت پلاستیک ایران', projectType: 'it', startDate: '۱۴۰۳/۰۲/۰۱', status: 'active', totalBudget: 800000000, actualCost: 320000000, estimatedCostToComplete: 480000000, variance: 0, variancePercent: 0, wipAccountId: 'WIP-002', budgetLines: [], milestones: [{ id: 'M-003', name: 'Analysis', nameFa: 'تحلیل', dueDate: '۱۴۰۳/۰۳/۳۱', completedDate: '۱۴۰۳/۰۳/۲۵', status: 'completed', budgetAllocated: 200000000, actualSpent: 180000000 }], managerId: 'U002', managerName: 'مریم رضایی', completionPercent: 40, createdAt: '۱۴۰۳/۰۲/۰۱', updatedAt: '۱۴۰۳/۰۴/۱۶' },
];

function ProjectsView() {
  const [projects, setProjects] = useState(MOCK_PROJECTS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nameFa: '', code: '', manager: '', budget: '', type: 'construction', startDate: '' });

  const handleSave = () => {
    if (!form.nameFa.trim()) { toast.error('نام پروژه الزامی است'); return; }
    const p: Project = {
      id: `PRJ-${Date.now()}`, code: form.code, name: form.nameFa, nameFa: form.nameFa,
      companyId: 'C-001', companyName: 'شرکت', projectType: form.type as any,
      startDate: form.startDate, status: 'planning', totalBudget: Number(form.budget) || 0,
      actualCost: 0, estimatedCostToComplete: Number(form.budget) || 0,
      variance: 0, variancePercent: 0, wipAccountId: '', budgetLines: [], milestones: [],
      managerId: '', managerName: form.manager, completionPercent: 0,
      createdAt: new Date().toLocaleDateString('fa-IR'), updatedAt: new Date().toLocaleDateString('fa-IR'),
    };
    setProjects(prev => [p, ...prev]);
    toast.success('پروژه جدید افزوده شد');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">پروژه‌ها</h1>
        <button onClick={() => setShowForm(f => !f)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
          <Plus className="w-3.5 h-3.5" /><span>پروژه جدید</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-sm font-semibold mb-3">پروژه جدید</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { key: 'code', label: 'کد پروژه', ph: 'PRJ-2024-005' },
              { key: 'nameFa', label: 'نام پروژه', ph: 'نام فارسی پروژه' },
              { key: 'manager', label: 'مدیر پروژه', ph: '' },
              { key: 'budget', label: 'بودجه کل (ریال)', ph: '0' },
              { key: 'startDate', label: 'تاریخ شروع', ph: '۱۴۰۳/۰۵/۰۱' },
            ].map(({ key, label, ph }) => (
              <div key={key}>
                <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                <input placeholder={ph} value={(form as any)[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary focus:outline-none focus:border-accent" />
              </div>
            ))}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">نوع پروژه</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} className="w-full border border-border rounded-lg py-2 px-3 text-xs bg-secondary">
                <option value="construction">ساختمانی</option>
                <option value="it">فناوری اطلاعات</option>
                <option value="maintenance">نگهداری</option>
                <option value="other">سایر</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleSave} className="px-4 py-2 bg-accent text-white rounded-lg text-xs font-semibold">ذخیره</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-border rounded-lg text-xs text-muted-foreground">انصراف</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map(project => {
          const statusCfg = PROJECT_STATUS_CONFIG?.[project.status] || { fa: project.status, color: '', bg: '' };
          return (
            <div key={project.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-bold text-foreground">{project.nameFa}</h3>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{project.code} · {project.managerName}</p>
                </div>
              </div>
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-muted-foreground">پیشرفت</span>
                  <span className="text-[10px] font-semibold text-foreground">{project.completionPercent}٪</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-accent h-2 rounded-full" style={{ width: `${project.completionPercent}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: 'بودجه', val: project.totalBudget },
                  { label: 'واقعی', val: project.actualCost },
                  { label: 'باقی‌مانده', val: project.estimatedCostToComplete },
                ].map(({ label, val }) => (
                  <div key={label} className="p-2 rounded bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground">{label}</p>
                    <p className="text-xs font-semibold" dir="ltr">{(val / 1000000000).toFixed(1)}B</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Consolidation View ─────────────────────────────────────────────────────────
function ConsolidationView() {
  const MOCK_IC: IntercompanyTransaction[] = [
    { id: 'IC-001', fromCompanyId: 'C-001', fromCompanyName: 'شرکت پلاستیک ایران', toCompanyId: 'C-002', toCompanyName: 'صنایع فولاد البرز', transactionType: 'sale', amount: 250000000, currency: 'IRR', date: '۱۴۰۳/۰۴/۱۰', description: 'فروش مواد اولیه', voucherId: 'JV-001', eliminationRequired: true, eliminated: false },
    { id: 'IC-002', fromCompanyId: 'C-003', fromCompanyName: 'پتروشیمی پارس', toCompanyId: 'C-001', toCompanyName: 'شرکت پلاستیک ایران', transactionType: 'sale', amount: 180000000, currency: 'IRR', date: '۱۴۰۳/۰۴/۰۵', description: 'فروش مواد شیمیایی', voucherId: 'JV-002', eliminationRequired: true, eliminated: true, eliminationVoucherId: 'JE-001' },
  ];

  const [items, setItems] = useState(MOCK_IC);

  const eliminate = (id: string) => {
    setItems(prev => prev.map(ic => ic.id === id ? { ...ic, eliminated: true, eliminationVoucherId: `JE-${Date.now()}` } : ic));
    toast.success('ادغام انجام شد');
  };

  const totalEliminated = items.filter(t => t.eliminated).reduce((s, t) => s + t.amount, 0);
  const pending = items.filter(t => !t.eliminated).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">ادغام مالی چند شرکتی</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary">
            <Download className="w-3.5 h-3.5" /><span>گزارش ادغام</span>
          </button>
          <button onClick={() => { items.filter(i => !i.eliminated).forEach(i => eliminate(i.id)); }} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90">
            <CheckCircle className="w-3.5 h-3.5" /><span>ادغام همه</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'کل شرکت‌ها', value: '4', color: '' },
          { label: 'تراکنش‌های بین شرکتی', value: String(items.length), color: '' },
          { label: 'مبلغ ادغام شده', value: formatAmount(totalEliminated), color: 'text-emerald-600' },
          { label: 'در انتظار ادغام', value: formatAmount(pending), color: 'text-amber-600' },
        ].map(k => (
          <div key={k.label} className="bg-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className={`text-lg font-bold ${k.color || 'text-foreground'}`} dir="ltr">{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border"><h3 className="text-sm font-bold text-right">تراکنش‌های بین شرکتی</h3></div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {['وضعیت', 'مبلغ', 'تاریخ', 'توضیحات', 'شرکت مقصد', 'شرکت مبدأ', 'نوع', 'عملیات'].map(h => (
                <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map(ic => (
              <tr key={ic.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                <td className="py-3 px-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${ic.eliminated ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {ic.eliminated ? 'ادغام شده' : 'در انتظار'}
                  </span>
                </td>
                <td className="py-3 px-3 text-xs font-mono" dir="ltr">{formatAmount(ic.amount)}</td>
                <td className="py-3 px-3 text-xs">{ic.date}</td>
                <td className="py-3 px-3 text-xs">{ic.description}</td>
                <td className="py-3 px-3 text-xs">{ic.toCompanyName}</td>
                <td className="py-3 px-3 text-xs">{ic.fromCompanyName}</td>
                <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary">{ic.transactionType === 'sale' ? 'فروش' : 'خدمات'}</span></td>
                <td className="py-3 px-3">
                  {!ic.eliminated && (
                    <button onClick={() => eliminate(ic.id)} className="text-[10px] px-2 py-1 rounded bg-amber-600 text-white hover:bg-amber-500">ادغام</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FinanceScreen;
