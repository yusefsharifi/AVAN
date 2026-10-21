const fs = require('fs');
let content = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');

// Remove the duplicate PLAN_NOT_FOUND line in the M21 section
content = content.replace(
  "  ZONE_ALREADY_EXISTS: { code: 'ZONE_ALREADY_EXISTS', message: 'شهرک قبلاً ثبت شده است', httpStatus: 409 },\n  PLAN_NOT_FOUND: { code: 'PLAN_NOT_FOUND', message: 'طرح اشتراک یافت نشد', httpStatus: 404 },",
  "  ZONE_ALREADY_EXISTS: { code: 'ZONE_ALREADY_EXISTS', message: 'شهرک قبلاً ثبت شده است', httpStatus: 409 },"
);

fs.writeFileSync('src/common/constants/error-codes.ts', content, 'utf-8');
console.log('Duplicate removed');
