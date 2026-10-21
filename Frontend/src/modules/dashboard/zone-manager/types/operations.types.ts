import type { UUID, Severity, Priority } from './common.types';

export type AlertType = 'security' | 'logistics' | 'hse' | 'utility' | 'finance' | 'device' | 'contract';

export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type TaskStatus = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

export interface OperationalAlert {
    id: UUID;
    alertNumber: string;
    type: AlertType;
    severity: Severity;
    title: string;
    description: string;
    companyId?: UUID;
    companyName?: string;
    zone?: string;
    owner?: string;
    team?: string;
    status: AlertStatus;
    dueDate?: string;
    escalationLevel: number;
    createdAt: string;
    resolvedAt?: string;
    closedAt?: string;
    notes: { text: string; by: string; at: string }[];
}

export interface TaskChecklistItem {
    id: UUID;
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
}

export interface OperationsTask {
    id: UUID;
    taskNumber: string;
    title: string;
    alertId?: UUID;
    taskType: string;
    priority: Priority;
    assignedTeam?: string;
    assignedUser?: string;
    status: TaskStatus;
    startDate?: string;
    dueDate?: string;
    completedAt?: string;
    checklist: TaskChecklistItem[];
    notes: { text: string; by: string; at: string }[];
    createdAt: string;
}
