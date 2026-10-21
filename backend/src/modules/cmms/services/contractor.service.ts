import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateContractorDto, UpdateContractorDto } from '../dto/create-dtos';

@Injectable()
export class ContractorService {
  private readonly logger = new Logger(ContractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateContractorDto, createdBy: string): Promise<any> {
    const contractor = await (this.prisma as any).maintenanceContractor.create({
      data: {
        zoneId: dto.zoneId,
        name: dto.name,
        licenseNumber: dto.licenseNumber,
        specializations: dto.specializations,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        slaHours: dto.slaHours || 24,
        contractPeriod: dto.contractPeriod || {},
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId, userId: createdBy, targetId: contractor.id, targetType: 'Contractor',
      action: 'CONTRACTOR_CREATED', metadata: { name: dto.name, specializations: dto.specializations },
    });

    return contractor;
  }

  async findAll(zoneId: string): Promise<any[]> {
    return (this.prisma as any).maintenanceContractor.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<any> {
    const contractor = await (this.prisma as any).maintenanceContractor.findUnique({ where: { id } });
    if (!contractor) throw new AppException('CONTRACTOR_NOT_FOUND');
    return contractor;
  }

  async update(id: string, dto: UpdateContractorDto, updatedBy: string): Promise<any> {
    const existing = await this.findById(id);
    const updateData: any = {};

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.specializations !== undefined) updateData.specializations = dto.specializations;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.address !== undefined) updateData.address = dto.address;
    if (dto.slaHours !== undefined) updateData.slaHours = dto.slaHours;

    const updated = await (this.prisma as any).maintenanceContractor.update({
      where: { id }, data: updateData,
    });

    await this.audit.log({
      zoneId: existing.zoneId, userId: updatedBy, targetId: id, targetType: 'Contractor',
      action: 'CONTRACTOR_CREATED', metadata: { name: updated.name },
    });

    return updated;
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<any> {
    const contractor = await this.findById(id);

    const updated = await (this.prisma as any).maintenanceContractor.update({
      where: { id },
      data: { isBlacklisted: true, blacklistReason: reason },
    });

    await this.audit.log({
      zoneId: contractor.zoneId, userId: blacklistedBy, targetId: id, targetType: 'Contractor',
      action: 'CONTRACTOR_BLACKLISTED', metadata: { name: contractor.name, reason },
    });

    return updated;
  }
}
