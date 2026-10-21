import { useState, useCallback } from 'react';

export function useBankReconciliation() {
  const [bankItems, setBankItems] = useState<{ id: string; description: string; amount: number; matched: boolean }[]>([
    { id: 'B-001', description: 'واریز شرکت پلاستیک', amount: 52800000, matched: false },
    { id: 'B-002', description: 'پرداخت حقوق', amount: -1800000000, matched: false },
    { id: 'B-003', description: 'کارمزد بانکی', amount: -1500000, matched: false },
  ]);
  const [bookItems, setBookItems] = useState<{ id: string; description: string; amount: number; matched: boolean }[]>([
    { id: 'J-001', description: 'درآمد اجاره مرداد', amount: 52800000, matched: false },
    { id: 'J-002', description: 'پرداخت حقوق پرسنل', amount: -1800000000, matched: false },
    { id: 'J-003', description: 'هزینه‌های بانکی', amount: -1500000, matched: false },
  ]);
  
  const match = useCallback((bankId: string, bookId: string) => {
    setBankItems(prev => prev.map(b => b.id === bankId ? { ...b, matched: true } : b));
    setBookItems(prev => prev.map(b => b.id === bookId ? { ...b, matched: true } : b));
  }, []);
  
  const unmatchedBank = bankItems.filter(b => !b.matched);
  const unmatchedBook = bookItems.filter(b => !b.matched);
  const isReconciled = unmatchedBank.length === 0 && unmatchedBook.length === 0;
  
  return { bankItems, bookItems, match, unmatchedBank, unmatchedBook, isReconciled };
}
