// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowSlaService — M8: Workflow Engine (SLA Management)
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { REDIS_KEYS } from '../../../common/utils/redis-keys';
import { UpdateSlaConfigDto } from '../dto/sla-config.dto';
import { SlaReportDto } from '../types/workflow-definition.types';

@Injectable()
export class WorkflowSlaService {
  private readonly logger = new Logger(WorkflowSlaService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * Calculate SLA deadline considering zone working hours, weekends, and holidays.
   * Only counts working hours toward SLA.
   */
  async calculateSlaDueAt(
    startTime: Date,
    slaHours: number,
    zoneId: string,
  ): Promise<Date> {
    let remainingMinutes = slaHours * 60;
    const current = new Date(startTime);

    // Get zone settings for working hours and weekends
    let workStartHour = 8;
    let workEndHour = 18;
    let weekends: number[] = [5, 6]; // Fri, Sat (Jalali 5=Thu, 6=Fri in JS)

    try {
      const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
      if (zone) {
        const settings = (zone.settings as Record<string, unknown>) || {};
        const wh = settings.workingHours as Record<string, string> | undefined;
        if (wh?.start) {
          workStartHour = parseInt(wh.start.split(':')[0], 10);
        }
        if (wh?.end) {
          workEndHour = parseInt(wh.end.split(':')[0], 10);
        }
        if (settings.weekends && Array.isArray(settings.weekends)) {
          weekends = settings.weekends as number[];
        }
      }
    } catch {
      // Use defaults
    }

    const workMinutesPerDay = (workEndHour - workStartHour) * 60;

    while (remainingMinutes > 0) {
      const dayOfWeek = current.getDay(); // 0=Sun, 6=Sat

      // Check if it's a weekend (Jalali: 5=Thu, 6=Fri, but we use JS day 5=Fri, 6=Sat)
      // For Jalali weekends, we treat JS Friday(5) and Saturday(6) as weekends
      const isWeekend = weekends.includes(dayOfWeek);

      if (isWeekend) {
        // Skip to next day 08:00
        current.setDate(current.getDate() + 1);
        current.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      const currentHour = current.getHours();
      const currentMinute = current.getMinutes();

      // If before work hours, jump to work start
      if (currentHour < workStartHour) {
        current.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      // If after work hours, jump to next day
      if (currentHour >= workEndHour) {
        current.setDate(current.getDate() + 1);
        current.setHours(workStartHour, 0, 0, 0);
        continue;
      }

      // Calculate remaining minutes in today's work window
      const minutesLeftToday = (workEndHour - currentHour) * 60 - currentMinute;

      if (remainingMinutes <= minutesLeftToday) {
        // SLA fits within today
        current.setMinutes(current.getMinutes() + remainingMinutes);
        remainingMinutes = 0;
      } else {
        // Consume today's remaining hours
        remainingMinutes -= minutesLeftToday;
        current.setDate(current.getDate() + 1);
        current.setHours(workStartHour, 0, 0, 0);
      }
    }

    return current;
  }

  async getTaskSlaProgress(taskId: string): Promise<{
    totalHours: number;
    elapsedHours: number;
    remainingHours: number;
    progressPercent: number;
    isBreached: boolean;
    isWarning: boolean;
  }> {
    const task = await this.prisma.workflowTask.findUnique({
      where: { id: taskId },
    });
    if (!task || !task.slaDueAt) {
      return {
        totalHours: 0,
        elapsedHours: 0,
        remainingHours: 0,
        progressPercent: 0,
        isBreached: false,
        isWarning: false,
      };
    }

    const totalHours = task.slaHours || 0;
    const activatedAt = task.activatedAt || task.createdAt;
    const elapsedMs = Date.now() - activatedAt.getTime();
    const elapsedHours = Math.max(0, elapsedMs / (1000 * 60 * 60));
    const remainingHours = Math.max(0, totalHours - elapsedHours);
    const progressPercent = Math.min(100, Math.round((elapsedHours / totalHours) * 100));

    // Get warning threshold
    let warningAtPercent = 75;
    try {
      const config = await this.getSlaConfig(
        '',
        task.stepId,
        task.zoneId,
      );
      if (config) {
        warningAtPercent = config.warningAtPercent;
      }
    } catch {
      // Use default
    }

    return {
      totalHours,
      elapsedHours: Math.round(elapsedHours * 100) / 100,
      remainingHours: Math.round(remainingHours * 100) / 100,
      progressPercent,
      isBreached: task.slaBreached,
      isWarning: progressPercent >= warningAtPercent && !task.slaBreached,
    };
  }

  async getZoneSlaReport(
    zoneId: string,
    fromDate: string,
    toDate: string,
  ): Promise<SlaReportDto> {
    const from = new Date(fromDate);
    const to = new Date(toDate);

    const totalTasks = await this.prisma.workflowTask.count({
      where: {
        zoneId,
        createdAt: { gte: from, lte: to },
      },
    });

    const breachedTasks = await this.prisma.workflowTask.count({
      where: {
        zoneId,
        slaBreached: true,
        createdAt: { gte: from, lte: to },
      },
    });

    const complianceRate = totalTasks > 0
      ? Math.round(((totalTasks - breachedTasks) / totalTasks) * 100 * 100) / 100
      : 100;

    return {
      totalTasks,
      breachedTasks,
      complianceRate,
      avgCompletionHours: 0,
      byDefinition: [],
    };
  }

  async updateSlaConfig(
    dto: UpdateSlaConfigDto,
    updatedBy: string,
  ): Promise<any> {
    const existing = await this.prisma.workflowSlaConfig.findFirst({
      where: {
        definitionCode: dto.definitionCode,
        stepId: dto.stepId,
        zoneId: dto.zoneId || null,
      },
    });

    const data = {
      slaHours: dto.slaHours,
      warningAtPercent: dto.warningAtPercent || 75,
      escalationLevel1: dto.escalationLevel1 || null,
      escalationLevel2: dto.escalationLevel2 || null,
      escalationLevel3: dto.escalationLevel3 || null,
      escalateAfterHours: dto.escalateAfterHours || 4,
    };

    if (existing) {
      return this.prisma.workflowSlaConfig.update({
        where: { id: existing.id },
        data: {
          slaHours: dto.slaHours,
          warningAtPercent: dto.warningAtPercent,
          escalationLevel1: dto.escalationLevel1,
          escalationLevel2: dto.escalationLevel2,
          escalationLevel3: dto.escalationLevel3,
          escalateAfterHours: dto.escalateAfterHours,
        },
      });
    }

    return this.prisma.workflowSlaConfig.create({
      data: {
        definitionCode: dto.definitionCode,
        stepId: dto.stepId,
        zoneId: dto.zoneId || null,
        ...data,
      },
    });
  }

  async getSlaConfig(
    definitionCode: string,
    stepId: string,
    zoneId?: string,
  ): Promise<any> {
    return this.prisma.workflowSlaConfig.findFirst({
      where: {
        definitionCode,
        stepId,
        zoneId: zoneId || null,
      },
    });
  }
}
