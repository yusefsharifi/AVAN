// src/modules/dashboard/super-admin/components/shared/company/useWizardDraft.ts
import { useEffect, useState } from 'react';

export function useWizardDraft<T>(draftKey: string, initial: () => T) {
  const [draft, setDraft] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      return raw ? { ...initial(), ...JSON.parse(raw) } : initial();
    } catch {
      return initial();
    }
  });

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [draftKey, draft]);

  const clearDraft = () => localStorage.removeItem(draftKey);

  return { draft, setDraft, clearDraft };
}
