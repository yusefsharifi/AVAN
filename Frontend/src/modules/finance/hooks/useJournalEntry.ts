import { useCallback } from 'react';
import { useFinanceStore } from '../store';
import { validateVoucherBalance } from '../utils';
import type { JournalEntry } from '../types';

export function useJournalEntry() {
  const { createVoucher, postVoucher, reverseVoucher } = useFinanceStore();
  
  const create = useCallback((entries: JournalEntry[], description: string) => {
    const validation = validateVoucherBalance(entries);
    if (!validation.isBalanced) {
      throw new Error(`سند تراز نیست: مغایرت ${validation.difference.toLocaleString('fa-IR')} ریال`);
    }
    return createVoucher({ entries, description });
  }, [createVoucher]);
  
  const post = useCallback((id: string) => postVoucher(id), [postVoucher]);
  const reverse = useCallback((id: string, reason: string) => reverseVoucher(id, reason), [reverseVoucher]);
  
  return { create, post, reverse, validateBalance: validateVoucherBalance };
}
