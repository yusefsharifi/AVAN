export type UnitType = "kg" | "ton" | "piece" | "liter";
export type VerificationStatus = "pending" | "verified" | "rejected" | "in_progress";
export type WaybillStatus = "draft" | "submitted" | "technical_verified" | "manager_approved" | "security_verified" | "completed" | "rejected" | "empty_exit";
export type VerificationLevel = "waybill" | "item" | "weight" | "all";
export type Direction = "inbound" | "outbound";
export type VerificationStep = "technical" | "manager" | "security" | "gate" | "completion";

export interface WaybillItem {
  id: string;
  waybillId: string;
  productId: string;
  productName: string;
  productNameFa: string;
  unitType: UnitType;
  quantity: number;
  weight: number;
  expectedWeight: number;
  expectedQuantity: number;
  unitPrice?: number;
  totalPrice?: number;
  barcode?: string;
  serialNumber?: string;
  sku?: string;
  categoryId: string;
  categoryName: string;
  notes?: string;
  attachments?: string[];
}

export interface WaybillImageAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
  caption?: string;
  isSignature?: boolean;
}

export interface Waybill {
  id: string;
  waybillNumber: string;
  companyId: string;
  companyName: string;
  companyUnit: string;
  zoneSection: string;
  vehiclePlate: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  direction: Direction;
  cargoType: string;
  mainWeight: number;
  totalWeight: number;
  totalQuantity: number;
  totalPieces: number;
  unit: UnitType;
  donorCompanyId?: string;
  recipientCompanyId?: string;
  status: WaybillStatus;
  urgencyLevel: "normal" | "high" | "urgent";
  date: string;
  time: string;
  dueDate: string;
  submittedBy: string;
  submittedAt: string;
  approvedBy?: string;
  approvedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  closureTimestamp?: string;
  archivedAt?: string;
  notes?: string;
  attachments: WaybillImageAttachment[];
  items: WaybillItem[];
  verificationLevel: VerificationLevel;
  rejectionReason?: string;
  verificationSteps: WaybillVerificationStep[];
  targetType: "single" | "all";
  accountingPeriod: string;
}

export interface WaybillVerificationStep {
  id: string;
  waybillId: string;
  step: VerificationStep;
  status: VerificationStatus;
  assignedTo: string;
  assignedRole: string;
  startedAt?: string;
  completedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  notes?: string;
  itemsVerified?: WaybillVerificationItem[];
  requiresEscalation?: boolean;
  nextApprover?: string;
  timeoutMinutes?: number;
}

export interface WaybillVerificationItem {
  id: string;
  verificationStepId: string;
  waybillItemId: string;
  waybillItem: WaybillItem;
  expectedQuantity: number;
  actualQuantity: number;
  expectedWeight: number;
  actualWeight: number;
  quantityMatch: boolean;
  weightMatch: boolean;
  discrepancyReason?: string;
  itemStatus: "matched" | "partially_matched" | "mismatched";
  verifiedBy: string;
  verificationTimestamp: string;
}

export interface WaybillScenario {
  id: string;
  name: string;
  nameFa: string;
  description: string;
  descriptionFa: string;
  category: "standard" | "export" | "import" | "internal" | "dangerous" | "empty";
  steps: WaybillScenarioStep[];
  conditions: ScenarioCondition[];
  applicablePortals: string[];
  applicableRoles: string[];
  isDefault: boolean;
  slaMinutes: number;
  approvers: string[];
  parallelApproval: boolean;
  autoAssign: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
  isActive: boolean;
}

export interface WaybillScenarioStep {
  id: string;
  stepId: VerificationStep;
  stepName: string;
  stepNameFa: string;
  order: number;
  requiredApprovers: string[];
  requiredRoles: string[];
  approvalType: "single" | "majority" | "unanimous";
  timeoutMinutes: number;
  canReject: boolean;
  canEscalate: boolean;
  triggerNextStepOn?: "approved" | "rejected" | "both";
  nextStepIds: string[];
  conditions?: ScenarioCondition[];
}

export interface ScenarioCondition {
  id: string;
  conditionType: "weight" | "quantity" | "value" | "time" | "custom";
  field: string;
  operator: "greater_than" | "less_than" | "equals" | "not_equals" | "contains";
  value: any;
  step?: VerificationStep;
}

export interface WaybillVerification {
  id: string;
  waybillId: string;
  step: VerificationStep;
  verifierId: string;
  verifierName: string;
  verifierRole: string;
  verificationLevel: VerificationLevel;
  status: VerificationStatus;
  startedAt: string;
  completedAt?: string;
  approvalSignature?: string;
  digitalSignature?: string;
  notes?: string;
  itemsVerified: WaybillVerificationItem[];
  overallStatus: "passed" | "failed" | "passed_with_notes" | "requires_recheck";
  rejectionReasons: RejectionRecord[];
  photos?: WaybillImageAttachment[];
  attachments?: WaybillImageAttachment[];
}

export interface RejectionRecord {
  id: string;
  rejectionType: "quantity" | "weight" | "product" | "documentation" | "other";
  description: string;
  descriptionFa?: string;
  severity: "minor" | "major" | "critical";
  requiresReentry: boolean;
  estimatedTimeToFix: number;
}

export interface ItemMasterData {
  id: string;
  sku: string;
  name: string;
  nameFa: string;
  categoryId: string;
  categoryName: string;
  categoryNameFa: string;
  unitType: UnitType;
  defaultWeight: number;
  unitPrice: number;
  maxStock: number;
  minStock: number;
  locationId: string;
  photos?: string[];
  barcode?: string;
  serialRange?: {
    start: number;
    end: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmptyExit {
  id: string;
  vehiclePlate: string;
  entryWaybillId?: string;
  entryTimestamp: string;
  exitTimestamp: string;
  reason: "completed_with_empty" | "returned_to_sender" | "cancelled" | "redirected";
  verifiedBy: string;
  verificationDetails: string;
  photos: WaybillImageAttachment[];
  status: "verified" | "pending" | "rejected";
  nextAction?: string;
}

export interface WaybillReport {
  id: string;
  type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  title: string;
  titleFa: string;
  period: {
    startDate: string;
    endDate: string;
  };
  generatedAt: string;
  generatedBy: string;
  reportData: any;
  filters: ReportFilter;
}

export interface ReportFilter {
  companyIds?: string[];
  waybillStatus?: WaybillStatus[];
  direction?: Direction[];
  dateRange?: {
    start: string;
    end: string;
  };
  vehicleTypes?: string[];
  categories?: string[];
  verificationSteps?: VerificationStep[];
}

export interface WaybillAuditLog {
  id: string;
  waybillId: string;
  action: string;
  actionFa: string;
  performedBy: string;
  performedByRole: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  changes: AuditChange[];
  relatedEntityId?: string;
  relatedEntityType?: string;
  notes?: string;
}

export interface AuditChange {
  field: string;
  oldValue: any;
  newValue: any;
  changeType: "added" | "modified" | "deleted";
}

export interface VehicleProfile {
  id: string;
  plate: string;
  type: "truck" | "van" | "car" | "motorcycle" | "bus";
  capacityKg: number;
  insuranceExpiry: string;
  registrationExpiry: string;
  lastMaintenance: string;
  ownerId: string;
  ownerName: string;
  ownerCompanyId: string;
  isActive: boolean;
}

export interface CompanyProfile {
  id: string;
  name: string;
  nameFa: string;
  regNo: string;
  economicCode: string;
  zoneSection: string;
  contactPerson: string;
  contactPhone: string;
  address: string;
  isActive: boolean;
}

export interface InventorySnapshot {
  id: string;
  waybillId: string;
  productId: string;
  beforeQuantity: number;
  beforeWeight: number;
  afterQuantity: number;
  afterWeight: number;
  changeQuantity: number;
  changeWeight: number;
  unitType: UnitType;
  location: string;
  movementType: "inbound" | "outbound" | "adjustment";
  referenceNumber: string;
  timestamp: string;
  performedBy: string;
}