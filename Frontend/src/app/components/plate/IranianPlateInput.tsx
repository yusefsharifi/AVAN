import { useState, useCallback, useEffect, useRef } from "react";
import type { PlateType, PersianLetter, ValidationResult } from "./plateTypes";
import {
  PERSIAN_LETTERS,
  PLATE_TYPE_CONFIGS,
  PROVINCE_CODES,
  validatePlateData,
  toPersianDigits,
  toEnglishDigits,
} from "./plateTypes";
import IranianPlateDisplay from "./IranianPlateDisplay";

interface IranianPlateInputProps {
  initialProvince?: string;
  initialLetter?: string;
  initialNumber?: string;
  initialSerial?: string;
  initialType?: PlateType;
  onChange?: (data: {
    province: string;
    letter: string;
    mainNumber: string;
    serial: string;
    type: PlateType;
    fullPlate: string;
    isValid: boolean;
  }) => void;
  showTypeSelector?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const inputBase =
  "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent text-center font-mono";

const errorCls =
  "border-red-400 bg-red-50 text-red-700 focus:border-red-500";

export default function IranianPlateInput({
  initialProvince = "21",
  initialLetter = "ب",
  initialNumber = "۳۴۵",
  initialSerial = "۶۷",
  initialType = "private",
  onChange,
  showTypeSelector = true,
  size = "lg",
  className = "",
}: IranianPlateInputProps) {
  const [province, setProvince] = useState(toEnglishDigits(initialProvince));
  const [letter, setLetter] = useState(initialLetter);
  const [mainNumber, setMainNumber] = useState(toEnglishDigits(initialNumber));
  const [serial, setSerial] = useState(toEnglishDigits(initialSerial));
  const [plateType, setPlateType] = useState<PlateType>(initialType);
  const [touched, setTouched] = useState({
    province: false,
    letter: false,
    mainNumber: false,
    serial: false,
  });
  const [validation, setValidation] = useState<ValidationResult>({
    valid: true,
    errors: {},
  });

  const serialRef = useRef<HTMLInputElement>(null);
  const letterRef = useRef<HTMLSelectElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);

  // Filter valid province keys (2-digit codes only)
  const validProvinceKeys = Object.keys(PROVINCE_CODES).filter((k) => k.length === 2);

  const plateData = {
    province,
    letter,
    mainNumber,
    serial,
    type: plateType,
  };

  const fullPlate = `${province}${letter}${mainNumber}${serial}`;

  const runValidation = useCallback(
    (data: typeof plateData) => {
      const result = validatePlateData(data);
      setValidation(result);
      return result;
    },
    []
  );

  // Notify parent on change
  const prevValue = useRef("");
  useEffect(() => {
    const current = `${province}|${letter}|${mainNumber}|${serial}|${plateType}`;
    if (current === prevValue.current) return;
    prevValue.current = current;

    const v = runValidation({
      province,
      letter,
      mainNumber,
      serial,
    });
    onChange?.({
      province,
      letter,
      mainNumber,
      serial,
      type: plateType,
      fullPlate,
      isValid: v.valid,
    });
  }, [province, letter, mainNumber, serial, plateType, fullPlate, onChange, runValidation]);

  const handleProvinceChange = (val: string) => {
    const digits = val.replace(/[^0-9۰-۹]/g, "");
    const eng = toEnglishDigits(digits).slice(0, 2);
    setProvince(eng);
    setTouched((t) => ({ ...t, province: true }));
  };

  const handleNumberChange = (val: string) => {
    const digits = val.replace(/[^0-9۰-۹]/g, "");
    const eng = toEnglishDigits(digits).slice(0, 3);
    setMainNumber(eng);
    setTouched((t) => ({ ...t, mainNumber: true }));
  };

  const handleSerialChange = (val: string) => {
    const digits = val.replace(/[^0-9۰-۹]/g, "");
    const eng = toEnglishDigits(digits).slice(0, 2);
    setSerial(eng);
    setTouched((t) => ({ ...t, serial: true }));
  };

  const handleLetterChange = (val: string) => {
    setLetter(val);
    setTouched((t) => ({ ...t, letter: true }));
  };

  const showError = (field: keyof typeof touched) => {
    return touched[field] && validation.errors[field];
  };

  const cfg = PLATE_TYPE_CONFIGS[plateType];

  return (
    <div className={`space-y-4 ${className}`} dir="rtl">
      {/* Live preview */}
      <div className="flex justify-center bg-secondary/30 rounded-xl p-4 border border-border">
        <IranianPlateDisplay
          province={province || "??"}
          letter={letter || "?"}
          mainNumber={mainNumber || "???"}
          serial={serial || "??"}
          type={plateType}
          size={size}
        />
      </div>

      {/* Plate type selector */}
      {showTypeSelector && (
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">نوع پلاک:</label>
          <div className="flex items-center gap-1 flex-wrap">
            {(Object.keys(PLATE_TYPE_CONFIGS) as PlateType[]).map((t) => (
              <button
                key={t}
                onClick={() => setPlateType(t)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border ${
                  plateType === t
                    ? "border-accent bg-accent/10 text-accent ring-1 ring-accent/30"
                    : "border-border text-muted-foreground hover:border-accent/30"
                }`}
              >
                {PLATE_TYPE_CONFIGS[t].labelFa}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input fields */}
      <div className="grid grid-cols-4 gap-3">
        {/* Province */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block text-center">
            کد استان
          </label>
          <select
            value={province}
            onChange={(e) => handleProvinceChange(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, province: true }))}
            className={`${inputBase} ${showError("province") ? errorCls : ""} text-center`}
            dir="ltr"
          >
            <option value="">--</option>
            {validProvinceKeys.map((code) => (
              <option key={code} value={code}>
                {toPersianDigits(code)} — {PROVINCE_CODES[code]}
              </option>
            ))}
          </select>
          {showError("province") && (
            <p className="text-[10px] text-red-500 mt-1 text-center">{validation.errors.province}</p>
          )}
        </div>

        {/* Main number */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block text-center">
            عدد سه رقمی
          </label>
          <input
            ref={numberRef}
            type="text"
            inputMode="numeric"
            value={toPersianDigits(mainNumber)}
            onChange={(e) => handleNumberChange(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, mainNumber: true }))}
            placeholder="۳۴۵"
            className={`${inputBase} ${showError("mainNumber") ? errorCls : ""} text-center`}
            dir="ltr"
            maxLength={3}
          />
          {showError("mainNumber") && (
            <p className="text-[10px] text-red-500 mt-1 text-center">{validation.errors.mainNumber}</p>
          )}
        </div>

        {/* Letter */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block text-center">
            حرف
          </label>
          <select
            ref={letterRef}
            value={PERSIAN_LETTERS.includes(letter as PersianLetter) ? letter : ""}
            onChange={(e) => handleLetterChange(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, letter: true }))}
            className={`${inputBase} ${showError("letter") ? errorCls : ""} text-center`}
          >
            <option value="">—</option>
            {PERSIAN_LETTERS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          {showError("letter") && (
            <p className="text-[10px] text-red-500 mt-1 text-center">{validation.errors.letter}</p>
          )}
        </div>

        {/* Serial */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground mb-1 block text-center">
            سریال
          </label>
          <input
            ref={serialRef}
            type="text"
            inputMode="numeric"
            value={toPersianDigits(serial)}
            onChange={(e) => handleSerialChange(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, serial: true }))}
            placeholder="۶۷"
            className={`${inputBase} ${showError("serial") ? errorCls : ""} text-center`}
            dir="ltr"
            maxLength={2}
          />
          {showError("serial") && (
            <p className="text-[10px] text-red-500 mt-1 text-center">{validation.errors.serial}</p>
          )}
        </div>
      </div>

      {/* Full plate readout */}
      <div className="bg-card border border-border rounded-lg p-2 flex items-center justify-center gap-2">
        <span className="text-xs text-muted-foreground">پلاک کامل:</span>
        <span className="text-sm font-bold text-foreground font-mono tracking-wider" dir="ltr">
          {toPersianDigits(province || "??")}{" "}
          {letter || "?"}{" "}
          {toPersianDigits(mainNumber || "???")}{" "}
          {toPersianDigits(serial || "??")}{" "}
          ایران
        </span>
      </div>

      {/* Color config preview */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
        <span>رنگ‌بندی:</span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border" style={{ background: cfg.bgColor, borderColor: cfg.borderColor }} />
          <span>پس‌زمینه</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: cfg.textColor }} />
          <span>متن</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded" style={{ background: cfg.leftPanelBg }} />
          <span>نوار کناری</span>
        </span>
      </div>
    </div>
  );
}
