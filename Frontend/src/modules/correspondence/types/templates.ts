import type {
  LetterDirection,
  LetterType,
  LetterClassification,
  LetterPriority,
} from './index';

// ── Template variable ─────────────────────────────────────────────────────────
export type VariableSource = 'company' | 'permit' | 'user' | 'date' | 'manual';

export interface TemplateVariable {
  key: string;           // e.g. "company_name"
  labelFa: string;       // e.g. "نام شرکت"
  source: VariableSource;
  sourcePath?: string;   // e.g. "company.nameFa"
  defaultValue?: string;
}

// ── Auto-trigger definition ───────────────────────────────────────────────────
export type TemplateTriggerEvent =
  | 'permit_request'
  | 'permit_expiry'
  | 'incident_reported'
  | 'payment_overdue'
  | 'lease_renewal'
  | 'company_activated'
  | 'inspection_scheduled'
  | 'rfq_awarded';

export interface TemplateTrigger {
  event: TemplateTriggerEvent;
  daysBeforeEvent?: number; // for future-dated triggers (e.g. 30 days before expiry)
}

// ── Letter template ───────────────────────────────────────────────────────────
export type TemplateCategory =
  | 'permit'
  | 'hse'
  | 'finance'
  | 'onboarding'
  | 'lease'
  | 'general';

export interface LetterTemplate {
  id: string;
  nameFa: string;
  descriptionFa: string;
  category: TemplateCategory;
  direction: LetterDirection;
  type: LetterType;
  classification: LetterClassification;
  priority: LetterPriority;
  subjectTemplate: string;  // e.g. "درخواست تمدید مجوز {{permit_type}} — {{company_name}}"
  bodyTemplate: string;
  closingTemplate: string;
  variables: TemplateVariable[];
  slaHours: number;
  approvalChainTemplate: string[]; // role names, e.g. ["کارشناس", "مدیر"]
  topic?: string;
  tags?: string[];
  autoTrigger?: TemplateTrigger;
  icon: string; // lucide icon name
}

// ── Template resolution context ───────────────────────────────────────────────
export interface TemplateContext {
  company?: {
    id?: string;
    nameFa?: string;
    companyName?: string;
    industry?: string;
    block?: string;
    unit?: string;
  };
  permit?: {
    type?: string;
    number?: string;
    expiryDate?: string;
  };
  incident?: {
    number?: string;
    type?: string;
    location?: string;
    severity?: string;
  };
  lease?: {
    contractNumber?: string;
    endDate?: string;
    block?: string;
    unit?: string;
  };
  payment?: {
    invoiceNumber?: string;
    amount?: string;
    dueDate?: string;
  };
  currentUser?: {
    name?: string;
    role?: string;
    org?: string;
  };
  manualValues?: Record<string, string>;
}
