import { createBrowserRouter, Navigate, Outlet } from 'react-router';
import { lazy, Suspense } from 'react';
import { TopBar } from './components';
import { ProtectedRoute, getDefaultPathForRole } from './components/ProtectedRoute';
import { useAuthStore } from './stores/useAuthStore';

// Lazy-loaded portal modules
const LoginPage = lazy(() => import('./pages/LoginPage'));
const GuardPortal = lazy(() => import('@/modules/portal/guard/GuardPortal'));
const CompanyPortal = lazy(() => import('@/modules/portal/company/CompanyPortal'));
const ZoneManagerPortal = lazy(() => import('@/modules/dashboard/zone-manager/ZoneManagerPortal'));
const SuperAdminPortal = lazy(() => import('@/modules/dashboard/super-admin/SuperAdminPortal'));
const WeighbridgePortal = lazy(() => import('@/modules/portal/weighbridge/WeighbridgePortal'));
const CorrespondencePortal = lazy(() => import('@/modules/portal/correspondence/CorrespondencePortal'));
const WorkflowPortal = lazy(() => import('@/modules/portal/workflow/WorkflowPortal'));
const VerifyPortal = lazy(() => import('@/modules/portal/verify/VerifyPortal'));
const MobilePortal = lazy(() => import('@/modules/portal/mobile/MobilePortal'));
const ReportsHub = lazy(() => import('@/modules/finance/components/ReportsHub'));
const FinanceScreen = lazy(() => import('@/modules/finance/FinanceScreen').then(m => ({ default: m.FinanceScreen })));
const HRScreen = lazy(() => import('@/modules/hr/HRScreen'));
const InventoryScreen = lazy(() => import('@/modules/inventory/InventoryScreen').then(m => ({ default: m.InventoryScreen })));
const B2BDashboard = lazy(() => import('@/modules/b2b-exchange/features/dashboard/B2BDashboard'));
const B2BPageShell = lazy(() => import('@/modules/b2b-exchange/components/B2BPageShell'));
const ParkMarketplaceDashboard = lazy(() => import('@/modules/b2b-exchange/features/dashboard/ParkMarketplaceDashboard'));
const RFQList = lazy(() => import('@/modules/b2b-exchange/features/rfq-management/RFQList'));
const RFQCreateWizard = lazy(() => import('@/modules/b2b-exchange/features/rfq-management/RFQCreateWizard'));
const RFQDetail = lazy(() => import('@/modules/b2b-exchange/features/rfq-management/RFQDetail'));
const AvailableRFQs = lazy(() => import('@/modules/b2b-exchange/features/bid-management/AvailableRFQs'));
const BidForm = lazy(() => import('@/modules/b2b-exchange/features/bid-management/BidForm'));
const MyBids = lazy(() => import('@/modules/b2b-exchange/features/bid-management/MyBids'));
const BidComparison = lazy(() => import('@/modules/b2b-exchange/features/comparison/BidComparison'));
const TrialBalancePage = lazy(() => import('@/modules/finance/pages/TrialBalancePage'));
const AccountCardPage = lazy(() => import('@/modules/finance/pages/AccountCardPage'));
const BalanceSheetPage = lazy(() => import('@/modules/finance/pages/BalanceSheetPage'));
const IncomeStatementPage = lazy(() => import('@/modules/finance/pages/IncomeStatementPage'));
const AssetRegister = lazy(() => import('@/modules/finance/pages/AssetRegister'));
const DepreciationRun = lazy(() => import('@/modules/finance/pages/DepreciationRun'));
const FiscalYearClose = lazy(() => import('@/modules/finance/pages/FiscalYearClose'));
const PayrollCalculation = lazy(() => import('@/modules/hr/pages/PayrollCalculation'));
const EmployeeList = lazy(() => import('@/modules/hr/pages/EmployeeList'));
const EmployeeProfile = lazy(() => import('@/modules/hr/pages/EmployeeProfile'));
const PayrollDashboard = lazy(() => import('@/modules/hr/pages/PayrollDashboard'));
const PayrollReports = lazy(() => import('@/modules/hr/pages/PayrollReports'));
// Commercial module
const CommercialScreen = lazy(() => import('@/modules/commercial/CommercialScreen'));
const RolesPage = lazy(() => import('./pages/RolesPage'));
const AccessDeniedPage = lazy(() => import('./pages/AccessDeniedPage'));

function PortalLoader({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><span className="text-muted-foreground text-sm">در حال بارگذاری…</span></div>}>
      {children}
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">۴۰۴</h1>
        <p className="text-muted-foreground">صفحه مورد نظر یافت نشد</p>
      </div>
    </div>
  );
}

function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col overflow-hidden" dir="rtl">
      <TopBar />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function RootRedirect() {
  const user = useAuthStore((s) => s.user);
  const dest = user ? getDefaultPathForRole(user.role) : '/login';
  return <Navigate to={dest} replace />;
}

const SUPER_ADMIN_ROLES = ['SUPER_ADMIN'] as const;
const CITY_ROLES = ['ZONE_MANAGER', 'ZONE_OPERATOR'] as const;
const COMPANY_ROLES = ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'COMPANY_STAFF', 'DRIVER'] as const;
const SECURITY_ROLES = ['GUARD'] as const;

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <PortalLoader>
        <LoginPage />
      </PortalLoader>
    ),
  },

  {
    element: (
      <ProtectedRoute>
        <Outlet />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <RootRedirect /> },
      {
        path: '/access-denied',
        element: (
          <PortalLoader>
            <AccessDeniedPage />
          </PortalLoader>
        ),
      },
      {
        path: '/roles/*',
        element: (
          <ProtectedRoute requiredPermission="users.roles.view">
            <RootLayout>
              <PortalLoader><RolesPage /></PortalLoader>
            </RootLayout>
          </ProtectedRoute>
        ),
      },

      {
        path: '/super-admin/*',
        element: (
          <ProtectedRoute allowedRoles={[...SUPER_ADMIN_ROLES]}>
            <RootLayout>
              <PortalLoader><SuperAdminPortal /></PortalLoader>
            </RootLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/city/*',
        element: (
          <ProtectedRoute allowedRoles={[...CITY_ROLES]}>
            <RootLayout>
              <PortalLoader><ZoneManagerPortal /></PortalLoader>
            </RootLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/company/*',
        element: (
          <ProtectedRoute allowedRoles={[...COMPANY_ROLES]}>
            <RootLayout>
              <PortalLoader><CompanyPortal /></PortalLoader>
            </RootLayout>
          </ProtectedRoute>
        ),
      },
      {
        path: '/security/*',
        element: (
          <ProtectedRoute allowedRoles={[...SECURITY_ROLES]}>
            <RootLayout>
              <PortalLoader><GuardPortal /></PortalLoader>
            </RootLayout>
          </ProtectedRoute>
        ),
      },

      {
        path: '/weighbridge/*',
        element: <RootLayout><PortalLoader><WeighbridgePortal /></PortalLoader></RootLayout>,
      },
      {
        path: '/correspondence/*',
        element: <RootLayout><PortalLoader><CorrespondencePortal /></PortalLoader></RootLayout>,
      },
      {
        path: '/workflow/*',
        element: <RootLayout><PortalLoader><WorkflowPortal /></PortalLoader></RootLayout>,
      },
      {
        path: '/verify/*',
        element: <RootLayout><PortalLoader><VerifyPortal /></PortalLoader></RootLayout>,
      },
      {
        path: '/mobile/*',
        element: <RootLayout><PortalLoader><MobilePortal /></PortalLoader></RootLayout>,
      },
      { path: '/portal/marketplace/rfqs/:id/bids', element: <RootLayout><PortalLoader><B2BPageShell><BidComparison /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/bids', element: <RootLayout><PortalLoader><B2BPageShell><MyBids /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/bids/create/:rfqId', element: <RootLayout><PortalLoader><B2BPageShell><BidForm /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/bids/opportunities', element: <RootLayout><PortalLoader><B2BPageShell><AvailableRFQs /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/rfqs/:id', element: <RootLayout><PortalLoader><B2BPageShell><RFQDetail /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/rfqs/create', element: <RootLayout><PortalLoader><B2BPageShell><RFQCreateWizard /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/portal/marketplace/rfqs', element: <RootLayout><PortalLoader><B2BPageShell><RFQList /></B2BPageShell></PortalLoader></RootLayout> },
      { path: '/city/marketplace', element: <RootLayout><PortalLoader><ParkMarketplaceDashboard /></PortalLoader></RootLayout> },
      { path: '/portal/marketplace', element: <RootLayout><PortalLoader><B2BDashboard /></PortalLoader></RootLayout> },
      { path: '/inventory', element: <RootLayout><PortalLoader><InventoryScreen /></PortalLoader></RootLayout> },
      { path: '/hr', element: <RootLayout><PortalLoader><HRScreen /></PortalLoader></RootLayout> },
      { path: '/finance', element: <RootLayout><PortalLoader><FinanceScreen /></PortalLoader></RootLayout> },
      { path: '/accounting/payroll/reports', element: <RootLayout><PortalLoader><PayrollReports /></PortalLoader></RootLayout> },
      { path: '/accounting/payroll/dashboard', element: <RootLayout><PortalLoader><PayrollDashboard /></PortalLoader></RootLayout> },
      { path: '/accounting/payroll/employees/:id', element: <RootLayout><PortalLoader><EmployeeProfile /></PortalLoader></RootLayout> },
      { path: '/accounting/payroll/employees', element: <RootLayout><PortalLoader><EmployeeList /></PortalLoader></RootLayout> },
      { path: '/accounting/payroll/calculation', element: <RootLayout><PortalLoader><PayrollCalculation /></PortalLoader></RootLayout> },
      { path: '/accounting/fiscal-year/close', element: <RootLayout><PortalLoader><FiscalYearClose /></PortalLoader></RootLayout> },
      { path: '/accounting/assets/register', element: <RootLayout><PortalLoader><AssetRegister /></PortalLoader></RootLayout> },
      { path: '/accounting/assets/depreciation', element: <RootLayout><PortalLoader><DepreciationRun /></PortalLoader></RootLayout> },
      { path: '/accounting/reports/trial-balance', element: <RootLayout><PortalLoader><TrialBalancePage /></PortalLoader></RootLayout> },
      { path: '/accounting/reports/account-card', element: <RootLayout><PortalLoader><AccountCardPage /></PortalLoader></RootLayout> },
      { path: '/accounting/reports/balance-sheet', element: <RootLayout><PortalLoader><BalanceSheetPage /></PortalLoader></RootLayout> },
      { path: '/accounting/reports/income-statement', element: <RootLayout><PortalLoader><IncomeStatementPage /></PortalLoader></RootLayout> },
      {
        path: '/accounting/reports/*',
        element: <RootLayout><PortalLoader><ReportsHub /></PortalLoader></RootLayout>,
      },
      {
        path: '/commercial',
        element: <RootLayout><PortalLoader><CommercialScreen /></PortalLoader></RootLayout>,
      },

      {
        path: '*',
        element: <RootLayout><NotFound /></RootLayout>,
      },
    ],
  },
]);
