import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreateEmployeeDto, FilterEmployeesDto } from '../dto/create-dtos';
import { EmploymentStatus } from '../dto/enums';
import type { PaginatedResult, OrgChartDto, LeaveBalanceDto, EmployeeStatsDto, DepartmentTreeNode } from '../dto/enums';
import { HrGatewayService } from './hr-gateway.service';
import { computeProbationEndDate } from '../utils/hr.utils';
import * as crypto from 'crypto';

@Injectable()
export class EmployeeService {
  private readonly logger = new Logger(EmployeeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // REFERENCE RESOLUTION
  // UI نام آزاد واحد/سمت می‌فرستد؛ این متدها id معتبر پیدا یا می‌سازند.
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveDepartment(
    departmentId: string | undefined,
    departmentName: string | undefined,
    zoneId: string,
    companyId: string,
  ): Promise<{ id: string }> {
    if (departmentId) {
      const found = await this.prisma.department.findUnique({ where: { id: departmentId } });
      if (found) return { id: found.id };
    }

    const name = departmentName?.trim();
    if (name) {
      const byName = await this.prisma.department.findFirst({
        where: { zoneId, companyId, nameFa: name },
        select: { id: true },
      });
      if (byName) return byName;
    }

    // ساخت واحد پیش‌فرض؛ کد یکتا از هش نام گرفته می‌شود تا اجرای مجدد ردیف تکراری نسازد.
    const finalName = name || 'سایر';
    const code = `DEP-${crypto.createHash('sha1').update(finalName).digest('hex').slice(0, 8).toUpperCase()}`;
    const existing = await this.prisma.department.findFirst({
      where: { zoneId, companyId, code },
      select: { id: true },
    });
    if (existing) return existing;

    const created = await this.prisma.department.create({
      data: {
        zoneId,
        companyId,
        code,
        nameFa: finalName,
        isActive: true,
      },
      select: { id: true },
    });
    return created;
  }

  private async resolvePosition(
    positionId: string | undefined,
    positionName: string | undefined,
    zoneId: string,
    companyId: string,
    departmentId: string,
  ): Promise<{ id: string }> {
    if (positionId) {
      const found = await this.prisma.position.findUnique({ where: { id: positionId } });
      if (found) return { id: found.id };
    }

    const name = positionName?.trim();
    if (name) {
      const byName = await this.prisma.position.findFirst({
        where: { zoneId, companyId, departmentId, titleFa: name },
        select: { id: true },
      });
      if (byName) return byName;
    }

    const finalName = name || 'کارشناس';
    const code = `POS-${crypto.createHash('sha1').update(finalName).digest('hex').slice(0, 8).toUpperCase()}`;
    const existing = await this.prisma.position.findFirst({
      where: { zoneId, companyId, departmentId, code },
      select: { id: true },
    });
    if (existing) return existing;

    const created = await this.prisma.position.create({
      data: {
        zoneId,
        companyId,
        departmentId,
        code,
        titleFa: finalName,
        level: 1,
        isActive: true,
        headcount: 0,
        currentCount: 0,
      },
      select: { id: true },
    });
    return created;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  // The DTO's zoneId is optional so the ValidationPipe doesn't reject a
  // SUPER_ADMIN write with its English UUID message before @ResolveZoneId() can
  // answer with the Persian ZONE_REQUIRED one. The service contract still
  // demands a zone — the controller always supplies it.
  async create(
    dto: CreateEmployeeDto & { zoneId: string },
    createdBy: string,
  ): Promise<any> {
    // 1. Validate nationalId uniqueness
    const existingByNational = await this.prisma.employee.findFirst({
      where: { nationalId: dto.nationalId, deletedAt: null },
    });
    if (existingByNational) {
      throw new AppException('EMPLOYEE_NATIONAL_ID_TAKEN');
    }

    // 2. Validate rfidCardNumber uniqueness if provided
    if (dto.rfidCardNumber) {
      const existingByRfid = await this.prisma.employee.findFirst({
        where: { rfidCardNumber: dto.rfidCardNumber, deletedAt: null },
      });
      if (existingByRfid) {
        throw new AppException('EMPLOYEE_RFID_TAKEN');
      }
    }

    // 3. Validate department and position exist — در نبودِ id، بر اساس نام
    //    ردیف موجود پیدا یا ردیف جدید ساخته می‌شود (UI نام آزاد می‌فرستد).
    const department = await this.resolveDepartment(
      dto.departmentId,
      dto.departmentName,
      dto.zoneId,
      dto.companyId,
    );
    const position = await this.resolvePosition(
      dto.positionId,
      dto.positionName,
      dto.zoneId,
      dto.companyId,
      department.id,
    );

    // 4. Generate employeeNumber: EMP-{companyCode}-{seq:05d}
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    const companyCode = company?.nameEn?.substring(0, 3).toUpperCase() || 'COM';
    const seqKey = `hr:emp:seq:${dto.companyId}`;
    const seq = await this.redis.incr(seqKey);
    const employeeNumber = `EMP-${companyCode}-${String(seq).padStart(5, '0')}`;

    // 5. Compute probation end date (90 days from hire)
    const probationEndDate = computeProbationEndDate(dto.hireDate);

    // 6. Create Employee
    const employee = await this.prisma.employee.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        userId: dto.userId,
        employeeNumber,
        firstNameFa: dto.firstNameFa,
        lastNameFa: dto.lastNameFa,
        firstNameEn: dto.firstNameEn,
        lastNameEn: dto.lastNameEn,
        nationalId: dto.nationalId,
        dateOfBirth: dto.dateOfBirth,
        gender: dto.gender,
        maritalStatus: dto.maritalStatus || 'SINGLE',
        nationalityCode: 'IR',
        militaryStatus: dto.militaryStatus,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        emergencyContactRel: dto.emergencyContactRel,
        departmentId: department.id,
        positionId: position.id,
        reportingManagerId: dto.reportingManagerId,
        employmentType: dto.employmentType,
        status: 'ACTIVE',
        hireDate: dto.hireDate,
        contractStartDate: dto.contractStartDate || dto.hireDate,
        contractEndDate: dto.contractEndDate,
        probationEndDate,
        baseSalary: BigInt(dto.baseSalary),
        housingAllowance: BigInt(dto.housingAllowance || 0),
        transportAllowance: BigInt(dto.transportAllowance || 0),
        foodAllowance: BigInt(dto.foodAllowance || 0),
        socialSecurityNumber: dto.socialSecurityNumber,
        bankName: dto.bankName,
        bankAccountNumber: dto.bankAccountNumber,
        bankShebaNumber: dto.bankShebaNumber,
        rfidCardNumber: dto.rfidCardNumber,
        notes: dto.notes,
        createdBy,
      },
    });

    // 7. Increment position.currentCount
    await this.prisma.position.update({
      where: { id: position.id },
      data: { currentCount: { increment: 1 } },
    });

    // 8. Create AuditLog
    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'EMPLOYEE_CREATED',
      targetType: 'Employee',
      targetId: employee.id,
      userId: createdBy,
      metadata: { employeeNumber, firstNameFa: dto.firstNameFa, lastNameFa: dto.lastNameFa },
    });

    return employee;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async update(id: string, dto: Partial<CreateEmployeeDto>, updatedBy: string): Promise<any> {
    const existing = await this.prisma.employee.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }

    const updateData: any = { ...dto };
    if (updateData.baseSalary !== undefined) {
      updateData.baseSalary = BigInt(updateData.baseSalary);
    }
    if (updateData.housingAllowance !== undefined) {
      updateData.housingAllowance = BigInt(updateData.housingAllowance);
    }
    if (updateData.transportAllowance !== undefined) {
      updateData.transportAllowance = BigInt(updateData.transportAllowance);
    }
    if (updateData.foodAllowance !== undefined) {
      updateData.foodAllowance = BigInt(updateData.foodAllowance);
    }

    // Remove undefined values
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) delete updateData[key];
    });

    const employee = await this.prisma.employee.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      zoneId: existing.zoneId,
      action: 'EMPLOYEE_UPDATED',
      targetType: 'Employee',
      targetId: id,
      userId: updatedBy,
      metadata: { changes: Object.keys(updateData) },
    });

    return employee;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterEmployeesDto): Promise<PaginatedResult<any>> {
    const where: any = { deletedAt: null };
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.departmentId) where.departmentId = filter.departmentId;
    if (filter.status) where.status = filter.status;
    if (filter.employmentType) where.employmentType = filter.employmentType;
    if (filter.search) {
      where.OR = [
        { firstNameFa: { contains: filter.search, mode: 'insensitive' } },
        { lastNameFa: { contains: filter.search, mode: 'insensitive' } },
        { employeeNumber: { contains: filter.search, mode: 'insensitive' } },
        { nationalId: { contains: filter.search } },
      ];
    }

    const limit = filter.limit || 20;
    const cursor = filter.cursor;

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where: { ...where, ...(cursor ? { createdAt: { lt: (await this.prisma.employee.findUnique({ where: { id: cursor } }))?.createdAt } } : {}) },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          department: { select: { id: true, nameFa: true, code: true } },
          position: { select: { id: true, titleFa: true, code: true } },
        },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        cursor: data.length === limit ? data[data.length - 1].id : undefined,
        hasMore: data.length === limit,
      },
    };
  }

  async findById(id: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, nameFa: true, code: true } },
        position: { select: { id: true, titleFa: true, code: true } },
        contracts: { where: { isCurrent: true }, take: 1 },
      },
    });
    if (!employee || employee.deletedAt) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }
    return employee;
  }

  async findByNationalId(nationalId: string): Promise<any | null> {
    return this.prisma.employee.findFirst({
      where: { nationalId, deletedAt: null },
    });
  }

  async findByRfid(rfidCardNumber: string): Promise<any | null> {
    return this.prisma.employee.findFirst({
      where: { rfidCardNumber, deletedAt: null, status: 'ACTIVE' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TERMINATE
  // ═══════════════════════════════════════════════════════════════════════════

  async terminate(
    id: string,
    reason: string,
    terminationDate: string,
    terminatedBy: string,
  ): Promise<any> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.deletedAt) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }
    if (employee.status === 'TERMINATED') {
      throw new AppException('EMPLOYEE_ALREADY_TERMINATED');
    }

    const updated = await this.prisma.employee.update({
      where: { id },
      data: {
        status: 'TERMINATED',
        terminationDate,
        terminationReason: reason,
        rfidCardNumber: null, // revoke RFID
      },
    });

    // Decrement position currentCount
    await this.prisma.position.update({
      where: { id: employee.positionId },
      data: { currentCount: { decrement: 1 } },
    });

    await this.audit.log({
      zoneId: employee.zoneId,
      action: 'EMPLOYEE_TERMINATED',
      targetType: 'Employee',
      targetId: id,
      userId: terminatedBy,
      metadata: { reason, terminationDate },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SALARY UPDATE
  // ═══════════════════════════════════════════════════════════════════════════

  async updateSalary(
    id: string,
    newBaseSalary: number,
    effectiveDate: string,
    reason: string,
    updatedBy: string,
  ): Promise<any> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee || employee.deletedAt) {
      throw new AppException('EMPLOYEE_NOT_FOUND');
    }

    const oldSalary = employee.baseSalary;
    const updated = await this.prisma.employee.update({
      where: { id },
      data: { baseSalary: BigInt(newBaseSalary) },
    });

    await this.audit.log({
      zoneId: employee.zoneId,
      action: 'EMPLOYEE_SALARY_UPDATED',
      targetType: 'Employee',
      targetId: id,
      userId: updatedBy,
      metadata: { oldSalary: oldSalary.toString(), newBaseSalary: String(newBaseSalary), effectiveDate, reason },
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE UPLOADS
  // ═══════════════════════════════════════════════════════════════════════════

  async uploadPhoto(id: string, file: Express.Multer.File): Promise<string> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const ext = file.originalname.split('.').pop() || 'jpg';
    const photoKey = `hr-photos/${id}/${crypto.randomUUID()}.${ext}`;

    // MinIO upload would happen here
    // await this.minio.putObject('hr-photos', photoKey, file.buffer, file.size, { 'Content-Type': file.mimetype });

    await this.prisma.employee.update({
      where: { id },
      data: { photoKey },
    });

    return photoKey;
  }

  async uploadDocument(id: string, file: Express.Multer.File, type: string): Promise<string> {
    const employee = await this.prisma.employee.findUnique({ where: { id } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const ext = file.originalname.split('.').pop() || 'pdf';
    const docKey = `hr-documents/${id}/${type}/${crypto.randomUUID()}.${ext}`;

    const currentKeys = (employee.documentKeys as string[]) || [];
    await this.prisma.employee.update({
      where: { id },
      data: { documentKeys: [...currentKeys, docKey] },
    });

    return docKey;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ORG CHART
  // ═══════════════════════════════════════════════════════════════════════════

  async getOrgChart(companyId: string, _zoneId: string): Promise<OrgChartDto> {
    const cacheKey = `hr:org-chart:${companyId}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const departments = await this.prisma.department.findMany({
      where: { companyId, isActive: true },
      include: {
        employees: { where: { status: 'ACTIVE', deletedAt: null }, select: { id: true, firstNameFa: true, lastNameFa: true } },
      },
      orderBy: { code: 'asc' },
    });

    const buildTree = (parentId: string | null): DepartmentTreeNode[] => {
      return departments
        .filter((d) => d.parentId === parentId)
        .map((d) => ({
          id: d.id,
          nameFa: d.nameFa,
          nameEn: d.nameEn || undefined,
          code: d.code,
          managerId: d.managerId || undefined,
          managerName: undefined,
          employeeCount: d.employees.length,
          children: buildTree(d.id),
        }));
    };

    const result: OrgChartDto = { departments: buildTree(null) };

    await this.redis.set(cacheKey, JSON.stringify(result), 30 * 60); // TTL: 30 min

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEAVE BALANCE
  // ═══════════════════════════════════════════════════════════════════════════

  async getLeaveBalance(employeeId: string): Promise<LeaveBalanceDto> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    const totalAnnual = Number(employee.annualLeaveBalance);
    const totalSick = Number(employee.sickLeaveBalance);
    const totalPersonal = Number(employee.personalLeaveBalance);

    // Calculate used days from approved leave requests this year
    const currentYear = new Date().getFullYear().toString();
    const approvedLeaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        status: 'APPROVED',
        startDate: { gte: `${currentYear}-01-01` },
      },
    });

    let usedAnnual = 0;
    let usedSick = 0;
    let usedPersonal = 0;

    for (const leave of approvedLeaves) {
      const days = Number(leave.daysCount);
      switch (leave.leaveType) {
        case 'ANNUAL': usedAnnual += days; break;
        case 'SICK': usedSick += days; break;
        case 'PERSONAL': usedPersonal += days; break;
      }
    }

    return {
      annual: { total: totalAnnual, used: usedAnnual, remaining: totalAnnual - usedAnnual },
      sick: { total: totalSick, used: usedSick, remaining: totalSick - usedSick },
      personal: { total: totalPersonal, used: usedPersonal, remaining: totalPersonal - usedPersonal },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATS
  // ═══════════════════════════════════════════════════════════════════════════

  async getEmployeeStats(zoneId: string, companyId?: string): Promise<EmployeeStatsDto> {
    const where: any = { zoneId, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        status: true,
        employmentType: true,
        gender: true,
        hireDate: true,
        departmentId: true,
        department: { select: { nameFa: true } },
      },
    });

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const active = employees.filter((e) => e.status === 'ACTIVE').length;
    const onProbation = employees.filter((e) => e.status === 'PROBATION').length;
    const onLeave = employees.filter((e) => e.status === 'ON_LEAVE').length;
    const newHires30Days = employees.filter((e) => {
      const hireDate = new Date(e.hireDate);
      return hireDate >= thirtyDaysAgo;
    }).length;
    const terminationsThisMonth = employees.filter((e) => e.status === 'TERMINATED').length;

    // Group by department
    const deptMap = new Map<string, { name: string; count: number }>();
    for (const e of employees) {
      const key = e.departmentId;
      const existing = deptMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        deptMap.set(key, { name: e.department?.nameFa || 'Unknown', count: 1 });
      }
    }
    const byDepartment = Array.from(deptMap.entries()).map(([id, v]) => ({
      departmentId: id,
      departmentName: v.name,
      count: v.count,
    }));

    // Group by type
    const typeMap = new Map<string, number>();
    for (const e of employees) {
      typeMap.set(e.employmentType, (typeMap.get(e.employmentType) || 0) + 1);
    }
    const byType = Array.from(typeMap.entries()).map(([type, count]) => ({ type, count }));

    // Group by gender
    const genderMap = new Map<string, number>();
    for (const e of employees) {
      genderMap.set(e.gender, (genderMap.get(e.gender) || 0) + 1);
    }
    const byGender = Array.from(genderMap.entries()).map(([gender, count]) => ({ gender, count }));

    // Average tenure
    let totalTenureMonths = 0;
    for (const e of employees) {
      const hireDate = new Date(e.hireDate);
      const months = (now.getFullYear() - hireDate.getFullYear()) * 12 + (now.getMonth() - hireDate.getMonth());
      totalTenureMonths += Math.max(0, months);
    }
    const avgTenureMonths = employees.length > 0 ? Math.round(totalTenureMonths / employees.length) : 0;

    return {
      total: employees.length,
      active,
      onProbation,
      onLeave,
      byDepartment,
      byType,
      byGender,
      avgTenureMonths,
      newHires30Days,
      terminationsThisMonth,
    };
  }
}
