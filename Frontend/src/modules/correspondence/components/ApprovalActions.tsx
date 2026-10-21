import { useState } from 'react';
import { CheckCircle, XCircle, RotateCcw, Send, PenLine } from 'lucide-react';
import { ConfirmDialog } from '@/shared/components/feedback/ConfirmDialog';

interface ApprovalActionsProps {
  onApprove: (comment?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  onReturn: (stepIndex: number, reason: string) => Promise<void>;
  onRefer: () => void;
  processing: boolean;
}

export function ApprovalActions({ onApprove, onReject, onReturn, onRefer, processing }: ApprovalActionsProps) {
  const [showReject, setShowReject] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [approveComment, setApproveComment] = useState('');

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={() => setShowApprove(true)} disabled={processing}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 disabled:opacity-50 transition-colors">
        <CheckCircle className="w-4 h-4" /><span>تأیید</span>
      </button>
      <button onClick={() => setShowReject(true)} disabled={processing}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-500 disabled:opacity-50 transition-colors">
        <XCircle className="w-4 h-4" /><span>رد</span>
      </button>
      <button onClick={() => setShowReturn(true)} disabled={processing}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
        <RotateCcw className="w-4 h-4" /><span>برگشت</span>
      </button>
      <button onClick={onRefer} disabled={processing}
        className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">
        <Send className="w-4 h-4" /><span>ارجاع</span>
      </button>

      {/* Approve Dialog */}
      <ConfirmDialog open={showApprove} onClose={() => { setShowApprove(false); setApproveComment(''); }}
        onConfirm={() => { onApprove(approveComment); setShowApprove(false); setApproveComment(''); }}
        title="تأیید نامه" description="آیا از تأیید این نامه اطمینان دارید؟" confirmText="تأیید" />

      {/* Reject Dialog */}
      {showReject && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReject(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-96 z-50" dir="rtl">
            <h3 className="text-base font-bold text-foreground mb-3">رد نامه</h3>
            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3} placeholder="دلیل رد..."
              className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-accent mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowReject(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium">انصراف</button>
              <button onClick={() => { onReject(rejectReason); setShowReject(false); setRejectReason(''); }}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white text-sm font-bold hover:bg-red-500 disabled:opacity-40">رد</button>
            </div>
          </div>
        </>
      )}

      {/* Return Dialog */}
      {showReturn && (
        <>
          <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setShowReturn(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-96 z-50" dir="rtl">
            <h3 className="text-base font-bold text-foreground mb-3">برگشت به مرحله قبل</h3>
            <textarea value={returnReason} onChange={e => setReturnReason(e.target.value)} rows={3} placeholder="دلیل برگشت..."
              className="w-full bg-secondary border border-border rounded-lg p-3 text-sm text-foreground focus:outline-none focus:border-accent mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setShowReturn(false)} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium">انصراف</button>
              <button onClick={() => { onReturn(0, returnReason); setShowReturn(false); setReturnReason(''); }}
                disabled={!returnReason.trim()}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-500 disabled:opacity-40">برگشت</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
