import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSignatureTemplateDto } from '../dto/create-dtos';

@Controller('/signatures/templates')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class TemplateController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @RequirePermission('digital-signature.template.list.create')
  async create(@Body() dto: CreateSignatureTemplateDto) {
    const template = await this.prisma.signatureTemplate.create({
      data: {
        zoneId: dto.zoneId,
        documentType: dto.documentType,
        nameFa: dto.nameFa,
        signers: dto.signers as any,
        signingMode: dto.signingMode,
        deadlineDays: dto.deadlineDays || 3,
        isActive: true,
        createdBy: 'system',
      },
    });
    return { data: template };
  }

  @Get()
  @RequirePermission('digital-signature.template.list.view')
  async findAll(@Query('zoneId') zoneId?: string) {
    const where: any = { isActive: true };
    if (zoneId) where.zoneId = zoneId;
    return { data: await this.prisma.signatureTemplate.findMany({ where }) };
  }

  @Get(':id')
  @RequirePermission('digital-signature.template.list.view')
  async findById(@Param('id') id: string) {
    const template = await this.prisma.signatureTemplate.findUnique({ where: { id } });
    return { data: template };
  }
}
