const fs = require('fs');

// Add error codes
let ec = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');
const iotErrors = `
  // M21: Super Admin
  ZONE_ALREADY_EXISTS: { code: 'ZONE_ALREADY_EXISTS', message: 'شهرک قبلاً ثبت شده است', httpStatus: 409 },
  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', message: 'طرح اشتراک یافت نشد', httpStatus: 404 },
  PLAN_CODE_DUPLICATE: { code: 'PLAN_CODE_DUPLICATE', message: 'کد طرح تکراری است', httpStatus: 409 },
  SUBSCRIPTION_NOT_FOUND: { code: 'SUBSCRIPTION_NOT_FOUND', message: 'اشتراک یافت نشد', httpStatus: 404 },
  SUBSCRIPTION_ALREADY_ACTIVE: { code: 'SUBSCRIPTION_ALREADY_ACTIVE', message: 'اشتراک فعال وجود دارد', httpStatus: 409 },
  FLAG_NOT_FOUND: { code: 'FLAG_NOT_FOUND', message: 'پرچم ویژگی یافت نشد', httpStatus: 404 },
  CONFIG_NOT_FOUND: { code: 'CONFIG_NOT_FOUND', message: 'تنظیمات یافت نشد', httpStatus: 404 },
  ANNOUNCEMENT_NOT_FOUND: { code: 'ANNOUNCEMENT_NOT_FOUND', message: 'اطلاعیه یافت نشد', httpStatus: 404 },
  IMPersonATION_NOT_FOUND: { code: 'IMPERSONATION_NOT_FOUND', message: 'نشست جایگزینی یافت نشد', httpStatus: 404 },
  HEALTH_CHECK_FAILED: { code: 'HEALTH_CHECK_FAILED', message: 'بررسی سلامت سیستم ناموفق بود', httpStatus: 500 },`;

ec = ec.replace(
  "  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 },",
  "  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 }," + iotErrors
);
fs.writeFileSync('src/common/constants/error-codes.ts', ec, 'utf-8');

// Add Redis keys
let rk = fs.readFileSync('src/common/utils/redis-keys.ts', 'utf-8');
const m21Keys = `
  // M21: Super Admin
  SYS_HEALTH: 10,
  PLATFORM_KPIS: 5 * 60,
  CONFIG: 30 * 60,
  MAINTENANCE: 60,
  SUPER_IMPERSONATION: 120 * 60,
  ZONE_OVERVIEW: 5 * 60,
  PLAN_COMPARISON: 60 * 60,`;

rk = rk.replace(
  "  IOT_VEHICLE_POSITION: 2 * 60,                                    // 2 min",
  "  IOT_VEHICLE_POSITION: 2 * 60,                                    // 2 min," + m21Keys
);
fs.writeFileSync('src/common/utils/redis-keys.ts', rk, 'utf-8');

console.log('M21 error codes and Redis keys added');
