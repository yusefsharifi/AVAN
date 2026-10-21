import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SignatureService } from '../services/signature.service';
import { RequestSignatureDto, SignDocumentDto, DeclineSignatureDto, DelegateSigningDto, FilterSignatureRequestsDto } from '../dto/create-dtos';

@Controller('/signatures/requests')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class SignatureRequestController {
  constructor(private readonly sigService: SignatureService) {}

  @Post()
  @RequirePermission('digital-signature.signature-request.list.create')
  @Roles('COMPANY_STAFF')
  async create(@Body() dto: RequestSignatureDto, @CurrentUser('sub') userId: string) { return { data: await this.sigService.requestSignatures(dto, userId) }; }

  @Get()
  @RequirePermission('digital-signature.signature-request.list.view')
  async findAll(@Query() filter: FilterSignatureRequestsDto) { return this.sigService.findRequests(filter); }

  @Get('pending')
  @RequirePermission('digital-signature.signature-request.list.view')
  async getPending(@Query('signerId') signerId: string, @Query('zoneId') zoneId?: string) { return { data: await this.sigService.getPendingForSigner(signerId, zoneId) }; }

  @Get('stats')
  @RequirePermission('digital-signature.signature-request.list.view')
  async getStats(@Query('zoneId') zoneId: string, @Query('fromDate') fromDate?: string, @Query('toDate') toDate?: string) { return { data: await this.sigService.getSigningStats(zoneId, fromDate, toDate) }; }

  @Get(':id')
  @RequirePermission('digital-signature.signature-request.list.view')
  async getStatus(@Param('id') id: string) { return { data: await this.sigService.getRequestStatus(id) }; }

  @Post(':id/sign')
  @RequirePermission('digital-signature.signature-request.list.create')
  async sign(@Param('id') _id: string, @Body() dto: SignDocumentDto) { return { data: await this.sigService.signDocument(dto, 'system', '127.0.0.1', 'api') }; }

  @Post(':id/decline')
  @RequirePermission('digital-signature.signature-request.list.create')
  async decline(@Param('id') _id: string, @Body() dto: DeclineSignatureDto) { return { data: await this.sigService.declineSignature(dto, 'system') }; }

  @Post(':id/delegate')
  @RequirePermission('digital-signature.signature-request.list.create')
  async delegate(@Param('id') _id: string, @Body() dto: DelegateSigningDto) { return { data: await this.sigService.delegateSigning(dto, 'system') }; }

  @Post(':id/cancel')
  @RequirePermission('digital-signature.signature-request.list.create')
  async cancel(@Param('id') id: string, @Body() body: { reason: string }) { return { data: await this.sigService.cancelRequest(id, body.reason, 'system') }; }
}
