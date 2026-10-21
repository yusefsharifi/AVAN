import type { CompanyOnboardingRecord } from '@/modules/dashboard/zone-manager/types';
import type { Letter } from '@/modules/correspondence/types';
import type { Incident, Risk, CAPA, Inspection } from '@/modules/dashboard/zone-manager/types';
import type { LeaseContract } from '@/modules/dashboard/zone-manager/types';
import type { OperationalAlert } from '@/modules/dashboard/zone-manager/types';

// ── Timeline event shape ───────────────────────────────────────────────────────
export type TimelineCategory =
  | 'correspondence'
  | 'lifecycle'
  | 'hse'
  | 'finance'
  | 'permit'
  | 'inspection'
  | 'b2b';

export type TimelineStatus = 'success' | 'warning' | 'error' | 'info' | 'pending';

export interface TimelineEvent {
  id: string;
  timestamp: string; // ISO
  category: TimelineCategory;
  title: string;
  titleFa: string;
  description?: string;
  status: TimelineStatus;
  linkedEntityId?: string;
  linkedEntityType?: string;
  actor?: string;
  actorRole?: string;
  icon: string; // lucide icon name
}

// ── Jalali lifecycle status labels ───────────────────────────────────────────
const LETTER_DIRECTION_FA: Record<string, string> = {
  incoming: 'ورودی',
  outgoing: 'خروجی',
  internal: 'داخلی',
};

const LETTER_STATUS_FA: Record<string, string> = {
  draft: 'پیش‌نویس',
  'pending-approval': 'در انتظار تأیید',
  approved: 'تأیید شده',
  sent: 'ارسال شده',
  dispatched: 'ارسال شده',
  archived: 'بایگانی',
  returned: 'برگشت داده شده',
  referred: 'ارجاع داده شده',
};

// ── Main aggregator ───────────────────────────────────────────────────────────
export function buildCompanyTimeline(
  companyId: string,
  sources: {
    company?: CompanyOnboardingRecord;
    letters?: Letter[];
    incidents?: Incident[];
    risks?: Risk[];
    capas?: CAPA[];
    inspections?: Inspection[];
    leases?: LeaseContract[];
    alerts?: OperationalAlert[];
  },
  companyNameOverride?: string
): TimelineEvent[] {
  const events: TimelineEvent[] = [];
  const resolvedName = companyNameOverride ?? sources.company?.companyName;

  function matchesCompany(entityCompanyId?: string, entityCompanyName?: string): boolean {
    if (entityCompanyId === companyId) return true;
    if (resolvedName && entityCompanyName && entityCompanyName.includes(resolvedName)) return true;
    if (resolvedName && entityCompanyName && resolvedName.includes(entityCompanyName)) return true;
    return false;
  }

  // ── 1. Lifecycle workflow history ─────────────────────────────────────────
  if (sources.company) {
    sources.company.workflowHistory.forEach((step, i) => {
      const isCompleted = step.status === 'completed';
      const isRejected  = step.status === 'rejected';
      events.push({
        id: `lifecycle-${i}-${step.completedAt ?? step.id}`,
        timestamp: step.completedAt ?? sources.company!.createdAt,
        category: 'lifecycle',
        title: `Lifecycle: ${step.name}`,
        titleFa: `مرحله گردش کار: ${step.name}`,
        description: step.note ?? `مرحله "${step.name}" — ${isCompleted ? 'تکمیل شد' : isRejected ? 'رد شد' : 'در جریان'}`,
        status: isCompleted ? 'success' : isRejected ? 'error' : 'pending',
        linkedEntityId: sources.company!.id,
        linkedEntityType: 'company',
        actor: step.actor,
        actorRole: step.role,
        icon: 'Building2',
      });
    });

    // Onboarding creation event
    events.push({
      id: `lifecycle-created`,
      timestamp: sources.company.createdAt,
      category: 'lifecycle',
      title: 'Company Registered',
      titleFa: 'ثبت شرکت در سامانه',
      description: `شرکت ${sources.company.companyName} در سامانه ثبت شد`,
      status: 'info',
      linkedEntityId: companyId,
      linkedEntityType: 'company',
      actor: sources.company.createdBy,
      icon: 'Building2',
    });
  }

  // ── 2. Correspondence ─────────────────────────────────────────────────────
  if (sources.letters) {
    sources.letters
      .filter(l =>
        (resolvedName && (l.sender === resolvedName || l.senderOrg === resolvedName)) ||
        l.recipients.some(r => resolvedName && r.org === resolvedName)
      )
      .forEach(letter => {
        const dirFa = LETTER_DIRECTION_FA[letter.direction] ?? letter.direction;
        const statusFa = LETTER_STATUS_FA[letter.status] ?? letter.status;
        events.push({
          id: `letter-${letter.id}`,
          timestamp: letter.updatedAt ?? letter.createdAt,
          category: 'correspondence',
          title: `Letter: ${letter.subject}`,
          titleFa: `نامه ${dirFa}: ${letter.subject}`,
          description: `وضعیت: ${statusFa} · فرستنده: ${letter.senderOrg}`,
          status:
            letter.status === 'approved' || letter.status === 'sent' || letter.status === 'dispatched' ? 'success' :
            letter.status === 'returned' ? 'warning' :
            letter.status === 'pending-approval' ? 'pending' : 'info',
          linkedEntityId: letter.id,
          linkedEntityType: 'letter',
          actor: letter.sender,
          actorRole: letter.senderRole,
          icon: 'Mail',
        });
      });
  }

  // ── 3. HSE incidents ──────────────────────────────────────────────────────
  if (sources.incidents) {
    sources.incidents
      .filter(i => matchesCompany(i.companyId, i.companyName))
      .forEach(incident => {
        events.push({
          id: `incident-${incident.id}`,
          timestamp: incident.createdAt,
          category: 'hse',
          title: `Incident: ${incident.incidentNumber}`,
          titleFa: `حادثه: ${incident.incidentNumber}`,
          description: incident.description?.slice(0, 120),
          status:
            incident.severity === 'critical' ? 'error' :
            incident.severity === 'serious' ? 'error' :
            incident.severity === 'moderate' ? 'warning' : 'info',
          linkedEntityId: incident.id,
          linkedEntityType: 'incident',
          actor: incident.reporter,
          actorRole: 'گزارش‌دهنده',
          icon: 'AlertTriangle',
        });
      });
  }

  // ── 4. HSE risks ──────────────────────────────────────────────────────────
  if (sources.risks) {
    sources.risks
      .filter(r => matchesCompany(r.companyId, r.companyName))
      .forEach(risk => {
        events.push({
          id: `risk-${risk.id}`,
          timestamp: risk.createdAt,
          category: 'hse',
          title: `Risk: ${risk.riskNumber}`,
          titleFa: `ریسک: ${risk.riskNumber}`,
          description: risk.hazard?.slice(0, 120),
          status:
            risk.severity === 'critical' ? 'error' :
            risk.severity === 'high' ? 'warning' : 'info',
          linkedEntityId: risk.id,
          linkedEntityType: 'risk',
          actor: risk.owner,
          icon: 'ShieldAlert',
        });
      });
  }

  // ── 5. CAPAs ──────────────────────────────────────────────────────────────
  if (sources.capas) {
    const companyIncidentIds = new Set(
      (sources.incidents ?? []).filter(i => matchesCompany(i.companyId, i.companyName)).map(i => i.id)
    );
    const companyRiskIds = new Set(
      (sources.risks ?? []).filter(r => matchesCompany(r.companyId, r.companyName)).map(r => r.id)
    );
    sources.capas
      .filter(c => companyIncidentIds.has(c.sourceId) || companyRiskIds.has(c.sourceId))
      .forEach(capa => {
        events.push({
          id: `capa-${capa.id}`,
          timestamp: capa.createdAt,
          category: 'hse',
          title: `CAPA: ${capa.capaNumber}`,
          titleFa: `اقدام اصلاحی: ${capa.capaNumber}`,
          description: capa.correctiveAction?.slice(0, 120),
          status: capa.status === 'closed' ? 'success' : capa.status === 'overdue' ? 'error' : 'pending',
          linkedEntityId: capa.id,
          linkedEntityType: 'capa',
          actor: capa.owner,
          icon: 'ClipboardCheck',
        });
      });
  }

  // ── 6. Inspections ────────────────────────────────────────────────────────
  if (sources.inspections) {
    sources.inspections
      .filter(i => matchesCompany(i.companyId, i.companyName))
      .forEach(inspection => {
        events.push({
          id: `inspection-${inspection.id}`,
          timestamp: inspection.createdAt,
          category: 'inspection',
          title: `Inspection: ${inspection.title}`,
          titleFa: `بازرسی: ${inspection.title}`,
          description: `نتیجه: ${inspection.overallResult ?? 'در انتظار'}`,
          status:
            inspection.overallResult === 'pass' ? 'success' :
            inspection.overallResult === 'fail' ? 'error' :
            inspection.overallResult === 'conditional' ? 'warning' : 'pending',
          linkedEntityId: inspection.id,
          linkedEntityType: 'inspection',
          actor: inspection.inspector,
          actorRole: 'بازرس',
          icon: 'ClipboardList',
        });
      });
  }

  // ── 7. Lease contracts ────────────────────────────────────────────────────
  if (sources.leases) {
    sources.leases
      .filter(l => matchesCompany(l.companyId, l.companyName))
      .forEach(lease => {
        events.push({
          id: `lease-${lease.id}`,
          timestamp: lease.createdAt,
          category: 'finance',
          title: `Lease: ${lease.contractNumber}`,
          titleFa: `قرارداد اجاره: ${lease.contractNumber}`,
          description: `واحد ${lease.unit} · بلوک ${lease.block} · ${(lease.areaSqM ?? 0).toLocaleString('fa-IR')} m²`,
          status:
            lease.status === 'active' ? 'success' :
            lease.status === 'expired' ? 'error' :
            lease.status === 'terminated' ? 'error' : 'pending',
          linkedEntityId: lease.id,
          linkedEntityType: 'lease',
          icon: 'FileText',
        });
      });
  }

  // ── 8. Operational alerts ─────────────────────────────────────────────────
  if (sources.alerts) {
    sources.alerts
      .filter(a => matchesCompany(a.companyId, a.companyName))
      .forEach(alert => {
        events.push({
          id: `alert-${alert.id}`,
          timestamp: alert.createdAt,
          category: alert.type === 'finance' ? 'finance' : alert.type === 'hse' ? 'hse' : 'lifecycle',
          title: `Alert: ${alert.alertNumber}`,
          titleFa: `هشدار: ${alert.title}`,
          description: alert.description?.slice(0, 120),
          status:
            alert.severity === 'critical' ? 'error' :
            alert.severity === 'high' ? 'warning' :
            alert.status === 'resolved' ? 'success' : 'warning',
          linkedEntityId: alert.id,
          linkedEntityType: 'alert',
          actor: alert.owner,
          icon: 'Bell',
        });
      });
  }

  // ── Sort descending by timestamp ──────────────────────────────────────────
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events;
}

// ── Group events by Jalali month label ───────────────────────────────────────
export function groupByMonth(events: TimelineEvent[]): Record<string, TimelineEvent[]> {
  const groups: Record<string, TimelineEvent[]> = {};
  for (const event of events) {
    const d = new Date(event.timestamp);
    const label = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long' });
    if (!groups[label]) groups[label] = [];
    groups[label].push(event);
  }
  return groups;
}
