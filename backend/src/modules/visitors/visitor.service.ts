import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { AppException } from '../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../common/constants/error-codes';
import { RedisKeys } from '../../common/utils/redis-keys';
import { CreateVisitorRequestDto } from './dto/create-visitor-request.dto';
import { ApproveVisitorDto } from './dto/approve-visitor.dto';
import { CheckinVisitorDto } from './dto/checkin-visitor.dto';
import { CheckoutVisitorDto } from './dto/checkout-visitor.dto';
import { WalkInVisitorDto } from './dto/walk-in-visitor.dto';
import { FilterVisitorsDto } from './dto/filter-visitors.dto';
import { RequestExtensionDto } from './dto/request-extension.dto';
import { getCurrentJalaliYear, getCurrentJalaliDate } from '../../common/utils/jalali';
import * as crypto from 'crypto';
import { notify } from '../notifications/utils/notify.helper';

@Injectable()
export class VisitorService {
  private readonly logger = new Logger(VisitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly bull: BullService,
    private readonly audit: AuditService,
    private readonly gateway: IdopGateway,
  ) {}

  // ─── REQUEST MANAGEMENT ────────────────────────────────────────────────────

  async createRequest(dto: CreateVisitorRequestDto, createdBy: string) {
    // 1. Check zone is ACTIVE
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone || zone.status !== 'ACTIVE') {
      throw new AppException('ZONE_NOT_ACTIVE');
    }

    // 2. Check zone settings
    const settings = (zone.settings as any) || {};
    const maxDaysAdvance = settings.maxVisitorDaysAdvance || 30;
    const autoApprove = settings.autoApproveVisitor || false;

    // 3. Verify host exists and belongs to company
    const host = await this.prisma.user.findUnique({ where: { id: dto.hostId } });
    if (!host) throw new AppException('HOST_NOT_FOUND');
    if (host.companyId !== dto.companyId) {
      throw new AppException('HOST_NOT_BELONGS_TO_COMPANY');
    }

    // 4. Check visitor not in blacklist
    await this.checkBlacklistInternal(dto.zoneId, dto.visitorNationalId, dto.visitorPhone);

    // 5. Generate request number (BUG-002: dynamic Jalali year)
    const year = getCurrentJalaliYear();
    const seqKey = `visitor:seq:${dto.zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    // Counter is persistent - no expiry needed
    const requestNumber = `VR-${zone.code}-${year}-${String(seq).padStart(6, '0')}`;

    // 6. Create VisitorRequest
    const visitorRequest = await this.prisma.visitorRequest.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        requestNumber,
        visitorName: dto.visitorName,
        visitorNationalId: dto.visitorNationalId,
        visitorPhone: dto.visitorPhone,
        visitorEmail: dto.visitorEmail,
        visitorCompany: dto.visitorCompany,
        visitorJobTitle: dto.visitorJobTitle,
        purpose: dto.purpose,
        purposeDetail: dto.purposeDetail,
        type: dto.type,
        expectedDate: dto.expectedDate,
        expectedTime: dto.expectedTime,
        expectedDuration: dto.expectedDuration || 120,
        allowedGates: dto.allowedGates || [],
        allowedZones: dto.allowedZones || [],
        vehiclePlate: dto.vehiclePlate,
        vehicleType: dto.vehicleType as any,
        hostId: dto.hostId,
        hostName: host.firstName + ' ' + host.lastName,
        hostPhone: host.phone,
        hostDepartment: null,
        isVip: dto.isVip || false,
        requiresEscort: dto.requiresEscort || false,
        status: autoApprove ? 'APPROVED' : 'PENDING',
        createdBy,
      },
    });

    // 7. If auto-approve, generate QR
    if (autoApprove) {
      await this.generateQrForRequest(visitorRequest.id, dto.zoneId);
    }

    // 8. Audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: visitorRequest.id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_REQUEST_CREATED',
      metadata: { requestNumber, visitorName: dto.visitorName, purpose: dto.purpose },
    });

    // 9. COMP-007: Emit socket event via gateway
    this.gateway.emitToZone(dto.zoneId, 'visitor:request:created', {
      id: visitorRequest.id,
      requestNumber,
      visitorName: dto.visitorName,
      purpose: dto.purpose,
      hostId: dto.hostId,
      expectedDate: dto.expectedDate,
      createdBy,
    });

    return visitorRequest;
  }

  async approveRequest(id: string, dto: ApproveVisitorDto, approverId: string) {
    const request = await this.prisma.visitorRequest.findUnique({ where: { id } });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');
    if (request.status !== 'PENDING') {
      throw new AppException('VISITOR_STATUS_INVALID');
    }

    // Verify approver is host or manager
    const approver = await this.prisma.user.findUnique({ where: { id: approverId } });
    const isHost = request.hostId === approverId;
    const isManager = approver && ['COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER'].includes(approver.role);
    if (!isHost && !isManager) {
      throw new AppException('USER_PERMISSION_DENIED');
    }

    if (!dto.approved) {
      // Reject
      const updated = await this.prisma.visitorRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedBy: approverId,
          rejectedAt: new Date(),
          rejectionReason: dto.rejectionReason || 'درخواست رد شد',
        },
      });

      await this.audit.log({
        zoneId: request.zoneId,
        userId: approverId,
        targetId: id,
        targetType: 'VisitorRequest',
        action: 'VISITOR_REQUEST_REJECTED',
        metadata: { rejectionReason: dto.rejectionReason },
      });

      return updated;
    }

    // Approve
    const now = new Date();
    const qrExpiresMs = 24 * 60 * 60 * 1000; // 24 hours from now

    const updated = await this.prisma.visitorRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverId,
        approvedAt: now,
        allowedGates: dto.allowedGates || request.allowedGates,
        allowedZones: dto.allowedZones || request.allowedZones,
        requiresEscort: dto.requiresEscort ?? request.requiresEscort,
        expectedDuration: dto.maxDuration || request.expectedDuration,
        qrExpiresAt: new Date(now.getTime() + qrExpiresMs),
      },
    });

    // Generate QR
    await this.generateQrForRequest(id, request.zoneId);

    // Audit
    await this.audit.log({
      zoneId: request.zoneId,
      userId: approverId,
      targetId: id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_REQUEST_APPROVED',
      metadata: { visitorName: request.visitorName },
    });

    return updated;
  }

  async rejectRequest(id: string, reason: string, rejectedBy: string) {
    return this.approveRequest(id, { approved: false, rejectionReason: reason }, rejectedBy);
  }

  async cancelRequest(id: string, cancelledBy: string) {
    const request = await this.prisma.visitorRequest.findUnique({ where: { id } });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');
    if (!['PENDING', 'APPROVED'].includes(request.status)) {
      throw new AppException('VISITOR_STATUS_INVALID');
    }

    const updated = await this.prisma.visitorRequest.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.audit.log({
      zoneId: request.zoneId,
      userId: cancelledBy,
      targetId: id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_REQUEST_CANCELLED',
      metadata: { requestNumber: request.requestNumber },
    });

    return updated;
  }

  async findAll(filter: FilterVisitorsDto, zoneId?: string) {
    const effectiveZoneId = filter.zoneId || zoneId;
    const limit = filter.limit || 20;

    const where: any = {
      deletedAt: null,
      ...(effectiveZoneId && { zoneId: effectiveZoneId }),
      ...(filter.companyId && { companyId: filter.companyId }),
      ...(filter.hostId && { hostId: filter.hostId }),
      ...(filter.status && { status: filter.status }),
      ...(filter.purpose && { purpose: filter.purpose }),
      ...(filter.type && { type: filter.type }),
      ...(filter.expectedDate && { expectedDate: filter.expectedDate }),
      ...(filter.isVip !== undefined && { isVip: filter.isVip }),
    };

    if (filter.search) {
      where.OR = [
        { visitorName: { contains: filter.search, mode: 'insensitive' } },
        { visitorPhone: { contains: filter.search } },
        { visitorNationalId: { contains: filter.search } },
        { visitorCompany: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    if (filter.currentlyInside) {
      where.status = 'CHECKED_IN';
    }

    const cursor = filter.cursor ? { id: filter.cursor } : undefined;

    const [items, total] = await Promise.all([
      this.prisma.visitorRequest.findMany({
        where,
        take: limit + 1,
        skip: cursor ? 1 : 0,
        cursor,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.visitorRequest.count({ where }),
    ]);

    const hasMore = items.length > limit;
    const data = hasMore ? items.slice(0, limit) : items;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return {
      data,
      meta: { total, limit, cursor: nextCursor },
    };
  }

  async findById(id: string, zoneId?: string) {
    const where: any = { id, deletedAt: null };
    if (zoneId) where.zoneId = zoneId;

    const request = await this.prisma.visitorRequest.findFirst({ where });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');
    return request;
  }

  async findTodayVisitors(zoneId: string, companyId?: string) {
    const today = getCurrentJalaliDate(); // BUG-009: dynamic Jalali date
    const cacheKey = RedisKeys.visitorToday(zoneId);

    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const where: any = {
      zoneId,
      expectedDate: today,
      status: { in: ['APPROVED', 'CHECKED_IN'] },
      deletedAt: null,
    };
    if (companyId) where.companyId = companyId;

    const visitors = await this.prisma.visitorRequest.findMany({
      where,
      orderBy: { expectedTime: 'asc' },
    });

    await this.redis.set(cacheKey, JSON.stringify(visitors), 60);
    return visitors;
  }

  async getCurrentlyInside(zoneId: string, companyId?: string) {
    const where: any = {
      zoneId,
      status: 'CHECKED_IN',
      deletedAt: null,
    };
    if (companyId) where.companyId = companyId;

    return this.prisma.visitorRequest.findMany({
      where,
      orderBy: { checkedInAt: 'asc' },
    });
  }

  // ─── CHECK-IN / CHECK-OUT ─────────────────────────────────────────────────

  async checkInVisitor(dto: CheckinVisitorDto, guardId: string, zoneId: string) {
    // 1. Parse and verify QR payload
    const qrData = this.parseQrPayload(dto.qrPayload);
    if (!qrData.isValid) {
      throw new AppException('VISITOR_QR_INVALID');
    }

    // 2. Find visitor request
    const request = await this.prisma.visitorRequest.findUnique({
      where: { id: qrData.id },
    });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');

    // 3. Validate
    if (request.status !== 'APPROVED') {
      throw new AppException('VISITOR_NOT_APPROVED');
    }
    if (request.qrUsedAt) {
      throw new AppException('VISITOR_QR_ALREADY_USED');
    }
    if (request.qrExpiresAt && request.qrExpiresAt < new Date()) {
      throw new AppException('VISITOR_QR_EXPIRED');
    }
    if (request.allowedGates.length > 0 && !request.allowedGates.includes(dto.gateId)) {
      throw new AppException('VISITOR_WRONG_GATE');
    }

    // 4. Re-check blacklist
    await this.checkBlacklistInternal(zoneId, request.visitorNationalId, request.visitorPhone);

    // 5. Update status
    const updated = await this.prisma.visitorRequest.update({
      where: { id: request.id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: new Date(),
        checkedInGate: dto.gateId,
        qrUsedAt: new Date(),
      },
    });

    // 6. Create tracking event
    await this.prisma.visitorTracking.create({
      data: {
        visitorRequestId: request.id,
        zoneId,
        eventType: 'CHECKED_IN',
        gateId: dto.gateId,
        recordedBy: guardId,
        notes: dto.notes,
      },
    });

    // 7. Audit
    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: request.id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_CHECKED_IN',
      metadata: { gateId: dto.gateId, visitorName: request.visitorName },
    });

    // 8. Notify host that visitor has arrived
    notify.visitorCheckedIn({
      id: request.id, zoneId,
      visitorName: request.visitorName,
      visitorCompany: request.visitorCompany,
    }, request.hostId).catch(() => {});

    // 9. Clear caches
    await this.redis.del(RedisKeys.visitorToday(zoneId));

    return {
      visitor: updated,
      host: { name: request.hostName, phone: request.hostPhone, department: request.hostDepartment },
      allowedZones: request.allowedZones,
      requiresEscort: request.requiresEscort,
      message: `بازدیدکننده ${request.visitorName} وارد شد`,
    };
  }

  async checkOutVisitor(dto: CheckoutVisitorDto, guardId: string, zoneId: string) {
    const request = await this.prisma.visitorRequest.findUnique({
      where: { id: dto.visitorRequestId },
    });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');
    if (request.status !== 'CHECKED_IN') {
      throw new AppException('VISITOR_NOT_CHECKED_IN');
    }

    const now = new Date();
    const actualDuration = request.checkedInAt
      ? Math.floor((now.getTime() - request.checkedInAt.getTime()) / 60000)
      : 0;

    const updated = await this.prisma.visitorRequest.update({
      where: { id: request.id },
      data: {
        status: 'CHECKED_OUT',
        checkedOutAt: now,
        checkedOutGate: dto.gateId,
        actualDuration,
      },
    });

    // Tracking event
    await this.prisma.visitorTracking.create({
      data: {
        visitorRequestId: request.id,
        zoneId,
        eventType: 'CHECKED_OUT',
        gateId: dto.gateId,
        recordedBy: guardId,
        notes: dto.notes,
      },
    });

    // Audit
    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: request.id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_CHECKED_OUT',
      metadata: { gateId: dto.gateId, duration: actualDuration },
    });

    await this.redis.del(RedisKeys.visitorToday(zoneId));

    return updated;
  }

  async forceExit(visitorRequestId: string, reason: string, forcedBy: string, zoneId: string) {
    const request = await this.prisma.visitorRequest.findUnique({
      where: { id: visitorRequestId },
    });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');

    const updated = await this.prisma.visitorRequest.update({
      where: { id: visitorRequestId },
      data: { status: 'CHECKED_OUT', checkedOutAt: new Date() },
    });

    await this.prisma.visitorTracking.create({
      data: {
        visitorRequestId,
        zoneId,
        eventType: 'FORCED_EXIT',
        recordedBy: forcedBy,
        notes: reason,
      },
    });

    await this.audit.log({
      zoneId,
      userId: forcedBy,
      targetId: visitorRequestId,
      targetType: 'VisitorRequest',
      action: 'VISITOR_FORCE_EXIT',
      metadata: { reason, visitorName: request.visitorName },
    });

    return updated;
  }

  // ─── WALK-IN VISITORS ─────────────────────────────────────────────────────

  async processWalkIn(dto: WalkInVisitorDto, guardId: string, zoneId: string) {
    // 1. Check blacklist
    await this.checkBlacklistInternal(zoneId, dto.visitorNationalId, dto.visitorPhone);

    // 2. Find host
    const host = await this.prisma.user.findUnique({ where: { id: dto.hostId } });
    if (!host) throw new AppException('HOST_NOT_FOUND');

    // 3. Generate request number (BUG-002: dynamic Jalali year)
    const year = getCurrentJalaliYear();
    const seqKey = `visitor:seq:${zoneId}:${year}`;
    const seq = await this.redis.incr(seqKey);
    const requestNumber = `VR-${zoneId.substring(0, 4)}-${year}-${String(seq).padStart(6, '0')}`;

    // 4. Create walk-in request
    const request = await this.prisma.visitorRequest.create({
      data: {
        zoneId,
        companyId: dto.companyId,
        requestNumber,
        visitorName: dto.visitorName,
        visitorNationalId: dto.visitorNationalId,
        visitorPhone: dto.visitorPhone,
        visitorCompany: dto.visitorCompany,
        purpose: dto.purpose,
        purposeDetail: dto.purposeDetail,
        type: 'WALK_IN',
        expectedDate: getCurrentJalaliDate(),
        expectedTime: new Date().toTimeString().substring(0, 5),
        expectedDuration: dto.expectedDuration || 60,
        hostId: dto.hostId,
        hostName: host.firstName + ' ' + host.lastName,
        hostPhone: host.phone,
        isWalkIn: true,
        status: 'PENDING',
        createdBy: guardId,
      },
    });

    // 5. Audit
    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: request.id,
      targetType: 'VisitorRequest',
      action: 'VISITOR_WALK_IN_CREATED',
      metadata: { visitorName: dto.visitorName, hostId: dto.hostId },
    });

    // 6. Notify host of walk-in visitor awaiting approval
    notify.visitorWalkIn({
      id: request.id, zoneId,
      visitorName: dto.visitorName,
      visitorCompany: dto.visitorCompany,
      purpose: dto.purpose,
      gateName: 'اصلی',
    }, dto.hostId).catch(() => {});

    return request;
  }

  async getHostPendingApprovals(hostId: string, zoneId: string) {
    return this.prisma.visitorRequest.findMany({
      where: {
        zoneId,
        hostId,
        status: 'PENDING',
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── EXTENSION MANAGEMENT ─────────────────────────────────────────────────

  async requestExtension(dto: RequestExtensionDto, requestedBy: string) {
    const request = await this.prisma.visitorRequest.findUnique({
      where: { id: dto.visitorRequestId },
    });
    if (!request) throw new AppException('VISITOR_REQUEST_NOT_FOUND');
    if (request.status !== 'CHECKED_IN') {
      throw new AppException('VISITOR_NOT_CHECKED_IN');
    }
    if (request.hostId !== requestedBy) {
      throw new AppException('USER_PERMISSION_DENIED');
    }

    const extension = await this.prisma.visitExtension.create({
      data: {
        visitorRequestId: dto.visitorRequestId,
        requestedBy,
        originalEndTime: request.qrExpiresAt || new Date(),
        newEndTime: new Date(
          (request.qrExpiresAt || new Date()).getTime() + dto.additionalMinutes * 60000,
        ),
        reason: dto.reason,
      },
    });

    await this.audit.log({
      zoneId: request.zoneId,
      userId: requestedBy,
      targetId: dto.visitorRequestId,
      targetType: 'VisitorRequest',
      action: 'VISITOR_EXTENSION_REQUESTED',
      metadata: { additionalMinutes: dto.additionalMinutes, reason: dto.reason },
    });

    return extension;
  }

  async approveExtension(extensionId: string, approved: boolean, approverId: string) {
    const extension = await this.prisma.visitExtension.findUnique({
      where: { id: extensionId },
    });
    if (!extension) throw new AppException('EXTENSION_NOT_FOUND');
    if (extension.status !== 'PENDING') {
      throw new AppException('EXTENSION_ALREADY_RESOLVED');
    }

    const updated = await this.prisma.visitExtension.update({
      where: { id: extensionId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        approvedBy: approverId,
        resolvedAt: new Date(),
      },
    });

    if (approved) {
      await this.prisma.visitorRequest.update({
        where: { id: extension.visitorRequestId },
        data: { qrExpiresAt: extension.newEndTime },
      });
    }

    const request = await this.prisma.visitorRequest.findUnique({
      where: { id: extension.visitorRequestId },
    });

    await this.audit.log({
      zoneId: request?.zoneId,
      userId: approverId,
      targetId: extension.visitorRequestId,
      targetType: 'VisitorRequest',
      action: approved ? 'VISITOR_EXTENSION_APPROVED' : 'VISITOR_EXTENSION_REJECTED',
      metadata: { extensionId },
    });

    return updated;
  }

  // ─── OVERSTAY MONITORING ──────────────────────────────────────────────────

  async getOverstayVisitors(zoneId: string) {
    const checkedIn = await this.prisma.visitorRequest.findMany({
      where: { zoneId, status: 'CHECKED_IN', deletedAt: null },
    });

    const now = new Date();
    return checkedIn
      .filter((v) => {
        if (!v.checkedInAt) return false;
        const expectedEnd = new Date(v.checkedInAt.getTime() + v.expectedDuration * 60000);
        return now > expectedEnd;
      })
      .map((v) => {
        const expectedEnd = new Date(v.checkedInAt!.getTime() + v.expectedDuration * 60000);
        const overstayMinutes = Math.floor((now.getTime() - expectedEnd.getTime()) / 60000);
        return {
          ...v,
          overstayMinutes,
        };
      });
  }

  async sendOverstayAlert(visitorRequestId: string, zoneId: string) {
    const request = await this.prisma.visitorRequest.findUnique({ where: { id: visitorRequestId } });

    await this.prisma.visitorTracking.create({
      data: {
        visitorRequestId,
        zoneId,
        eventType: 'OVERSTAY_ALERT',
        notes: 'Overstay alert sent',
      },
    });

    // Notify host and zone operator of overstay
    if (request) {
      const overstayMinutes = request.checkedInAt
        ? Math.floor((Date.now() - request.checkedInAt.getTime()) / 60000) - request.expectedDuration
        : 0;

      notify.visitorOverstay({
        id: request.id, zoneId,
        visitorName: request.visitorName,
        visitorCompany: request.visitorCompany,
      }, request.hostId, overstayMinutes > 0 ? overstayMinutes : 0).catch(() => {});
    }
  }

  // ─── VIP PROTOCOL ─────────────────────────────────────────────────────────

  async setVipProtocol(visitorRequestId: string, setBy: string) {
    return this.prisma.visitorRequest.update({
      where: { id: visitorRequestId },
      data: { isVip: true, requiresEscort: true },
    });
  }

  // ─── TRACKING ─────────────────────────────────────────────────────────────

  async getTrackingTimeline(visitorRequestId: string) {
    return this.prisma.visitorTracking.findMany({
      where: { visitorRequestId },
      orderBy: { occurredAt: 'asc' },
    });
  }

  // ─── PHOTO MANAGEMENT ─────────────────────────────────────────────────────

  async uploadVisitorPhoto(visitorRequestId: string, file: Express.Multer.File, uploadedBy: string) {
    // In production: resize with sharp, upload to MinIO
    const photoKey = `visitor-photos/${visitorRequestId}/photo.jpg`;

    await this.prisma.visitorRequest.update({
      where: { id: visitorRequestId },
      data: { visitorPhotoKey: photoKey },
    });

    return { photoUrl: photoKey };
  }

  async uploadAttachment(visitorRequestId: string, type: string, file: Express.Multer.File, uploadedBy: string) {
    const fileKey = `visitor-attachments/${visitorRequestId}/${type}/${file.originalname}`;

    return this.prisma.visitorAttachment.create({
      data: {
        visitorRequestId,
        type,
        fileKey,
        fileName: file.originalname,
        uploadedBy,
      },
    });
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  async getVisitorStats(zoneId: string, companyId?: string) {
    const where: any = { zoneId, deletedAt: null };
    if (companyId) where.companyId = companyId;

    const all = await this.prisma.visitorRequest.findMany({ where });

    const byPurpose: Record<string, number> = {};
    const byHour = new Array(24).fill(0);
    let totalDuration = 0;
    let durationCount = 0;

    for (const v of all) {
      byPurpose[v.purpose] = (byPurpose[v.purpose] || 0) + 1;
      if (v.expectedTime) {
        const hour = parseInt(v.expectedTime.split(':')[0], 10);
        byHour[hour] = (byHour[hour] || 0) + 1;
      }
      if (v.actualDuration) {
        totalDuration += v.actualDuration;
        durationCount++;
      }
    }

    return {
      total: all.length,
      approved: all.filter((v) => v.status === 'APPROVED').length,
      rejected: all.filter((v) => v.status === 'REJECTED').length,
      checkedIn: all.filter((v) => v.status === 'CHECKED_IN').length,
      checkedOut: all.filter((v) => v.status === 'CHECKED_OUT').length,
      noShow: all.filter((v) => v.status === 'NO_SHOW').length,
      walkIn: all.filter((v) => v.isWalkIn).length,
      vip: all.filter((v) => v.isVip).length,
      avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
      byPurpose,
      byHour,
      currentlyInside: all.filter((v) => v.status === 'CHECKED_IN').length,
    };
  }

  // ─── INTERNAL HELPERS ─────────────────────────────────────────────────────

  private async generateQrForRequest(requestId: string, zoneId: string) {
    const secret = 'idop-zone-secret'; // In production, use zone-specific HMAC secret
    const hmac = crypto
      .createHmac('sha256', secret)
      .update(`VISITOR:${requestId}:${zoneId}`)
      .digest('base64');
    const qrPayload = `IDOP:VISITOR:${requestId}:${hmac}`;

    await this.prisma.visitorRequest.update({
      where: { id: requestId },
      data: { qrPayload },
    });

    return qrPayload;
  }

  private parseQrPayload(payload: string): { isValid: boolean; id: string } {
    try {
      if (!payload.startsWith('IDOP:VISITOR:')) {
        return { isValid: false, id: '' };
      }
      const parts = payload.split(':');
      if (parts.length < 4) return { isValid: false, id: '' };

      const id = parts[2];
      const providedHmac = parts[3];

      // BUG-NEW-001: Actually verify HMAC instead of always returning true
      // Use zone-specific secret from the zone's settings in production.
      // For now, use a fallback secret — callers should pass zoneId for proper verification.
      const secret = 'idop-zone-secret';
      const expectedHmac = crypto
        .createHmac('sha256', secret)
        .update(`VISITOR:${id}`)
        .digest('base64');

      // Constant-time comparison to prevent timing attacks
      const isValid = crypto.timingSafeEqual(
        Buffer.from(providedHmac),
        Buffer.from(expectedHmac),
      );

      return { isValid, id };
    } catch {
      return { isValid: false, id: '' };
    }
  }

  private async checkBlacklistInternal(zoneId: string, nationalId?: string | null, phone?: string) {
    const cacheKey = nationalId
      ? RedisKeys.visitorBlacklist(zoneId, nationalId)
      : RedisKeys.visitorBlacklist(zoneId, phone || '');

    const cached = await this.redis.get(cacheKey);
    if (cached === 'BLOCKED') {
      throw new AppException('VISITOR_BLACKLISTED');
    }

    const where: any = { zoneId, isActive: true };
    if (nationalId) where.nationalId = nationalId;
    else if (phone) where.phone = phone;
    else return;

    const entry = await this.prisma.visitorBlacklist.findFirst({ where });
    if (entry) {
      await this.redis.set(cacheKey, 'BLOCKED', 300);
      throw new AppException('VISITOR_BLACKLISTED');
    }

    await this.redis.set(cacheKey, 'CLEAR', 300);
  }
}
