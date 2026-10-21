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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GroupVisitService } from '../group-visit.service';
import { CreateGroupVisitDto } from '../dto/create-group-visit.dto';
import { AddGroupMemberDto } from '../dto/add-group-member.dto';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Group Visits')
@ApiBearerAuth()
@Controller('/group-visits')
@UseGuards(JwtGuard, ZoneGuard, PermissionsGuard)
export class GroupVisitController {
  constructor(private readonly groupVisitService: GroupVisitService) {}

  @Post()
  @RequirePermission('visitors.group-visit.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create group visit' })
  create(@Body() dto: CreateGroupVisitDto, @CurrentUser('sub') userId: string) {
    return this.groupVisitService.create(dto, userId);
  }

  @Get()
  @RequirePermission('visitors.group-visit.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List group visits' })
  findAll(
    @CurrentUser('zoneId') zoneId: string,
    @Query('companyId') companyId?: string,
  ) {
    return this.groupVisitService.findAll(zoneId, companyId);
  }

  @Get(':id')
  @RequirePermission('visitors.group-visit.list.view')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Group visit detail' })
  findById(@Param('id') id: string) {
    return this.groupVisitService.findById(id);
  }

  @Patch(':id/approve')
  @RequirePermission('visitors.group-visit.list.update')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Approve/reject group visit' })
  approve(
    @Param('id') id: string,
    @Body('approved') approved: boolean,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groupVisitService.approve(id, approved, reason, userId);
  }

  @Get(':id/dashboard')
  @RequirePermission('visitors.group-visit.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Live group dashboard' })
  getDashboard(@Param('id') id: string) {
    return this.groupVisitService.getGroupDashboard(id);
  }

  @Post(':id/members')
  @RequirePermission('visitors.group-visit.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add single member to group' })
  addMember(
    @Param('id') id: string,
    @Body() dto: AddGroupMemberDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.groupVisitService.addMember(id, dto, userId);
  }

  @Post(':id/members/bulk')
  @RequirePermission('visitors.group-visit.list.create')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk add members to group' })
  bulkAdd(
    @Param('id') id: string,
    @Body('members') members: AddGroupMemberDto[],
    @CurrentUser('sub') userId: string,
  ) {
    return this.groupVisitService.bulkAddMembers(id, members, userId);
  }

  @Delete(':id/members/:vid')
  @RequirePermission('visitors.group-visit.list.delete')
  @UseGuards(RolesGuard)
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove member from group' })
  removeMember(
    @Param('id') id: string,
    @Param('vid') visitorRequestId: string,
  ) {
    return this.groupVisitService.removeMember(id, visitorRequestId);
  }

  @Post(':id/complete')
  @RequirePermission('visitors.group-visit.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Mark group visit completed' })
  complete(@Param('id') id: string) {
    return this.groupVisitService.markGroupCompleted(id);
  }
}
