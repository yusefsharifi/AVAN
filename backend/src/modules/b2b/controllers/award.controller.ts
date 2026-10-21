import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
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
import { AwardService } from '../services/award.service';
import { AwardRfqDto } from '../dto/evaluate-bid.dto';

@ApiTags('B2B - Award Management')
@ApiBearerAuth()
@Controller('/b2b/award')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AwardController {
  constructor(private readonly awardService: AwardService) {}

  @Post()
  @RequirePermission('b2b.award.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Award RFQ to winning bid' })
  async award(
    @Body() dto: AwardRfqDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.awardService.award(dto, userId);
    return { success: true, data };
  }

  @Post('rescind')
  @RequirePermission('b2b.award.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Rescind/cancel an award' })
  async rescind(
    @Body('rfqId') rfqId: string,
    @Body('reason') reason: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.awardService.rescindAward(rfqId, reason, userId);
    return { success: true, data };
  }

  @Post('dispute')
  @RequirePermission('b2b.award.list.create')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN')
  @ApiOperation({ summary: 'Dispute award decision' })
  async dispute(
    @Body('rfqId') rfqId: string,
    @Body('disputeNote') disputeNote: string,
    @Body('disputedBidId') disputedBidId: string,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.awardService.handleDispute(rfqId, disputeNote, userId, disputedBidId);
    return { success: true, data };
  }

  @Get('history')
  @RequirePermission('b2b.award.list.view')
  @Roles('COMPANY_STAFF', 'COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get award history' })
  async getHistory(
    @ZoneId() zoneId: string,
    @CurrentUser('companyId') companyId?: string,
  ) {
    const data = await this.awardService.getAwardHistory(zoneId, companyId);
    return { success: true, data };
  }

  @Post('rejection-letters/:rfqId')
  @RequirePermission('b2b.award.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Generate and send rejection letters' })
  async sendRejectionLetters(@Param('rfqId') rfqId: string) {
    await this.awardService.generateRejectionLetters(rfqId);
    return { success: true, message: 'Rejection letters queued for generation' };
  }
}
