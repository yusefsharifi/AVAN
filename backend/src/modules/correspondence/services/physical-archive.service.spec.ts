// ═══════════════════════════════════════════════════════════════════════════════
// M7: Physical Archive Service — Unit Tests
// ═══════════════════════════════════════════════════════════════════════════════

import { Test, TestingModule } from '@nestjs/testing';
import { PhysicalArchiveService } from './physical-archive.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('PhysicalArchiveService', () => {
  let service: PhysicalArchiveService;
  let prisma: any;
  let redis: any;

  const mockPrisma = {
    physicalArchiveShelf: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    physicalLetterRecord: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    letter: {
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    del: jest.fn().mockResolvedValue(1),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PhysicalArchiveService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<PhysicalArchiveService>(PhysicalArchiveService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  describe('receiveLetter', () => {
    it('should parse LTR- barcode and find letter', async () => {
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 's1', shelfCode: 'A-1', capacity: 50, occupancy: 0 });
      mockPrisma.letter.findFirst.mockResolvedValue({ id: 'l1', registryNumber: 'KVH/1403/000001' });
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue(null);
      mockPrisma.physicalLetterRecord.create.mockResolvedValue({ id: 'rec1' });
      mockPrisma.physicalArchiveShelf.update.mockResolvedValue({});
      mockPrisma.letter.update.mockResolvedValue({});

      const result = await service.receiveLetter({ barcode: 'LTR-000001', shelfId: 's1' }, 'user-1', 'zone-1');
      expect(mockPrisma.physicalLetterRecord.create).toHaveBeenCalled();
    });

    it('should reject if shelf is at capacity', async () => {
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 's1', capacity: 10, occupancy: 10 });
      await expect(service.receiveLetter({ barcode: 'LTR-001', shelfId: 's1' }, 'u', 'z')).rejects.toThrow(BadRequestException);
    });

    it('should increment shelf occupancy', async () => {
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 's1', capacity: 50, occupancy: 5 });
      mockPrisma.letter.findFirst.mockResolvedValue({ id: 'l1' });
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue(null);
      mockPrisma.physicalLetterRecord.create.mockResolvedValue({});

      await service.receiveLetter({ barcode: 'LTR-001', shelfId: 's1' }, 'u', 'z');
      expect(mockPrisma.physicalArchiveShelf.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ occupancy: { increment: 1 } }) }),
      );
    });

    it('should update letter.archiveLocation JSON', async () => {
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 's1', shelfCode: 'A-1', nameFa: 'قفسه ۱', capacity: 50, occupancy: 0 });
      mockPrisma.letter.findFirst.mockResolvedValue({ id: 'l1' });
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue(null);
      mockPrisma.physicalLetterRecord.create.mockResolvedValue({});

      await service.receiveLetter({ barcode: 'LTR-001', shelfId: 's1' }, 'u', 'z');
      expect(mockPrisma.letter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ archiveLocation: expect.any(Object) }) }),
      );
    });

    it('should reject if barcode already exists', async () => {
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 's1', capacity: 50, occupancy: 0 });
      mockPrisma.letter.findFirst.mockResolvedValue({ id: 'l1' });
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(service.receiveLetter({ barcode: 'LTR-001', shelfId: 's1' }, 'u', 'z')).rejects.toThrow(BadRequestException);
    });
  });

  describe('moveLetter', () => {
    it('should decrement old shelf and increment new shelf', async () => {
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue({ id: 'rec1', shelfId: 'old-shelf', letterId: 'l1', receivedAt: new Date(), receivedBy: 'u' });
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 'new-shelf', capacity: 50, occupancy: 3, shelfCode: 'B-1', nameFa: 'قفسه ۲' });
      mockPrisma.physicalLetterRecord.update.mockResolvedValue({});
      mockPrisma.physicalArchiveShelf.update.mockResolvedValue({});
      mockPrisma.letter.update.mockResolvedValue({});

      await service.moveLetter({ barcode: 'LTR-001', toShelfId: 'new-shelf', reason: 'reorganize' }, 'u', 'z');

      expect(mockPrisma.physicalArchiveShelf.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ occupancy: { decrement: 1 } }) }),
      );
      expect(mockPrisma.physicalArchiveShelf.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ occupancy: { increment: 1 } }) }),
      );
    });

    it('should reject if destination at capacity', async () => {
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue({ id: 'rec1', shelfId: 'old' });
      mockPrisma.physicalArchiveShelf.findUnique.mockResolvedValue({ id: 'new', capacity: 10, occupancy: 10 });
      await expect(service.moveLetter({ barcode: 'LTR-001', toShelfId: 'new', reason: 'x' }, 'u', 'z')).rejects.toThrow(BadRequestException);
    });
  });

  describe('dispatchPhysical', () => {
    it('should set dispatchedAt and decrement shelf occupancy', async () => {
      mockPrisma.physicalLetterRecord.findUnique.mockResolvedValue({ id: 'rec1', shelfId: 's1' });
      mockPrisma.physicalLetterRecord.update.mockResolvedValue({});
      mockPrisma.physicalArchiveShelf.update.mockResolvedValue({});

      await service.dispatchPhysical('LTR-001', 'sent out', 'u', 'z');
      expect(mockPrisma.physicalLetterRecord.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ dispatchedAt: expect.any(Date) }) }),
      );
      expect(mockPrisma.physicalArchiveShelf.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ occupancy: { decrement: 1 } }) }),
      );
    });
  });

  describe('getArchiveReport', () => {
    it('should compute correct occupancy rate', async () => {
      mockPrisma.physicalArchiveShelf.findMany.mockResolvedValue([
        { capacity: 50, occupancy: 30 },
        { capacity: 50, occupancy: 20 },
      ]);
      mockPrisma.physicalLetterRecord.findMany.mockResolvedValue([]);
      mockPrisma.letter.findMany.mockResolvedValue([]);

      const report = await service.getArchiveReport('zone-1');
      expect(report.totalCapacity).toBe(100);
      expect(report.totalLettersArchived).toBe(50);
      expect(report.occupancyRate).toBe(50);
    });
  });
});
