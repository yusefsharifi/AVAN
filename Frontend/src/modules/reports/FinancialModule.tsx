import { useState } from "react";
import {
  ResponsiveContainer, BarChart, LineChart, XAxis, YAxis, Tooltip, Bar, Line, CartesianGrid, Legend,
} from "recharts";
import {
  TrendingUp, AlertCircle, FileText, CreditCard, Download, Eye, Plus,
  DollarSign, Clock, CheckCircle2, Send, Calculator, Wallet, BarChart3,
} from "lucide-react";
import { FINANCE_TRANSACTIONS, BUDGET_LINES, financeTrend } from "@/entities/document";

const TABS = [
  { id: "overview", label: "نمای کلی" },
  { id: "invoices", label: "فاکتورها" },
  { id: "receivable", label: "مطالبات" },
  { id: "payable", label: "پرداختنی‌ها" },
  { id: "reports", label: "گزارش‌های مالی" },
  { id: "budget", label: "بودجه" },
] as const;

const twelveMonthData = [
  { m: "فروردین", income: 780, expense: 690 }, { m: "اردیبهشت", income: 810, expense: 705 },
  { m: "خرداد", income: 865, expense: 740 }, { m: "تیر", income: 890, expense: 760 },
  { m: "مرداد", income: 845, expense: 710 }, { m: "شهریور", income: 920, expense: 780 },
  { m: "مهر", income: 870, expense: 730 }, { m: "آبان", income: 905, expense: 755 },
  { m: "آذر", income: 880, expense: 720 }, { m: "دی", income: 915, expense: 770 },
  { m: "بهمن", income: 850, expense: 695 }, { m: "اسفند", income: 940, expense: 810 },
];

const incomeSources = [
  { name: "عوارض خدمات ماهانه", amount: 168000000 },
  { name: "حق اشتراک زیرساخت", amount: 140000000 },
  { name: "اجاره فضای تبلیغاتی", amount: 80000000 },
  { name: "جریمه تأخیر", amount: 21000000 },
  { name: "سایر درآمدها", amount: 12000000 },
];

const invoices = [
  { id: "INV-1041", desc: "اجاره واحد صنعتی A-12 — مرداد ۱۴۰۳", amount: 48000000, status: "paid", date: "۱۴۰۳/۰۵/۰۱", dueDate: "۱۴۰۳/۰۵/۱۵", company: "پلاستیک ایران" },
  { id: "INV-1040", desc: "هزینه آب و برق — تیر ۱۴۰۳", amount: 12500000, status: "paid", date: "۱۴۰۳/۰۴/۱۵", dueDate: "۱۴۰۳/۰۵/۰۱", company: "فولاد البرز" },
  { id: "INV-1039", desc: "خدمات تأسیسات مشترک — تیر ۱۴۰۳", amount: 8200000, status: "pending", date: "۱۴۰۳/۰۴/۱۰", dueDate: "۱۴۰۳/۰۴/۲۵", company: "پتروشیمی پارس" },
  { id: "INV-1038", desc: "اجاره واحد صنعتی A-12 — تیر ۱۴۰۳", amount: 48000000, status: "overdue", date: "۱۴۰۳/۰۴/۰۱", dueDate: "۱۴۰۳/۰۴/۱۵", company: "پلاستیک ایران" },
  { id: "INV-1037", desc: "هزینه امنیت و حراست — خرداد ۱۴۰۳", amount: 5000000, status: "paid", date: "۱۴۰۳/۰۳/۱۵", dueDate: "۱۴۰۳/۰۴/۰۱", company: "غذایی تهران" },
  { id: "INV-1036", desc: "حق اشتراک زیرساخت — خرداد ۱۴۰۳", amount: 14000000, status: "paid", date: "۱۴۰۳/۰۳/۱۰", dueDate: "۱۴۰۳/۰۳/۲۵", company: "سرامیک شیراز" },
];

const agingData = [
  { range: "جاری (۰-۳۰ روز)", amount: 20700000, count: 2 },
  { range: "۳۱-۶۰ روز", amount: 8200000, count: 1 },
  { range: "۶۱-۹۰ روز", amount: 0, count: 0 },
  { range: "بیش از ۹۰ روز", amount: 48000000, count: 1 },
];

const customerBalances = [
  { company: "پلاستیک ایران", balance: 48000000, invoices: 1, status: "overdue" },
  { company: "پتروشیمی پارس", balance: 8200000, invoices: 1, status: "pending" },
  { company: "فولاد البرز", balance: 0, invoices: 1, status: "paid" },
  { company: "غذایی تهران", balance: 0, invoices: 1, status: "paid" },
  { company: "سرامیک شیراز", balance: 0, invoices: 1, status: "paid" },
];

const supplierInvoices = [
  { id: "SUP-201", supplier: "شرکت تأسیسات آریا", desc: "تعمیرات تأسیسات مکانیکی", amount: 35000000, dueDate: "۱۴۰۳/۰۴/۲۰", status: "pending" },
  { id: "SUP-202", supplier: "برق‌کاران صنعتی البرز", desc: "نصب سیستم روشنایی", amount: 18500000, dueDate: "۱۴۰۳/۰۴/۱۵", status: "overdue" },
  { id: "SUP-203", supplier: "ایمن‌سازان پارس", desc: "بازرسی سیستم اطفاء حریق", amount: 9800000, dueDate: "۱۴۰۳/۰۴/۲۲", status: "pending" },
  { id: "SUP-204", supplier: "اداره برق منطقه‌ای", desc: "قبض برق مشترک", amount: 54000000, dueDate: "۱۴۰۳/۰۴/۰۱", status: "paid" },
];

const paymentCalendar = [
  { date: "۱۴۰۳/۰۴/۱۵", desc: "قبض برق — اداره برق", amount: 54000000 },
  { date: "۱۴۰۳/۰۴/۲۰", desc: "تعمیرات — تأسیسات آریا", amount: 35000000 },
  { date: "۱۴۰۳/۰۴/۲۲", desc: "بازرسی — ایمن پارس", amount: 9800000 },
  { date: "۱۴۰۳/۰۴/۲۵", desc: "روشنایی — البرز الکتریک", amount: 18500000 },
];

function FinancialModule() {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("overview");
  const [showCreateModal, setShowCreateModal] = useState(false);

  const totalIncome = FINANCE_TRANSACTIONS.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = FINANCE_TRANSACTIONS.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const paidCount = invoices.filter((i) => i.status === "paid").length;
  const overdueCount = invoices.filter((i) => i.status === "overdue").length;
  const totalAging = agingData.reduce((s, a) => s + a.amount, 0);
  const totalBudget = BUDGET_LINES.reduce((s, b) => s + b.allocated, 0);
  const totalSpent = BUDGET_LINES.reduce((s, b) => s + b.spent, 0);

  const statusColor = (s: string) =>
    s === "paid" ? "bg-emerald-50 text-emerald-700"
    : s === "pending" ? "bg-amber-50 text-amber-700"
    : "bg-red-50 text-red-700";
  const statusLabel = (s: string) =>
    s === "paid" ? "پرداخت‌شده" : s === "pending" ? "در انتظار" : "معوق";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 flex-wrap">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <h1 className="text-sm font-semibold text-foreground">امور مالی</h1>
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        <>
          <div className="grid grid-cols-6 gap-3">
            {[
              { label: "درآمد کل", value: `${(totalIncome / 1000000).toLocaleString()}M`, icon: TrendingUp, color: "text-emerald-600" },
              { label: "هزینه کل", value: `${(totalExpense / 1000000).toLocaleString()}M`, icon: AlertCircle, color: "text-red-600" },
              { label: "سود خالص", value: `${((totalIncome - totalExpense) / 1000000).toLocaleString()}M`, icon: DollarSign, color: "text-accent" },
              { label: "فاکتور پرداخت‌شده", value: `${paidCount}`, icon: CheckCircle2, color: "text-emerald-600" },
              { label: "فاکتور معوق", value: `${overdueCount}`, icon: Clock, color: "text-red-600" },
              { label: "مانده مطالبات", value: `${(totalAging / 1000000).toLocaleString()}M`, icon: AlertCircle, color: "text-amber-600" },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-card rounded-xl border border-border shadow-sm p-3 text-center">
                <kpi.icon className={`w-4 h-4 ${kpi.color} mx-auto mb-1.5`} />
                <p className={`text-sm font-bold ${kpi.color}`} dir="ltr">{kpi.value}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-xs font-bold text-foreground text-right mb-3">روند ۱۲ ماه اخیر (میلیون تومان)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={twelveMonthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2EAF0" />
                  <XAxis dataKey="m" tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="income" stroke="#0E7C86" strokeWidth={2} name="درآمد" dot={false} />
                  <Line type="monotone" dataKey="expense" stroke="#F2A541" strokeWidth={2} name="هزینه" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <h3 className="text-xs font-bold text-foreground text-right mb-3">منابع درآمدی برتر</h3>
              {incomeSources.map((src, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-[11px] text-foreground">{src.name}</span>
                  <span className="text-[11px] font-mono text-emerald-600 font-medium" dir="ltr">{(src.amount / 1000000).toFixed(0)}M</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── INVOICES ── */}
      {tab === "invoices" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex gap-2">
              <button onClick={() => setShowCreateModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-[11px] font-medium">
                <Plus className="w-3.5 h-3.5" /> ایجاد فاکتور
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary">
                <Download className="w-3.5 h-3.5" /> دانلود PDF
              </button>
            </div>
            <h3 className="text-sm font-semibold text-foreground">لیست فاکتورها</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["عملیات", "وضعیت", "مبلغ (تومان)", "سررسید", "تاریخ", "شرکت", "شرح", "شناسه"].map((h) => (
                  <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1">
                      <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Eye className="w-3 h-3" /></button>
                      <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"><Download className="w-3 h-3" /></button>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(inv.status)}`}>{statusLabel(inv.status)}</span>
                  </td>
                  <td className={`py-2.5 px-3 text-[11px] font-semibold font-mono ${inv.status === "paid" ? "text-emerald-600" : inv.status === "overdue" ? "text-red-600" : "text-amber-600"}`} dir="ltr">
                    {inv.amount.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{inv.dueDate}</td>
                  <td className="py-2.5 px-3 text-[10px] text-muted-foreground">{inv.date}</td>
                  <td className="py-2.5 px-3 text-[10px] text-foreground">{inv.company}</td>
                  <td className="py-2.5 px-3 text-[10px] text-foreground">{inv.desc}</td>
                  <td className="py-2.5 px-3 text-[10px] font-mono text-primary" dir="ltr">{inv.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ACCOUNTS RECEIVABLE ── */}
      {tab === "receivable" && (
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {agingData.map((a) => (
              <div key={a.range} className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
                <p className="text-lg font-bold text-foreground" dir="ltr">{(a.amount / 1000000).toLocaleString()}M</p>
                <p className="text-[10px] text-muted-foreground mt-1">{a.range}</p>
                <p className="text-[9px] text-muted-foreground">{a.count} فاکتور</p>
              </div>
            ))}
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">مطالبات به تفکیک مشتری</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["وضعیت", "مانده (تومان)", "تعداد فاکتور", "شرکت"].map((h) => (
                    <th key={h} className="text-right py-2.5 px-4 text-[10px] font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customerBalances.map((c) => (
                  <tr key={c.company} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                    <td className="py-2.5 px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                    <td className="py-2.5 px-4 text-[11px] font-mono text-foreground" dir="ltr">{c.balance.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-[11px] text-foreground">{c.invoices}</td>
                    <td className="py-2.5 px-4 text-[11px] text-foreground font-medium">{c.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-xs font-bold text-foreground mb-2">پیش‌بینی وصول</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">هفته جاری</span><span className="text-emerald-600 font-mono">۸,۲۰۰,۰۰۰ تومان</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">هفته آینده</span><span className="text-amber-600 font-mono">۴۸,۰۰۰,۰۰۰ تومان</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">ماه آینده</span><span className="text-muted-foreground font-mono">—</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ACCOUNTS PAYABLE ── */}
      {tab === "payable" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground">فاکتورهای تأمین‌کنندگان</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["وضعیت", "مبلغ (تومان)", "سررسید", "شرح", "تأمین‌کننده", "شناسه"].map((h) => (
                    <th key={h} className="text-right py-2.5 px-4 text-[10px] font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {supplierInvoices.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                    <td className="py-2.5 px-4"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColor(s.status)}`}>{statusLabel(s.status)}</span></td>
                    <td className="py-2.5 px-4 text-[11px] font-mono font-semibold text-foreground" dir="ltr">{s.amount.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-[10px] text-muted-foreground">{s.dueDate}</td>
                    <td className="py-2.5 px-4 text-[10px] text-foreground">{s.desc}</td>
                    <td className="py-2.5 px-4 text-[10px] text-foreground font-medium">{s.supplier}</td>
                    <td className="py-2.5 px-4 text-[10px] font-mono text-primary" dir="ltr">{s.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">دسته پرداخت</h3>
              <p className="text-[10px] text-muted-foreground mb-2">پرداخت‌های تأییدشده آماده انتقال</p>
              <div className="bg-secondary rounded-lg p-3 mb-3">
                <p className="text-sm font-bold text-foreground" dir="ltr">{supplierInvoices.filter((s) => s.status === "pending").reduce((s2, s) => s2 + s.amount, 0).toLocaleString()} تومان</p>
                <p className="text-[10px] text-muted-foreground">{supplierInvoices.filter((s) => s.status === "pending").length} فاکتور</p>
              </div>
              <button className="w-full bg-accent text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1.5">
                <Send className="w-3 h-3" /> اجرای دسته پرداخت
              </button>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="text-xs font-bold text-foreground mb-3">تقویم پرداخت‌ها</h3>
              {paymentCalendar.map((p, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <div>
                    <p className="text-[10px] text-foreground">{p.desc}</p>
                    <p className="text-[9px] text-muted-foreground">{p.date}</p>
                  </div>
                  <span className="text-[10px] font-mono text-foreground" dir="ltr">{(p.amount / 1000000).toFixed(1)}M</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── FINANCIAL REPORTS ── */}
      {tab === "reports" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: "تراز آزمایشی", desc: "لیست تمام حساب‌ها با مانده بدهکار و بستانکار", icon: Calculator },
              { title: "ترازنامه", desc: "وضعیت مالی در یک لحظه معین — دارایی‌ها، بدهی‌ها و حقوق صاحبان سهام", icon: Wallet },
              { title: "صورت سود و زیان", desc: "درآمدها و هزینه‌های عملیاتی و غیرعملیاتی", icon: TrendingUp },
              { title: "صورت جریان وجوه نقد", desc: "ورود و خروج نقد در فعالیت‌های عملیاتی، سرمایه‌گذاری و تأمین مالی", icon: BarChart3 },
            ].map((r) => (
              <div key={r.title} className="bg-card rounded-xl border border-border shadow-sm p-5 hover:border-accent/30 transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <r.icon className="w-5 h-5 text-accent" />
                  <h3 className="text-sm font-bold text-foreground">{r.title}</h3>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{r.desc}</p>
                <div className="flex items-center gap-2 mt-3">
                  <button className="text-[10px] px-3 py-1 rounded-lg bg-secondary text-foreground hover:bg-secondary/80">مشاهده</button>
                  <button className="text-[10px] px-3 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary">دانلود</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── BUDGET ── */}
      {tab === "budget" && (
        <div className="space-y-4">
          <div className="bg-card rounded-xl border border-border shadow-sm p-4">
            <h3 className="text-xs font-bold text-foreground mb-3">ثبت ردیف بودجه</h3>
            <div className="grid grid-cols-4 gap-3">
              <input className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="دسته‌بندی" />
              <input className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="بودجه تخصیصی (تومان)" type="number" />
              <input className="bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="مصرف‌شده (تومان)" type="number" />
              <button className="bg-primary text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5" /> ثبت
              </button>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary">
                <Send className="w-3.5 h-3.5" /> ارسال برای تأیید
              </button>
              <h3 className="text-sm font-semibold text-foreground">مقایسه بودجه و عملکرد</h3>
            </div>
            <div className="p-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={BUDGET_LINES.map((b) => ({ name: b.category.slice(0, 12), allocated: b.allocated / 1000000, spent: b.spent / 1000000 }))}>
                  <XAxis dataKey="name" tick={{ fill: "#6B7A8D", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}M`} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="allocated" fill="#E2EAF0" name="تخصیص‌یافته" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="spent" fill="#0E7C86" name="مصرف‌شده" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["انحراف %", "مصرف‌شده", "تخصیص‌یافته", "دسته‌بندی"].map((h) => (
                    <th key={h} className="text-right py-2.5 px-4 text-[10px] font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {BUDGET_LINES.map((b) => {
                  const pct = Math.round((b.spent / b.allocated) * 100);
                  return (
                    <tr key={b.category} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                      <td className="py-2.5 px-4 text-[10px] font-mono text-foreground">{pct}%</td>
                      <td className="py-2.5 px-4 text-[11px] font-mono text-foreground" dir="ltr">{b.spent.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-[11px] font-mono text-muted-foreground" dir="ltr">{b.allocated.toLocaleString()}</td>
                      <td className="py-2.5 px-4 text-[11px] text-foreground font-medium">{b.category}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Invoice Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-[420px] shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-4">ایجاد فاکتور جدید</h3>
            <div className="space-y-3">
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="شرح فاکتور" />
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="شرکت" />
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" placeholder="مبلغ (تومان)" type="number" />
              <input className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs text-foreground" type="date" />
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-secondary text-foreground text-xs font-bold py-2 rounded-lg">انصراف</button>
              <button onClick={() => setShowCreateModal(false)} className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg">ایجاد</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialModule;
