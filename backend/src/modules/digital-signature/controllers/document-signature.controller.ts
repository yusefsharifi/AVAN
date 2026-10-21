import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SignatureService } from '../services/signature.service';
import { BulkSignDto } from '../dto/create-dtos';

@Controller('/signatures/documents')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class DocumentSignatureController {
  constructor(private readonly sigService: SignatureService) {}

  @Get(':type/:id')
  @RequirePermission('digital-signature.document-signature.list.view')
  @Roles('COMPANY_STAFF')
  async getSignatures(@Param('type') type: string, @Param('id') id: string) { return { data: await this.sigService.getDocumentSignatures(type, id) }; }
}

@Controller('/signatures/bulk')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard)
export class BulkSignController {
  constructor(private readonly sigService: SignatureService) {}

  @Post('sign')
  @RequirePermission('digital-signature.document-signature.list.create')
  @Roles('COMPANY_MANAGER')
  async bulkSign(@Body() dto: BulkSignDto, @CurrentUser('sub') userId: string) { return { data: await this.sigService.bulkSign(dto, userId, '127.0.0.1') }; }
}
