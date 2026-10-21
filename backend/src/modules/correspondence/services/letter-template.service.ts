// ═══════════════════════════════════════════════════════════════════════════════
// M7: Letter Template Service — Template Management & Variable Resolution
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { REDIS_KEYS, REDIS_TTL } from '../../../common/utils/redis-keys';
import { CreateLetterTemplateDto, UpdateLetterTemplateDto } from '../dto/create-template.dto';

@Injectable()
export class LetterTemplateService {
  private readonly logger = new Logger(LetterTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async findAll(zoneId?: string, category?: string): Promise<any[]> {
    const where: any = { isActive: true };
    if (category) where.category = category;
    if (zoneId) {
      where.OR = [{ zoneId }, { zoneId: null }];
    }

    return this.prisma.letterTemplate.findMany({
      where,
      orderBy: { code: 'asc' },
    });
  }

  async findByCode(code: string, zoneId?: string): Promise<any> {
    // Check zone-specific first
    if (zoneId) {
      const zoneTemplate = await this.prisma.letterTemplate.findFirst({
        where: { code, zoneId, isActive: true },
      });
      if (zoneTemplate) return zoneTemplate;
    }

    // Fall back to global
    const template = await this.prisma.letterTemplate.findFirst({
      where: { code, zoneId: null, isActive: true },
    });
    if (!template) throw new NotFoundException('قالب نامه یافت نشد');
    return template;
  }

  async create(dto: CreateLetterTemplateDto, createdBy: string): Promise<any> {
    const existing = await this.prisma.letterTemplate.findUnique({ where: { code: dto.code } });
    if (existing) throw new BadRequestException('کد قالب تکراری است');

    return this.prisma.letterTemplate.create({
      data: {
        zoneId: dto.zoneId || null,
        code: dto.code,
        nameFa: dto.nameFa,
        descriptionFa: dto.descriptionFa || null,
        category: dto.category as any,
        direction: dto.direction as any,
        type: dto.type as any,
        classification: (dto.classification || 'UNCLASSIFIED') as any,
        priority: (dto.priority || 'NORMAL') as any,
        subjectTemplate: dto.subjectTemplate,
        bodyTemplate: dto.bodyTemplate,
        salutationTemplate: dto.salutationTemplate || null,
        closingTemplate: dto.closingTemplate || null,
        variables: dto.variables as any,
        defaultSlaHours: dto.defaultSlaHours || 72,
        approvalChainTemplate: dto.approvalChainTemplate as any,
        autoTrigger: dto.autoTrigger as any || null,
        tags: dto.tags || [],
        isActive: true,
        usageCount: 0,
        createdBy,
      },
    });
  }

  async update(id: string, dto: UpdateLetterTemplateDto): Promise<any> {
    const template = await this.prisma.letterTemplate.findUnique({ where: { id } });
    if (!template) throw new NotFoundException('قالب نامه یافت نشد');

    const updateData: any = {};
    if (dto.nameFa !== undefined) updateData.nameFa = dto.nameFa;
    if (dto.descriptionFa !== undefined) updateData.descriptionFa = dto.descriptionFa;
    if (dto.subjectTemplate !== undefined) updateData.subjectTemplate = dto.subjectTemplate;
    if (dto.bodyTemplate !== undefined) updateData.bodyTemplate = dto.bodyTemplate;
    if (dto.salutationTemplate !== undefined) updateData.salutationTemplate = dto.salutationTemplate;
    if (dto.closingTemplate !== undefined) updateData.closingTemplate = dto.closingTemplate;
    if (dto.variables !== undefined) updateData.variables = dto.variables;
    if (dto.defaultSlaHours !== undefined) updateData.defaultSlaHours = dto.defaultSlaHours;
    if (dto.approvalChainTemplate !== undefined) updateData.approvalChainTemplate = dto.approvalChainTemplate;
    if (dto.autoTrigger !== undefined) updateData.autoTrigger = dto.autoTrigger;
    if (dto.tags !== undefined) updateData.tags = dto.tags;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    return this.prisma.letterTemplate.update({ where: { id }, data: updateData });
  }

  resolveVariables(
    template: any,
    variables: Record<string, string>,
    context?: { company?: any; permit?: any; waybill?: any; currentUser?: any },
  ): { subject: string; body: string; salutation?: string; closing?: string } {
    let subject = template.subjectTemplate;
    let body = template.bodyTemplate;
    let salutation = template.salutationTemplate;
    let closing = template.closingTemplate;

    const allVars = { ...variables };

    // Auto-resolve from context
    if (context?.company) {
      allVars.company_name = allVars.company_name || context.company.nameFa;
      allVars.company_phone = allVars.company_phone || context.company.phone;
    }
    if (context?.permit) {
      allVars.permit_number = allVars.permit_number || context.permit.permitNumber;
      allVars.permit_type = allVars.permit_type || context.permit.type;
    }

    // Resolve date variables
    for (const v of template.variables as any[]) {
      if (!allVars[v.key]) {
        if (v.source === 'date') {
          allVars[v.key] = new Date().toLocaleDateString('fa-IR');
        } else if (v.defaultValue) {
          allVars[v.key] = v.defaultValue;
        }
      }
    }

    // Replace all {{variable}} placeholders
    for (const [key, value] of Object.entries(allVars)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      subject = subject.replace(regex, value || `{{${key}}}`);
      body = body.replace(regex, value || `{{${key}}}`);
      if (salutation) salutation = salutation.replace(regex, value || `{{${key}}}`);
      if (closing) closing = closing.replace(regex, value || `{{${key}}}`);
    }

    return { subject, body, salutation, closing };
  }

  async previewTemplate(code: string, variables: Record<string, string>, zoneId: string): Promise<any> {
    const template = await this.findByCode(code, zoneId);
    return this.resolveVariables(template, variables);
  }

  async seedDefaultTemplates(zoneId?: string): Promise<{ created: number; skipped: number }> {
    const templates = this.getDefaultTemplates();
    let created = 0;
    let skipped = 0;

    for (const tpl of templates) {
      const existing = await this.prisma.letterTemplate.findUnique({ where: { code: tpl.code } });
      if (existing) {
        skipped++;
        continue;
      }

      await this.prisma.letterTemplate.create({
        data: {
          ...tpl,
          zoneId: zoneId || null,
          createdBy: 'SYSTEM',
        } as any,
      });
      created++;
    }

    return { created, skipped };
  }

  private getDefaultTemplates(): any[] {
    return [
      {
        code: 'PERMIT_REQUEST',
        nameFa: 'درخواست مجوز',
        descriptionFa: 'نامه درخواست مجوز برای شرکت‌ها',
        category: 'PERMIT',
        direction: 'OUTGOING',
        type: 'REQUEST',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'درخواست {{permit_type}} — {{company_name}}',
        bodyTemplate: `با سلام و احترام،

بدینوسیله درخواست صدور مجوز {{permit_type}} برای شرکت {{company_name}} به شماره ثبت {{company_registration}} تقدیم می‌گردد.

مشخصات درخواست:
- نوع مجوز: {{permit_type}}
- تاریخ شروع: {{requested_from}}
- تاریخ پایان: {{requested_until}}
- محل اجرا: {{location}}

خواهشمند است دستور فرمایید بررسی‌های لازم انجام شود.

با تشکر`,
        salutationTemplate: 'جناب آقای مدیر شهرک صنعتی',
        closingTemplate: 'با احترام',
        variables: [
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'company_registration', labelFa: 'شماره ثبت', source: 'company', sourcePath: 'registrationNumber' },
          { key: 'permit_type', labelFa: 'نوع مجوز', source: 'manual' },
          { key: 'requested_from', labelFa: 'تاریخ شروع', source: 'manual' },
          { key: 'requested_until', labelFa: 'تاریخ پایان', source: 'manual' },
          { key: 'location', labelFa: 'محل اجرا', source: 'manual' },
        ],
        defaultSlaHours: 72,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'بررسی اولیه', roleFa: 'کارشناس', type: 'REVIEWER', isRequired: true, slaDays: 2 },
          { stepOrder: 1, stepName: 'تأیید مدیر', roleFa: 'مدیر', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['مجوز', 'درخواست'],
      },
      {
        code: 'PERMIT_ISSUED',
        nameFa: 'ابلاغ صدور مجوز',
        descriptionFa: 'نامه ابلاغ صدور مجوز',
        category: 'PERMIT',
        direction: 'OUTGOING',
        type: 'NOTIFICATION',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'ابلاغ صدور {{permit_type}} شماره {{permit_number}}',
        bodyTemplate: `با سلام،

به استحضار می‌رسد مجوز {{permit_type}} به شماره {{permit_number}} برای شرکت {{company_name}} صادر گردید.

مشخصات مجوز:
- شماره مجوز: {{permit_number}}
- نوع: {{permit_type}}
- تاریخ شروع اعتبار: {{valid_from}}
- تاریخ پایان اعتبار: {{valid_until}}

شرایط و مقررات:
{{conditions_summary}}

خواهشمند است مراتب را به اطلاع مسئولین ذی‌ربط برسانید.`,
        variables: [
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'permit_number', labelFa: 'شماره مجوز', source: 'manual' },
          { key: 'permit_type', labelFa: 'نوع مجوز', source: 'manual' },
          { key: 'valid_from', labelFa: 'تاریخ شروع', source: 'manual' },
          { key: 'valid_until', labelFa: 'تاریخ پایان', source: 'manual' },
          { key: 'conditions_summary', labelFa: 'شرایط', source: 'manual' },
        ],
        defaultSlaHours: 24,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['مجوز', 'ابلاغ'],
      },
      {
        code: 'PERMIT_REJECTED',
        nameFa: 'رد درخواست مجوز',
        descriptionFa: 'نامه رد درخواست مجوز',
        category: 'PERMIT',
        direction: 'OUTGOING',
        type: 'RESPONSE',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'رد درخواست {{permit_type}} — {{company_name}}',
        bodyTemplate: `با سلام،

درخواست مجوز {{company_name}} مورد بررسی قرار گرفت و متأسفانه به دلایل زیر رد می‌گردد:

دلیل رد: {{rejection_reason}}

خواهشمند است در صورت تمایل، پس از رفع موارد اعلام شده، مجدداً اقدام فرمایید.`,
        variables: [
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'permit_type', labelFa: 'نوع مجوز', source: 'manual' },
          { key: 'rejection_reason', labelFa: 'دلیل رد', source: 'manual' },
        ],
        defaultSlaHours: 24,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['مجوز', 'رد'],
      },
      {
        code: 'WAYBILL_APPROVED',
        nameFa: 'تأییدیه بارنامه',
        descriptionFa: 'نامه تأییدیه بارنامه',
        category: 'WAYBILL',
        direction: 'OUTGOING',
        type: 'NOTIFICATION',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'تأییدیه بارنامه {{waybill_number}}',
        bodyTemplate: `با سلام،

بارنامه شماره {{waybill_number}} برای محموله {{cargo_description}} تأیید گردید.

مشخصات:
- شماره بارنامه: {{waybill_number}}
- نوع محموله: {{cargo_category}}
- وزن خالص: {{net_weight}} تن
- پلاک خودرو: {{vehicle_plate}}

خواهشمند است هماهنگی‌های لازم برای ترخیص انجام شود.`,
        variables: [
          { key: 'waybill_number', labelFa: 'شماره بارنامه', source: 'manual' },
          { key: 'cargo_description', labelFa: 'توضیحات محموله', source: 'manual' },
          { key: 'cargo_category', labelFa: 'دسته محموله', source: 'manual' },
          { key: 'net_weight', labelFa: 'وزن خالص', source: 'manual' },
          { key: 'vehicle_plate', labelFa: 'پلاک خودرو', source: 'manual' },
        ],
        defaultSlaHours: 24,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر لجستیک', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['بارنامه', 'تأیید'],
      },
      {
        code: 'VISITOR_INVITATION',
        nameFa: 'دعوتنامه بازدید',
        descriptionFa: 'نامه دعوت برای بازدید VIP',
        category: 'VISITOR',
        direction: 'OUTGOING',
        type: 'INVITATION',
        classification: 'CONFIDENTIAL',
        priority: 'URGENT',
        subjectTemplate: 'دعوتنامه بازدید — {{visitor_name}}',
        bodyTemplate: `با سلام و احترام،

ضمن عرض ادب، از جنابعالی دعوت به عمل می‌آید از {{company_name}} جهت بازدید از شهرک صنعتی در تاریخ {{visit_date}} ساعت {{visit_time}} حضور بهم رسانید.

محل ملاقات: {{meeting_point}}
نام میزبان: {{host_name}}
شماره تماس: {{host_phone}}

لطفاً کارت شناسایی معتبر به همراه داشته باشید.`,
        variables: [
          { key: 'visitor_name', labelFa: 'نام بازدیدکننده', source: 'manual' },
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'visit_date', labelFa: 'تاریخ بازدید', source: 'manual' },
          { key: 'visit_time', labelFa: 'ساعت بازدید', source: 'manual' },
          { key: 'meeting_point', labelFa: 'محل ملاقات', source: 'manual' },
          { key: 'host_name', labelFa: 'نام میزبان', source: 'user' },
          { key: 'host_phone', labelFa: 'تلفن میزبان', source: 'user' },
        ],
        defaultSlaHours: 12,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['بازدید', 'دعوت'],
      },
      {
        code: 'COMPANY_WELCOME',
        nameFa: 'نامه خوش‌آمد',
        descriptionFa: 'نامه خوش‌آمدگویی به شرکت جدید',
        category: 'ONBOARDING',
        direction: 'OUTGOING',
        type: 'NOTIFICATION',
        classification: 'UNCLASSIFIED',
        priority: 'NORMAL',
        subjectTemplate: 'خوش آمدید — {{company_name}}',
        bodyTemplate: `با سلام و تبریک،

بدینوسیله عضویت شرکت {{company_name}} در شهرک صنعتی {{zone_name}} تأیید و فعال گردید.

اطلاعات مهم:
- شماره ثبت: {{company_registration}}
- شناسه ملی: {{national_id}}
- قطعه اختصاصی: {{plot_code}}

خواهشمند است جهت دریافت راهنمای کامل، با دفتر مدیریت شهرک تماس حاصل فرمایید.

با آرزوی موفقیت`,
        variables: [
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'zone_name', labelFa: 'نام شهرک', source: 'date' },
          { key: 'company_registration', labelFa: 'شماره ثبت', source: 'company', sourcePath: 'registrationNumber' },
          { key: 'national_id', labelFa: 'شناسه ملی', source: 'company', sourcePath: 'nationalId' },
          { key: 'plot_code', labelFa: 'کد قطعه', source: 'manual' },
        ],
        defaultSlaHours: 24,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر شهرک', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['خوش‌آمد', 'عضویت'],
      },
      {
        code: 'COLLECTION_REMINDER',
        nameFa: 'یادآوری پرداخت',
        descriptionFa: 'نامه یادآوری پرداخت مطالبات',
        category: 'COLLECTION',
        direction: 'OUTGOING',
        type: 'WARNING',
        classification: 'UNCLASSIFIED',
        priority: 'URGENT',
        subjectTemplate: 'یادآوری پرداخت — {{company_name}}',
        bodyTemplate: `با سلام،

به استحضار می‌رسد مبلغ {{amount}} ریال بابت {{description}} از شرکت {{company_name}} معوق می‌باشد.

تعداد روزهای تأخیر: {{days_overdue}} روز

خواهشمند است نسبت به تسویه حساب در اسرع وقت اقدام فرمایید.`,
        variables: [
          { key: 'company_name', labelFa: 'نام شرکت', source: 'company' },
          { key: 'amount', labelFa: 'مبلغ', source: 'manual' },
          { key: 'description', labelFa: 'توضیحات', source: 'manual' },
          { key: 'days_overdue', labelFa: 'روزهای تأخیر', source: 'manual' },
        ],
        defaultSlaHours: 48,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید', roleFa: 'مدیر مالی', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['مالی', 'یادآوری'],
      },
      {
        code: 'HSE_CORRECTIVE_ACTION',
        nameFa: 'ابلاغ اقدام اصلاحی',
        descriptionFa: 'نامه ابلاغ اقدام اصلاحی HSE',
        category: 'HSE',
        direction: 'OUTGOING',
        type: 'INSTRUCTION',
        classification: 'CONFIDENTIAL',
        priority: 'URGENT',
        subjectTemplate: 'ابلاغ اقدام اصلاحی — حادثه {{incident_number}}',
        bodyTemplate: `با سلام،

در پی گزارش حادثه شماره {{incident_type}} در محل {{location}}، اقدامات اصلاحی زیر ابلاغ می‌گردد:

اقدامات اصلاحی:
{{corrective_actions}}

مهلت اجرا: {{due_date}}

خواهشمند است ظرف مهلت تعیین شده، اقدامات لازم را انجام و گزارش مستند ارسال نمایید.`,
        variables: [
          { key: 'incident_number', labelFa: 'شماره حادثه', source: 'manual' },
          { key: 'incident_type', labelFa: 'نوع حادثه', source: 'manual' },
          { key: 'location', labelFa: 'محل', source: 'manual' },
          { key: 'corrective_actions', labelFa: 'اقدامات اصلاحی', source: 'manual' },
          { key: 'due_date', labelFa: 'مهلت', source: 'manual' },
        ],
        defaultSlaHours: 24,
        approvalChainTemplate: [
          { stepOrder: 0, stepName: 'تأیید HSE', roleFa: 'مسئول HSE', type: 'APPROVER', isRequired: true, slaDays: 1 },
        ],
        tags: ['HSE', 'ایمنی'],
      },
    ];
  }
}
