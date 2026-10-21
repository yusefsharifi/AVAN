export type CompanyLifecycleStatus = 'applicant' | 'under_review' | 'active' | 'suspended' | 'closed';
export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type WorkPermitStatus = 'draft' | 'pending' | 'approved' | 'active' | 'suspended' | 'closed' | 'rejected';

export interface CompanyOnboardingRecord {
  id: string;
  companyName: string;
  companyType: string;
  registrationNumber: string;
  nationalId: string;
  taxNumber?: string;
  industry: string;
  lifecycleStatus: CompanyLifecycleStatus;
  zoneId: string;
  block: string;
  unit: string;
  employees: number;
  operationalCapacity?: string;
  hseContact?: string;
  financialContact?: string;
  documents: { id: string; name: string; type: string; uploadedAt: string }[];
  createdAt: string;
}

export interface UtilityMeter {
  id: string;
  code: string;
  utilityType: 'electricity' | 'water' | 'gas' | 'wastewater' | 'internet';
  companyId: string;
  companyName: string;
  location: string;
  unit: string;
  status: 'active' | 'faulty' | 'maintenance' | 'inactive';
  lastReading: number;
  lastReadingDate: string;
  anomalyThreshold: number;
}

export interface MeterReading {
  id: string;
  meterId: string;
  readingDate: string;
  currentValue: number;
  previousValue: number;
  consumption: number;
  source: 'manual' | 'iot' | 'import';
  recordedBy: string;
  note?: string;
}

export interface HSERecord {
  id: string;
  module: 'incident' | 'risk' | 'permit' | 'capa' | 'inspection' | 'drill' | 'hazmat';
  title: string;
  companyName?: string;
  status: string;
  severity?: AlertSeverity;
  dueDate?: string;
  createdAt: string;
}

export interface OperationalAlert {
  id: string;
  type: 'security' | 'logistics' | 'hse' | 'utility' | 'finance' | 'device' | 'contract';
  severity: AlertSeverity;
  title: string;
  description: string;
  companyName?: string;
  owner?: string;
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  dueDate?: string;
  createdAt: string;
}
