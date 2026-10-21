import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { SignatureVerificationService } from '../services/verification.service';
import { VerifySignatureDto, VerifyDocumentDto } from '../dto/create-dtos';

@Controller('/signatures/verify')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class VerificationController {
  constructor(private readonly verifyService: SignatureVerificationService) {}

  @Get('qr/:qrHash')
  @RequirePermission('digital-signature.verification.list.view')
  async verifyByQr(@Param('qrHash') qrHash: string) { return { data: await this.verifyService.verifyByQrHash(qrHash) }; }

  @Post('signature')
  @RequirePermission('digital-signature.verification.list.create')
  async verifySignature(@Body() dto: VerifySignatureDto) { return { data: await this.verifyService.verify(dto) }; }

  @Post('document')
  @RequirePermission('digital-signature.verification.list.create')
  async verifyDocument(@Body() dto: VerifyDocumentDto) { return { data: await this.verifyService.verifyDocument(dto) }; }

  @Get('report/:type/:id')
  @RequirePermission('digital-signature.verification.list.view')
  async getReport(@Param('type') type: string, @Param('id') id: string) { return { data: await this.verifyService.generateVerificationReport(type, id, 'json') }; }
}
