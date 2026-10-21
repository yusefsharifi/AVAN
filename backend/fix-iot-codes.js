const fs = require('fs');
const file = 'src/common/constants/error-codes.ts';
let content = fs.readFileSync(file, 'utf-8');

const iotErrors = `
  // M20: IoT
  DEVICE_NOT_FOUND: { code: 'DEVICE_NOT_FOUND', message: 'دستگاه یافت نشد', httpStatus: 404 },
  DEVICE_OFFLINE: { code: 'DEVICE_OFFLINE', message: 'دستگاه آفلاین است', httpStatus: 503 },
  DEVICE_DECOMMISSIONED: { code: 'DEVICE_DECOMMISSIONED', message: 'دستگاه از رده خارج شده است', httpStatus: 410 },
  DEVICE_ID_DUPLICATE: { code: 'DEVICE_ID_DUPLICATE', message: 'شناسه دستگاه تکراری است', httpStatus: 409 },
  DEVICE_MQTT_ERROR: { code: 'DEVICE_MQTT_ERROR', message: 'خطای MQTT', httpStatus: 503 },
  COMMAND_NOT_FOUND: { code: 'COMMAND_NOT_FOUND', message: 'دستور یافت نشد', httpStatus: 404 },
  COMMAND_TIMEOUT: { code: 'COMMAND_TIMEOUT', message: 'دستور منقضی شد', httpStatus: 408 },
  COMMAND_FAILED: { code: 'COMMAND_FAILED', message: 'دستور ناموفق بود', httpStatus: 500 },
  COMMAND_DEVICE_OFFLINE: { code: 'COMMAND_DEVICE_OFFLINE', message: 'دستگاه برای دریافت دستور آفلاین است', httpStatus: 503 },
  BARRIER_ALREADY_OPEN: { code: 'BARRIER_ALREADY_OPEN', message: 'راهبند قبلاً باز شده است', httpStatus: 409 },
  BARRIER_STUCK: { code: 'BARRIER_STUCK', message: 'راهبند گیر کرده است', httpStatus: 500 },
  BARRIER_EMERGENCY_STOP: { code: 'BARRIER_EMERGENCY_STOP', message: 'توقف اضطراری راهبند', httpStatus: 500 },
  SCALE_OVERLOAD: { code: 'SCALE_OVERLOAD', message: 'باسکول بیش از حد بارگذاری شده', httpStatus: 400 },
  SCALE_NOT_STABLE: { code: 'SCALE_NOT_STABLE', message: 'وزن پایدار نیست', httpStatus: 400 },
  GPS_SIGNAL_LOST: { code: 'GPS_SIGNAL_LOST', message: 'سیگنال GPS از دست رفته', httpStatus: 503 },
  RFID_CARD_NOT_FOUND: { code: 'RFID_CARD_NOT_FOUND', message: 'کارت RFID یافت نشد', httpStatus: 404 },
  GEOFENCE_NOT_FOUND: { code: 'GEOFENCE_NOT_FOUND', message: 'منطقه جغرافیایی یافت نشد', httpStatus: 404 },
  HEARTBEAT_EXPIRED: { code: 'HEARTBEAT_EXPIRED', message: '心跳 منقضی شد', httpStatus: 503 },
  MQTT_NOT_CONNECTED: { code: 'MQTT_NOT_CONNECTED', message: 'اتصال MQTT برقرار نیست', httpStatus: 503 },
  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 },`;

content = content.replace(
  "  EXPORT_GENERATION_FAILED: { code: 'EXPORT_GENERATION_FAILED', message: 'تولید فایل خروجی ناموفق بود', httpStatus: 500 },",
  "  EXPORT_GENERATION_FAILED: { code: 'EXPORT_GENERATION_FAILED', message: 'تولید فایل خروجی ناموفق بود', httpStatus: 500 }," + iotErrors
);

fs.writeFileSync(file, content, 'utf-8');
console.log('IoT error codes added');
