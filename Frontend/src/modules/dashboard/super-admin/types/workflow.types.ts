// Workflow Types

export type WorkflowStatus = 'draft' | 'validating' | 'testing' | 'published' | 'deprecated';
export type TriggerType = 'park_onboarding' | 'company_onboarding' | 'lease_renewal' | 'utility_anomaly' | 'utility_invoice' | 'hse_incident' | 'risk_escalation' | 'permit_to_work' | 'contract_approval' | 'budget_approval' | 'inventory_adjustment' | 'payroll_approval' | 'b2b_award' | 'manual';
export type ApprovalType = 'sequential' | 'parallel' | 'any_of' | 'all_of';
export type WorkflowInstanceStatus = 'pending' | 'in_progress' | 'approved' | 'rejected' | 'rework' | 'cancelled' | 'expired';

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in' | 'not_in';
  value: unknown;
}

export interface ApprovalStep {
  id: string;
  name: string;
  order: number;
  approverType: 'role' | 'user' | 'department' | 'dynamic';
  approverId: string;
  approverName?: string;
  approvalType: ApprovalType;
  requiredApprovals?: number;
  slaDays: number;
  escalationDays?: number;
  escalationTo?: string;
  conditions?: WorkflowCondition[];
  canReject: boolean;
  canRework: boolean;
  notifyOnAssign: boolean;
  notifyOnComplete: boolean;
}

export interface FormField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'checkbox' | 'textarea' | 'file' | 'signature';
  required: boolean;
  options?: { value: string; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  visibleConditions?: WorkflowCondition[];
}

export interface NotificationTemplate {
  id: string;
  event: 'assigned' | 'approved' | 'rejected' | 'rework' | 'escalated' | 'completed' | 'expired';
  channels: ('email' | 'sms' | 'push')[];
  subject: string;
  body: string;
}

export interface Workflow {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  description: string;
  trigger: TriggerType;
  formSchema: FormField[];
  steps: ApprovalStep[];
  notifications: NotificationTemplate[];
  status: WorkflowStatus;
  version: number;
  publishedAt?: string;
  publishedBy?: string;
  testMode: boolean;
  analytics: {
    totalInstances: number;
    completedInstances: number;
    averageCompletionDays: number;
    rejectionRate: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowInstance {
  id: string;
  workflowId: string;
  workflowName: string;
  trigger: TriggerType;
  initiatorId: string;
  initiatorName: string;
  parkId?: string;
  parkName?: string;
  companyId?: string;
  companyName?: string;
  formData: Record<string, unknown>;
  currentStepId: string;
  currentStepName: string;
  status: WorkflowInstanceStatus;
  stepHistory: WorkflowStepAction[];
  startedAt: string;
  completedAt?: string;
  slaDeadline: string;
  isOverdue: boolean;
}

export interface WorkflowStepAction {
  stepId: string;
  stepName: string;
  actionType: 'approved' | 'rejected' | 'rework' | 'escalated' | 'skipped';
  actionBy: string;
  actionByName: string;
  actionAt: string;
  comments?: string;
  attachments?: string[];
}

export interface WorkflowTemplate {
  id: string;
  nameFa: string;
  nameEn?: string;
  description: string;
  category: string;
  trigger: TriggerType;
  previewImageUrl?: string;
  usageCount: number;
  createdAt: string;
}

export interface WorkflowScenario {
  id: string;
  workflowId: string;
  name: string;
  description: string;
  testData: Record<string, unknown>;
  expectedOutcome: 'approved' | 'rejected' | 'rework';
  lastRunAt?: string;
  lastRunResult?: 'passed' | 'failed';
  createdAt: string;
}
