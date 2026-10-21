export enum ProformaDirection {
  SALES = 'SALES',
  PURCHASE = 'PURCHASE',
}

export enum ProformaStatus {
  DRAFT = 'DRAFT',
  PENDING_INTERNAL_APPROVAL = 'PENDING_INTERNAL_APPROVAL',
  INTERNALLY_APPROVED = 'INTERNALLY_APPROVED',
  SENT_TO_PARTY = 'SENT_TO_PARTY',
  PARTY_ACCEPTED = 'PARTY_ACCEPTED',
  PARTY_REJECTED = 'PARTY_REJECTED',
  EXPIRED = 'EXPIRED',
  CONVERTED = 'CONVERTED',
  CANCELLED = 'CANCELLED',
}

export enum OrderStatus {
  DRAFT = 'DRAFT',
  CONFIRMED = 'CONFIRMED',
  IN_PRODUCTION = 'IN_PRODUCTION',
  READY_TO_SHIP = 'READY_TO_SHIP',
  SHIPPED = 'SHIPPED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  FULLY_RECEIVED = 'FULLY_RECEIVED',
  INVOICED = 'INVOICED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneType {
  PAYMENT = 'PAYMENT',
  DELIVERY = 'DELIVERY',
  INSPECTION = 'INSPECTION',
  SIGN_OFF = 'SIGN_OFF',
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
}

export enum ContractStatus {
  DRAFT = 'DRAFT',
  UNDER_REVIEW = 'UNDER_REVIEW',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  EXPIRING_SOON = 'EXPIRING_SOON',
  EXPIRED = 'EXPIRED',
  TERMINATED = 'TERMINATED',
  RENEWED = 'RENEWED',
}

export enum AgingBucket {
  CURRENT = 'CURRENT',
  DAYS_1_30 = 'DAYS_1_30',
  DAYS_31_60 = 'DAYS_31_60',
  DAYS_61_90 = 'DAYS_61_90',
  OVER_90 = 'OVER_90',
}

export enum CollectionStatus {
  NORMAL = 'NORMAL',
  REMINDER_SENT = 'REMINDER_SENT',
  DEMAND_LETTER = 'DEMAND_LETTER',
  INSTALLMENT_AGREED = 'INSTALLMENT_AGREED',
  LEGAL = 'LEGAL',
  WRITTEN_OFF = 'WRITTEN_OFF',
}

export enum CollectionActionType {
  REMINDER_CALL = 'REMINDER_CALL',
  REMINDER_SMS = 'REMINDER_SMS',
  REMINDER_LETTER = 'REMINDER_LETTER',
  DEMAND_LETTER = 'DEMAND_LETTER',
  INSTALLMENT_AGREEMENT = 'INSTALLMENT_AGREEMENT',
  LEGAL_NOTICE = 'LEGAL_NOTICE',
  COLLECTION_AGENCY = 'COLLECTION_AGENCY',
  WRITE_OFF = 'WRITE_OFF',
}

export enum CollectionOutcome {
  NO_RESPONSE = 'NO_RESPONSE',
  PROMISED_PAYMENT = 'PROMISED_PAYMENT',
  PARTIAL_PAYMENT = 'PARTIAL_PAYMENT',
  DISPUTE = 'DISPUTE',
  ESCALATED = 'ESCALATED',
}

export enum PartyType {
  BUYER = 'BUYER',
  SELLER = 'SELLER',
  BOTH = 'BOTH',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface ProformaApprovalStepConfig {
  stepOrder: number;
  roleFa: string;
  threshold?: bigint;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: { limit: number; hasMore: boolean; cursor: string | null };
}

export interface CreditCheckResult {
  allowed: boolean;
  creditLimit: number;
  creditUsed: number;
  available: number;
  utilizationPercent: number;
  warning: boolean;
}

export interface ProformaDashboardDto {
  total: number;
  draft: number;
  pendingApproval: number;
  internallyApproved: number;
  sentToParty: number;
  partyAccepted: number;
  converted: number;
  expired: number;
  conversionRate: number;
  avgApprovalHours: number;
  expiringIn7Days: number;
  byDirection: { sales: number; purchase: number };
  totalSalesValue: number;
  totalPurchaseValue: number;
}

export interface OrderStatsDto {
  total: number;
  byStatus: Record<string, number>;
  byDirection: { sales: number; purchase: number };
  totalSalesValue: number;
  totalPurchaseValue: number;
  avgFulfillmentDays: number;
  overdueMilestones: number;
}

export interface AgingSnapshotDto {
  byBucket: Record<string, { count: number; totalAmount: number }>;
  byParty: { partyId: string; partyName: string; buckets: Record<string, number> }[];
  totalReceivable: number;
  collectionRate: number;
}

export interface CollectionStatsDto {
  totalCases: number;
  openCases: number;
  resolvedCases: number;
  totalOverdue: number;
  avgDaysOverdue: number;
  byStatus: Record<string, number>;
  collectionRateLast30Days: number;
}

export interface CalendarEventDto {
  date: string;
  type: 'PAYMENT' | 'DELIVERABLE' | 'CONTRACT_EXPIRY';
  contractId: string;
  contractNumber: string;
  partyName: string;
  amount?: number;
  title?: string;
}

export interface PartyProfileDto {
  party: any;
  proformas: any[];
  orders: any[];
  contracts: any[];
  collectionCases: any[];
  totalPurchased: number;
  totalSold: number;
  totalOutstanding: number;
  creditUtilization: number;
}

export interface PartyRankingDto {
  partyId: string;
  partyName: string;
  partyType: string;
  totalVolume: number;
  transactionCount: number;
  rating: number | null;
}

export interface EscalationResult {
  escalated: number;
  letters: number;
}
