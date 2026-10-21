import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// M7: Physical Archive Controller
// ═══════════════════════════════════════════════════════════════════════════════

import { Controller, Get, Post, Param, Query, Body, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { PhysicalArchiveService } from '../services/physical-archive.service';
import { CreateShelfDto, ReceivePhysicalLetterDto, MovePhysicalLetterDto } from '../dto/archive.dto';
import { successResponse } from '../../../common/dto/response.dto';

// Task 4 (envelope conformity): every route here previously returned a raw
// Prisma/service object, which was the ONLY reason client.ts needed a
// "fall back to the raw body" unwrap. They now emit the standard
// { success, data } envelope like the rest of the API, and the client-side
// fallback has been removed. GET /health (docker healthcheck contract) stays raw.

@Controller('/physical-archive')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PhysicalArchiveController {
  constructor(private readonly archiveService: PhysicalArchiveService) {}

  @Get('shelves')
  @RequirePermission('correspondence.physical-archive.list.view')
  async getShelves(@Query('zoneId') zoneId: string) {
    return successResponse(await this.archiveService.getShelves(zoneId));
  }

  @Get('shelves/map')
  @RequirePermission('correspondence.physical-archive.list.view')
  async getShelfMap(@Query('zoneId') zoneId: string) {
    return successResponse(await this.archiveService.getShelfMap(zoneId));
  }

  @Post('shelves')
  @RequirePermission('correspondence.physical-archive.list.create')
  async createShelf(@Body() dto: CreateShelfDto, @Query('zoneId') zoneId: string, @Req() req: any) {
    return successResponse(
      await this.archiveService.createShelf(zoneId, dto, req.user?.id || 'SYSTEM'),
    );
  }

  @Get('report')
  @RequirePermission('correspondence.physical-archive.list.view')
  async getReport(@Query('zoneId') zoneId: string) {
    return successResponse(await this.archiveService.getArchiveReport(zoneId));
  }

  @Get('missing-physical')
  @RequirePermission('correspondence.physical-archive.list.view')
  async getMissingPhysical(@Query('zoneId') zoneId: string) {
    return successResponse(await this.archiveService.getLettersWithoutPhysicalCopy(zoneId));
  }

  @Post('receive')
  @RequirePermission('correspondence.physical-archive.list.create')
  async receiveLetter(@Body() dto: ReceivePhysicalLetterDto, @Query('zoneId') zoneId: string, @Req() req: any) {
    return successResponse(
      await this.archiveService.receiveLetter(dto, req.user?.id || 'SYSTEM', zoneId),
    );
  }

  @Post('move')
  @RequirePermission('correspondence.physical-archive.list.create')
  async moveLetter(@Body() dto: MovePhysicalLetterDto, @Query('zoneId') zoneId: string, @Req() req: any) {
    return successResponse(
      await this.archiveService.moveLetter(dto, req.user?.id || 'SYSTEM', zoneId),
    );
  }

  @Post('dispatch')
  @RequirePermission('correspondence.physical-archive.list.create')
  async dispatchPhysical(@Body('barcode') barcode: string, @Body('reason') reason: string, @Query('zoneId') zoneId: string, @Req() req: any) {
    return successResponse(
      await this.archiveService.dispatchPhysical(barcode, reason, req.user?.id || 'SYSTEM', zoneId),
    );
  }

  @Get('letter/:letterId')
  @RequirePermission('correspondence.physical-archive.list.view')
  async getLetterArchiveInfo(@Param('letterId') letterId: string) {
    return successResponse(await this.archiveService.getLetterArchiveInfo(letterId));
  }
}
