import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreatePerformanceReviewDto } from '../dto/create-dtos';
import type { PaginatedResult, TeamPerformanceDto } from '../dto/enums';
import { HrGatewayService } from './hr-gateway.service';
import { computeOverallScore } from '../utils/hr.utils';

@Injectable()
export class PerformanceReviewService {
  private readonly logger = new Logger(PerformanceReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly gateway: HrGatewayService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE
  // ═══════════════════════════════════════════════════════════════════════════

  async create(dto: CreatePerformanceReviewDto, createdBy: string): Promise<any> {
    const employee = await this.prisma.employee.findUnique({ where: { id: dto.employeeId } });
    if (!employee) throw new AppException('EMPLOYEE_NOT_FOUND');

    // Compute overall score
    const { overallScore, overallRating } = computeOverallScore({
      quality: dto.qualityScore,
      attendance: dto.attendanceScore,
      initiative: dto.initiativeScore,
      teamwork: dto.teamworkScore,
      communication: dto.communicationScore,
      technical: dto.technicalScore,
    });

    const review = await this.prisma.performanceReview.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        employeeId: dto.employeeId,
        reviewerId: createdBy,
        reviewerName: '', // Will be set by caller
        period: dto.period,
        type: dto.type,
        qualityScore: dto.qualityScore,
        attendanceScore: dto.attendanceScore,
        initiativeScore: dto.initiativeScore,
        teamworkScore: dto.teamworkScore,
        communicationScore: dto.communicationScore,
        technicalScore: dto.technicalScore,
        overallScore,
        overallRating: overallRating as any,
        strengths: dto.strengths,
        areasForImprovement: dto.areasForImprovement,
        goals: dto.goals,
        developmentPlan: dto.developmentPlan,
        status: 'DRAFT',
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      action: 'REVIEW_CREATED',
      targetType: 'PerformanceReview',
      targetId: review.id,
      userId: createdBy,
      metadata: { employeeId: dto.employeeId, period: dto.period, overallRating },
    });

    return review;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SUBMIT
  // ═══════════════════════════════════════════════════════════════════════════

  async submit(id: string, submittedBy: string): Promise<any> {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new AppException('REVIEW_NOT_FOUND');
    if (review.status !== 'DRAFT') throw new AppException('REVIEW_NOT_SUBMITTED');

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
    });

    // Notify employee
    this.gateway.emitReviewSubmitted({
      employeeId: review.employeeId,
      reviewId: id,
      period: review.period,
      reviewerName: review.reviewerName,
      overallRating: review.overallRating || 'MEETS',
    });

    await this.audit.log({
      zoneId: review.zoneId,
      action: 'REVIEW_SUBMITTED',
      targetType: 'PerformanceReview',
      targetId: id,
      userId: submittedBy,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE ACKNOWLEDGE
  // ═══════════════════════════════════════════════════════════════════════════

  async employeeAcknowledge(id: string, comment: string, employeeId: string): Promise<any> {
    const review = await this.prisma.performanceReview.findUnique({ where: { id } });
    if (!review) throw new AppException('REVIEW_NOT_FOUND');
    if (review.employeeId !== employeeId) throw new AppException('REVIEW_NOT_FOUND');
    if (review.status !== 'SUBMITTED') throw new AppException('REVIEW_NOT_SUBMITTED');

    const updated = await this.prisma.performanceReview.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        employeeAck: true,
        employeeComment: comment,
        employeeAckAt: new Date(),
      },
    });

    await this.audit.log({
      zoneId: review.zoneId,
      action: 'REVIEW_ACKNOWLEDGED',
      targetType: 'PerformanceReview',
      targetId: id,
      userId: employeeId,
    });

    return updated;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTE OVERALL SCORE
  // ═══════════════════════════════════════════════════════════════════════════

  computeOverallScore(dto: CreatePerformanceReviewDto): {
    overallScore: number;
    overallRating: string;
  } {
    return computeOverallScore({
      quality: dto.qualityScore,
      attendance: dto.attendanceScore,
      initiative: dto.initiativeScore,
      teamwork: dto.teamworkScore,
      communication: dto.communicationScore,
      technical: dto.technicalScore,
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERIES
  // ═══════════════════════════════════════════════════════════════════════════

  async findAll(companyId: string, filter: any): Promise<PaginatedResult<any>> {
    const where: any = { companyId };
    if (filter.period) where.period = filter.period;
    if (filter.status) where.status = filter.status;
    if (filter.employeeId) where.employeeId = filter.employeeId;

    const limit = filter.limit || 20;

    const [data, total] = await Promise.all([
      this.prisma.performanceReview.findMany({
        where,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
      }),
      this.prisma.performanceReview.count({ where }),
    ]);

    return {
      data,
      meta: { total, hasMore: data.length === limit, cursor: data.length === limit ? data[data.length - 1].id : undefined },
    };
  }

  async findById(id: string): Promise<any> {
    const review = await this.prisma.performanceReview.findUnique({
      where: { id },
      include: { employee: { select: { firstNameFa: true, lastNameFa: true, employeeNumber: true } } },
    });
    if (!review) throw new AppException('REVIEW_NOT_FOUND');
    return review;
  }

  async getEmployeeReviewHistory(employeeId: string): Promise<any[]> {
    return this.prisma.performanceReview.findMany({
      where: { employeeId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTeamPerformance(departmentId: string, period: string): Promise<TeamPerformanceDto> {
    const department = await this.prisma.department.findUnique({ where: { id: departmentId } });
    if (!department) throw new AppException('DEPARTMENT_NOT_FOUND');

    const employees = await this.prisma.employee.findMany({
      where: { departmentId, status: 'ACTIVE', deletedAt: null },
      select: { id: true, firstNameFa: true, lastNameFa: true },
    });

    const reviews = await this.prisma.performanceReview.findMany({
      where: {
        employeeId: { in: employees.map((e) => e.id) },
        period,
      },
    });

    // Compute averages
    const scores = {
      quality: 0, attendance: 0, initiative: 0,
      teamwork: 0, communication: 0, technical: 0, overall: 0,
    };
    let count = 0;

    for (const review of reviews) {
      if (review.qualityScore) scores.quality += Number(review.qualityScore);
      if (review.attendanceScore) scores.attendance += Number(review.attendanceScore);
      if (review.initiativeScore) scores.initiative += Number(review.initiativeScore);
      if (review.teamworkScore) scores.teamwork += Number(review.teamworkScore);
      if (review.communicationScore) scores.communication += Number(review.communicationScore);
      if (review.technicalScore) scores.technical += Number(review.technicalScore);
      if (review.overallScore) scores.overall += Number(review.overallScore);
      count++;
    }

    const avgScores = {
      quality: count > 0 ? Math.round(scores.quality / count * 100) / 100 : 0,
      attendance: count > 0 ? Math.round(scores.attendance / count * 100) / 100 : 0,
      initiative: count > 0 ? Math.round(scores.initiative / count * 100) / 100 : 0,
      teamwork: count > 0 ? Math.round(scores.teamwork / count * 100) / 100 : 0,
      communication: count > 0 ? Math.round(scores.communication / count * 100) / 100 : 0,
      technical: count > 0 ? Math.round(scores.technical / count * 100) / 100 : 0,
      overall: count > 0 ? Math.round(scores.overall / count * 100) / 100 : 0,
    };

    // Top performers
    const topPerformers = reviews
      .filter((r) => r.overallScore)
      .sort((a, b) => Number(b.overallScore || 0) - Number(a.overallScore || 0))
      .slice(0, 5)
      .map((r) => {
        const emp = employees.find((e) => e.id === r.employeeId);
        return {
          employeeId: r.employeeId,
          name: emp ? `${emp.firstNameFa} ${emp.lastNameFa}` : '',
          overallScore: Number(r.overallScore || 0),
        };
      });

    return {
      departmentId,
      departmentName: department.nameFa,
      period,
      averageScores: avgScores,
      employeeCount: employees.length,
      topPerformers,
    };
  }
}
