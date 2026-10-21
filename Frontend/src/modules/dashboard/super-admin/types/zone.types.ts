// src/modules/dashboard/super-admin/types/zone.types.ts

export interface ZoneOnboardingForm {
  // Step 1
  code: string;
  nameFa: string;
  nameEn: string;
  province: string;
  city: string;
  address: string;
  latitude: string;
  longitude: string;
  areaSqM: string;
  parkType: string;
  plan: string;
  lifecycleStatus: string;
  // Step 2
  gates: string;
  parkingCapacity: string;
  electricityCapacityKw: string;
  waterCapacityM3: string;
  gasCapacityNm3: string;
  wastewaterCapacityM3: string;
  internetCapacityMbps: string;
  fireStation: boolean;
  clinic: boolean;
  warehouse: boolean;
  weighbridge: boolean;
  // Step 3
  billingCycle: string;
  currency: string;
  taxProfile: string;
  bankAccount: string;
  utilityTariffGroup: string;
  // Step 4
  workingHours: string;
  holidayCalendar: string;
  zoneManagerId: string;
  financeManagerId: string;
  hseManagerId: string;
  securityManagerId: string;
  operationsManagerId: string;
  // Step 5 - Feature Flags
  features: {
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
  };
  // Step 6
  documents: File[];
}

export type OnboardingWorkflowStatus =
  | 'draft'
  | 'legal_review'
  | 'finance_review'
  | 'hse_review'
  | 'operations_review'
  | 'super_admin_approval'
  | 'active';