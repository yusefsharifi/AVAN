import { useState, useCallback } from 'react';

export function useApprovalWorkflow() {
  const [pendingApprovals, setPendingApprovals] = useState([
    { id: 'APR-001', type: 'journal_voucher', referenceNumber: 'JV-1403-000004', amount: 52800000, preparedBy: 'مریم رضایی', date: '۱۴۰۳/۰۴/۱۶', status: 'pending' as const },
    { id: 'APR-002', type: 'payment', referenceNumber: 'PAY-1403-000012', amount: 1800000000, preparedBy: 'زهرا امینی', date: '۱۴۰۳/۰۴/۱۵', status: 'pending' as const },
  ]);
  
  const approve = useCallback((id: string) => {
    setPendingApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'approved' as const } : a));
  }, []);
  
  const reject = useCallback((id: string, reason: string) => {
    setPendingApprovals(prev => prev.map(a => a.id === id ? { ...a, status: 'rejected' as const } : a));
  }, []);
  
  return { pendingApprovals, approve, reject, pendingCount: pendingApprovals.filter(a => a.status === 'pending').length };
}
