import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { ProformaService } from '../services/proforma.service';
import {
  CreateProformaDto,
  SubmitProformaApprovalDto,
  ApproveProformaStepDto,
  RecordPartyResponseDto,
  ReviseProformaDto,
  FilterProformaDto,
} from '../dto/create-dtos';

@ApiTags('Commercial - Proforma')
@ApiBearerAuth()
@Controller('/commercial/proformas')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ProformaController {
  constructor(private readonly proformaService: ProformaService) {}

  @Post()
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create proforma' })
  async create(@Body() dto: CreateProformaDto, @CurrentUser('sub') userId: string) {
    const data = await this.proformaService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('commercial.proforma.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List proformas' })
  async findAll(@Query() filter: FilterProformaDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    const result = await this.proformaService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('dashboard')
  @RequirePermission('commercial.proforma.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Proforma dashboard stats' })
  async getDashboard(@ZoneId() zoneId: string, @CurrentUser('companyId') companyId?: string) {
    const data = await this.proformaService.getDashboardStats(zoneId, companyId);
    return { success: true, data };
  }

  @Get('expiring')
  @RequirePermission('commercial.proforma.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get expiring proformas' })
  async getExpiring(@ZoneId() zoneId: string, @Query('withinDays') withinDays?: number) {
    const data = await this.proformaService.getExpiringProformas(zoneId, withinDays || 7);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('commercial.proforma.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get proforma by ID' })
  async findById(@Param('id') id: string) {
    const data = await this.proformaService.findById(id);
    return { success: true, data };
  }

  @Post(':id/submit-approval')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Submit for approval' })
  async submitApproval(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.proformaService.submitForApproval({ proformaId: id }, userId);
    return { success: true, data };
  }

  @Patch(':id/approve')
  @RequirePermission('commercial.proforma.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Approve a step' })
  async approveStep(
    @Param('id') id: string,
    @Body() dto: ApproveProformaStepDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    dto.proformaId = id;
    const data = await this.proformaService.approveStep(dto, userId, zoneId);
    return { success: true, data };
  }

  @Post(':id/send-to-party')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Mark sent to party' })
  async sendToParty(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.proformaService.markSentToParty(id, userId);
    return { success: true, data };
  }

  @Post(':id/party-response')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Record party response' })
  async recordResponse(
    @Param('id') id: string,
    @Body() dto: RecordPartyResponseDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.proformaService.recordPartyResponse(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/revise')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create new version' })
  async revise(
    @Param('id') id: string,
    @Body() dto: ReviseProformaDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.proformaService.revise(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/convert-to-order')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Convert to order' })
  async convertToOrder(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.proformaService.convertToOrder(id, userId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Cancel proforma' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.proformaService.cancel(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/attachments')
  @RequirePermission('commercial.proforma.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment' })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.proformaService.uploadAttachment(id, file, userId);
    return { success: true, data };
  }

  @Get(':id/versions')
  @RequirePermission('commercial.proforma.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Version history' })
  async getVersions(@Param('id') id: string) {
    const data = await this.proformaService.getVersions(id);
    return { success: true, data };
  }
}
