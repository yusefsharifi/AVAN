import { NotificationModule, NotificationPriority } from '@prisma/client';

export interface NotifyPayload {
  module: NotificationModule;
  eventType: string;
  priority?: NotificationPriority;
  zoneId?: string;
  companyId?: string;
  recipientId?: string;
  recipientRole?: string;
  recipientGroupId?: string;
  titleFa: string;
  bodyFa?: string;
  entityType?: string;
  entityId?: string;
  actionUrl?: string;
  actionLabelFa?: string;
  metadata?: Record<string, unknown>;
  templateCode?: string;
  templateVariables?: Record<string, string>;
}

// Global notification helper — all modules import and use this
// The actual send() call is injected at runtime via the NotificationHubService
let hubSendFn: (dto: NotifyPayload) => Promise<void> = async () => {};

export function setNotificationSender(fn: (dto: NotifyPayload) => Promise<void>): void {
  hubSendFn = fn;
}

async function send(payload: NotifyPayload): Promise<void> {
  return hubSendFn(payload);
}

export const notify = {
  // ─── Permit Events ───────────────────────────────────────────────────────────
  permitIssued: (permit: any) =>
    send({
      module: 'PERMIT',
      eventType: 'permit.issued',
      priority: 'NORMAL',
      zoneId: permit.zoneId,
      companyId: permit.companyId,
      recipientRole: 'COMPANY_ADMIN',
      titleFa: 'مجوز صادر شد',
      bodyFa: `مجوز شماره ${permit.permitNumber} صادر شد`,
      entityType: 'PERMIT',
      entityId: permit.id,
      templateCode: 'PERMIT_ISSUED_SMS',
      templateVariables: { permitNumber: permit.permitNumber, permitType: permit.type },
    }),

  permitExpiring: (permit: any, daysRemaining: number) =>
    send({
      module: 'PERMIT',
      eventType: 'permit.expiry',
      priority: daysRemaining <= 7 ? 'HIGH' : 'NORMAL',
      zoneId: permit.zoneId,
      companyId: permit.companyId,
      recipientRole: 'COMPANY_ADMIN',
      titleFa: `هشدار انقضای مجوز — ${daysRemaining} روز باقیمانده`,
      bodyFa: `مجوز ${permit.type} شما در ${daysRemaining} روز منقضی می‌شود`,
      entityType: 'PERMIT',
      entityId: permit.id,
      templateCode: 'PERMIT_EXPIRY_SMS',
      templateVariables: { daysRemaining: String(daysRemaining), permitType: permit.type },
    }),

  permitSubmitted: (request: any) =>
    send({
      module: 'PERMIT',
      eventType: 'permit.submitted',
      priority: 'NORMAL',
      zoneId: request.zoneId,
      companyId: request.companyId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: 'درخواست مجوز جدید',
      bodyFa: `درخواست مجوز ${request.requestNumber} از سوی ${request.applicantName} ثبت شد`,
      entityType: 'PERMIT_REQUEST',
      entityId: request.id,
    }),

  permitApproved: (request: any) =>
    send({
      module: 'PERMIT',
      eventType: 'permit.approved',
      priority: 'NORMAL',
      zoneId: request.zoneId,
      companyId: request.companyId,
      recipientId: request.applicantId,
      titleFa: 'تأیید درخواست مجوز',
      bodyFa: `درخواست مجوز ${request.requestNumber} تأیید شد`,
      entityType: 'PERMIT_REQUEST',
      entityId: request.id,
    }),

  permitRejected: (request: any) =>
    send({
      module: 'PERMIT',
      eventType: 'permit.rejected',
      priority: 'NORMAL',
      zoneId: request.zoneId,
      companyId: request.companyId,
      recipientId: request.applicantId,
      titleFa: 'رد درخواست مجوز',
      bodyFa: `درخواست مجوز ${request.requestNumber} رد شد`,
      entityType: 'PERMIT_REQUEST',
      entityId: request.id,
    }),

  // ─── Visitor Events ──────────────────────────────────────────────────────────
  visitorCheckedIn: (request: any, hostId: string) =>
    send({
      module: 'VISITOR',
      eventType: 'visitor.checked_in',
      priority: 'NORMAL',
      zoneId: request.zoneId,
      recipientId: hostId,
      titleFa: 'بازدیدکننده وارد شد',
      bodyFa: `${request.visitorName} از ${request.visitorCompany || ''} وارد شد`,
      entityType: 'VISITOR',
      entityId: request.id,
      templateCode: 'VISITOR_CHECKIN_SMS',
      templateVariables: { visitorName: request.visitorName, time: new Date().toLocaleTimeString('fa-IR') },
    }),

  visitorWalkIn: (request: any, hostId: string) =>
    send({
      module: 'VISITOR',
      eventType: 'visitor.walkin_pending',
      priority: 'HIGH',
      zoneId: request.zoneId,
      recipientId: hostId,
      titleFa: 'بازدیدکننده بدون نوبت',
      bodyFa: `${request.visitorName} در درب منتظر تأیید شماست`,
      entityType: 'VISITOR',
      entityId: request.id,
      templateCode: 'VISITOR_WALKIN_SMS',
      templateVariables: { visitorName: request.visitorName, gateName: request.gateName || 'اصلی' },
    }),

  visitorOverstay: (request: any, hostId: string, minutes: number) =>
    send({
      module: 'VISITOR',
      eventType: 'visitor.overstay',
      priority: 'HIGH',
      zoneId: request.zoneId,
      recipientId: hostId,
      recipientRole: 'ZONE_OPERATOR',
      titleFa: 'تجاوز از زمان بازدید',
      bodyFa: `${request.visitorName} ${minutes} دقیقه از زمان مجاز بیشتر مانده است`,
      entityType: 'VISITOR',
      entityId: request.id,
    }),

  // ─── Waybill Events ──────────────────────────────────────────────────────────
  waybillApproved: (waybill: any) =>
    send({
      module: 'LOGISTICS',
      eventType: 'waybill.approved',
      priority: 'NORMAL',
      zoneId: waybill.zoneId,
      companyId: waybill.companyId,
      titleFa: 'بارنامه تأیید شد',
      bodyFa: `بارنامه ${waybill.waybillNumber} تأیید شد`,
      entityType: 'WAYBILL',
      entityId: waybill.id,
    }),

  waybillCreated: (waybill: any) =>
    send({
      module: 'LOGISTICS',
      eventType: 'waybill.created',
      priority: 'NORMAL',
      zoneId: waybill.zoneId,
      companyId: waybill.companyId,
      recipientRole: 'COMPANY_STAFF',
      titleFa: 'بارنامه جدید ثبت شد',
      bodyFa: `بارنامه ${waybill.waybillNumber} ثبت شد و در انتظار تأیید است`,
      entityType: 'WAYBILL',
      entityId: waybill.id,
    }),

  waybillRejected: (waybill: any) =>
    send({
      module: 'LOGISTICS',
      eventType: 'waybill.rejected',
      priority: 'NORMAL',
      zoneId: waybill.zoneId,
      companyId: waybill.companyId,
      titleFa: 'بارنامه رد شد',
      bodyFa: `بارنامه ${waybill.waybillNumber} رد شد. دلیل: ${waybill.reason || 'نامشخص'}`,
      entityType: 'WAYBILL',
      entityId: waybill.id,
    }),

  waybillStepPending: (step: any, assigneeId: string) =>
    send({
      module: 'LOGISTICS',
      eventType: 'waybill.step_pending',
      priority: 'NORMAL',
      zoneId: step.zoneId,
      recipientId: assigneeId,
      titleFa: 'مرحله جدید بارنامه منتظر بررسی',
      entityType: 'WAYBILL_APPROVAL',
      entityId: step.id,
    }),

  // ─── Workflow Events ─────────────────────────────────────────────────────────
  workflowTaskActivated: (task: any) =>
    send({
      module: 'WORKFLOW',
      eventType: 'workflow.task.activated',
      priority: 'NORMAL',
      zoneId: task.zoneId,
      recipientId: task.assigneeId,
      recipientRole: task.assigneeRole,
      titleFa: `وظیفه جدید: ${task.stepNameFa}`,
      entityType: 'WORKFLOW_TASK',
      entityId: task.id,
      templateCode: 'WORKFLOW_TASK_ACTIVATED',
      templateVariables: { stepName: task.stepNameFa },
    }),

  workflowSlaBreached: (task: any) =>
    send({
      module: 'WORKFLOW',
      eventType: 'workflow.sla.breach',
      priority: 'HIGH',
      zoneId: task.zoneId,
      recipientId: task.assigneeId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: `تأخیر در ${task.stepNameFa}`,
      bodyFa: `SLA مرحله ${task.stepNameFa} نقض شده است`,
      entityType: 'WORKFLOW_TASK',
      entityId: task.id,
    }),

  workflowEscalation: (escalation: any) =>
    send({
      module: 'WORKFLOW',
      eventType: 'workflow.escalation',
      priority: 'HIGH',
      zoneId: escalation.zoneId,
      recipientId: escalation.escalatedTo,
      titleFa: `ارجاع: ${escalation.reason}`,
      bodyFa: escalation.message,
      entityType: 'WORKFLOW_ESCALATION',
      entityId: escalation.id,
    }),

  // ─── HSE Events ──────────────────────────────────────────────────────────────
  hseIncidentCritical: (incident: any, zoneId: string) =>
    send({
      module: 'HSE',
      eventType: 'hse.incident.critical',
      priority: 'CRITICAL',
      zoneId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: 'حادثه HSE بحرانی',
      bodyFa: `حادثه بحرانی: ${incident.description || 'نامشخص'}`,
      entityType: 'HSE_INCIDENT',
      entityId: incident.id,
    }),

  // ─── Finance Events ──────────────────────────────────────────────────────────
  paymentOverdue: (company: any, amount: number, daysOverdue: number) =>
    send({
      module: 'FINANCE',
      eventType: 'finance.payment_overdue',
      priority: daysOverdue > 60 ? 'HIGH' : 'NORMAL',
      zoneId: company.zoneId,
      companyId: company.id,
      recipientRole: 'COMPANY_ADMIN',
      titleFa: `یادآوری پرداخت — ${company.nameFa}`,
      bodyFa: `مبلغ ${amount.toLocaleString()} ریال پس از ${daysOverdue} روز پرداخت نشده`,
      entityType: 'COMPANY',
      entityId: company.id,
    }),

  workflowInstanceCompleted: (instance: any) =>
    send({
      module: 'WORKFLOW',
      eventType: 'workflow.instance.completed',
      priority: 'NORMAL',
      zoneId: instance.zoneId,
      recipientId: instance.triggeredBy,
      titleFa: `گردش کار تکمیل شد: ${instance.definitionCode}`,
      bodyFa: `نتیجه: ${instance.outcome}`,
      entityType: instance.entityType,
      entityId: instance.entityId,
    }),

  // ─── Letter Events ──────────────────────────────────────────────────────────
  letterSubmitted: (letter: any) =>
    send({
      module: 'CORRESPONDENCE',
      eventType: 'letter.submitted',
      priority: 'NORMAL',
      zoneId: letter.zoneId,
      companyId: letter.companyId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: 'نامه جدید برای تأیید',
      bodyFa: `نامه شماره ${letter.registryNumber} — ${letter.subject}`,
      entityType: 'LETTER',
      entityId: letter.id,
    }),

  letterApproved: (letter: any) =>
    send({
      module: 'CORRESPONDENCE',
      eventType: 'letter.approved',
      priority: 'NORMAL',
      zoneId: letter.zoneId,
      companyId: letter.companyId,
      recipientId: letter.senderId,
      titleFa: 'نامه تأیید شد',
      bodyFa: `نامه شماره ${letter.registryNumber} تأیید شد`,
      entityType: 'LETTER',
      entityId: letter.id,
    }),

  letterDispatched: (letter: any) =>
    send({
      module: 'CORRESPONDENCE',
      eventType: 'letter.dispatched',
      priority: 'NORMAL',
      zoneId: letter.zoneId,
      companyId: letter.companyId,
      recipientRole: 'COMPANY_ADMIN',
      titleFa: 'نامه ارسال شد',
      bodyFa: `نامه شماره ${letter.registryNumber} از طریق ${letter.methods?.join(', ') || 'پست'} ارسال شد`,
      entityType: 'LETTER',
      entityId: letter.id,
    }),

  // ─── Guard Events ───────────────────────────────────────────────────────────
  blacklistAlert: (data: any) =>
    send({
      module: 'GUARD',
      eventType: 'guard.blacklist_alert',
      priority: 'HIGH',
      zoneId: data.zoneId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: 'هشدار لیست سیاه',
      bodyFa: `پلاک ${data.plate} در لیست سیاه شناسایی شد — ${data.reason}`,
    }),

  // ─── System Events ───────────────────────────────────────────────────────────
  barrierOffline: (gate: any, zoneId: string) =>
    send({
      module: 'GUARD',
      eventType: 'system.barrier.offline',
      priority: 'HIGH',
      zoneId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: `barrier ${gate.nameFa || gate.code} offline`,
      bodyFa: 'دسترسی به barrier قطع شده است',
    }),

  scaleTamper: (record: any, zoneId: string) =>
    send({
      module: 'LOGISTICS',
      eventType: 'system.scale.tamper',
      priority: 'CRITICAL',
      zoneId,
      recipientRole: 'ZONE_MANAGER',
      titleFa: 'تقلب باسکول تشخیص داده شد',
      bodyFa: `تقلب در وزن‌کشی رکورد ${record.id}`,
      entityType: 'WEIGH_RECORD',
      entityId: record.id,
    }),

  // ─── Generic Broadcast ────────────────────────────────────────────────────────
  zoneBroadcast: (zoneId: string, titleFa: string, bodyFa: string) =>
    send({
      module: 'SYSTEM',
      eventType: 'system.broadcast',
      priority: 'NORMAL',
      zoneId,
      titleFa,
      bodyFa,
    }),
};
