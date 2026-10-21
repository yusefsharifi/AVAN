export type UUID = string;

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type LifecycleStatus = 'draft' | 'pending' | 'active' | 'suspended' | 'expired' | 'closed' | 'cancelled';

export interface Address {
  zoneId: string;
  block: string;
  plot?: string;
  unit: string;
}

export interface Contact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
  isPrimary: boolean;
}

export interface ZoneDocument {
  id: UUID;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  version: number;
}

export interface WorkflowStep {
  id: UUID;
  order: number;
  name: string;
  role: string;
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  actor?: string;
  completedAt?: string;
  note?: string;
}

export interface AuditEntry {
  id: UUID;
  timestamp: string;
  actor: string;
  role: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN';
  entityType: string;
  entityId: UUID;
  changes?: Record<string, { old: unknown; new: unknown }>;
}

export interface FilterState {
  search: string;
  status: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}
