// ── Core Letter Types ────────────────────────────────────────────────────────

export type LetterDirection = 'incoming' | 'outgoing' | 'internal';
export type LetterType = 'official' | 'memo' | 'circular' | 'report' | 'instruction' | 'request' | 'response';
export type LetterClassification = 'unclassified' | 'confidential' | 'restricted' | 'secret';
export type LetterPriority = 'instant' | 'urgent' | 'normal' | 'low';
export type LetterStatus = 'draft' | 'pending-approval' | 'approved' | 'sent' | 'dispatched' | 'archived' | 'returned' | 'referred';

export interface LetterAttachment {
  id: string;
  name: string;
  size: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  mimeType: string;
  version: number;
  checksum: string;
}

export interface LetterRecipient {
  name: string;
  org: string;
  action: 'action' | 'info' | 'reference';
  acknowledged?: boolean;
  acknowledgedAt?: string;
}

export interface LetterAnnotation {
  id: string;
  author: string;
  authorRole: string;
  date: string;
  text: string;
  color: string;
  isParaph: boolean; // internal note vs official annotation
}

export interface LetterDispatchRecord {
  method: 'hand' | 'post' | 'courier' | 'fax' | 'email';
  trackingNumber?: string;
  dispatcher: string;
  timestamp: string;
  receivedBy?: string;
  receivedAt?: string;
}

export interface LetterArchiveLocation {
  box: string;
  folder: string;
  shelf: string;
  physicalReceived: boolean;
  scanUploaded: boolean;
  physicalBarcode?: string;
}

export interface LetterVersion {
  version: number;
  body: string;
  subject: string;
  editedBy: string;
  editedAt: string;
  changeNote: string;
}

export interface Letter {
  id: string;
  registryNumber: string;
  direction: LetterDirection;
  type: LetterType;
  classification: LetterClassification;
  priority: LetterPriority;
  subject: string;
  body: string;
  closing: string;
  referenceLetterId?: string;
  referenceLetterNumber?: string;
  sender: string;
  senderOrg: string;
  senderRole: string;
  recipients: LetterRecipient[];
  cc: string[];
  attachments: LetterAttachment[];
  enclosuresCount: number;
  signatory: string;
  signatoryRole: string;
  approvalChain: ApprovalStep[];
  annotations: LetterAnnotation[];
  status: LetterStatus;
  dispatchRecord?: LetterDispatchRecord;
  archiveLocation?: LetterArchiveLocation;
  versions: LetterVersion[];
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  responseDeadline?: string;
  slaHours: number;
  registryYear: number;
  starred: boolean;
  unread: boolean;
  tags: string[];
  topic?: string;
  physicalBarcode?: string;
  qrHash: string;
}

// ── Workflow Types ───────────────────────────────────────────────────────────

export type StepType = 'sequential' | 'parallel_all' | 'parallel_any' | 'conditional';
export type StepStatus = 'pending' | 'active' | 'approved' | 'rejected' | 'returned' | 'skipped' | 'delegated';
export type ActionType = 'approve' | 'reject' | 'return' | 'refer' | 'sign' | 'annotate' | 'paraph' | 'delegate';

export interface WorkflowStep {
  id: string;
  name: string;
  nameFa: string;
  type: StepType;
  assigneeRole: string;
  assigneeName?: string;
  delegateTo?: string;
  delegateTimeRange?: { start: string; end: string };
  status: StepStatus;
  slaHours: number;
  slaWarningHours: number;
  escalationRole?: string;
  conditionField?: string;
  conditionOperator?: '>' | '<' | '>=' | '<=' | '==' | '!=';
  conditionValue?: string | number;
  order: number;
  startedAt?: string;
  completedAt?: string;
  dueAt?: string;
  comment?: string;
  isParallelGroup?: boolean;
  parallelGroupId?: string;
}

export interface WorkflowInstance {
  id: string;
  letterId: string;
  workflowTemplateId: string;
  steps: WorkflowStep[];
  currentStepId: string;
  status: 'running' | 'completed' | 'rejected' | 'cancelled' | 'paused';
  startedAt: string;
  completedAt?: string;
  startedBy: string;
  history: WorkflowAction[];
}

export interface WorkflowAction {
  id: string;
  instanceId: string;
  stepId: string;
  action: ActionType;
  performedBy: string;
  performedAt: string;
  comment?: string;
  reason?: string; // for rollback/reject
  isParaph: boolean;
  targetStepId?: string; // for refer
  attachments?: string[];
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  nameFa: string;
  description: string;
  steps: Omit<WorkflowStep, 'status' | 'startedAt' | 'completedAt' | 'dueAt'>[];
  isActive: boolean;
 适用于: LetterType[];
}

// ── Registry Types ───────────────────────────────────────────────────────────

export interface RegistryTemplate {
  id: string;
  name: string;
  template: string; // e.g. '{YEAR}/{TYPE}/{SERIAL}'
  typeCode: Record<LetterType, string>;
  directionCode: Record<LetterDirection, string>;
  counter: number;
  year: number;
}

export interface PhysicalMovement {
  id: string;
  letterId: string;
  from: string;
  to: string;
  movedBy: string;
  movedAt: string;
  returnBy?: string;
  returnedAt?: string;
  status: 'out' | 'returned' | 'overdue';
}

// ── Audit Types ──────────────────────────────────────────────────────────────

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'REFER' | 'SIGN' | 'ARCHIVE' | 'DISPATCH' | 'LOGIN' | 'EXPORT';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: AuditAction;
  resource: string;
  resourceId: string;
  oldValue?: string;
  newValue?: string;
  ipAddress: string;
  result: 'success' | 'failure';
  reason?: string;
  hash: string;
  previousHash: string;
}

// ── SLA Types ────────────────────────────────────────────────────────────────

export interface SLAConfig {
  stepId: string;
  slaHours: number;
  warningHours: number;
  escalationRole: string;
  escalateAfterHours: number;
  holidays: string[]; // Jalali holidays
}

export interface SLAStatus {
  stepId: string;
  remainingHours: number;
  isOverdue: boolean;
  isWarning: boolean;
  escalated: boolean;
}

// ── Notification Types ───────────────────────────────────────────────────────

export type NotificationChannel = 'in-app' | 'email' | 'sms' | 'web-push' | 'webhook';
export type NotificationType = 'assignment' | 'sla-warning' | 'sla-breach' | 'status-change' | 'comment' | 'mention';

export interface Notification {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  title: string;
  titleFa: string;
  body: string;
  bodyFa: string;
  letterId?: string;
  letterNumber?: string;
  recipientId: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}

// ── Search Types ─────────────────────────────────────────────────────────────

export interface SearchFilters {
  query: string;
  direction?: LetterDirection;
  type?: LetterType;
  classification?: LetterClassification;
  priority?: LetterPriority;
  status?: LetterStatus;
  dateFrom?: string;
  dateTo?: string;
  sender?: string;
  signatory?: string;
  hasAttachments?: boolean;
  hasAnnotations?: boolean;
  tags?: string[];
  topic?: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: SearchFilters;
  createdBy: string;
  isPublic: boolean;
}

// ── RBAC Types ───────────────────────────────────────────────────────────────

export type Permission = 
  | 'VIEW_OWN' | 'VIEW_DEPT' | 'VIEW_ALL'
  | 'CREATE_LETTER' | 'EDIT_OWN' | 'EDIT_ALL'
  | 'APPROVE_STEP' | 'APPROVE_ALL'
  | 'SIGN_LETTER' | 'ARCHIVE_LETTER'
  | 'MANAGE_WORKFLOW' | 'MANAGE_REGISTRY'
  | 'VIEW_AUDIT' | 'EXPORT_DATA'
  | 'MANAGE_USERS' | 'MANAGE_SETTINGS'
  | 'VIEW_REPORTS' | 'MANAGE_TEMPLATES';

export interface RolePermissions {
  role: string;
  permissions: Permission[];
}

// ── Report Types ─────────────────────────────────────────────────────────────

export interface ReportConfig {
  id: string;
  name: string;
  type: 'volume' | 'sla' | 'response-time' | 'by-type' | 'by-department' | 'custom';
  dateRange: { from: string; to: string };
  filters?: SearchFilters;
  groupBy?: string;
  format: 'pdf' | 'excel' | 'csv';
}

export interface ReportData {
  config: ReportConfig;
  generatedAt: string;
  data: Record<string, any>[];
  summary: {
    totalLetters: number;
    averageResponseTime: number;
    slaComplianceRate: number;
    topSenders: { name: string; count: number }[];
    byType: { type: string; count: number }[];
    byStatus: { status: string; count: number }[];
  };
}
