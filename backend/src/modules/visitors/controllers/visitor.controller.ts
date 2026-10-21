import { RequirePermission } from '../../../common/decorators/permissions.decorator';
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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorService } from '../visitor.service';
import { CreateVisitorRequestDto } from '../dto/create-visitor-request.dto';
import { ApproveVisitorDto } from '../dto/approve-visitor.dto';
import { FilterVisitorsDto } from '../dto/filter-visitors.dto';
import { RequestExtensionDto } from '../dto/request-extension.dto';
import { ApproveExtensionDto } from '../dto/approve-extension.dto';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Visitor Requests')
@ApiBearerAuth()
@Controller('/visitors')
@UseGuards(JwtGuard, ZoneGuard, PermissionsGuard)
export class VisitorController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create visitor request' })
  create(@Body() dto: CreateVisitorRequestDto, @CurrentUser('sub') userId: string) {
    return this.visitorService.createRequest(dto, userId);
  }

  @Get()
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List visitor requests' })
  findAll(@Query() filter: FilterVisitorsDto, @CurrentUser('zoneId') zoneId: string) {
    return this.visitorService.findAll(filter, zoneId);
  }

  @Get('today')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: "Today's visitors" })
  findToday(@CurrentUser('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    return this.visitorService.findTodayVisitors(zoneId, companyId);
  }

  @Get('inside')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Currently inside visitors' })
  getInside(@CurrentUser('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    return this.visitorService.getCurrentlyInside(zoneId, companyId);
  }

  @Get('overstay')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Overstay alerts' })
  getOverstay(@CurrentUser('zoneId') zoneId: string) {
    return this.visitorService.getOverstayVisitors(zoneId);
  }

  @Get('stats')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Visitor statistics' })
  getStats(@CurrentUser('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    return this.visitorService.getVisitorStats(zoneId, companyId);
  }

  @Get('pending-approval')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Pending approvals for host' })
  getPendingApprovals(@CurrentUser('sub') userId: string, @CurrentUser('zoneId') zoneId: string) {
    return this.visitorService.getHostPendingApprovals(userId, zoneId);
  }

  @Get(':id')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Visitor detail' })
  findById(@Param('id') id: string, @CurrentUser('zoneId') zoneId: string) {
    return this.visitorService.findById(id, zoneId);
  }

  @Patch(':id/approve')
  @RequirePermission('visitors.visitor.list.update')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve or reject visitor' })
  approve(
    @Param('id') id: string,
    @Body() dto: ApproveVisitorDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.visitorService.approveRequest(id, dto, userId);
  }

  @Post(':id/cancel')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Cancel visitor request' })
  cancel(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.visitorService.cancelRequest(id, userId);
  }

  @Post(':id/check-in')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check in visitor at gate' })
  checkIn(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('sub') userId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.visitorService.checkInVisitor(
      { qrPayload: dto.qrPayload, gateId: dto.gateId, notes: dto.notes },
      userId,
      zoneId,
    );
  }

  @Post(':id/check-out')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check out visitor at gate' })
  checkOut(
    @Param('id') id: string,
    @Body() dto: any,
    @CurrentUser('sub') userId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.visitorService.checkOutVisitor(
      { visitorRequestId: id, gateId: dto.gateId, notes: dto.notes },
      userId,
      zoneId,
    );
  }

  @Post(':id/force-exit')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Force exit visitor' })
  forceExit(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.visitorService.forceExit(id, reason, userId, zoneId);
  }

  @Post(':id/extension')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Request visit extension' })
  requestExtension(
    @Param('id') id: string,
    @Body() dto: Omit<RequestExtensionDto, 'visitorRequestId'>,
    @CurrentUser('sub') userId: string,
  ) {
    return this.visitorService.requestExtension(
      { ...dto, visitorRequestId: id },
      userId,
    );
  }

  @Patch(':id/extension/:eid')
  @RequirePermission('visitors.visitor.list.update')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve/reject extension' })
  approveExtension(
    @Param('eid') extensionId: string,
    @Body() dto: ApproveExtensionDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.visitorService.approveExtension(extensionId, dto.approved, userId);
  }

  @Post(':id/vip')
  @RequirePermission('visitors.visitor.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Set VIP protocol' })
  setVip(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.visitorService.setVipProtocol(id, userId);
  }

  @Get(':id/tracking')
  @RequirePermission('visitors.visitor.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get tracking timeline' })
  getTracking(@Param('id') id: string) {
    return this.visitorService.getTrackingTimeline(id);
  }
}
