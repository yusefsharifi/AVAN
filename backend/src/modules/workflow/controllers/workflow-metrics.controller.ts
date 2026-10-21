import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowMetricsController — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';

// SECURITY FIX (SEC-003): Workflow metrics require authentication.
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ZONE_MANAGER)
@Controller('/workflow-metrics')
export class WorkflowMetricsController {
  constructor(private readonly engine: WorkflowEngineService) {}

  @Get()
  @RequirePermission('workflow.workflow-metrics.list.view')
  async getMetrics(
    @Query('zoneId') zoneId: string,
    @Query('definitionCode') definitionCode: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.engine.getWorkflowMetrics(zoneId, definitionCode, fromDate, toDate);
  }

  @Post('snapshot')
  @RequirePermission('workflow.workflow-metrics.list.create')
  async computeSnapshot(
    @Query('zoneId') zoneId: string,
    @Query('definitionCode') definitionCode: string,
    @Query('period') period: string,
  ) {
    return this.engine.computeAndSaveMetricSnapshot(zoneId, definitionCode, period);
  }
}
