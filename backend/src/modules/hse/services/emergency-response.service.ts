import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateEmergencyContactDto, ScheduleDrillDto, RecordDrillDto } from '../dto/create-dtos';
import { HseGatewayService } from './hse-gateway.service';

@Injectable()
export class EmergencyResponseService {
  private readonly logger = new Logger(EmergencyResponseService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: HseGatewayService,
  ) {}

  async addContact(zoneId: string, dto: CreateEmergencyContactDto): Promise<any> {
    return (this.prisma as any).emergencyContact.create({
      data: {
        zoneId, companyId: dto.companyId, name: dto.name, role: dto.role,
        phone: dto.phone, altPhone: dto.altPhone, email: dto.email,
        priority: dto.priority || 1, notes: dto.notes,
      },
    });
  }

  async updateContact(id: string, dto: Partial<CreateEmergencyContactDto>): Promise<any> {
    const existing = await (this.prisma as any).emergencyContact.findUnique({ where: { id } });
    if (!existing) throw new AppException('EMERGENCY_CONTACT_NOT_FOUND');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.altPhone !== undefined) updateData.altPhone = dto.altPhone;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.priority !== undefined) updateData.priority = dto.priority;

    return (this.prisma as any).emergencyContact.update({ where: { id }, data: updateData });
  }

  async getContacts(zoneId: string, companyId?: string): Promise<any[]> {
    const where: any = { zoneId, isActive: true };
    if (companyId) where.OR = [{ companyId }, { companyId: null }];
    return (this.prisma as any).emergencyContact.findMany({ where, orderBy: { priority: 'asc' } });
  }

  async deleteContact(id: string): Promise<void> {
    await (this.prisma as any).emergencyContact.update({ where: { id }, data: { isActive: false } });
  }

  async scheduleDrill(dto: ScheduleDrillDto): Promise<any> {
    return (this.prisma as any).emergencyDrill.create({
      data: {
        zoneId: dto.zoneId, companyId: dto.companyId, type: dto.type,
        scheduledAt: new Date(dto.scheduledAt), status: 'SCHEDULED', objectives: dto.objectives,
      },
    });
  }

  async recordDrillResults(id: string, dto: RecordDrillDto): Promise<any> {
    const drill = await (this.prisma as any).emergencyDrill.findUnique({ where: { id } });
    if (!drill) throw new AppException('DRILL_NOT_FOUND');

    const updated = await (this.prisma as any).emergencyDrill.update({
      where: { id },
      data: {
        status: 'COMPLETED', conductedAt: new Date(dto.conductedAt),
        participantCount: dto.participantCount, duration: dto.duration,
        findings: dto.findings, improvements: dto.improvements,
        conductedBy: dto.conductedBy,
      },
    });

    await this.audit.log({
      zoneId: drill.zoneId, userId: dto.conductedBy || 'system', targetId: id, targetType: 'EmergencyDrill',
      action: 'DRILL_COMPLETED',
      metadata: { type: drill.type, participantCount: dto.participantCount },
    });

    return updated;
  }

  async getDrills(zoneId: string, filter?: any): Promise<any[]> {
    return (this.prisma as any).emergencyDrill.findMany({
      where: { zoneId }, orderBy: { scheduledAt: 'desc' }, take: 50,
    });
  }

  async triggerEmergencyAlert(zoneId: string, type: string, location: string, details: string, triggeredBy: string): Promise<void> {
    const contacts = await this.getContacts(zoneId);

    this.gateway.emitEmergency({
      zoneId, type, location, details, triggeredAt: new Date(),
    });

    await this.audit.log({
      zoneId, userId: triggeredBy, targetId: '', targetType: 'EmergencyAlert',
      action: 'EMERGENCY_ALERT_TRIGGERED',
      metadata: { type, location, details, contactsNotified: contacts.length },
    });
  }

  async getEmergencyContacts(zoneId: string): Promise<any[]> {
    return (this.prisma as any).emergencyContact.findMany({
      where: { zoneId, isActive: true }, orderBy: { priority: 'asc' },
    });
  }
}
