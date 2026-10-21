import type { UUID } from './common.types';

export interface ZoneRole {
    id: UUID;
    name: string;
    nameEn: string;
    description: string;
    permissions: string[];
    isSystem: boolean;
    createdAt: string;
}

export interface ZoneUser {
    id: UUID;
    username: string;
    fullName: string;
    email: string;
    phone?: string;
    roleId: UUID;
    roleName: string;
    department?: string;
    isActive: boolean;
    lastLoginAt?: string;
    createdAt: string;
}

export interface NotificationRule {
    id: UUID;
    name: string;
    eventType: string;
    isActive: boolean;
    channels: ('email' | 'sms' | 'in_app')[];
    recipients: string[];
    createdAt: string;
}

export interface AuditLog {
    id: UUID;
    timestamp: string;
    actor: string;
    role: string;
    action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STATUS_CHANGE' | 'ASSIGN' | 'APPROVE' | 'REJECT';
    entityType: string;
    entityId: UUID;
    entityLabel: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    module: string;
}
