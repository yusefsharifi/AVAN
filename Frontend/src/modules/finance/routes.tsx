import { lazy } from 'react';

const FinanceScreen = lazy(() => import('./FinanceScreen').then(m => ({ default: m.FinanceScreen })));

const AssetRegister = lazy(() => import('./pages/AssetRegister'));
const DepreciationRun = lazy(() => import('./pages/DepreciationRun'));

export const financeRoutes = [
  { path: '/finance', element: <FinanceScreen /> },
  { path: '/accounting/assets/register', element: <AssetRegister /> },
  { path: '/accounting/assets/depreciation', element: <DepreciationRun /> },
];
