import { Check, Circle, Clock } from 'lucide-react';
import { useProcurementStore } from '../store/useProcurementStore';

interface TimelineStep {
  label: string;
  date?: string;
  actor?: string;
  state: 'completed' | 'active' | 'pending';
}

export default function ProcurementTimeline({ prId }: { prId: string }) {
  const { purchaseRequests, rfqs, purchaseOrders, receipts } = useProcurementStore();

  const pr = purchaseRequests.find((p) => p.id === prId);
  const rfq = rfqs.find((r) => r.prId === prId);
  const po = purchaseOrders.find((p) => p.prId === prId);
  const receipt = receipts.find((r) => r.poId === po?.id);
  const quotationsReceived = rfq?.quotations.some((q) => q.status === 'received' || q.status === 'awarded');

  if (!pr) return <p className="text-sm text-muted-foreground">درخواستی یافت نشد</p>;

  const steps: TimelineStep[] = [
    { label: 'ایجاد درخواست خرید', date: pr.createdAt.slice(0, 10), actor: pr.requestedBy, state: 'completed' },
    { label: 'تأیید درخواست', date: pr.approvedAt, actor: pr.approvedBy, state: pr.approvedAt ? 'completed' : pr.status === 'cancelled' ? 'pending' : 'active' },
    { label: 'ارسال استعلام', date: rfq?.createdAt?.slice(0, 10), actor: rfq?.createdBy, state: rfq ? 'completed' : pr.status === 'approved' ? 'active' : 'pending' },
    { label: 'دریافت پیشنهادات', state: quotationsReceived ? 'completed' : rfq ? 'active' : 'pending' },
    { label: 'ایجاد سفارش خرید (PO)', date: po?.createdAt?.slice(0, 10), actor: po?.createdBy, state: po ? 'completed' : quotationsReceived ? 'active' : 'pending' },
    { label: 'ارسال PO به تأمین‌کننده', date: po?.sentAt?.slice(0, 10), state: po?.sentAt ? 'completed' : po ? 'active' : 'pending' },
    { label: 'دریافت کالا', date: receipt?.receivedAt, actor: receipt?.receivedBy, state: receipt ? 'completed' : po?.sentAt ? 'active' : 'pending' },
    { label: 'دریافت فاکتور', date: po?.invoiceDate, state: po?.invoiceNumber ? 'completed' : receipt ? 'active' : 'pending' },
    { label: 'پرداخت', state: po?.status === 'paid' ? 'completed' : po?.invoiceNumber ? 'active' : 'pending' },
  ];

  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${step.state === 'completed' ? 'bg-emerald-500 text-white' : step.state === 'active' ? 'bg-amber-400 text-white' : 'bg-secondary text-muted-foreground'}`}>
              {step.state === 'completed' ? <Check className="w-3.5 h-3.5" /> : step.state === 'active' ? <Clock className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5" />}
            </div>
            {i < steps.length - 1 && <div className={`w-px flex-1 min-h-[24px] ${step.state === 'completed' ? 'bg-emerald-300' : 'bg-border'}`} />}
          </div>
          <div className="pb-4">
            <p className={`text-xs font-semibold ${step.state === 'pending' ? 'text-muted-foreground' : 'text-foreground'}`}>{step.label}</p>
            {(step.date || step.actor) && <p className="text-[10px] text-muted-foreground" dir="ltr">{step.date} {step.actor ? `— ${step.actor}` : ''}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
