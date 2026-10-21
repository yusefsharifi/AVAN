import CommercialScreen from '@/modules/commercial/CommercialScreen';
import CommercialDashboard from '@/modules/commercial/features/dashboard/CommercialDashboard';
import { ProformaList } from '@/modules/commercial/features/proforma/ProformaList';
import OrderList from '@/modules/commercial/features/orders/OrderList';
import { OrderDetail } from '@/modules/commercial/features/orders/OrderDetail';
import AgingDashboard from '@/modules/commercial/features/collection/AgingDashboard';
import PartyList from '@/modules/commercial/features/crm-lite/PartyList';
import PartyProfile from '@/modules/commercial/features/crm-lite/PartyProfile';
import CreditLimitManager from '@/modules/commercial/features/crm-lite/CreditLimitManager';
import { ContractList } from '@/modules/commercial/features/contracts/ContractList';
import ContractDetail from '@/modules/commercial/features/contracts/ContractDetail';
import { MilestoneCalendar } from '@/modules/commercial/features/contracts/MilestoneCalendar';
import { ProformaDetail } from '@/modules/commercial/features/proforma/ProformaDetail';
import { OverdueList } from '@/modules/commercial/features/collection/OverdueList';
import { InstallmentManager } from '@/modules/commercial/features/collection/InstallmentManager';

const routes = [
  {
    path: '/commercial',
    element: <CommercialScreen />,
  },
  {
    path: '/dashboard',
    element: <CommercialDashboard />,
  },
  {
    path: '/proforma',
    element: <ProformaList />,
  },
  {
    path: '/proforma/:id',
    element: <ProformaDetail />,
  },
  {
    path: '/orders',
    element: <OrderList />,
  },
  {
    path: '/orders/:id',
    element: <OrderDetail />,
  },
  {
    path: '/collection',
    element: <AgingDashboard />,
  },
  {
    path: '/collection/:id',
    element: <OverdueList />,
  },
  {
    path: '/contracts',
    element: <ContractList />,
  },
  {
    path: '/contracts/:id',
    element: <ContractDetail />,
  },
  {
    path: '/collection/overdue',
    element: <OverdueList />,
  },
  {
    path: '/collection/installment',
    element: <InstallmentManager />,
  },
  {
    path: '/contracts/:id/calendar',
    element: <MilestoneCalendar />,
  },
  {
    path: '/parties',
    element: <PartyList />,
  },
  {
    path: '/parties/:id',
    element: <PartyProfile />,
  },
  {
    path: '/credit',
    element: <CreditLimitManager />,
  },
  {
    path: '/contracts/:id',
    element: <ContractDetail />,
  },
];

export default routes;