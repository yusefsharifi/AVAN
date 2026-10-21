import { lazy } from "react";

// Portal modules
const GuardPortal = lazy(() => import("@/modules/portal/guard/GuardPortal"));
const CompanyPortal = lazy(() => import("@/modules/portal/company/CompanyPortal"));

// Dashboard modules
const ZoneManagerPortal = lazy(() => import("@/modules/dashboard/zone-manager/ZoneManagerPortal"));
const SuperAdminPortal = lazy(() => import("@/modules/dashboard/super-admin/SuperAdminPortal"));

// Document modules
const WaybillModule = lazy(() => import("@/modules/documents/waybill/WaybillModule"));

// Report modules
const FinancialModule = lazy(() => import("@/modules/reports/FinancialModule"));

export {
  GuardPortal,
  CompanyPortal,
  ZoneManagerPortal,
  SuperAdminPortal,
  WaybillModule,
  FinancialModule,
};
