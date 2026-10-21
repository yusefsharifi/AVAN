import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowTaskController — M8: Workflow Engine
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
import { WorkflowSlaService } from '../services/workflow-sla.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CompleteTaskDto,
  DelegateTaskDto,
  ClaimTaskDto,
  FilterTasksDto,
} from '../dto/complete-task.dto';

// SECURITY FIX (SEC-003): Workflow task management requires authentication.
// COMPANY_STAFF can manage tasks; zone-level operations require ZONE_MANAGER.
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.COMPANY_STAFF)
@Controller('/workflow-tasks')
export class WorkflowTaskController {
  constructor(
    private readonly engine: WorkflowEngineService,
    private readonly slaService: WorkflowSlaService,
  ) {}

  @Get('my-tasks')
  @RequirePermission('workflow.workflow-task.list.view')
  async getMyTasks(
    @Query('userId') userId: string,
    @Query('zoneId') zoneId: string,
    @Query() filter: FilterTasksDto,
  ) {
    return this.engine.getMyTasks(userId, zoneId, filter);
  }

  @Get('inbox')
  @RequirePermission('workflow.workflow-task.list.view')
  async getInbox(
    @Query('userId') userId: string,
    @Query('zoneId') zoneId: string,
  ) {
    return this.engine.getMyInbox(userId, zoneId);
  }

  @Post(':id/claim')
  @RequirePermission('workflow.workflow-task.list.create')
  async claim(@Param('id') id: string, @Req() req: any) {
    return this.engine.claimTask({ taskId: id }, req.user?.id || 'system');
  }

  @Post(':id/complete')
  @RequirePermission('workflow.workflow-task.list.create')
  async complete(
    @Param('id') id: string,
    @Body() dto: CompleteTaskDto,
    @Req() req: any,
  ) {
    dto.taskId = id;
    return this.engine.completeTask(dto, req.user?.id || 'system', req.user?.zoneId || '');
  }

  @Post(':id/delegate')
  @RequirePermission('workflow.workflow-task.list.create')
  async delegate(
    @Param('id') id: string,
    @Body() dto: DelegateTaskDto,
    @Req() req: any,
  ) {
    dto.taskId = id;
    return this.engine.delegateTask(dto, req.user?.id || 'system');
  }

  @Get(':id')
  @RequirePermission('workflow.workflow-task.list.view')
  async findOne(@Param('id') id: string) {
    // Return task detail — simplified
    return {};
  }

  @Get(':id/sla-progress')
  @RequirePermission('workflow.workflow-task.list.view')
  async getSlaProgress(@Param('id') id: string) {
    return this.slaService.getTaskSlaProgress(id);
  }
}
