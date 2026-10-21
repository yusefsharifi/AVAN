import { lazy } from 'react';
const B2BDashboard = lazy(() => import('./features/dashboard/B2BDashboard'));
const ParkMarketplaceDashboard = lazy(() => import('./features/dashboard/ParkMarketplaceDashboard'));
const RFQList = lazy(() => import('./features/rfq-management/RFQList'));
const RFQCreateWizard = lazy(() => import('./features/rfq-management/RFQCreateWizard'));
const RFQDetail = lazy(() => import('./features/rfq-management/RFQDetail'));
const AvailableRFQs = lazy(() => import('./features/bid-management/AvailableRFQs'));
const BidForm = lazy(() => import('./features/bid-management/BidForm'));
const MyBids = lazy(() => import('./features/bid-management/MyBids'));
const BidComparison = lazy(() => import('./features/comparison/BidComparison'));
export const b2bExchangeRoutes = [
  { path: '/city/marketplace', element: <ParkMarketplaceDashboard /> },
  { path: '/portal/marketplace', element: <B2BDashboard /> },
  { path: '/portal/marketplace/rfqs', element: <RFQList /> },
  { path: '/portal/marketplace/rfqs/create', element: <RFQCreateWizard /> },
  { path: '/portal/marketplace/rfqs/:id', element: <RFQDetail /> },
  { path: '/portal/marketplace/rfqs/:id/bids', element: <BidComparison /> },
  { path: '/portal/marketplace/bids', element: <MyBids /> },
  { path: '/portal/marketplace/bids/opportunities', element: <AvailableRFQs /> },
  { path: '/portal/marketplace/bids/create/:rfqId', element: <BidForm /> },
];
