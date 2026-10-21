import { useNationalStore } from '../store/useNationalStore';
import { useNationalCompanyStore } from '../store/useNationalCompanyStore';
import { useFinancialStore } from '../store/useFinancialStore';
import { useAlertStore } from '../store/useAlertStore';
import { useBasculeStore } from '../store/useBasculeStore';
import { useWaybillStore } from '../store/useWaybillStore';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useCertificateStore } from '../store/useCertificateStore';

export async function loadSuperAdminStores(): Promise<void> {
  const nat = useNationalStore.getState();
  const cmp = useNationalCompanyStore.getState();
  const fin = useFinancialStore.getState();
  const alert = useAlertStore.getState();
  const bascule = useBasculeStore.getState();
  const waybill = useWaybillStore.getState();
  const gov = useGovernanceStore.getState();
  const cert = useCertificateStore.getState();

  const results = await Promise.allSettled([
    nat.loadFromApi(),
    fin.loadFromApi(),
    alert.loadFromApi(),
    bascule.loadFromApi(),
    waybill.loadFromApi(),
    gov.loadFromApi(),
  ]);

  if (nat.parks.length > 0 && cmp.companies.length === 0) {
    try { await cmp.loadFromApi(); } catch {}
  }

  if (nat.companies.length > 0 || cmp.companies.length > 0) {
    try { await cert.loadFromApi(); } catch {}
  }

  const failures = results.filter((r) => r.status === 'rejected');
  if (failures.length > 0) {
    console.warn('[SuperAdmin] Some stores failed to load from API:', failures.length);
  }
}

export function seedSuperAdminStores() {
  void loadSuperAdminStores();
}
