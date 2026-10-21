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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { WeighScaleService } from '../services/weigh-scale.service';
import { RecordWeightDto } from '../dto/record-weight.dto';
import { ScaleSensorReadingDto } from '../dto/scale-sensor.dto';
import { CreateScaleDto } from '../dto/create-scale.dto';
import { UpdateScaleDto } from '../dto/update-scale.dto';
import { FilterWeighDto } from '../dto/filter-weigh.dto';

@ApiTags('Weigh Scale')
@ApiBearerAuth()
@Controller('/weigh')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class WeighController {
  constructor(private readonly weighScaleService: WeighScaleService) {}

  // ── SCALES ──

  @Get('scales')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List weigh scales' })
  async getScales(@Query('zoneId') zoneId: string) {
    const data = await this.weighScaleService.getScales(zoneId);
    return { success: true, data };
  }

  @Post('scales')
  @RequirePermission('logistics.weigh.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Create a weigh scale' })
  async createScale(
    @Query('zoneId') zoneId: string,
    @Body() dto: CreateScaleDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.weighScaleService.createScale(zoneId, dto, userId);
    return { success: true, data };
  }

  @Patch('scales/:id')
  @RequirePermission('logistics.weigh.list.update')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update a weigh scale' })
  async updateScale(@Param('id') id: string, @Body() dto: UpdateScaleDto) {
    const data = await this.weighScaleService.updateScale(id, dto);
    return { success: true, data };
  }

  @Post('scales/:id/calibrate')
  @RequirePermission('logistics.weigh.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Upload calibration certificate' })
  @UseInterceptors(FileInterceptor('certificate'))
  async calibrateScale(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.weighScaleService.calibrateScale(id, userId, file);
    return { success: true, data };
  }

  @Get('scales/:id/reading')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get current sensor reading' })
  async getCurrentReading(@Param('id') id: string) {
    const data = await this.weighScaleService.getCurrentReading(id);
    return { success: true, data };
  }

  // ── SENSOR (internal, no auth) ──

  @Post('sensor-reading')
  @RequirePermission('logistics.weigh.list.create')
  @ApiOperation({ summary: 'IoT bridge sensor push (internal)' })
  async receiveSensorReading(@Body() dto: ScaleSensorReadingDto) {
    await this.weighScaleService.receiveSensorReading(dto);
    return { success: true };
  }

  // ── RECORDS ──

  @Post('records')
  @RequirePermission('logistics.weigh.list.create')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Record weight measurement' })
  async recordWeight(
    @Body() dto: RecordWeightDto,
    @CurrentUser('sub') userId: string,
    @Query('zoneId') zoneId: string,
  ) {
    const data = await this.weighScaleService.recordWeight(dto, userId, zoneId);
    return { success: true, data };
  }

  @Get('records')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'List weigh records' })
  async getWeighHistory(
    @Query('zoneId') zoneId: string,
    @Query() filter: FilterWeighDto,
  ) {
    const result = await this.weighScaleService.getWeighHistory(zoneId, filter);
    return { success: true, ...result };
  }

  @Get('records/tamper-alerts')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get tamper flag records' })
  async getTamperAlerts(
    @Query('zoneId') zoneId: string,
    @Query('fromDate') fromDate?: string,
  ) {
    const data = await this.weighScaleService.getTamperAlerts(zoneId, fromDate);
    return { success: true, data };
  }

  @Get('records/:id')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get weigh record detail' })
  async getWeighRecord(@Param('id') id: string) {
    const data = await this.weighScaleService['prisma'].weighRecord.findUnique({ where: { id } });
    return { success: true, data };
  }

  @Post('records/:id/void')
  @RequirePermission('logistics.weigh.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Void a weigh record' })
  async voidRecord(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.weighScaleService.voidWeighRecord(id, reason, userId);
    return { success: true, data };
  }

  @Get('operator-dashboard')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Scale operator dashboard' })
  async getOperatorDashboard(
    @CurrentUser('sub') userId: string,
    @Query('scaleId') scaleId: string,
  ) {
    const data = await this.weighScaleService.getOperatorDashboard(userId, scaleId);
    return { success: true, data };
  }

  @Get('daily-report/:date')
  @RequirePermission('logistics.weigh.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Daily weighing report' })
  async getDailyReport(
    @Query('zoneId') zoneId: string,
    @Param('date') date: string,
  ) {
    const data = await this.weighScaleService.generateDailyReport(zoneId, date);
    return { success: true, data };
  }
}
