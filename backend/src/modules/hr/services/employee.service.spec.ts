import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeService } from './employee.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { HrGatewayService } from './hr-gateway.service';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let prisma: any;
  let redis: Record<string, jest.Mock>;
  let gateway: any;

  beforeEach(async () => {
    prisma = {
      employee: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      department: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      position: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      company: {
        findUnique: jest.fn(),
      },
      leaveRequest: {
        findMany: jest.fn(),
      },
    };

    redis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getJson: jest.fn(),
      setJson: jest.fn(),
      incr: jest.fn().mockResolvedValue(1),
    };

    gateway = {};

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmployeeService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: AuditService, useValue: { log: jest.fn() } },
        { provide: HrGatewayService, useValue: gateway },
      ],
    }).compile();

    service = module.get<EmployeeService>(EmployeeService);
  });

  const baseDto = {
    zoneId: 'z-1', companyId: 'c-1', userId: 'u-1',
    firstNameFa: 'علی', lastNameFa: 'رضایی',
    firstNameEn: 'Ali', lastNameEn: 'Rezaei',
    nationalId: '0012345678', dateOfBirth: '1370-01-01',
    gender: 'MALE', phone: '09121234567',
    departmentId: 'dept-1', positionId: 'pos-1',
    employmentType: 'FULL_TIME', hireDate: '1404-01-01',
    baseSalary: 15_000_000,
  };

  describe('create', () => {
    it('should create an employee with generated number', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      prisma.position.findUnique.mockResolvedValue({ id: 'pos-1' });
      prisma.company.findUnique.mockResolvedValue({ id: 'c-1', nameEn: 'Pars Company' });
      prisma.employee.create.mockResolvedValue({ id: 'e-1', employeeNumber: 'EMP-PAR-00001' });
      prisma.position.update.mockResolvedValue({});

      const result = await service.create(baseDto as any, 'admin');
      expect(result.employeeNumber).toContain('EMP-');
      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ currentCount: { increment: 1 } }) }),
      );
    });

    it('should throw EMPLOYEE_NATIONAL_ID_TAKEN', async () => {
      prisma.employee.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(baseDto as any, 'admin')).rejects.toThrow(AppException);
    });

    it('should throw EMPLOYEE_RFID_TAKEN if RFID already exists', async () => {
      prisma.employee.findFirst
        .mockResolvedValueOnce(null) // nationalId check
        .mockResolvedValueOnce({ id: 'r-1' }); // rfid check

      await expect(
        service.create({ ...baseDto, rfidCardNumber: 'RF-001' } as any, 'admin'),
      ).rejects.toThrow(AppException);
    });

    it('should throw DEPARTMENT_NOT_FOUND', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto as any, 'admin')).rejects.toThrow(AppException);
    });

    it('should throw POSITION_NOT_FOUND', async () => {
      prisma.employee.findFirst.mockResolvedValue(null);
      prisma.department.findUnique.mockResolvedValue({ id: 'dept-1' });
      prisma.position.findUnique.mockResolvedValue(null);

      await expect(service.create(baseDto as any, 'admin')).rejects.toThrow(AppException);
    });
  });

  describe('update', () => {
    it('should update employee', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e-1', deletedAt: null, zoneId: 'z-1' });
      prisma.employee.update.mockResolvedValue({ id: 'e-1', firstNameFa: 'Updated' });

      const result = await service.update('e-1', { firstNameFa: 'Updated' } as any, 'admin');
      expect(result.firstNameFa).toBe('Updated');
    });

    it('should throw EMPLOYEE_NOT_FOUND', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.update('nonexistent', {} as any, 'admin')).rejects.toThrow(AppException);
    });
  });

  describe('findById', () => {
    it('should return employee', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'e-1', department: { nameFa: 'IT' }, position: { titleFa: 'Dev' }, contracts: [],
      });

      const result = await service.findById('e-1');
      expect(result.id).toBe('e-1');
    });

    it('should throw if not found', async () => {
      prisma.employee.findUnique.mockResolvedValue(null);
      await expect(service.findById('nonexistent')).rejects.toThrow(AppException);
    });

    it('should throw if soft-deleted', async () => {
      prisma.employee.findUnique.mockResolvedValue({ id: 'e-1', deletedAt: new Date() });
      await expect(service.findById('e-1')).rejects.toThrow(AppException);
    });
  });

  describe('terminate', () => {
    it('should terminate an employee', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'e-1', status: 'ACTIVE', deletedAt: null, zoneId: 'z-1', positionId: 'pos-1',
      });
      prisma.employee.update.mockResolvedValue({ id: 'e-1', status: 'TERMINATED' });
      prisma.position.update.mockResolvedValue({});

      const result = await service.terminate('e-1', 'Resignation', '1404-06-01', 'admin');
      expect(result.status).toBe('TERMINATED');
      expect(prisma.position.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ currentCount: { decrement: 1 } }) }),
      );
    });

    it('should throw EMPLOYEE_ALREADY_TERMINATED', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'e-1', status: 'TERMINATED', deletedAt: null,
      });

      await expect(service.terminate('e-1', 'reason', '2026-01-01', 'admin')).rejects.toThrow(AppException);
    });
  });

  describe('updateSalary', () => {
    it('should update salary', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        id: 'e-1', deletedAt: null, baseSalary: 10000n, zoneId: 'z-1',
      });
      prisma.employee.update.mockResolvedValue({ id: 'e-1', baseSalary: 15000n });

      const result = await service.updateSalary('e-1', 15000, '1404-01-01', 'Promotion', 'admin');
      expect(result.baseSalary).toBe(15000n);
    });
  });

  describe('getLeaveBalance', () => {
    it('should compute leave balance', async () => {
      prisma.employee.findUnique.mockResolvedValue({
        annualLeaveBalance: 26,
        sickLeaveBalance: 15,
        personalLeaveBalance: 3,
      });
      prisma.leaveRequest.findMany.mockResolvedValue([
        { leaveType: 'ANNUAL', daysCount: 5 },
        { leaveType: 'SICK', daysCount: 2 },
      ]);

      const result = await service.getLeaveBalance('e-1');
      expect(result.annual.total).toBe(26);
      expect(result.annual.used).toBe(5);
      expect(result.annual.remaining).toBe(21);
      expect(result.sick.used).toBe(2);
    });
  });

  describe('getEmployeeStats', () => {
    it('should compute employee statistics', async () => {
      prisma.employee.findMany.mockResolvedValue([
        { id: 'e-1', status: 'ACTIVE', employmentType: 'FULL_TIME', gender: 'MALE',
          hireDate: '1403-01-01', departmentId: 'd-1', department: { nameFa: 'IT' } },
        { id: 'e-2', status: 'TERMINATED', employmentType: 'FULL_TIME', gender: 'FEMALE',
          hireDate: '1402-01-01', departmentId: 'd-1', department: { nameFa: 'IT' } },
      ]);

      const stats = await service.getEmployeeStats('z-1');
      expect(stats.total).toBe(2);
      expect(stats.active).toBe(1);
      expect(stats.terminationsThisMonth).toBe(1);
      expect(stats.byDepartment).toHaveLength(1);
    });
  });
});
