import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { VisitorBlacklistService } from '../visitor-blacklist.service';
import { AddVisitorBlacklistDto } from '../dto/add-visitor-blacklist.dto';
import { CheckBlacklistDto } from '../dto/check-blacklist.dto';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@ApiTags('Visitor Blacklist')
@ApiBearerAuth()
@Controller('/visitor-blacklist')
@UseGuards(JwtGuard, ZoneGuard, PermissionsGuard)
export class VisitorBlacklistController {
  constructor(private readonly blacklistService: VisitorBlacklistService) {}

  @Post()
  @RequirePermission('visitors.blacklist.list.create')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Add to visitor blacklist' })
  add(
    @CurrentUser('zoneId') zoneId: string,
    @Body() dto: AddVisitorBlacklistDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.blacklistService.addToBlacklist(zoneId, dto, userId);
  }

  @Get()
  @RequirePermission('visitors.blacklist.list.view')
  @UseGuards(RolesGuard)
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List visitor blacklist' })
  list(
    @CurrentUser('zoneId') zoneId: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.blacklistService.getBlacklist(
      zoneId,
      isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    );
  }

  @Post('check')
  @RequirePermission('visitors.blacklist.list.create')
  @UseGuards(RolesGuard)
  @Roles('GUARD', 'ZONE_OPERATOR', 'ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Check visitor against blacklist' })
  check(
    @CurrentUser('zoneId') zoneId: string,
    @Body() dto: CheckBlacklistDto,
  ) {
    return this.blacklistService.check(
      zoneId,
      dto.nationalId,
      dto.phone,
      dto.name,
    );
  }

  @Delete(':id')
  @RequirePermission('visitors.blacklist.list.delete')
  @UseGuards(RolesGuard)
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Remove from visitor blacklist' })
  remove(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    return this.blacklistService.removeFromBlacklist(id, userId);
  }
}
