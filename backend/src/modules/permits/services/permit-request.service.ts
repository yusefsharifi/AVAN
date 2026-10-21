import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { CreatePermitRequestDto, PermitStatus, ApprovalStatus } from '../dto/create-permit-request.dto';
import { ReviewPermitStepDto } from '../dto/review-permit-step.dto';
import { FilterPermitRequestsDto } from '../dto/filter-permits.dto';
import {
  PERMIT_TYPE_CONFIG,
  PermitTypeConfig,
  PermitApprovalStepConfig,
} from '../config/permit-type.config';
import { PermitType } from '../dto/create-permit-request.dto';
import { notify } from '../../notifications/utils/notify.helper';

@Injectable()
export class PermitRequestService {
  private readonly logger = new Logger(PermitRequestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreatePermitRequestDto, createdBy: string): Promise<any> {
    // 1. Generate request number
    const year = new Date().getFullYear().toString();
    const seqKey = REDIS_KEYS.permitReqSeq(dto.zoneId, year);
    const seq = await this.redis.incr(seqKey);
    const config = PERMIT_TYPE_CONFIG[dto.type];
    const abbrev = config.abbreviation;
    const requestNumber = `PR-${abbrev}-${year}-${seq.toString().padStart(5, '0')}`;

    // 2. Load template: zone-specific first, then config defaults
    let templateConfig = config;
    const zoneTemplate = await this.prisma.permitTemplate.findFirst({
      where: { zoneId: dto.zoneId, type: dto.type, isActive: true },
    });

    // 3. Validate dates
    const requestedFrom = new Date(dto.requestedFrom);
    const requestedUntil = new Date(dto.requestedUntil);
    if (requestedFrom < new Date()) {
      throw new AppException('PERMIT_REQUEST_DATE_INVALID');
    }
    if (requestedUntil <= requestedFrom) {
      throw new AppException('PERMIT_REQUEST_DATE_INVALID');
    }

    // 4. Verify company is ACTIVE
    const company = await this.prisma.company.findUnique({ where: { id: dto.companyId } });
    if (!company || company.lifecycleStatus !== 'ACTIVE') {
      throw new AppException('COMPANY_NOT_ACTIVE');
    }

    // 5. Check for conflicting active permits
    const conflict = await this.prisma.issuedPermit.findFirst({
      where: {
        companyId: dto.companyId,
        type: dto.type,
        status: 'ACTIVE',
        validFrom: { lte: requestedUntil },
        validUntil: { gte: requestedFrom },
      },
    });

    // 6. Build approval chain
    const steps = zoneTemplate
      ? (zoneTemplate.approvalSteps as unknown as PermitApprovalStepConfig[])
      : templateConfig.approvalSteps;

    const isUrgent = dto.isUrgent || dto.priority === 'URGENT';

    const stepRecords = await Promise.all(
      steps.map(async (step) => {
        const slaDays = isUrgent ? Math.ceil(step.slaDays / 2) : step.slaDays;
        const dueAt = new Date();
        dueAt.setDate(dueAt.getDate() + slaDays);

        return this.prisma.permitApprovalStep.create({
          data: {
            permitRequestId: '', // will be set after creation
            stepOrder: step.order,
            stepName: step.stepName,
            roleFa: step.roleFa,
            isRequired: step.isRequired,
            dueAt,
          },
        });
      }),
    );

    // 7. Create PermitRequest
    const permitRequest = await this.prisma.permitRequest.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        requestNumber,
        type: dto.type,
        subType: dto.subType,
        title: dto.title,
        description: dto.description,
        justification: dto.justification,
        locationDescription: dto.locationDescription,
        locationBlock: dto.locationBlock,
        locationUnit: dto.locationUnit,
        affectedArea: dto.affectedArea,
        geoPolygon: dto.geoPolygon as any,
        requestedFrom,
        requestedUntil,
        isRecurring: dto.isRecurring || false,
        recurringPattern: dto.recurringPattern as any,
        applicantId: createdBy,
        applicantName: dto.applicantName,
        applicantPhone: dto.applicantPhone,
        applicantEmail: dto.applicantEmail,
        applicantRole: dto.applicantRole,
        responsibleName: dto.responsibleName,
        responsiblePhone: dto.responsiblePhone,
        status: PermitStatus.DRAFT,
        priority: dto.priority || 'NORMAL',
        isUrgent: isUrgent,
        requiresHSEApproval: templateConfig.requiresHSEApproval,
        requiresEnvApproval: templateConfig.requiresEnvApproval,
        requiresFireApproval: templateConfig.requiresFireApproval,
        requiresInspection: templateConfig.requiresInspection,
        notes: dto.notes,
        createdBy,
      },
    });

    // Fix step permitRequestId
    await Promise.all(
      stepRecords.map((step) =>
        this.prisma.permitApprovalStep.update({
          where: { id: step.id },
          data: { permitRequestId: permitRequest.id },
        }),
      ),
    );

    // 8. Create default conditions from template
    const conditions = zoneTemplate
      ? (zoneTemplate.defaultConditions as string[])
      : templateConfig.defaultConditions;

    if (conditions.length > 0) {
      await Promise.all(
        conditions.map((desc) =>
          this.prisma.permitCondition.create({
            data: {
              permitRequestId: permitRequest.id,
              description: desc,
              isMandatory: true,
            },
          }),
        ),
      );
    }

    // 9. Create AuditLog
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: permitRequest.id,
      targetType: 'PermitRequest',
      action: 'PERMIT_REQUEST_CREATED',
      metadata: { requestNumber, type: dto.type, companyId: dto.companyId },
    });

    return permitRequest;
  }

  async submit(id: string, submittedBy: string): Promise<any> {
    const request = await this.findById(id);

    if (request.status !== PermitStatus.DRAFT) {
      throw new AppException('PERMIT_REQUEST_ALREADY_SUBMITTED');
    }

    // Check required documents
    const attachments = await this.prisma.permitAttachment.findMany({
      where: { permitRequestId: id },
    });
    const config = PERMIT_TYPE_CONFIG[request.type];
    const uploadedTypes = attachments.map((a) => a.type);
    const missing = config.requiredDocuments.filter((doc) => !uploadedTypes.includes(doc));
    if (missing.length > 0) {
      throw new AppException('PERMIT_REQUEST_MISSING_DOCUMENTS');
    }

    // Update status
    const updated = await this.prisma.permitRequest.update({
      where: { id },
      data: { status: PermitStatus.SUBMITTED },
    });

    // Activate first step
    await this.prisma.permitApprovalStep.updateMany({
      where: { permitRequestId: id, stepOrder: 1 },
      data: { status: ApprovalStatus.PENDING },
    });

    // Create audit
    await this.audit.log({
      zoneId: request.zoneId,
      userId: submittedBy,
      targetId: id,
      targetType: 'PermitRequest',
      action: 'PERMIT_REQUEST_SUBMITTED',
      metadata: { requestNumber: request.requestNumber },
    });

    // Notify zone managers about new permit request
    notify.permitSubmitted({
      id, zoneId: request.zoneId, companyId: request.companyId,
      requestNumber: request.requestNumber, type: request.type,
      applicantName: request.applicantName || 'نامشخص',
    }).catch(() => {});

    return updated;
  }

  async reviewStep(
    requestId: string,
    dto: ReviewPermitStepDto,
    reviewerId: string,
    zoneId: string,
  ): Promise<any> {
    const request = await this.findById(requestId);

    // Find active step
    const step = await this.prisma.permitApprovalStep.findFirst({
      where: {
        permitRequestId: requestId,
        stepOrder: dto.stepOrder,
      },
    });

    if (!step) {
      throw new AppException('PERMIT_REQUEST_STEP_NOT_ACTIVE');
    }

    if (step.status !== ApprovalStatus.PENDING) {
      throw new AppException('PERMIT_REQUEST_STEP_NOT_ACTIVE');
    }

    // Handle site visit scheduling
    if (dto.scheduleSiteVisitAt) {
      await this.prisma.permitInspection.create({
        data: {
          zoneId,
          permitRequestId: requestId,
          inspectorId: reviewerId,
          inspectorName: reviewerId,
          scheduledAt: new Date(dto.scheduleSiteVisitAt),
        },
      });

      await this.prisma.permitRequest.update({
        where: { id: requestId },
        data: { status: PermitStatus.SITE_VISIT_SCHEDULED },
      });

      return this.findById(requestId);
    }

    // Add reviewer conditions
    if (dto.conditions && dto.conditions.length > 0) {
      await Promise.all(
        dto.conditions.map((desc) =>
          this.prisma.permitCondition.create({
            data: {
              permitRequestId: requestId,
              description: desc,
              isMandatory: true,
            },
          }),
        ),
      );
    }

    // Update step
    await this.prisma.permitApprovalStep.update({
      where: { id: step.id },
      data: {
        status: dto.status,
        completedAt: new Date(),
        comment: dto.comment,
      },
    });

    if (dto.status === ApprovalStatus.REJECTED) {
      // Reject the whole request
      await this.prisma.permitRequest.update({
        where: { id: requestId },
        data: {
          status: PermitStatus.REJECTED,
          rejectionReason: dto.comment || 'رد شده',
        },
      });

      await this.audit.log({
        zoneId: request.zoneId,
        userId: reviewerId,
        targetId: requestId,
        targetType: 'PermitRequest',
        action: 'PERMIT_REQUEST_REJECTED',
        metadata: { requestNumber: request.requestNumber, reason: dto.comment },
      });

      // Notify applicant of rejection
      notify.permitRejected({
        id: requestId, zoneId: request.zoneId, companyId: request.companyId,
        requestNumber: request.requestNumber, type: request.type,
        applicantId: request.applicantId, reason: dto.comment,
      }).catch(() => {});

      return this.findById(requestId);
    }

    if (dto.status === ApprovalStatus.APPROVED) {
      // Find next pending step
      const nextStep = await this.prisma.permitApprovalStep.findFirst({
        where: {
          permitRequestId: requestId,
          stepOrder: { gt: dto.stepOrder },
          isRequired: true,
          status: ApprovalStatus.PENDING,
        },
        orderBy: { stepOrder: 'asc' },
      });

      if (nextStep) {
        // Notify next step assignee
        await this.prisma.permitRequest.update({
          where: { id: requestId },
          data: { status: PermitStatus.UNDER_REVIEW, currentStepIndex: nextStep.stepOrder - 1 },
        });
      } else {
        // All steps done — check for unfulfilled mandatory conditions
        const pendingConditions = await this.prisma.permitCondition.findMany({
          where: {
            permitRequestId: requestId,
            isMandatory: true,
            status: 'PENDING',
          },
        });

        if (pendingConditions.length > 0) {
          await this.prisma.permitRequest.update({
            where: { id: requestId },
            data: { status: PermitStatus.CONDITIONALLY_APPROVED },
          });

          await this.audit.log({
            zoneId: request.zoneId,
            userId: reviewerId,
            targetId: requestId,
            targetType: 'PermitRequest',
            action: 'PERMIT_REQUEST_CONDITIONALLY_APPROVED',
            metadata: { requestNumber: request.requestNumber, conditionsCount: pendingConditions.length },
          });
        } else {
          await this.prisma.permitRequest.update({
            where: { id: requestId },
            data: { status: PermitStatus.APPROVED },
          });

          await this.audit.log({
            zoneId: request.zoneId,
            userId: reviewerId,
            targetId: requestId,
            targetType: 'PermitRequest',
            action: 'PERMIT_REQUEST_APPROVED',
            metadata: { requestNumber: request.requestNumber },
          });

          // Notify applicant that permit request is approved
          notify.permitApproved({
            id: requestId, zoneId: request.zoneId, companyId: request.companyId,
            requestNumber: request.requestNumber, type: request.type,
            applicantId: request.applicantId,
          }).catch(() => {});
        }
      }
    }

    await this.audit.log({
      zoneId: request.zoneId,
      userId: reviewerId,
      targetId: requestId,
      targetType: 'PermitRequest',
      action: 'PERMIT_REQUEST_STEP_REVIEWED',
      metadata: { requestNumber: request.requestNumber, stepOrder: dto.stepOrder, status: dto.status },
    });

    return this.findById(requestId);
  }

  async withdraw(id: string, withdrawnBy: string): Promise<any> {
    const request = await this.findById(id);

    if (!['DRAFT', 'SUBMITTED', 'UNDER_REVIEW'].includes(request.status)) {
      throw new AppException('PERMIT_REQUEST_INVALID_STATUS');
    }

    const updated = await this.prisma.permitRequest.update({
      where: { id },
      data: { status: PermitStatus.WITHDRAWN },
    });

    await this.audit.log({
      zoneId: request.zoneId,
      userId: withdrawnBy,
      targetId: id,
      targetType: 'PermitRequest',
      action: 'PERMIT_REQUEST_WITHDRAWN',
      metadata: { requestNumber: request.requestNumber },
    });

    return updated;
  }

  async findAll(filter: FilterPermitRequestsDto): Promise<{ data: any[]; meta: any }> {
    const where: any = { deletedAt: null };

    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.priority) where.priority = filter.priority;
    if (filter.isUrgent !== undefined) where.isUrgent = filter.isUrgent;
    if (filter.fromDate) where.requestedFrom = { gte: new Date(filter.fromDate) };
    if (filter.toDate) where.requestedUntil = { lte: new Date(filter.toDate) };
    if (filter.search) {
      where.OR = [
        { title: { contains: filter.search, mode: 'insensitive' } },
        { requestNumber: { contains: filter.search, mode: 'insensitive' } },
        { applicantName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;
    const orderBy: any = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const data = await this.prisma.permitRequest.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
      include: {
        approvalSteps: { orderBy: { stepOrder: 'asc' } },
        conditions: true,
        attachments: true,
      },
    });

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;

    return {
      data: items,
      meta: {
        limit,
        hasMore,
        cursor: hasMore ? items[items.length - 1].id : null,
      },
    };
  }

  async findById(id: string, zoneId?: string): Promise<any> {
    const where: any = { id };
    if (zoneId) where.zoneId = zoneId;

    const request = await this.prisma.permitRequest.findFirst({
      where,
      include: {
        approvalSteps: { orderBy: { stepOrder: 'asc' } },
        conditions: true,
        attachments: true,
        inspections: true,
      },
    });

    if (!request) {
      throw new AppException('PERMIT_REQUEST_NOT_FOUND');
    }

    return request;
  }

  async getMyRequests(
    companyId: string,
    filter: FilterPermitRequestsDto,
  ): Promise<{ data: any[]; meta: any }> {
    return this.findAll({ ...filter, companyId });
  }

  async getPendingReviews(reviewerId: string, zoneId: string): Promise<any[]> {
    return this.prisma.permitApprovalStep.findMany({
      where: {
        assigneeId: reviewerId,
        status: ApprovalStatus.PENDING,
        permitRequest: { zoneId, deletedAt: null },
      },
      include: { permitRequest: true },
      orderBy: { dueAt: 'asc' },
    });
  }

  async getStats(zoneId: string): Promise<any> {
    const [totalRequests, byStatus, byType, urgentCount] = await Promise.all([
      this.prisma.permitRequest.count({ where: { zoneId, deletedAt: null } }),
      this.prisma.permitRequest.groupBy({
        by: ['status'],
        where: { zoneId, deletedAt: null },
        _count: { status: true },
      }),
      this.prisma.permitRequest.groupBy({
        by: ['type'],
        where: { zoneId, deletedAt: null },
        _count: { type: true },
      }),
      this.prisma.permitRequest.count({
        where: { zoneId, deletedAt: null, isUrgent: true, status: { notIn: ['REJECTED', 'WITHDRAWN'] } },
      }),
    ]);

    const pending = byStatus.find((s) => s.status === 'SUBMITTED')?._count.status || 0;
    const underReview = byStatus.find((s) => s.status === 'UNDER_REVIEW')?._count.status || 0;
    const approved = byStatus.find((s) => s.status === 'APPROVED')?._count.status || 0;
    const rejected = byStatus.find((s) => s.status === 'REJECTED')?._count.status || 0;

    return {
      total: totalRequests,
      pending,
      underReview,
      approved,
      rejected,
      urgent: urgentCount,
      byStatus: byStatus.reduce((acc, s) => ({ ...acc, [s.status]: s._count.status }), {}),
      byType: byType.reduce((acc, t) => ({ ...acc, [t.type]: t._count.type }), {}),
    };
  }
}
