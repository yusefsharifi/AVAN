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
import { WorkOrderService } from '../services/work-order.service';
import {
  CreateWorkOrderDto, CompleteWorkOrderDto, AssignTechnicianDto,
  FilterWorkOrdersDto, UsedPartDto,
} from '../dto/create-dtos';

@ApiTags('CMMS - Work Orders')
@ApiBearerAuth()
@Controller('/cmms/work-orders')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class WorkOrderController {
  constructor(private readonly woService: WorkOrderService) {}

  @Post()
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create work order' })
  async create(@Body() dto: CreateWorkOrderDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.create(dto, userId) };
  }

  @Get()
  @RequirePermission('cmms.work-order.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List work orders' })
  async findAll(@Query() filter: FilterWorkOrdersDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    return { success: true, ...(await this.woService.findAll(filter)) };
  }

  @Get('my-tasks')
  @RequirePermission('cmms.work-order.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'My assigned work orders' })
  async getMyTasks(@CurrentUser('sub') userId: string, @ZoneId() zoneId: string, @Query('status') status?: string) {
    return { success: true, data: await this.woService.getMyWorkOrders(userId, zoneId, status as any) };
  }

  @Get('stats')
  @RequirePermission('cmms.work-order.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Work order statistics' })
  async getStats(@ZoneId() zoneId: string) {
    return { success: true, data: await this.woService.getWorkOrderStats(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.work-order.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Work order detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.woService.findById(id) };
  }

  @Post(':id/approve')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve work order' })
  async approve(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.approve(id, userId) };
  }

  @Post(':id/assign')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assign technician' })
  async assign(@Param('id') id: string, @Body() dto: AssignTechnicianDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.assign(id, dto.technicianId, userId) };
  }

  @Post(':id/start')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Start work' })
  async startWork(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.startWork(id, userId) };
  }

  @Post(':id/hold')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Put on hold' })
  async putOnHold(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.putOnHold(id, reason, userId) };
  }

  @Post(':id/resume')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Resume work' })
  async resumeWork(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.resumeWork(id, userId) };
  }

  @Post(':id/complete')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Complete work order' })
  async complete(@Param('id') id: string, @Body() dto: CompleteWorkOrderDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.complete(id, dto, userId) };
  }

  @Post(':id/verify')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Verify completion' })
  async verify(@Param('id') id: string, @CurrentUser('sub') userId: string, @Body('notes') notes?: string) {
    return { success: true, data: await this.woService.verify(id, userId, notes) };
  }

  @Post(':id/close')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Close work order' })
  async close(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.close(id, userId) };
  }

  @Post(':id/cancel')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cancel work order' })
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.cancel(id, reason, userId) };
  }

  @Post(':id/parts')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add part used' })
  async addPart(@Param('id') id: string, @Body() dto: UsedPartDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.woService.addPart(id, dto, userId) };
  }

  @Post(':id/images')
  @RequirePermission('cmms.work-order.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image' })
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return { success: true, data: { key: await this.woService.uploadImage(id, file) } };
  }
}
