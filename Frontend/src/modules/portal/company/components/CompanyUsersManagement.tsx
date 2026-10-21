import UsersManagement from '@/modules/dashboard/zone-manager/components/ZoneUsersManagement';
import { useAuthStore } from '@/core/stores/useAuthStore';

export default function CompanyUsersManagement() {
  const user = useAuthStore((s) => s.user);
  const companyName = user?.companyId || 'شرکت';
  return <UsersManagement scope="company" scopeName={companyName} />;
}
