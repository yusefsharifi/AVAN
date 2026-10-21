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
import { RfqService } from '../services/rfq.service';
import {
  CreateRfqDto,
  UpdateRfqDto,
  PublishRfqDto,
  SubmitClarificationDto,
  AnswerClarificationDto,
  FilterRfqDto,
} from '../dto/create-rfq.dto';

@ApiTags('B2B - RFQ Management')
@ApiBearerAuth()
@Controller('/b2b/rfq')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class RfqController {
  constructor(private readonly rfqService: RfqService) {}

  @Post()
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Create RFQ' })
  async create(
    @Body() dto: CreateRfqDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.create(dto, userId);
    return { success: true, data };
  }

  @Get()
  @RequirePermission('b2b.rfq.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'List RFQs' })
  async findAll(
    @Query() filter: FilterRfqDto,
    @ZoneId() zoneId: string,
  ) {
    filter.zoneId = filter.zoneId || zoneId;
    const result = await this.rfqService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('marketplace')
  @RequirePermission('b2b.rfq.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Get open RFQs to bid on (marketplace)' })
  async marketplace(
    @CurrentUser('sub') userId: string,
    @ZoneId() zoneId: string,
    @Query() filter: FilterRfqDto,
  ) {
    filter.openForBidding = true;
    filter.zoneId = zoneId;
    const result = await this.rfqService.findForSupplier(userId, zoneId, filter);
    return { success: true, ...result };
  }

  @Get('stats')
  @RequirePermission('b2b.rfq.list.view')
  @Roles('ZONE_MANAGER')
  @ApiOperation({ summary: 'Get RFQ statistics' })
  async getStats(@ZoneId() zoneId: string) {
    const data = await this.rfqService.getRfqStats(zoneId);
    return { success: true, data };
  }

  @Get(':id')
  @RequirePermission('b2b.rfq.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR')
  @ApiOperation({ summary: 'Get RFQ by ID' })
  async findById(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.findById(id, userId);
    return { success: true, data };
  }

  @Patch(':id')
  @RequirePermission('b2b.rfq.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Update RFQ (DRAFT only)' })
  async update(
    @Param('id') id: string,
    // Step-4 TASK 6(c): this used to discard `dto` and re-read the row, so the
    // UI's "save" reported success without writing anything.
    @Body() dto: UpdateRfqDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.update(id, dto, userId);
    return { success: true, data };
  }

  @Post(':id/publish')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Publish RFQ' })
  async publish(
    @Param('id') id: string,
    @Body() dto: PublishRfqDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.rfqId = id;
    const data = await this.rfqService.publish(dto, userId);
    return { success: true, data };
  }

  @Post(':id/close')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Close RFQ manually' })
  async close(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.close(id, userId);
    return { success: true, data };
  }

  @Post(':id/cancel')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Cancel RFQ' })
  async cancel(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.cancel(id, reason, userId);
    return { success: true, data };
  }

  @Post(':id/reopen')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Reopen/extend RFQ deadline' })
  async reopen(
    @Param('id') id: string,
    @Body('newDeadline') newDeadline: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.reopen(id, new Date(newDeadline), reason);
    return { success: true, data };
  }

  @Post(':id/next-round')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Start next round of bidding' })
  async nextRound(
    @Param('id') id: string,
    @Body('message') message: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.requestNextRound(id, message, userId);
    return { success: true, data };
  }

  @Post(':id/attachments')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload attachment to RFQ' })
  async uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.rfqService.uploadAttachment(id, file, userId);
    return { success: true, data };
  }

  @Get(':id/clarifications')
  @RequirePermission('b2b.rfq.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'List clarifications for RFQ' })
  async getClarifications(@Param('id') id: string) {
    const data = await this.rfqService.getClarifications(id);
    return { success: true, data };
  }

  @Post(':id/clarifications')
  @RequirePermission('b2b.rfq.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Submit clarification question' })
  async submitClarification(
    @Param('id') id: string,
    @Body() dto: SubmitClarificationDto,
    @CurrentUser('sub') userId: string,
    @CurrentUser('companyId') companyId: string,
  ) {
    dto.rfqId = id;
    const data = await this.rfqService.submitClarification(dto, userId, companyId);
    return { success: true, data };
  }

  @Patch(':id/clarifications/:cid')
  @RequirePermission('b2b.rfq.list.update')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Answer clarification question' })
  async answerClarification(
    @Param('cid') cid: string,
    @Body() dto: AnswerClarificationDto,
    @CurrentUser('sub') userId: string,
  ) {
    dto.clarificationId = cid;
    const data = await this.rfqService.answerClarification(dto, userId);
    return { success: true, data };
  }
}
