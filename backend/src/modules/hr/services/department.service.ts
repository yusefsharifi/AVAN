import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateDepartmentDto, CreatePositionDto } from '../dto/create-dtos';
import type { DepartmentTreeDto } from '../dto/enums';

@Injectable()
export class DepartmentService {
  private readonly logger = new Logger(DepartmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPARTMENT CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async createDepartment(dto: CreateDepartmentDto, createdBy: string): Promise<any> {
    // Validate parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.department.findUnique({ where: { id: dto.parentId } });
      if (!parent || parent.companyId !== dto.companyId) {
        throw new AppException('DEPARTMENT_NOT_FOUND');
      }
    }

    const department = await this.prisma.department.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        code: dto.code,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn,
        parentId: dto.parentId,
        managerId: dto.managerId,
        costCenterId: dto.costCenterId,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'DEPARTMENT_CREATED',
      targetType: 'Department',
      targetId: department.id,
      userId: createdBy,
      metadata: { code: dto.code, nameFa: dto.nameFa },
    });

    return department;
  }

  async updateDepartment(id: string, dto: Partial<CreateDepartmentDto>): Promise<any> {
    const existing = await this.prisma.department.findUnique({ where: { id } });
    if (!existing) throw new AppException('DEPARTMENT_NOT_FOUND');

    return this.prisma.department.update({
      where: { id },
      data: { ...dto },
    });
  }

  async findDepartments(companyId: string): Promise<any[]> {
    return this.prisma.department.findMany({
      where: { companyId, isActive: true },
      include: {
        _count: { select: { employees: true, positions: true } },
      },
      orderBy: { code: 'asc' },
    });
  }

  async getDepartmentTree(companyId: string): Promise<DepartmentTreeDto[]> {
    const departments = await this.prisma.department.findMany({
      where: { companyId, isActive: true },
      include: {
        employees: { where: { status: 'ACTIVE', deletedAt: null }, select: { id: true } },
        positions: { select: { id: true } },
      },
      orderBy: { code: 'asc' },
    });

    const buildTree = (parentId: string | null): DepartmentTreeDto[] => {
      return departments
        .filter((d) => d.parentId === parentId)
        .map((d) => ({
          id: d.id,
          nameFa: d.nameFa,
          nameEn: d.nameEn || undefined,
          code: d.code,
          managerId: d.managerId || undefined,
          employeeCount: d.employees.length,
          positionCount: d.positions.length,
          children: buildTree(d.id),
        }));
    };

    return buildTree(null);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // POSITION CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  async createPosition(dto: CreatePositionDto, createdBy: string): Promise<any> {
    const department = await this.prisma.department.findUnique({ where: { id: dto.departmentId } });
    if (!department) throw new AppException('DEPARTMENT_NOT_FOUND');

    const position = await this.prisma.position.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        departmentId: dto.departmentId,
        code: dto.code,
        titleFa: dto.titleFa,
        titleEn: dto.titleEn,
        level: dto.level || 1,
        grade: dto.grade,
        minSalary: dto.minSalary ? BigInt(dto.minSalary) : undefined,
        maxSalary: dto.maxSalary ? BigInt(dto.maxSalary) : undefined,
        headcount: dto.headcount || 1,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'POSITION_CREATED',
      targetType: 'Position',
      targetId: position.id,
      userId: createdBy,
      metadata: { code: dto.code, titleFa: dto.titleFa, departmentId: dto.departmentId },
    });

    return position;
  }

  async updatePosition(id: string, dto: Partial<CreatePositionDto>): Promise<any> {
    const existing = await this.prisma.position.findUnique({ where: { id } });
    if (!existing) throw new AppException('POSITION_NOT_FOUND');

    const updateData: any = { ...dto };
    if (updateData.minSalary !== undefined) updateData.minSalary = BigInt(updateData.minSalary);
    if (updateData.maxSalary !== undefined) updateData.maxSalary = BigInt(updateData.maxSalary);

    return this.prisma.position.update({
      where: { id },
      data: updateData,
    });
  }

  async getPositions(departmentId: string): Promise<any[]> {
    return this.prisma.position.findMany({
      where: { departmentId, isActive: true },
      include: {
        _count: { select: { employees: true } },
      },
    });
  }

  async checkHeadcount(positionId: string): Promise<{
    allowed: boolean;
    headcount: number;
    currentCount: number;
  }> {
    const position = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!position) throw new AppException('POSITION_NOT_FOUND');

    return {
      allowed: position.currentCount < position.headcount,
      headcount: position.headcount,
      currentCount: position.currentCount,
    };
  }
}
