import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// M18: Reporting & BI — Report Definition Controller
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ReportEngineService } from '../services/report-engine.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';

import { CreateReportDefinitionDto, RunReportDto, FilterReportDefinitionsDto } from '../dto/create-dtos';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('/reports')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class ReportDefinitionController {
  constructor(
    private readonly reportEngine: ReportEngineService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @RequirePermission('reporting.report-definition.list.create')
  @ApiOperation({ summary: 'Create a new report definition' })
  async create(@Body() dto: CreateReportDefinitionDto, @Req() req: any) {
    const existing = await this.prisma.reportDefinition.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new AppException('REPORT_CODE_DUPLICATE');
    }

    const report = await this.prisma.reportDefinition.create({
      data: {
        ...dto,
        config: dto.config as any,
        allowedRoles: dto.allowedRoles || [],
        createdBy: req.user.id,
      },
    });

    return { data: report };
  }

  @Get()
  @RequirePermission('reporting.report-definition.list.view')
  @ApiOperation({ summary: 'List report definitions' })
  async findAll(@Query() query: FilterReportDefinitionsDto) {
    const where: Record<string, unknown> = {};
    if (query.zoneId) where.zoneId = query.zoneId;
    if (query.category) where.category = query.category;
    if (query.isSystem !== undefined) where.isSystem = query.isSystem;
    if (query.search) {
      where.OR = [
        { nameFa: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const reports = await this.prisma.reportDefinition.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit || 50,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });

    return { data: reports };
  }

  @Get(':code')
  @RequirePermission('reporting.report-definition.list.view')
  @ApiOperation({ summary: 'Get report definition by code' })
  async findByCode(@Param('code') code: string) {
    const report = await this.prisma.reportDefinition.findUnique({
      where: { code },
    });
    if (!report) {
      throw new AppException('REPORT_NOT_FOUND');
    }
    return { data: report };
  }

  @Post('run')
  @RequirePermission('reporting.report-definition.list.create')
  @ApiOperation({ summary: 'Execute a report' })
  async runReport(@Body() dto: RunReportDto, @Req() req: any) {
    const result = await this.reportEngine.runReport(dto, req.user.id, req.user.zoneId);
    return { data: result };
  }

  @Get(':code/history')
  @RequirePermission('reporting.report-definition.list.view')
  @ApiOperation({ summary: 'Get report execution history' })
  async getHistory(
    @Param('code') code: string,
    @Query('limit') limit?: string,
  ) {
    const history = await this.reportEngine.getExecutionHistory(
      code,
      limit ? parseInt(limit, 10) : 20,
    );
    return { data: history };
  }

  @Get('executions/:executionId/download')
  @RequirePermission('reporting.report-definition.list.view')
  @ApiOperation({ summary: 'Download a generated report file' })
  async download(@Param('executionId') executionId: string) {
    const result = await this.reportEngine.downloadReport(executionId);
    return { data: result };
  }

  @Post('executions/:executionId/cancel')
  @RequirePermission('reporting.report-definition.list.create')
  @ApiOperation({ summary: 'Cancel a running report execution' })
  async cancelExecution(@Param('executionId') executionId: string) {
    await this.reportEngine.cancelExecution(executionId);
    return { data: { cancelled: true } };
  }
}
