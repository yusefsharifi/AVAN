import type { UUID, Severity, ZoneDocument, WorkflowStep } from './common.types';

export type RiskCategory = 'safety' | 'health' | 'environment' | 'fire' | 'chemical' | 'mechanical' | 'electrical';

export type RiskStatus = 'identified' | 'assessed' | 'mitigating' | 'controlled' | 'accepted' | 'closed';

export type IncidentType = 'injury' | 'near_miss' | 'property_damage' | 'environmental' | 'fire' | 'chemical_spill' | 'equipment_failure' | 'security';

export type IncidentSeverity = 'minor' | 'moderate' | 'serious' | 'critical' | 'catastrophic';

export type PTWType = 'hot_work' | 'cold_work' | 'confined_space' | 'height_work' | 'electrical' | 'excavation' | 'chemical';

export type PTWStatus = 'draft' | 'submitted' | 'hse_review' | 'zm_review' | 'approved' | 'active' | 'closed' | 'cancelled';

export type CAPASource = 'incident' | 'risk' | 'inspection' | 'audit' | 'manual';

export type CAPAStatus = 'open' | 'in_progress' | 'pending_verification' | 'verified' | 'closed' | 'overdue';

export type InspectionType = 'safety' | 'fire' | 'chemical' | 'equipment' | 'environmental' | 'hse_compliance';

export type InspectionResult = 'pass' | 'fail' | 'conditional';

export type DrillType = 'fire' | 'earthquake' | 'chemical_spill' | 'evacuation' | 'medical' | 'security';

export type HazmatStatus = 'active' | 'quarantine' | 'blocked';

export interface Risk {
    id: UUID;
    riskNumber: string;
    category: RiskCategory;
    companyId: UUID;
    companyName: string;
    location: string;
    hazard: string;
    likelihood: number;
    impact: number;
    riskScore: number;
    existingControls: string;
    mitigationAction?: string;
    owner?: string;
    dueDate?: string;
    status: RiskStatus;
    severity: Severity;
    createdAt: string;
    updatedAt: string;
}

export interface Incident {
    id: UUID;
    incidentNumber: string;
    type: IncidentType;
    severity: IncidentSeverity;
    companyId: UUID;
    companyName: string;
    location: string;
    dateTime: string;
    reporter: string;
    description: string;
    immediateAction?: string;
    rootCause?: string;
    capaId?: UUID;
    financialLoss?: number;
    humanInjury: boolean;
    injuryDetails?: string;
    owner?: string;
    status: 'reported' | 'investigating' | 'corrective_action' | 'closed' | 'reopened';
    attachments: ZoneDocument[];
    createdAt: string;
}

export interface PermitToWork {
    id: UUID;
    ptwNumber: string;
    workType: PTWType;
    companyId: UUID;
    companyName: string;
    location: string;
    requester: string;
    supervisor: string;
    startDate: string;
    endDate: string;
    riskAssessment?: string;
    ppeRequirements: string[];
    safetyChecklist: { item: string; checked: boolean }[];
    lotoRequired: boolean;
    gasTestRequired: boolean;
    gasTestResult?: string;
    fireWatchRequired: boolean;
    fireWatchPerson?: string;
    hseApproval?: { approved: boolean; by?: string; at?: string; note?: string };
    zmApproval?: { approved: boolean; by?: string; at?: string; note?: string };
    status: PTWStatus;
    createdAt: string;
}

export interface CAPA {
    id: UUID;
    capaNumber: string;
    source: CAPASource;
    sourceId?: UUID;
    sourceRef?: string;
    correctiveAction: string;
    preventiveAction: string;
    owner: string;
    dueDate: string;
    verificationResult?: string;
    effectivenessReview?: string;
    status: CAPAStatus;
    createdAt: string;
    updatedAt: string;
}

export interface Inspection {
    id: UUID;
    title: string;
    type: InspectionType;
    companyId: UUID;
    companyName: string;
    inspector: string;
    scheduledDate: string;
    completedDate?: string;
    findings: { item: string; result: 'pass' | 'fail'; note?: string }[];
    overallResult?: InspectionResult;
    severity?: Severity;
    reinspectionRequired: boolean;
    reinspectionDate?: string;
    capaId?: UUID;
    status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
    createdAt: string;
}

export interface EmergencyDrill {
    id: UUID;
    title: string;
    scenario: string;
    type: DrillType;
    zoneId: string;
    date: string;
    participants: number;
    durationMinutes: number;
    result?: string;
    improvementActions: string[];
    drillScore?: number;
    status: 'planned' | 'completed';
    createdAt: string;
}

export interface HazmatMaterial {
    id: UUID;
    materialName: string;
    unClass?: string;
    companyId: UUID;
    companyName: string;
    location: string;
    maxStorageLimit: number;
    currentQuantity: number;
    unit: string;
    emergencyProcedure?: string;
    status: HazmatStatus;
    createdAt: string;
}

export interface WorkflowStep extends WorkflowStep_ { }
interface WorkflowStep_ {
    id: UUID;
    order: number;
    name: string;
    role: string;
    status: 'pending' | 'in_progress' | 'completed' | 'rejected';
    actor?: string;
    completedAt?: string;
    note?: string;
}
