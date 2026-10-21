import { ResponsiveContainer, BarChart, PieChart, XAxis, YAxis, Tooltip, Bar, Pie, Cell } from "recharts";
import { TrendingUp, TrendingDown, CreditCard, Package, Plus, Download, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { FinanceTransaction } from "@/entities/document";
import { FINANCE_CATEGORIES, FINANCE_REPORTS, BUDGET_LINES, ZONE_BUDGET_TOTAL, ZONE_BUDGET_APPROVED, financeTrend, COST_CENTERS, AR_AGING, BANK_RECONCILIATION, FINANCIAL_PROJECTIONS } from "@/entities/document";

type FinanceTabId = "overview" | "transactions" | "budget" | "receivables" | "reconciliation" | "projections";

interface FinanceTabProps {
  financeTab: FinanceTabId; setFinanceTab: (t: FinanceTabId) => void;
  monthIncome: number; monthExpense: number; budgetRemaining: number;
  visibleTransactions: FinanceTransaction[];
  financeTypeFilter: string; setFinanceTypeFilter: (f: string) => void;
  financePartyFilter: string; setFinancePartyFilter: (f: string) => void;
  financeStatusFilter: string; setFinanceStatusFilter: (f: string) => void;
  financeModalOpen: boolean; setFinanceModalOpen: (o: boolean) => void;
  financeForm: { type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" };
  setFinanceForm: React.Dispatch<React.SetStateAction<{ type: "income" | "expense"; category: string; party: string; amount: string; date: string; status: "paid" | "pending" | "overdue" }>>;
  companiesListState: { nameFa: string }[];
  setFinanceTransactionsList: React.Dispatch<React.SetStateAction<FinanceTransaction[]>>;
}

const FINANCE_TABS = [
  { id: "overview" as FinanceTabId, label: "نمای کلی" }, { id: "transactions" as FinanceTabId, label: "تراکنش‌ها" },
  { id: "budget" as FinanceTabId, label: "بودجه" }, { id: "receivables" as FinanceTabId, label: "مطالبات" },
  { id: "reconciliation" as FinanceTabId, label: "تسویه بانکی" }, { id: "projections" as FinanceTabId, label: "پیش‌بینی مالی" },
];

export const FinanceTab = ({
  financeTab, setFinanceTab, monthIncome, monthExpense, budgetRemaining,
  visibleTransactions, financeTypeFilter, setFinanceTypeFilter,
  financePartyFilter, setFinancePartyFilter, financeStatusFilter, setFinanceStatusFilter,
  financeModalOpen, setFinanceModalOpen, financeForm, setFinanceForm,
  companiesListState, setFinanceTransactionsList,
}: FinanceTabProps) => (
  <div className="space-y-5">
    <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit mr-auto overflow-x-auto">
      {FINANCE_TABS.map((t) => (
        <button key={t.id} onClick={() => setFinanceTab(t.id)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${financeTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>{t.label}</button>
      ))}
    </div>

    {financeTab === "overview" && (
      <>
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><TrendingUp className="w-4 h-4 text-emerald-600 mx-auto mb-2" /><p className="text-lg font-bold text-foreground" dir="ltr">{(monthIncome / 1000000).toLocaleString()}M</p><p className="text-[11px] text-muted-foreground mt-1">درآمد این ماه (تومان)</p></div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><TrendingDown className="w-4 h-4 text-red-600 mx-auto mb-2" /><p className="text-lg font-bold text-foreground" dir="ltr">{(monthExpense / 1000000).toLocaleString()}M</p><p className="text-[11px] text-muted-foreground mt-1">هزینه این ماه (تومان)</p></div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><CreditCard className="w-4 h-4 text-primary mx-auto mb-2" /><p className="text-lg font-bold text-foreground" dir="ltr">{(ZONE_BUDGET_TOTAL / 1000000000).toFixed(1)}B</p><p className="text-[11px] text-muted-foreground mt-1">بودجه سالانه</p></div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center"><Package className="w-4 h-4 text-accent mx-auto mb-2" /><p className="text-lg font-bold text-foreground" dir="ltr">{(budgetRemaining / 1000000).toLocaleString()}M</p><p className="text-[11px] text-muted-foreground mt-1">مانده بودجه</p></div>
        </div>
        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">روند درآمد و هزینه</h3>
            <ResponsiveContainer width="100%" height={200}><BarChart data={financeTrend}>
              <XAxis dataKey="m" tick={{ fill: "#6B7A8D", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000000}M`} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 12 }} formatter={(v: any) => v.toLocaleString()} />
              <Bar dataKey="income" fill="#0E7C86" radius={[3, 3, 0, 0]} name="درآمد" />
              <Bar dataKey="expense" fill="#F2A541" radius={[3, 3, 0, 0]} name="هزینه" />
            </BarChart></ResponsiveContainer>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <h3 className="text-sm font-semibold text-foreground text-right mb-4">مرکز هزینه</h3>
            <ResponsiveContainer width="100%" height={160}><PieChart>
              <Pie data={COST_CENTERS} cx="50%" cy="50%" innerRadius={42} outerRadius={66} paddingAngle={3} dataKey="value">
                {COST_CENTERS.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} formatter={(v: any) => v.toLocaleString()} />
            </PieChart></ResponsiveContainer>
            <div className="space-y-1.5 mt-2">{COST_CENTERS.map((d) => (<div key={d.name} className="flex items-center justify-between"><div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} /><span className="text-[10px] text-muted-foreground">{d.name}</span></div><span className="text-[10px] font-bold text-foreground" dir="ltr">{(d.value / 1000000).toFixed(0)}M</span></div>))}</div>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground text-right mb-4">گزارش‌های مالی</h3>
          <div className="grid grid-cols-2 gap-3">
            {FINANCE_REPORTS.map((r) => (
              <div key={r.title} className="border border-border rounded-lg p-3 flex items-center justify-between gap-3">
                <button className="text-[11px] px-2.5 py-1.5 rounded-lg bg-secondary hover:bg-secondary/70 text-foreground transition-colors flex items-center gap-1 flex-shrink-0"><Download className="w-3 h-3" /><span>دانلود</span></button>
                <div className="text-right flex-1 min-w-0"><div className="flex items-center gap-1.5 justify-end"><span className={`text-[9px] px-1.5 py-0.5 rounded-full ${r.type === "تخصصی" ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>{r.type}</span><p className="text-xs font-semibold text-foreground">{r.title}</p></div><p className="text-[10px] text-muted-foreground mt-0.5">{r.desc}</p></div>
              </div>
            ))}
          </div>
        </div>
      </>
    )}

    {financeTab === "transactions" && (
      <>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <button onClick={() => setFinanceModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"><Plus className="w-4 h-4" /><span>ثبت تراکنش جدید</span></button>
          <div className="flex items-center gap-2">
            <select value={financeTypeFilter} onChange={(e) => setFinanceTypeFilter(e.target.value)} className="bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه انواع</option><option value="income">درآمد</option><option value="expense">هزینه</option></select>
            <select value={financePartyFilter} onChange={(e) => setFinancePartyFilter(e.target.value)} className="bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه طرف‌حساب‌ها</option><option value="company">شرکت‌ها</option><option value="contractor">پیمانکاران</option><option value="other">سایر</option></select>
            <select value={financeStatusFilter} onChange={(e) => setFinanceStatusFilter(e.target.value)} className="bg-card border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent"><option value="all">همه وضعیت‌ها</option><option value="paid">پرداخت‌شده</option><option value="pending">در انتظار</option><option value="overdue">معوق</option></select>
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border">{["وضعیت", "تاریخ", "مبلغ", "طرف حساب", "دسته‌بندی", "نوع", "شناسه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {visibleTransactions.map((t) => (
                <tr key={t.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                  <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.status === "paid" ? "bg-emerald-50 text-emerald-700" : t.status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{t.status === "paid" ? "پرداخت‌شده" : t.status === "pending" ? "در انتظار" : "معوق"}</span></td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{t.date}</td>
                  <td className={`py-3 px-3 text-sm font-semibold font-mono ${t.type === "income" ? "text-emerald-600" : "text-red-600"}`} dir="ltr">{t.type === "income" ? "+" : "-"}{t.amount.toLocaleString()}</td>
                  <td className="py-3 px-3 text-xs text-foreground">{t.party}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{t.category}</td>
                  <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${t.type === "income" ? "bg-accent/10 text-accent" : "bg-amber-100 text-amber-700"}`}>{t.type === "income" ? "درآمد" : "هزینه"}</span></td>
                  <td className="py-3 px-3 text-xs font-semibold text-foreground font-mono" dir="ltr">{t.id}</td>
                </tr>
              ))}
              {visibleTransactions.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">تراکنشی یافت نشد.</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    )}

    {financeTab === "budget" && (
      <>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex items-center justify-between">
          <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${ZONE_BUDGET_APPROVED ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{ZONE_BUDGET_APPROVED ? "بودجه تخصیص‌یافته" : "بودجه‌ای تخصیص نیافته"}</span>
          <div className="text-right"><p className="text-sm font-bold text-foreground">بودجه مصوب سالانه شهرک کاوه</p><p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{ZONE_BUDGET_TOTAL.toLocaleString()} تومان</p></div>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-5">
          <h3 className="text-sm font-semibold text-foreground text-right mb-4">بودجه در برابر واقعی</h3>
          <table className="w-full">
            <thead><tr className="border-b border-border">{["درصد مصرف", "انحراف", "مصرف‌شده", "تخصیص‌یافته", "ردیف بودجه"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
            <tbody>
              {BUDGET_LINES.map((b) => {
                const pct = Math.round((b.spent / b.allocated) * 100);
                const variance = b.allocated - b.spent;
                return (
                  <tr key={b.category} className="border-b border-border/50 last:border-0">
                    <td className="py-3 px-3"><div className="w-full h-2 bg-secondary rounded-full"><div className={`h-2 rounded-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-400" : "bg-accent"}`} style={{ width: `${Math.min(pct, 100)}%` }} /></div><span className="text-[10px] text-muted-foreground mt-1 block" dir="ltr">{pct}%</span></td>
                    <td className="py-3 px-3"><span className={`text-xs font-mono font-semibold ${variance > 0 ? "text-emerald-600" : "text-red-600"}`} dir="ltr">{variance > 0 ? "+" : ""}{variance.toLocaleString()}</span></td>
                    <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{b.spent.toLocaleString()}</td>
                    <td className="py-3 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{b.allocated.toLocaleString()}</td>
                    <td className="py-3 px-3 text-xs font-medium text-foreground text-right">{b.category}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    )}

    {financeTab === "receivables" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-4">مطالبات معوق (سنی حساب‌ها)</h3>
        <div className="space-y-4">
          {AR_AGING.map((a, i) => {
            const colors = ["bg-accent", "bg-amber-400", "bg-orange-500", "bg-red-500"];
            const total = AR_AGING.reduce((s, x) => s + x.amount, 0);
            const pct = Math.round((a.amount / total) * 100);
            return (
              <div key={a.range}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2"><span className="text-xs font-semibold text-foreground">{a.range}</span><span className="text-[10px] text-muted-foreground">({a.count} فاکتور)</span></div>
                  <span className="text-xs font-mono font-semibold text-foreground" dir="ltr">{a.amount.toLocaleString()} تومان</span>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full"><div className={`h-3 rounded-full ${colors[i]}`} style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">مجموع مطالبات معوق</span>
          <span className="text-sm font-bold text-foreground" dir="ltr">{AR_AGING.reduce((s, a) => s + a.amount, 0).toLocaleString()} تومان</span>
        </div>
      </div>
    )}

    {financeTab === "reconciliation" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-4">تسویه بانکی</h3>
        <table className="w-full">
          <thead><tr className="border-b border-border">{["وضعیت", "بانک", "دفتر", "شرح", "تاریخ"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {BANK_RECONCILIATION.map((b, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3">{b.matched ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{b.bank.toLocaleString()}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{b.book.toLocaleString()}</td>
                <td className="py-3 px-3 text-xs text-foreground text-right">{b.desc}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{b.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><CheckCircle2 className="w-3 h-3 text-emerald-600" />تطبیق‌یافته: {BANK_RECONCILIATION.filter((b) => b.matched).length}</span>
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><AlertCircle className="w-3 h-3 text-red-600" />عدم تطابق: {BANK_RECONCILIATION.filter((b) => !b.matched).length}</span>
          </div>
        </div>
      </div>
    )}

    {financeTab === "projections" && (
      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <h3 className="text-sm font-semibold text-foreground text-right mb-4">پیش‌بینی مالی فصلی</h3>
        <table className="w-full">
          <thead><tr className="border-b border-border">{["سود خالص", "هزینه", "درآمد", "دوره"].map((h) => <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {FINANCIAL_PROJECTIONS.map((p, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/40 transition-colors">
                <td className="py-3 px-3 text-xs font-mono font-semibold text-emerald-600" dir="ltr">{p.profit.toLocaleString()}</td>
                <td className="py-3 px-3 text-xs font-mono text-red-600" dir="ltr">{p.expense.toLocaleString()}</td>
                <td className="py-3 px-3 text-xs font-mono text-emerald-600" dir="ltr">{p.income.toLocaleString()}</td>
                <td className="py-3 px-3 text-xs font-medium text-foreground text-right">{p.quarter}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">مجموع پیش‌بینی سود سالانه</span>
          <span className="text-sm font-bold text-emerald-600" dir="ltr">{FINANCIAL_PROJECTIONS.reduce((s, p) => s + p.profit, 0).toLocaleString()} تومان</span>
        </div>
      </div>
    )}
  </div>
);
