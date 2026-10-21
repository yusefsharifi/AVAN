import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowDefinitionController — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { WorkflowCategory, UserRole } from '@prisma/client';
import { WorkflowDefinitionService } from '../services/workflow-definition.service';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import {
  CreateWorkflowDefinitionDto,
  UpdateWorkflowDefinitionDto,
  DuplicateDefinitionDto,
} from '../dto/create-definition.dto';
import { successResponse } from '../../../common/dto/response.dto';

// SECURITY FIX (SEC-003): Workflow definition management requires authentication
// and at least ZONE_MANAGER role. This prevents unauthorized workflow injection.
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ZONE_MANAGER)
@Controller('/workflow-definitions')
export class WorkflowDefinitionController {
  constructor(private readonly service: WorkflowDefinitionService) {}

  @Post()
  @RequirePermission('workflow.workflow-definition.list.create')
  async create(@Body() dto: CreateWorkflowDefinitionDto, @Req() req: any) {
    return this.service.create(dto, req.user?.id || 'system');
  }

  @Get()
  @RequirePermission('workflow.workflow-definition.list.view')
  async findAll(
    @Query('zoneId') zoneId?: string,
    @Query('category') category?: WorkflowCategory,
  ) {
    return successResponse(await this.service.findAll(zoneId, category));
  }

  @Post('validate')
  @RequirePermission('workflow.workflow-definition.list.create')
  async validate(@Body() body: { definition: any }) {
    return this.service.validate(body.definition);
  }

  @Post('seed')
  @RequirePermission('workflow.workflow-definition.list.create')
  async seed() {
    return this.service.seedSystemDefinitions();
  }

  @Get(':id')
  @RequirePermission('workflow.workflow-definition.list.view')
  async findOne(@Param('id') id: string) {
    return this.service.findByCode(id);
  }

  @Patch(':id')
  @RequirePermission('workflow.workflow-definition.list.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWorkflowDefinitionDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user?.id || 'system');
  }

  @Post(':id/activate')
  @RequirePermission('workflow.workflow-definition.list.create')
  async activate(@Param('id') id: string) {
    return this.service.activate(id);
  }

  @Post(':id/deactivate')
  @RequirePermission('workflow.workflow-definition.list.create')
  async deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }

  @Post(':id/duplicate')
  @RequirePermission('workflow.workflow-definition.list.create')
  async duplicate(
    @Param('id') id: string,
    @Body() dto: DuplicateDefinitionDto,
    @Req() req: any,
  ) {
    return this.service.duplicate(id, dto, req.user?.id || 'system');
  }

  @Get(':id/versions')
  @RequirePermission('workflow.workflow-definition.list.view')
  async getVersionHistory(@Param('id') id: string) {
    return this.service.getVersionHistory(id);
  }

  @Get('by-code/:code')
  @RequirePermission('workflow.workflow-definition.list.view')
  async findByCode(
    @Param('code') code: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.service.findByCode(code, zoneId);
  }
}
