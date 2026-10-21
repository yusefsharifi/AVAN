import {
  ArrowRight, ArrowLeft, CheckCheck, X, Trash2, Upload, FileText, AlertTriangle,
} from "lucide-react";

import { ShipmentDoc, Shipment, StatusKind, VEHICLES, CARGO_TYPES, DOC_TYPES, DOCK_SLOTS, APPROVERS } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

interface WizardData {
  shipmentNo: string;
  plate: string;
  arrival: string;
  dock: string;
  direction: "in" | "out";
  cargoType: string;
  unNumber: string;
  safetyClass: string;
  emergencyContact: string;
  weight: string;
  packages: string;
  unit: string;
  handling: { refrigerated: boolean; fragile: boolean; oversized: boolean };
  uploadedDocs: ShipmentDoc[];
  docTypeToUpload: string;
  approver: string;
}

interface ShipmentWizardProps {
  wizardStep: number;
  setWizardStep: (step: number) => void;
  wizardData: WizardData;
  setWizardData: React.Dispatch<React.SetStateAction<WizardData>>;
  resetWizard: () => void;
  handleSubmitShipment: () => void;
  shipmentsList: Shipment[];
  setPage: (page: string) => void;
  setShipmentTab: (tab: "list" | "approvals") => void;
}

export default function ShipmentWizard({
  wizardStep, setWizardStep, wizardData, setWizardData,
  resetWizard, handleSubmitShipment, shipmentsList, setPage, setShipmentTab,
}: ShipmentWizardProps) {
  const isHazardous = wizardData.cargoType === "مواد شیمیایی خطرناک";

  const addUploadedDoc = () => {
    setWizardData((w) => ({
      ...w,
      uploadedDocs: [...w.uploadedDocs, { id: `doc-${Date.now()}`, type: w.docTypeToUpload, name: `${w.docTypeToUpload.replace(/\s/g, "-")}-${w.uploadedDocs.length + 1}.pdf` }],
    }));
  };

  const removeUploadedDoc = (id: string) =>
    setWizardData((w) => ({ ...w, uploadedDocs: w.uploadedDocs.filter((d) => d.id !== id) }));

  return (
    <div className="absolute inset-0 bg-background z-50 flex flex-col" dir="rtl">
      <div className="flex items-center justify-between p-5 border-b border-border">
        <button onClick={resetWizard} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-4 h-4" />
        </button>
        <h2 className="text-base font-bold text-primary">ثبت بارنامه جدید</h2>
      </div>

      <div className="flex items-center justify-center py-6 border-b border-border bg-secondary/20">
        {[
          { n: 1, label: "اطلاعات پایه" }, { n: 2, label: "محموله" },
          { n: 3, label: "اسناد" }, { n: 4, label: "تأیید" },
        ].map((s, i, arr) => (
          <div key={s.n} className="flex items-center">
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
                wizardStep > s.n ? "bg-accent border-accent text-white" : wizardStep === s.n ? "bg-white border-accent text-accent" : "bg-white border-border text-muted-foreground"
              }`}>
                {wizardStep > s.n ? <CheckCheck className="w-4 h-4" /> : s.n}
              </div>
              <span className={`text-[11px] text-center w-20 leading-tight ${wizardStep === s.n ? "text-accent font-semibold" : wizardStep > s.n ? "text-foreground" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && <div className={`h-0.5 w-16 mb-4 ${wizardStep > s.n ? "bg-accent" : "bg-border"}`} />}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-xl mx-auto w-full">
          {wizardStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground text-right mb-1">اطلاعات پایه بارنامه</h3>
              <div>
                <label className={labelCls}>شماره بارنامه</label>
                <input dir="ltr" value={wizardData.shipmentNo} onChange={(e) => setWizardData((w) => ({ ...w, shipmentNo: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>پلاک کامیون</label>
                <input dir="rtl" list="plate-options" value={wizardData.plate} onChange={(e) => setWizardData((w) => ({ ...w, plate: e.target.value }))}
                  placeholder="شروع به تایپ برای جستجو..." className={inputCls} />
                <datalist id="plate-options">
                  {VEHICLES.map((v) => <option key={v.plate} value={v.plate} />)}
                </datalist>
              </div>
              <div>
                <label className={labelCls}>زمان تخمینی ورود</label>
                <input type="datetime-local" dir="ltr" value={wizardData.arrival} onChange={(e) => setWizardData((w) => ({ ...w, arrival: e.target.value }))} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>جهت تردد</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setWizardData((w) => ({ ...w, direction: "in" }))}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${wizardData.direction === "in" ? "bg-accent/10 border-accent text-accent" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                    <span>ورودی</span><ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setWizardData((w) => ({ ...w, direction: "out" }))}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${wizardData.direction === "out" ? "bg-amber-50 border-amber-400 text-amber-700" : "border-border text-muted-foreground hover:bg-secondary"}`}>
                    <span>خروجی</span><ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelCls}>انتخاب دوک بارگیری</label>
                <div className="grid grid-cols-3 gap-2">
                  {DOCK_SLOTS.map((d) => (
                    <button key={d.id} disabled={d.busy} onClick={() => setWizardData((w) => ({ ...w, dock: d.label }))}
                      className={`py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                        d.busy ? "border-border bg-secondary text-muted-foreground/50 cursor-not-allowed"
                        : wizardData.dock === d.label ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-foreground hover:bg-secondary"
                      }`}>
                      {d.label}{d.busy && <span className="block text-[9px] mt-0.5">مشغول</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground text-right mb-1">اطلاعات محموله</h3>
              <div>
                <label className={labelCls}>نوع محموله</label>
                <select value={wizardData.cargoType} onChange={(e) => setWizardData((w) => ({ ...w, cargoType: e.target.value }))} className={inputCls}>
                  {CARGO_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              {isHazardous && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-amber-800 text-right flex items-center gap-1.5 justify-end">
                    <span>اطلاعات ایمنی مواد خطرناک</span><AlertTriangle className="w-3.5 h-3.5" />
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelCls}>شماره UN</label>
                      <input dir="ltr" value={wizardData.unNumber} onChange={(e) => setWizardData((w) => ({ ...w, unNumber: e.target.value }))} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>رده ایمنی</label>
                      <input dir="ltr" value={wizardData.safetyClass} onChange={(e) => setWizardData((w) => ({ ...w, safetyClass: e.target.value }))} className={inputCls} />
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>تماس اضطراری</label>
                    <input dir="ltr" value={wizardData.emergencyContact} onChange={(e) => setWizardData((w) => ({ ...w, emergencyContact: e.target.value }))} className={inputCls} />
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>وزن اعلامی (کیلوگرم)</label>
                  <input type="number" dir="ltr" value={wizardData.weight} onChange={(e) => setWizardData((w) => ({ ...w, weight: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>تعداد بسته</label>
                  <input type="number" dir="ltr" value={wizardData.packages} onChange={(e) => setWizardData((w) => ({ ...w, packages: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>واحد بسته‌بندی</label>
                <select value={wizardData.unit} onChange={(e) => setWizardData((w) => ({ ...w, unit: e.target.value }))} className={inputCls}>
                  {["پالت", "کارتن", "بشکه", "دستگاه"].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>الزامات ویژه جابجایی</label>
                <div className="space-y-1.5">
                  {([
                    { id: "refrigerated", label: "نیازمند سردخانه" },
                    { id: "fragile", label: "شکستنی" },
                    { id: "oversized", label: "دارای ابعاد غیرمتعارف" },
                  ] as const).map((h) => (
                    <label key={h.id} className="w-full flex items-center gap-2.5 justify-end p-2.5 rounded-lg border border-border cursor-pointer hover:bg-secondary/50">
                      <span className="text-xs text-foreground">{h.label}</span>
                      <input type="checkbox" checked={(wizardData.handling as any)[h.id]}
                        onChange={(e) => setWizardData((w) => ({ ...w, handling: { ...w.handling, [h.id]: e.target.checked } }))}
                        className="w-4 h-4 accent-accent" />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground text-right mb-1">بارگذاری اسناد</h3>
              <div className="flex items-center gap-2">
                <button onClick={addUploadedDoc} className="px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors flex-shrink-0">
                  بارگذاری
                </button>
                <select value={wizardData.docTypeToUpload} onChange={(e) => setWizardData((w) => ({ ...w, docTypeToUpload: e.target.value }))} className={inputCls}>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <label className="w-full border-2 border-dashed border-border rounded-lg py-8 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-accent transition-colors">
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">فایل را بکشید و رها کنید یا کلیک کنید</span>
                <span className="text-[10px] text-muted-foreground/70">بارنامه، فاکتور، گواهی مواد خطرناک، اظهارنامه گمرکی</span>
                <input type="file" className="hidden" onChange={addUploadedDoc} />
              </label>
              {wizardData.uploadedDocs.length > 0 && (
                <div className="space-y-1.5">
                  {wizardData.uploadedDocs.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/30">
                      <button onClick={() => removeUploadedDoc(d.id)} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[10px] text-muted-foreground font-mono flex-1" dir="ltr">{d.name}</span>
                      <span className="text-[11px] font-medium text-foreground bg-secondary px-2 py-0.5 rounded-full">{d.type}</span>
                      <FileText className="w-4 h-4 text-accent flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {wizardStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-foreground text-right mb-1">بازبینی و تأیید</h3>
              <div className="border border-border rounded-lg p-4 space-y-1.5 text-xs">
                <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{wizardData.shipmentNo}</span><span className="text-muted-foreground">شماره بارنامه</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{wizardData.plate || "—"}</span><span className="text-muted-foreground">پلاک</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground">{wizardData.direction === "in" ? "ورودی" : "خروجی"}</span><span className="text-muted-foreground">جهت</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground">{wizardData.dock || "—"}</span><span className="text-muted-foreground">دوک</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground">{wizardData.cargoType}</span><span className="text-muted-foreground">نوع محموله</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{wizardData.weight || 0} kg</span><span className="text-muted-foreground">وزن</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{wizardData.packages || 0} {wizardData.unit}</span><span className="text-muted-foreground">بسته‌بندی</span></div>
                <div className="flex items-center justify-between"><span className="text-foreground font-mono" dir="ltr">{wizardData.uploadedDocs.length}</span><span className="text-muted-foreground">اسناد پیوست</span></div>
              </div>
              <div>
                <label className={labelCls}>تعیین تأییدکننده</label>
                <select value={wizardData.approver} onChange={(e) => setWizardData((w) => ({ ...w, approver: e.target.value }))} className={inputCls}>
                  {APPROVERS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-5 border-t border-border flex items-center justify-between">
        <button disabled={wizardStep === 1} onClick={() => setWizardStep((s) => s - 1)}
          className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground disabled:opacity-40 flex items-center gap-1.5 hover:bg-secondary transition-colors">
          <span>قبلی</span><ArrowRight className="w-4 h-4" />
        </button>
        {wizardStep < 4 ? (
          <button onClick={() => setWizardStep((s) => s + 1)}
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-accent/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /><span>بعدی</span>
          </button>
        ) : (
          <button onClick={handleSubmitShipment}
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-semibold flex items-center gap-1.5 hover:bg-accent/90 transition-colors">
            <CheckCheck className="w-4 h-4" /><span>ثبت بارنامه و ارسال برای تأیید</span>
          </button>
        )}
      </div>
    </div>
  );
}
