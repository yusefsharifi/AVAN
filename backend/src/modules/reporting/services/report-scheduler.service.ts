// M18: Reporting & BI — Report Scheduler Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { ReportEngineService } from './report-engine.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { ERROR_CODES } from '../../../common/constants/error-codes';
import { CreateReportScheduleDto } from '../dto/create-dtos';
import { ExecutionStatus } from '@prisma/client';
import { computeCronExpression, computeNextRunAt } from '../utils/reporting.utils';

@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly reportEngine: ReportEngineService,
  ) {}

  async createSchedule(
    dto: CreateReportScheduleDto,
    createdBy: string,
  ): Promise<any> {
    const report = await this.prisma.reportDefinition.findUnique({
      where: { code: dto.reportCode },
    });
    if (!report) {
      throw new AppException('REPORT_NOT_FOUND');
    }

    const cronExpression = dto.cronExpression || computeCronExpression(dto.frequency);
    const nextRunAt = computeNextRunAt(cronExpression);

    const schedule = await this.prisma.reportSchedule.create({
      data: {
        reportId: report.id,
        zoneId: report.zoneId,
        frequency: dto.frequency,
        cronExpression,
        parameters: (dto.parameters || {}) as any,
        deliveryChannels: dto.deliveryChannels,
        emailRecipients: dto.emailRecipients || [],
        smsRecipients: dto.smsRecipients || [],
        inAppRecipients: dto.inAppRecipients || [],
        exportFormat: dto.exportFormat || 'XLSX',
        nextRunAt,
        createdBy,
      },
    });

    this.logger.log(
      `Created schedule ${schedule.id} for report ${dto.reportCode}, next run: ${nextRunAt.toISOString()}`,
    );

    return schedule;
  }

  async executeSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
      include: { report: true },
    });
    if (!schedule || !schedule.isActive) return;

    this.logger.log(`Executing schedule ${scheduleId} for report ${schedule.report.code}`);

    try {
      const result = await this.reportEngine.runReport(
        {
          reportCode: schedule.report.code,
          parameters: schedule.parameters as any,
          exportFormat: schedule.exportFormat as any,
          returnData: false,
        },
        'system',
        schedule.zoneId || undefined,
      );

      // Update schedule
      const nextRunAt = computeNextRunAt(schedule.cronExpression);
      await this.prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: {
          lastRunAt: new Date(),
          nextRunAt,
          runCount: { increment: 1 },
        },
      });

      // Create execution linked to schedule
      if (result.executionId) {
        await this.prisma.reportExecution.update({
          where: { id: result.executionId },
          data: { scheduleId },
        });
      }
    } catch (error) {
      this.logger.error(`Schedule ${scheduleId} execution failed: ${error}`);
      await this.prisma.reportSchedule.update({
        where: { id: scheduleId },
        data: { failureCount: { increment: 1 } },
      });
    }
  }

  async pauseSchedule(scheduleId: string): Promise<any> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new AppException('SCHEDULE_NOT_FOUND');
    }
    if (!schedule.isActive) {
      throw new AppException('SCHEDULE_ALREADY_PAUSED');
    }
    return this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { isActive: false },
    });
  }

  async resumeSchedule(scheduleId: string): Promise<any> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new AppException('SCHEDULE_NOT_FOUND');
    }
    if (schedule.isActive) {
      throw new AppException('SCHEDULE_ALREADY_ACTIVE');
    }
    const nextRunAt = computeNextRunAt(schedule.cronExpression);
    return this.prisma.reportSchedule.update({
      where: { id: scheduleId },
      data: { isActive: true, nextRunAt },
    });
  }

  async getSchedules(reportCode?: string): Promise<any[]> {
    const where = reportCode
      ? { report: { code: reportCode } }
      : {};
    return this.prisma.reportSchedule.findMany({
      where,
      include: { report: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteSchedule(scheduleId: string): Promise<void> {
    const schedule = await this.prisma.reportSchedule.findUnique({
      where: { id: scheduleId },
    });
    if (!schedule) {
      throw new AppException('SCHEDULE_NOT_FOUND');
    }
    await this.prisma.reportSchedule.delete({ where: { id: scheduleId } });
  }
}
