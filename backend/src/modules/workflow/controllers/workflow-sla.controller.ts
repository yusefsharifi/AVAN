import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowSlaController — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { WorkflowSlaService } from '../services/workflow-sla.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UpdateSlaConfigDto } from '../dto/sla-config.dto';

// SECURITY FIX (SEC-003): Workflow SLA management requires authentication.
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ZONE_MANAGER)
@Controller('/workflow-sla')
export class WorkflowSlaController {
  constructor(private readonly slaService: WorkflowSlaService) {}

  @Get('report')
  @RequirePermission('workflow.workflow-sla.list.view')
  async getReport(
    @Query('zoneId') zoneId: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.slaService.getZoneSlaReport(zoneId, fromDate, toDate);
  }

  @Get('config/:code/:stepId')
  @RequirePermission('workflow.workflow-sla.list.view')
  async getConfig(
    @Param('code') code: string,
    @Param('stepId') stepId: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.slaService.getSlaConfig(code, stepId, zoneId);
  }

  @Put('config')
  @RequirePermission('workflow.workflow-sla.list.update')
  async updateConfig(@Body() dto: UpdateSlaConfigDto, @Req() req: any) {
    return this.slaService.updateSlaConfig(dto, req.user?.id || 'system');
  }
}
