import { RequirePermission } from '../../../common/decorators/permissions.decorator';
// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Admin Controller — SUPER_ADMIN endpoints
// Base path: /api/v1/super/verification
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { VerificationService } from '../services/verification.service';
import { VerificationRateLimiter } from '../services/verification-rate-limiter.service';

@Controller('/super/verification')
@UseGuards(JwtGuard, RolesGuard, PermissionsGuard)
@Roles('SUPER_ADMIN')
export class VerificationAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
    private readonly rateLimiter: VerificationRateLimiter,
  ) {}

  @Get('/records')
  @RequirePermission('document-verification.verification.admin.view')
  async getRecords(
    @Query('documentType') documentType?: string,
    @Query('result') result?: string,
    @Query('zoneId') zoneId?: string,
    @Query('ipAddress') ipAddress?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: unknown[]; meta: { total: number; nextCursor: string | null } }> {
    const take = Math.min(parseInt(limit || '50', 10), 100);
    const where: Record<string, unknown> = {};
    if (documentType) where.documentType = documentType;
    if (result) where.result = result;
    if (zoneId) where.sessionId = zoneId; // approximate zone filtering
    if (ipAddress) where.ipAddress = ipAddress;
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) (where.createdAt as Record<string, Date>).gte = new Date(fromDate);
      if (toDate) (where.createdAt as Record<string, Date>).lte = new Date(toDate);
    }

    const records = await this.prisma.verificationRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    const nextCursor = records.length > take ? records[take].id : null;
    const data = records.slice(0, take);

    return {
      data,
      meta: { total: records.length, nextCursor },
    };
  }

  @Get('/stats/detailed')
  @RequirePermission('document-verification.verification.admin.view')
  async getDetailedStats(
    @Query('zoneId') zoneId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<unknown> {
    return this.verificationService.getVerificationStats(zoneId, fromDate, toDate);
  }

  @Get('/stats/most-verified')
  @RequirePermission('document-verification.verification.admin.view')
  async getMostVerified(
    @Query('zoneId') zoneId?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.verificationService.getMostVerifiedDocuments(zoneId, parseInt(limit || '20', 10));
  }

  @Post('/block-ip')
  @RequirePermission('document-verification.verification.admin.create')
  @HttpCode(HttpStatus.OK)
  async blockIp(
    @Body() body: { ipAddress: string; reason: string; durationHours?: number },
  ): Promise<{ success: boolean }> {
    await this.rateLimiter.blockIp(
      body.ipAddress,
      body.reason,
      body.durationHours || 24,
    );
    return { success: true };
  }

  @Delete('/block-ip/:ip')
  @RequirePermission('document-verification.verification.admin.delete')
  @HttpCode(HttpStatus.OK)
  async unblockIp(@Param('ip') ip: string): Promise<{ success: boolean }> {
    await this.rateLimiter.unblockIp(ip);
    return { success: true };
  }

  @Post('/purge-cache')
  @RequirePermission('document-verification.verification.admin.create')
  @HttpCode(HttpStatus.OK)
  async purgeCache(
    @Body() body: { documentType: string; documentId: string },
  ): Promise<{ success: boolean }> {
    await this.verificationService.purgeCache(body.documentType, body.documentId);
    return { success: true };
  }
}
