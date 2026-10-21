import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { JwtGuard } from '../../../common/guards/jwt.guard';
// ═══════════════════════════════════════════════════════════════════════════════
// M7: Letter Controller — Full Correspondence API
// ═══════════════════════════════════════════════════════════════════════════════

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { LetterService } from '../services/letter.service';
import { CreateLetterDto } from '../dto/create-letter.dto';
import { CreateLetterFromTemplateDto } from '../dto/create-from-template.dto';
import { ApproveLetterStepDto } from '../dto/approve-step.dto';
import { DispatchLetterDto } from '../dto/dispatch-letter.dto';
import { FilterLettersDto } from '../dto/filter-letters.dto';
import { ReviseLetterDto } from '../dto/revise-letter.dto';
import { UpdateLetterDto } from '../dto/update-letter.dto';

@Controller('/letters')
@UseGuards(JwtGuard, PermissionsGuard)
export class LetterController {
  constructor(private readonly letterService: LetterService) {}

  @Post()
  @RequirePermission('correspondence.letter.list.create')
  async create(@Body() dto: CreateLetterDto, @Req() req: any) {
    return this.letterService.create(dto, req.user?.id || 'SYSTEM');
  }

  @Post('from-template')
  @RequirePermission('correspondence.letter.list.create')
  async createFromTemplate(@Body() dto: CreateLetterFromTemplateDto, @Req() req: any) {
    return this.letterService.createFromTemplate(dto, req.user?.id || 'SYSTEM');
  }

  @Get()
  @RequirePermission('correspondence.letter.list.view')
  async findAll(@Query() filter: FilterLettersDto) {
    return this.letterService.findAll(filter);
  }

  @Get('inbox')
  @RequirePermission('correspondence.letter.list.view')
  async getInbox(@Req() req: any, @Query() filter: FilterLettersDto) {
    return this.letterService.getInbox(req.user?.id, req.user?.zoneId, filter);
  }

  @Get('outbox')
  @RequirePermission('correspondence.letter.list.view')
  async getOutbox(@Req() req: any, @Query() filter: FilterLettersDto) {
    return this.letterService.getOutbox(req.user?.id, req.user?.zoneId, filter);
  }

  @Get('pending-approvals')
  @RequirePermission('correspondence.letter.list.view')
  async getPendingApprovals(@Req() req: any) {
    return this.letterService.getPendingApprovals(req.user?.id, req.user?.zoneId);
  }

  @Get('registry')
  @RequirePermission('correspondence.letter.list.view')
  async getRegistryBook(
    @Query('zoneId') zoneId: string,
    @Query('year') year: string,
    @Query('direction') direction?: string,
    @Query('type') type?: string,
    @Query('fromSeq') fromSeq?: string,
    @Query('toSeq') toSeq?: string,
  ) {
    return this.letterService.getRegistryBook(zoneId, parseInt(year), { direction: direction as any, type, fromSeq: fromSeq ? parseInt(fromSeq) : undefined, toSeq: toSeq ? parseInt(toSeq) : undefined });
  }

  @Get('registry/stats')
  @RequirePermission('correspondence.letter.list.view')
  async getRegistryStats(@Query('zoneId') zoneId: string, @Query('year') year: string) {
    return this.letterService.getRegistryStats(zoneId, parseInt(year));
  }

  @Get('sla-report')
  @RequirePermission('correspondence.letter.list.view')
  async getSlaReport(@Query('zoneId') zoneId: string, @Query('fromDate') fromDate: string, @Query('toDate') toDate: string) {
    return this.letterService.getSlaReport(zoneId, fromDate, toDate);
  }

  @Get('stats')
  @RequirePermission('correspondence.letter.list.view')
  async getLetterStats(@Query('zoneId') zoneId: string, @Query('companyId') companyId?: string) {
    return this.letterService.getLetterStats(zoneId, companyId);
  }

  @Get('verify')
  @RequirePermission('correspondence.letter.list.view')
  async verify(@Query('qrHash') qrHash: string) {
    return this.letterService.verifyByQrHash(qrHash);
  }

  @Get(':id')
  @RequirePermission('correspondence.letter.list.view')
  async findById(@Param('id') id: string, @Req() req: any) {
    return this.letterService.findById(id, req.user?.id);
  }

  @Post(':id/submit')
  @RequirePermission('correspondence.letter.list.create')
  async submit(@Param('id') id: string, @Req() req: any) {
    return this.letterService.submit(id, req.user?.id || 'SYSTEM');
  }

  @Patch(':id')
  @RequirePermission('correspondence.letter.list.update')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateLetterDto,
    @Req() req: any,
  ) {
    return this.letterService.update(id, dto, req.user?.id || 'SYSTEM');
  }

  @Delete(':id')
  @RequirePermission('correspondence.letter.list.delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.letterService.remove(id, req.user?.id || 'SYSTEM');
    return { success: true, data: null };
  }

  @Patch(':id/approve')
  @RequirePermission('correspondence.letter.list.update')
  async approveStep(@Param('id') id: string, @Body() dto: ApproveLetterStepDto, @Req() req: any) {
    return this.letterService.approveStep(id, dto, req.user?.id || 'SYSTEM');
  }

  @Post(':id/return')
  @RequirePermission('correspondence.letter.list.create')
  async returnForRevision(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.letterService.returnForRevision(id, reason, req.user?.id || 'SYSTEM');
  }

  @Post(':id/refer')
  @RequirePermission('correspondence.letter.list.create')
  async refer(@Param('id') id: string, @Body('toUserId') toUserId: string, @Body('note') note: string, @Req() req: any) {
    return this.letterService.refer(id, toUserId, note, req.user?.id || 'SYSTEM');
  }

  @Post(':id/dispatch')
  @RequirePermission('correspondence.letter.list.create')
  async dispatch(@Param('id') id: string, @Body() dto: DispatchLetterDto, @Req() req: any) {
    return this.letterService.dispatch(id, dto, req.user?.id || 'SYSTEM');
  }

  @Post(':id/archive')
  @RequirePermission('correspondence.letter.list.create')
  async archive(@Param('id') id: string, @Req() req: any) {
    return this.letterService.archive(id, req.user?.id || 'SYSTEM');
  }

  @Post(':id/cancel')
  @RequirePermission('correspondence.letter.list.create')
  async cancel(@Param('id') id: string, @Body('reason') reason: string, @Req() req: any) {
    return this.letterService.cancel(id, reason, req.user?.id || 'SYSTEM');
  }

  @Post(':id/revise')
  @RequirePermission('correspondence.letter.list.create')
  async revise(@Param('id') id: string, @Body() dto: ReviseLetterDto, @Req() req: any) {
    return this.letterService.revise(id, dto, req.user?.id || 'SYSTEM');
  }

  @Get(':id/versions')
  @RequirePermission('correspondence.letter.list.view')
  async getVersionHistory(@Param('id') id: string) {
    return this.letterService.getVersionHistory(id);
  }

  @Get(':id/versions/:v')
  @RequirePermission('correspondence.letter.list.view')
  async getVersion(@Param('id') id: string, @Param('v') version: string) {
    return this.letterService.getVersion(id, parseInt(version));
  }

  @Get(':id/pdf')
  @RequirePermission('correspondence.letter.list.view')
  async generatePdf(@Param('id') id: string) {
    return this.letterService.generateLetterPdf(id);
  }

  @Get(':id/qr-code')
  @RequirePermission('correspondence.letter.list.view')
  async generateQrCode(@Param('id') id: string) {
    return this.letterService.generateQrCode(id);
  }

  @Post(':id/attachments')
  @RequirePermission('correspondence.letter.list.create')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(
    @Param('id') id: string,
    @Body('type') type: string,
    @Body('title') title: string,
    @UploadedFile() file: Express.Multer.File,
    @Req() req: any,
  ) {
    return this.letterService.uploadAttachment(id, type, title, file, req.user?.id || 'SYSTEM');
  }

  @Delete(':id/attachments/:aid')
  @RequirePermission('correspondence.letter.list.delete')
  async deleteAttachment(@Param('id') id: string, @Param('aid') aid: string, @Req() req: any) {
    await this.letterService.deleteAttachment(aid, req.user?.id || 'SYSTEM');
    return { success: true };
  }

  @Post(':id/annotations')
  @RequirePermission('correspondence.letter.list.create')
  async addAnnotation(
    @Param('id') id: string,
    @Body('content') content: string,
    @Body('color') color: string,
    @Body('isPrivate') isPrivate: boolean,
    @Req() req: any,
  ) {
    return this.letterService.addAnnotation(id, content, color || 'YELLOW', isPrivate || false, req.user?.id || 'SYSTEM');
  }

  @Delete(':id/annotations/:anid')
  @RequirePermission('correspondence.letter.list.delete')
  async deleteAnnotation(@Param('id') id: string, @Param('anid') anid: string, @Req() req: any) {
    await this.letterService.deleteAnnotation(anid, req.user?.id || 'SYSTEM');
    return { success: true };
  }

  @Post(':id/star')
  @RequirePermission('correspondence.letter.list.create')
  async toggleStar(@Param('id') id: string, @Req() req: any) {
    return this.letterService.toggleStar(id, req.user?.id || 'SYSTEM');
  }

  @Post(':id/read')
  @RequirePermission('correspondence.letter.list.create')
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    await this.letterService.markAsRead(id, req.user?.id || 'SYSTEM');
    return { success: true };
  }
}
