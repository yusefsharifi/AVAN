const fs = require('fs');
const file = 'src/common/utils/redis-keys.ts';
let content = fs.readFileSync(file, 'utf-8');

const iotKeys = `
  // M20: IoT
  IOT_HEARTBEAT: (interval: number) => interval * 2,              // 2x heartbeat interval
  IOT_BARRIER: 60,                                                 // 60 sec (state)
  IOT_SCALE: 30,                                                   // 30 sec (live weight)
  IOT_GPS: 2 * 60,                                                 // 2 min (last position)
  IOT_RFID_CACHE: 5 * 60,                                          // 5 min (card lookup)
  IOT_ENV: 5 * 60,                                                 // 5 min (env readings)
  IOT_ANPR_PENDING: 60,                                            // 60 sec (awaiting guard)
  IOT_DASHBOARD: 30,                                               // 30 sec
  IOT_CMD_ACK: 30,                                                 // 30 sec
  IOT_GEOFENCES: 5 * 60,                                           // 5 min (cached)
  IOT_VEHICLE_POSITION: 2 * 60,                                    // 2 min`;

content = content.replace(
  "  RPT_PRESIGNED: 15 * 60,            // 15 min\n} as const;",
  "  RPT_PRESIGNED: 15 * 60,            // 15 min," + iotKeys + "\n} as const;"
);

fs.writeFileSync(file, content, 'utf-8');
console.log('IoT Redis keys added');
