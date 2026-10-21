import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';
import { AppException } from '../../../common/exceptions/app.exception';

describe('SmsService', () => {
  let service: SmsService;

  const mockPrisma = {
    smsProviderLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  };

  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config: Record<string, string> = {
        KAVENEGAR_API_KEY: '',
        MELIPAYAMAK_USERNAME: '',
        MELIPAYAMAK_PASSWORD: '',
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: require('../../../prisma/prisma.service').PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateIranianPhone', () => {
    it('should normalize +989... to 09...', () => {
      expect(service.validateIranianPhone('+989121234567')).toBe('09121234567');
    });

    it('should normalize 00989... to 09...', () => {
      expect(service.validateIranianPhone('00989121234567')).toBe('09121234567');
    });

    it('should normalize 989... to 09...', () => {
      expect(service.validateIranianPhone('989121234567')).toBe('09121234567');
    });

    it('should keep 09... unchanged', () => {
      expect(service.validateIranianPhone('09121234567')).toBe('09121234567');
    });

    it('should reject non-Iranian phone numbers', () => {
      expect(() => service.validateIranianPhone('12345')).toThrow(AppException);
    });

    it('should reject short numbers', () => {
      expect(() => service.validateIranianPhone('0912123456')).toThrow(AppException);
    });
  });

  describe('send', () => {
    it('should return failure when no providers configured', async () => {
      const result = await service.send('09121234567', 'test message');
      expect(result.success).toBe(false);
      expect(result.provider).toBe('none');
    });

    it('should log SMS attempt', async () => {
      await service.send('09121234567', 'test');
      expect(mockPrisma.smsProviderLog.create).toHaveBeenCalled();
    });
  });

  describe('getSmsBalance', () => {
    it('should return balance for both providers', async () => {
      const result = await service.getSmsBalance();
      expect(result).toHaveProperty('kavenegar');
      expect(result).toHaveProperty('melipayamak');
    });
  });
});
