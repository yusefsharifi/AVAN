import type { IranianPlateData, PlateType } from "./plateTypes";
import { PLATE_TYPE_CONFIGS, toPersianDigits } from "./plateTypes";

interface IranianPlateDisplayProps {
  province: string;
  letter: string;
  mainNumber: string;
  serial: string;
  type?: PlateType;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { scale: 0.55, gap: 1, font: "text-[11px]", numFont: "text-base", labelFont: "text-[8px]" },
  md: { scale: 0.7, gap: 2, font: "text-xs", numFont: "text-xl", labelFont: "text-[9px]" },
  lg: { scale: 0.9, gap: 3, font: "text-sm", numFont: "text-3xl", labelFont: "text-[10px]" },
  xl: { scale: 1.0, gap: 4, font: "text-base", numFont: "text-4xl", labelFont: "text-xs" },
};

function PlateFlag({ size }: { size: "sm" | "md" | "lg" | "xl" }) {
  const flagSize = size === "sm" ? 12 : size === "md" ? 14 : size === "lg" ? 16 : 20;
  return (
    <svg width={flagSize} height={flagSize * 0.6} viewBox="0 0 30 18" className="flex-shrink-0">
      <rect width="30" height="6" fill="#239F40" />
      <rect y="6" width="30" height="6" fill="#FFFFFF" />
      <rect y="12" width="30" height="6" fill="#DA0000" />
      <g transform="translate(15,9)">
        <text textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="bold" fill="#DA0000" fontFamily="serif">
          ﷲ
        </text>
        <line x1="-4" y1="-5" x2="0" y2="-2" stroke="#DA0000" strokeWidth="0.8" />
        <line x1="4" y1="-5" x2="0" y2="-2" stroke="#DA0000" strokeWidth="0.8" />
        <line x1="-5" y1="-3" x2="-2" y2="0" stroke="#DA0000" strokeWidth="0.5" />
        <line x1="5" y1="-3" x2="2" y2="0" stroke="#DA0000" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

export default function IranianPlateDisplay({
  province,
  letter,
  mainNumber,
  serial,
  type = "private",
  size = "lg",
  showLabel = true,
  className = "",
}: IranianPlateDisplayProps) {
  const cfg = PLATE_TYPE_CONFIGS[type];
  const s = SIZE_MAP[size];

  const pProvince = toPersianDigits(province.padStart(2, "0").slice(-2));
  const pNumber = toPersianDigits(mainNumber.padStart(3, "0").slice(0, 3));
  const pSerial = toPersianDigits(serial.padStart(2, "0").slice(-2));

  const plateWidth = size === "sm" ? 180 : size === "md" ? 240 : size === "lg" ? 310 : 360;
  const plateHeight = Math.round(plateWidth * 0.45);

  const leftPanelWidth = Math.round(plateWidth * 0.17);
  const mainWidth = plateWidth - leftPanelWidth;
  const sectionWidth = Math.round(mainWidth / 4);

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`} dir="ltr">
      <div
        style={{
          width: plateWidth,
          height: plateHeight,
          background: cfg.bgColor,
          border: `2.5px solid ${cfg.borderColor}`,
          borderRadius: Math.round(plateWidth * 0.03),
          display: "flex",
          overflow: "hidden",
          position: "relative",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15), inset 0 0 0 1px rgba(255,255,255,0.3)",
        }}
      >
        {/* Left panel — flag + I.R. IRAN */}
        <div
          style={{
            width: leftPanelWidth,
            height: "100%",
            background: cfg.leftPanelBg,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            flexShrink: 0,
          }}
        >
          <PlateFlag size={size} />
          <span
            style={{
              color: "#FFFFFF",
              fontSize: Math.round(plateWidth * 0.035),
              fontWeight: 700,
              lineHeight: 1.1,
              textAlign: "center",
              fontFamily: "Arial, sans-serif",
              letterSpacing: "0.3px",
            }}
          >
            I.R.
            <br />
            IRAN
          </span>
        </div>

        {/* Main section */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-around",
            padding: `0 ${Math.round(plateWidth * 0.015)}px`,
            position: "relative",
          }}
        >
          {/* Province */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: sectionWidth,
            height: "100%",
          }}>
            <span
              style={{
                fontSize: Math.round(plateHeight * 0.5),
                fontWeight: 800,
                color: cfg.mainNumberColor,
                fontFamily: "Arial, 'Vazirmatn', sans-serif",
                lineHeight: 1,
              }}
            >
              {pProvince}
            </span>
          </div>

          {/* Separator dot */}
          <span style={{ color: cfg.borderColor, fontSize: Math.round(plateHeight * 0.3), fontWeight: 900, opacity: 0.6 }}>•</span>

          {/* Main number */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: sectionWidth * 1.1,
            height: "100%",
          }}>
            <span
              style={{
                fontSize: Math.round(plateHeight * 0.55),
                fontWeight: 800,
                color: cfg.mainNumberColor,
                fontFamily: "Arial, 'Vazirmatn', sans-serif",
                lineHeight: 1,
                letterSpacing: "2px",
              }}
            >
              {pNumber}
            </span>
          </div>

          {/* Letter */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: sectionWidth * 0.8,
            height: "100%",
          }}>
            <span
              style={{
                fontSize: Math.round(plateHeight * 0.5),
                fontWeight: 800,
                color: cfg.letterColor,
                fontFamily: "Arial, 'Vazirmatn', sans-serif",
                lineHeight: 1,
              }}
            >
              {letter || "?"}
            </span>
          </div>

          {/* Separator dot */}
          <span style={{ color: cfg.borderColor, fontSize: Math.round(plateHeight * 0.3), fontWeight: 900, opacity: 0.6 }}>•</span>

          {/* Serial */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: sectionWidth,
            height: "100%",
          }}>
            <span
              style={{
                fontSize: Math.round(plateHeight * 0.5),
                fontWeight: 800,
                color: cfg.serialColor,
                fontFamily: "Arial, 'Vazirmatn', sans-serif",
                lineHeight: 1,
              }}
            >
              {pSerial}
            </span>
          </div>
        </div>

        {/* Bottom text "ایران" — placed at bottom center */}
        <div
          style={{
            position: "absolute",
            bottom: Math.round(plateHeight * 0.02),
            left: leftPanelWidth,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontSize: Math.round(plateHeight * 0.12),
              fontWeight: 700,
              color: cfg.mainNumberColor,
              fontFamily: "Arial, 'Vazirmatn', sans-serif",
              opacity: 0.85,
              letterSpacing: "3px",
            }}
          >
            ایران
          </span>
        </div>

        {/* Thin metallic border overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: Math.round(plateWidth * 0.03),
            border: `0.5px solid rgba(255,255,255,0.15)`,
            pointerEvents: "none",
          }}
        />
      </div>

      {showLabel && (
        <span className="text-[10px] text-muted-foreground font-medium">
          {cfg.labelFa}
        </span>
      )}
    </div>
  );
}
