import { X } from "lucide-react";
import { MapLayerExt, MapDeviceExt, StatusKind } from "@/entities/document";
import { MAP_LAYER_DEFS_EXT } from "@/entities/document";

interface DeviceModalProps {
  open: boolean;
  onClose: () => void;
  mode: "add" | "edit";
  form: { label: string; layer: MapLayerExt; model: string; status: StatusKind };
  setForm: React.Dispatch<React.SetStateAction<{ label: string; layer: MapLayerExt; model: string; status: StatusKind }>>;
  onConfirm: () => void;
}

export const DeviceModal = ({ open, onClose, mode, form, setForm, onConfirm }: DeviceModalProps) => {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-96 z-50" dir="rtl">
        <div className="flex items-center justify-between mb-4">
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
          <p className="text-sm font-bold text-foreground">{mode === "add" ? "افزودن دستگاه جدید" : "ویرایش مشخصات دستگاه"}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نام دستگاه</label>
            <input dir="rtl" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="مثال: دوربین انبار شماره ۲"
              className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">نوع دستگاه</label>
            <select value={form.layer} onChange={(e) => setForm((f) => ({ ...f, layer: e.target.value as MapLayerExt }))}
              className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent">
              {MAP_LAYER_DEFS_EXT.map((l) => <option key={l.id} value={l.id}>{l.emoji} {l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">مدل دستگاه</label>
            <input dir="ltr" value={form.model} onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))} placeholder="مثال: Hikvision DS-2CD2T"
              className="w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block text-right">وضعیت</label>
            <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
              {(["online", "warning", "offline"] as const).map((s) => (
                <button key={s} onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${form.status === s ? "bg-primary text-white" : "text-muted-foreground"}`}>
                  {s === "online" ? "آنلاین" : s === "warning" ? "هشدار" : "آفلاین"}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={!form.label.trim()}
            onClick={onConfirm}
            className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
            {mode === "add" ? "افزودن دستگاه" : "ذخیره تغییرات"}
          </button>
        </div>
      </div>
    </>
  );
};
