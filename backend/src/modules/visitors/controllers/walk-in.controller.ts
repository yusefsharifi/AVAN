import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorService } from '../visitor.service';
import { WalkInVisitorDto } from '../dto/walk-in-visitor.dto';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Walk-In Visitors')
@ApiBearerAuth()
@Controller('/visitors/walk-in')
@UseGuards(JwtGuard, ZoneGuard, PermissionsGuard)
export class WalkInController {
  constructor(private readonly visitorService: VisitorService) {}

  @Post()
  @RequirePermission('visitors.walk-in.list.create')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Process walk-in visitor' })
  processWalkIn(
    @Body() dto: WalkInVisitorDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.visitorService.processWalkIn(dto, userId, zoneId);
  }

  @Get('pending')
  @RequirePermission('visitors.walk-in.list.view')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Pending walk-in approvals' })
  getPending(
    @CurrentUser('sub') userId: string,
    @CurrentUser('zoneId') zoneId: string,
  ) {
    return this.visitorService.getHostPendingApprovals(userId, zoneId);
  }
}
