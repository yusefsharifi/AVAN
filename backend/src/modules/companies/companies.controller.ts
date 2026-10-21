import { RequirePermission } from '../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CompanyService } from './companies.service';
import { RegisterCompanyDto } from './dto/register-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { FilterCompaniesDto } from './dto/filter-companies.dto';
import { ReviewOnboardingStepDto } from './dto/review-step.dto';
import { AllocatePlotDto } from './dto/allocate-plot.dto';
import {
  UploadCompanyDocumentDto,
  CreateContactDto,
  UpdateContactDto,
} from './dto/upload-document.dto';
import { JwtGuard } from '../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { ZoneGuard } from '../../common/guards/zone.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ZoneId } from '../../common/decorators/zone.decorator';
import { UserRole } from '@prisma/client';
import { successResponse } from '../../common/dto/response.dto';

@ApiTags('Companies')
@Controller('companies')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class CompaniesController {
  constructor(private readonly companyService: CompanyService) {}

  @Post()
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Register company' })
  async register(
    @Body() dto: RegisterCompanyDto,
    @CurrentUser('sub') registeredBy: string,
    @ZoneId() zoneId: string,
  ) {
    if (!dto.zoneId && zoneId) dto.zoneId = zoneId;
    const company = await this.companyService.register(dto, registeredBy);
    return successResponse(company);
  }

  @Get()
  @RequirePermission('companies.companies.list.view')
  @Roles(UserRole.ZONE_OPERATOR, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List companies' })
  async findAll(@Query() filter: FilterCompaniesDto, @ZoneId() zoneId: string) {
    if (!filter.zoneId && zoneId) filter.zoneId = zoneId;
    const result = await this.companyService.findAll(filter);
    return successResponse(result.data, result.meta);
  }

  @Get('expiring-documents')
  @RequirePermission('companies.companies.list.view')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get expiring documents' })
  async getExpiringDocuments(
    @ZoneId() zoneId: string,
    @Query('withinDays') withinDays?: string,
  ) {
    const docs = await this.companyService.getExpiringDocuments(
      zoneId,
      parseInt(withinDays || '30'),
    );
    return successResponse(docs);
  }

  @Get(':id')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'Get company detail' })
  async findOne(@Param('id') id: string, @ZoneId() zoneId: string) {
    const company = await this.companyService.findById(id, zoneId);
    return successResponse(company);
  }

  @Patch(':id')
  @RequirePermission('companies.companies.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.COMPANY_ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update company' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCompanyDto,
    @CurrentUser('sub') updatedBy: string,
  ) {
    const company = await this.companyService.update(id, dto, updatedBy);
    return successResponse(company);
  }

  // Onboarding
  @Get(':id/onboarding')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'Get onboarding status' })
  async getOnboarding(@Param('id') id: string) {
    const status = await this.companyService.getOnboardingStatus(id);
    return successResponse(status);
  }

  @Patch(':id/onboarding/review')
  @RequirePermission('companies.companies.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Review onboarding step' })
  async reviewStep(
    @Param('id') id: string,
    @Body() dto: ReviewOnboardingStepDto,
    @CurrentUser('sub') reviewedBy: string,
  ) {
    const company = await this.companyService.reviewOnboardingStep(id, dto, reviewedBy);
    return successResponse(company);
  }

  // Plot
  @Post(':id/plot')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Allocate plot' })
  async allocatePlot(
    @Param('id') id: string,
    @Body() dto: AllocatePlotDto,
    @CurrentUser('sub') allocatedBy: string,
  ) {
    dto.companyId = id;
    const company = await this.companyService.allocatePlot(dto, allocatedBy);
    return successResponse(company);
  }

  @Delete(':id/plot')
  @RequirePermission('companies.companies.list.delete')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deallocate plot' })
  async deallocatePlot(
    @Param('id') id: string,
    @CurrentUser('sub') deallocatedBy: string,
  ) {
    await this.companyService.deallocatePlot(id, deallocatedBy);
    return successResponse({ message: 'قطعه آزاد شد' });
  }

  // Lifecycle
  @Post(':id/suspend')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Suspend company' })
  async suspend(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') suspendedBy: string,
  ) {
    const company = await this.companyService.suspend(id, reason, suspendedBy);
    return successResponse(company);
  }

  @Post(':id/reactivate')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Reactivate company' })
  async reactivate(
    @Param('id') id: string,
    @CurrentUser('sub') reactivatedBy: string,
  ) {
    const company = await this.companyService.reactivate(id, reactivatedBy);
    return successResponse(company);
  }

  @Post(':id/terminate')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Terminate company' })
  async terminate(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') terminatedBy: string,
  ) {
    const company = await this.companyService.terminate(id, reason, terminatedBy);
    return successResponse(company);
  }

  // Documents
  @Get(':id/documents')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'List documents' })
  async getDocuments(
    @Param('id') id: string,
    @Query('type') type?: string,
    @Query('isVerified') isVerified?: string,
  ) {
    const docs = await this.companyService.getDocuments(id, {
      type,
      isVerified: isVerified ? isVerified === 'true' : undefined,
    });
    return successResponse(docs);
  }

  @Post(':id/documents')
  @RequirePermission('companies.companies.list.create')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload document' })
  async uploadDocument(
    @Param('id') id: string,
    @Body() dto: UploadCompanyDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') uploadedBy: string,
  ) {
    const doc = await this.companyService.uploadDocument(id, dto, file, uploadedBy);
    return successResponse(doc);
  }

  @Patch(':id/documents/:did/verify')
  @RequirePermission('companies.companies.list.update')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify document' })
  async verifyDocument(
    @Param('did') did: string,
    @Body('isVerified') isVerified: boolean,
    @Body('notes') notes: string,
    @CurrentUser('sub') verifiedBy: string,
  ) {
    const doc = await this.companyService.verifyDocument(did, isVerified, verifiedBy, notes);
    return successResponse(doc);
  }

  // Contacts
  @Get(':id/contacts')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'List contacts' })
  async getContacts(@Param('id') id: string) {
    const contacts = await this.companyService.getContacts(id);
    return successResponse(contacts);
  }

  @Post(':id/contacts')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add contact' })
  async addContact(@Param('id') id: string, @Body() dto: CreateContactDto) {
    const contact = await this.companyService.addContact(id, dto);
    return successResponse(contact);
  }

  @Patch(':id/contacts/:cid')
  @RequirePermission('companies.companies.list.update')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update contact' })
  async updateContact(@Param('cid') cid: string, @Body() dto: UpdateContactDto) {
    const contact = await this.companyService.updateContact(cid, dto);
    return successResponse(contact);
  }

  @Delete(':id/contacts/:cid')
  @RequirePermission('companies.companies.list.delete')
  @Roles(UserRole.COMPANY_ADMIN, UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete contact' })
  async deleteContact(@Param('cid') cid: string) {
    await this.companyService.deleteContact(cid);
    return successResponse({ message: 'مخاطب حذف شد' });
  }

  // Health Score
  @Get(':id/health-score')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'Get health score' })
  async getHealthScore(@Param('id') id: string) {
    const scores = await this.companyService.getHealthScoreHistory(id, 1);
    return successResponse(scores[0] || null);
  }

  @Post(':id/health-score/compute')
  @RequirePermission('companies.companies.list.create')
  @Roles(UserRole.ZONE_MANAGER, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Recompute health score' })
  async computeHealthScore(@Param('id') id: string) {
    const score = await this.companyService.computeHealthScore(id);
    return successResponse(score);
  }

  @Get(':id/health-score/history')
  @RequirePermission('companies.companies.list.view')
  @ApiOperation({ summary: 'Health score history' })
  async getHealthScoreHistory(
    @Param('id') id: string,
    @Query('months') months?: string,
  ) {
    const history = await this.companyService.getHealthScoreHistory(
      id,
      months ? parseInt(months) : undefined,
    );
    return successResponse(history);
  }
}
