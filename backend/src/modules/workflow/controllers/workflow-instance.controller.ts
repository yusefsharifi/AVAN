import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowInstanceController — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { WorkflowEngineService } from '../services/workflow-engine.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { StartWorkflowInstanceDto, FilterInstancesDto } from '../dto/start-instance.dto';
import { successResponse } from '../../../common/dto/response.dto';

// SECURITY FIX (SEC-003): Workflow instance management requires authentication
// and at least ZONE_MANAGER role.
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ZONE_MANAGER)
@Controller('/workflow-instances')
export class WorkflowInstanceController {
  constructor(private readonly engine: WorkflowEngineService) {}

  @Post('start')
  @RequirePermission('workflow.workflow-instance.list.create')
  async start(@Body() dto: StartWorkflowInstanceDto) {
    return this.engine.startInstance(dto);
  }

  // SECURITY FIX (COMP-006): Now queries the database instead of returning [].
  @Get()
  @RequirePermission('workflow.workflow-instance.list.view')
  async findAll(@Query() filter: FilterInstancesDto) {
    return successResponse(
      await this.engine.findInstances({
        zoneId: filter.zoneId,
        status: filter.status,
        definitionCode: filter.definitionCode,
        entityType: filter.entityType,
      }),
    );
  }

  @Get('dashboard')
  @RequirePermission('workflow.workflow-instance.list.view')
  async dashboard(@Query('zoneId') zoneId: string) {
    return this.engine.getZoneWorkflowDashboard(zoneId);
  }

  @Get('by-entity')
  @RequirePermission('workflow.workflow-instance.list.view')
  async findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    return this.engine.getInstanceByEntity(entityType, entityId);
  }

  @Get(':id')
  @RequirePermission('workflow.workflow-instance.list.view')
  async findOne(@Param('id') id: string) {
    return this.engine.getInstanceStatus(id);
  }

  @Get(':id/history')
  @RequirePermission('workflow.workflow-instance.list.view')
  async getHistory(@Param('id') id: string) {
    return this.engine.getInstanceHistory(id);
  }

  @Post(':id/pause')
  @RequirePermission('workflow.workflow-instance.list.create')
  async pause(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.engine.pauseInstance(id, body.reason, req.user?.id || 'system');
  }

  @Post(':id/resume')
  @RequirePermission('workflow.workflow-instance.list.create')
  async resume(@Param('id') id: string, @Req() req: any) {
    return this.engine.resumeInstance(id, req.user?.id || 'system');
  }

  @Post(':id/terminate')
  @RequirePermission('workflow.workflow-instance.list.create')
  async terminate(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.engine.terminateInstance(id, body.reason, req.user?.id || 'system');
  }

  @Get(':id/metrics')
  @RequirePermission('workflow.workflow-instance.list.view')
  async getMetrics(
    @Param('id') id: string,
    @Query('zoneId') zoneId: string,
    @Query('definitionCode') definitionCode: string,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
  ) {
    return this.engine.getWorkflowMetrics(zoneId, definitionCode, fromDate, toDate);
  }
}
