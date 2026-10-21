import type { Letter, LetterDispatchRecord } from '../types';

// ── ID generator ─────────────────────────────────────────────────────────────
const genId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Base letter skeleton ──────────────────────────────────────────────────────
function baseLetter(overrides: Partial<Letter>): Letter {
  const now = new Date().toISOString();
  return {
    id: genId('LTR'),
    registryNumber: `AUTO-${Date.now()}`,
    direction: 'outgoing',
    type: 'request',
    classification: 'unclassified',
    priority: 'normal',
    subject: '',
    body: '',
    closing: 'با احترام',
    sender: '',
    senderOrg: '',
    senderRole: 'مدیرعامل',
    recipients: [],
    cc: [],
    attachments: [],
    enclosuresCount: 0,
    signatory: '',
    signatoryRole: 'مدیرعامل',
    approvalChain: [],
    annotations: [],
    status: 'pending-approval',
    versions: [],
    currentVersion: 1,
    createdAt: now,
    updatedAt: now,
    createdBy: '',
    slaHours: 72,
    registryYear: 1403,
    starred: false,
    unread: false,
    tags: [],
    qrHash: genId('QR'),
    ...overrides,
  };
}

// ── Zone Manager recipient ────────────────────────────────────────────────────
const zoneManagerRecipient = {
  name: 'مدیریت شهرک',
  org: 'شهرک صنعتی',
  action: 'action' as const,
};

// ── 1. Permit request letter ──────────────────────────────────────────────────
export function generateLetterFromPermitRequest(
  permit: { type: string; description?: string },
  company: { nameFa?: string; companyName?: string; id?: string }
): Letter {
  const companyName = company.nameFa ?? company.companyName ?? 'شرکت';
  return baseLetter({
    direction: 'outgoing',
    type: 'request',
    subject: `درخواست مجوز: ${permit.type}`,
    body: `شرکت ${companyName} درخواست صدور مجوز "${permit.type}" را به شرح ذیل ارائه می‌نماید:\n\n${permit.description ?? ''}\n\nخواهشمند است دستور اقدام مقتضی صادر فرمایید.`,
    sender: companyName,
    senderOrg: companyName,
    recipients: [zoneManagerRecipient],
    slaHours: 72,
    status: 'pending-approval',
    tags: ['auto-generated', 'permit-request', permit.type],
    topic: 'مجوزها',
    createdBy: companyName,
    signatory: companyName,
  });
}

// ── 2. Service request letter ─────────────────────────────────────────────────
export function generateLetterFromServiceRequest(
  service: { title: string; description?: string; priority?: string },
  company: { nameFa?: string; companyName?: string }
): Letter {
  const companyName = company.nameFa ?? company.companyName ?? 'شرکت';
  return baseLetter({
    direction: 'outgoing',
    type: 'request',
    subject: `درخواست خدمات: ${service.title}`,
    body: `شرکت ${companyName} درخواست ارائه خدمات "${service.title}" را دارد.\n\nتوضیحات: ${service.description ?? '—'}\nاولویت: ${service.priority ?? 'متوسط'}`,
    sender: companyName,
    senderOrg: companyName,
    recipients: [zoneManagerRecipient],
    slaHours: 48,
    status: 'pending-approval',
    tags: ['auto-generated', 'service-request'],
    topic: 'خدمات',
    createdBy: companyName,
    signatory: companyName,
  });
}

// ── 3. Contractor registration letter ────────────────────────────────────────
export function generateLetterFromContractorRegistration(
  contractor: { name: string; company?: string; workType?: string; startDate?: string; endDate?: string },
  company: { nameFa?: string; companyName?: string }
): Letter {
  const companyName = company.nameFa ?? company.companyName ?? 'شرکت';
  return baseLetter({
    direction: 'outgoing',
    type: 'official',
    subject: `معرفی پیمانکار: ${contractor.name}`,
    body: `شرکت ${companyName} به استحضار می‌رساند که پیمانکار "${contractor.name}" از شرکت "${contractor.company ?? '—'}" جهت انجام عملیات "${contractor.workType ?? '—'}" از تاریخ ${contractor.startDate ?? '—'} لغایت ${contractor.endDate ?? '—'} مشغول به کار خواهد بود.\n\nخواهشمند است نسبت به صدور مجوز ورود اقدام فرمایید.`,
    sender: companyName,
    senderOrg: companyName,
    recipients: [zoneManagerRecipient],
    slaHours: 48,
    status: 'pending-approval',
    tags: ['auto-generated', 'contractor-registration'],
    topic: 'پیمانکاران',
    createdBy: companyName,
    signatory: companyName,
  });
}

// ── 4. Visitor request letter ─────────────────────────────────────────────────
export function generateLetterFromVisitorRequest(
  visitor: { name: string; purpose?: string; date?: string; time?: string; host?: string },
  company: { nameFa?: string; companyName?: string }
): Letter {
  const companyName = company.nameFa ?? company.companyName ?? 'شرکت';
  return baseLetter({
    direction: 'outgoing',
    type: 'request',
    subject: `درخواست مجوز ورود بازدیدکننده: ${visitor.name}`,
    body: `شرکت ${companyName} درخواست می‌نماید مجوز ورود برای بازدیدکننده "${visitor.name}" جهت "${visitor.purpose ?? '—'}" در تاریخ ${visitor.date ?? '—'} ساعت ${visitor.time ?? '—'} صادر گردد.\nمیزبان: ${visitor.host ?? '—'}`,
    sender: companyName,
    senderOrg: companyName,
    recipients: [zoneManagerRecipient],
    slaHours: 24,
    status: 'pending-approval',
    tags: ['auto-generated', 'visitor-request'],
    topic: 'بازدیدکنندگان',
    createdBy: companyName,
    signatory: companyName,
  });
}

// ── 5. Zone Manager response letter ──────────────────────────────────────────
export function generateResponseLetter(
  originalLetterId: string,
  originalLetterNumber: string,
  decision: 'approved' | 'rejected' | 'suspended',
  comment: string,
  managerName: string,
  companyName: string
): Letter {
  const dispatchRecord: LetterDispatchRecord = {
    method: 'email',
    dispatcher: managerName,
    timestamp: new Date().toISOString(),
  };

  const decisionFa =
    decision === 'approved' ? 'تأیید' :
    decision === 'rejected' ? 'رد' : 'تعلیق';

  return baseLetter({
    direction: 'outgoing',
    type: 'response',
    subject: `پاسخ به درخواست — ${decisionFa} پرونده: ${companyName}`,
    body: `با عنایت به درخواست واصله با شماره "${originalLetterNumber}"، پس از بررسی‌های لازم، تصمیم به "${decisionFa}" اتخاذ گردید.\n\nتوضیحات: ${comment || '—'}`,
    referenceLetterId: originalLetterId,
    referenceLetterNumber: originalLetterNumber,
    sender: managerName,
    senderOrg: 'شهرک صنعتی',
    senderRole: 'مدیر شهرک',
    recipients: [{ name: companyName, org: companyName, action: 'action' }],
    status: 'sent',
    dispatchRecord,
    slaHours: 0,
    tags: ['auto-generated', 'zone-manager-response', decision],
    topic: 'تصمیمات مدیریت',
    createdBy: managerName,
    signatory: managerName,
    signatoryRole: 'مدیر شهرک',
  });
}
