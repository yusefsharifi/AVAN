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
import { BidService } from '../services/bid.service';
import { CreateBidDto, SubmitBidDto, FilterBidsDto } from '../dto/create-bid.dto';

@ApiTags('B2B - Bid Management')
@ApiBearerAuth()
@Controller('/b2b/bids')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class BidController {
  constructor(private readonly bidService: BidService) {}

  @Post()
  @RequirePermission('b2b.bid.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Create bid (as supplier)' })
  async create(
    @Body() dto: CreateBidDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.bidService.create(dto, userId);
    return { success: true, data };
  }

  @Get('my-bids')
  @RequirePermission('b2b.bid.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: "Get my company's bids" })
  async getMyBids(
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
    @Query() filter: FilterBidsDto,
  ) {
    const result = await this.bidService.getMyBids(userId, zoneId, filter);
    return { success: true, ...result };
  }

  @Get('rfq/:rfqId')
  @RequirePermission('b2b.bid.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get all bids for RFQ' })
  async getBidsForRfq(
    @Param('rfqId') rfqId: string,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string | undefined,
    @CurrentUser('companyId') companyId: string | undefined,
    @CurrentUser('role') role: string | undefined,
  ) {
    const data = await this.bidService.getBidsForRfq(rfqId, userId, { zoneId, companyId, role });
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('b2b.bid.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get bid detail' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string | undefined,
    @CurrentUser('companyId') companyId: string | undefined,
    @CurrentUser('role') role: string | undefined,
  ) {
    const data = await this.bidService.findById(id, userId, { zoneId, companyId, role });
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('b2b.bid.list.update')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Update bid (DRAFT only)' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateBidDto>,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.bidService.update(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/submit')
  @RequirePermission('b2b.bid.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Submit bid' })
  async submit(
    @Param('id') id: string,
    @Body() dto: SubmitBidDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.bidId = id;
    const data = await this.bidService.submit(dto, userId);
    return { success: true, data };
  }

  @Post(':id/attachments')
  @RequirePermission('b2b.bid.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to bid' })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.bidService.uploadBidAttachment(id, file, userId);
    return { success: true, data };
  }

  @Post(':id/withdraw')
  @RequirePermission('b2b.bid.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Withdraw bid' })
  async withdraw(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.bidService.withdraw(id, reason, userId);
    return { success: true, data };
  }
}
