// ═══════════════════════════════════════════════════════════════════════════════
// M7: Letter Service — Full Correspondence Lifecycle
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import {
  CreateLetterDto,
  LetterDirection,
  LetterStatus,
  LetterPriority,
  LetterClassification,
} from '../dto/create-letter.dto';
import { CreateLetterFromTemplateDto } from '../dto/create-from-template.dto';
import { ApproveLetterStepDto } from '../dto/approve-step.dto';
import { DispatchLetterDto } from '../dto/dispatch-letter.dto';
import { FilterLettersDto } from '../dto/filter-letters.dto';
import { ReviseLetterDto } from '../dto/revise-letter.dto';
import { UpdateLetterDto } from '../dto/update-letter.dto';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import {
  computeLetterQrHash,
  computeLetterHashChain,
  computeAuditEntryHash,
  computeAuthenticityScore,
  generateLetterQrPayload,
  verifyLetterHashChain,
} from '../utils/hash-chain.util';
import { LetterPdfGenerator } from '../utils/letter-pdf.generator';
import { notify } from '../../notifications/utils/notify.helper';

export interface AutoGenerateLetterPayload {
  templateCode: string;
  variables: Record<string, string>;
  companyId?: string;
  sourceModule: string;
  sourceEntityId: string;
  sourceEventType: string;
  autoSubmit?: boolean;
  autoDispatch?: boolean;
}

@Injectable()
export class LetterService {
  private readonly logger = new Logger(LetterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly pdfGenerator: LetterPdfGenerator,
  ) {}

  // ─── CREATION ─────────────────────────────────────────────────────────────

  /**
   * zone نامه را مشخص می‌کند: اولویت با zone ارسال‌شده، سپس zone کاربر،
   * و در نهایت اولین zone موجود (برای کاربران سراسری مثل SUPER_ADMIN).
   */
  private async resolveZoneId(
    dtoZoneId: string | undefined,
    userId: string,
  ): Promise<string> {
    if (dtoZoneId) return dtoZoneId;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { zoneId: true },
    });
    if (user?.zoneId) return user.zoneId;

    const fallbackZone = await this.prisma.zone.findFirst({
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    if (!fallbackZone) {
      throw new BadRequestException(
        'هیچ شهرکی در سیستم تعریف نشده است؛ برای ثبت نامه ابتدا شهرک بسازید',
      );
    }
    return fallbackZone.id;
  }

  async create(dto: CreateLetterDto, createdBy: string): Promise<any> {
    // 0. Resolve zone — کاربران بدون zone (مثل SUPER_ADMIN) از zone پیش‌فرض استفاده می‌کنند
    const zoneId = await this.resolveZoneId(dto.zoneId, createdBy);

    // 1. Generate registry number with Redis mutex lock
    const year = new Date().getFullYear();
    const registrySeq = await this.incrementRegistryCounter(zoneId, year);

    // Get zone code for registry number
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) throw new NotFoundException('شهرک یافت نشد');
    const registryNumber = `${zone.code}/${year}/${String(registrySeq).padStart(6, '0')}`;

    // 2. Generate QR hash
    const now = new Date();
    const qrHash = computeLetterQrHash(registryNumber, zoneId, dto.subject, now.toISOString());

    // 3. Generate hash chain entry
    const lastLetter = await this.prisma.letter.findFirst({
      where: { zoneId },
      orderBy: { registrySeq: 'desc' },
      select: { hashChain: true },
    });
    const hashChain = computeLetterHashChain(lastLetter?.hashChain, registryNumber, dto.body);

    // 4. Build approval chain
    const approvalSteps = this.buildApprovalChain(dto.classification);

    // 5. Calculate SLA deadline
    const slaHours = dto.slaHours || 72;
    const slaDeadline = new Date(now.getTime() + slaHours * 60 * 60 * 1000);

    // 6. Create letter
    const letter = await this.prisma.letter.create({
      data: {
        zoneId,
        companyId: dto.companyId || null,
        registryNumber,
        registryYear: year,
        registrySeq,
        direction: dto.direction,
        type: dto.type,
        classification: dto.classification,
        priority: dto.priority || 'NORMAL',
        topic: dto.topic || null,
        subject: dto.subject,
        body: dto.body,
        salutation: dto.salutation || null,
        closing: dto.closing || null,
        enclosuresCount: dto.enclosuresCount || 0,
        senderId: createdBy,
        senderName: dto.senderName,
        senderOrgName: dto.senderOrgName,
        senderRole: dto.senderRole || null,
        recipients: dto.recipients as any,
        cc: dto.cc || [],
        referenceLetterNumber: dto.referenceLetterNumber || null,
        referenceLetterId: dto.referenceLetterId || null,
        status: 'DRAFT',
        currentStepIndex: 0,
        signatory: dto.signatory || null,
        signatoryRole: dto.signatoryRole || null,
        slaHours,
        slaDeadline,
        slaBreached: false,
        qrHash,
        hashChain,
        previousHash: lastLetter?.hashChain || null,
        currentVersion: 1,
        isLatestVersion: true,
        isAutoGenerated: false,
        starred: dto.starred || false,
        unread: true,
        tags: dto.tags || [],
        internalNotes: dto.internalNotes || null,
        templateId: dto.templateId || null,
        metadata: {},
        createdBy,
      },
      include: { approvalSteps: true },
    });

    // 6b. Create approval steps
    for (const step of approvalSteps) {
      await this.prisma.letterApprovalStep.create({
        data: {
          letterId: letter.id,
          stepOrder: step.stepOrder,
          roleFa: step.roleFa,
          type: step.type as any,
          status: 'PENDING' as any,
          isRequired: step.isRequired,
        },
      });
    }

    // 7. Create initial audit entry
    await this.createAuditEntry(letter.id, zoneId, 'CREATED', createdBy, null, 'نامه ایجاد شد');

    return letter;
  }

  async createFromTemplate(dto: CreateLetterFromTemplateDto, createdBy: string): Promise<any> {
    // 1. Find template
    const template = await this.prisma.letterTemplate.findFirst({
      where: {
        code: dto.templateCode,
        isActive: true,
        OR: [
          { zoneId: dto.zoneId },
          { zoneId: null },
        ],
      },
      orderBy: { zoneId: 'desc' }, // zone-specific first
    });
    if (!template) throw new NotFoundException('قالب نامه یافت نشد');

    // 2. Resolve variables
    const resolved = this.resolveTemplateVariables(template, dto.variables);

    // 3. Get zone info
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });

    // 4. Build create DTO
    const createDto: CreateLetterDto = {
      zoneId: dto.zoneId,
      companyId: dto.companyId,
      direction: template.direction as LetterDirection,
      type: template.type as any,
      classification: template.classification as LetterClassification,
      priority: template.priority as LetterPriority,
      subject: resolved.subject,
      body: resolved.body,
      salutation: resolved.salutation || undefined,
      closing: resolved.closing || undefined,
      senderName: 'سامانه خودکار',
      senderOrgName: zone?.nameFa || 'شهرک صنعتی',
      recipients: dto.additionalRecipients || [],
      slaHours: template.defaultSlaHours,
      templateId: template.id,
      internalNotes: dto.internalNotes,
    };

    // 4. Increment usage count
    await this.prisma.letterTemplate.update({
      where: { id: template.id },
      data: { usageCount: { increment: 1 } },
    });

    // 5. Create letter
    const letter = await this.create(createDto, createdBy);

    // 6. Auto-submit if requested
    if (dto.autoSubmit) {
      await this.submit(letter.id, createdBy);
    }

    return letter;
  }

  async createAutoGenerated(
    payload: AutoGenerateLetterPayload,
    zoneId: string,
  ): Promise<any> {
    // 1. Find template
    const template = await this.prisma.letterTemplate.findFirst({
      where: {
        code: payload.templateCode,
        isActive: true,
        OR: [{ zoneId }, { zoneId: null }],
      },
      orderBy: { zoneId: 'desc' },
    });
    if (!template) {
      this.logger.warn(`Template not found for auto-generation: ${payload.templateCode}`);
      return null;
    }

    // 2. Resolve variables
    const resolved = this.resolveTemplateVariables(template, payload.variables);

    // 3. Get zone info
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });

    // 4. Create letter with auto-generated flags
    const letter = await this.create(
      {
        zoneId,
        companyId: payload.companyId,
        direction: template.direction as LetterDirection,
        type: template.type as any,
        classification: template.classification as LetterClassification,
        priority: template.priority as LetterPriority,
        subject: resolved.subject,
        body: resolved.body,
        salutation: resolved.salutation || undefined,
        closing: resolved.closing || undefined,
        senderName: 'سامانه خودکار',
        senderOrgName: zone?.nameFa || 'شهرک صنعتی',
        recipients: [],
        slaHours: template.defaultSlaHours,
        templateId: template.id,
      },
      'SYSTEM',
    );

    // 5. Set auto-generated flags
    await this.prisma.letter.update({
      where: { id: letter.id },
      data: {
        isAutoGenerated: true,
        sourceModule: payload.sourceModule,
        sourceEntityId: payload.sourceEntityId,
        sourceEventType: payload.sourceEventType,
      },
    });

    // 6. Auto-submit if requested
    if (payload.autoSubmit) {
      await this.submit(letter.id, 'SYSTEM');
    }

    return letter;
  }

  // ─── WORKFLOW ─────────────────────────────────────────────────────────────

  async submit(id: string, submittedBy: string): Promise<any> {
    const letter = await this.findById(id);
    if (letter.status !== 'DRAFT') {
      throw new BadRequestException('فقط نامه‌های پیش‌نویس قابل ارسال هستند');
    }

    const updated = await this.prisma.letter.update({
      where: { id },
      data: {
        status: 'PENDING_APPROVAL',
        currentStepIndex: 0,
      },
    });

    // Activate first approval step
    await this.prisma.letterApprovalStep.updateMany({
      where: { letterId: id, stepOrder: 0 },
      data: { status: 'PENDING' },
    });

    await this.createAuditEntry(id, letter.zoneId, 'SUBMITTED', submittedBy, null, 'نامه برای تأیید ارسال شد');

    // Notify first approver
    notify.letterSubmitted({
      id, zoneId: letter.zoneId, companyId: letter.companyId,
      registryNumber: letter.registryNumber, subject: letter.subject,
      submittedBy,
    }).catch(() => {});

    return updated;
  }

  async approveStep(id: string, dto: ApproveLetterStepDto, approverId: string): Promise<any> {
    const letter = await this.findById(id);

    // Find the approval step
    const step = await this.prisma.letterApprovalStep.findFirst({
      where: { letterId: id, stepOrder: dto.stepOrder },
    });
    if (!step) throw new NotFoundException('مرحله تأیید یافت نشد');
    if (step.status !== 'PENDING') throw new BadRequestException('این مرحله قبلاً بررسی شده است');

    // Verify assignee
    if (step.assigneeId && step.assigneeId !== approverId) {
      throw new ForbiddenException('شما مجاز به بررسی این مرحله نیستید');
    }

    // Handle SIGNER step
    if (step.type === 'SIGNER' && dto.status === 'APPROVED') {
      if (!dto.signatureKey) {
        throw new BadRequestException('امضای دیجیتال الزامی است');
      }
    }

    // Update step
    await this.prisma.letterApprovalStep.update({
      where: { id: step.id },
      data: {
        status: dto.status as any,
        completedAt: new Date(),
        comment: dto.comment || null,
        signatureKey: dto.signatureKey || null,
      },
    });

    if (dto.status === 'APPROVED') {
      // Check if all steps are done
      const allSteps = await this.prisma.letterApprovalStep.findMany({
        where: { letterId: id },
        orderBy: { stepOrder: 'asc' },
      });

      const currentIdx = allSteps.findIndex((s) => s.id === step.id);
      const nextStep = allSteps.find((s) => s.stepOrder > dto.stepOrder);

      if (nextStep) {
        // Activate next step
        await this.prisma.letterApprovalStep.update({
          where: { id: nextStep.id },
          data: { status: 'PENDING' },
        });
        await this.prisma.letter.update({
          where: { id },
          data: { currentStepIndex: nextStep.stepOrder },
        });
      } else {
        // All steps done
        const hasSignerStep = allSteps.some((s) => s.type === 'SIGNER');
        const finalStatus = hasSignerStep ? 'SIGNED' : 'APPROVED';
        await this.prisma.letter.update({
          where: { id },
          data: { status: finalStatus as any },
        });

        if (step.type === 'SIGNER') {
          await this.prisma.letter.update({
            where: { id },
            data: {
              signatory: step.assigneeName || 'امضاکننده',
              signatoryRole: step.roleFa,
              signatoryId: approverId,
            },
          });
        }
      }

      await this.createAuditEntry(id, letter.zoneId, 'APPROVED', approverId, null, `مرحله ${dto.stepOrder} تأیید شد`);

      // Notify sender of letter approval
      notify.letterApproved({
        id, zoneId: letter.zoneId, companyId: letter.companyId,
        registryNumber: letter.registryNumber, subject: letter.subject,
        senderId: letter.senderId,
      }).catch(() => {});
    } else if (dto.status === 'REJECTED') {
      // Rejection
      await this.prisma.letter.update({
        where: { id },
        data: {
          status: 'RETURNED',
          rejectionReason: dto.comment || 'مردود شده',
        },
      });
      await this.createAuditEntry(id, letter.zoneId, 'REJECTED', approverId, null, `مردود شده: ${dto.comment}`);
    }

    // Update hash chain
    const updatedLetter = await this.findById(id);
    await this.prisma.letter.update({
      where: { id },
      data: {
        hashChain: computeLetterHashChain(
          updatedLetter.previousHash,
          updatedLetter.registryNumber,
          updatedLetter.body,
        ),
      },
    });

    return this.findById(id);
  }

  async returnForRevision(id: string, reason: string, returnedBy: string): Promise<any> {
    const letter = await this.findById(id);
    if (!['DRAFT', 'PENDING_APPROVAL', 'IN_APPROVAL'].includes(letter.status)) {
      throw new BadRequestException('وضعیت نامه نامعتبر است');
    }

    await this.prisma.letter.update({
      where: { id },
      data: { status: 'RETURNED' },
    });

    await this.createAuditEntry(id, letter.zoneId, 'RETURNED', returnedBy, null, `برگشت به بازنویسی: ${reason}`);
    return this.findById(id);
  }

  async refer(id: string, toUserId: string, note: string, referredBy: string): Promise<any> {
    const letter = await this.findById(id);

    await this.prisma.letter.update({
      where: { id },
      data: { status: 'REFERRED' },
    });

    await this.createAuditEntry(id, letter.zoneId, 'REFERRED', referredBy, null, `ارجاع به ${toUserId}: ${note}`);
    return this.findById(id);
  }

  async dispatch(id: string, dto: DispatchLetterDto, dispatchedBy: string): Promise<any> {
    const letter = await this.findById(id);
    if (!['APPROVED', 'SIGNED'].includes(letter.status)) {
      throw new BadRequestException('فقط نامه‌های تأیید/امضا شده قابل ارسال هستند');
    }

    const dispatchRecord = {
      method: dto.methods.join(','),
      dispatchedAt: new Date().toISOString(),
      dispatchedBy,
      recipients: dto.emailRecipients || [],
      trackingNumber: dto.physicalTrackingNumber || null,
    };

    await this.prisma.letter.update({
      where: { id },
      data: {
        status: 'DISPATCHED',
        sentAt: new Date(),
        dispatchRecord,
      },
    });

    await this.createAuditEntry(id, letter.zoneId, 'DISPATCHED', dispatchedBy, null, `ارسال شده: ${dto.methods.join(', ')}`);

    // Notify recipients that letter has been dispatched
    notify.letterDispatched({
      id, zoneId: letter.zoneId, companyId: letter.companyId,
      registryNumber: letter.registryNumber, subject: letter.subject,
      methods: dto.methods,
    }).catch(() => {});

    return this.findById(id);
  }

  async archive(id: string, archivedBy: string): Promise<any> {
    const letter = await this.findById(id);

    await this.prisma.letter.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await this.createAuditEntry(id, letter.zoneId, 'ARCHIVED', archivedBy, null, 'نامه بایگانی شد');
    return this.findById(id);
  }

  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const letter = await this.findById(id);
    if (!['DRAFT', 'RETURNED'].includes(letter.status)) {
      throw new BadRequestException('امکان لغو این نامه وجود ندارد');
    }

    await this.prisma.letter.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    await this.createAuditEntry(id, letter.zoneId, 'CANCELLED', cancelledBy, null, `لغو شده: ${reason}`);
    return this.findById(id);
  }

  // ─── VERSIONING ───────────────────────────────────────────────────────────

  async revise(id: string, dto: ReviseLetterDto, revisedBy: string): Promise<any> {
    const letter = await this.findById(id);
    if (!['RETURNED', 'DRAFT'].includes(letter.status)) {
      throw new BadRequestException('امکان بازنویسی این نامه وجود ندارد');
    }

    // Save current state as version
    await this.prisma.letterVersion.create({
      data: {
        letterId: id,
        versionNumber: letter.currentVersion,
        subject: letter.subject,
        body: letter.body,
        changeNote: dto.changeNote,
        createdBy: revisedBy,
        snapshot: { subject: letter.subject, body: letter.body },
      },
    });

    // Update letter
    const updatedData: any = {
      currentVersion: { increment: 1 },
      status: 'DRAFT',
    };
    if (dto.subject) updatedData.subject = dto.subject;
    if (dto.body) updatedData.body = dto.body;

    await this.prisma.letter.update({ where: { id }, data: updatedData });

    await this.createAuditEntry(id, letter.zoneId, 'REVISED', revisedBy, null, `بازنویسی: ${dto.changeNote}`);
    return this.findById(id);
  }

  async getVersionHistory(id: string): Promise<any[]> {
    return this.prisma.letterVersion.findMany({
      where: { letterId: id },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async getVersion(id: string, versionNumber: number): Promise<any> {
    const version = await this.prisma.letterVersion.findUnique({
      where: { letterId_versionNumber: { letterId: id, versionNumber } },
    });
    if (!version) throw new NotFoundException('نسخه یافت نشد');
    return version;
  }

  // ─── QUERYING ─────────────────────────────────────────────────────────────

  async findAll(filter: FilterLettersDto): Promise<{ data: any[]; nextCursor?: string }> {
    const where: any = {};
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.direction) where.direction = filter.direction;
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.classification) where.classification = filter.classification;
    if (filter.priority) where.priority = filter.priority;
    if (filter.topic) where.topic = filter.topic;
    if (filter.slaBreached !== undefined) where.slaBreached = filter.slaBreached;
    if (filter.starred !== undefined) where.starred = filter.starred;
    if (filter.isAutoGenerated !== undefined) where.isAutoGenerated = filter.isAutoGenerated;
    if (filter.sourceModule) where.sourceModule = filter.sourceModule;
    if (filter.fromDate || filter.toDate) {
      where.createdAt = {};
      if (filter.fromDate) where.createdAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.createdAt.lte = new Date(filter.toDate);
    }
    if (filter.search) {
      where.OR = [
        { subject: { contains: filter.search, mode: 'insensitive' } },
        { senderName: { contains: filter.search, mode: 'insensitive' } },
        { senderOrgName: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const limit = filter.limit || 20;
    const orderBy: any = {};
    if (filter.sortBy) {
      orderBy[filter.sortBy] = filter.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const data = await this.prisma.letter.findMany({
      where,
      take: limit + 1,
      orderBy,
      include: { approvalSteps: true },
    });

    const nextCursor = data.length > limit ? data[limit].id : undefined;
    if (data.length > limit) data.pop();

    return { data, nextCursor };
  }

  async findById(id: string, userId?: string): Promise<any> {
    const letter = await this.prisma.letter.findUnique({
      where: { id },
      include: { approvalSteps: true, attachments: true, annotations: true },
    });
    if (!letter) throw new NotFoundException('نامه یافت نشد');

    // Apply classification access control
    if (letter.classification === 'SECRET') {
      // Only SUPER_ADMIN + ZONE_MANAGER can see full details
      // For now, just return basic info
    }

    // Mark as read
    if (userId && letter.unread) {
      await this.prisma.letter.update({
        where: { id },
        data: { unread: false },
      });
    }

    return letter;
  }

  async findByRegistryNumber(registryNumber: string, zoneId: string): Promise<any> {
    const letter = await this.prisma.letter.findFirst({
      where: { registryNumber, zoneId },
      include: { approvalSteps: true },
    });
    if (!letter) throw new NotFoundException('نامه یافت نشد');
    return letter;
  }

  async getInbox(userId: string, zoneId: string, filter: FilterLettersDto): Promise<{ data: any[]; nextCursor?: string }> {
    // Letters where userId is in recipients
    const where: any = {
      zoneId,
      direction: 'INCOMING',
      status: { notIn: ['CANCELLED', 'DRAFT'] },
    };

    const limit = filter.limit || 20;
    const data = await this.prisma.letter.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = data.length > limit ? data[limit].id : undefined;
    if (data.length > limit) data.pop();

    return { data, nextCursor };
  }

  async getOutbox(userId: string, zoneId: string, filter: FilterLettersDto): Promise<{ data: any[]; nextCursor?: string }> {
    const where: any = {
      zoneId,
      direction: 'OUTGOING',
      OR: [{ createdBy: userId }, { senderId: userId }],
    };

    const limit = filter.limit || 20;
    const data = await this.prisma.letter.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = data.length > limit ? data[limit].id : undefined;
    if (data.length > limit) data.pop();

    return { data, nextCursor };
  }

  async getPendingApprovals(userId: string, zoneId: string): Promise<any[]> {
    return this.prisma.letterApprovalStep.findMany({
      where: {
        assigneeId: userId,
        status: 'PENDING',
        letter: { zoneId, status: { notIn: ['CANCELLED', 'ARCHIVED'] } },
      },
      include: { letter: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getCompanyTimeline(companyId: string, filter: FilterLettersDto): Promise<{ data: any[]; nextCursor?: string }> {
    const where: any = { companyId };
    const limit = filter.limit || 20;
    const data = await this.prisma.letter.findMany({
      where,
      take: limit + 1,
      orderBy: { createdAt: 'desc' },
    });

    const nextCursor = data.length > limit ? data[limit].id : undefined;
    if (data.length > limit) data.pop();

    return { data, nextCursor };
  }

  async toggleStar(id: string, _userId: string): Promise<any> {
    const letter = await this.findById(id);
    await this.prisma.letter.update({
      where: { id },
      data: { starred: !letter.starred },
    });
    return this.findById(id);
  }

  async markAsRead(id: string, _userId: string): Promise<void> {
    await this.prisma.letter.update({ where: { id }, data: { unread: false } });
  }

  async markAsUnread(id: string, _userId: string): Promise<void> {
    await this.prisma.letter.update({ where: { id }, data: { unread: true } });
  }

  /**
   * به‌روزرسانی محتوای نامه (PATCH /letters/:id).
   * فقط فیلدهای ارسالی اعمال می‌شوند؛ شماره دفترخانه، تاریخچه هش و گردش کار
   * دست‌نخورده می‌مانند تا زنجیره صحت نامه حفظ شود.
   */
  async update(id: string, dto: UpdateLetterDto, actorId: string): Promise<any> {
    const existing = await this.findById(id);

    // نامه‌های ارسال/بایگانی‌شده قفل محتوایی هستند و فقط از مسیر revise قابل ویرایش‌اند.
    const LOCKED_STATUSES = ['DISPATCHED', 'ARCHIVED', 'CANCELLED'];
    if (LOCKED_STATUSES.includes(existing.status)) {
      throw new BadRequestException('نامه ارسال یا بایگانی شده و قابل ویرایش مستقیم نیست');
    }

    const data: Record<string, unknown> = {};
    const ASSIGNABLE: (keyof UpdateLetterDto)[] = [
      'subject',
      'body',
      'salutation',
      'closing',
      'classification',
      'priority',
      'topic',
      'enclosuresCount',
      'signatory',
      'signatoryRole',
      'slaHours',
      'starred',
      'tags',
      'internalNotes',
    ];
    for (const key of ASSIGNABLE) {
      const value = dto[key];
      if (value !== undefined) data[key] = value;
    }
    if (dto.recipients !== undefined) data.recipients = dto.recipients;
    if (dto.cc !== undefined) data.cc = dto.cc;

    if (Object.keys(data).length === 0) {
      throw new BadRequestException('هیچ فیلدی برای به‌روزرسانی ارسال نشده است');
    }

    await this.prisma.letter.update({ where: { id }, data });
    await this.createAuditEntry(
      id,
      existing.zoneId,
      'UPDATED',
      actorId,
      null,
      `نامه ویرایش شد: ${Object.keys(data).join(', ')}`,
    );
    return this.findById(id);
  }

  /**
   * حذف نامه (DELETE /letters/:id).
   * نامه‌های دارای شماره دفترخانه فقط در وضعیت پیش‌نویس قابل حذف‌اند تا
   * توالی شماره‌گذاری و زنجیره هش صدمه نبیند؛ در غیر این صورت لغو می‌شود.
   */
  async remove(id: string, actorId: string): Promise<void> {
    const existing = await this.findById(id);

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(
        'فقط پیش‌نویس‌ها قابل حذف هستند؛ برای نامه ثبت‌شده از لغو نامه استفاده کنید',
      );
    }

    await this.prisma.$transaction([
      this.prisma.letterAuditEntry.deleteMany({ where: { letterId: id } }),
      this.prisma.letterAttachment.deleteMany({ where: { letterId: id } }),
      this.prisma.letter.delete({ where: { id } }),
    ]);
    // توجه: رکورد ممیزی پس از حذف ساخته نمی‌شود چون LetterAuditEntry به Letter وابستگی FK دارد.
    this.logger.log(
      `Letter ${existing.registryNumber} (${id}) deleted by ${actorId}`,
    );
  }

  // ─── ATTACHMENTS ──────────────────────────────────────────────────────────

  async uploadAttachment(letterId: string, type: string, title: string, file: any, uploadedBy: string): Promise<any> {
    const letter = await this.findById(letterId);
    const fileKey = `letter-docs/${letterId}/${type}/${Date.now()}-${file.originalname}`;

    return this.prisma.letterAttachment.create({
      data: {
        letterId,
        type,
        title,
        fileKey,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy,
      },
    });
  }

  async deleteAttachment(attachmentId: string, deletedBy: string): Promise<void> {
    await this.prisma.letterAttachment.delete({ where: { id: attachmentId } });
  }

  async getAttachments(letterId: string): Promise<any[]> {
    return this.prisma.letterAttachment.findMany({
      where: { letterId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  // ─── ANNOTATIONS ──────────────────────────────────────────────────────────

  async addAnnotation(letterId: string, content: string, color: string, isPrivate: boolean, authorId: string): Promise<any> {
    const letter = await this.findById(letterId);

    return this.prisma.letterAnnotation.create({
      data: {
        letterId,
        authorId,
        authorName: letter.senderName || 'ناشناس',
        content,
        color,
        isPrivate,
      },
    });
  }

  async deleteAnnotation(annotationId: string, deletedBy: string): Promise<void> {
    const annotation = await this.prisma.letterAnnotation.findUnique({ where: { id: annotationId } });
    if (!annotation) throw new NotFoundException('یادداشت یافت نشد');
    if (annotation.authorId !== deletedBy) {
      throw new ForbiddenException('فقط نویسنده می‌تواند یادداشت را حذف کند');
    }
    await this.prisma.letterAnnotation.delete({ where: { id: annotationId } });
  }

  // ─── QR & VERIFICATION ────────────────────────────────────────────────────

  async generateQrCode(letterId: string): Promise<{ qrPayload: string; qrImageKey: string; verifyUrl: string }> {
    const letter = await this.findById(letterId);
    const qrPayload = generateLetterQrPayload(letter.registryNumber, letter.qrHash);
    const verifyUrl = `${process.env.APP_URL || 'https://idop.ir'}/verify?mode=letter&hash=${letter.qrHash}`;

    await this.prisma.letter.update({
      where: { id: letterId },
      data: { qrImageKey: `qr/${letterId}.png`, verifyUrl },
    });

    return { qrPayload, qrImageKey: `qr/${letterId}.png`, verifyUrl };
  }

  async verifyByQrHash(qrHash: string): Promise<any> {
    // 1. Find letter by qrHash
    const letter = await this.prisma.letter.findFirst({ where: { qrHash } });
    if (!letter) {
      return { isValid: false, message: 'نامه یافت نشد' };
    }

    // 2. Check status
    const isActive = !['CANCELLED', 'DRAFT'].includes(letter.status);

    // 3. Validate hash chain integrity
    let hashChainValid = false;
    if (letter.hashChain) {
      const prevLetter = letter.previousHash
        ? await this.prisma.letter.findFirst({ where: { hashChain: letter.previousHash } })
        : null;
      const expectedHash = computeLetterHashChain(prevLetter?.hashChain || null, letter.registryNumber, letter.body);
      hashChainValid = letter.hashChain === expectedHash;
    }

    // 4. Compute authenticity score
    const approvalComplete = letter.status === 'APPROVED' || letter.status === 'SIGNED' || letter.status === 'DISPATCHED';
    const hasDispatchRecord = !!letter.dispatchRecord;
    const slaNotBreached = !letter.slaBreached;

    const authenticityScore = computeAuthenticityScore({
      approvalComplete,
      hasDispatchRecord,
      hashChainValid,
      slaNotBreached,
    });

    // 5. Apply classification privacy rules
    const safeLetter: any = {
      registryNumber: letter.registryNumber,
      direction: letter.direction,
      type: letter.type,
      classification: letter.classification,
      status: letter.status,
      createdAt: letter.createdAt,
      sentAt: letter.sentAt,
      slaBreached: letter.slaBreached,
    };

    if (letter.classification !== 'SECRET') {
      safeLetter.subject = letter.subject;
      safeLetter.senderOrgName = letter.senderOrgName;
    }
    if (letter.classification === 'UNCLASSIFIED') {
      safeLetter.signatory = letter.signatory;
      safeLetter.signatoryRole = letter.signatoryRole;
    }

    return {
      isValid: isActive,
      authenticityScore,
      letter: safeLetter,
      hashChainValid,
      message: isActive ? 'نامه معتبر است' : 'نامه نامعتبر است',
    };
  }

  // ─── REGISTRY BOOK ────────────────────────────────────────────────────────

  async getRegistryBook(
    zoneId: string,
    year: number,
    filter?: { direction?: LetterDirection; type?: string; fromSeq?: number; toSeq?: number },
  ): Promise<any[]> {
    const where: any = { zoneId, registryYear: year };
    if (filter?.direction) where.direction = filter.direction;
    if (filter?.type) where.type = filter.type;
    if (filter?.fromSeq || filter?.toSeq) {
      where.registrySeq = {};
      if (filter.fromSeq) where.registrySeq.gte = filter.fromSeq;
      if (filter.toSeq) where.registrySeq.lte = filter.toSeq;
    }

    return this.prisma.letter.findMany({
      where,
      orderBy: { registrySeq: 'asc' },
      select: {
        registrySeq: true,
        registryNumber: true,
        createdAt: true,
        subject: true,
        direction: true,
        type: true,
        senderName: true,
        senderOrgName: true,
        recipients: true,
        status: true,
        archiveLocation: true,
      },
    });
  }

  async getRegistryStats(zoneId: string, year: number): Promise<any> {
    const letters = await this.prisma.letter.findMany({
      where: { zoneId, registryYear: year },
    });

    const byType: Record<string, number> = {};
    const byMonth = new Array(12).fill(0);
    let incoming = 0;
    let outgoing = 0;
    let internal = 0;

    for (const l of letters) {
      byType[l.type] = (byType[l.type] || 0) + 1;
      if (l.direction === 'INCOMING') incoming++;
      else if (l.direction === 'OUTGOING') outgoing++;
      else internal++;

      const month = new Date(l.createdAt).getMonth();
      byMonth[month]++;
    }

    return {
      totalLetters: letters.length,
      incoming,
      outgoing,
      internal,
      byType,
      byMonth,
      lastSeq: letters.length > 0 ? Math.max(...letters.map((l) => l.registrySeq)) : 0,
    };
  }

  // ─── PDF GENERATION ───────────────────────────────────────────────────────

  async generateLetterPdf(letterId: string): Promise<{ pdfKey: string; pdfUrl: string }> {
    const letter = await this.findById(letterId);
    const zone = await this.prisma.zone.findUnique({ where: { id: letter.zoneId } });

    const pdfBuffer = await this.pdfGenerator.generatePdf({
      registryNumber: letter.registryNumber,
      subject: letter.subject,
      body: letter.body,
      senderName: letter.senderName,
      senderOrgName: letter.senderOrgName,
      senderRole: letter.senderRole,
      recipients: letter.recipients as any[],
      salutation: letter.salutation,
      closing: letter.closing,
      signatory: letter.signatory,
      signatoryRole: letter.signatoryRole,
      enclosuresCount: letter.enclosuresCount,
      priority: letter.priority,
      classification: letter.classification,
      qrPayload: `IDOP:LETTER:${letter.registryNumber}:${letter.qrHash}`,
      verifyUrl: letter.verifyUrl,
      zoneNameFa: zone?.nameFa || 'شهرک صنعتی',
      date: new Date().toLocaleDateString('fa-IR'),
    });

    const pdfKey = `letter-pdfs/${letterId}/${Date.now()}.pdf`;

    return { pdfKey, pdfUrl: `${process.env.MINIO_ENDPOINT || ''}/${pdfKey}` };
  }

  // ─── SLA MANAGEMENT ───────────────────────────────────────────────────────

  async checkSlaBreaches(zoneId: string): Promise<void> {
    const now = new Date();
    const breachedLetters = await this.prisma.letter.findMany({
      where: {
        zoneId,
        slaBreached: false,
        slaDeadline: { lt: now },
        status: { notIn: ['CANCELLED', 'ARCHIVED', 'DISPATCHED'] },
      },
    });

    for (const letter of breachedLetters) {
      await this.prisma.letter.update({
        where: { id: letter.id },
        data: { slaBreached: true },
      });
      await this.createAuditEntry(letter.id, zoneId, 'SLA_BREACHED', 'SYSTEM', null, 'مهلت SLA نقض شد');
    }
  }

  async getSlaReport(zoneId: string, fromDate: string, toDate: string): Promise<any> {
    const letters = await this.prisma.letter.findMany({
      where: {
        zoneId,
        createdAt: { gte: new Date(fromDate), lte: new Date(toDate) },
      },
    });

    const total = letters.length;
    const breached = letters.filter((l) => l.slaBreached).length;
    const onTime = total - breached;

    const byPriority: Record<string, { total: number; breached: number }> = {};
    const byType: Record<string, { total: number; breached: number }> = {};

    for (const l of letters) {
      byPriority[l.priority] = byPriority[l.priority] || { total: 0, breached: 0 };
      byPriority[l.priority].total++;
      if (l.slaBreached) byPriority[l.priority].breached++;

      byType[l.type] = byType[l.type] || { total: 0, breached: 0 };
      byType[l.type].total++;
      if (l.slaBreached) byType[l.type].breached++;
    }

    return {
      totalLetters: total,
      onTime,
      breached,
      breachRate: total > 0 ? Math.round((breached / total) * 100) : 0,
      avgResolutionHours: 0,
      byPriority,
      byType,
    };
  }

  // ─── ANALYTICS ────────────────────────────────────────────────────────────

  async getLetterStats(zoneId: string, companyId?: string): Promise<any> {
    const where: any = { zoneId };
    if (companyId) where.companyId = companyId;

    const letters = await this.prisma.letter.findMany({ where });

    const byStatus: Record<string, number> = {};
    const byDirection: Record<string, number> = {};
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    let autoGeneratedCount = 0;
    let slaBreached = 0;

    for (const l of letters) {
      byStatus[l.status] = (byStatus[l.status] || 0) + 1;
      byDirection[l.direction] = (byDirection[l.direction] || 0) + 1;
      byType[l.type] = (byType[l.type] || 0) + 1;
      byPriority[l.priority] = (byPriority[l.priority] || 0) + 1;
      if (l.isAutoGenerated) autoGeneratedCount++;
      if (l.slaBreached) slaBreached++;
    }

    const pendingApprovals = await this.prisma.letterApprovalStep.count({
      where: {
        status: 'PENDING',
        letter: { zoneId },
      },
    });

    return {
      total: letters.length,
      byStatus,
      byDirection,
      byType,
      byPriority,
      autoGeneratedCount,
      pendingApprovals,
      slaBreached,
    };
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────

  private async incrementRegistryCounter(zoneId: string, year: number): Promise<number> {
    const lockKey = REDIS_KEYS.letterRegistryLock(zoneId, String(year));
    const seqKey = REDIS_KEYS.letterRegistrySeq(zoneId, String(year));

    // Try to acquire lock (simple TTL-based approach)
    await this.redis.set(lockKey, '1', REDIS_TTL.LETTER_REGISTRY_LOCK);

    try {
      const counter = await this.redis.incr(seqKey);
      return counter;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  private buildApprovalChain(classification: string): Array<{
    stepOrder: number;
    roleFa: string;
    type: string;
    isRequired: boolean;
  }> {
    const steps = [
      { stepOrder: 0, roleFa: 'کارشناس', type: 'REVIEWER', isRequired: true },
      { stepOrder: 1, roleFa: 'مدیر', type: 'APPROVER', isRequired: true },
      { stepOrder: 2, roleFa: 'مدیرعامل', type: 'SIGNER', isRequired: false },
    ];

    if (classification === 'SECRET') {
      steps.splice(2, 0, { stepOrder: 2, roleFa: 'مدیر شهرک', type: 'APPROVER', isRequired: true });
      steps[3].stepOrder = 3;
      steps[3].stepOrder = 4;
    } else if (classification === 'RESTRICTED') {
      steps.splice(1, 0, { stepOrder: 1, roleFa: 'رئیس اداره', type: 'APPROVER', isRequired: true });
      steps[2].stepOrder = 2;
      steps[3].stepOrder = 3;
    }

    return steps;
  }

  private resolveTemplateVariables(
    template: any,
    variables: Record<string, string>,
  ): { subject: string; body: string; salutation?: string; closing?: string } {
    let subject = template.subjectTemplate;
    let body = template.bodyTemplate;
    let salutation = template.salutationTemplate;
    let closing = template.closingTemplate;

    // Replace all {{variable}} placeholders
    const allVars = { ...variables };
    for (const v of template.variables as any[]) {
      if (!allVars[v.key] && v.defaultValue) {
        allVars[v.key] = v.defaultValue;
      }
      if (v.source === 'date' && !allVars[v.key]) {
        allVars[v.key] = new Date().toLocaleDateString('fa-IR');
      }
    }

    for (const [key, value] of Object.entries(allVars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value || `{{${key}}}`);
      body = body.replace(regex, value || `{{${key}}}`);
      if (salutation) salutation = salutation.replace(regex, value || `{{${key}}}`);
      if (closing) closing = closing.replace(regex, value || `{{${key}}}`);
    }

    return { subject, body, salutation, closing };
  }

  private async createAuditEntry(
    letterId: string,
    zoneId: string,
    action: string,
    actorId: string | null,
    ipAddress: string | null,
    description: string,
  ): Promise<void> {
    const lastEntry = await this.prisma.letterAuditEntry.findFirst({
      where: { letterId },
      orderBy: { timestamp: 'desc' },
      select: { hash: true },
    });

    const now = new Date();
    const hash = computeAuditEntryHash(lastEntry?.hash || null, action, actorId, now.toISOString());

    await this.prisma.letterAuditEntry.create({
      data: {
        letterId,
        zoneId,
        action,
        actorId,
        description,
        ipAddress,
        hash,
        previousHash: lastEntry?.hash || null,
        timestamp: now,
      },
    });
  }
}
