import { Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { PaginatedResult } from '../../common/dto/response.dto';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { FilterCompaniesDto } from './dto/filter-companies.dto';
import { ReviewOnboardingStepDto } from './dto/review-step.dto';
import { AllocatePlotDto } from './dto/allocate-plot.dto';
import { UploadCompanyDocumentDto, CreateContactDto, UpdateContactDto } from './dto/upload-document.dto';
import {
  CompanyLifecycle,
  OnboardingStepName,
  StepStatus,
  Prisma,
  UserRole,
  UserStatus,
  PlotStatus,
} from '@prisma/client';
import { randomUUID as uuid } from 'crypto';

const ONBOARDING_STEPS: OnboardingStepName[] = [
  'INITIAL_REVIEW',
  'FINANCIAL_REVIEW',
  'HSE_REVIEW',
  'PLOT_ALLOCATION',
  'MANAGER_APPROVAL',
  'CONTRACT_SIGNING',
];

const LIFECYCLE_BY_STEP: Record<OnboardingStepName, CompanyLifecycle> = {
  INITIAL_REVIEW: 'UNDER_REVIEW',
  FINANCIAL_REVIEW: 'FINANCE_REVIEW',
  HSE_REVIEW: 'HSE_REVIEW',
  PLOT_ALLOCATION: 'PLOT_ALLOCATION',
  MANAGER_APPROVAL: 'ZONE_MANAGER_APPROVAL',
  CONTRACT_SIGNING: 'ZONE_MANAGER_APPROVAL',
};

const STEP_REVIEWER_ROLES: Record<OnboardingStepName, UserRole[]> = {
  INITIAL_REVIEW: [UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER],
  FINANCIAL_REVIEW: [UserRole.ZONE_MANAGER],
  HSE_REVIEW: [UserRole.ZONE_MANAGER],
  PLOT_ALLOCATION: [UserRole.ZONE_MANAGER],
  MANAGER_APPROVAL: [UserRole.ZONE_MANAGER],
  CONTRACT_SIGNING: [UserRole.ZONE_MANAGER],
};

@Injectable()
export class CompanyService {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly bull: BullService,
    private readonly audit: AuditService,
    private readonly gateway: IdopGateway,
  ) {
    this.registerBullWorkers();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REGISTRATION
  // ══════════════════════════════════════════════════════════════════════════

  async register(dto: RegisterCompanyDto, registeredBy: string) {
    // 1. Verify zone exists and is ACTIVE
    const zone = await this.prisma.zone.findFirst({
      where: { id: dto.zoneId, deletedAt: null },
    });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');
    if (zone.status !== 'ACTIVE') throw new AppException('ZONE_NOT_ACTIVE');

    // 2. Check uniqueness
    const existingReg = await this.prisma.company.findUnique({
      where: { registrationNumber: dto.registrationNumber },
    });
    if (existingReg) throw new AppException('COMPANY_REGISTRATION_TAKEN');

    const existingNid = await this.prisma.company.findUnique({
      where: { nationalId: dto.nationalId },
    });
    if (existingNid) throw new AppException('COMPANY_NATIONAL_ID_TAKEN');

    // 3. Create company with APPLICANT status
    const company = await this.prisma.company.create({
      data: {
        zoneId: dto.zoneId,
        registrationNumber: dto.registrationNumber,
        nationalId: dto.nationalId,
        nameFa: dto.nameFa,
        nameEn: dto.nameEn || null,
        type: dto.type,
        industryCategory: dto.industryCategory,
        economicCode: dto.economicCode || null,
        phone: dto.phone || null,
        email: dto.email || null,
        address: dto.address || null,
        ceoName: dto.ceoName,
        ceoNationalId: dto.ceoNationalId,
        ceoPhone: dto.ceoPhone,
        ceoEmail: dto.ceoEmail || null,
        employeeCount: dto.employeeCount || null,
        mainProduct: dto.mainProduct || null,
        lifecycleStatus: 'APPLICANT',
      },
    });

    // 4. Create all 6 OnboardingStep records
    const steps = ONBOARDING_STEPS.map((stepName) => ({
      companyId: company.id,
      stepName,
      status: stepName === 'INITIAL_REVIEW' ? 'IN_PROGRESS' as StepStatus : 'PENDING' as StepStatus,
      startedAt: stepName === 'INITIAL_REVIEW' ? new Date() : null,
    }));

    await this.prisma.onboardingStep.createMany({ data: steps });

    // 5. Notify ZONE_MANAGER
    const zoneManagers = await this.prisma.user.findMany({
      where: { zoneId: dto.zoneId, role: 'ZONE_MANAGER', status: 'ACTIVE' },
    });
    for (const manager of zoneManagers) {
      await this.prisma.notification.create({
        data: {
          recipientId: manager.id,
          zoneId: dto.zoneId,
          module: 'COMPANY',
          eventType: 'company.new_applicant',
          priority: 'NORMAL',
          title: 'New Company Application',
          titleFa: 'شرکت جدید ثبت نام کرد',
          body: `شرکت ${dto.nameFa} درخواست پذیرش ثبت کرده است.`,
          bodyFa: `شرکت ${dto.nameFa} درخواست پذیرش ثبت کرده است.`,
          entityType: 'COMPANY',
          entityId: company.id,
          metadata: { companyId: company.id },
        },
      });
    }

    // 6. Audit
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: registeredBy,
      targetId: company.id,
      targetType: 'Company',
      action: 'COMPANY_REGISTERED',
      metadata: { nameFa: dto.nameFa, registrationNumber: dto.registrationNumber },
    });

    // 7. Socket event
    this.gateway.emitToZone(dto.zoneId, 'company:registered', {
      companyId: company.id,
      companyName: dto.nameFa,
      zoneId: dto.zoneId,
      timestamp: new Date().toISOString(),
    });

    // 8. Send welcome SMS
    await this.bull.addJob('notifications', 'send-company-sms', {
      phone: dto.ceoPhone,
      message: `شرکت ${dto.nameFa} با موفقیت ثبت نام شد. فرآیند پذیرش آغاز شده است.`,
      companyId: company.id,
      purpose: 'welcome',
    });

    return company;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LISTING & DETAIL
  // ══════════════════════════════════════════════════════════════════════════

  async findAll(filter: FilterCompaniesDto): Promise<PaginatedResult<unknown>> {
    const where: Prisma.CompanyWhereInput = { deletedAt: null };
    if (filter.zoneId) where.zoneId = filter.zoneId;
    if (filter.lifecycleStatus) where.lifecycleStatus = filter.lifecycleStatus;
    if (filter.type) where.type = filter.type;
    if (filter.riskLevel) where.riskLevel = filter.riskLevel;
    if (filter.isActive !== undefined) where.isActive = filter.isActive;
    if (filter.industryCategory) where.industryCategory = filter.industryCategory;
    if (filter.search) {
      where.OR = [
        { nameFa: { contains: filter.search, mode: 'insensitive' } },
        { registrationNumber: { contains: filter.search } },
        { nationalId: { contains: filter.search } },
      ];
    }

    const limit = filter.limit || 20;
    const orderBy: Prisma.CompanyOrderByWithRelationInput =
      filter.sortBy === 'healthScore'
        ? { healthScore: filter.sortOrder || 'desc' }
        : filter.sortBy === 'nameFa'
          ? { nameFa: filter.sortOrder || 'asc' }
          : { createdAt: filter.sortOrder || 'desc' };

    if (filter.cursor) {
      const cursorCompany = await this.prisma.company.findUnique({ where: { id: filter.cursor } });
      if (cursorCompany) {
        const items = await this.prisma.company.findMany({
          where: { ...where, createdAt: { gt: cursorCompany.createdAt } },
          orderBy,
          take: limit + 1,
        });
        const hasNextPage = items.length > limit;
        const data = hasNextPage ? items.slice(0, limit) : items;
        return new PaginatedResult(data, {
          cursor: data.length > 0 ? data[data.length - 1].id : undefined,
          hasNextPage,
          limit,
        });
      }
    }

    const page = 1;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      this.prisma.company.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.company.count({ where }),
    ]);

    return new PaginatedResult(items, { page, limit, total });
  }

  async findById(id: string, zoneId?: string) {
    const where: Prisma.CompanyWhereInput = { id, deletedAt: null };
    if (zoneId) where.zoneId = zoneId;

    const company = await this.prisma.company.findFirst({ where });
    if (!company) throw new AppException('COMPANY_NOT_FOUND');
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, updatedBy: string) {
    const company = await this.findById(id);
    const updated = await this.prisma.company.update({
      where: { id },
      data: {
        ...(dto.nameFa !== undefined && { nameFa: dto.nameFa }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.tags !== undefined && { tags: dto.tags }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.riskLevel !== undefined && { riskLevel: dto.riskLevel }),
        ...(dto.creditLimit !== undefined && { creditLimit: dto.creditLimit }),
      },
    });

    await this.redis.del(REDIS_KEYS.companyProfile(id));
    await this.audit.log({
      zoneId: company.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'Company',
      action: 'COMPANY_UPDATED',
      metadata: dto as any,
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ONBOARDING
  // ══════════════════════════════════════════════════════════════════════════

  async getOnboardingStatus(companyId: string) {
    const company = await this.findById(companyId);
    const steps = await this.prisma.onboardingStep.findMany({
      where: { companyId },
      orderBy: { createdAt: 'asc' },
    });

    const currentStepIndex = steps.findIndex((s) => s.status === 'IN_PROGRESS');
    const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex].stepName : 'INITIAL_REVIEW';
    const approvedCount = steps.filter((s) => s.status === 'APPROVED').length;
    const progressPercent = Math.round((approvedCount / steps.length) * 100);

    let daysInCurrentStep = 0;
    let isOverdue = false;
    if (currentStepIndex >= 0 && steps[currentStepIndex].startedAt) {
      daysInCurrentStep = Math.floor(
        (Date.now() - steps[currentStepIndex].startedAt!.getTime()) / (1000 * 60 * 60 * 24),
      );
      isOverdue = daysInCurrentStep > 7;
    }

    return {
      currentStep,
      steps,
      progressPercent,
      daysInCurrentStep,
      isOverdue,
    };
  }

  async reviewOnboardingStep(
    companyId: string,
    dto: ReviewOnboardingStepDto,
    reviewedBy: string,
  ) {
    const company = await this.findById(companyId);

    // 1. Find the OnboardingStep
    const step = await this.prisma.onboardingStep.findFirst({
      where: { companyId, stepName: dto.stepName },
    });
    if (!step) throw new AppException('ONBOARDING_STEP_NOT_FOUND');

    // 2. Check reviewer authorization
    const actor = await this.prisma.user.findUnique({ where: { id: reviewedBy } });
    if (!actor) throw new AppException('USER_NOT_FOUND');
    const allowedRoles = STEP_REVIEWER_ROLES[dto.stepName];
    if (!allowedRoles.includes(actor.role)) {
      throw new AppException('ONBOARDING_REVIEWER_NOT_AUTHORIZED');
    }

    // 3. Update step
    const stepUpdate: Prisma.OnboardingStepUpdateInput = {
      status: dto.status,
      reviewedBy,
      reviewedAt: new Date(),
      comment: dto.comment || null,
      attachments: dto.attachments || [],
    };

    if (dto.status === 'IN_PROGRESS') {
      stepUpdate.startedAt = new Date();
    }
    if (dto.status === 'APPROVED') {
      stepUpdate.completedAt = new Date();
    }

    await this.prisma.onboardingStep.update({
      where: { id: step.id },
      data: stepUpdate,
    });

    // 4. If APPROVED: advance to next step
    if (dto.status === 'APPROVED') {
      const currentIndex = ONBOARDING_STEPS.indexOf(dto.stepName);
      const nextStepName = ONBOARDING_STEPS[currentIndex + 1];

      if (nextStepName) {
        // Start next step
        await this.prisma.onboardingStep.update({
          where: { companyId_stepName: { companyId, stepName: nextStepName } },
          data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });

        // Update company lifecycle
        await this.prisma.company.update({
          where: { id: companyId },
          data: { lifecycleStatus: LIFECYCLE_BY_STEP[nextStepName] },
        });
      } else {
        // All steps approved → activate company
        await this.prisma.company.update({
          where: { id: companyId },
          data: {
            isActive: true,
            lifecycleStatus: 'ACTIVE',
          },
        });

        // Create COMPANY_ADMIN user account for CEO
        if (company.ceoEmail) {
          const tempPassword = uuid().slice(0, 12) + 'A1';
          const passwordHash = await bcrypt.hash(tempPassword, 12);

          await this.prisma.user.create({
            data: {
              email: company.ceoEmail,
              phone: company.ceoPhone,
              passwordHash,
              firstName: company.ceoName.split(' ')[0] || company.ceoName,
              lastName: company.ceoName.split(' ').slice(1).join(' ') || '',
              zoneId: company.zoneId,
              companyId: company.id,
              role: 'COMPANY_ADMIN',
              status: 'ACTIVE',
              mustChangePassword: true,
            },
          });

          // Send activation email
          await this.bull.addJob('notifications', 'send-email', {
            to: company.ceoEmail,
            subject: 'فعال‌سازی حساب کاربری شرکت',
            template: 'welcome',
            variables: {
              companyName: company.nameFa,
              email: company.ceoEmail,
              tempPassword,
            },
          });
        }

        // Emit socket event
        this.gateway.emitToZone(company.zoneId, 'company:activated', {
          companyId: company.id,
          companyName: company.nameFa,
          timestamp: new Date().toISOString(),
        });

        // Schedule health score computation
        await this.bull.addJob('zone-operations', 'compute-health-scores', {
          companyId: company.id,
          scheduledFor: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        });
      }
    }

    // 5. Notify company CEO
    if (company.ceoEmail) {
      await this.bull.addJob('notifications', 'send-email', {
        to: company.ceoEmail,
        subject: `بررسی مرحله ${dto.stepName}`,
        template: 'onboarding-step-update',
        variables: {
          companyName: company.nameFa,
          stepName: dto.stepName,
          status: dto.status,
          comment: dto.comment,
        },
      });
    }

    // 6. Socket event
    this.gateway.emitToZone(company.zoneId, 'company:step:updated', {
      companyId,
      stepName: dto.stepName,
      status: dto.status,
      comment: dto.comment,
      timestamp: new Date().toISOString(),
    });

    // 7. Audit
    await this.audit.log({
      zoneId: company.zoneId,
      userId: reviewedBy,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_STEP_REVIEWED',
      metadata: { stepName: dto.stepName, status: dto.status, comment: dto.comment },
    });

    return this.findById(companyId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PLOT ALLOCATION
  // ══════════════════════════════════════════════════════════════════════════

  async allocatePlot(dto: AllocatePlotDto, allocatedBy: string) {
    const company = await this.findById(dto.companyId);
    const plot = await this.prisma.plot.findUnique({ where: { id: dto.plotId } });

    if (!plot) throw new AppException('PLOT_NOT_FOUND');
    if (plot.zoneId !== company.zoneId) throw new AppException('PLOT_WRONG_ZONE');
    if (plot.status !== 'AVAILABLE') throw new AppException('PLOT_NOT_AVAILABLE');
    if (company.plotId) throw new AppException('COMPANY_ALREADY_HAS_PLOT');
    if (company.lifecycleStatus !== 'PLOT_ALLOCATION') throw new AppException('ONBOARDING_STEP_NOT_IN_PROGRESS');

    // Update plot status
    await this.prisma.plot.update({
      where: { id: dto.plotId },
      data: { status: 'RESERVED' },
    });

    // Assign to company
    await this.prisma.company.update({
      where: { id: dto.companyId },
      data: { plotId: dto.plotId },
    });

    // Advance onboarding step
    await this.prisma.onboardingStep.update({
      where: {
        companyId_stepName: { companyId: dto.companyId, stepName: 'PLOT_ALLOCATION' },
      },
      data: {
        status: 'APPROVED',
        completedAt: new Date(),
        reviewedBy: allocatedBy,
        reviewedAt: new Date(),
      },
    });

    // Start next step
    await this.prisma.onboardingStep.update({
      where: {
        companyId_stepName: { companyId: dto.companyId, stepName: 'MANAGER_APPROVAL' },
      },
      data: { status: 'IN_PROGRESS', startedAt: new Date() },
    });

    await this.prisma.company.update({
      where: { id: dto.companyId },
      data: { lifecycleStatus: 'ZONE_MANAGER_APPROVAL' },
    });

    // Audit
    await this.audit.log({
      zoneId: company.zoneId,
      userId: allocatedBy,
      targetId: dto.companyId,
      targetType: 'Company',
      action: 'COMPANY_PLOT_ALLOCATED',
      metadata: { plotId: dto.plotId, plotCode: plot.code },
    });

    // Socket
    this.gateway.emitToZone(company.zoneId, 'plot:allocated', {
      plotId: dto.plotId,
      plotCode: plot.code,
      companyId: dto.companyId,
      companyName: company.nameFa,
      timestamp: new Date().toISOString(),
    });

    return this.findById(dto.companyId);
  }

  async deallocatePlot(companyId: string, deallocatedBy: string) {
    const company = await this.findById(companyId);
    if (!company.plotId) throw new AppException('COMPANY_NOT_FOUND');

    await this.prisma.plot.update({
      where: { id: company.plotId },
      data: { status: 'AVAILABLE' },
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: { plotId: null },
    });

    await this.audit.log({
      zoneId: company.zoneId,
      userId: deallocatedBy,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_PLOT_DEALLOCATED',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUSPEND / TERMINATE / REACTIVATE
  // ══════════════════════════════════════════════════════════════════════════

  async suspend(companyId: string, reason: string, suspendedBy: string) {
    const company = await this.findById(companyId);

    await this.prisma.company.update({
      where: { id: companyId },
      data: { lifecycleStatus: 'SUSPENDED', isActive: false },
    });

    // Revoke all company user sessions
    const companyUserIds = (
      await this.prisma.user.findMany({ where: { companyId }, select: { id: true } })
    ).map((u) => u.id);

    await this.prisma.userSession.updateMany({
      where: { userId: { in: companyUserIds }, isRevoked: false },
      data: { isRevoked: true },
    });

    // Notify COMPANY_ADMIN users
    const admins = await this.prisma.user.findMany({
      where: { companyId, role: 'COMPANY_ADMIN', status: 'ACTIVE' },
    });
    for (const admin of admins) {
      await this.prisma.notification.create({
        data: {
          recipientId: admin.id,
          zoneId: company.zoneId,
          module: 'COMPANY',
          eventType: 'company.suspended',
          priority: 'HIGH',
          title: 'Company Suspended',
          titleFa: 'شرکت معلق شد',
          body: `شرکت ${company.nameFa} معلق شد. دلیل: ${reason}`,
          bodyFa: `شرکت ${company.nameFa} معلق شد. دلیل: ${reason}`,
          entityType: 'COMPANY',
          entityId: companyId,
          metadata: { companyId },
        },
      });
    }

    await this.audit.log({
      zoneId: company.zoneId,
      userId: suspendedBy,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_SUSPENDED',
      metadata: { reason },
    });

    this.gateway.emitToZone(company.zoneId, 'company:suspended', {
      companyId,
      reason,
      timestamp: new Date().toISOString(),
    });

    return this.findById(companyId);
  }

  async terminate(companyId: string, reason: string, terminatedBy: string) {
    const company = await this.findById(companyId);

    await this.prisma.company.update({
      where: { id: companyId },
      data: { lifecycleStatus: 'TERMINATED', isActive: false },
    });

    // Release plot
    if (company.plotId) {
      await this.prisma.plot.update({
        where: { id: company.plotId },
        data: { status: 'AVAILABLE' },
      });
      await this.prisma.company.update({
        where: { id: companyId },
        data: { plotId: null },
      });
    }

    // Revoke all sessions
    const companyUserIds = (
      await this.prisma.user.findMany({ where: { companyId }, select: { id: true } })
    ).map((u) => u.id);
    await this.prisma.userSession.updateMany({
      where: { userId: { in: companyUserIds }, isRevoked: false },
      data: { isRevoked: true },
    });

    await this.audit.log({
      zoneId: company.zoneId,
      userId: terminatedBy,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_TERMINATED',
      metadata: { reason },
    });

    return this.findById(companyId);
  }

  async reactivate(companyId: string, reactivatedBy: string) {
    const company = await this.findById(companyId);
    if (company.lifecycleStatus !== 'SUSPENDED') {
      throw new AppException('COMPANY_SUSPENDED');
    }

    await this.prisma.company.update({
      where: { id: companyId },
      data: { lifecycleStatus: 'ACTIVE', isActive: true },
    });

    await this.audit.log({
      zoneId: company.zoneId,
      userId: reactivatedBy,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_REACTIVATED',
    });

    return this.findById(companyId);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DOCUMENTS
  // ══════════════════════════════════════════════════════════════════════════

  async uploadDocument(
    companyId: string,
    dto: UploadCompanyDocumentDto,
    file: Express.Multer.File,
    uploadedBy: string,
  ) {
    const company = await this.findById(companyId);
    const ext = file.originalname.split('.').pop() || 'pdf';
    const key = `company-docs/${companyId}/${dto.type}/${uuid()}.${ext}`;

    const doc = await this.prisma.companyDocument.create({
      data: {
        companyId,
        type: dto.type,
        title: dto.title,
        fileKey: key,
        fileSize: file.size,
        mimeType: file.mimetype,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes || null,
      },
    });

    await this.audit.log({
      zoneId: company.zoneId,
      userId: uploadedBy,
      targetId: companyId,
      targetType: 'CompanyDocument',
      action: 'COMPANY_DOCUMENT_UPLOADED',
      metadata: { documentType: dto.type, title: dto.title },
    });

    return doc;
  }

  async verifyDocument(
    documentId: string,
    isVerified: boolean,
    verifiedBy: string,
    notes?: string,
  ) {
    const doc = await this.prisma.companyDocument.findUnique({
      where: { id: documentId },
      include: { company: true },
    });
    if (!doc) throw new AppException('DOCUMENT_NOT_FOUND');

    return this.prisma.companyDocument.update({
      where: { id: documentId },
      data: {
        isVerified,
        verifiedBy,
        verifiedAt: new Date(),
        notes: notes || undefined,
      },
    });
  }

  async getDocuments(
    companyId: string,
    filter?: { type?: string; isVerified?: boolean },
  ) {
    const where: Prisma.CompanyDocumentWhereInput = { companyId };
    if (filter?.type) where.type = filter.type as any;
    if (filter?.isVerified !== undefined) where.isVerified = filter.isVerified;
    return this.prisma.companyDocument.findMany({ where });
  }

  async getExpiringDocuments(zoneId: string, withinDays: number) {
    const cutoff = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
    return this.prisma.companyDocument.findMany({
      where: {
        expiresAt: { lte: cutoff, gt: new Date() },
        company: { zoneId, deletedAt: null },
      },
      include: { company: true },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CONTACTS
  // ══════════════════════════════════════════════════════════════════════════

  async addContact(companyId: string, dto: CreateContactDto) {
    return this.prisma.companyContact.create({
      data: { companyId, ...dto },
    });
  }

  async updateContact(contactId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.companyContact.findUnique({ where: { id: contactId } });
    if (!contact) throw new AppException('CONTACT_NOT_FOUND');
    return this.prisma.companyContact.update({
      where: { id: contactId },
      data: dto as any,
    });
  }

  async deleteContact(contactId: string) {
    await this.prisma.companyContact.delete({ where: { id: contactId } });
  }

  async getContacts(companyId: string) {
    return this.prisma.companyContact.findMany({ where: { companyId } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEALTH SCORE
  // ══════════════════════════════════════════════════════════════════════════

  async computeHealthScore(companyId: string) {
    const company = await this.findById(companyId);

    // Financial score (25 pts)
    let financialScore = 0;
    if (company.creditLimit > BigInt(0)) {
      const utilization = Number(company.creditUsed) / Number(company.creditLimit);
      if (utilization < 0.7) financialScore += 10;
      else if (utilization < 0.9) financialScore += 5;
    }
    financialScore += 15; // No overdue payments (simplified)

    // HSE score (25 pts) - simplified
    let hseScore = 20; // Default assuming no incidents
    const recentIncidents = 0; // Would query HSE module
    if (recentIncidents === 0) hseScore = 25;
    else if (recentIncidents < 2) hseScore = 15;

    // Operational score (25 pts)
    let operationalScore = 15;
    if (company.isActive) operationalScore += 10;
    if ((company.employeeCount || 0) > 10) operationalScore += 5;
    operationalScore = Math.min(operationalScore, 25);

    // Compliance score (25 pts)
    let complianceScore = 0;
    const requiredDocs = await this.prisma.companyDocument.count({
      where: { companyId },
    });
    if (requiredDocs >= 5) complianceScore += 10;
    const expiredDocs = await this.prisma.companyDocument.count({
      where: { companyId, expiresAt: { lt: new Date() } },
    });
    if (expiredDocs === 0) complianceScore += 10;
    const verifiedDocs = await this.prisma.companyDocument.count({
      where: { companyId, isVerified: true },
    });
    if (verifiedDocs > 0) complianceScore += 5;
    complianceScore = Math.min(complianceScore, 25);

    const totalScore = financialScore + hseScore + operationalScore + complianceScore;

    const factors = {
      hasActiveLease: company.plotId !== null,
      hasOverduePayments: false,
      lastHseIncidentDays: 120,
      permitExpiryDays: 45,
      documentExpiredCount: expiredDocs,
    };

    const healthRecord = await this.prisma.companyHealthScore.create({
      data: {
        companyId,
        score: totalScore,
        financialScore,
        hseScore,
        operationalScore,
        complianceScore,
        factors,
      },
    });

    // Update company
    const oldScore = company.healthScore;
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        healthScore: totalScore,
        riskLevel: totalScore < 40 ? 'HIGH' : totalScore < 60 ? 'MEDIUM' : 'LOW',
      },
    });

    // Audit
    await this.audit.log({
      zoneId: company.zoneId,
      targetId: companyId,
      targetType: 'Company',
      action: 'COMPANY_HEALTH_COMPUTED',
      metadata: { score: totalScore, oldScore },
    });

    // If score dropped > 15 points, notify zone manager
    if (oldScore && totalScore < oldScore - 15) {
      this.gateway.emitToZone(company.zoneId, 'company:health:alert', {
        companyId,
        companyName: company.nameFa,
        oldScore,
        newScore: totalScore,
        timestamp: new Date().toISOString(),
      });
    }

    return healthRecord;
  }

  async getHealthScoreHistory(companyId: string, months?: number) {
    const since = months
      ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000)
      : undefined;

    return this.prisma.companyHealthScore.findMany({
      where: {
        companyId,
        ...(since && { computedAt: { gte: since } }),
      },
      orderBy: { computedAt: 'desc' },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BULLMQ WORKERS
  // ══════════════════════════════════════════════════════════════════════════

  private registerBullWorkers(): void {
    this.bull.registerWorker('zone-operations', async (job) => {
      switch (job.name) {
        case 'compute-health-scores':
          if ((job.data as any).companyId) {
            await this.computeHealthScore((job.data as any).companyId);
          } else {
            // Compute for all active companies
            const companies = await this.prisma.company.findMany({
              where: { isActive: true, deletedAt: null },
              select: { id: true },
            });
            for (const c of companies) {
              try {
                await this.computeHealthScore(c.id);
              } catch (err) {
                this.logger.error(`Health score failed for ${c.id}: ${err}`);
              }
            }
          }
          break;

        case 'check-expiring-documents': {
          const zones = await this.prisma.zone.findMany({
            where: { status: 'ACTIVE', deletedAt: null },
          });
          for (const zone of zones) {
            const docs = await this.getExpiringDocuments(zone.id, 30);
            for (const doc of docs) {
              const daysLeft = Math.ceil(
                (doc.expiresAt!.getTime() - Date.now()) / (24 * 60 * 60 * 1000),
              );
              if ([30, 14, 7, 1].includes(daysLeft)) {
                // Notify company admin
                const admins = await this.prisma.user.findMany({
                  where: { companyId: doc.companyId, role: 'COMPANY_ADMIN', status: 'ACTIVE' },
                });
                for (const admin of admins) {
                  await this.prisma.notification.create({
                    data: {
                      recipientId: admin.id,
                      zoneId: zone.id,
                      module: 'COMPANY',
                      eventType: 'document.expiring',
                      priority: daysLeft <= 7 ? 'HIGH' : 'NORMAL',
                      title: 'Document Expiring',
                      titleFa: 'سند در حال انقضا',
                      body: `سند "${doc.title}" ${daysLeft} روز دیگر منقضی می‌شود.`,
                      bodyFa: `سند "${doc.title}" ${daysLeft} روز دیگر منقضی می‌شود.`,
                      entityType: 'DOCUMENT',
                      entityId: doc.id,
                      metadata: { documentId: doc.id, daysLeft },
                    },
                  });
                }
              }
            }
          }
          break;
        }

        case 'check-onboarding-overdue': {
          const overdueSteps = await this.prisma.onboardingStep.findMany({
            where: {
              status: 'IN_PROGRESS',
              startedAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
            },
            include: { company: true },
          });
          for (const step of overdueSteps) {
            if (step.company.zoneId) {
              this.gateway.emitToZone(step.company.zoneId, 'onboarding:overdue', {
                companyId: step.companyId,
                companyName: step.company.nameFa,
                stepName: step.stepName,
                daysOverdue: Math.floor(
                  (Date.now() - step.startedAt!.getTime()) / (24 * 60 * 60 * 1000),
                ),
              });
            }
          }
          break;
        }
      }
    });
  }
}
