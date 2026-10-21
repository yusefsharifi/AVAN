import { RequirePermission } from '../../../common/decorators/permissions.decorator';
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
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { ProductCatalogService } from '../services/product-catalog.service';
import { CreateProductCatalogDto } from '../dto/create-product.dto';

@ApiTags('B2B - Product Catalog')
@ApiBearerAuth()
@Controller('/b2b/catalog')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class CatalogController {
  constructor(private readonly catalogService: ProductCatalogService) {}

  @Post()
  @RequirePermission('b2b.catalog.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Add product to catalog' })
  async create(
    @Body() dto: CreateProductCatalogDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.catalogService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('b2b.catalog.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Browse catalog' })
  async search(
    @ZoneId() zoneId: string,
    @Query('search') query?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const data = await this.catalogService.search(zoneId, query || '', categoryId);
    return { success: true, data };
  }

  @Get('search')
  @RequirePermission('b2b.catalog.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Search products' })
  async searchProducts(
    @ZoneId() zoneId: string,
    @Query('q') query: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const data = await this.catalogService.search(zoneId, query, categoryId);
    return { success: true, data };
  }

  @Get('categories')
  @RequirePermission('b2b.catalog.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get category tree' })
  async getCategories(@ZoneId() zoneId: string) {
    const data = await this.catalogService.getCategoryTree(zoneId);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('b2b.catalog.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get marketplace stats' })
  async getStats(@ZoneId() zoneId: string) {
    const data = await this.catalogService.getMarketplaceStats(zoneId);
    return { success: true, data };
  }

  @Get('company/:companyId')
  @RequirePermission('b2b.catalog.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: "Get company's catalog" })
  async getCompanyCatalog(@Param('companyId') companyId: string) {
    const data = await this.catalogService.getByCompany(companyId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('b2b.catalog.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get product detail' })
  async findById(@Param('id') id: string) {
    const data = await this.catalogService.findById(id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('b2b.catalog.list.update')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update product' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateProductCatalogDto>,
  ) {
    const data = await this.catalogService.update(id, dto);
    return { success: true, data };
  }

  @Post(':id/images')
  @RequirePermission('b2b.catalog.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload product image' })
  async uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const data = await this.catalogService.uploadImage(id, file);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('b2b.catalog.list.delete')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Delete product' })
  async delete(@Param('id') id: string) {
    await this.catalogService.delete(id);
    return { success: true, message: 'Product deleted' };
  }
}
