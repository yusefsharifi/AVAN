// ═══════════════════════════════════════════════════════════════════════════════
// M22: Verification Controller — Public endpoints (no auth required)
// Base path: /verify
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { VerificationService } from '../services/verification.service';
import { VerificationRateLimiter } from '../services/verification-rate-limiter.service';
import { VerificationRecorderInterceptor } from '../interceptors/verification-recorder.interceptor';
import { VerifyByQrDto, VerifyByNumberDto, VerifyCompoundDto } from '../dto/create-dtos';

@Controller('verify')
@UseInterceptors(VerificationRecorderInterceptor)
export class VerificationController {
  constructor(
    private readonly verificationService: VerificationService,
    private readonly rateLimiter: VerificationRateLimiter,
  ) {}

  @Get('/')
  async landing(@Req() req: Request): Promise<Record<string, unknown>> {
    return this.verificationService.getPortalInfo();
  }

  @Get('/qr/:hash')
  async verifyByQrGet(
    @Param('hash') hash: string,
    @Req() req: Request,
  ): Promise<unknown> {
    if (!hash || hash.length < 10) {
      throw new BadRequestException('Invalid QR hash format');
    }
    const ip = this.extractIp(req);
    const ua = req.headers['user-agent'] || '';
    const sessionId = this.rateLimiter.getSessionId(req as never);
    const lang = (req.query.lang as string) || 'fa';

    return this.verificationService.verifyByQr(hash, lang, ip, ua, sessionId);
  }

  @Post('/qr')
  @HttpCode(HttpStatus.OK)
  async verifyByQrPost(
    @Body() dto: VerifyByQrDto,
    @Req() req: Request,
  ): Promise<unknown> {
    const ip = this.extractIp(req);
    const ua = req.headers['user-agent'] || '';
    const sessionId = this.rateLimiter.getSessionId(req as never);
    const lang = dto.language || 'fa';

    return this.verificationService.verifyByQr(dto.qrHash, lang, ip, ua, sessionId);
  }

  @Post('/number')
  @HttpCode(HttpStatus.OK)
  async verifyByNumber(
    @Body() dto: VerifyByNumberDto,
    @Req() req: Request,
  ): Promise<unknown> {
    if (!dto.documentType || !dto.documentNumber) {
      throw new BadRequestException('documentType and documentNumber are required');
    }
    const ip = this.extractIp(req);
    const ua = req.headers['user-agent'] || '';
    const sessionId = this.rateLimiter.getSessionId(req as never);
    const lang = dto.language || 'fa';

    return this.verificationService.verifyByNumber(
      dto.documentType, dto.documentNumber, lang, ip, ua, sessionId,
    );
  }

  @Post('/compound')
  @HttpCode(HttpStatus.OK)
  async verifyCompound(
    @Body() dto: VerifyCompoundDto,
    @Req() req: Request,
  ): Promise<unknown> {
    if (!dto.documentType) {
      throw new BadRequestException('documentType is required');
    }
    const ip = this.extractIp(req);
    const ua = req.headers['user-agent'] || '';
    const sessionId = this.rateLimiter.getSessionId(req as never);
    const lang = dto.language || 'fa';

    return this.verificationService.verifyCompound(
      dto.documentType, dto.documentNumber, dto.registrationNumber, dto.nationalId,
      lang, ip, ua, sessionId,
    );
  }

  @Get('/badge/:code')
  async getBadge(@Param('code') code: string): Promise<Record<string, unknown> | null> {
    return this.verificationService.getBadgeInfo(code);
  }

  @Get('/badge/:code/qr.png')
  async getBadgeQrPng(
    @Param('code') code: string,
    @Query('style') style: string,
    @Res() res: Response,
  ): Promise<void> {
    // Generate QR code as PNG
    const QRCode = await import('qrcode');
    const badgeInfo = await this.verificationService.getBadgeInfo(code);
    if (!badgeInfo) {
      res.status(404).json({ error: 'Badge not found' });
      return;
    }

    const qrHash = (badgeInfo as Record<string, unknown>).qrHash as string;
    const verifyUrl = `/verify/qr/${qrHash}`;

    const buffer = await QRCode.toBuffer(verifyUrl, {
      type: 'png',
      width: 300,
      errorCorrectionLevel: 'H',
      margin: 2,
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @Get('/badge/:code/embed.js')
  async getBadgeEmbedScript(
    @Param('code') code: string,
    @Res() res: Response,
  ): Promise<void> {
    const embedCode = await this.verificationService.getBadgeEmbedCode(code);
    res.setHeader('Content-Type', 'application/javascript');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(embedCode);
  }

  @Get('/stats')
  async getStats(
    @Query('zoneId') zoneId?: string,
    @Query('from') fromDate?: string,
    @Query('to') toDate?: string,
  ): Promise<unknown> {
    return this.verificationService.getVerificationStats(zoneId, fromDate, toDate);
  }

  @Get('/health')
  async health(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  private extractIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
      const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
      return ip;
    }
    return req.ip || (req.connection as unknown as Record<string, string>)?.remoteAddress || '0.0.0.0';
  }
}
