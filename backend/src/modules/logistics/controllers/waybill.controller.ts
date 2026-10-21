import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WaybillService } from '../services/waybill.service';
import { CreateWaybillDto } from '../dto/create-waybill.dto';
import { ApproveWaybillStepDto } from '../dto/approve-waybill-step.dto';
import { FilterWaybillsDto } from '../dto/filter-waybills.dto';

@ApiTags('Waybills')
@ApiBearerAuth()
@Controller('/waybills')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class WaybillController {
  constructor(private readonly waybillService: WaybillService) {}

  @Post()
  @RequirePermission('logistics.waybill.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Create a new waybill' })
  async create(@Body() dto: CreateWaybillDto, @CurrentUser('sub') userId: string) {
    const data = await this.waybillService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List waybills with filtering' })
  async findAll(@Query() filter: FilterWaybillsDto) {
    const result = await this.waybillService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('pending-approvals')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  async getPendingApprovals(
    @CurrentUser('sub') userId: string,
    @Query('zoneId') zoneId: string,
  ) {
    const data = await this.waybillService.getPendingApprovals(userId, zoneId);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get waybill statistics' })
  async getStats(@Query('zoneId') zoneId: string, @Query('period') period?: string) {
    const data = await this.waybillService.getWaybillStats(zoneId, period);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get waybill detail' })
  async findById(@Param('id') id: string) {
    const data = await this.waybillService.findById(id);
    return { success: true, data };
  }

  @Patch(':id/approve')
  @RequirePermission('logistics.waybill.list.update')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Approve or reject a waybill step' })
  async approveStep(
    @Param('id') id: string,
    @Body() dto: ApproveWaybillStepDto,
    @CurrentUser('sub') userId: string,
    @Query('zoneId') zoneId: string,
  ) {
    dto.waybillId = id;
    const data = await this.waybillService.approveStep(dto, userId, zoneId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Cancel a waybill' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.waybillService.cancel(id, reason, userId);
    return { success: true, data };
  }

  @Get(':id/tracking')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get shipment tracking timeline' })
  async getTracking(@Param('id') id: string) {
    const data = await this.waybillService.getTrackingTimeline(id);
    return { success: true, data };
  }

  @Post(':id/attachments')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Upload attachment to waybill' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @Body('type') type: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.waybillService.uploadAttachment(id, type, file, userId);
    return { success: true, data };
  }

  @Get(':id/qr-code')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Get QR code for waybill' })
  async getQrCode(@Param('id') id: string) {
    const data = await this.waybillService.generateQrCode(id);
    return { success: true, data };
  }

  @Get(':id/receipt')
  @RequirePermission('logistics.waybill.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Download receipt PDF' })
  async getReceipt(@Param('id') id: string) {
    const data = await this.waybillService.generateReceipt(id);
    return { success: true, data };
  }

  @Post(':id/mark-arrived')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('GUARD')
  @ApiOperation({ summary: 'Mark truck arrived at gate' })
  async markArrived(
    @Param('id') id: string,
    @Body('gateId') gateId: string,
    @Body('trafficLogId') trafficLogId: string,
  ) {
    const data = await this.waybillService.markTruckArrived(id, gateId, trafficLogId);
    return { success: true, data };
  }

  @Post(':id/mark-at-dock')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Mark waybill at dock' })
  async markAtDock(
    @Param('id') id: string,
    @Body('dockCode') dockCode: string,
  ) {
    const data = await this.waybillService.markAtDock(id, dockCode);
    return { success: true, data };
  }

  @Post(':id/mark-in-progress')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Mark loading started' })
  async markInProgress(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.waybillService.markInProgress(id, userId);
    return { success: true, data };
  }

  @Post(':id/mark-completed')
  @RequirePermission('logistics.waybill.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Mark waybill completed' })
  async markCompleted(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.waybillService.markCompleted(id, userId);
    return { success: true, data };
  }
}
