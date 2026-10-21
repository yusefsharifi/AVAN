export type PlateType =
  | "private"
  | "taxi"
  | "public"
  | "government"
  | "military"
  | "police"
  | "disabled"
  | "temporary";

export interface PlateTypeConfig {
  id: PlateType;
  labelFa: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  leftPanelBg: string;
  mainNumberColor: string;
  letterColor: string;
  serialColor: string;
  provinceColor: string;
}

export const PERSIAN_LETTERS = [
  "ب", "ج", "د", "س", "ص", "ط", "ق", "ل", "م", "ن", "و", "ه", "ی",
] as const;

export type PersianLetter = (typeof PERSIAN_LETTERS)[number];

export const PROVINCE_CODES: Record<string, string> = {
  "00": "مرکز",
  "11": "آذربایجان شرقی",
  "12": "آذربایجان غربی",
  "13": "اردبیل",
  "14": "اصفهان",
  "15": "البرز",
  "16": "ایلام",
  "17": "بوشهر",
  "18": "تهران",
  "19": "چهارمحال بختیاری",
  "20": "خراسان جنوبی",
  "21": "تهران",
  "22": "خراسان رضوی",
  "23": "خراسان شمالی",
  "24": "خوزستان",
  "25": "زنجان",
  "26": "سمنان",
  "27": "سیستان بلوچستان",
  "28": "فارس",
  "29": "قزوین",
  "30": "قم",
  "31": "کردستان",
  "32": "کرمان",
  "33": "کرمانشاه",
  "34": "کهکیلویه بویراحمد",
  "35": "گلستان",
  "36": "گیلان",
  "37": "لرستان",
  "38": "مازندران",
  "39": "مرکزی",
  "40": "هرمزگان",
  "41": "همدان",
  "42": "یزد",
  "44": "تهران (ویژه)",
  "45": "آذربایجان شرقی (۲)",
  "46": "اصفهان (۲)",
  "47": "فارس (۲)",
  "48": "مازندران (۲)",
  "49": "خوزستان (۲)",
  "50": "خراسان رضوی (۲)",
  "51": "گیلان (۲)",
  "52": "البرز (۲)",
  "55": "سایر",
  "60": "سپاه/بسیج",
  "61": "نیروی انتظامی",
  "62": "نیروی زمینی ارتش",
  "63": "نیروی دریایی ارتش",
  "64": "نیروی هوایی ارتش",
  "65": "ستاد مشترک ارتش",
  "66": "وزارت دفاع",
  "67": "سایر نیروهای مسلح",
  "68": "سایر نیروهای مسلح",
  "69": "سایر نیروهای مسلح",
  "70": "سپاه (۲)",
  "71": "نیروی انتظامی (۲)",
  "72": "نیروی زمینی (۲)",
  "73": "نیروی دریایی (۲)",
  "74": "نیروی هوایی (۲)",
  "88": "سفارت/کنکوری",
  "99": "موقت/گمرک",
};

export const VALID_PROVINCES = Object.keys(PROVINCE_CODES);

export const PLATE_TYPE_CONFIGS: Record<PlateType, PlateTypeConfig> = {
  private: {
    id: "private",
    labelFa: "شخصی",
    bgColor: "#FFFFFF",
    textColor: "#1A3A6B",
    borderColor: "#1A3A6B",
    leftPanelBg: "#1A3A6B",
    mainNumberColor: "#1A3A6B",
    letterColor: "#1A3A6B",
    serialColor: "#1A3A6B",
    provinceColor: "#FFFFFF",
  },
  taxi: {
    id: "taxi",
    labelFa: "تاکسی",
    bgColor: "#FFD700",
    textColor: "#000000",
    borderColor: "#000000",
    leftPanelBg: "#000000",
    mainNumberColor: "#000000",
    letterColor: "#000000",
    serialColor: "#000000",
    provinceColor: "#FFFFFF",
  },
  public: {
    id: "public",
    labelFa: "عمومی",
    bgColor: "#FFFFFF",
    textColor: "#CC0000",
    borderColor: "#CC0000",
    leftPanelBg: "#CC0000",
    mainNumberColor: "#CC0000",
    letterColor: "#CC0000",
    serialColor: "#CC0000",
    provinceColor: "#FFFFFF",
  },
  government: {
    id: "government",
    labelFa: "دولتی",
    bgColor: "#FFFFFF",
    textColor: "#1A3A6B",
    borderColor: "#1A3A6B",
    leftPanelBg: "#1A3A6B",
    mainNumberColor: "#1A3A6B",
    letterColor: "#1A3A6B",
    serialColor: "#1A3A6B",
    provinceColor: "#FFFFFF",
  },
  military: {
    id: "military",
    labelFa: "نظامی",
    bgColor: "#2D5A27",
    textColor: "#FFFFFF",
    borderColor: "#1A3D16",
    leftPanelBg: "#1A3D16",
    mainNumberColor: "#FFFFFF",
    letterColor: "#FFFFFF",
    serialColor: "#FFFFFF",
    provinceColor: "#FFFFFF",
  },
  police: {
    id: "police",
    labelFa: "پلیس",
    bgColor: "#2D5A27",
    textColor: "#FFFFFF",
    borderColor: "#1A3D16",
    leftPanelBg: "#1A3D16",
    mainNumberColor: "#FFFFFF",
    letterColor: "#FFFFFF",
    serialColor: "#FFFFFF",
    provinceColor: "#FFFFFF",
  },
  disabled: {
    id: "disabled",
    labelFa: "معلولین",
    bgColor: "#1A5276",
    textColor: "#FFFFFF",
    borderColor: "#0E3A5E",
    leftPanelBg: "#0E3A5E",
    mainNumberColor: "#FFFFFF",
    letterColor: "#FFFFFF",
    serialColor: "#FFFFFF",
    provinceColor: "#FFFFFF",
  },
  temporary: {
    id: "temporary",
    labelFa: "موقت",
    bgColor: "#CC0000",
    textColor: "#FFFFFF",
    borderColor: "#990000",
    leftPanelBg: "#990000",
    mainNumberColor: "#FFFFFF",
    letterColor: "#FFFFFF",
    serialColor: "#FFFFFF",
    provinceColor: "#FFFFFF",
  },
};

export interface IranianPlateData {
  province: string;
  letter: PersianLetter | string;
  mainNumber: string;
  serial: string;
  type: PlateType;
}

export interface ValidationResult {
  valid: boolean;
  errors: {
    province?: string;
    letter?: string;
    mainNumber?: string;
    serial?: string;
  };
}

export function parsePlateString(plateStr: string): IranianPlateData | null {
  const cleaned = plateStr.replace(/\s/g, "");
  const iranMatch = cleaned.match(/^(\d{2,3})([بجددسصطقلمنوهی])(\d{3,4})ایران$/);
  if (iranMatch) {
    let province = iranMatch[1];
    const letter = iranMatch[2];
    let rest = iranMatch[3];
    if (province.length === 3 && rest.length === 3) {
      province = province.substring(0, 2);
      rest = province.substring(2) + rest;
    }
    if (rest.length === 4) {
      return {
        province,
        letter,
        mainNumber: rest.substring(0, 3),
        serial: rest.substring(3),
        type: "private",
      };
    }
    if (rest.length === 3) {
      return {
        province,
        letter,
        mainNumber: rest,
        serial: "00",
        type: "private",
      };
    }
  }
  return null;
}

export function formatPlateString(data: IranianPlateData): string {
  return `${data.province} ${data.letter} ${data.mainNumber} ${data.serial}`;
}

export function formatPlateFull(data: IranianPlateData): string {
  return `${data.province}${data.letter}${data.mainNumber}${data.serial} ایران`;
}

export function validatePlateData(data: IranianPlateData): ValidationResult {
  const errors: ValidationResult["errors"] = {};

  if (!data.province || !VALID_PROVINCES.includes(data.province)) {
    errors.province = "کد استان نامعتبر است";
  }

  if (!data.letter || !(PERSIAN_LETTERS as readonly string[]).includes(data.letter)) {
    errors.letter = `حرف پلاک باید یکی از حروف ${PERSIAN_LETTERS.join("، ")} باشد`;
  }

  if (!data.mainNumber || !/^\d{3}$/.test(data.mainNumber)) {
    errors.mainNumber = "عدد پلاک باید ۳ رقم باشد";
  }

  if (!data.serial || !/^\d{2}$/.test(data.serial)) {
    errors.serial = "سریال پلاک باید ۲ رقم باشد";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export const toPersianDigits = (str: string): string => {
  const map: Record<string, string> = {
    "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
    "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
  };
  return str.replace(/[0-9]/g, (d) => map[d] ?? d);
};

export const toEnglishDigits = (str: string): string => {
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  };
  return str.replace(/[۰-۹]/g, (d) => map[d] ?? d);
};
