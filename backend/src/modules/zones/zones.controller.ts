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
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ZoneService } from './zones.service';
import { CreateZoneDto } from './dto/create-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { CreateGateDto, CreateHolidayDto } from './dto/create-gate.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, ZoneStatus } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';
import { ZoneSettingsDto } from './dto/create-zone.dto';

@ApiTags('Zones')
@Controller('zones')
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class ZonesController {
  constructor(private readonly zoneService: ZoneService) {}

  @Post()
  @RequirePermission('zones.zones.list.create')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create zone' })
  async create(@Body() dto: CreateZoneDto, @CurrentUser('sub') createdBy: string) {
    const zone = await this.zoneService.create(dto, createdBy);
    return successResponse(zone);
  }

  @Get()
  @RequirePermission('zones.zones.list.view')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all zones' })
  async findAll(
    @Query('status') status?: ZoneStatus,
    @Query('search') search?: string,
  ) {
    const zones = await this.zoneService.findAll({ status, search });
    return successResponse(zones);
  }

  @Get(':id')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'Get zone detail' })
  async findOne(@Param('id') id: string) {
    const zone = await this.zoneService.findById(id);
    return successResponse(zone);
  }

  @Patch(':id')
  @RequirePermission('zones.zones.list.update')
  @Roles(UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update zone' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateZoneDto,
    @CurrentUser('sub') updatedBy: string,
  ) {
    const zone = await this.zoneService.update(id, dto, updatedBy);
    return successResponse(zone);
  }

  @Delete(':id')
  @RequirePermission('zones.zones.list.delete')
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft delete zone' })
  async remove(@Param('id') id: string, @CurrentUser('sub') deletedBy: string) {
    await this.zoneService.softDelete(id, deletedBy);
    return successResponse({ message: 'شهرک حذف شد' });
  }

  @Post(':id/logo')
  @RequirePermission('zones.zones.list.create')
  @Roles(UserRole.SUPER_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload zone logo' })
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.zoneService.uploadLogo(id, file);
    return successResponse(result);
  }

  @Get(':id/settings')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'Get zone settings' })
  async getSettings(@Param('id') id: string) {
    const settings = await this.zoneService.getSettings(id);
    return successResponse(settings);
  }

  @Patch(':id/settings')
  @RequirePermission('zones.zones.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update zone settings' })
  async updateSettings(
    @Param('id') id: string,
    @Body() dto: ZoneSettingsDto,
    @CurrentUser('sub') updatedBy: string,
  ) {
    await this.zoneService.updateSettings(id, dto, updatedBy);
    return successResponse({ message: 'تنظیمات بروزرسانی شد' });
  }

  @Get(':id/statistics')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'Get zone statistics' })
  async getStatistics(@Param('id') id: string) {
    const stats = await this.zoneService.getZoneStatistics(id);
    return successResponse(stats);
  }

  // Holidays
  @Get(':id/holidays')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'List holidays' })
  async getHolidays(@Param('id') id: string, @Query('year') year?: string) {
    const holidays = await this.zoneService.getHolidays(id, year ? parseInt(year) : undefined);
    return successResponse(holidays);
  }

  @Post(':id/holidays')
  @RequirePermission('zones.zones.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add holiday' })
  async addHoliday(
    @Param('id') id: string,
    @Body() dto: CreateHolidayDto,
    @CurrentUser('sub') addedBy: string,
  ) {
    const holiday = await this.zoneService.addHoliday(id, dto, addedBy);
    return successResponse(holiday);
  }

  @Delete(':id/holidays/:hid')
  @RequirePermission('zones.zones.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove holiday' })
  async removeHoliday(@Param('id') id: string, @Param('hid') hid: string) {
    await this.zoneService.removeHoliday(id, hid);
    return successResponse({ message: '节假日 حذف شد' });
  }

  // Gates
  @Get(':id/gates')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'List gates' })
  async getGates(@Param('id') id: string) {
    const gates = await this.zoneService.getGates(id);
    return successResponse(gates);
  }

  @Post(':id/gates')
  @RequirePermission('zones.zones.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create gate' })
  async createGate(
    @Param('id') id: string,
    @Body() dto: CreateGateDto,
    @CurrentUser('sub') createdBy: string,
  ) {
    const gate = await this.zoneService.createGate(id, dto, createdBy);
    return successResponse(gate);
  }

  @Patch(':id/gates/:gid')
  @RequirePermission('zones.zones.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update gate' })
  async updateGate(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Body() dto: Partial<CreateGateDto>,
  ) {
    const gate = await this.zoneService.updateGate(id, gid, dto);
    return successResponse(gate);
  }

  @Delete(':id/gates/:gid')
  @RequirePermission('zones.zones.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete gate' })
  async deleteGate(@Param('id') id: string, @Param('gid') gid: string) {
    await this.zoneService.deleteGate(id, gid);
    return successResponse({ message: 'ورودی حذف شد' });
  }

  @Get(':id/working-hours/check')
  @RequirePermission('zones.zones.list.view')
  @ApiOperation({ summary: 'Check if zone is in working hours' })
  async checkWorkingHours(@Param('id') id: string) {
    const isWorking = await this.zoneService.isWorkingHour(id);
    return successResponse({ isWorkingHour: isWorking });
  }
}
