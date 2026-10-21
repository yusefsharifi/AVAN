import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { SupplierProfileService } from '../services/supplier-profile.service';
import { UpdateSupplierProfileDto } from '../dto/create-product.dto';
import { SubmitBidReviewDto } from '../dto/evaluate-bid.dto';

@ApiTags('B2B - Supplier Management')
@ApiBearerAuth()
@Controller('/b2b/suppliers')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierProfileService) {}

  @Get()
  @RequirePermission('b2b.supplier.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'List suppliers' })
  async list(@ZoneId() zoneId: string) {
    // Return all active supplier profiles in the zone
    const suppliers = await this.supplierService.findSuppliersByCategory(zoneId, '');
    return { success: true, data: suppliers };
  }

  @Get('ranking')
  @RequirePermission('b2b.supplier.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get supplier ranking' })
  async getRanking(
    @ZoneId() zoneId: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const data = await this.supplierService.getRanking(zoneId, categoryId);
    return { success: true, data };
  }

  @Get('by-category/:categoryId')
  @RequirePermission('b2b.supplier.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get suppliers by category' })
  async getByCategory(
    @Param('categoryId') categoryId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.supplierService.findSuppliersByCategory(zoneId, categoryId);
    return { success: true, data };
  }

  @Get(':companyId')
  @RequirePermission('b2b.supplier.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get supplier profile' })
  async getProfile(@Param('companyId') companyId: string) {
    const data = await this.supplierService.getProfile(companyId);
    return { success: true, data };
  }

  @Patch('profile')
  @RequirePermission('b2b.supplier.list.update')
  @Roles('COMPANY_ADMIN', 'COMPANY_MANAGER')
  @ApiOperation({ summary: 'Update own supplier profile' })
  async updateProfile(
    @CurrentUser('companyId') companyId: string,
    @ZoneId() zoneId: string,
    @Body() dto: UpdateSupplierProfileDto,
  ) {
    const data = await this.supplierService.createOrUpdate(companyId, zoneId, dto);
    return { success: true, data };
  }

  @Get(':companyId/reviews')
  @RequirePermission('b2b.supplier.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get supplier reviews' })
  async getReviews(@Param('companyId') companyId: string) {
    const data = await this.supplierService.getReviews(companyId);
    return { success: true, data };
  }

  @Post('reviews')
  @RequirePermission('b2b.supplier.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Submit supplier review' })
  async submitReview(
    @Body() dto: SubmitBidReviewDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.supplierService.submitReview(dto, userId);
    return { success: true, data };
  }
}
