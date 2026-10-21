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
import { AssetService } from '../services/asset.service';
import { CreateAssetDto, UpdateConditionDto, UpdateMeterReadingDto, FilterAssetsDto } from '../dto/create-dtos';

@ApiTags('CMMS - Assets')
@ApiBearerAuth()
@Controller('/cmms/assets')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AssetController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @RequirePermission('cmms.asset.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create asset' })
  async create(@Body() dto: CreateAssetDto, @CurrentUser('sub') userId: string) {
    const data = await this.assetService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List assets' })
  async findAll(@Query() filter: FilterAssetsDto, @ZoneId() zoneId: string) {
    filter.zoneId = filter.zoneId || zoneId;
    return { success: true, ...(await this.assetService.findAll(filter)) };
  }

  @Get('map')
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Assets on GIS map' })
  async getMap(@ZoneId() zoneId: string) {
    return { success: true, data: await this.assetService.getAssetsOnMap(zoneId) };
  }

  @Get('kpis')
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Asset KPIs' })
  async getKpis(@ZoneId() zoneId: string) {
    return { success: true, data: await this.assetService.computeKpis(zoneId) };
  }

  @Get(':id')
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Asset detail' })
  async findById(@Param('id') id: string) {
    return { success: true, data: await this.assetService.findById(id) };
  }

  @Get(':id/history')
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Full asset history' })
  async getHistory(@Param('id') id: string) {
    return { success: true, data: await this.assetService.getAssetHistory(id) };
  }

  @Get(':id/hierarchy')
  @RequirePermission('cmms.asset.list.view')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Asset hierarchy tree' })
  async getHierarchy(@Param('id') id: string) {
    return { success: true, data: await this.assetService.getHierarchy(id) };
  }

  @Patch(':id')
  @RequirePermission('cmms.asset.list.update')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update asset' })
  async update(@Param('id') id: string, @Body() dto: Partial<CreateAssetDto>, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.assetService.update(id, dto, userId) };
  }

  @Patch(':id/condition')
  @RequirePermission('cmms.asset.list.update')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update condition' })
  async updateCondition(@Param('id') id: string, @Body() dto: UpdateConditionDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.assetService.updateCondition(id, dto.condition, dto.notes, userId) };
  }

  @Patch(':id/meter')
  @RequirePermission('cmms.asset.list.update')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update meter reading' })
  async updateMeter(@Param('id') id: string, @Body() dto: UpdateMeterReadingDto, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.assetService.updateMeterReading(id, dto.meterValue, new Date(dto.readAt), userId) };
  }

  @Post(':id/decommission')
  @RequirePermission('cmms.asset.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Decommission asset' })
  async decommission(@Param('id') id: string, @Body('reason') reason: string, @CurrentUser('sub') userId: string) {
    return { success: true, data: await this.assetService.decommission(id, reason, undefined, userId) };
  }

  @Post(':id/images')
  @RequirePermission('cmms.asset.list.create')
  @Roles('ZONE_MANAGER', 'ZONE_OPERATOR', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload image' })
  async uploadImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return { success: true, data: { key: await this.assetService.uploadImage(id, file) } };
  }

  @Post(':id/documents')
  @RequirePermission('cmms.asset.list.create')
  @Roles('ZONE_MANAGER', 'SUPER_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload document' })
  async uploadDocument(@Param('id') id: string, @UploadedFile() file: Express.Multer.File) {
    return { success: true, data: { key: await this.assetService.uploadDocument(id, file) } };
  }
}
