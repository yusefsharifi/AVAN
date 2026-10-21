import { Test, TestingModule } from '@nestjs/testing';
import { GpsTrackingService } from './gps-tracking.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { IotGatewayService } from './iot-gateway.service';

describe('GpsTrackingService', () => {
  let service: GpsTrackingService;
  let prisma: any;
  let redis: any;
  let gateway: any;

  const mockPositionDto = {
    deviceId: 'KVH-GPS-0001',
    zoneId: 'zone-1',
    vehiclePlate: '12ع345',
    lat: 35.6892,
    lng: 51.389,
    speed: 35,
    heading: 90,
    timestamp: new Date().toISOString(),
  };

  beforeEach(async () => {
    prisma = {
      vehicleTrackingPoint: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
      },
      ioTDevice: {
        updateMany: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      geofenceZone: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        delete: jest.fn(),
      },
    };

    redis = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      del: jest.fn(),
    };

    gateway = {
      emitGpsPosition: jest.fn(),
      emitGeofenceEntry: jest.fn(),
      emitGeofenceExit: jest.fn(),
      emitSpeedViolation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GpsTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: IotGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<GpsTrackingService>(GpsTrackingService);
  });

  describe('processPosition', () => {
    it('should save VehicleTrackingPoint', async () => {
      await service.processPosition(mockPositionDto);

      expect(prisma.vehicleTrackingPoint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ lat: 35.6892, lng: 51.389, speed: 35 }),
        }),
      );
    });

    it('should cache position in Redis with 2min TTL', async () => {
      await service.processPosition(mockPositionDto);

      expect(redis.set).toHaveBeenCalledWith(
        'iot:gps:KVH-GPS-0001',
        expect.any(String),
        120,
      );
    });

    it('should emit gps:position socket event', async () => {
      await service.processPosition(mockPositionDto);

      expect(gateway.emitGpsPosition).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({ deviceId: 'KVH-GPS-0001', lat: 35.6892, lng: 51.389 }),
      );
    });

    it('should detect speed violation when speed > 40 km/h', async () => {
      await service.processPosition({ ...mockPositionDto, speed: 55 });

      expect(gateway.emitSpeedViolation).toHaveBeenCalledWith(
        'zone-1',
        expect.objectContaining({ speed: 55, limit: 40 }),
      );
    });

    it('should not emit speed violation when speed <= 40 km/h', async () => {
      await service.processPosition({ ...mockPositionDto, speed: 35 });

      expect(gateway.emitSpeedViolation).not.toHaveBeenCalled();
    });

    it('should detect geofence entry', async () => {
      const geofence = {
        id: 'gf-1',
        zoneId: 'zone-1',
        name: 'Main Gate Area',
        type: 'ZONE_BOUNDARY',
        polygon: { type: 'Polygon', coordinates: [[[35.68, 51.38], [35.68, 51.39], [35.70, 51.39], [35.70, 51.38], [35.68, 51.38]]] },
        radius: null,
        centerLat: null,
        centerLng: null,
        isActive: true,
        notifyOnEntry: true,
        notifyOnExit: true,
      };
      prisma.geofenceZone.findMany.mockResolvedValue([geofence]);
      // Return null for geofence inside-check key (was not inside before)
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('iot:geofence:KVH-GPS-0001:gf-1')) return Promise.resolve(null);
        return Promise.resolve(null);
      });

      await service.processPosition(mockPositionDto);

      expect(gateway.emitGeofenceEntry).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalledWith(
        'iot:geofence:KVH-GPS-0001:gf-1',
        'inside',
        300,
      );
    });

    it('should detect geofence exit', async () => {
      const geofence = {
        id: 'gf-1',
        zoneId: 'zone-1',
        name: 'Main Gate Area',
        type: 'ZONE_BOUNDARY',
        polygon: { type: 'Polygon', coordinates: [[[34.0, 50.0], [34.0, 50.1], [34.1, 50.1], [34.1, 50.0], [34.0, 50.0]]] },
        radius: null,
        centerLat: null,
        centerLng: null,
        isActive: true,
        notifyOnEntry: true,
        notifyOnExit: true,
      };
      prisma.geofenceZone.findMany.mockResolvedValue([geofence]);
      // Return 'inside' only for the geofence inside-check key
      redis.get.mockImplementation((key: string) => {
        if (key.startsWith('iot:geofence:KVH-GPS-0001:gf-1')) return Promise.resolve('inside');
        return Promise.resolve(null);
      });

      await service.processPosition(mockPositionDto);

      expect(gateway.emitGeofenceExit).toHaveBeenCalled();
    });
  });

  describe('getCurrentPositions', () => {
    it('should return positions from cache for recent GPS devices', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { deviceId: 'KVH-GPS-0001', type: 'GPS_TRACKER', isActive: true },
      ]);
      redis.get.mockResolvedValue(JSON.stringify({
        lat: 35.6892, lng: 51.389, speed: 35, heading: 90, plate: '12ع345', recordedAt: new Date().toISOString(),
      }));

      const positions = await service.getCurrentPositions('zone-1');

      expect(positions).toHaveLength(1);
      expect(positions[0].lat).toBe(35.6892);
    });

    it('should exclude stale positions (> 5 min old)', async () => {
      prisma.ioTDevice.findMany.mockResolvedValue([
        { deviceId: 'KVH-GPS-0001', type: 'GPS_TRACKER', isActive: true },
      ]);
      const oldTime = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      redis.get.mockResolvedValue(JSON.stringify({
        lat: 35.6892, lng: 51.389, speed: 0, plate: '12ع345', recordedAt: oldTime,
      }));

      const positions = await service.getCurrentPositions('zone-1');

      expect(positions).toHaveLength(0);
    });
  });

  describe('getVehicleTrail', () => {
    it('should return tracking points ordered by time', async () => {
      const points = [
        { recordedAt: new Date('2026-01-01T10:00:00'), lat: 35.68, lng: 51.38 },
        { recordedAt: new Date('2026-01-01T10:05:00'), lat: 35.69, lng: 51.39 },
      ];
      prisma.vehicleTrackingPoint.findMany.mockResolvedValue(points);

      const trail = await service.getVehicleTrail('dev-1', new Date('2026-01-01'), new Date('2026-01-02'));

      expect(trail).toHaveLength(2);
      expect(prisma.vehicleTrackingPoint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { recordedAt: 'asc' } }),
      );
    });
  });

  describe('getSpeedViolations', () => {
    it('should return points with speed > 40', async () => {
      prisma.vehicleTrackingPoint.findMany.mockResolvedValue([
        { deviceId: 'dev-1', plate: '12ع345', speed: 55, recordedAt: new Date(), lat: 35.69, lng: 51.39 },
      ]);

      const violations = await service.getSpeedViolations('zone-1', '2026-01-01', '2026-01-31');

      expect(violations).toHaveLength(1);
      expect(violations[0].speed).toBe(55);
      expect(violations[0].limit).toBe(40);
    });
  });

  describe('createGeofence', () => {
    it('should create geofence with correct data', async () => {
      prisma.geofenceZone.create.mockResolvedValue({ id: 'gf-1' });

      await service.createGeofence({
        zoneId: 'zone-1',
        name: 'Parking Zone',
        type: 'PARKING',
        polygon: { type: 'Polygon', coordinates: [] },
        notifyOnEntry: true,
        notifyOnExit: true,
      });

      expect(prisma.geofenceZone.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Parking Zone', type: 'PARKING' }),
        }),
      );
    });
  });
});
