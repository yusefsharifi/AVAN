import { useState, useEffect } from "react";
import { useSearchParams } from "react-router";
import {
  Shield, CheckCircle2, XCircle, Search, FileText, Lock, Key, Clock,
  AlertTriangle, Camera, ChevronDown, Flag, Mail,
} from "lucide-react";
import { useCorrespondenceStore } from "@/modules/correspondence/store";
import {
  computeAuthenticityScore,
  buildPublicView,
  isSLABreached,
} from "@/modules/correspondence/utils/verifyLetter";

type VerifyMode = "waybill" | "certificate" | "permit" | "letter";

const MODES: { id: VerifyMode; label: string }[] = [
  { id: "waybill", label: "بارنامه" },
  { id: "certificate", label: "گواهی" },
  { id: "permit", label: "مجوز" },
  { id: "letter", label: "نامه" },
];

// ── Static mock data for non-letter modes ─────────────────────────────────────
const WAYBILL_HISTORY = [
  { time: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲", text: "سند صادر شد", signer: "رضایی محمد", valid: true },
  { time: "۱۴۰۳/۰۸/۱۴ ۱۵:۰۵", text: "تأیید مدیر شهرک", signer: "احمد کریمی", valid: true },
  { time: "۱۴۰۳/۰۸/۱۴ ۱۶:۲۰", text: "تأیید نهایی", signer: "سیستم", valid: true },
];
const CUSTODY_TIMELINE = [
  { stage: "صادرکننده", entity: "شرکت نمونه صنعت", time: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲", action: "ایجاد بارنامه", hash: "0x7f3a...c2d1" },
  { stage: "مسئول لجستیک", entity: "رضایی محمد", time: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲", action: "امضای اولیه", hash: "0x9b2e...a4f8" },
  { stage: "مدیر شهرک", entity: "احمد کریمی", time: "۱۴۰۳/۰۸/۱۴ ۱۵:۰۵", action: "تأیید نهایی", hash: "0x1d5c...e7b3" },
  { stage: "دروازه ورود", entity: "سیستم خودکار", time: "۱۴۰۳/۰۸/۱۴ ۱۶:۲۰", action: "تأیید ورود", hash: "0x4e8f...d9c6" },
];
const CERT_DATA = { docType: "گواهی دیجیتال", docNumber: "CERT-۲۰۲۴-۰۸۷", issuer: "مرکز صدور گواهی ایران", issueDate: "۱۴۰۲/۰۸/۱۰", expiryDate: "۱۴۰۳/۰۸/۱۰", holder: "علیرضا صادقی", company: "شرکت پلاستیک ایران", tokenType: "Soft (موبایل)", serial: "****91B2" };
const PERMIT_DATA = { docType: "مجوز فعالیت", docNumber: "PERM-۱۰۲۴-۰۱۲", issuer: "شهرک صنعتی کاوه", issueDate: "۱۴۰۲/۰۱/۰۱", expiryDate: "۱۴۰۳/۱۲/۳۰", company: "صنایع فولاد البرز", workType: "تولید و بسته‌بندی", area: "بلوک B، واحد ۳", riskLevel: "متوسط" };
const SIGNERS = [
  { name: "رضایی محمد", title: "مسئول لجستیک", datetime: "۱۴۰۳/۰۸/۱۴ ۱۴:۳۲:۱۷", serial: "****3F4A", valid: true },
  { name: "احمد کریمی", title: "مدیر شهرک", datetime: "۱۴۰۳/۰۸/۱۴ ۱۵:۰۵:۴۲", serial: "****5E91", valid: true },
];

// ── Direction / Type / Status labels ─────────────────────────────────────────
const DIRECTION_LABELS: Record<string, string> = { incoming: "ورودی", outgoing: "خروجی", internal: "داخلی" };
const TYPE_LABELS: Record<string, string> = { official: "رسمی", memo: "یادداشت", circular: "بخشنامه", report: "گزارش", instruction: "دستورالعمل", request: "درخواست", response: "پاسخ" };
const STATUS_LABELS: Record<string, string> = { draft: "پیش‌نویس", "pending-approval": "در انتظار تأیید", approved: "تأیید شده", sent: "ارسال شده", dispatched: "ارسال شده", archived: "بایگانی" };
const CLASSIFICATION_LABELS: Record<string, string> = { unclassified: "عادی", confidential: "محرمانه", restricted: "محرمانه خیلی", secret: "سری" };
const STEP_STATUS_COLORS: Record<string, string> = { approved: "text-emerald-400", rejected: "text-red-400", active: "text-amber-400", pending: "text-blue-300/40" };

function VerifyPortal() {
  const [searchParams] = useSearchParams();
  const letters = useCorrespondenceStore((s) => s.letters);

  const [mode, setMode] = useState<VerifyMode>((searchParams.get("mode") as VerifyMode) || "waybill");
  const [docNumber, setDocNumber] = useState(searchParams.get("hash") || "");
  const [showResult, setShowResult] = useState(false);
  const [verified, setVerified] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [letterResult, setLetterResult] = useState<ReturnType<typeof buildPublicView> | null>(null);
  const [letterScore, setLetterScore] = useState<ReturnType<typeof computeAuthenticityScore> | null>(null);

  // Auto-verify on mount if URL params present
  useEffect(() => {
    const urlHash = searchParams.get("hash");
    const urlMode = searchParams.get("mode") as VerifyMode | null;
    if (urlHash && urlMode) {
      setMode(urlMode);
      setDocNumber(urlHash);
      if (urlMode === "letter") {
        verifyLetter(urlHash);
      } else {
        setVerified(true);
        setShowResult(true);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function verifyLetter(hash: string) {
    const letter = letters.find((l) => l.qrHash === hash || l.id === hash || l.registryNumber === hash);
    if (!letter) {
      setVerified(false);
      setLetterResult(null);
      setLetterScore(null);
      setShowResult(true);
      return;
    }
    setVerified(true);
    setLetterResult(buildPublicView(letter));
    setLetterScore(computeAuthenticityScore(letter, []));
    setShowResult(true);
  }

  const handleVerify = () => {
    if (!docNumber.trim()) return;
    if (mode === "letter") {
      verifyLetter(docNumber.trim());
    } else {
      setVerified(true);
      setShowResult(true);
    }
  };

  const handleScan = () => {
    setScanning(true);
    setTimeout(() => {
      setScanning(false);
      const demoHash = mode === "letter" && letters.length > 0 ? letters[0].qrHash : "۱۴۰۳-۴۵۶";
      setDocNumber(demoHash);
      if (mode === "letter") {
        verifyLetter(demoHash);
      } else {
        setVerified(true);
        setShowResult(true);
      }
    }, 2000);
  };

  const authenticityScore = letterScore?.overall ?? 94;

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8 overflow-auto" dir="rtl">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center mx-auto mb-3">
            <Shield className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-lg font-bold text-white mb-1">اعتبارسنجی سند</h1>
          <p className="text-xs text-blue-300/60">Document Verification Portal</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center justify-center gap-1 mb-5 bg-white/5 backdrop-blur rounded-xl p-1 max-w-md mx-auto">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => { setMode(m.id); setShowResult(false); setDocNumber(""); setLetterResult(null); }}
              className={`flex-1 text-[11px] px-3 py-2 rounded-lg font-medium transition-colors ${mode === m.id ? "bg-accent text-white" : "text-blue-300/60 hover:text-white/80"}`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Search Form */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5 mb-5">
          <label className="text-xs text-blue-300/60 block mb-2">
            {mode === "letter" ? "هش QR یا شماره ثبت نامه را وارد کنید" :
             mode === "waybill" ? "شماره بارنامه را وارد کنید" :
             mode === "certificate" ? "شماره گواهی را وارد کنید" : "شماره مجوز را وارد کنید"}
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={docNumber}
              onChange={(e) => { setDocNumber(e.target.value); setShowResult(false); }}
              placeholder={mode === "letter" ? "هش QR یا شماره ثبت نامه..." : mode === "waybill" ? "مثال: ۱۴۰۳-۴۵۶" : mode === "certificate" ? "مثال: CERT-۲۰۲۴-۰۸۷" : "مثال: PERM-۱۰۲۴-۰۱۲"}
              className="flex-1 bg-white/5 border border-white/20 rounded-xl py-2.5 px-4 text-sm text-white placeholder-blue-300/30 focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === "Enter" && handleVerify()}
            />
            <button onClick={handleVerify} className="bg-accent hover:bg-accent/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
              <Search className="w-3.5 h-3.5" /> بررسی
            </button>
            <button onClick={handleScan} className="bg-white/10 hover:bg-white/15 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
              <Camera className="w-3.5 h-3.5" /> اسکن QR
            </button>
          </div>
          {scanning && (
            <div className="mt-3 bg-white/5 rounded-xl p-4 text-center">
              <div className="w-32 h-32 mx-auto border-2 border-accent/50 rounded-xl relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-accent/30 to-transparent animate-pulse" />
                <div className="absolute left-0 right-0 h-0.5 bg-accent animate-bounce" style={{ top: "40%" }} />
                <Camera className="w-8 h-8 text-accent/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[10px] text-blue-300/50 mt-2">در حال اسکن...</p>
            </div>
          )}
        </div>

        {/* Result */}
        {showResult && (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-5">
            {/* Status Banner */}
            <div className={`flex items-center gap-3 p-3 rounded-xl mb-5 ${verified ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              {verified ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <XCircle className="w-5 h-5 text-red-400" />}
              <div className="flex-1">
                <p className={`text-sm font-bold ${verified ? "text-emerald-400" : "text-red-400"}`}>
                  {verified ? "سند معتبر است" : "سند یافت نشد"}
                </p>
                <p className="text-[10px] text-blue-300/50">نتیجه اعتبارسنجی دیجیتال</p>
              </div>
              <button onClick={() => setShowReport(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-[10px] font-medium hover:bg-red-500/30 transition-colors">
                <Flag className="w-3 h-3" /> گزارش مشکوک
              </button>
            </div>

            {verified && (
              <>
                {/* Authenticity Score */}
                <div className="bg-white/5 rounded-xl p-4 mb-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-blue-300/60 font-bold">امتیاز اعتبار</span>
                    <span className="text-sm font-bold text-emerald-400">{authenticityScore}/۱۰۰</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 mb-3">
                    <div className="h-2 rounded-full bg-gradient-to-l from-emerald-500 to-emerald-400 transition-all" style={{ width: `${authenticityScore}%` }} />
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {mode === "letter" && letterScore ? [
                      { label: "زنجیره تأیید", score: `${letterScore.approvalChain}%`, ok: letterScore.approvalChain >= 80 },
                      { label: "مهر زمانی", score: `${letterScore.timestamp}%`, ok: letterScore.timestamp >= 80 },
                      { label: "یکپارچگی هش", score: `${letterScore.hashIntegrity}%`, ok: letterScore.hashIntegrity === 100 },
                      { label: "رعایت SLA", score: `${letterScore.slaCompliance}%`, ok: letterScore.slaCompliance === 100 },
                    ] : [
                      { label: "امضاها", score: "۱۰۰%", ok: true },
                      { label: "مهر زمانی", score: "۱۰۰%", ok: true },
                      { label: "زنجیره اعتماد", score: "۹۲%", ok: true },
                      { label: "یکپارچگی", score: "۸۵%", ok: true },
                    ].map((item) => (
                      <div key={item.label} className="bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] text-blue-300/40">{item.label}</p>
                        <p className={`text-xs font-bold ${item.ok ? "text-emerald-400" : "text-amber-400"}`}>{item.score}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── LETTER MODE ───────────────────────────────────────────── */}
                {mode === "letter" && letterResult && (
                  <>
                    {/* Classification warning */}
                    {(letterResult.classification === "secret" || letterResult.classification === "confidential") && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 mb-4">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <p className="text-[10px] text-amber-300">
                          {letterResult.classification === "secret"
                            ? "این نامه سری است — فقط اطلاعات پایه نمایش داده می‌شود."
                            : "این نامه محرمانه است — متن کامل نمایش داده نمی‌شود."}
                        </p>
                      </div>
                    )}

                    {/* Metadata grid */}
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {[
                        { label: "شماره ثبت", value: letterResult.registryNumber, icon: Key },
                        { label: "وضعیت", value: STATUS_LABELS[letterResult.status] ?? letterResult.status, icon: FileText },
                        letterResult.subject && { label: "موضوع", value: letterResult.subject, icon: Mail },
                        { label: "نوع نامه", value: TYPE_LABELS[letterResult.type] ?? letterResult.type, icon: FileText },
                        { label: "جهت", value: DIRECTION_LABELS[letterResult.direction] ?? letterResult.direction, icon: FileText },
                        { label: "طبقه‌بندی", value: CLASSIFICATION_LABELS[letterResult.classification] ?? letterResult.classification, icon: Lock },
                        letterResult.senderOrg && { label: "سازمان فرستنده", value: letterResult.senderOrg, icon: Shield },
                        letterResult.signatory && { label: "امضاکننده", value: letterResult.signatory, icon: Shield },
                        letterResult.signatoryRole && { label: "سمت امضاکننده", value: letterResult.signatoryRole, icon: FileText },
                        { label: "تاریخ ایجاد", value: new Date(letterResult.createdAt).toLocaleDateString("fa-IR"), icon: Clock },
                        letterResult.dispatchedAt && { label: "تاریخ ارسال", value: new Date(letterResult.dispatchedAt).toLocaleDateString("fa-IR"), icon: Clock },
                        { label: "رعایت SLA", value: letterResult.slaBreached ? "تأخیر داشته" : "به موقع", icon: AlertTriangle },
                      ].filter(Boolean).map((item: any) => (
                        <div key={item.label} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-blue-300/50 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[10px] text-blue-300/40">{item.label}</p>
                            <p className="text-xs text-white font-medium truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Approval chain */}
                    {letterResult.approvalChain.length > 0 && (
                      <div className="mb-5">
                        <p className="text-xs text-blue-300/60 font-bold mb-3">زنجیره تأیید</p>
                        {letterResult.approvalChain.map((step, i) => (
                          <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center ${step.status === "approved" ? "bg-emerald-500/20" : step.status === "rejected" ? "bg-red-500/20" : "bg-white/10"}`}>
                                {step.status === "approved" ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : step.status === "rejected" ? <XCircle className="w-3.5 h-3.5 text-red-400" /> : <Clock className="w-3.5 h-3.5 text-blue-300/40" />}
                              </div>
                              <p className="text-xs text-white">{step.name}</p>
                            </div>
                            <div className="text-left">
                              {step.completedAt && <p className="text-[9px] text-blue-300/40 font-mono">{new Date(step.completedAt).toLocaleDateString("fa-IR")}</p>}
                              <p className={`text-[10px] font-medium ${STEP_STATUS_COLORS[step.status] ?? "text-blue-300/40"}`}>
                                {step.status === "approved" ? "✓ تأیید" : step.status === "rejected" ? "✗ رد" : step.status === "active" ? "⟳ در جریان" : "○ در انتظار"}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Hash integrity note */}
                    <div className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                      <Lock className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-[10px] text-blue-300/40">یکپارچگی زنجیره هش</p>
                        <p className="text-xs text-white font-mono">
                          {letterScore?.hashIntegrity === 100 ? "✓ زنجیره هش معتبر است" : "⚠ داده‌های کافی برای تأیید زنجیره وجود ندارد"}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* ── OTHER MODES (waybill/cert/permit) — unchanged ────────── */}
                {mode !== "letter" && (
                  <>
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {(mode === "waybill"
                        ? [
                            { label: "نوع سند", value: "بارنامه", icon: FileText },
                            { label: "شماره سند", value: "۱۴۰۳-۴۵۶", icon: Key },
                            { label: "صادرکننده", value: "شرکت نمونه صنعت", icon: Shield },
                            { label: "تاریخ صدور", value: "۱۴۰۳/۰۸/۱۴", icon: Clock },
                          ]
                        : mode === "certificate"
                        ? [
                            { label: "نوع", value: CERT_DATA.docType, icon: FileText },
                            { label: "شماره", value: CERT_DATA.docNumber, icon: Key },
                            { label: "دارنده", value: CERT_DATA.holder, icon: Shield },
                            { label: "شرکت", value: CERT_DATA.company, icon: Clock },
                            { label: "تاریخ صدور", value: CERT_DATA.issueDate, icon: Clock },
                            { label: "تاریخ انقضا", value: CERT_DATA.expiryDate, icon: Clock },
                          ]
                        : [
                            { label: "نوع", value: PERMIT_DATA.docType, icon: FileText },
                            { label: "شماره", value: PERMIT_DATA.docNumber, icon: Key },
                            { label: "شرکت", value: PERMIT_DATA.company, icon: Shield },
                            { label: "حوزه فعالیت", value: PERMIT_DATA.area, icon: Clock },
                            { label: "سطح ریسک", value: PERMIT_DATA.riskLevel, icon: AlertTriangle },
                            { label: "تاریخ انقضا", value: PERMIT_DATA.expiryDate, icon: Clock },
                          ]
                      ).map((item) => (
                        <div key={item.label} className="bg-white/5 rounded-lg p-3 flex items-center gap-3">
                          <item.icon className="w-4 h-4 text-blue-300/50 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-blue-300/40">{item.label}</p>
                            <p className="text-xs text-white font-medium">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-white/5 rounded-lg p-3 mb-5 flex items-center gap-3">
                      <Lock className="w-4 h-4 text-accent" />
                      <div>
                        <p className="text-[10px] text-blue-300/40">مهر زمانی TSA</p>
                        <p className="text-xs text-white font-mono">۱۴۰۳/۰۸/۱۴ ۱۴:۳۲:۱۷</p>
                      </div>
                    </div>
                    <div className="mb-5">
                      <p className="text-xs text-blue-300/60 font-bold mb-3">امضاها</p>
                      {SIGNERS.map((sig, i) => (
                        <div key={i} className="bg-white/5 rounded-lg p-3 mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${sig.valid ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                              {sig.valid ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
                            </div>
                            <div>
                              <p className="text-xs text-white font-medium">{sig.name}</p>
                              <p className="text-[10px] text-blue-300/40">{sig.title} · {sig.serial}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <p className="text-[10px] text-blue-300/40">{sig.datetime}</p>
                            <p className={`text-[10px] font-medium ${sig.valid ? "text-emerald-400" : "text-red-400"}`}>
                              {sig.valid ? "✓ معتبر" : "✗ نامعتبر"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                    {mode === "waybill" && (
                      <div>
                        <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-2 text-xs text-accent font-medium mb-3 hover:underline">
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showHistory ? "rotate-180" : ""}`} />
                          زنجیره اعتماد و تاریخچه
                        </button>
                        {showHistory && (
                          <div className="space-y-4">
                            <div className="bg-white/5 rounded-xl p-4">
                              <p className="text-xs text-blue-300/60 font-bold mb-3">تاریخچه سند</p>
                              {WAYBILL_HISTORY.map((h, i) => (
                                <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${h.valid ? "bg-emerald-500/20" : "bg-red-500/20"}`}>
                                    {h.valid ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <XCircle className="w-3 h-3 text-red-400" />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[10px] text-white">{h.text}</p>
                                    <p className="text-[9px] text-blue-300/40">{h.signer}</p>
                                  </div>
                                  <span className="text-[9px] text-blue-300/40 font-mono">{h.time}</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-white/5 rounded-xl p-4">
                              <p className="text-xs text-blue-300/60 font-bold mb-3">زنجیره اعتماد</p>
                              {CUSTODY_TIMELINE.map((c, i) => (
                                <div key={i} className="flex items-start gap-3 py-2 border-b border-white/5 last:border-0">
                                  <div className="flex flex-col items-center">
                                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                                    {i < CUSTODY_TIMELINE.length - 1 && <div className="w-px h-6 bg-accent/30 mt-1" />}
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-[10px] text-white font-medium">{c.stage}</p>
                                    <p className="text-[9px] text-blue-300/50">{c.entity} — {c.action}</p>
                                    <p className="text-[9px] text-blue-300/30 font-mono">{c.hash}</p>
                                  </div>
                                  <span className="text-[9px] text-blue-300/40 font-mono">{c.time}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Report Modal */}
        {showReport && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowReport(false)}>
            <div className="bg-slate-800 border border-white/10 rounded-2xl p-6 w-96" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Flag className="w-4 h-4 text-red-400" /> گزارش سند مشکوک
              </h3>
              <p className="text-xs text-blue-300/60 mb-4">دلیل گزارش را انتخاب کنید:</p>
              <div className="space-y-2 mb-4">
                {["جعل امضا", "اطلاعات نادرست", "سند تکراری", "تاریخ غیرمعتبر", "سایر"].map((reason) => (
                  <label key={reason} className="flex items-center gap-2 text-xs text-white/80 cursor-pointer">
                    <input type="radio" name="report" className="accent-accent" />
                    {reason}
                  </label>
                ))}
              </div>
              <textarea className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-xs text-white placeholder-blue-300/30 resize-none h-16 mb-4" placeholder="توضیحات اضافه..." />
              <div className="flex gap-2">
                <button onClick={() => setShowReport(false)} className="flex-1 bg-white/10 text-white text-xs font-bold py-2 rounded-lg">انصراف</button>
                <button onClick={() => setShowReport(false)} className="flex-1 bg-red-500/80 text-white text-xs font-bold py-2 rounded-lg">ارسال گزارش</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VerifyPortal;
