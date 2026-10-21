import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { BidEvaluationService } from '../services/bid-evaluation.service';
import { EvaluateBidDto } from '../dto/evaluate-bid.dto';

@ApiTags('B2B - Bid Evaluation')
@ApiBearerAuth()
@Controller('/b2b/evaluation')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class EvaluationController {
  constructor(private readonly evaluationService: BidEvaluationService) {}

  @Post('evaluate')
  @RequirePermission('b2b.evaluation.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Score a bid manually' })
  async evaluateBid(
    @Body() dto: EvaluateBidDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.evaluationService.evaluateBid(dto, userId);
    return { success: true, data };
  }

  @Post('auto-evaluate/:rfqId')
  @RequirePermission('b2b.evaluation.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Auto-score all bids for RFQ' })
  async autoEvaluate(@Param('rfqId') rfqId: string) {
    const data = await this.evaluationService.autoEvaluate(rfqId);
    return { success: true, data };
  }

  @Post('shortlist')
  @RequirePermission('b2b.evaluation.list.create')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Shortlist selected bids' })
  async shortlist(
    @Body('rfqId') rfqId: string,
    @Body('bidIds') bidIds: string[],
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.evaluationService.shortlistBids(rfqId, bidIds, userId);
    return { success: true, data };
  }

  @Get('comparison/:rfqId')
  @RequirePermission('b2b.evaluation.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Get side-by-side bid comparison' })
  async getComparison(@Param('rfqId') rfqId: string) {
    const data = await this.evaluationService.getComparisonTable(rfqId);
    return { success: true, data };
  }

  @Get('report/:rfqId')
  @RequirePermission('b2b.evaluation.list.view')
  @Roles('COMPANY_MANAGER', 'COMPANY_ADMIN', 'ZONE_MANAGER')
  @ApiOperation({ summary: 'Generate PDF evaluation report' })
  async getReport(
    @Param('rfqId') rfqId: string,
    @Res() res: Response,
  ) {
    const { reportKey } = await this.evaluationService.getEvaluationReport(rfqId);
    return res.json({ success: true, data: { reportKey } });
  }
}
