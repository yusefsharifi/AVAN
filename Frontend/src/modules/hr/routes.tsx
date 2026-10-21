import { lazy } from 'react';
const HRScreen = lazy(() => import('./HRScreen'));
const EmployeeList = lazy(() => import('./pages/EmployeeList'));
const EmployeeProfile = lazy(() => import('./pages/EmployeeProfile'));
const PayrollCalculation = lazy(() => import('./pages/PayrollCalculation'));
const PayrollDashboard = lazy(() => import('./pages/PayrollDashboard'));
const PayrollReports = lazy(() => import('./pages/PayrollReports'));
export const hrRoutes = [
  { path: '/hr', element: <HRScreen /> },
  { path: '/accounting/payroll/employees', element: <EmployeeList /> },
  { path: '/accounting/payroll/employees/:id', element: <EmployeeProfile /> },
  { path: '/accounting/payroll/calculation', element: <PayrollCalculation /> },
  { path: '/accounting/payroll/dashboard', element: <PayrollDashboard /> },
  { path: '/accounting/payroll/reports', element: <PayrollReports /> },
];
