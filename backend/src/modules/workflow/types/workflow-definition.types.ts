// ═══════════════════════════════════════════════════════════════════════════════
// Workflow Definition JSON Types — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

export interface WorkflowDefinitionJson {
  startEvent: StartEventDef;
  steps: WorkflowStepDef[];
  gateways: GatewayDef[];
  flows: FlowDef[];
  endEvents: EndEventDef[];
}

export interface StartEventDef {
  id: string;
  nameFa: string;
  outgoing: string[];
}

export interface WorkflowStepDef {
  id: string;
  nameFa: string;
  type: 'MANUAL' | 'AUTO' | 'NOTIFICATION' | 'TIMER' | 'SUBPROCESS';
  incoming: string[];
  outgoing: string[];

  // Assignment
  assignmentType: 'USER' | 'ROLE' | 'GROUP' | 'REQUESTER' | 'DYNAMIC';
  assigneeId?: string;
  assigneeRole?: string;
  assigneeGroupCode?: string;
  assigneeExpression?: string;

  // SLA
  slaHours: number;
  slaWarningPercent?: number;

  // For MANUAL tasks
  formSchema?: Record<string, unknown>;
  requireComment?: boolean;
  requireAttachment?: boolean;

  // For AUTO tasks
  actionType?: string;
  actionConfig?: Record<string, unknown>;

  // For TIMER tasks
  delayHours?: number;
  delayExpression?: string;

  // For SUBPROCESS
  subprocessDefinitionCode?: string;
  subprocessVariableMapping?: Record<string, string>;

  // For NOTIFICATION tasks
  notificationTemplate?: string;
  notificationChannels?: string[];

  // Conditional skip
  skipCondition?: string;

  // Escalation config
  escalation?: {
    level1: { afterHours: number; escalateTo: string };
    level2?: { afterHours: number; escalateTo: string };
    level3?: { afterHours: number; escalateTo: string };
  };

  // UI metadata
  position?: { x: number; y: number };
  color?: string;
  description?: string;
}

export interface GatewayDef {
  id: string;
  nameFa: string;
  type: 'EXCLUSIVE' | 'PARALLEL' | 'INCLUSIVE';
  incoming: string[];
  outgoing: string[];
  conditions?: Record<string, string>;
  defaultFlow?: string;
}

export interface FlowDef {
  id: string;
  source: string;
  target: string;
  condition?: string;
  nameFa?: string;
}

export interface EndEventDef {
  id: string;
  nameFa: string;
  outcome: 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'EXPIRED' | 'TERMINATED_BY_ADMIN';
  incoming: string[];
  onComplete?: {
    updateEntityStatus?: string;
    sendNotification?: boolean;
    generateLetter?: boolean;
    letterTemplateCode?: string;
  };
}

export interface AdvanceContext {
  decision?: string;
  formData?: Record<string, unknown>;
  variableUpdates?: Record<string, unknown>;
}

export interface ValidationResult {
  isValid: boolean;
  errors: { node: string; message: string }[];
  warnings: { node: string; message: string }[];
}

export interface TaskInboxDto {
  urgent: TaskInboxEntryDto[];
  overdue: TaskInboxEntryDto[];
  today: TaskInboxEntryDto[];
  normal: TaskInboxEntryDto[];
  totalCount: number;
  unreadCount: number;
}

export interface TaskInboxEntryDto {
  id: string;
  taskId: string;
  instanceId: string;
  entityType: string;
  entityId: string;
  title: string;
  description?: string;
  priority: string;
  slaDueAt?: string;
  isRead: boolean;
  createdAt: string;
}

export interface InstanceStatusDto {
  instance: Record<string, unknown>;
  currentTasks: Record<string, unknown>[];
  completedTasks: Record<string, unknown>[];
  events: Record<string, unknown>[];
  progressPercent: number;
  estimatedCompletionAt?: string;
}

export interface WorkflowDashboardDto {
  running: number;
  paused: number;
  completedToday: number;
  slaBreaches: number;
  escalations: number;
  byDefinition: {
    code: string;
    nameFa: string;
    running: number;
    completed: number;
    slaBreachRate: number;
  }[];
  myTasksCount: number;
  urgentTasksCount: number;
  overdueTasksCount: number;
}

export interface WorkflowMetricsDto {
  totalInstances: number;
  completed: number;
  terminated: number;
  avgDurationHours: number;
  medianDurationHours: number;
  slaComplianceRate: number;
  byOutcome: Record<string, number>;
  bottleneckSteps: {
    stepId: string;
    stepName: string;
    avgHours: number;
    count: number;
  }[];
  escalationRate: number;
}

export interface SlaReportDto {
  totalTasks: number;
  breachedTasks: number;
  complianceRate: number;
  avgCompletionHours: number;
  byDefinition: {
    code: string;
    nameFa: string;
    total: number;
    breached: number;
    complianceRate: number;
  }[];
}
