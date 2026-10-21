import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { CreateGroupVisitDto } from './dto/create-group-visit.dto';
import { AddGroupMemberDto } from './dto/add-group-member.dto';
import * as crypto from 'crypto';
import { getCurrentJalaliYear } from '../../common/utils/jalali';

@Injectable()
export class GroupVisitService {
  private readonly logger = new Logger(GroupVisitService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateGroupVisitDto, createdBy: string) {
    const year = getCurrentJalaliYear(); // BUG-002: dynamic Jalali year
    const seqKey = `group:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    // Counter is persistent - no expiry needed
    const groupNumber = `GV-${dto.zoneId.substring(0, 4)}-${year}-${String(seq).padStart(4, '0')}`;

    const group = await this.prisma.groupVisit.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        groupNumber,
        title: dto.title,
        organizerName: dto.organizerName,
        organizerPhone: dto.organizerPhone,
        organizerEmail: dto.organizerEmail,
        expectedCount: dto.expectedCount,
        purpose: dto.purpose,
        purposeDetail: dto.purposeDetail,
        visitDate: dto.visitDate,
        startTime: dto.startTime,
        endTime: dto.endTime,
        meetingPoint: dto.meetingPoint,
        allowedGates: dto.allowedGates || [],
        allowedZones: dto.allowedZones || [],
        hostId: dto.hostId,
        hostName: createdBy,
        escortRequired: dto.escortRequired || false,
        briefingNotes: dto.briefingNotes,
        notes: dto.notes,
        createdBy,
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: group.id,
      targetType: 'GroupVisit',
      action: 'GROUP_VISIT_CREATED',
      metadata: { groupNumber, title: dto.title, expectedCount: dto.expectedCount },
    });

    return group;
  }

  async approve(id: string, approved: boolean, reason: string, approverId: string) {
    const group = await this.prisma.groupVisit.findUnique({ where: { id } });
    if (!group) throw new AppException('GROUP_VISIT_NOT_FOUND');

    const updated = await this.prisma.groupVisit.update({
      where: { id },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: approved ? undefined : reason,
      },
    });

    await this.audit.log({
      zoneId: group.zoneId,
      userId: approverId,
      targetId: id,
      targetType: 'GroupVisit',
      action: approved ? 'GROUP_VISIT_APPROVED' : 'GROUP_VISIT_REJECTED',
      metadata: { groupNumber: group.groupNumber },
    });

    return updated;
  }

  async addMember(groupVisitId: string, dto: AddGroupMemberDto, addedBy: string) {
    const group = await this.prisma.groupVisit.findUnique({ where: { id: groupVisitId } });
    if (!group) throw new AppException('GROUP_VISIT_NOT_FOUND');

    const secret = 'idop-zone-secret';
    const memberId = crypto.randomUUID();
    const hmac = crypto.createHmac('sha256', secret).update(`VISITOR:${memberId}:${group.zoneId}`).digest('base64');
    const qrPayload = `IDOP:VISITOR:${memberId}:${hmac}`;

    const visitorRequest = await this.prisma.visitorRequest.create({
      data: {
        zoneId: group.zoneId,
        companyId: group.companyId,
        requestNumber: `VR-GROUP-${groupVisitId.substring(0, 8)}-${Date.now()}`,
        visitorName: dto.visitorName,
        visitorNationalId: dto.visitorNationalId,
        visitorPhone: dto.visitorPhone,
        visitorCompany: dto.visitorCompany,
        visitorJobTitle: dto.visitorJobTitle,
        purpose: group.purpose,
        type: 'GROUP',
        expectedDate: group.visitDate,
        expectedTime: group.startTime,
        expectedDuration: 120,
        allowedGates: group.allowedGates,
        allowedZones: group.allowedZones,
        hostId: group.hostId,
        hostName: group.hostName,
        hostPhone: '',
        status: group.status === 'APPROVED' ? 'APPROVED' : 'PENDING',
        groupVisitId,
        qrPayload,
        createdBy: addedBy,
      },
    });

    await this.prisma.groupVisit.update({
      where: { id: groupVisitId },
      data: { confirmedCount: { increment: 1 } },
    });

    await this.audit.log({
      zoneId: group.zoneId,
      userId: addedBy,
      targetId: visitorRequest.id,
      targetType: 'VisitorRequest',
      action: 'GROUP_VISIT_MEMBER_ADDED',
      metadata: { groupVisitId, visitorName: dto.visitorName },
    });

    return visitorRequest;
  }

  async removeMember(groupVisitId: string, visitorRequestId: string) {
    await this.prisma.visitorRequest.delete({ where: { id: visitorRequestId } });
    await this.prisma.groupVisit.update({
      where: { id: groupVisitId },
      data: { confirmedCount: { decrement: 1 } },
    });
  }

  async bulkAddMembers(
    groupVisitId: string,
    members: AddGroupMemberDto[],
    addedBy: string,
  ) {
    const group = await this.prisma.groupVisit.findUnique({ where: { id: groupVisitId } });
    if (!group) throw new AppException('GROUP_VISIT_NOT_FOUND');

    let added = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const member of members) {
      try {
        await this.addMember(groupVisitId, member, addedBy);
        added++;
      } catch (err) {
        failed++;
        errors.push(`Failed to add ${member.visitorName}: ${(err as Error).message}`);
      }
    }

    return { added, failed, errors };
  }

  async getGroupDashboard(id: string) {
    const group = await this.prisma.groupVisit.findUnique({ where: { id } });
    if (!group) throw new AppException('GROUP_VISIT_NOT_FOUND');

    const members = await this.prisma.visitorRequest.findMany({
      where: { groupVisitId: id },
    });

    return {
      group,
      members,
      checkedInCount: members.filter((m) => m.status === 'CHECKED_IN').length,
      checkedOutCount: members.filter((m) => m.status === 'CHECKED_OUT').length,
      pendingCount: members.filter((m) => m.status === 'PENDING').length,
      currentlyInside: members.filter((m) => m.status === 'CHECKED_IN').length,
    };
  }

  async markGroupCompleted(id: string) {
    return this.prisma.groupVisit.update({
      where: { id },
      data: { status: 'COMPLETED' },
    });
  }

  async findAll(zoneId: string, companyId?: string) {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;
    return this.prisma.groupVisit.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findById(id: string) {
    const group = await this.prisma.groupVisit.findUnique({ where: { id } });
    if (!group) throw new AppException('GROUP_VISIT_NOT_FOUND');
    return group;
  }
}
