import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { GuardPortalService } from '../guard-portal/guard-portal.service';
import { FilterTrafficDto } from '../guard-portal/dto/process-entry.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Traffic')
@Controller('traffic')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class TrafficController {
  constructor(
    private readonly guardPortalService: GuardPortalService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @RequirePermission('traffic.traffic.list.view')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List traffic logs' })
  async findAll(@ZoneId() zoneId: string, @Query() filter: FilterTrafficDto) {
    const where: any = { zoneId };
    if (filter.gateId) where.gateId = filter.gateId;
    if (filter.plate) where.plate = { contains: filter.plate };
    if (filter.direction) where.direction = filter.direction;
    if (filter.accessResult) where.accessResult = filter.accessResult;
    if (filter.manualOverride !== undefined) where.manualOverride = filter.manualOverride;
    if (filter.fromDate || filter.toDate) {
      where.processedAt = {};
      if (filter.fromDate) where.processedAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.processedAt.lte = new Date(filter.toDate);
    }

    const limit = filter.limit || 50;

    if (filter.cursor) {
      const cursorLog = await this.prisma.trafficLog.findUnique({ where: { id: filter.cursor } });
      if (cursorLog) {
        where.processedAt = { ...where.processedAt, gt: cursorLog.processedAt };
      }
    }

    const items = await this.prisma.trafficLog.findMany({
      where,
      orderBy: { processedAt: 'desc' },
      take: limit + 1,
    });

    const hasNextPage = items.length > limit;
    const data = hasNextPage ? items.slice(0, limit) : items;

    return successResponse(data, {
      cursor: data.length > 0 ? data[data.length - 1].id : undefined,
      hasNextPage,
      limit,
    });
  }

  @Get('stats')
  @RequirePermission('traffic.traffic.list.view')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Traffic statistics' })
  async getStats(
    @ZoneId() zoneId: string,
    @Query('period') period: 'today' | 'week' | 'month',
    @Query('gateId') gateId?: string,
  ) {
    const stats = await this.guardPortalService.getTrafficStats(zoneId, period || 'today', gateId);
    return successResponse(stats);
  }

  @Get(':id')
  @RequirePermission('traffic.traffic.list.view')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Traffic log detail' })
  async findOne(@Param('id') id: string) {
    const log = await this.prisma.trafficLog.findUnique({ where: { id } });
    return successResponse(log);
  }
}
