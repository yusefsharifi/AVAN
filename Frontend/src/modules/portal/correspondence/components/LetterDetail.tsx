import { useState } from "react";
import {
  ChevronLeft, Printer, Forward, Archive, AlertCircle, CheckCircle2,
  Clock, FileText, StickyNote, MessageSquare, RotateCcw, XCircle, Send,
  QrCode, Copy, X, Check,
} from "lucide-react";
import { LetterV2, LETTERS_V2 } from "@/entities/letter";
import { ConfirmDialog } from "@/shared/components/feedback/ConfirmDialog";

const DIRECTION_LABELS: Record<string, string> = { incoming: "ورودی", outgoing: "خروجی", internal: "داخلی" };
const TYPE_LABELS: Record<string, string> = { official: "رسمی", memo: "یادداشت", circular: "بخشنامه", report: "گزارش", instruction: "دستورالعمل", request: "درخواست", response: "پاسخ" };
const CLASSIFICATION_LABELS: Record<string, string> = { unclassified: "عادی", confidential: "محرمانه", restricted: "محرمانه خیلی" };
const PRIORITY_MAP: Record<string, { fa: string; text: string; bg: string }> = {
  instant: { fa: "فوری", text: "text-red-700", bg: "bg-red-50" },
  urgent: { fa: "ضروری", text: "text-amber-700", bg: "bg-amber-50" },
  normal: { fa: "عادی", text: "text-slate-600", bg: "bg-slate-100" },
  low: { fa: "کم‌اهمیت", text: "text-blue-700", bg: "bg-blue-50" },
};
const STATUS_LABELS: Record<string, string> = {
  draft: "پیش‌نویس", "pending-approval": "در انتظار تأیید", approved: "تأیید شده",
  sent: "ارسال شده", dispatched: "ارسال شده", archived: "بایگانی شده",
};
const CHAIN_STATUS_LABELS: Record<string, string> = { pending: "در انتظار", approved: "تأیید شد", rejected: "رد شد", returned: "برگشت" };
const CHAIN_STATUS_COLORS: Record<string, string> = { pending: "bg-secondary text-muted-foreground", approved: "bg-emerald-500 text-white", rejected: "bg-red-500 text-white", returned: "bg-amber-500 text-white" };

const ANNOTATION_COLORS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#f3e8ff", "#ffedd5"];

interface LetterDetailProps {
  letter: LetterV2;
  onBack: () => void;
}

export function LetterDetail({ letter, onBack }: LetterDetailProps) {
  const [annotations, setAnnotations] = useState(letter.annotations || []);
  const [newAnnotation, setNewAnnotation] = useState("");
  const [annotationColor, setAnnotationColor] = useState(ANNOTATION_COLORS[0]);
  const [confirmAction, setConfirmAction] = useState<"approve" | "reject" | "return" | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const verifyUrl = `${window.location.origin}/verify?mode=letter&hash=${letter.qrHash ?? letter.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const overdue = letter.responseDeadline && new Date(letter.responseDeadline) < new Date() && letter.status !== "archived" && letter.status !== "sent";

  const handleApprove = () => {
    setConfirmAction(null);
    // In real app: update approval chain
  };
  const handleReject = () => {
    setConfirmAction(null);
  };
  const handleReturn = () => {
    setConfirmAction(null);
  };
  const addAnnotation = () => {
    if (!newAnnotation.trim()) return;
    setAnnotations([...annotations, {
      id: `ann-${Date.now()}`,
      author: "کاربر فعلی",
      date: new Date().toLocaleDateString("fa-IR"),
      text: newAnnotation,
      color: annotationColor,
    }]);
    setNewAnnotation("");
  };

  return (
    <div className="flex-1 overflow-auto" dir="rtl">
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
          بازگشت به لیست
        </button>

        {/* Title bar */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded text-muted-foreground">{letter.registryNumber}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded ${PRIORITY_MAP[letter.priority]?.bg} ${PRIORITY_MAP[letter.priority]?.text}`}>
                {PRIORITY_MAP[letter.priority]?.fa}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{DIRECTION_LABELS[letter.direction]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{TYPE_LABELS[letter.type]}</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary text-muted-foreground">{CLASSIFICATION_LABELS[letter.classification]}</span>
              {overdue && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-red-50 text-red-700">
                  <AlertCircle className="w-3 h-3" />
                  تأخیر در پاسخ
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-foreground">{letter.subject}</h2>
            <p className="text-[10px] text-muted-foreground mt-1">
              ثبت: {letter.createdAt} · بروزرسانی: {letter.updatedAt}
              {letter.responseDeadline && ` · مهلت پاسخ: ${letter.responseDeadline}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-lg hover:bg-secondary border border-border text-muted-foreground">
              <Printer className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary border border-border text-muted-foreground">
              <Forward className="w-4 h-4" />
            </button>
            <button className="p-2 rounded-lg hover:bg-secondary border border-border text-muted-foreground">
              <Archive className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowQR(true)}
              className="p-2 rounded-lg hover:bg-secondary border border-border text-muted-foreground"
              title="کد QR اعتبارسنجی"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="bg-secondary/50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div><span className="text-muted-foreground">فرستنده: </span><span className="text-foreground font-medium">{letter.sender}</span> <span className="text-muted-foreground">({letter.senderOrg})</span></div>
            <div><span className="text-muted-foreground">امضاکننده: </span><span className="text-foreground">{letter.signatory}</span> <span className="text-muted-foreground">({letter.signatoryRole})</span></div>
            <div><span className="text-muted-foreground">گیرندگان: </span><span className="text-foreground">{letter.recipients.map((r) => r.name).join(", ")}</span></div>
            {letter.cc.length > 0 && <div><span className="text-muted-foreground">رونوشت: </span><span className="text-foreground">{letter.cc.join(", ")}</span></div>}
            {letter.dispatchRecord && (
              <div><span className="text-muted-foreground">نحوه ارسال: </span><span className="text-foreground">{letter.dispatchRecord.method} {letter.dispatchRecord.trackingNumber && `(${letter.dispatchRecord.trackingNumber})`}</span></div>
            )}
            {letter.archiveLocation && (
              <div><span className="text-muted-foreground">محل بایگانی: </span><span className="text-foreground">{letter.archiveLocation.box}/{letter.archiveLocation.folder} - قفسه {letter.archiveLocation.shelf}</span></div>
            )}
          </div>
        </div>

        {/* Physical document status */}
        {letter.direction === "incoming" && (
          <div className="bg-secondary/30 rounded-lg p-4 mb-6 border border-border">
            <p className="text-xs font-bold text-foreground mb-2">سند فیزیکی</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={letter.archiveLocation?.physicalReceived || false} readOnly className="accent-accent" />
                دریافت سند فیزیکی
              </label>
              <label className="flex items-center gap-2 text-xs text-foreground">
                <input type="checkbox" checked={letter.archiveLocation?.scanUploaded || false} readOnly className="accent-accent" />
                اسکن بارگذاری شده
              </label>
            </div>
            {letter.dispatchRecord && (
              <div className="grid grid-cols-4 gap-3 mt-3 text-xs">
                <div><span className="text-muted-foreground">روش: </span><span className="text-foreground">{letter.dispatchRecord.method}</span></div>
                <div><span className="text-muted-foreground">ارسال‌کننده: </span><span className="text-foreground">{letter.dispatchRecord.dispatcher}</span></div>
                <div><span className="text-muted-foreground">تاریخ: </span><span className="text-foreground">{letter.dispatchRecord.timestamp}</span></div>
                {letter.dispatchRecord.receivedBy && <div><span className="text-muted-foreground">دریافت‌کننده: </span><span className="text-foreground">{letter.dispatchRecord.receivedBy}</span></div>}
              </div>
            )}
          </div>
        )}

        {/* Body */}
        <div className="mb-6">
          <p className="text-xs font-bold text-foreground mb-2">متن نامه</p>
          <div className="bg-white rounded-lg border border-border p-4">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{letter.body}</p>
            {letter.closing && <p className="text-sm text-foreground/90 mt-4">{letter.closing}</p>}
          </div>
        </div>

        {/* Attachments */}
        {letter.attachments.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-foreground mb-2">پیوست‌ها ({letter.attachments.length})</p>
            <div className="space-y-2">
              {letter.attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3 border border-border">
                  <FileText className="w-4 h-4 text-accent" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-foreground">{att.name}</p>
                    <p className="text-[10px] text-muted-foreground">{att.description} · {att.size}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approval chain */}
        <div className="mb-6">
          <p className="text-xs font-bold text-foreground mb-3">مسیر گردش و تأیید</p>
          <div className="space-y-2">
            {letter.approvalChain.map((step, i) => {
              const isOverdueStep = step.status === "pending" && letter.responseDeadline && new Date(letter.responseDeadline) < new Date();
              return (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdueStep ? "border-red-300 bg-red-50/50" : "border-border bg-secondary/30"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${CHAIN_STATUS_COLORS[step.status]}`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">{step.name}</span>
                      <span className="text-[10px] text-muted-foreground">({step.role})</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{step.name} · {CHAIN_STATUS_LABELS[step.status]}</p>
                    {step.comment && <p className="text-[10px] text-amber-600 mt-0.5">{step.comment}</p>}
                  </div>
                  {step.date && <span className="text-[10px] text-muted-foreground font-mono">{step.date}</span>}
                  {isOverdueStep && (
                    <span className="flex items-center gap-1 text-[10px] text-red-600">
                      <Clock className="w-3 h-3" />
                      تأخیر
                    </span>
                  )}
                  {step.status === "pending" && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setConfirmAction("approve")} className="p-1.5 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200" title="تأیید">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmAction("return")} className="p-1.5 rounded bg-amber-100 text-amber-700 hover:bg-amber-200" title="برگشت">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setConfirmAction("reject")} className="p-1.5 rounded bg-red-100 text-red-700 hover:bg-red-200" title="رد">
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Annotations */}
        <div className="mb-6">
          <p className="text-xs font-bold text-foreground mb-3">یادداشت‌ها و حاشیه‌نویسی</p>
          <div className="space-y-2">
            {annotations.map((ann) => (
              <div key={ann.id} className="rounded-lg p-3 border border-border" style={{ backgroundColor: ann.color }}>
                <div className="flex items-center gap-2 mb-1">
                  <StickyNote className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-foreground">{ann.author}</span>
                  <span className="text-[10px] text-muted-foreground">{ann.date}</span>
                </div>
                <p className="text-xs text-foreground/80">{ann.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex gap-1">
              {ANNOTATION_COLORS.map((c) => (
                <button key={c} onClick={() => setAnnotationColor(c)} className={`w-5 h-5 rounded-full border-2 ${annotationColor === c ? "border-accent" : "border-transparent"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
            <input
              type="text"
              value={newAnnotation}
              onChange={(e) => setNewAnnotation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addAnnotation()}
              placeholder="یادداشت جدید..."
              className="flex-1 bg-secondary border border-border rounded-lg py-1.5 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent"
            />
            <button onClick={addAnnotation} className="bg-accent text-white text-xs px-3 py-1.5 rounded-lg">
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Physical document linking for incoming */}
        {letter.direction === "incoming" && (
          <div className="mb-6">
            <p className="text-xs font-bold text-foreground mb-2">لینک سند فیزیکی</p>
            <div className="bg-secondary/30 rounded-lg p-4 border border-border">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="text-muted-foreground mb-1 block">روش ارسال</label>
                  <select className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground">
                    <option value="courier">پیک</option>
                    <option value="post">پست</option>
                    <option value="hand">حضوری</option>
                    <option value="fax">فکس</option>
                  </select>
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block">شماره رهگیری</label>
                  <input type="text" placeholder="اختیاری" className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground placeholder-muted-foreground" />
                </div>
                <div>
                  <label className="text-muted-foreground mb-1 block">محل بایگانی</label>
                  <input type="text" placeholder="قفسه / پوشه" className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2 text-xs text-foreground placeholder-muted-foreground" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialogs */}
      <ConfirmDialog
        open={confirmAction === "approve"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleApprove}
        title="تأیید نامه"
        description="آیا از تأیید این نامه اطمینان دارید؟"
        confirmText="تأیید"
        variant="warning"
      />
      <ConfirmDialog
        open={confirmAction === "reject"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReject}
        title="رد نامه"
        description="آیا از رد این نامه اطمینان دارید؟"
        confirmText="رد"
        variant="danger"
      />
      <ConfirmDialog
        open={confirmAction === "return"}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleReturn}
        title="برگشت برای اصلاح"
        description="نامه برای اصلاح به فرستنده برگردانده می‌شود."
        confirmText="برگشت"
        variant="warning"
      />

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <QrCode className="w-4 h-4 text-accent" />
                کد QR اعتبارسنجی
              </h3>
              <button onClick={() => setShowQR(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR visual (placeholder — swap with qrcode package in production) */}
            <div className="bg-white rounded-xl p-4 mb-4 flex items-center justify-center">
              <div className="w-40 h-40 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  <rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="12" y="12" width="16" height="16" rx="1" fill="#000"/>
                  <rect x="65" y="5" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="72" y="12" width="16" height="16" rx="1" fill="#000"/>
                  <rect x="5" y="65" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="12" y="72" width="16" height="16" rx="1" fill="#000"/>
                  {[40,44,48,52,56,60].map(x => [40,44,48,52,56,60].map(y =>
                    Math.sin(x * y) > 0.3 ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#000"/> : null
                  ))}
                  <rect x="40" y="5" width="3" height="3" fill="#000"/>
                  <rect x="48" y="5" width="3" height="3" fill="#000"/>
                  <rect x="56" y="5" width="3" height="3" fill="#000"/>
                  <rect x="65" y="40" width="3" height="3" fill="#000"/>
                  <rect x="68" y="48" width="3" height="3" fill="#000"/>
                </svg>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-2 mb-4">
              <p className="text-[9px] text-muted-foreground text-center font-mono break-all leading-relaxed">{verifyUrl}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2 rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'کپی شد!' : 'کپی لینک'}
              </button>
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground py-2 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                چاپ QR
              </button>
            </div>

            <p className="text-[9px] text-muted-foreground text-center mt-3">
              شماره ثبت: {letter.registryNumber} · هش: {String(letter.qrHash ?? letter.id).slice(0, 12)}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
