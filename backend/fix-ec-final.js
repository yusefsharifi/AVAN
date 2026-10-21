const fs = require('fs');
let content = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');

// Find the section between the last entry and "} as const;"
const match = content.match(/(CALIBRATION_OVERDUE:.*?\n)([\s\S]*?)(\} as const;)/);
if (match) {
  // Remove the IoT and M21 sections and re-add them cleanly
  let before = content.substring(0, content.indexOf("CALIBRATION_OVERDUE"));
  before += `  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 },\n`;

  const m21Section = `
  // M21: Super Admin
  ZONE_ALREADY_EXISTS: { code: 'ZONE_ALREADY_EXISTS', message: 'شهرک قبلاً ثبت شده است', httpStatus: 409 },
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', message: 'طرح اشتراک یافت نشد', httpStatus: 404 },
  PLAN_CODE_DUPLICATE: { code: 'PLAN_CODE_DUPLICATE', message: 'کد طرح تکراری است', httpStatus: 409 },
  SUBSCRIPTION_NOT_FOUND: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'اشتراک یافت نشد', httpStatus: 404 },
  SUBSCRIPTION_ALREADY_ACTIVE: { code: 'SUBSCRIPTION_ALREADY_ACTIVE', message: 'اشتراک فعال وجود دارد', httpStatus: 409 },
  FLAG_NOT_FOUND: { code: 'FLAG_NOT_FOUND', message: 'پرچم ویژگی یافت نشد', httpStatus: 404 },
  CONFIG_NOT_FOUND: { code: 'CONFIG_NOT_FOUND', message: 'تنظیمات یافت نشد', httpStatus: 404 },
  ANNOUNCEMENT_NOT_FOUND: { code: 'ANNOUNCEMENT_NOT_FOUND', message: 'اطلاعیه یافت نشد', httpStatus: 404 },
  IMPERSONATION_NOT_FOUND: { code: 'IMPERSONATION_NOT_FOUND', message: 'نشست جایگزینی یافت نشد', httpStatus: 404 },
  HEALTH_CHECK_FAILED: { code: 'HEALTH_CHECK_FAILED', message: 'بررسی سلامت سیستم ناموفق بود', httpStatus: 500 },
} as const;

export type ErrorCodeKey = keyof typeof ERROR_CODES;`;

  content = before + m21Section;
  fs.writeFileSync('src/common/constants/error-codes.ts', content, 'utf-8');
}

// Fix IsString({ each: true }) in create-dtos.ts
let dtos = fs.readFileSync('src/modules/super-admin/dto/create-dtos.ts', 'utf-8');
dtos = dtos.replace(/@IsUUID\(\{ each: true \}\)/g, '@IsString()');
fs.writeFileSync('src/modules/super-admin/dto/create-dtos.ts', dtos, 'utf-8');

console.log('Final fixes applied');
