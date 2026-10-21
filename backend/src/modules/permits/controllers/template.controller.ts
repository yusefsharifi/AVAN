import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { PermitTemplateService } from '../services/permit-template.service';

@ApiTags('Permit Templates')
@ApiBearerAuth()
@Controller('/permit-templates')
@UseGuards(JwtGuard, RolesGuard, ZoneGuard, PermissionsGuard)
export class TemplateController {
  constructor(private readonly templateService: PermitTemplateService) {}

  @Get()
  @RequirePermission('permits.template.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'List zone templates' })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.templateService.getZoneTemplates(zoneId);
    return { success: true, data };
  }

  @Get(':type/default')
  @RequirePermission('permits.template.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get default template for permit type' })
  async getDefault(
    @Param('type') type: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.templateService.getTemplate(type as any, zoneId);
    return { success: true, data };
  }

  @Post()
  @RequirePermission('permits.template.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create custom template' })
  async create(
    @Body() dto: any,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.templateService.createCustomTemplate(zoneId, dto, userId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('permits.template.list.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update template' })
  async update(
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    const data = await this.templateService.updateTemplate(id, dto);
    return { success: true, data };
  }
}
