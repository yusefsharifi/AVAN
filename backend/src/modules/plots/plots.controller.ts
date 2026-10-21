import { RequirePermission } from '../../common/decorators/permissions.decorator';
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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PlotService } from './plots.service';
import { CreatePlotDto, UpdatePlotDto, FilterPlotsDto } from './dto/create-plot.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Plots')
@Controller('plots')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class PlotsController {
  constructor(private readonly plotService: PlotService) {}

  @Post()
  @RequirePermission('plots.plots.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create plot' })
  async create(
    @Body() dto: CreatePlotDto,
    @CurrentUser('sub') createdBy: string,
    @ZoneId() zoneId: string,
  ) {
    if (!dto.zoneId) dto.zoneId = zoneId;
    const plot = await this.plotService.create(dto, createdBy);
    return successResponse(plot);
  }

  @Get()
  @RequirePermission('plots.plots.list.view')
  @ApiOperation({ summary: 'List plots' })
  async findAll(@ZoneId() zoneId: string, @Query() filter: FilterPlotsDto) {
    const plots = await this.plotService.findAll(zoneId, filter);
    return successResponse(plots);
  }

  @Get('available')
  @RequirePermission('plots.plots.list.view')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Available plots' })
  async getAvailable(
    @ZoneId() zoneId: string,
    @Query('minArea') minArea?: string,
  ) {
    const plots = await this.plotService.getAvailablePlots(
      zoneId,
      minArea ? parseFloat(minArea) : undefined,
    );
    return successResponse(plots);
  }

  @Get('map')
  @RequirePermission('plots.plots.list.view')
  @ApiOperation({ summary: 'Plot map data' })
  async getMap(@ZoneId() zoneId: string) {
    const plots = await this.plotService.getPlotMap(zoneId);
    return successResponse(plots);
  }

  @Get('occupancy-stats')
  @RequirePermission('plots.plots.list.view')
  @ApiOperation({ summary: 'Occupancy statistics' })
  async getOccupancyStats(@ZoneId() zoneId: string) {
    const stats = await this.plotService.getOccupancyStats(zoneId);
    return successResponse(stats);
  }

  @Get(':id')
  @RequirePermission('plots.plots.list.view')
  @ApiOperation({ summary: 'Get plot detail' })
  async findOne(@Param('id') id: string) {
    const plot = await this.plotService.findById(id);
    return successResponse(plot);
  }

  @Patch(':id')
  @RequirePermission('plots.plots.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update plot' })
  async update(@Param('id') id: string, @Body() dto: UpdatePlotDto) {
    const plot = await this.plotService.update(id, dto);
    return successResponse(plot);
  }

  @Delete(':id')
  @RequirePermission('plots.plots.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete plot' })
  async remove(@Param('id') id: string) {
    await this.plotService.delete(id);
    return successResponse({ message: 'قطعه حذف شد' });
  }
}
