import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// M7: Template Controller — Letter Template Management
// ═══════════════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Patch, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { LetterTemplateService } from '../services/letter-template.service';
import { CreateLetterTemplateDto, UpdateLetterTemplateDto, PreviewTemplateDto } from '../dto/create-template.dto';

@Controller('/letter-templates')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class TemplateController {
  constructor(private readonly templateService: LetterTemplateService) {}

  @Get()
  @RequirePermission('correspondence.template.list.view')
  async findAll(@Query('zoneId') zoneId?: string, @Query('category') category?: string) {
    return this.templateService.findAll(zoneId, category);
  }

  @Get('preview')
  @RequirePermission('correspondence.template.list.view')
  async preview(@Query('code') code: string, @Query('zoneId') zoneId: string, @Query('variables') variables?: string) {
    const vars = variables ? JSON.parse(variables) : {};
    return this.templateService.previewTemplate(code, vars, zoneId);
  }

  @Get(':code')
  @RequirePermission('correspondence.template.list.view')
  async findByCode(@Param('code') code: string, @Query('zoneId') zoneId?: string) {
    return this.templateService.findByCode(code, zoneId);
  }

  @Post()
  @RequirePermission('correspondence.template.list.create')
  async create(@Body() dto: CreateLetterTemplateDto, @Req() req: any) {
    return this.templateService.create(dto, req.user?.id || 'SYSTEM');
  }

  @Patch(':id')
  @RequirePermission('correspondence.template.list.update')
  async update(@Param('id') id: string, @Body() dto: UpdateLetterTemplateDto) {
    return this.templateService.update(id, dto);
  }

  @Post('seed')
  @RequirePermission('correspondence.template.list.create')
  async seed(@Query('zoneId') zoneId?: string) {
    return this.templateService.seedDefaultTemplates(zoneId);
  }
}
