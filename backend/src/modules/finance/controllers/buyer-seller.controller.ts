import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { ResolveZoneId } from '../../../common/decorators/resolve-zone.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { BuyerSellerService } from '../services/buyer-seller.service';
import { CreateBuyerSellerDto, UpdateBuyerSellerDto } from '../dto/buyer-seller.dto';

/**
 * Buyer/seller (counterparty) register (Step 6 / TASK C — R5).
 *
 * Zone scoping: writes resolve the zone (`@ResolveZoneId()`), reads are scoped
 * to the session zone for zone users and global for a SUPER_ADMIN.
 */
@ApiTags('Finance - Buyers and Sellers')
@ApiBearerAuth()
@Controller('/finance/buyer-sellers')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
@Roles('ZONE_MANAGER')
export class BuyerSellerController {
  constructor(private readonly buyerSellerService: BuyerSellerService) {}

  @Post()
  @RequirePermission('finance.parties.buyer-sellers.create')
  @ApiOperation({ summary: 'Create buyer/seller' })
  async create(@ResolveZoneId() zoneId: string, @Body() dto: CreateBuyerSellerDto) {
    const data = await this.buyerSellerService.create(zoneId, dto);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('finance.parties.buyer-sellers.view')
  @ApiOperation({ summary: 'List buyers/sellers' })
  @ApiQuery({ name: 'zoneId', required: false })
  async findAll(@ZoneId() zoneId: string) {
    const data = await this.buyerSellerService.findAll(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('finance.parties.buyer-sellers.view')
  @ApiOperation({ summary: 'Get one buyer/seller' })
  @ApiParam({ name: 'id' })
  async findOne(@ZoneId() zoneId: string, @Param('id') id: string) {
    const data = await this.buyerSellerService.findOne(zoneId, id);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('finance.parties.buyer-sellers.update')
  @ApiOperation({ summary: 'Update buyer/seller' })
  @ApiParam({ name: 'id' })
  async update(
    @ResolveZoneId() zoneId: string,
    @Param('id') id: string,
    @Body() dto: UpdateBuyerSellerDto,
  ) {
    const data = await this.buyerSellerService.update(zoneId, id, dto);
    return { success: true, data };
  }

  @Delete(':id')
  @RequirePermission('finance.parties.buyer-sellers.delete')
  @ApiOperation({ summary: 'Delete buyer/seller' })
  @ApiParam({ name: 'id' })
  async remove(@ResolveZoneId() zoneId: string, @Param('id') id: string) {
    await this.buyerSellerService.remove(zoneId, id);
    return { success: true, data: null };
  }
}
