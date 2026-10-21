import { lazy } from 'react';

const PortalScreen = lazy(() => import('./PortalScreen').then(m => ({ default: m.PortalScreen })));

export const portalRoutes = [
  { path: '/portal', element: <PortalScreen /> },
];
