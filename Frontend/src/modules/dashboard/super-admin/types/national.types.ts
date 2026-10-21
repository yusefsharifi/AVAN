// National Types for Super Admin Portal

export type LifecycleStatus = 'draft' | 'under_review' | 'active' | 'suspended' | 'closed';
export type ParkPlan = 'basic' | 'standard' | 'premium' | 'national';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'emergency';
export type AlertStatus = 'open' | 'investigating' | 'resolved' | 'closed';
export type UserLifecycle = 'invited' | 'pending_activation' | 'active' | 'suspended' | 'deactivated' | 'terminated';

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface ParkInfrastructure {
  gates: number;
  parkingCapacity: number;
  electricityCapacityKw?: number;
  waterCapacityM3?: number;
  gasCapacityNm3?: number;
  wastewaterCapacityM3?: number;
  internetCapacityMbps?: number;
  fireStation: boolean;
  clinic: boolean;
  warehouse: boolean;
  weighbridge: boolean;
}

export interface ParkManagementTeam {
  zoneManagerId?: string;
  financeManagerId?: string;
  hseManagerId?: string;
  securityManagerId?: string;
  operationsManagerId?: string;
}

export interface ParkFeatureFlags {
  anpr: boolean;
  weighbridge: boolean;
  visitorManagement: boolean;
  workflow: boolean;
  finance: boolean;
  inventory: boolean;
  hr: boolean;
  marketplace: boolean;
  iot: boolean;
  mobileApp: boolean;
  reports: boolean;
}

export interface ParkFinancialSetup {
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  currency: string;
  taxProfile: string;
  bankAccount: string;
  utilityTariffGroup: string;
  utilityReceivableAccount: string;
  utilityRevenueAccount: string;
  penaltyAccount: string;
  depositAccount: string;
}

export interface ParkOperations {
  workingHoursStart: string;
  workingHoursEnd: string;
  holidayCalendar: string[];
  onCallTeam: string[];
}

export interface ParkDocument {
  id: string;
  type: 'legal' | 'management_contract' | 'insurance' | 'fire_safety' | 'utility_permit' | 'gis_map' | 'operational_plan';
  name: string;
  uploadedAt: string;
  expiresAt?: string;
  url: string;
}

export interface NationalPark {
  id: string;
  code: string;
  nameFa: string;
  nameEn?: string;
  province: string;
  city: string;
  address: string;
  geoLocation: GeoLocation;
  areaSqM: number;
  maximumCompanyCapacity: number;
  currentCompanyCount: number;
  occupancyPercent: number;
  lifecycleStatus: LifecycleStatus;
  plan: ParkPlan;
  infrastructure: ParkInfrastructure;
  managementTeam: ParkManagementTeam;
  enabledFeatures: ParkFeatureFlags;
  financialSetup?: ParkFinancialSetup;
  operations?: ParkOperations;
  documents: ParkDocument[];
  healthScore: number;
  monthlyTraffic: number;
  onlineDevices: number;
  totalDevices: number;
  createdAt: string;
  updatedAt: string;
}

export interface NationalAlert {
  id: string;
  type: string;
  severity: AlertSeverity;
  sourceModule: string;
  zoneId: string;
  zoneName: string;
  companyId?: string;
  companyName?: string;
  ownerId?: string;
  ownerName?: string;
  slaDeadline: string;
  escalationLevel: number;
  status: AlertStatus;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface NationalKPI {
  totalParks: number;
  activeParks: number;
  criticalAlertParks: number;
  totalCompanies: number;
  activeCompanies: number;
  suspendedCompanies: number;
  totalEmployees: number;
  totalDevices: number;
  offlineDevices: number;
  monthlyTraffic: number;
  financeCollections: number;
  overdueReceivables: number;
  utilityConsumption: number;
  hseOpenIncidents: number;
  openWorkPermits: number;
  activeRFQs: number;
  marketplaceValue: number;
}

export interface MorningBriefingItem {
  id: string;
  type: 'iot_alert' | 'license_expiry' | 'utility_overdue' | 'hse_incident' | 'compliance' | 'finance';
  count: number;
  message: string;
  severity: AlertSeverity;
}

export interface WatchlistItem {
  id: string;
  parkId?: string;
  companyId?: string;
  name: string;
  type: 'high_risk' | 'low_hse' | 'high_receivables' | 'offline_devices' | 'low_utility_collection' | 'low_occupancy' | 'high_incidents' | 'compliance_issues';
  score: number;
  reason: string;
  addedAt: string;
}

export interface DashboardWidget {
  id: string;
  type: 'kpi' | 'alerts' | 'watchlist' | 'briefing' | 'chart' | 'map';
  title: string;
  position: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface NavigationGroup {
  id: string;
  title: string;
  icon: string;
  items: NavigationItem[];
  badge?: number;
  expanded?: boolean;
}

export interface NavigationItem {
  id: string;
  title: string;
  path: string;
  badge?: number;
  badgeType?: 'info' | 'warning' | 'critical';
}
