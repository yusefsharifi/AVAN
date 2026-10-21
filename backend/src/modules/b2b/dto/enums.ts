// ═══════════════════════════════════════════════════════════════════════════════
// M11: B2B Exchange — Enums & Types
// ═══════════════════════════════════════════════════════════════════════════════

export enum RFQStatusEnum {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLARIFICATION = 'CLARIFICATION',
  CLOSED = 'CLOSED',
  UNDER_EVALUATION = 'UNDER_EVALUATION',
  AWARDED = 'AWARDED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export enum BiddingModeEnum {
  SEALED = 'SEALED',
  OPEN = 'OPEN',
  REVERSE_AUCTION = 'REVERSE_AUCTION',
}

export enum BidStatusEnum {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SHORTLISTED = 'SHORTLISTED',
  WINNER = 'WINNER',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  DISQUALIFIED = 'DISQUALIFIED',
}

export interface EvaluationCriterion {
  criterion: string;
  weight: number;
  description: string;
  subCriteria?: string;
}

export interface BidScores {
  [key: string]: number;
}

export interface PriceBreakdownItem {
  item: string;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface RfqStatsDto {
  total: number;
  draft: number;
  published: number;
  closed: number;
  awarded: number;
  cancelled: number;
  avgBidsPerRfq: number;
  avgEvaluationDays: number;
  topCategories: { categoryId: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

export interface MarketplaceStatsDto {
  totalProducts: number;
  totalSuppliers: number;
  totalCategories: number;
  activeRfqs: number;
  completedTransactions: number;
  totalTransactionVolume: number;
}

export interface BidComparisonDto {
  rfq: any;
  bids: {
    bid: any;
    supplier: any;
    scores: { criterion: string; weight: number; score: number; weightedScore: number }[];
    totalScore: number;
    rank: number;
    financials: { unitPrice: number; finalPrice: number; taxIncluded: boolean; taxRate: number };
    delivery: { days: number; location: string; paymentTerms: string };
    technical: { compliance: boolean; deviations: string; warranty: number };
  }[];
  winner: any | null;
}

export interface SupplierRankingDto {
  supplierId: string;
  companyName: string;
  rating: number;
  winRate: number;
  totalWonBids: number;
  totalBidsPlaced: number;
  avgDeliveryScore: number;
  compositeScore: number;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    limit: number;
    hasMore: boolean;
    cursor: string | null;
  };
}
