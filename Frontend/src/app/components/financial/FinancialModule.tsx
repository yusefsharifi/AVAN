import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import {
  Wallet, CreditCard, AlertTriangle, CheckCircle2,
  Clock, Download, X, ChevronLeft, FileText, ListOrdered, Upload,
  BarChart2, BookOpen, Shield, Bell, History,
  Printer, RefreshCw, CheckCheck, AlertCircle, DollarSign,
  CalendarDays, Landmark, ScrollText, Loader2,
} from "lucide-react";
import type {
  FinancialDocument, Payment, ChartOfAccount, GeneralLedgerEntry,
  TrialBalanceRow, FinancialPeriod, AuditEntry, FinNotification,
} from "./types";
import {
  ALL_DOCUMENTS, PAYMENTS,
  CHART_OF_ACCOUNTS, GENERAL_LEDGER, TRIAL_BALANCE, FINANCIAL_PERIODS,
  AUDIT_TRAIL, NOTIFICATIONS, AGING_REPORT, MONTHLY_SUMMARIES, CASH_FLOW,
  PARK_REVENUE_SUMMARY,
  DOC_STATUS_CFG, DOC_TYPE_CFG, PAYMENT_METHOD_CFG,
} from "./mockData";

/* ─── Shared styling constants ─── */
const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

/* ─── Badge for financial status ─── */
const DocBadge = ({ status }: { status: string }) => {
  const c = DOC_STATUS_CFG[status] ?? DOC_STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} flex-shrink-0`} />
      {c.fa}
    </span>
  );
};

/* ─── Doc type badge ─── */
const DocTypeBadge = ({ docType }: { docType: string }) => {
  const c = DOC_TYPE_CFG[docType] ?? { fa: docType, icon: "📄" };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-foreground">
      <span>{c.icon}</span>
      <span>{c.fa}</span>
    </span>
  );
};

/* ─── Status color helper ─── */
const statusColor = (status: string) => {
  switch (status) {
    case "paid": return "text-emerald-600";
    case "pending": return "text-amber-600";
    case "overdue": return "text-red-600";
    case "cancelled": return "text-slate-400";
    default: return "text-muted-foreground";
  }
};

/* ─── Number input helper for Persian numerals ─── */
const persianNumber = (n: number) => n.toLocaleString("fa-IR");

/* ═══════════════════════════════════════════════════════════════
   MAIN FINANCIAL MODULE
   ═══════════════════════════════════════════════════════════════ */
interface FinancialModuleProps {
  onNavigate?: (page: string) => void;
}

export default function FinancialModule({ onNavigate }: FinancialModuleProps) {
  const [page, setPage] = useState("dashboard");
  const [selectedDoc, setSelectedDoc] = useState<FinancialDocument | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  // Dashboard state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentDoc, setPaymentDoc] = useState<FinancialDocument | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("manual");
  const [paymentReceipt, setPaymentReceipt] = useState<File | null>(null);
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  // Reports
  const [reportType, setReportType] = useState("income-statement");

  // Accounting
  const [accountingTab, setAccountingTab] = useState("chart-of-accounts");
  const [selectedPeriod, setSelectedPeriod] = useState(FINANCIAL_PERIODS.find(p => p.isCurrent)?.id ?? "FP-1403");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [selectedNotif, setSelectedNotif] = useState<FinNotification | null>(null);

  // Audit
  const [auditFilter, setAuditFilter] = useState("all");

  // Computed values
  const balanceTotal = useMemo(() => {
    const paid = ALL_DOCUMENTS.filter(d => d.status === "paid").reduce((s, d) => s + d.totalAmount, 0);
    const pending = ALL_DOCUMENTS.filter(d => d.status === "pending" || d.status === "overdue").reduce((s, d) => s + d.totalAmount, 0);
    return { paid, pending, total: paid + pending };
  }, []);

  const overdueCount = useMemo(() => ALL_DOCUMENTS.filter(d => d.status === "overdue").length, []);
  const pendingCount = useMemo(() => ALL_DOCUMENTS.filter(d => d.status === "pending").length, []);
  const paidCount = useMemo(() => ALL_DOCUMENTS.filter(d => d.status === "paid").length, []);

  const filteredDocs = useMemo(() => {
    return ALL_DOCUMENTS.filter(d => {
      if (filterType !== "all" && d.docType !== filterType) return false;
      if (filterStatus !== "all" && d.status !== filterStatus) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return d.docNumber.toLowerCase().includes(q) || d.title.toLowerCase().includes(q) || d.companyName.toLowerCase().includes(q);
      }
      return true;
    });
  }, [filterType, filterStatus, searchQuery]);

  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  /* ─── Payment handler ─── */
  const handlePayment = () => {
    if (!paymentDoc) return;
    setPaymentProcessing(true);
    setTimeout(() => {
      setPaymentProcessing(false);
      setPaymentSuccess(true);
      setTimeout(() => {
        setShowPaymentModal(false);
        setPaymentSuccess(false);
        setPaymentDoc(null);
        setPaymentReceipt(null);
        setPaymentNote("");
      }, 2000);
    }, 1500);
  };

  const nav = [
    { id: "dashboard", Icon: Wallet, label: "داشبورد مالی" },
    { id: "documents", Icon: FileText, label: "اسناد مالی" },
    { id: "payments", Icon: CreditCard, label: "پرداخت‌ها" },
    { id: "accounting", Icon: BookOpen, label: "حسابداری" },
    { id: "reports", Icon: BarChart2, label: "گزارش‌ها" },
    { id: "audit", Icon: Shield, label: "حسابرسی" },
  ];

  /* ════════════════════════════════════════
     DASHBOARD VIEW
     ════════════════════════════════════════ */
  const DashboardView = () => (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50"><Wallet className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="text-base font-bold text-foreground" dir="ltr">{persianNumber(balanceTotal.paid)} ریال</p>
            <p className="text-xs text-muted-foreground mt-0.5">کل پرداخت‌ها</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50"><Clock className="w-5 h-5 text-amber-600" /></div>
          <div>
            <p className="text-base font-bold text-foreground" dir="ltr">{persianNumber(balanceTotal.pending)} ریال</p>
            <p className="text-xs text-muted-foreground mt-0.5">پرداخت‌های در انتظار</p>
          </div>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
          <div>
            <p className="text-base font-bold text-foreground" dir="ltr">{paidCount}</p>
            <p className="text-xs text-muted-foreground mt-0.5">اسناد پرداخت شده</p>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-red-100"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
          <div>
            <p className="text-base font-bold text-red-700" dir="ltr">{overdueCount} سند</p>
            <p className="text-xs text-red-600 mt-0.5">مطالبات معوق</p>
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-5">
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-right">روند پرداخت‌ها (ماهانه)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={MONTHLY_SUMMARIES}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0E7C86" stopOpacity={0.3}/><stop offset="95%" stopColor="#0E7C86" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#DC2626" stopOpacity={0.3}/><stop offset="95%" stopColor="#DC2626" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="period" tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
              <Area type="monotone" dataKey="income" stroke="#0E7C86" fill="url(#colorIncome)" strokeWidth={2} name="درآمد" />
              <Area type="monotone" dataKey="expense" stroke="#DC2626" fill="url(#colorExpense)" strokeWidth={2} name="هزینه" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-right">توزیع وضعیت اسناد</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={[
                { name: "پرداخت شده", value: paidCount, color: "#10B981" },
                { name: "در انتظار", value: pendingCount, color: "#F59E0B" },
                { name: "معوق", value: overdueCount, color: "#EF4444" },
              ].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                {[paidCount, pendingCount, overdueCount].filter(v => v > 0).map((_, i) => (
                  <Cell key={i} fill={["#10B981", "#F59E0B", "#EF4444"][i]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
              <Legend formatter={(value) => <span className="text-xs text-foreground">{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent documents */}
      <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setPage("documents")} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1 transition-colors">
            <span>مشاهده همه</span><ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <h3 className="text-sm font-semibold text-foreground">آخرین اسناد مالی</h3>
        </div>
        <div className="space-y-2">
          {ALL_DOCUMENTS.slice(0, 5).map((doc) => (
            <div key={doc.id} onClick={() => { setSelectedDoc(doc); setPage("documents"); }} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/30 cursor-pointer transition-colors">
              <DocTypeBadge docType={doc.docType} />
              <DocBadge status={doc.status} />
              <div className="flex-1 text-right min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{doc.docNumber} · {doc.issueDate}</p>
              </div>
              <span className="text-sm font-bold text-foreground font-mono" dir="ltr">{persianNumber(doc.totalAmount)} ریال</span>
            </div>
          ))}
        </div>
      </div>

      {/* Park Revenue Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-lg font-bold text-accent" dir="ltr">{persianNumber(PARK_REVENUE_SUMMARY.totalInvoiced)}</p>
          <p className="text-xs text-muted-foreground mt-1">کل صورتحساب‌ها</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-lg font-bold text-emerald-600" dir="ltr">{persianNumber(PARK_REVENUE_SUMMARY.totalCollected)}</p>
          <p className="text-xs text-muted-foreground mt-1">کل وصولی</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-lg font-bold text-amber-600" dir="ltr">{PARK_REVENUE_SUMMARY.collectionRate}%</p>
          <p className="text-xs text-muted-foreground mt-1">نرخ وصول</p>
        </div>
        <div className="bg-card rounded-xl p-4 border border-border text-center">
          <p className="text-lg font-bold text-red-600" dir="ltr">{PARK_REVENUE_SUMMARY.overduePercentage}%</p>
          <p className="text-xs text-muted-foreground mt-1">درصد معوقات</p>
        </div>
      </div>
    </div>
  );

  /* ════════════════════════════════════════
     DOCUMENTS LIST VIEW
     ════════════════════════════════════════ */
  const DocumentsView = () => {
    const getDocTotal = (doc: FinancialDocument) => doc.totalAmount;

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <input
              dir="rtl" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی شماره سند، عنوان، شرکت..."
              className="bg-transparent border-none outline-none text-xs text-foreground flex-1 py-1"
            />
          </div>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputCls + " w-auto"}>
            <option value="all">همه انواع</option>
            <option value="invoice">فاکتور</option>
            <option value="statement">صورتحساب</option>
            <option value="bill">قبض</option>
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputCls + " w-auto"}>
            <option value="all">همه وضعیت‌ها</option>
            <option value="pending">در انتظار پرداخت</option>
            <option value="paid">پرداخت شده</option>
            <option value="overdue">معوق</option>
          </select>
          <span className="text-xs text-muted-foreground">{persianNumber(filteredDocs.length)} سند</span>
        </div>

        {/* Table */}
        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["عملیات", "وضعیت", "نوع", "سررسید", "تاریخ صدور", "مبلغ کل", "شماره سند", "عنوان"].map((h) => (
                  <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc) => (
                <tr key={doc.id} onClick={() => setSelectedDoc(doc)} className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors">
                  <td className="py-2 px-3">
                    <button onClick={(e) => { e.stopPropagation(); setPaymentDoc(doc); setShowPaymentModal(true); }}
                      className="text-[10px] px-2 py-1 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors font-medium"
                      disabled={doc.status === "paid" || doc.status === "cancelled"}>
                      پرداخت
                    </button>
                  </td>
                  <td className="py-2 px-3"><DocBadge status={doc.status} /></td>
                  <td className="py-2 px-3"><DocTypeBadge docType={doc.docType} /></td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{doc.dueDate}</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground">{doc.issueDate}</td>
                  <td className="py-2 px-3 text-sm font-bold text-foreground font-mono" dir="ltr">{persianNumber(doc.totalAmount)} ریال</td>
                  <td className="py-2 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{doc.docNumber}</td>
                  <td className="py-2 px-3">
                    <p className="text-sm font-medium text-foreground truncate max-w-[200px]">{doc.title}</p>
                    <p className="text-[10px] text-muted-foreground">{doc.companyName}</p>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr><td colSpan={8} className="text-center py-10 text-sm text-muted-foreground">سندی یافت نشد.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Detail Panel */}
        {selectedDoc && <DocumentDetail doc={selectedDoc} onClose={() => setSelectedDoc(null)} onPay={() => { setPaymentDoc(selectedDoc); setShowPaymentModal(true); }} />}
      </div>
    );
  };

  /* ════════════════════════════════════════
     DOCUMENT DETAIL VIEW
     ════════════════════════════════════════ */
  const DocumentDetail = ({ doc, onClose, onPay }: { doc: FinancialDocument; onClose: () => void; onPay: () => void }) => {
    const docPayments = PAYMENTS.filter(p => p.documentId === doc.id);
    return (
      <>
        <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
        <div className="fixed top-0 bottom-0 left-0 w-[450px] bg-card border-r border-border shadow-2xl z-40 flex flex-col overflow-hidden" dir="rtl">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="text-right">
              <p className="text-sm font-bold text-foreground">{doc.title}</p>
              <p className="text-[10px] text-muted-foreground font-mono" dir="ltr">{doc.docNumber}</p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Status & Type */}
            <div className="flex items-center gap-2">
              <DocBadge status={doc.status} />
              <DocTypeBadge docType={doc.docType} />
            </div>
            {/* Basic info */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between"><span className="text-foreground">{doc.companyName}</span><span className="text-muted-foreground">شرکت</span></div>
              <div className="flex items-center justify-between"><span className="text-foreground">{doc.issueDate}</span><span className="text-muted-foreground">تاریخ صدور</span></div>
              <div className="flex items-center justify-between"><span className="text-foreground">{doc.dueDate}</span><span className="text-muted-foreground">سررسید</span></div>
              {doc.paidDate && <div className="flex items-center justify-between"><span className="text-emerald-600 font-medium">{doc.paidDate}</span><span className="text-muted-foreground">تاریخ پرداخت</span></div>}
              {doc.approvedBy && <div className="flex items-center justify-between"><span className="text-foreground">{doc.approvedBy}</span><span className="text-muted-foreground">تأییدکننده</span></div>}
              <div className="flex items-center justify-between"><span className="text-foreground">{doc.isRecurring ? `دوره‌ای (${doc.recurringPeriod})` : "غیردوره‌ای"}</span><span className="text-muted-foreground">نوع صدور</span></div>
              {doc.targetType === "all" && <div className="flex items-center justify-between"><span className="text-amber-600 font-medium">کلیه شرکت‌ها</span><span className="text-muted-foreground">مخاطب</span></div>}
            </div>
            {/* Amount */}
            <div className="bg-secondary/30 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">مبلغ پایه</span><span className="text-foreground font-mono" dir="ltr">{persianNumber(doc.amount)} ریال</span></div>
              <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">مالیات بر ارزش افزوده ({doc.vatRate}%)</span><span className="text-foreground font-mono" dir="ltr">{persianNumber(doc.vatAmount)} ریال</span></div>
              <div className="border-t border-border pt-1.5 flex items-center justify-between text-sm"><span className="font-semibold text-foreground">مبلغ کل</span><span className="font-bold text-accent font-mono" dir="ltr">{persianNumber(doc.totalAmount)} ریال</span></div>
            </div>
            {/* Line Items */}
            {doc.lineItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 text-right">ریز اقلام</p>
                <div className="space-y-1.5">
                  {doc.lineItems.map((item) => (
                    <div key={item.id} className="p-2 rounded-lg border border-border bg-secondary/20">
                      <div className="flex items-center justify-between text-xs"><span className="text-foreground">{item.description}</span><span className="text-muted-foreground">کد {item.accountCode}</span></div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>{persianNumber(item.quantity)} × {persianNumber(item.unitPrice)} ریال</span>
                        <span>تخفیف: {persianNumber(item.discount)} ریال</span>
                        <span className="font-semibold text-foreground">{persianNumber(item.total)} ریال</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Attachments */}
            {doc.attachments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 text-right">پیوست‌ها</p>
                <div className="space-y-1.5">
                  {doc.attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-2 p-2 rounded-lg border border-border bg-secondary/30">
                      <FileText className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      <div className="flex-1 text-right">
                        <p className="text-xs text-foreground">{att.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">بارگذاری توسط {att.uploadedBy} در {att.uploadedAt}</p>
                      </div>
                      <button className="p-1 rounded hover:bg-secondary"><Download className="w-3.5 h-3.5 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Payments */}
            {docPayments.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-2 text-right">تاریخچه پرداخت</p>
                <div className="space-y-1.5">
                  {docPayments.map((p) => (
                    <div key={p.id} className="p-2 rounded-lg border border-border bg-secondary/20">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground" dir="ltr">{persianNumber(p.amount)} ریال</span>
                        <span className="text-muted-foreground">{PAYMENT_METHOD_CFG[p.method]?.fa ?? p.method}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1">
                        <span>کد رهگیری: {p.referenceNumber}</span>
                        <span>{p.paidAt}</span>
                      </div>
                      {p.verifiedBy && <p className="text-[10px] text-emerald-600 mt-1">تأیید شده توسط {p.verifiedBy}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Description */}
            {doc.description && (
              <div>
                <p className="text-xs font-semibold text-foreground mb-1 text-right">توضیحات</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{doc.description}</p>
              </div>
            )}
          </div>
          {/* Actions */}
          <div className="p-4 border-t border-border flex items-center gap-2">
            <button onClick={onPay} disabled={doc.status === "paid" || doc.status === "cancelled"}
              className="flex-1 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              {doc.status === "paid" ? "پرداخت شده" : "پرداخت"}
            </button>
            <button className="flex items-center gap-1.5 py-2.5 px-4 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
              <Download className="w-3.5 h-3.5" />
              <span>خروجی</span>
            </button>
          </div>
        </div>
      </>
    );
  };

  /* ════════════════════════════════════════
     PAYMENTS VIEW
     ════════════════════════════════════════ */
  const PaymentsView = () => {
    const [payFilter, setPayFilter] = useState("all");
    const filtered = payFilter === "all" ? PAYMENTS : PAYMENTS.filter(p => p.status === payFilter);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <select value={payFilter} onChange={(e) => setPayFilter(e.target.value)} className={inputCls + " w-auto"}>
            <option value="all">همه پرداخت‌ها</option>
            <option value="verified">تأیید شده</option>
            <option value="pending_verification">در انتظار تأیید</option>
            <option value="rejected">رد شده</option>
          </select>
          <span className="text-xs text-muted-foreground">{persianNumber(filtered.length)} پرداخت</span>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["وضعیت", "رسید", "روش", "تاریخ", "مبلغ", "کد رهگیری"].map(h => (
                  <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(pay => (
                <tr key={pay.id} onClick={() => setSelectedPayment(pay)} className="border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors">
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      pay.status === "verified" ? "bg-emerald-50 text-emerald-700" :
                      pay.status === "pending_verification" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        pay.status === "verified" ? "bg-emerald-500" :
                        pay.status === "pending_verification" ? "bg-amber-500" : "bg-red-500"
                      }`} />
                      {pay.status === "verified" ? "تأیید شده" : pay.status === "pending_verification" ? "در انتظار تأیید" : "رد شده"}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    {pay.receiptUrl ? <button className="text-accent text-xs hover:underline">مشاهده رسید</button> : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{PAYMENT_METHOD_CFG[pay.method]?.fa ?? pay.method}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{pay.paidAt}</td>
                  <td className="py-3 px-3 text-sm font-bold text-foreground font-mono" dir="ltr">{persianNumber(pay.amount)} ریال</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{pay.referenceNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {selectedPayment && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setSelectedPayment(null)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <h3 className="text-sm font-semibold text-foreground">جزئیات پرداخت</h3>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between"><span className="text-foreground">{persianNumber(selectedPayment.amount)} ریال</span><span className="text-muted-foreground">مبلغ</span></div>
              <div className="flex items-center justify-between"><span className="text-foreground">{PAYMENT_METHOD_CFG[selectedPayment.method]?.fa ?? selectedPayment.method}</span><span className="text-muted-foreground">روش پرداخت</span></div>
              <div className="flex items-center justify-between"><span className="text-foreground">{selectedPayment.referenceNumber}</span><span className="text-muted-foreground">کد رهگیری</span></div>
              {selectedPayment.transactionId && <div className="flex items-center justify-between"><span className="text-foreground">{selectedPayment.transactionId}</span><span className="text-muted-foreground">شناسه تراکنش</span></div>}
              <div className="flex items-center justify-between"><span className="text-foreground">{selectedPayment.paidAt}</span><span className="text-muted-foreground">تاریخ پرداخت</span></div>
              {selectedPayment.verifiedBy && <div className="flex items-center justify-between"><span className="text-emerald-600">{selectedPayment.verifiedBy}</span><span className="text-muted-foreground">تأییدکننده</span></div>}
              {selectedPayment.gatewayResponse && (
                <div>
                  <p className="text-muted-foreground mb-1">پاسخ درگاه</p>
                  <pre className="text-[10px] bg-secondary p-2 rounded-lg overflow-auto max-h-20">{selectedPayment.gatewayResponse}</pre>
                </div>
              )}
              {selectedPayment.notes && <div><p className="text-muted-foreground mb-1">یادداشت</p><p className="text-foreground">{selectedPayment.notes}</p></div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════
     ACCOUNTING VIEW
     ════════════════════════════════════════ */
  const AccountingView = () => {
    const tabs = [
      { id: "chart-of-accounts", label: "کدینگ حسابداری", Icon: ListOrdered },
      { id: "general-ledger", label: "دفتـر کل", Icon: BookOpen },
      { id: "trial-balance", label: "تراز آزمایشی", Icon: ScrollText },
      { id: "periods", label: "دوره‌های مالی", Icon: CalendarDays },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setAccountingTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${accountingTab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              <t.Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {accountingTab === "chart-of-accounts" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["وضعیت", "مانده", "ماهیت", "نوع", "عنوان", "کد حساب"].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CHART_OF_ACCOUNTS.map(acc => (
                  <tr key={acc.code} className={`border-b border-border/50 hover:bg-secondary/40 transition-colors ${acc.level === 0 ? "bg-secondary/20 font-semibold" : ""}`}>
                    <td className="py-2 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${acc.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${acc.isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {acc.isActive ? "فعال" : "غیرفعال"}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-foreground font-mono" dir="ltr">{persianNumber(acc.balance)} ریال</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{acc.nature === "debtor" ? "بدهکار" : "بستانکار"}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">
                      {acc.type === "asset" ? "دارایی" : acc.type === "liability" ? "بدهی" : acc.type === "equity" ? "حقوق مالکانه" : acc.type === "income" ? "درآمد" : "هزینه"}
                    </td>
                    <td className="py-2 px-3 text-xs text-foreground" style={{ paddingRight: `${acc.level * 20 + 12}px` }}>{acc.title}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{acc.code}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {accountingTab === "general-ledger" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["بستانکار", "بدهکار", "شرح", "تاریخ", "شماره سند"].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GENERAL_LEDGER.map(entry => (
                  <tr key={entry.id} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-2 px-3 text-xs text-red-600 font-mono" dir="ltr">{entry.credit > 0 ? persianNumber(entry.credit) + " ریال" : "—"}</td>
                    <td className="py-2 px-3 text-xs text-emerald-600 font-mono" dir="ltr">{entry.debit > 0 ? persianNumber(entry.debit) + " ریال" : "—"}</td>
                    <td className="py-2 px-3 text-xs text-foreground max-w-[250px] truncate">
                      <p>{entry.description}</p>
                      <p className="text-[10px] text-muted-foreground">{entry.accountTitle} ({entry.accountCode})</p>
                    </td>
                    <td className="py-2 px-3 text-xs text-muted-foreground">{entry.date}</td>
                    <td className="py-2 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{entry.entryNumber}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {accountingTab === "trial-balance" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground" rowSpan={2}>کد حساب</th>
                  <th className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground" rowSpan={2}>عنوان</th>
                  <th colSpan={2} className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground border-r border-border">مانده افتتاحیه</th>
                  <th colSpan={2} className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground border-r border-border">گردش دوره</th>
                  <th colSpan={2} className="text-center py-2.5 px-3 text-xs font-medium text-muted-foreground border-r border-border">مانده اختتامیه</th>
                </tr>
                <tr className="border-b border-border bg-secondary/20">
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بدهکار</th>
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بستانکار</th>
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بدهکار</th>
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بستانکار</th>
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بدهکار</th>
                  <th className="text-center py-1.5 px-2 text-[10px] text-muted-foreground">بستانکار</th>
                </tr>
              </thead>
              <tbody>
                {TRIAL_BALANCE.map(row => (
                  <tr key={row.accountCode} className="border-b border-border/50 hover:bg-secondary/40 transition-colors text-xs">
                    <td className="py-2 px-3 text-muted-foreground font-mono" dir="ltr">{row.accountCode}</td>
                    <td className="py-2 px-3 text-foreground">{row.accountTitle}</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-mono">{row.openingDebit > 0 ? persianNumber(row.openingDebit) : "—"}</td>
                    <td className="py-2 px-3 text-center text-red-600 font-mono">{row.openingCredit > 0 ? persianNumber(row.openingCredit) : "—"}</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-mono">{row.debit > 0 ? persianNumber(row.debit) : "—"}</td>
                    <td className="py-2 px-3 text-center text-red-600 font-mono">{row.credit > 0 ? persianNumber(row.credit) : "—"}</td>
                    <td className="py-2 px-3 text-center text-emerald-600 font-mono">{row.closingDebit > 0 ? persianNumber(row.closingDebit) : "—"}</td>
                    <td className="py-2 px-3 text-center text-red-600 font-mono">{row.closingCredit > 0 ? persianNumber(row.closingCredit) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {accountingTab === "periods" && (
          <div className="grid grid-cols-3 gap-4">
            {FINANCIAL_PERIODS.map(period => (
              <div key={period.id} className={`bg-card rounded-xl border p-5 shadow-[0_2px_12px_rgba(0,0,0,0.05)] ${
                period.isCurrent ? "border-accent ring-1 ring-accent/30" : "border-border"
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    period.status === "open" ? "bg-emerald-50 text-emerald-700" :
                    period.status === "closed" ? "bg-slate-100 text-slate-600" : "bg-amber-50 text-amber-700"
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      period.status === "open" ? "bg-emerald-500" :
                      period.status === "closed" ? "bg-slate-400" : "bg-amber-500"
                    }`} />
                    {period.status === "open" ? "باز" : period.status === "closed" ? "بسته" : "قفل"}
                  </span>
                  {period.isCurrent && <span className="text-[10px] px-2 py-0.5 rounded bg-accent/10 text-accent font-medium">جاری</span>}
                </div>
                <p className="text-sm font-bold text-foreground">{period.title}</p>
                <p className="text-xs text-muted-foreground mt-1">از {period.startDate} تا {period.endDate}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════
     REPORTS VIEW
     ════════════════════════════════════════ */
  const ReportsView = () => {
    const reportNav = [
      { id: "income-statement", label: "سود و زیان", Icon: TrendingUp },
      { id: "balance-sheet", label: "ترازنامه", Icon: Landmark },
      { id: "cash-flow", label: "جریان نقدی", Icon: DollarSign },
      { id: "aging", label: "پیری مطالبات", Icon: Clock },
      { id: "monthly-summary", label: "خلاصه ماهانه", Icon: BarChart2 },
      { id: "park-revenue", label: "درآمد شهرک", Icon: Building2 },
    ];

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 flex-wrap w-fit">
          {reportNav.map(r => (
            <button key={r.id} onClick={() => setReportType(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${reportType === r.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              <r.Icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          ))}
        </div>

        {/* Income Statement */}
        {reportType === "income-statement" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">صورت سود و زیان - دوره جاری</h3>
            <div className="space-y-2 text-xs">
              <div className="bg-emerald-50 rounded-lg p-3 flex items-center justify-between">
                <span className="font-bold text-emerald-700" dir="ltr">{persianNumber(MONTHLY_SUMMARIES.reduce((s, m) => s + m.income, 0))} ریال</span>
                <span className="font-semibold text-emerald-700">کل درآمدها</span>
              </div>
              <div className="bg-red-50 rounded-lg p-3 flex items-center justify-between">
                <span className="font-bold text-red-700" dir="ltr">({persianNumber(MONTHLY_SUMMARIES.reduce((s, m) => s + m.expense, 0))}) ریال</span>
                <span className="font-semibold text-red-700">کل هزینه‌ها</span>
              </div>
              <div className="border-t border-border pt-2" />
              <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
                <span className="font-bold text-primary" dir="ltr">{persianNumber(MONTHLY_SUMMARIES.reduce((s, m) => s + m.netProfit, 0))} ریال</span>
                <span className="font-semibold text-primary">سود (زیان) خالص</span>
              </div>
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={MONTHLY_SUMMARIES}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2EAF0" />
                  <XAxis dataKey="period" tick={{ fill: "#6B7A8D", fontSize: 10 }} />
                  <YAxis tick={{ fill: "#6B7A8D", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #E2EAF0", borderRadius: 8, fontSize: 11 }} />
                  <Bar dataKey="income" fill="#0E7C86" name="درآمد" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#EF4444" name="هزینه" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Balance Sheet */}
        {reportType === "balance-sheet" && (
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 text-right">دارایی‌ها</h3>
              <div className="space-y-2 text-xs">
                <div className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between font-semibold">
                  <span className="text-foreground" dir="ltr">{persianNumber(2000000000 + 3500000000 + 1500000000 + 125000000 + 890000000 + 450000000 + 183120000)} ریال</span>
                  <span className="text-foreground">جمع دارایی‌ها</span>
                </div>
                <div className="pr-4 space-y-1.5">
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(125000000)} ریال</span><span>صندوق</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(890000000)} ریال</span><span>بانک ملت</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(450000000)} ریال</span><span>بانک ملی</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(183120000)} ریال</span><span>حساب‌های دریافتنی</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(2000000000)} ریال</span><span>زمین</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(3500000000)} ریال</span><span>ساختمان</span></div>
                  <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(1500000000)} ریال</span><span>ماشین‌آلات</span></div>
                </div>
              </div>
            </div>
            <div className="space-y-5">
              <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 text-right">بدهی‌ها</h3>
                <div className="space-y-2 text-xs">
                  <div className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between font-semibold">
                    <span className="text-foreground" dir="ltr">{persianNumber(285000000 + 88780000 + 500000000)} ریال</span>
                    <span className="text-foreground">جمع بدهی‌ها</span>
                  </div>
                  <div className="pr-4 space-y-1.5">
                    <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(285000000)} ریال</span><span>حساب‌های پرداختنی</span></div>
                    <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(88780000)} ریال</span><span>مالیات پرداختنی</span></div>
                    <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(500000000)} ریال</span><span>تسهیلات بانکی</span></div>
                  </div>
                </div>
              </div>
              <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4 text-right">حقوق صاحبان سرمایه</h3>
                <div className="space-y-2 text-xs">
                  <div className="bg-secondary/20 rounded-lg p-3 flex items-center justify-between font-semibold">
                    <span className="text-foreground" dir="ltr">{persianNumber(5000000000 + 1200000000)} ریال</span>
                    <span className="text-foreground">جمع حقوق صاحبان سرمایه</span>
                  </div>
                  <div className="pr-4 space-y-1.5">
                    <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(5000000000)} ریال</span><span>سرمایه</span></div>
                    <div className="flex items-center justify-between py-1"><span className="text-muted-foreground" dir="ltr">{persianNumber(1200000000)} ریال</span><span>سود انباشته</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Cash Flow */}
        {reportType === "cash-flow" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">صورت جریان وجوه نقد</h3>
            <div className="space-y-4">
              {CASH_FLOW.map(cf => (
                <div key={cf.category}>
                  <div className={`flex items-center justify-between p-3 rounded-lg mb-2 text-xs font-semibold ${
                    cf.total >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                  }`}>
                    <span dir="ltr">{persianNumber(cf.total)} ریال</span>
                    <span>{cf.category}</span>
                  </div>
                  <div className="pr-4 space-y-1">
                    {cf.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1 text-xs">
                        <span className={`font-mono ${item.amount >= 0 ? "text-emerald-600" : "text-red-600"}`} dir="ltr">
                          {item.amount >= 0 ? "" : "("}{persianNumber(Math.abs(item.amount))}{item.amount >= 0 ? "" : ")"} ریال
                        </span>
                        <span className="text-muted-foreground">{item.description}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Aging Report */}
        {reportType === "aging" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground text-right">گزارش پیری مطالبات</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["شرکت", "کل بدهی", "جاری", "۳۰ روز", "۶۰ روز", "۹۰ روز", "۱۲۰+ روز"].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AGING_REPORT.map(row => (
                  <tr key={row.companyName} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-foreground">{row.companyName}</td>
                    <td className="py-3 px-3 text-sm font-bold text-foreground font-mono" dir="ltr">{persianNumber(row.totalDue)}</td>
                    <td className="py-3 px-3 text-xs text-emerald-600 font-mono" dir="ltr">{persianNumber(row.current)}</td>
                    <td className="py-3 px-3 text-xs text-amber-600 font-mono" dir="ltr">{persianNumber(row.days30)}</td>
                    <td className={`py-3 px-3 text-xs font-mono ${row.days60 > 0 ? "text-orange-600" : "text-muted-foreground"}`} dir="ltr">{persianNumber(row.days60)}</td>
                    <td className={`py-3 px-3 text-xs font-mono ${row.days90 > 0 ? "text-red-600" : "text-muted-foreground"}`} dir="ltr">{persianNumber(row.days90)}</td>
                    <td className={`py-3 px-3 text-xs font-mono ${row.days120plus > 0 ? "text-red-700 font-bold" : "text-muted-foreground"}`} dir="ltr">{persianNumber(row.days120plus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly Summary */}
        {reportType === "monthly-summary" && (
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="text-sm font-semibold text-foreground text-right">خلاصه عملکرد ماهانه</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {["دوره", "درآمد", "هزینه", "سود خالص", "دریافتنی", "پرداختنی"].map(h => (
                    <th key={h} className="text-right py-2.5 px-3 text-xs font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHLY_SUMMARIES.map(row => (
                  <tr key={row.period} className="border-b border-border/50 hover:bg-secondary/40 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-foreground">{row.period}</td>
                    <td className="py-3 px-3 text-xs text-emerald-600 font-mono" dir="ltr">{persianNumber(row.income)}</td>
                    <td className="py-3 px-3 text-xs text-red-600 font-mono" dir="ltr">{persianNumber(row.expense)}</td>
                    <td className={`py-3 px-3 text-xs font-mono font-semibold ${row.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`} dir="ltr">{persianNumber(row.netProfit)}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{persianNumber(row.receivables)}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{persianNumber(row.payables)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Park Revenue */}
        {reportType === "park-revenue" && (
          <div className="grid grid-cols-2 gap-5">
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 text-right">خلاصه درآمد شهرک</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg"><span className="text-foreground font-bold" dir="ltr">{persianNumber(PARK_REVENUE_SUMMARY.totalInvoiced)} ریال</span><span className="text-muted-foreground">کل صورتحساب‌ها</span></div>
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg"><span className="text-emerald-700 font-bold" dir="ltr">{persianNumber(PARK_REVENUE_SUMMARY.totalCollected)} ریال</span><span className="text-emerald-700">کل وصولی</span></div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg"><span className="text-red-700 font-bold" dir="ltr">{persianNumber(PARK_REVENUE_SUMMARY.totalOutstanding)} ریال</span><span className="text-red-700">مطالبات معوق</span></div>
              </div>
            </div>
            <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
              <h3 className="text-sm font-semibold text-foreground mb-4 text-right">شاخص‌های عملکردی</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <span className="text-foreground font-bold">{PARK_REVENUE_SUMMARY.collectionRate}%</span>
                  <span className="text-muted-foreground">نرخ وصول</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <span className="text-foreground font-bold">{PARK_REVENUE_SUMMARY.averagePaymentDays} روز</span>
                  <span className="text-muted-foreground">میانگین زمان پرداخت</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <span className="text-red-700 font-bold">{PARK_REVENUE_SUMMARY.overduePercentage}%</span>
                  <span className="text-red-700">درصد معوقات</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  /* ════════════════════════════════════════
     AUDIT TRAIL VIEW
     ════════════════════════════════════════ */
  const AuditView = () => {
    const [auditDateFilter, setAuditDateFilter] = useState("all");
    const filteredAudit = AUDIT_TRAIL.filter(e => {
      if (auditFilter !== "all" && e.action !== auditFilter) return false;
      return true;
    });

    const actionColor = (action: string) => {
      switch (action) {
        case "ایجاد": return "text-emerald-600 bg-emerald-50";
        case "پرداخت": return "text-blue-600 bg-blue-50";
        case "پرداخت آنلاین": return "text-indigo-600 bg-indigo-50";
        case "تأیید پرداخت": return "text-emerald-600 bg-emerald-50";
        case "اخطار": return "text-red-600 bg-red-50";
        default: return "text-slate-600 bg-slate-100";
      }
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <select value={auditFilter} onChange={(e) => setAuditFilter(e.target.value)} className={inputCls + " w-auto"}>
            <option value="all">همه رویدادها</option>
            <option value="ایجاد">ایجاد</option>
            <option value="پرداخت">پرداخت</option>
            <option value="پرداخت آنلاین">پرداخت آنلاین</option>
            <option value="تأیید پرداخت">تأیید پرداخت</option>
            <option value="اخطار">اخطار</option>
          </select>
          <span className="text-xs text-muted-foreground">{persianNumber(filteredAudit.length)} رویداد</span>
          <div className="flex-1" />
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>بروزرسانی</span>
          </button>
        </div>

        <div className="space-y-2">
          {filteredAudit.map(entry => (
            <div key={entry.id} className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <History className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${actionColor(entry.action)}`}>
                      {entry.action}
                    </span>
                    <span className="text-xs font-semibold text-foreground">{entry.userName}</span>
                    <span className="text-[10px] text-muted-foreground">({entry.userRole})</span>
                    <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">{entry.details}</p>
                  {entry.changes && (
                    <div className="mt-2 bg-secondary/30 rounded-lg p-2 text-[10px] font-mono">
                      {Object.entries(entry.changes).map(([field, change]) => (
                        <div key={field} className="flex items-center gap-2">
                          <span className="text-muted-foreground">{field}:</span>
                          <span className="text-red-500 line-through">{change.old}</span>
                          <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                          <span className="text-emerald-600">{change.new}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  /* ════════════════════════════════════════
     NOTIFICATION BELL
     ════════════════════════════════════════ */
  const NotificationBell = () => (
    <div className="relative">
      <button onClick={() => setShowNotifPanel(p => !p)} className="relative p-1.5 rounded-lg hover:bg-secondary transition-colors">
        <Bell className="w-4 h-4 text-muted-foreground" />
        {unreadNotifs > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] flex items-center justify-center text-white font-bold">
            {unreadNotifs}
          </span>
        )}
      </button>
      {showNotifPanel && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setShowNotifPanel(false)} />
          <div className="absolute top-full left-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-2xl z-40 overflow-hidden" dir="rtl">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <button onClick={() => setNotifications(n => n.map(not => ({ ...not, isRead: true })))} className="text-[10px] text-accent hover:underline">همه را خوانده شود</button>
              <span className="text-xs font-semibold text-foreground">اعلان‌ها</span>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.map(not => (
                <div key={not.id} onClick={() => { setSelectedNotif(not); setNotifications(n => n.map(x => x.id === not.id ? { ...x, isRead: true } : x)); }}
                  className={`p-3 border-b border-border/50 hover:bg-secondary/40 cursor-pointer transition-colors ${!not.isRead ? "bg-accent/5" : ""}`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${!not.isRead ? "bg-accent" : "bg-transparent"}`} />
                    <div className="flex-1 text-right min-w-0">
                      <p className="text-xs font-semibold text-foreground">{not.title}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{not.message}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">{not.createdAt}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );

  /* ════════════════════════════════════════
     PAYMENT MODAL
     ════════════════════════════════════════ */
  const PaymentModal = () => {
    if (!showPaymentModal || !paymentDoc) return null;
    return (
      <>
        <div className="fixed inset-0 bg-black/40 z-50" onClick={() => { if (!paymentProcessing) { setShowPaymentModal(false); setPaymentSuccess(false); } }} />
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-[420px] z-50" dir="rtl">
          {paymentSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <p className="text-lg font-bold text-foreground mb-2">پرداخت با موفقیت انجام شد</p>
              <p className="text-xs text-muted-foreground">رسید پرداخت برای مدیریت شهرک ارسال شد و پس از تأیید نهایی، وضعیت سند به‌روزرسانی می‌شود.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <button onClick={() => { if (!paymentProcessing) { setShowPaymentModal(false); } }} className="p-1 rounded hover:bg-secondary text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
                <p className="text-sm font-bold text-foreground">پرداخت سند مالی</p>
              </div>

              <div className="bg-secondary/30 rounded-lg p-3 mb-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">{paymentDoc.title}</span><span className="text-foreground font-medium">سند</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground font-mono" dir="ltr">{paymentDoc.docNumber}</span><span className="text-foreground">شماره</span></div>
                <div className="border-t border-border pt-1.5 flex items-center justify-between"><span className="text-muted-foreground text-xs">مبلغ قابل پرداخت</span><span className="text-base font-bold text-accent font-mono" dir="ltr">{persianNumber(paymentDoc.totalAmount)} ریال</span></div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className={labelCls}>روش پرداخت</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "manual", label: "پرداخت دستی", icon: "🏦", desc: "بارگذاری فیش واریزی" },
                      { id: "mellat", label: "درگاه بانک ملت", icon: "🏛️", desc: "پرداخت آنلاین" },
                      { id: "zarinpal", label: "زرین‌پال", icon: "🌐", desc: "پرداخت آنلاین" },
                      { id: "saman", label: "درگاه بانک سامان", icon: "🏛️", desc: "پرداخت آنلاین" },
                    ].map(m => (
                      <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                        className={`p-3 rounded-lg border text-right transition-colors ${paymentMethod === m.id ? "border-accent bg-accent/5 ring-1 ring-accent/30" : "border-border hover:border-accent/30"}`}>
                        <p className="text-sm font-semibold text-foreground">{m.icon} {m.label}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {paymentMethod === "manual" && (
                  <div>
                    <label className={labelCls}>فیش واریزی (رسید بانکی)</label>
                    <label className="w-full border-2 border-dashed border-border rounded-lg py-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-accent transition-colors">
                      <Upload className="w-5 h-5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{paymentReceipt ? paymentReceipt.name : "برای بارگذاری فیش کلیک کنید"}</span>
                      <span className="text-[10px] text-muted-foreground">PDF, JPG, PNG (حداکثر ۵ مگابایت)</span>
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => setPaymentReceipt(e.target.files?.[0] ?? null)} />
                    </label>
                    {paymentReceipt && (
                      <div className="flex items-center gap-2 mt-2 p-2 rounded-lg bg-emerald-50 text-xs text-emerald-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{paymentReceipt.name} بارگذاری شد</span>
                      </div>
                    )}
                  </div>
                )}

                {paymentMethod !== "manual" && (
                  <div className="bg-amber-50 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>پرداخت آنلاین از طریق درگاه امن بانک انجام می‌شود. پس از پرداخت موفق، رسید دیجیتال به صورت خودکار برای مدیریت شهرک ارسال می‌شود.</span>
                  </div>
                )}

                <div>
                  <label className={labelCls}>توضیحات (اختیاری)</label>
                  <textarea dir="rtl" rows={2} value={paymentNote} onChange={(e) => setPaymentNote(e.target.value)} placeholder="مثال: فیش واریزی بانک ملی به شماره حساب ۰۲۱۱۲۳۴۵۶۷۸۹" className={inputCls} />
                </div>

                <button onClick={handlePayment} disabled={paymentMethod === "manual" && !paymentReceipt || paymentProcessing}
                  className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
                  {paymentProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /><span>در حال پردازش...</span></>
                  ) : (
                    <><CreditCard className="w-4 h-4" /><span>{paymentMethod === "manual" ? "ثبت و ارسال برای تأیید" : "پرداخت آنلاین"}</span></>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </>
    );
  };

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button onClick={() => window.print()} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <Printer className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          {nav.map(({ id, Icon, label }) => (
            <button key={id} onClick={() => setPage(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${page === id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {page === "dashboard" && <DashboardView />}
        {page === "documents" && <DocumentsView />}
        {page === "payments" && <PaymentsView />}
        {page === "accounting" && <AccountingView />}
        {page === "reports" && <ReportsView />}
        {page === "audit" && <AuditView />}
      </div>

      {/* Payment Modal */}
      <PaymentModal />
    </div>
  );
}
