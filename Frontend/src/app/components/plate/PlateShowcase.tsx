import { useState } from "react";
import type { PlateType } from "./plateTypes";
import { PLATE_TYPE_CONFIGS } from "./plateTypes";
import IranianPlateDisplay from "./IranianPlateDisplay";
import IranianPlateInput from "./IranianPlateInput";

export default function PlateShowcase() {
  const [activeTab, setActiveTab] = useState<"display" | "input">("display");
  const [inputResult, setInputResult] = useState("");

  const demoPlates: { province: string; letter: string; number: string; serial: string; type: PlateType }[] = [
    { province: "21", letter: "ب", number: "۳۴۵", serial: "۶۷", type: "private" },
    { province: "18", letter: "ت", number: "۷۸۹", serial: "۱۲", type: "taxi" },
    { province: "15", letter: "ص", number: "۴۵۶", serial: "۳۴", type: "public" },
    { province: "21", letter: "د", number: "۱۲۳", serial: "۵۶", type: "government" },
    { province: "60", letter: "ل", number: "۸۹۰", serial: "۷۸", type: "military" },
    { province: "61", letter: "ن", number: "۲۳۴", serial: "۹۰", type: "police" },
    { province: "21", letter: "م", number: "۵۶۷", serial: "۴۵", type: "disabled" },
    { province: "99", letter: "و", number: "۳۴۵", serial: "۱۲", type: "temporary" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("display")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "display" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          نمایش پلاک
        </button>
        <button
          onClick={() => setActiveTab("input")}
          className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === "input" ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}
        >
          ورود پلاک
        </button>
      </div>

      {/* Display showcase */}
      {activeTab === "display" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">انواع پلاک ایران</h3>
            <div className="grid grid-cols-2 gap-5">
              {demoPlates.map((p) => {
                const cfg = PLATE_TYPE_CONFIGS[p.type];
                return (
                  <div key={p.type} className="flex flex-col items-center gap-2 p-4 rounded-lg border border-border bg-secondary/10">
                    <IranianPlateDisplay
                      province={p.province}
                      letter={p.letter}
                      mainNumber={p.number}
                      serial={p.serial}
                      type={p.type}
                      size="md"
                    />
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="w-3 h-3 rounded border" style={{ background: cfg.bgColor, borderColor: cfg.borderColor }} />
                      <span>{cfg.labelFa}</span>
                      <span>•</span>
                      <span className="font-mono" dir="ltr">
                        {p.province} {p.letter} {p.number} {p.serial}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Size variants */}
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">اندازه‌های مختلف</h3>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {(["sm", "md", "lg", "xl"] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <IranianPlateDisplay
                    province="21"
                    letter="ب"
                    mainNumber="۳۴۵"
                    serial="۶۷"
                    type="private"
                    size={s}
                  />
                  <span className="text-[10px] text-muted-foreground">{s === "sm" ? "کوچک" : s === "md" ? "متوسط" : s === "lg" ? "بزرگ" : "خیلی بزرگ"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Input showcase */}
      {activeTab === "input" && (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">ورود اطلاعات پلاک</h3>
            <IranianPlateInput
              initialProvince="21"
              initialLetter="ب"
              initialNumber="۳۴۵"
              initialSerial="۶۷"
              initialType="private"
              size="lg"
              onChange={(data) => setInputResult(JSON.stringify(data, null, 2))}
            />
          </div>
          <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-5">
            <h3 className="text-sm font-semibold text-foreground mb-4 text-right">خروجی داده</h3>
            <pre className="text-[11px] text-foreground bg-secondary/30 rounded-lg p-3 overflow-auto max-h-80 font-mono" dir="ltr">
              {inputResult || "منتظر ورود اطلاعات..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
