import { useMemo, useState } from 'react';
import {
  Mail, Building2, AlertTriangle, ClipboardCheck, ClipboardList,
  FileText, Bell, ShieldAlert, Filter, CheckCircle2, Clock,
  XCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react';
import { useCorrespondenceStore } from '@/modules/correspondence/store';
import { useHSEStore } from '@/modules/dashboard/zone-manager/store/useHSEStore';
import { useLeaseStore } from '@/modules/dashboard/zone-manager/store/useLeaseStore';
import { useOperationsStore } from '@/modules/dashboard/zone-manager/store/useOperationsStore';
import { useCompanyStore } from '@/modules/dashboard/zone-manager/store/useCompanyStore';
import { buildCompanyTimeline, groupByMonth } from '../utils/buildCompanyTimeline';
import type { TimelineCategory, TimelineStatus, TimelineEvent } from '../utils/buildCompanyTimeline';

// ── Config ────────────────────────────────────────────────────────────────────
const CATEGORY_CONFIG: Record<TimelineCategory, { label: string; color: string; bg: string }> = {
  correspondence: { label: 'مکاتبات', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
  lifecycle:      { label: 'چرخه حیات', color: 'text-violet-600', bg: 'bg-violet-50 border-violet-200' },
  hse:            { label: 'HSE', color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
  finance:        { label: 'مالی', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  permit:         { label: 'مجوزها', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  inspection:     { label: 'بازرسی', color: 'text-cyan-600', bg: 'bg-cyan-50 border-cyan-200' },
  b2b:            { label: 'B2B', color: 'text-pink-600', bg: 'bg-pink-50 border-pink-200' },
};

const STATUS_CONFIG: Record<TimelineStatus, { icon: typeof CheckCircle2; color: string }> = {
  success: { icon: CheckCircle2, color: 'text-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  error:   { icon: XCircle, color: 'text-red-500' },
  info:    { icon: Info, color: 'text-blue-500' },
  pending: { icon: Clock, color: 'text-slate-400' },
};

const ICON_MAP: Record<string, typeof Mail> = {
  Mail, Building2, AlertTriangle, ClipboardCheck,
  ClipboardList, FileText, Bell, ShieldAlert,
};

const ALL_CATEGORIES: TimelineCategory[] = [
  'correspondence', 'lifecycle', 'hse', 'finance', 'permit', 'inspection', 'b2b',
];

interface TimelineTabProps {
  companyId: string;
  companyName?: string; // optional fallback for portal companies whose IDs differ from zone-manager IDs
}

export function TimelineTab({ companyId, companyName }: TimelineTabProps) {
  const letters     = useCorrespondenceStore(s => s.letters);
  const { risks, incidents, capas, inspections } = useHSEStore();
  const { contracts } = useLeaseStore();
  const { alerts }  = useOperationsStore();
  const { companies } = useCompanyStore();

  const company = companies.find(c => c.id === companyId);

  const [activeCategories, setActiveCategories] = useState<Set<TimelineCategory>>(
    new Set(ALL_CATEGORIES)
  );
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Build + filter timeline
  const allEvents = useMemo(() => buildCompanyTimeline(companyId, {
    company,
    letters,
    incidents,
    risks,
    capas,
    inspections,
    leases: contracts,
    alerts,
  }, companyName), [companyId, companyName, company, letters, incidents, risks, capas, inspections, contracts, alerts]);

  const filteredEvents = useMemo(() =>
    allEvents.filter(e =>
      activeCategories.has(e.category) &&
      (searchQuery === '' ||
        e.titleFa.includes(searchQuery) ||
        (e.description ?? '').includes(searchQuery) ||
        (e.actor ?? '').includes(searchQuery))
    ),
    [allEvents, activeCategories, searchQuery]
  );

  const grouped = useMemo(() => groupByMonth(filteredEvents), [filteredEvents]);
  const months = Object.keys(grouped);

  // Initialise first 2 months as expanded
  const getExpanded = (month: string) =>
    expandedMonths.has(month) || months.indexOf(month) < 2;

  const toggleCategory = (cat: TimelineCategory) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat); else next.add(cat);
      return next;
    });
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (getExpanded(month) && months.indexOf(month) >= 2) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="جستجو در رویدادها..."
          className="w-full border border-border rounded-xl py-2 px-4 text-sm bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1.5 items-center">
        <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
        {ALL_CATEGORIES.map(cat => {
          const cfg = CATEGORY_CONFIG[cat];
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              className={`text-[10px] px-2.5 py-1 rounded-full border font-medium transition-all ${
                active
                  ? `${cfg.bg} ${cfg.color}`
                  : 'bg-secondary text-muted-foreground border-border opacity-50'
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
        <span className="text-[10px] text-muted-foreground mr-auto">
          {filteredEvents.length} رویداد
        </span>
      </div>

      {/* Empty state */}
      {filteredEvents.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">هیچ رویدادی یافت نشد</p>
        </div>
      )}

      {/* Grouped timeline */}
      {months.map(month => {
        const monthEvents = grouped[month];
        const isOpen = getExpanded(month);
        return (
          <div key={month} className="rounded-xl border border-border overflow-hidden">
            {/* Month header */}
            <button
              onClick={() => toggleMonth(month)}
              className="w-full flex items-center justify-between px-4 py-2.5 bg-secondary/50 hover:bg-secondary transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-foreground">{month}</span>
                <span className="text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded-full">
                  {monthEvents.length} رویداد
                </span>
              </div>
              {isOpen
                ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
                : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              }
            </button>

            {/* Events */}
            {isOpen && (
              <div className="relative px-4 py-3 space-y-0">
                {/* Vertical line */}
                <div className="absolute right-[26px] top-3 bottom-3 w-px bg-border" />

                {monthEvents.map((event, idx) => (
                  <TimelineEventRow
                    key={event.id}
                    event={event}
                    isLast={idx === monthEvents.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Single event row ──────────────────────────────────────────────────────────
function TimelineEventRow({ event, isLast }: { event: TimelineEvent; isLast: boolean }) {
  const catCfg = CATEGORY_CONFIG[event.category];
  const statusCfg = STATUS_CONFIG[event.status];
  const StatusIcon = statusCfg.icon;
  const EntityIcon = ICON_MAP[event.icon] ?? FileText;

  const timeLabel = new Date(event.timestamp).toLocaleString('fa-IR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex gap-3 relative py-2.5 ${!isLast ? 'border-b border-border/50' : ''}`}>
      {/* Icon bubble */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 z-10 border ${catCfg.bg} ${catCfg.color}`}>
        <EntityIcon className="w-4 h-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-0.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">{event.titleFa}</p>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-medium flex-shrink-0 ${catCfg.bg} ${catCfg.color}`}>
                {catCfg.label}
              </span>
            </div>
            {event.description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                {event.description}
              </p>
            )}
            {event.actor && (
              <p className="text-[10px] text-muted-foreground/70 mt-1">
                {event.actorRole ? `${event.actorRole}: ` : ''}{event.actor}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">{timeLabel}</p>
            <StatusIcon className={`w-3.5 h-3.5 ${statusCfg.color}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
