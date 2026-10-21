// ── Core Entity Types ────────────────────────────────────────────────────────

export type CompanyType = 'manufacturing' | 'trading' | 'service' | 'logistics';
export type CompanyStatus = 'active' | 'suspended' | 'terminated' | 'pending_onboarding';
export type ShipmentStatus = 'draft' | 'pending_approval' | 'approved' | 'scheduled' | 'arrived' | 'weighing' | 'unloading' | 'completed' | 'rejected' | 'cancelled';
export type ShipmentDirection = 'inbound' | 'outbound' | 'return';
export type VehicleType = 'truck' | 'van' | 'tanker' | 'container';
export type UnitType = 'pallet' | 'carton' | 'bulk' | 'drum';
export type Currency = 'IRR' | 'USD';
export type PaymentTerms = 'monthly' | 'quarterly' | 'annually';
export type PermitType = 'operating' | 'environmental' | 'fire_safety' | 'transport' | 'construction';
export type PermitStatus = 'valid' | 'expiring_soon' | 'expired' | 'suspended';
export type ContractorStatus = 'active' | 'suspended' | 'pending_verification' | 'offboarded';
export type InvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'paid' | 'overdue' | 'cancelled';
export type ReconciliationStatus = 'unmatched' | 'matched' | 'discrepancy';
export type WorkflowStatus = 'running' | 'completed' | 'rejected' | 'cancelled';
export type Severity = 'low' | 'normal' | 'high' | 'critical';
export type Importance = 'low' | 'normal' | 'high' | 'critical';
export type HandlingRequirement = 'refrigerated' | 'fragile' | 'oversized' | 'hazmat' | 'perishable';
export type ContractorGrade = 'A' | 'B' | 'C' | 'D' | 'F';

// ── Contact Types ────────────────────────────────────────────────────────────

export interface ContactPerson {
  name: string;
  phone: string;
  email: string;
  role: string;
}

export interface BankAccount {
  bankName: string;
  accountNumber: string;
  cardNumber: string;
  shaba: string;
}

// ── Company ──────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  code: string;
  name: string;
  nameEn: string;
  type: CompanyType;
  status: CompanyStatus;
  ceoName: string;
  ceoPhone: string;
  adminContact: ContactPerson;
  technicalContact: ContactPerson;
  unitNumber: string;
  areaSqm: number;
  gpsCoordinates?: [number, number];
  contractStartDate: string;
  contractEndDate: string;
  monthlyRent: number;
  depositAmount: number;
  paymentTerms: PaymentTerms;
  bankAccount: BankAccount;
  permits: CompanyPermit[];
  hseRating: number;
  complianceScore: number;
  totalShipmentsYTD: number;
  avgProcessingTime: number;
  outstandingBalance: number;
  activeContractorsCount: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  version: number;
}

export interface CompanyPermit {
  id: string;
  type: PermitType;
  number: string;
  issuedBy: string;
  issueDate: string;
  expiryDate: string;
  status: PermitStatus;
  documentUrl: string;
  renewalTaskId?: string;
}

// ── Shipment ─────────────────────────────────────────────────────────────────

export interface Shipment {
  id: string;
  waybillNumber: string;
  companyId: string;
  contractorId?: string;
  plateNumber: string;
  plateNumberEn: string;
  vehicleType: VehicleType;
  driverName: string;
  driverPhone: string;
  driverNationalCode: string;
  cargoType: string;
  cargoDescription: string;
  weightDeclared: number;
  weightActual?: number;
  weightDiscrepancy?: number;
  packagesCount: number;
  unitType: UnitType;
  unNumber?: string;
  safetyClass?: string;
  handlingRequirements: HandlingRequirement[];
  temperatureMin?: number;
  temperatureMax?: number;
  temperatureLog?: TemperatureReading[];
  dockId: string;
  scheduledDate: string;
  scheduledTimeSlot: string;
  actualArrival?: string;
  actualDeparture?: string;
  freightAmount?: number;
  freightCurrency: Currency;
  status: ShipmentStatus;
  direction: ShipmentDirection;
  returnRef?: string;
  documents: ShipmentDocument[];
  createdAt: string;
  createdBy: string;
  history: ShipmentHistoryEvent[];
}

export interface TemperatureReading {
  timestamp: string;
  temperature: number;
  humidity?: number;
  sensorId: string;
  location: [number, number];
}

export interface ShipmentDocument {
  id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface ShipmentHistoryEvent {
  id: string;
  action: string;
  by: string;
  timestamp: string;
  details?: string;
}

// ── Contractor ───────────────────────────────────────────────────────────────

export interface Contractor {
  id: string;
  companyId: string;
  name: string;
  companyName: string;
  workType: string;
  workers: ContractorWorker[];
  maxWorkersAllowed: number;
  certifications: Certification[];
  insurancePolicy: InsurancePolicy;
  hseScore: number;
  incidents: Incident[];
  dailyChecklists: DailyChecklist[];
  kpi: ContractorKPI;
  rfidCards: RFIDCard[];
  gateAccessEnabled: boolean;
  status: ContractorStatus;
  createdAt: string;
}

export interface ContractorWorker {
  id: string;
  name: string;
  role: string;
  nationalCode: string;
  phone: string;
  certExpiry?: string;
}

export interface Certification {
  id: string;
  name: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuer: string;
}

export interface InsurancePolicy {
  policyNumber: string;
  provider: string;
  coverageAmount: number;
  issueDate: string;
  expiryDate: string;
}

export interface Incident {
  id: string;
  date: string;
  type: string;
  severity: Severity;
  description: string;
  location: string;
  injuredCount: number;
  rootCause?: string;
  correctiveAction?: string;
  status: 'open' | 'investigating' | 'closed';
}

export interface DailyChecklist {
  id: string;
  date: string;
  contractorId: string;
  items: ChecklistItem[];
  overallResult: 'pass' | 'fail';
  signedBy: string;
  signedAt: string;
}

export interface ChecklistItem {
  id: string;
  question: string;
  answer: boolean;
  notes?: string;
  photoUrl?: string;
}

export interface ContractorKPI {
  onTimeDeliveryRate: number;
  safetyViolationCount: number;
  qualityScore: number;
  avgResponseTime: number;
  lastEvaluationDate: string;
  overallGrade: ContractorGrade;
}

export interface RFIDCard {
  id: string;
  cardNumber: string;
  assignedTo: string;
  isActive: boolean;
  lastUsed?: string;
}

// ── Invoice & Finance ────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  companyId: string;
  contractId: string;
  invoiceNumber: string;
  description: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  currency: Currency;
  status: InvoiceStatus;
  dueDate: string;
  paidAt?: string;
  paidAmount?: number;
  approvalFlow: ApprovalStep[];
  milestones?: MilestonePayment[];
  bankTransactionId?: string;
  reconciliationStatus: ReconciliationStatus;
  createdAt: string;
}

export interface ApprovalStep {
  id: string;
  name: string;
  assigneeRole: string;
  assigneeName?: string;
  status: 'pending' | 'active' | 'approved' | 'rejected';
  slaMinutes: number;
  startedAt?: string;
  completedAt?: string;
  comment?: string;
}

export interface MilestonePayment {
  id: string;
  milestoneName: string;
  percentage: number;
  amount: number;
  dueUpon: string;
  status: 'pending' | 'completed' | 'paid';
  completedAt?: string;
}

// ── Workflow ─────────────────────────────────────────────────────────────────

export interface WorkflowTemplate {
  id: string;
  name: string;
  entityType: string;
  steps: WorkflowStep[];
  isActive: boolean;
}

export interface WorkflowStep {
  id: string;
  name: string;
  roleId: string;
  type: 'sequential' | 'parallel_any' | 'parallel_all';
  slaMinutes: number;
  actions: WorkflowActionType[];
  condition?: string;
  autoAssignee?: string;
  escalationRule?: {
    notifyAfterMinutes: number;
    escalateToRoleId: string;
  };
}

export interface WorkflowInstance {
  id: string;
  templateId: string;
  entityId: string;
  entityType: string;
  currentStepId: string;
  status: WorkflowStatus;
  startedAt: string;
  completedAt?: string;
  deadlineAt: string;
  history: WorkflowHistoryEvent[];
  parallelResults?: Record<string, 'pending' | 'approved' | 'rejected'>;
}

export type WorkflowActionType = 'approve' | 'reject' | 'refer' | 'return' | 'delegate' | 'comment';

export interface WorkflowHistoryEvent {
  id: string;
  stepId: string;
  action: WorkflowActionType;
  performedBy: string;
  performedAt: string;
  comment?: string;
  reason?: string;
}

// ── Timeline ─────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  entityType: string;
  entityId: string;
  eventType: string;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
  actor: { id: string; name: string; role: string };
  timestamp: string;
  importance: Importance;
  relatedEvents: string[];
}

// ── Audit Log ────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: { userId: string; role: string; ip: string; userAgent: string };
  action: 'VIEW' | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'EXPORT' | 'PRINT' | 'LOGIN' | 'LOGOUT';
  resource: { type: string; id: string };
  changes?: { field: string; oldValue: unknown; newValue: unknown }[];
  metadata?: Record<string, unknown>;
  sessionId: string;
  hash: string;
  previousHash: string;
}

// ── Scheduling ───────────────────────────────────────────────────────────────

export interface TimeSlot {
  id: string;
  dockId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'available' | 'booked' | 'blocked';
  shipmentId?: string;
  companyId?: string;
}

export interface SchedulingRequest {
  companyId: string;
  cargoType: string;
  preferredDate: string;
  preferredTimeSlot?: string;
  vehicleType: VehicleType;
  weight: number;
}

export interface SlotRecommendation {
  slot: TimeSlot;
  score: number;
  reason: string;
}

// ── Visitor ──────────────────────────────────────────────────────────────────

export interface Visitor {
  id: string;
  name: string;
  nationalCode: string;
  phone: string;
  company: string;
  hostId: string;
  hostName: string;
  purpose: string;
  visitDate: string;
  validFrom: string;
  validUntil: string;
  status: 'pending_approval' | 'approved' | 'checked_in' | 'checked_out' | 'expired' | 'rejected';
  qrCode: string;
  parkingSlot?: string;
  checkedInAt?: string;
  checkedOutAt?: string;
}

// ── KPI & Dashboard ──────────────────────────────────────────────────────────

export interface KPIData {
  label: string;
  labelFa: string;
  value: number;
  unit: string;
  change: number;
  changeDirection: 'up' | 'down' | 'flat';
  icon: string;
  color: string;
}

export interface DockUtilization {
  dockId: string;
  name: string;
  utilization: number;
  bookings: number;
  avgTurnaround: number;
}

export interface ForecastData {
  date: string;
  predicted: number;
  actual?: number;
  confidence: [number, number];
}

// ── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

// ── Filter Types ─────────────────────────────────────────────────────────────

export interface CompanyFilters {
  search?: string;
  type?: CompanyType;
  status?: CompanyStatus;
  sector?: string;
}

export interface ShipmentFilters {
  search?: string;
  status?: ShipmentStatus;
  direction?: ShipmentDirection;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  cargoType?: string;
}

export interface ContractorFilters {
  search?: string;
  status?: ContractorStatus;
  companyId?: string;
  workType?: string;
}

export interface InvoiceFilters {
  search?: string;
  status?: InvoiceStatus;
  companyId?: string;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
}

// ── Permission Types ─────────────────────────────────────────────────────────

export type Role = 'park_admin' | 'park_manager' | 'operations_manager' | 'finance_manager' | 'hse_manager' | 'gatekeeper' | 'company_admin' | 'company_user' | 'driver' | 'auditor' | 'system';

export interface Permission {
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'approve' | 'export' | 'print';
  conditions?: {
    dataScope?: 'own' | 'department' | 'company' | 'all';
    fieldMask?: string[];
    amountLimit?: number;
  };
}
