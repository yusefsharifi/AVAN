import { useState, useCallback } from 'react';
import { useCorrespondenceStore } from '../store';
import type { WorkflowStep, WorkflowAction, ActionType, Letter } from '../types';

export function useWorkflow(letterId: string | null) {
  const { letters, updateLetter, addAnnotation } = useCorrespondenceStore();
  const letter = letters.find(l => l.id === letterId);
  const [processing, setProcessing] = useState(false);

  const getActiveStep = useCallback(() => {
    if (!letter) return null;
    return letter.approvalChain.find(s => s.status === 'active' || s.status === 'pending') || null;
  }, [letter]);

  const getProgress = useCallback(() => {
    if (!letter || !letter.approvalChain.length) return { current: 0, total: 0, percentage: 0 };
    const done = letter.approvalChain.filter(s => s.status === 'approved').length;
    return {
      current: done,
      total: letter.approvalChain.length,
      percentage: Math.round((done / letter.approvalChain.length) * 100),
    };
  }, [letter]);

  const approve = useCallback(async (stepId?: string, comment?: string) => {
    if (!letter) return;
    setProcessing(true);
    try {
      const chain = [...letter.approvalChain];
      const stepIdx = stepId ? chain.findIndex(s => s.id === stepId) : chain.findIndex(s => s.status === 'active' || s.status === 'pending');
      if (stepIdx === -1) return;
      
      chain[stepIdx] = { ...chain[stepIdx], status: 'approved', date: new Date().toISOString(), comment };
      
      // Activate next step
      if (stepIdx + 1 < chain.length) {
        chain[stepIdx + 1] = { ...chain[stepIdx + 1], status: 'active' };
      }
      
      const allApproved = chain.every(s => s.status === 'approved');
      await updateLetter(letter.id, {
        approvalChain: chain,
        status: allApproved ? 'approved' : 'pending-approval',
      });
    } finally {
      setProcessing(false);
    }
  }, [letter, updateLetter]);

  const reject = useCallback(async (stepId: string, reason: string) => {
    if (!letter) return;
    setProcessing(true);
    try {
      const chain = letter.approvalChain.map(s =>
        s.id === stepId ? { ...s, status: 'rejected' as const, comment: reason } : s
      );
      await updateLetter(letter.id, {
        approvalChain: chain,
        status: 'returned',
      });
    } finally {
      setProcessing(false);
    }
  }, [letter, updateLetter]);

  const returnToStep = useCallback(async (targetStepIndex: number, reason: string) => {
    if (!letter) return;
    setProcessing(true);
    try {
      const chain = letter.approvalChain.map((s, i) => {
        if (i === targetStepIndex) return { ...s, status: 'active' as const };
        if (i > targetStepIndex) return { ...s, status: 'pending' as const };
        return s;
      });
      await updateLetter(letter.id, {
        approvalChain: chain,
        status: 'returned',
      });
      await addAnnotation(letter.id, `برگشت به مرحله «${chain[targetStepIndex].name}»: ${reason}`, '#fee2e2', false);
    } finally {
      setProcessing(false);
    }
  }, [letter, updateLetter, addAnnotation]);

  const addParaph = useCallback(async (stepId: string, text: string) => {
    if (!letter) return;
    await addAnnotation(letter.id, text, '#f0fdf4', true);
  }, [letter, addAnnotation]);

  return {
    letter,
    activeStep: getActiveStep(),
    progress: getProgress(),
    processing,
    approve,
    reject,
    returnToStep,
    addParaph,
  };
}
