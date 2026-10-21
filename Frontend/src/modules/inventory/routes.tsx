import { lazy } from 'react';

const InventoryScreen = lazy(() => import('./InventoryScreen').then(m => ({ default: m.InventoryScreen })));

export const inventoryRoutes = [
  { path: '/inventory', element: <InventoryScreen /> },
];
