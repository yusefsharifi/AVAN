import { X } from "lucide-react";
import { HSEIncident } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface IncidentForm {
  type: HSEIncident["type"]; severity: HSEIncident["severity"]; location: string;
  description: string; injuredCount: number; immediateActions: string; reportedBy: string; assignedTo: string;
}

interface IncidentModalProps {
  incidentForm: IncidentForm;
  setIncidentForm: React.Dispatch<React.SetStateAction<IncidentForm>>;
  setIncidentsList: React.Dispatch<React.SetStateAction<HSEIncident[]>>;
  setModalOpen: (open: boolean) => void;
}

const TYPE_LABELS: Record<HSEIncident["type"], string> = {
  security: "امنیتی", hse: "HSE", fire: "آتش‌سوزی", medical: "پزشکی", theft: "سرقت", environmental: "محیط زیست",
};
const SEVERITY_LABELS: Record<HSEIncident["severity"], string> = {
  low: "کم", medium: "متوسط", high: "زیاد", critical: "بحرانی",
};

export default function IncidentModal({ incidentForm, setIncidentForm, setIncidentsList, setModalOpen }: IncidentModalProps) {
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[30rem] z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">ثبت حادثه جدید</p>
        </div>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={labelCls}>نوع حادثه</label>
              <select dir="rtl" value={incidentForm.type} onChange={(e) => setIncidentForm((f) => ({ ...f, type: e.target.value as HSEIncident["type"] }))} className={inputCls}>
                {Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>شدت</label>
              <select dir="rtl" value={incidentForm.severity} onChange={(e) => setIncidentForm((f) => ({ ...f, severity: e.target.value as HSEIncident["severity"] }))} className={inputCls}>
                {Object.entries(SEVERITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div><label className={labelCls}>محل حادثه</label><input dir="rtl" value={incidentForm.location} onChange={(e) => setIncidentForm((f) => ({ ...f, location: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>توضیحات</label><textarea dir="rtl" rows={3} value={incidentForm.description} onChange={(e) => setIncidentForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><label className={labelCls}>تعداد مصدوم</label><input type="number" dir="ltr" min={0} value={incidentForm.injuredCount} onChange={(e) => setIncidentForm((f) => ({ ...f, injuredCount: Number(e.target.value) }))} className={inputCls} /></div>
            <div><label className={labelCls}>گزارش‌دهنده</label><input dir="rtl" value={incidentForm.reportedBy} onChange={(e) => setIncidentForm((f) => ({ ...f, reportedBy: e.target.value }))} className={inputCls} /></div>
          </div>
          <div><label className={labelCls}>اقدامات فوری</label><input dir="rtl" value={incidentForm.immediateActions} onChange={(e) => setIncidentForm((f) => ({ ...f, immediateActions: e.target.value }))} className={inputCls} /></div>
          <div><label className={labelCls}>مسئول پیگیری</label><input dir="rtl" value={incidentForm.assignedTo} onChange={(e) => setIncidentForm((f) => ({ ...f, assignedTo: e.target.value }))} className={inputCls} /></div>
          <button
            disabled={!incidentForm.location.trim() || !incidentForm.description.trim()}
            onClick={() => {
              const newIncident: HSEIncident = {
                id: `INC-${String(11 + Math.random() * 1000).slice(0, 3).padStart(3, '0')}`,
                date: '۱۴۰۳/۰۴/۱۶', time: new Date().toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }),
                type: incidentForm.type, severity: incidentForm.severity, location: incidentForm.location,
                description: incidentForm.description, injuredCount: incidentForm.injuredCount,
                immediateActions: incidentForm.immediateActions, reportedBy: incidentForm.reportedBy || "—",
                assignedTo: incidentForm.assignedTo || "—", status: 'logged',
                timeline: [{ action: 'ثبت حادثه', by: incidentForm.reportedBy || "سیستم", date: '۱۴۰۳/۰۴/۱۶' }],
              };
              setIncidentsList((list) => [newIncident, ...list]);
              setModalOpen(false);
            }}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            ثبت حادثه
          </button>
        </div>
      </div>
    </>
  );
}
