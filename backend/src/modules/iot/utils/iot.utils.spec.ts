import { haversineDistance, pointInPolygon, isPointInGeofence, parseMqttTopic, buildMqttTopic, normalizePlate, generateSecureRandomHex, generateDeviceCredentials, isOverload } from './iot.utils';

describe('IoT Utility Functions', () => {
  describe('haversineDistance', () => {
    it('should return ~0 for same point', () => {
      const dist = haversineDistance(35.6892, 51.389, 35.6892, 51.389);
      expect(dist).toBe(0);
    });

    it('should compute correct distance between two known points', () => {
      // Tehran to Isfahan: ~338 km
      const dist = haversineDistance(35.6892, 51.389, 32.6546, 51.668);
      expect(dist).toBeGreaterThan(330000);
      expect(dist).toBeLessThan(350000);
    });

    it('should handle small distances accurately', () => {
      // ~100m apart
      const dist = haversineDistance(35.6892, 51.389, 35.6900, 51.389);
      expect(dist).toBeGreaterThan(50);
      expect(dist).toBeLessThan(200);
    });
  });

  describe('pointInPolygon', () => {
    it('should return true for point inside a simple square polygon', () => {
      // Square: (0,0), (10,0), (10,10), (0,10)
      const polygon = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]];
      expect(pointInPolygon(5, 5, polygon)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const polygon = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]];
      expect(pointInPolygon(15, 5, polygon)).toBe(false);
    });

    it('should handle point on edge (ray-casting behavior)', () => {
      const polygon = [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]];
      // Point on edge is implementation-defined, just verify no crash
      const result = pointInPolygon(0, 5, polygon);
      expect(typeof result).toBe('boolean');
    });

    it('should handle triangle polygon', () => {
      const polygon = [[[0, 0], [10, 0], [5, 10], [0, 0]]];
      expect(pointInPolygon(5, 3, polygon)).toBe(true);
      expect(pointInPolygon(0, 8, polygon)).toBe(false);
    });

    it('should return false for empty ring', () => {
      expect(pointInPolygon(5, 5, [[]])).toBe(false);
    });
  });

  describe('isPointInGeofence', () => {
    it('should detect point inside circular geofence', () => {
      const geofence = { radius: 1000, centerLat: 35.6892, centerLng: 51.389, polygon: null };
      expect(isPointInGeofence(35.690, 51.390, geofence)).toBe(true);
    });

    it('should detect point outside circular geofence', () => {
      const geofence = { radius: 100, centerLat: 35.6892, centerLng: 51.389, polygon: null };
      expect(isPointInGeofence(36.0, 52.0, geofence)).toBe(false);
    });

    it('should detect point inside polygon geofence', () => {
      const geofence = {
        polygon: { coordinates: [[[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]]] },
        radius: null,
        centerLat: null,
        centerLng: null,
      };
      expect(isPointInGeofence(5, 5, geofence)).toBe(true);
    });
  });

  describe('parseMqttTopic', () => {
    it('should parse valid MQTT topic', () => {
      const result = parseMqttTopic('idop/zone-1/ANPR/KVH-ANPR-0001/data');
      expect(result).toEqual({
        zoneId: 'zone-1',
        deviceType: 'ANPR',
        deviceId: 'KVH-ANPR-0001',
        messageType: 'data',
      });
    });

    it('should return null for invalid topic', () => {
      expect(parseMqttTopic('invalid/topic')).toBeNull();
    });

    it('should return null for topic without idop prefix', () => {
      expect(parseMqttTopic('other/zone-1/ANPR/dev-1/data')).toBeNull();
    });
  });

  describe('buildMqttTopic', () => {
    it('should build correct topic format', () => {
      const topic = buildMqttTopic('zone-1', 'ANPR', 'KVH-ANPR-0001', 'data');
      expect(topic).toBe('idop/zone-1/ANPR/KVH-ANPR-0001/data');
    });
  });

  describe('normalizePlate', () => {
    it('should convert Persian digits to English', () => {
      expect(normalizePlate('۱۲ع۳۴۵')).toBe('12ع345');
    });

    it('should convert Arabic digits to English', () => {
      expect(normalizePlate('١٢ع٣٤٥')).toBe('12ع345');
    });

    it('should remove spaces and dashes', () => {
      expect(normalizePlate('12 ع 345')).toBe('12ع345');
      expect(normalizePlate('12-ع-345')).toBe('12ع345');
    });

    it('should uppercase the result', () => {
      expect(normalizePlate('abc')).toBe('ABC');
    });

    it('should handle already normalized plates', () => {
      expect(normalizePlate('12AB345')).toBe('12AB345');
    });
  });

  describe('generateSecureRandomHex', () => {
    it('should generate string of specified length', () => {
      const hex = generateSecureRandomHex(32);
      expect(hex).toHaveLength(32);
    });

    it('should only contain hex characters', () => {
      const hex = generateSecureRandomHex(64);
      expect(hex).toMatch(/^[0-9a-f]+$/);
    });

    it('should generate different strings each time', () => {
      const hex1 = generateSecureRandomHex(16);
      const hex2 = generateSecureRandomHex(16);
      expect(hex1).not.toBe(hex2);
    });
  });

  describe('generateDeviceCredentials', () => {
    it('should generate username from deviceId and zoneCode', () => {
      const creds = generateDeviceCredentials('KVH-ANPR-0001', 'KVH');
      expect(creds.username).toBe('KVH-ANPR-0001@KVH');
    });

    it('should generate 32-char hex password', () => {
      const creds = generateDeviceCredentials('dev-1', 'Z1');
      expect(creds.password).toHaveLength(32);
      expect(creds.password).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe('isOverload', () => {
    it('should return true when weight exceeds maxCapacity', () => {
      expect(isOverload(65000, { maxCapacity: 60000 })).toBe(true);
    });

    it('should return false when weight is below maxCapacity', () => {
      expect(isOverload(50000, { maxCapacity: 60000 })).toBe(false);
    });

    it('should return false when no maxCapacity configured', () => {
      expect(isOverload(100000, {})).toBe(false);
    });
  });
});
