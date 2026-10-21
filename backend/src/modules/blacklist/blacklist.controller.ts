import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuardPortalService } from '../guard-portal/guard-portal.service';
import { AddToBlacklistDto } from '../guard-portal/dto/process-entry.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Blacklist')
@Controller('blacklist')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class BlacklistController {
  constructor(private readonly guardPortalService: GuardPortalService) {}

  @Post()
  @RequirePermission('blacklist.blacklist.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add to blacklist' })
  async add(
    @Body() dto: AddToBlacklistDto,
    @CurrentUser('sub') addedBy: string,
    @ZoneId() zoneId: string,
  ) {
    const entry = await this.guardPortalService.addToBlacklist(zoneId, dto, addedBy);
    return successResponse(entry);
  }

  @Get()
  @RequirePermission('blacklist.blacklist.list.view')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List blacklist' })
  async list(
    @ZoneId() zoneId: string,
    @Query('type') type?: string,
    @Query('isActive') isActive?: string,
  ) {
    const entries = await this.guardPortalService.getBlacklist(zoneId, {
      type,
      isActive: isActive ? isActive === 'true' : undefined,
    });
    return successResponse(entries);
  }

  @Post('check')
  @RequirePermission('blacklist.blacklist.list.create')
  @Roles(UserRole.GUARD, UserRole.ZONE_OPERATOR)
  @ApiOperation({ summary: 'Check against blacklist' })
  async check(
    @Body() body: { plates?: string[]; nationalIds?: string[]; phones?: string[] },
    @ZoneId() zoneId: string,
  ) {
    const result = await this.guardPortalService.checkBlacklist(zoneId, body);
    return successResponse(result);
  }

  @Delete(':id')
  @RequirePermission('blacklist.blacklist.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove from blacklist' })
  async remove(
    @Param('id') id: string,
    @CurrentUser('sub') removedBy: string,
    @ZoneId() zoneId: string,
  ) {
    await this.guardPortalService.removeFromBlacklist(zoneId, id, removedBy);
    return successResponse({ message: 'از لیست سیاه حذف شد' });
  }
}
