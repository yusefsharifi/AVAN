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
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ZoneId } from '../../../common/decorators/zone.decorator';
import { PermitRequestService } from '../services/permit-request.service';
import { CreatePermitRequestDto } from '../dto/create-permit-request.dto';
import { ReviewPermitStepDto } from '../dto/review-permit-step.dto';
import { FilterPermitRequestsDto } from '../dto/filter-permits.dto';

@ApiTags('Permit Requests')
@ApiBearerAuth()
@Controller('/permit-requests')
@UseGuards(JwtGuard, RolesGuard, ZoneGuard, PermissionsGuard)
export class PermitRequestController {
  constructor(private readonly permitRequestService: PermitRequestService) {}

  @Post()
  @RequirePermission('permits.permit-request.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Create permit request' })
  async create(
    @Body() dto: CreatePermitRequestDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.permitRequestService.create({ ...dto, zoneId }, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('permits.permit-request.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER', 'COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List permit requests' })
  async findAll(
    @Query() filter: FilterPermitRequestsDto,
    @ZoneId() zoneId: string,
  ) {
    const result = await this.permitRequestService.findAll({ ...filter, zoneId });
    return { success: true, ...result };
  }

  @Get('pending-review')
  @RequirePermission('permits.permit-request.list.view')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get pending reviews for current user' })
  async getPendingReviews(
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.permitRequestService.getPendingReviews(userId, zoneId);
    return { success: true, data };
  }

  @Get('stats')
  @RequirePermission('permits.permit-request.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get permit request statistics' })
  async getStats(@ZoneId() zoneId: string) {
    const data = await this.permitRequestService.getStats(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('permits.permit-request.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Get permit request by ID' })
  async findById(
    @Param('id') id: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.permitRequestService.findById(id, zoneId);
    return { success: true, data };
  }

  @Post(':id/submit')
  @RequirePermission('permits.permit-request.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Submit draft permit for review' })
  async submit(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.permitRequestService.submit(id, userId);
    return { success: true, data };
  }

  @Patch(':id/review')
  @RequirePermission('permits.permit-request.list.update')
  @Roles('ZONE_OPERATOR', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Review a permit step' })
  async reviewStep(
    @Param('id') id: string,
    @Body() dto: ReviewPermitStepDto,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
  ) {
    const data = await this.permitRequestService.reviewStep(id, dto, userId, zoneId);
    return { success: true, data };
  }

  @Post(':id/withdraw')
  @RequirePermission('permits.permit-request.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Withdraw permit request' })
  async withdraw(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.permitRequestService.withdraw(id, userId);
    return { success: true, data };
  }
}
