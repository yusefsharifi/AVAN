import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateTechnicianDto } from '../dto/create-dtos';

@Injectable()
export class TechnicianService {
  private readonly logger = new Logger(TechnicianService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateTechnicianDto, createdBy: string): Promise<any> {
    const tech = await (this.prisma as any).technician.create({
      data: {
        zoneId: dto.zoneId,
        userId: dto.userId,
        employeeNumber: dto.employeeNumber,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        specializations: dto.specializations,
        certifications: dto.certifications || [],
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: createdBy, targetId: tech.id, targetType: 'Technician',
      action: 'TECHNICIAN_CREATED', metadata: { name: dto.name, specializations: dto.specializations },
    });

    return tech;
  }

  async findAll(zoneId: string): Promise<any[]> {
    return (this.prisma as any).technician.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<any> {
    const tech = await (this.prisma as any).technician.findUnique({ where: { id } });
    if (!tech) throw new AppException('TECHNICIAN_NOT_FOUND');
    return tech;
  }

  async update(id: string, dto: Partial<CreateTechnicianDto>): Promise<any> {
    const existing = await this.findById(id);
    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.specializations !== undefined) updateData.specializations = dto.specializations;
    if (dto.certifications !== undefined) updateData.certifications = dto.certifications;
    if (dto.employeeNumber !== undefined) updateData.employeeNumber = dto.employeeNumber;

    const updated = await (this.prisma as any).technician.update({ where: { id }, data: updateData });

    await this.audit.log({
      zoneId: existing.zoneId, userId: 'system', targetId: id, targetType: 'Technician',
      action: 'TECHNICIAN_UPDATED', metadata: { name: updated.name },
    });

    return updated;
  }

  async toggleAvailability(id: string, updatedBy: string): Promise<any> {
    const tech = await this.findById(id);
    const updated = await (this.prisma as any).technician.update({
      where: { id },
      data: { isAvailable: !tech.isAvailable },
    });
    return updated;
  }

  async findAvailable(zoneId: string): Promise<any[]> {
    return (this.prisma as any).technician.findMany({
      where: { zoneId, isActive: true, isAvailable: true },
      orderBy: { activeWorkOrders: 'asc' },
    });
  }
}
