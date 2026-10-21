const fs = require('fs');
let content = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');

// Remove the duplicate SCALE entries from the IoT section (lines 602-603)
content = content.replace(
  "  SCALE_OVERLOAD: { code: 'SCALE_OVERLOAD', message: 'باسکول بیش از حد بارگذاری شده', httpStatus: 400 },\n  SCALE_NOT_STABLE: { code: 'SCALE_NOT_STABLE', message: 'وزن پایدار نیست', httpStatus: 400 },\n  GPS_SIGNAL_LOST:",
  "  GPS_SIGNAL_LOST:"
);

fs.writeFileSync('src/common/constants/error-codes.ts', content, 'utf-8');
console.log('Duplicate error codes removed');
