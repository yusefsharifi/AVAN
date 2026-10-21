import { useState } from "react";
import {
  ChevronLeft, ChevronRight, FileText, Users, PenTool, Stamp, Eye,
  Plus, X, GripVertical, Paperclip, AlertCircle, LayoutTemplate,
  AlertTriangle, ShieldAlert, CreditCard, Building2, ClipboardList,
  Handshake, ArrowRight, Check, Package,
} from "lucide-react";
import { LETTER_TEMPLATES, getTemplatesByCategory } from "@/modules/correspondence/data/letterTemplates";
import { resolveTemplate, getManualVariables } from "@/modules/correspondence/utils/templateResolver";
import type { LetterTemplate } from "@/modules/correspondence/types/templates";

// ── Step definitions (Step 0 = template picker, Steps 1–5 = wizard) ───────────
const WIZARD_STEPS = [
  { id: 1, label: "طبقه‌بندی", icon: FileText },
  { id: 2, label: "طرفین", icon: Users },
  { id: 3, label: "متن و پیوست", icon: PenTool },
  { id: 4, label: "امضا و تأیید", icon: Stamp },
  { id: 5, label: "بازبینی و ارسال", icon: Eye },
];

const CATEGORY_LABELS: Record<string, string> = {
  permit: "مجوزها",
  hse: "ایمنی و بهداشت",
  finance: "امور مالی",
  onboarding: "پذیرش و ورود",
  lease: "قراردادها",
  general: "عمومی",
};

const CATEGORY_COLORS: Record<string, string> = {
  permit: "bg-blue-50 border-blue-200 text-blue-700",
  hse: "bg-red-50 border-red-200 text-red-700",
  finance: "bg-emerald-50 border-emerald-200 text-emerald-700",
  onboarding: "bg-violet-50 border-violet-200 text-violet-700",
  lease: "bg-amber-50 border-amber-200 text-amber-700",
  general: "bg-slate-50 border-slate-200 text-slate-700",
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText, AlertTriangle, ShieldAlert, CreditCard, Building2, ClipboardList, Handshake, Package,
};

// ── Form shape ────────────────────────────────────────────────────────────────
interface Recipient { name: string; org: string; action: "action" | "info" | "reference"; }
interface Attachment { name: string; size: string; description: string; }
interface Approver { name: string; role: string; type: "reviewer" | "approver" | "signer"; }

const DIRECTIONS = [
  { value: "outgoing", label: "خروجی" },
  { value: "incoming", label: "ورودی" },
  { value: "internal", label: "داخلی" },
];
const TYPES = [
  { value: "official", label: "رسمی" }, { value: "memo", label: "یادداشت" },
  { value: "circular", label: "بخشنامه" }, { value: "report", label: "گزارش" },
  { value: "instruction", label: "دستورالعمل" }, { value: "request", label: "درخواست" },
  { value: "response", label: "پاسخ" },
];
const CLASSIFICATIONS = [
  { value: "unclassified", label: "عادی" }, { value: "confidential", label: "محرمانه" },
  { value: "restricted", label: "محرمانه خیلی" },
];
const PRIORITIES = [
  { value: "instant", label: "فوری" }, { value: "urgent", label: "ضروری" },
  { value: "normal", label: "عادی" }, { value: "low", label: "کم‌اهمیت" },
];
const CLOSINGS = ["با احترام", "با تقدیم احترام", "با احترام و ارادت", "موفق باشید"];

const blankForm = () => ({
  direction: "outgoing" as string,
  type: "official" as string,
  classification: "unclassified" as string,
  priority: "normal" as string,
  subject: "",
  referenceLetterId: "",
  sender: "",
  senderOrg: "",
  recipients: [] as Recipient[],
  cc: [] as string[],
  referenceRecipients: [] as string[],
  salutation: "بسمه تعالی",
  body: "",
  closing: "با احترام",
  attachments: [] as Attachment[],
  signatory: "",
  signatoryRole: "",
  approvers: [] as Approver[],
});

interface ComposeWizardProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function ComposeWizard({ onBack, onSubmit }: ComposeWizardProps) {
  // 0 = template picker, 1–5 = wizard steps
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [manualValues, setManualValues] = useState<Record<string, string>>({});
  const [form, setForm] = useState(blankForm());
  const [newRecipient, setNewRecipient] = useState<Recipient>({ name: "", org: "", action: "action" });
  const [newApprover, setNewApprover] = useState<Approver>({ name: "", role: "", type: "reviewer" });
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const updateForm = (patch: Partial<typeof form>) => setForm(prev => ({ ...prev, ...patch }));

  // ── Template selection ──────────────────────────────────────────────────────
  const applyTemplate = (template: LetterTemplate) => {
    setSelectedTemplate(template);
    const manualVars = getManualVariables(template);
    if (manualVars.length > 0) {
      // Stay on step 0 to fill in manual vars first; flag handled in UI
      const initial: Record<string, string> = {};
      manualVars.forEach(v => { initial[v.key] = v.defaultValue ?? ""; });
      setManualValues(initial);
    } else {
      commitTemplate(template, {});
    }
  };

  const commitTemplate = (template: LetterTemplate, manuals: Record<string, string>) => {
    const resolved = resolveTemplate(template, {
      company: { nameFa: form.senderOrg || "شرکت" },
      manualValues: manuals,
    });
    setForm(prev => ({
      ...prev,
      direction: resolved.direction ?? prev.direction,
      type: resolved.type ?? prev.type,
      classification: resolved.classification ?? prev.classification,
      priority: resolved.priority ?? prev.priority,
      subject: resolved.subject ?? prev.subject,
      body: resolved.body ?? prev.body,
      closing: resolved.closing ?? prev.closing,
      approvers: resolved.approvalChain?.map((s: any) => ({
        name: s.assigneeName,
        role: s.assigneeRole,
        type: s.type,
      })) ?? prev.approvers,
    }));
    setStep(1);
  };

  const skipTemplate = () => {
    setSelectedTemplate(null);
    setForm(blankForm());
    setStep(1);
  };

  // ── Recipients ──────────────────────────────────────────────────────────────
  const addRecipient = () => {
    if (!newRecipient.name) return;
    updateForm({ recipients: [...form.recipients, newRecipient] });
    setNewRecipient({ name: "", org: "", action: "action" });
  };
  const removeRecipient = (i: number) =>
    updateForm({ recipients: form.recipients.filter((_, j) => j !== i) });

  // ── Approvers ───────────────────────────────────────────────────────────────
  const addApprover = () => {
    if (!newApprover.name) return;
    updateForm({ approvers: [...form.approvers, newApprover] });
    setNewApprover({ name: "", role: "", type: "reviewer" });
  };
  const removeApprover = (i: number) =>
    updateForm({ approvers: form.approvers.filter((_, j) => j !== i) });

  const handleDragStart = (i: number) => setDragIndex(i);
  const handleDragOver = (e: React.DragEvent, i: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === i) return;
    const items = [...form.approvers];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(i, 0, moved);
    updateForm({ approvers: items });
    setDragIndex(i);
  };
  const handleDragEnd = () => setDragIndex(null);

  const canNext = () => {
    if (step === 1) return form.subject.length > 0;
    if (step === 2) return form.recipients.length > 0;
    if (step === 3) return form.body.length > 0;
    if (step === 4) return form.signatory.length > 0 && form.approvers.length > 0;
    return true;
  };
  const next = () => { if (canNext() && step < 5) setStep(step + 1); };
  const prev = () => { if (step > 1) setStep(step - 1); };

  const generateRegistryNumber = () => {
    const typeCode = form.type === "official" ? "O" : form.type === "memo" ? "M" :
      form.type === "circular" ? "C" : form.type === "report" ? "R" :
      form.type === "instruction" ? "I" : form.type === "request" ? "Q" : "P";
    return `KVH-1403/${typeCode}/0001`;
  };
  const recipientActionLabels: Record<string, string> = { action: "اقدام", info: "اطلاع", reference: "رونوشت" };
  const byCategory = getTemplatesByCategory();
  const categories = Object.keys(byCategory);
  const visibleTemplates = activeCategory
    ? byCategory[activeCategory] ?? []
    : LETTER_TEMPLATES;
  const manualVars = selectedTemplate ? getManualVariables(selectedTemplate) : [];
  const allManualFilled = manualVars.every(v => manualValues[v.key]?.trim());

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-white px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-foreground">ایجاد نامه جدید</h2>
          {step > 0 && (
            <span className="text-[10px] text-muted-foreground font-mono">{generateRegistryNumber()}</span>
          )}
        </div>

        {/* Step indicator */}
        {step === 0 ? (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-bold">
              <LayoutTemplate className="w-3 h-3" />
              انتخاب قالب
            </div>
            <div className="w-4 h-px bg-border" />
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary text-muted-foreground text-[10px]">
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </div>
                {i < WIZARD_STEPS.length - 1 && <div className="w-4 h-px mx-1 bg-border" />}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStep(0)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 text-[10px] font-medium cursor-pointer"
            >
              <LayoutTemplate className="w-3 h-3" />
              انتخاب قالب
            </button>
            <div className="w-4 h-px bg-emerald-300" />
            {WIZARD_STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button
                  onClick={() => s.id <= step && setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] transition-colors ${
                    s.id === step ? "bg-accent text-white font-bold"
                    : s.id < step ? "bg-emerald-100 text-emerald-700"
                    : "bg-secondary text-muted-foreground"
                  } ${s.id <= step ? "cursor-pointer" : "cursor-default"}`}
                >
                  <s.icon className="w-3 h-3" />
                  {s.label}
                </button>
                {i < WIZARD_STEPS.length - 1 && (
                  <div className={`w-4 h-px mx-1 ${s.id < step ? "bg-emerald-300" : "bg-border"}`} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-6">

        {/* ── STEP 0: Template picker ───────────────────────────────────────── */}
        {step === 0 && (
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-sm font-bold text-foreground">انتخاب قالب نامه</h3>
                <p className="text-xs text-muted-foreground mt-0.5">از یک قالب آماده شروع کنید یا نامه آزاد بنویسید</p>
              </div>
              <button
                onClick={skipTemplate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                بدون قالب — نامه آزاد
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Category filter chips */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button
                onClick={() => setActiveCategory(null)}
                className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                  activeCategory === null ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                همه
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                  className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-colors ${
                    activeCategory === cat
                      ? `${CATEGORY_COLORS[cat]} border-current`
                      : "border-border text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {CATEGORY_LABELS[cat] ?? cat}
                </button>
              ))}
            </div>

            {/* Template grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {visibleTemplates.map(template => {
                const Icon = ICON_MAP[template.icon] ?? FileText;
                const catColor = CATEGORY_COLORS[template.category] ?? "bg-slate-50 border-slate-200 text-slate-700";
                const isSelected = selectedTemplate?.id === template.id;
                return (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className={`text-right p-4 rounded-xl border-2 transition-all hover:shadow-sm ${
                      isSelected ? "border-accent bg-accent/5" : "border-border bg-card hover:border-accent/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center border flex-shrink-0 ${catColor}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground leading-tight">{template.nameFa}</p>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-1 border ${catColor}`}>
                          {CATEGORY_LABELS[template.category] ?? template.category}
                        </span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-accent flex-shrink-0" />}
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed line-clamp-2">
                      {template.descriptionFa}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] text-muted-foreground">SLA: {template.slaHours}h</span>
                      <span className="text-[9px] text-muted-foreground">·</span>
                      <span className="text-[9px] text-muted-foreground">{template.approvalChainTemplate.length} مرحله تأیید</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Manual variable filling panel */}
            {selectedTemplate && manualVars.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-xs font-bold text-amber-800 mb-3 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  لطفاً فیلدهای زیر را تکمیل کنید
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {manualVars.map(v => (
                    <div key={v.key}>
                      <label className="text-[10px] text-amber-700 mb-1 block font-medium">{v.labelFa}</label>
                      <input
                        type="text"
                        value={manualValues[v.key] ?? ""}
                        onChange={e => setManualValues(prev => ({ ...prev, [v.key]: e.target.value }))}
                        placeholder={v.labelFa}
                        className="w-full border border-amber-300 bg-white rounded-lg py-1.5 px-3 text-xs text-foreground focus:outline-none focus:border-accent"
                      />
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    if (allManualFilled && selectedTemplate) {
                      commitTemplate(selectedTemplate, manualValues);
                    }
                  }}
                  disabled={!allManualFilled}
                  className="mt-3 w-full bg-accent text-white text-xs font-bold py-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent/90 transition-colors"
                >
                  اعمال قالب و ادامه
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── STEP 1: Classification ────────────────────────────────────────── */}
        {step === 1 && (
          <div className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">طبقه‌بندی نامه</h3>
              {selectedTemplate && (
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-accent/10 text-accent font-medium flex items-center gap-1">
                  <LayoutTemplate className="w-3 h-3" />
                  قالب: {selectedTemplate.nameFa}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">جهت</label>
                <div className="flex gap-2 flex-wrap">
                  {DIRECTIONS.map((d) => (
                    <button key={d.value} onClick={() => updateForm({ direction: d.value })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.direction === d.value ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">نوع نامه</label>
                <select value={form.type} onChange={(e) => updateForm({ type: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground">
                  {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">رده طبقه‌بندی</label>
                <select value={form.classification} onChange={(e) => updateForm({ classification: e.target.value })}
                  className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground">
                  {CLASSIFICATIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">اولویت</label>
                <div className="flex gap-2 flex-wrap">
                  {PRIORITIES.map((p) => (
                    <button key={p.value} onClick={() => updateForm({ priority: p.value })}
                      className={`px-3 py-2 rounded-lg text-xs border transition-colors ${form.priority === p.value ? "bg-accent text-white border-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">موضوع</label>
              <input type="text" value={form.subject} onChange={(e) => updateForm({ subject: e.target.value })}
                placeholder="موضوع نامه..."
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">شماره نامه مرجع (اختیاری)</label>
              <input type="text" value={form.referenceLetterId} onChange={(e) => updateForm({ referenceLetterId: e.target.value })}
                placeholder="شماره نامه‌ای که به آن ارجاع می‌دهید..."
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
            </div>
          </div>
        )}

        {/* ── STEP 2: Parties ──────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground mb-4">طرفین نامه</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">فرستنده</label>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" value={form.sender} onChange={(e) => updateForm({ sender: e.target.value })}
                  placeholder="نام فرستنده" className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
                <input type="text" value={form.senderOrg} onChange={(e) => updateForm({ senderOrg: e.target.value })}
                  placeholder="سازمان فرستنده" className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">گیرندگان اصلی</label>
              {form.recipients.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.recipients.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border">
                      <span className="text-xs text-foreground flex-1">{r.name} ({r.org})</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">{recipientActionLabels[r.action]}</span>
                      <button onClick={() => removeRecipient(i)}><X className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={newRecipient.name} onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                  placeholder="نام گیرنده" className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
                <input type="text" value={newRecipient.org} onChange={(e) => setNewRecipient({ ...newRecipient, org: e.target.value })}
                  placeholder="سازمان" className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
                <select value={newRecipient.action} onChange={(e) => setNewRecipient({ ...newRecipient, action: e.target.value as any })}
                  className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground">
                  <option value="action">اقدام</option>
                  <option value="info">اطلاع</option>
                  <option value="reference">رونوشت</option>
                </select>
                <button onClick={addRecipient} className="bg-accent text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">رونوشت (CC)</label>
              <input type="text" placeholder="افزودن رونوشت..." className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
            </div>
          </div>
        )}

        {/* ── STEP 3: Body ─────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground mb-4">متن و پیوست‌ها</h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">خط افتتاحیه</label>
              <input type="text" value={form.salutation} onChange={(e) => updateForm({ salutation: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">متن نامه</label>
              <textarea value={form.body} onChange={(e) => updateForm({ body: e.target.value })}
                rows={12} placeholder="متن نامه را بنویسید..."
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent resize-none leading-relaxed" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">خط پایانی</label>
              <select value={form.closing} onChange={(e) => updateForm({ closing: e.target.value })}
                className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground">
                {CLOSINGS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">پیوست‌ها</label>
              {form.attachments.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.attachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border">
                      <Paperclip className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-foreground flex-1">{a.name} ({a.size})</span>
                      <button onClick={() => updateForm({ attachments: form.attachments.filter((_, j) => j !== i) })}>
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button onClick={() => updateForm({ attachments: [...form.attachments, { name: `فایل_${form.attachments.length + 1}.pdf`, size: "1.2 MB", description: "پیوست جدید" }] })}
                className="flex items-center gap-1 text-xs text-accent hover:text-accent/80">
                <Plus className="w-3 h-3" />
                افزودن پیوست
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Signature chain ───────────────────────────────────────── */}
        {step === 4 && (
          <div className="max-w-2xl space-y-4">
            <h3 className="text-sm font-bold text-foreground mb-4">امضا و زنجیره تأیید</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">امضاکننده</label>
                <input type="text" value={form.signatory} onChange={(e) => updateForm({ signatory: e.target.value })}
                  placeholder="نام امضاکننده" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">سمت</label>
                <input type="text" value={form.signatoryRole} onChange={(e) => updateForm({ signatoryRole: e.target.value })}
                  placeholder="سمت امضاکننده" className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">زنجیره تأیید (با کشیدن مرتب کنید)</label>
              {form.approvers.length > 0 && (
                <div className="space-y-1 mb-2">
                  {form.approvers.map((a, i) => (
                    <div key={i} draggable onDragStart={() => handleDragStart(i)} onDragOver={(e) => handleDragOver(e, i)} onDragEnd={handleDragEnd}
                      className={`flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2 border border-border cursor-move ${dragIndex === i ? "opacity-50" : ""}`}>
                      <GripVertical className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs font-bold text-accent">{i + 1}</span>
                      <span className="text-xs text-foreground flex-1">{a.name} ({a.role})</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                        {a.type === "reviewer" ? "بررسی‌کننده" : a.type === "approver" ? "تأییدکننده" : "امضاکننده"}
                      </span>
                      <button onClick={() => removeApprover(i)}><X className="w-3 h-3 text-muted-foreground" /></button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <input type="text" value={newApprover.name} onChange={(e) => setNewApprover({ ...newApprover, name: e.target.value })}
                  placeholder="نام" className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
                <input type="text" value={newApprover.role} onChange={(e) => setNewApprover({ ...newApprover, role: e.target.value })}
                  placeholder="سمت" className="flex-1 bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent" />
                <select value={newApprover.type} onChange={(e) => setNewApprover({ ...newApprover, type: e.target.value as any })}
                  className="bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground">
                  <option value="reviewer">بررسی‌کننده</option>
                  <option value="approver">تأییدکننده</option>
                  <option value="signer">امضاکننده</option>
                </select>
                <button onClick={addApprover} className="bg-accent text-white px-3 py-2 rounded-lg"><Plus className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 5: Review ────────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="max-w-3xl">
            <h3 className="text-sm font-bold text-foreground mb-4">پیش‌نمایش و ارسال</h3>
            <div className="bg-white rounded-lg border border-border shadow-sm p-12 mb-6" style={{ aspectRatio: "210/297", maxHeight: "600px" }}>
              <div className="text-center mb-8">
                <p className="text-xs text-muted-foreground">{form.senderOrg || "نام سازمان"}</p>
              </div>
              <div className="flex justify-between items-start mb-6 text-xs text-muted-foreground">
                <span className="font-mono">{generateRegistryNumber()}</span>
                <span>{new Date().toLocaleDateString("fa-IR")}</span>
              </div>
              <p className="text-xs mb-2">{form.salutation}</p>
              {form.recipients.length > 0 && (
                <p className="text-xs mb-4">به: {form.recipients.map((r) => r.name).join("، ")}</p>
              )}
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap mb-4">{form.body || "متن نامه در اینجا نمایش داده می‌شود..."}</p>
              <p className="text-sm mb-8">{form.closing}</p>
              <div className="text-center">
                <p className="text-xs font-medium text-foreground">{form.signatory || "نام امضاکننده"}</p>
                <p className="text-[10px] text-muted-foreground">{form.signatoryRole}</p>
              </div>
              {form.attachments.length > 0 && (
                <div className="mt-8 pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground mb-1">پیوست‌ها:</p>
                  {form.attachments.map((a, i) => (
                    <p key={i} className="text-[10px] text-muted-foreground">{i + 1}. {a.name}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 justify-center">
              <button className="px-6 py-2.5 rounded-lg border border-border text-xs font-medium text-foreground hover:bg-secondary">
                ذخیره پیش‌نویس
              </button>
              <button className="px-6 py-2.5 rounded-lg bg-secondary text-xs font-medium text-foreground hover:bg-secondary/80">
                ارسال برای تأیید
              </button>
              <button onClick={onSubmit} className="px-6 py-2.5 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90">
                ارسال نهایی
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="border-t border-border px-6 py-3 flex items-center justify-between bg-white flex-shrink-0">
        <button
          onClick={step <= 1 ? (step === 0 ? onBack : () => setStep(0)) : prev}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ChevronRight className="w-3.5 h-3.5 rotate-180" />
          {step === 0 ? "انصراف" : step === 1 ? "بازگشت به انتخاب قالب" : "مرحله قبل"}
        </button>
        <div className="flex items-center gap-2">
          {step > 0 && !canNext() && step < 5 && (
            <span className="flex items-center gap-1 text-[10px] text-amber-600">
              <AlertCircle className="w-3 h-3" />
              فیلدهای ضروری را تکمیل کنید
            </span>
          )}
          {step === 0 ? (
            <button onClick={skipTemplate} className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold">
              نامه آزاد
            </button>
          ) : step < 5 ? (
            <button onClick={next} disabled={!canNext()}
              className="px-4 py-2 rounded-lg bg-accent text-white text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              مرحله بعد
            </button>
          ) : (
            <span className="text-[10px] text-muted-foreground">آماده ارسال</span>
          )}
        </div>
      </div>
    </div>
  );
}
