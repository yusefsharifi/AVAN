import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { CommercialPartyService } from '../services/commercial-party.service';
import { CreateCommercialPartyDto } from '../dto/create-dtos';

@ApiTags('Commercial - Parties')
@ApiBearerAuth()
@Controller('/commercial/parties')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class PartyController {
  constructor(private readonly partyService: CommercialPartyService) {}

  @Post()
  @RequirePermission('commercial.party.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Add party' })
  async create(@Body() dto: CreateCommercialPartyDto, @CurrentUser('sub') userId: string) {
    const data = await this.partyService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('commercial.party.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List parties' })
  async findAll(@ZoneId() zoneId: string, @Query() filter: any) {
    const data = await this.partyService.findAll(zoneId, filter);
    return { success: true, data };
  }

  @Get('ranking')
  @RequirePermission('commercial.party.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Party ranking' })
  async getRanking(@ZoneId() zoneId: string, @Query('type') type?: string) {
    const data = await this.partyService.getRanking(zoneId, type);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('commercial.party.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get party detail + profile' })
  async findById(@Param('id') id: string, @ZoneId() zoneId: string) {
    const data = await this.partyService.getPartyProfile(id, zoneId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('commercial.party.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update party' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateCommercialPartyDto>,
  ) {
    const data = await this.partyService.update(id, dto);
    return { success: true, data };
  }

  @Post(':id/credit-limit')
  @RequirePermission('commercial.party.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Update credit limit' })
  async updateCreditLimit(
    @Param('id') id: string,
    @Body('limit') limit: number,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.partyService.updateCreditLimit(id, limit, userId);
    return { success: true, data };
  }

  @Post(':id/blacklist')
  @RequirePermission('commercial.party.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Blacklist party' })
  async blacklist(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.partyService.blacklist(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/unblacklist')
  @RequirePermission('commercial.party.list.create')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Unblacklist party' })
  async unblacklist(@Param('id') id: string, @CurrentUser('sub') userId: string) {
    const data = await this.partyService.unblacklist(id, userId);
    return { success: true, data };
  }

  @Post(':id/check-credit')
  @RequirePermission('commercial.party.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Check credit limit' })
  async checkCredit(@Param('id') id: string, @Body('amount') amount: number) {
    const data = await this.partyService.checkCreditLimit(id, amount);
    return { success: true, data };
  }
}
