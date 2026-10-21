import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CertificateService } from '../services/certificate.service';
import { RegisterCertificateDto } from '../dto/create-dtos';

@Controller('/signatures/certificates')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class CertificateController {
  constructor(private readonly certService: CertificateService) {}

  @Post()
  @RequirePermission('digital-signature.certificate.list.create')
  @Roles('COMPANY_MANAGER')
  async register(@Body() dto: RegisterCertificateDto, @CurrentUser('sub') userId: string) { return { data: await this.certService.register(dto, userId) }; }

  @Get('my')
  @RequirePermission('digital-signature.certificate.list.view')
  async getMyCerts(@Query('userId') userId: string) { return { data: await this.certService.findByUser(userId) }; }

  @Get('expiring')
  @RequirePermission('digital-signature.certificate.list.view')
  async getExpiring(@Query('withinDays') withinDays: number, @Query('userId') userId?: string) { return { data: await this.certService.getExpiringCertificates(withinDays || 30, userId) }; }

  @Get(':id')
  @RequirePermission('digital-signature.certificate.list.view')
  async findById(@Param('id') id: string) { return { data: await this.certService.findById(id) }; }

  @Get(':id/validity')
  @RequirePermission('digital-signature.certificate.list.view')
  async checkValidity(@Param('id') id: string) { return { data: await this.certService.checkValidity(id) }; }

  @Post(':id/verify')
  @RequirePermission('digital-signature.certificate.list.create')
  async verify(@Param('id') id: string) { return { data: await this.certService.verify(id, 'system') }; }

  @Post(':id/revoke')
  @RequirePermission('digital-signature.certificate.list.create')
  async revoke(@Param('id') id: string, @Body() body: { reason: string }) { return { data: await this.certService.revoke(id, body.reason, 'system') }; }
}
