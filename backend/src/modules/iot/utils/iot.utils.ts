// M20: IoT & Device Integration — Utility Functions

/**
 * Haversine formula: compute distance between two lat/lng points in meters
 */
export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Ray casting algorithm: check if a point is inside a GeoJSON polygon
 * polygon coordinates: [[{lat, lng}, ...]] (outer ring)
 */
export function pointInPolygon(lat: number, lng: number, polygonCoords: number[][][]): boolean {
  // Flatten GeoJSON polygon to simple lat/lng array
  const ring = polygonCoords[0];
  if (!ring || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Check if a point is inside a geofence (polygon or circular)
 */
export function isPointInGeofence(
  lat: number,
  lng: number,
  geofence: { polygon?: any; radius?: number | null; centerLat?: number | null; centerLng?: number | null },
): boolean {
  // Circular geofence
  if (geofence.radius && geofence.centerLat != null && geofence.centerLng != null) {
    const dist = haversineDistance(lat, lng, Number(geofence.centerLat), Number(geofence.centerLng));
    return dist <= Number(geofence.radius);
  }
  // Polygon geofence
  if (geofence.polygon) {
    const coords = geofence.polygon?.coordinates;
    if (coords) return pointInPolygon(lat, lng, coords);
  }
  return false;
}

/**
 * Parse MQTT topic: idop/{zoneId}/{deviceType}/{deviceId}/{messageType}
 */
export function parseMqttTopic(topic: string): {
  zoneId: string;
  deviceType: string;
  deviceId: string;
  messageType: string;
} | null {
  const parts = topic.split('/');
  if (parts.length < 5 || parts[0] !== 'idop') return null;
  return {
    zoneId: parts[1],
    deviceType: parts[2],
    deviceId: parts[3],
    messageType: parts[4],
  };
}

/**
 * Build standard MQTT topic
 */
export function buildMqttTopic(zoneId: string, deviceType: string, deviceId: string, suffix: string): string {
  return `idop/${zoneId}/${deviceType}/${deviceId}/${suffix}`;
}

/**
 * Generate device credentials
 */
export function generateDeviceCredentials(deviceId: string, zoneCode: string): { username: string; password: string } {
  const username = `${deviceId}@${zoneCode}`;
  const password = generateSecureRandomHex(32);
  return { username, password };
}

/**
 * Generate a secure random hex string
 */
export function generateSecureRandomHex(length: number): string {
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Normalize Iranian/Persian license plate
 * Convert Persian/Arabic digits to English and clean format
 */
export function normalizePlate(plate: string): string {
  const persianDigits: Record<string, string> = {
    '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
    '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  };
  let normalized = plate.replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (d) => persianDigits[d] || d);
  // Remove spaces, dashes, and other non-alphanumeric chars
  normalized = normalized.replace(/[\s\-_.]+/g, '').toUpperCase();
  return normalized;
}

/**
 * Compute checksum for Iranian license plate
 */
export function computePlateChecksum(plateBody: string): number {
  const digits = plateBody.replace(/\D/g, '').split('').map(Number);
  if (digits.length < 7) return -1;
  const sum = digits.slice(0, 7).reduce((s, d, i) => s + d * (7 - i), 0);
  return sum % 11;
}

/**
 * Environmental threshold defaults
 */
export const ENV_DEFAULTS = {
  CO2_WARNING: 1000,    // ppm
  CO_CRITICAL: 25,      // ppm
  TEMP_HIGH: 45,        // °C
  NOISE_WARNING: 85,    // dB
  PM25_WARNING: 55,     // μg/m3
  PM10_WARNING: 100,    // μg/m3
} as const;

/**
 * Device type string codes for MQTT topics and deviceId generation
 */
export const DEVICE_TYPE_CODES: Record<string, string> = {
  ANPR_CAMERA: 'ANPR',
  BARRIER: 'BARR',
  WEIGH_SCALE: 'WSCA',
  RFID_READER: 'RFID',
  GPS_TRACKER: 'GPS',
  ENVIRONMENTAL: 'ENV',
  CCTV_CAMERA: 'CCTV',
  INTERCOM: 'INCM',
  FIRE_DETECTOR: 'FIRE',
  LOOP_DETECTOR: 'LOOP',
  DISPLAY_BOARD: 'DSPB',
  ACCESS_CONTROL: 'ACCS',
  UPS: 'UPS',
  GENERATOR: 'GNRT',
};

/**
 * Scale overload check
 */
export function isOverload(weight: number, config: { maxCapacity?: number }): boolean {
  if (!config.maxCapacity) return false;
  return weight > config.maxCapacity;
}
