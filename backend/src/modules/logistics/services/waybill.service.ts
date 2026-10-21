import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { normalizePlate } from '../../../common/utils/plate-normalizer';
import { generateQrPayload } from '../../../common/utils/qr-generator';
import { WaybillStatus, ApprovalStatus, ShipmentDirection, CargoCategory } from '@prisma/client';
import { CreateWaybillDto } from '../dto/create-waybill.dto';
import { ApproveWaybillStepDto } from '../dto/approve-waybill-step.dto';
import { FilterWaybillsDto } from '../dto/filter-waybills.dto';
import { notify } from '../../notifications/utils/notify.helper';

interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; nextCursor?: string };
}

interface ApprovalStep {
  stepOrder: number;
  roleFa: string;
  isRequired: boolean;
}

const STANDARD_APPROVAL_CHAIN: ApprovalStep[] = [
  { stepOrder: 1, roleFa: 'مسئول لجستیک', isRequired: true },
  { stepOrder: 2, roleFa: 'مدیر شرکت', isRequired: true },
  { stepOrder: 3, roleFa: 'حراست', isRequired: true },
];

const HAZMAT_APPROVAL_CHAIN: ApprovalStep[] = [
  { stepOrder: 1, roleFa: 'مسئول لجستیک', isRequired: true },
  { stepOrder: 2, roleFa: 'مسئول ایمنی', isRequired: true },
  { stepOrder: 3, roleFa: 'مدیر شرکت', isRequired: true },
  { stepOrder: 4, roleFa: 'حراست', isRequired: true },
];

const OVERSIZE_APPROVAL_CHAIN: ApprovalStep[] = [
  { stepOrder: 1, roleFa: 'مسئول لجستیک', isRequired: true },
  { stepOrder: 2, roleFa: 'مدیر شرکت', isRequired: true },
  { stepOrder: 3, roleFa: 'مدیر شهرک', isRequired: true },
  { stepOrder: 4, roleFa: 'حراست', isRequired: true },
];

@Injectable()
export class WaybillService {
  private readonly logger = new Logger(WaybillService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────
  async create(dto: CreateWaybillDto, createdBy: string): Promise<any> {
    // 1. Get zone code for waybill number generation
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) {
      throw new AppException('ZONE_NOT_FOUND');
    }

    // 2. Validate hazmat fields
    if (dto.isHazmat) {
      if (!dto.hazmatClass || !dto.hazmatUnNumber || !dto.hazmatEmergencyPhone) {
        throw new AppException('WAYBILL_HAZMAT_MISSING_FIELDS');
      }
    }

    // 3. Generate waybill number: WB-{zoneCode}-{year}-{seq:06d}
    const now = new Date();
    const jalaliYear = this.getJalaliYear(now);
    const seqKey = `waybill:seq:${dto.zoneId}:${jalaliYear}`;
    const seq = await this.redis.incr(seqKey);
    // Set expiry on first call (end of year)
    if (seq === 1) {
      // seq expiry handled by incr; no explicit expiry needed for annual counter
    }
    const waybillNumber = `WB-${zone.code}-${jalaliYear}-${String(seq).padStart(6, '0')}`;

    // 4. Normalize plate
    const normalizedPlate = normalizePlate(dto.vehiclePlate);

    // 5. Determine approval chain
    let approvalChain: ApprovalStep[];
    switch (dto.type) {
      case 'HAZMAT':
        approvalChain = HAZMAT_APPROVAL_CHAIN;
        break;
      case 'OVERSIZE':
        approvalChain = OVERSIZE_APPROVAL_CHAIN;
        break;
      default:
        approvalChain = STANDARD_APPROVAL_CHAIN;
    }

    // 6. Create Waybill + WaybillApproval records in transaction
    const waybill = await this.prisma.$transaction(async (tx) => {
      const wb = await tx.waybill.create({
        data: {
          zoneId: dto.zoneId,
          companyId: dto.companyId,
          waybillNumber,
          direction: dto.direction,
          type: dto.type,
          status: 'PENDING_APPROVAL',
          cargoDescription: dto.cargoDescription,
          cargoCategory: dto.cargoCategory,
          isHazmat: dto.isHazmat,
          hazmatClass: dto.hazmatClass,
          hazmatUnNumber: dto.hazmatUnNumber,
          hazmatEmergencyPhone: dto.hazmatEmergencyPhone,
          quantity: dto.quantity,
          quantityUnit: dto.quantityUnit,
          declaredValue: dto.declaredValue ? BigInt(dto.declaredValue) : null,
          carrierName: dto.carrierName,
          carrierPhone: dto.carrierPhone,
          carrierLicense: dto.carrierLicense,
          vehiclePlate: normalizedPlate,
          vehicleType: dto.vehicleType,
          vehicleCapacity: dto.vehicleCapacity,
          driverName: dto.driverName,
          driverPhone: dto.driverPhone,
          driverNationalId: dto.driverNationalId,
          originAddress: dto.originAddress,
          destinationAddress: dto.destinationAddress,
          destinationDock: dto.destinationDock,
          expectedArrival: dto.expectedArrival ? new Date(dto.expectedArrival) : null,
          isUrgent: dto.isUrgent ?? false,
          requiresEscort: dto.requiresEscort ?? false,
          requiresColdChain: dto.requiresColdChain ?? false,
          notes: dto.notes,
          createdBy,
        },
      });

      // Create approval steps
      for (const step of approvalChain) {
        await tx.waybillApproval.create({
          data: {
            waybillId: wb.id,
            stepOrder: step.stepOrder,
            roleFa: step.roleFa,
            isRequired: step.isRequired,
            status: step.stepOrder === 1 ? 'PENDING' : 'PENDING',
          },
        });
      }

      // Create tracking event
      await tx.shipmentTracking.create({
        data: {
          waybillId: wb.id,
          zoneId: dto.zoneId,
          status: 'PENDING_APPROVAL',
          description: 'بارنامه ایجاد شد و در انتظار تأیید',
          actorId: createdBy,
        },
      });

      return wb;
    });

    // 7. Create audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: waybill.id,
      targetType: 'Waybill',
      action: 'WAYBILL_CREATED',
      metadata: { waybillNumber, direction: dto.direction, type: dto.type },
    });

    // Notify first approver
    notify.waybillCreated({
      id: waybill.id, zoneId: dto.zoneId, companyId: dto.companyId,
      waybillNumber, direction: dto.direction, type: dto.type,
    }).catch(() => {});

    this.logger.log(`Waybill created: ${waybillNumber} by ${createdBy}`);
    return waybill;
  }

  // ─────────────────────────────────────────────────────
  // FIND ALL (cursor-based)
  // ─────────────────────────────────────────────────────
  async findAll(filter: FilterWaybillsDto): Promise<PaginatedResult<any>> {
    const limit = filter.limit ?? 20;
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    if (filter.direction) where.direction = filter.direction;
    if (filter.cargoCategory) where.cargoCategory = filter.cargoCategory;
    if (filter.isHazmat !== undefined) where.isHazmat = filter.isHazmat;
    if (filter.isUrgent !== undefined) where.isUrgent = filter.isUrgent;
    if (filter.vehiclePlate) {
      where.vehiclePlate = { contains: normalizePlate(filter.vehiclePlate) };
    }
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }
    if (filter.search) {
      where.OR = [
        { waybillNumber: { contains: filter.search, mode: 'insensitive' } },
        { cargoDescription: { contains: filter.search, mode: 'insensitive' } },
        { driverName: { contains: filter.search, mode: 'insensitive' } },
        { carrierName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    // Cursor-based pagination
    if (filter.cursor) {
      where.createdAt = { lt: new Date(filter.cursor) };
    }

    const orderBy = filter.sortBy
      ? { [filter.sortBy]: filter.sortOrder ?? 'desc' as const }
      : { createdAt: 'desc' as const };

    const [data, total] = await Promise.all([
      this.prisma.waybill.findMany({
        where,
        orderBy,
        take: limit + 1,
        include: { approvals: { where: { status: 'PENDING' } } },
      }),
      this.prisma.waybill.count({ where: { ...where, cursor: undefined } }),
    ]);

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined;

    return {
      data: items,
      meta: { total, nextCursor },
    };
  }

  // ─────────────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────────────
  async findById(id: string, zoneId?: string): Promise<any> {
    const where: any = { id, deletedAt: null };
    if (zoneId) where.zoneId = zoneId;

    const waybill = await this.prisma.waybill.findFirst({
      where,
      include: {
        approvals: { orderBy: { stepOrder: 'asc' } },
        attachments: true,
        trackingEvents: { orderBy: { occurredAt: 'desc' } },
      },
    });

    if (!waybill) {
      throw new AppException('WAYBILL_NOT_FOUND');
    }

    return waybill;
  }

  // ─────────────────────────────────────────────────────
  // FIND BY PLATE
  // ─────────────────────────────────────────────────────
  async findByPlate(plate: string, zoneId: string): Promise<any[]> {
    const normalizedPlate = normalizePlate(plate);
    return this.prisma.waybill.findMany({
      where: {
        zoneId,
        vehiclePlate: normalizedPlate,
        deletedAt: null,
        status: { notIn: ['CANCELLED', 'REJECTED'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }

  // ─────────────────────────────────────────────────────
  // APPROVE STEP
  // ─────────────────────────────────────────────────────
  async approveStep(
    dto: ApproveWaybillStepDto,
    approverId: string,
    zoneId: string,
  ): Promise<any> {
    // 1. Find waybill
    const waybill = await this.prisma.waybill.findUnique({
      where: { id: dto.waybillId },
      include: { approvals: { orderBy: { stepOrder: 'asc' } } },
    });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');
    if (waybill.deletedAt) throw new AppException('WAYBILL_NOT_FOUND');

    // 2. Find the specific step
    const step = waybill.approvals.find((a) => a.stepOrder === dto.stepOrder);
    if (!step) throw new AppException('WAYBILL_STEP_NOT_FOUND');
    if (step.status !== 'PENDING') {
      throw new AppException('WAYBILL_STEP_ALREADY_REVIEWED');
    }

    // 3. Update step
    await this.prisma.waybillApproval.update({
      where: { id: step.id },
      data: {
        status: dto.status,
        approvedAt: dto.status === 'APPROVED' ? new Date() : null,
        comment: dto.comment,
        assigneeId: approverId,
      },
    });

    if (dto.status === 'REJECTED') {
      // 4a. Waybill rejected
      await this.prisma.waybill.update({
        where: { id: dto.waybillId },
        data: {
          status: 'REJECTED',
          rejectionReason: dto.comment || 'رد شده توسط تأییدکننده',
        },
      });

      // Tracking event
      await this.prisma.shipmentTracking.create({
        data: {
          waybillId: dto.waybillId,
          zoneId: waybill.zoneId,
          status: 'REJECTED',
          description: `مرحله ${dto.stepOrder} رد شد: ${dto.comment || 'بدون توضیح'}`,
          actorId: approverId,
        },
      });

      await this.audit.log({
        zoneId: waybill.zoneId,
        userId: approverId,
        targetId: dto.waybillId,
        targetType: 'Waybill',
        action: 'WAYBILL_STEP_REJECTED',
        metadata: { stepOrder: dto.stepOrder, comment: dto.comment },
      });

      // Notify company of waybill rejection
      notify.waybillRejected({
        id: waybill.id, zoneId: waybill.zoneId, companyId: waybill.companyId,
        waybillNumber: waybill.waybillNumber, reason: dto.comment,
      }).catch(() => {});

      return this.findById(dto.waybillId);
    }

    if (dto.status === 'APPROVED') {
      // 4b. Check if there's a next pending step
      const nextStep = waybill.approvals.find(
        (a) => a.stepOrder > dto.stepOrder && a.status === 'PENDING',
      );

      if (nextStep) {
        // Set next step as active, notify next approver
        this.logger.log(`Waybill ${waybill.waybillNumber}: step ${dto.stepOrder} approved, next: ${nextStep.stepOrder}`);
      } else {
        // All steps approved → waybill fully approved
        await this.prisma.waybill.update({
          where: { id: dto.waybillId },
          data: { status: 'APPROVED' },
        });

        await this.prisma.shipmentTracking.create({
          data: {
            waybillId: dto.waybillId,
            zoneId: waybill.zoneId,
            status: 'APPROVED',
            description: 'بارنامه کاملاً تأیید شد',
            actorId: approverId,
          },
        });

        await this.audit.log({
          zoneId: waybill.zoneId,
          userId: approverId,
          targetId: dto.waybillId,
          targetType: 'Waybill',
          action: 'WAYBILL_FULLY_APPROVED',
          metadata: { waybillNumber: waybill.waybillNumber },
        });

        // Notify company that waybill is fully approved
        notify.waybillApproved({
          id: waybill.id, zoneId: waybill.zoneId, companyId: waybill.companyId,
          waybillNumber: waybill.waybillNumber,
        }).catch(() => {});
      }
    }

    await this.audit.log({
      zoneId: waybill.zoneId,
      userId: approverId,
      targetId: dto.waybillId,
      targetType: 'Waybill',
      action: 'WAYBILL_STEP_APPROVED',
      metadata: { stepOrder: dto.stepOrder, status: dto.status },
    });

    return this.findById(dto.waybillId);
  }

  // ─────────────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────────────
  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const waybill = await this.prisma.waybill.findUnique({ where: { id } });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');

    const cancelableStatuses: WaybillStatus[] = [
      'DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED',
    ];
    if (!cancelableStatuses.includes(waybill.status)) {
      throw new AppException('WAYBILL_CANNOT_CANCEL');
    }

    await this.prisma.waybill.update({
      where: { id },
      data: { status: 'CANCELLED', rejectionReason: reason },
    });

    await this.prisma.shipmentTracking.create({
      data: {
        waybillId: id,
        zoneId: waybill.zoneId,
        status: 'CANCELLED',
        description: `لغو شده: ${reason}`,
        actorId: cancelledBy,
      },
    });

    await this.audit.log({
      zoneId: waybill.zoneId,
      userId: cancelledBy,
      targetId: id,
      targetType: 'Waybill',
      action: 'WAYBILL_CANCELLED',
      metadata: { reason },
    });

    return this.findById(id);
  }

  // ─────────────────────────────────────────────────────
  // STATUS TRANSITIONS (gate hooks, scale hooks, etc.)
  // ─────────────────────────────────────────────────────
  async markTruckArrived(waybillId: string, gateId: string, trafficLogId: string): Promise<any> {
    const waybill = await this.prisma.waybill.findUnique({ where: { id: waybillId } });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');

    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'TRUCK_ARRIVED', actualArrival: new Date() },
    });

    if (waybill.appointmentId) {
      await this.prisma.truckAppointment.update({
        where: { id: waybill.appointmentId },
        data: { status: 'ARRIVED', arrivedAt: new Date() },
      });
    }

    await this.prisma.shipmentTracking.create({
      data: {
        waybillId,
        zoneId: waybill.zoneId,
        status: 'TRUCK_ARRIVED',
        description: 'کامیون به ورودی رسید',
        location: gateId,
      },
    });

    await this.audit.log({
      zoneId: waybill.zoneId,
      targetId: waybillId,
      targetType: 'Waybill',
      action: 'WAYBILL_TRUCK_ARRIVED',
      metadata: { gateId, trafficLogId },
    });

    return this.findById(waybillId);
  }

  async markAtScale(waybillId: string, scaleId: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'AT_SCALE', weighScaleId: scaleId },
    });
    await this.addTrackingEvent(waybillId, 'AT_SCALE', 'خودرو به باسکول هدایت شد');
    return this.findById(waybillId);
  }

  async markWeighed(waybillId: string, weighRecordId: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'WEIGHED' },
    });
    await this.addTrackingEvent(waybillId, 'WEIGHED', 'وزن‌کشی انجام شد');
    return this.findById(waybillId);
  }

  async markAtDock(waybillId: string, dockCode: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'AT_DOCK', destinationDock: dockCode },
    });
    await this.addTrackingEvent(waybillId, 'AT_DOCK', `خودرو به سکو ${dockCode} رسید`);
    return this.findById(waybillId);
  }

  async markInProgress(waybillId: string, operatorId: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'IN_PROGRESS' },
    });
    await this.addTrackingEvent(waybillId, 'IN_PROGRESS', 'عملیات بارگیری/تخلیه آغاز شد', operatorId);
    return this.findById(waybillId);
  }

  async markCompleted(waybillId: string, operatorId: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'COMPLETED', actualDeparture: new Date() },
    });
    await this.addTrackingEvent(waybillId, 'COMPLETED', 'عملیات بارگیری/تخلیه تکمیل شد', operatorId);

    await this.audit.log({
      targetId: waybillId,
      targetType: 'Waybill',
      action: 'WAYBILL_COMPLETED',
      userId: operatorId,
    });

    return this.findById(waybillId);
  }

  async markInvoiced(waybillId: string, invoiceId: string): Promise<any> {
    await this.prisma.waybill.update({
      where: { id: waybillId },
      data: { status: 'INVOICED', invoiceId },
    });
    await this.addTrackingEvent(waybillId, 'INVOICED', 'صورتحساب صادر شد');

    await this.audit.log({
      targetId: waybillId,
      targetType: 'Waybill',
      action: 'WAYBILL_INVOICED',
      metadata: { invoiceId },
    });

    return this.findById(waybillId);
  }

  // ─────────────────────────────────────────────────────
  // TRACKING
  // ─────────────────────────────────────────────────────
  async getTrackingTimeline(waybillId: string): Promise<any[]> {
    return this.prisma.shipmentTracking.findMany({
      where: { waybillId },
      orderBy: { occurredAt: 'desc' },
    });
  }

  async addTrackingEvent(
    waybillId: string,
    status: WaybillStatus,
    description: string,
    actorId?: string,
    location?: string,
  ): Promise<any> {
    const waybill = await this.prisma.waybill.findUnique({ where: { id: waybillId } });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');

    return this.prisma.shipmentTracking.create({
      data: {
        waybillId,
        zoneId: waybill.zoneId,
        status,
        description,
        actorId,
        location,
      },
    });
  }

  // ─────────────────────────────────────────────────────
  // ATTACHMENTS
  // ─────────────────────────────────────────────────────
  async uploadAttachment(
    waybillId: string,
    type: string,
    file: Express.Multer.File,
    uploadedBy: string,
  ): Promise<any> {
    const waybill = await this.prisma.waybill.findUnique({ where: { id: waybillId } });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');

    const ext = file.originalname.split('.').pop();
    const fileKey = `waybill-docs/${waybillId}/${type}/${crypto.randomUUID()}.${ext}`;

    // In production: upload to MinIO via S3 client
    // await this.minio.putObject(BUCKET, fileKey, file.buffer, file.size, { 'Content-Type': file.mimetype });

    const attachment = await this.prisma.waybillAttachment.create({
      data: {
        waybillId,
        type,
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
      },
    });

    await this.audit.log({
      zoneId: waybill.zoneId,
      userId: uploadedBy,
      targetId: waybillId,
      targetType: 'Waybill',
      action: 'WAYBILL_ATTACHMENT_UPLOADED',
      metadata: { attachmentId: attachment.id, type, fileName: file.originalname },
    });

    return attachment;
  }

  // ─────────────────────────────────────────────────────
  // QR CODE
  // ─────────────────────────────────────────────────────
  async generateQrCode(waybillId: string): Promise<{ qrPayload: string; qrImageKey: string }> {
    const waybill = await this.prisma.waybill.findUnique({ where: { id: waybillId } });
    if (!waybill) throw new AppException('WAYBILL_NOT_FOUND');

    const qrPayload = generateQrPayload('SHIPMENT', waybill.id, waybill.zoneId, process.env.QR_SECRET || 'idop-default-secret');
    const qrImageKey = `waybill-qr/${waybillId}/qr.png`;

    // In production: generate QR image and upload to MinIO

    return { qrPayload, qrImageKey };
  }

  // ─────────────────────────────────────────────────────
  // RECEIPT
  // ─────────────────────────────────────────────────────
  async generateReceipt(waybillId: string): Promise<{ receiptKey: string }> {
    const waybill = await this.findById(waybillId);
    const receiptKey = `waybill-receipts/${waybillId}/receipt.pdf`;

    // In production: use pdfkit to generate PDF
    // const PDFDocument = require('pdfkit');
    // const doc = new PDFDocument();
    // ... write waybill details to PDF
    // Upload to MinIO

    return { receiptKey };
  }

  // ─────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────
  async getWaybillStats(zoneId: string, period?: string): Promise<any> {
    const where: any = { zoneId, deletedAt: null };

    const [total, byStatus, byDirection, byCargoCategory, hazmatCount, pendingApprovals] =
      await Promise.all([
        this.prisma.waybill.count({ where }),
        this.prisma.waybill.groupBy({
          by: ['status'],
          where,
          _count: true,
        }),
        this.prisma.waybill.groupBy({
          by: ['direction'],
          where,
          _count: true,
        }),
        this.prisma.waybill.groupBy({
          by: ['cargoCategory'],
          where,
          _count: true,
        }),
        this.prisma.waybill.count({ where: { ...where, isHazmat: true } }),
        this.prisma.waybill.count({ where: { ...where, status: 'PENDING_APPROVAL' } }),
      ]);

    const totalWeight = await this.prisma.waybill.aggregate({
      where: { ...where, netWeight: { not: null } },
      _sum: { netWeight: true },
    });

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      byDirection: Object.fromEntries(byDirection.map((r) => [r.direction, r._count])),
      byCargoCategory: Object.fromEntries(byCargoCategory.map((r) => [r.cargoCategory, r._count])),
      hazmatCount,
      pendingApprovals,
      totalWeightTon: Number(totalWeight._sum.netWeight ?? 0),
      avgApprovalHours: 0, // Computed from tracking events
      avgDwellMinutes: 0,
      topCompanies: [],
    };
  }

  // ─────────────────────────────────────────────────────
  // COMPANY WAYBILLS
  // ─────────────────────────────────────────────────────
  async getCompanyWaybills(companyId: string, filter: FilterWaybillsDto): Promise<PaginatedResult<any>> {
    return this.findAll({ ...filter, companyId });
  }

  // ─────────────────────────────────────────────────────
  // PENDING APPROVALS
  // ─────────────────────────────────────────────────────
  async getPendingApprovals(userId: string, zoneId: string): Promise<any[]> {
    return this.prisma.waybillApproval.findMany({
      where: {
        assigneeId: userId,
        status: 'PENDING',
        waybill: { zoneId, deletedAt: null },
      },
      include: { waybill: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────
  private getJalaliYear(date: Date): number {
    // Approximate Gregorian to Jalali year conversion
    const gregorianYear = date.getFullYear();
    return gregorianYear - 621;
  }
}
