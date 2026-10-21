import { useState } from 'react';
import { useCorrespondenceStore } from '../store';
import { useWorkflow } from '../hooks';
import { WorkflowStepper } from './WorkflowStepper';
import { LetterTimeline } from './LetterTimeline';
import { ApprovalActions } from './ApprovalActions';
import { AttachmentViewer } from './AttachmentViewer';
import { STATUS_CONFIG, PRIORITY_CONFIG, CLASSIFICATION_CONFIG } from '../constants';
import { ArrowRight, Star, Printer, Download, QrCode, Copy, X, Check } from 'lucide-react';

interface LetterDetailProps {
  letterId: string;
  onBack: () => void;
}

export function LetterDetail({ letterId, onBack }: LetterDetailProps) {
  const { letters, toggleStarred } = useCorrespondenceStore();
  const letter = letters.find(l => l.id === letterId);
  const workflow = useWorkflow(letterId);
  const [activeTab, setActiveTab] = useState<'detail' | 'timeline' | 'attachments'>('detail');
  const [showQR, setShowQR] = useState(false);
  const [copied, setCopied] = useState(false);

  const verifyUrl = letter ? `${window.location.origin}/verify?mode=letter&hash=${letter.qrHash}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(verifyUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (!letter) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">نامه یافت نشد</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${STATUS_CONFIG[letter.status]?.bg} ${STATUS_CONFIG[letter.status]?.color}`}>
                {STATUS_CONFIG[letter.status]?.fa}
              </span>
              {letter.classification !== 'unclassified' && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CLASSIFICATION_CONFIG[letter.classification]?.bg} ${CLASSIFICATION_CONFIG[letter.classification]?.color}`}>
                  {CLASSIFICATION_CONFIG[letter.classification]?.fa}
                </span>
              )}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${PRIORITY_CONFIG[letter.priority]?.bg} ${PRIORITY_CONFIG[letter.priority]?.color}`}>
                {PRIORITY_CONFIG[letter.priority]?.fa}
              </span>
            </div>
            <h2 className="text-sm font-bold text-foreground mt-1">{letter.subject}</h2>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => toggleStarred(letter.id)} className="p-1.5 rounded-lg hover:bg-secondary">
            <Star className={`w-4 h-4 ${letter.starred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
          </button>
          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Printer className="w-4 h-4" /></button>
          <button className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground"><Download className="w-4 h-4" /></button>
          <button onClick={() => setShowQR(true)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground" title="کد QR">
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Workflow Stepper */}
      <div className="px-4 py-3 border-b border-border">
        <WorkflowStepper steps={letter.approvalChain.map(s => ({ ...s, state: s.status === 'active' ? 'current' : s.status === 'approved' ? 'done' : 'pending' }))} currentStep={letter.approvalChain.findIndex(s => s.status === 'active')} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        {[{ id: 'detail' as const, label: 'جزئیات' }, { id: 'timeline' as const, label: 'زمان‌بندی' }, { id: 'attachments' as const, label: 'پیوست‌ها' }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab === tab.id ? 'bg-accent text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {activeTab === 'detail' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">شماره ثبت</span><span className="text-xs font-mono text-foreground" dir="ltr">{letter.registryNumber}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">فرستنده</span><span className="text-xs text-foreground">{letter.sender}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">سازمان</span><span className="text-xs text-foreground">{letter.senderOrg}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">تاریخ ایجاد</span><span className="text-xs text-foreground">{letter.createdAt}</span></div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">امضاکننده</span><span className="text-xs text-foreground">{letter.signatory}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">سمت</span><span className="text-xs text-foreground">{letter.signatoryRole}</span></div>
                <div className="flex justify-between"><span className="text-xs text-muted-foreground">SLA</span><span className="text-xs text-foreground">{letter.slaHours} ساعت</span></div>
                {letter.responseDeadline && <div className="flex justify-between"><span className="text-xs text-muted-foreground">سررسید پاسخ</span><span className="text-xs text-amber-600 font-semibold">{letter.responseDeadline}</span></div>}
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">گیرندگان:</p>
              {letter.recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-secondary/30 mb-1">
                  <span className="text-xs text-foreground">{r.name}</span>
                  {r.org && <span className="text-[10px] text-muted-foreground">({r.org})</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${r.action === 'action' ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'}`}>
                    {r.action === 'action' ? 'اقدام' : r.action === 'info' ? 'اطلاع' : 'بهره‌برداری'}
                  </span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">متن نامه:</p>
              <div className="bg-secondary/30 rounded-lg p-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">{letter.body}</div>
            </div>
          </div>
        )}
        {activeTab === 'timeline' && (
          <LetterTimeline actions={[]} annotations={letter.annotations} />
        )}
        {activeTab === 'attachments' && (
          <AttachmentViewer attachments={letter.attachments} />
        )}
      </div>

      {/* Approval Actions */}
      {letter.status === 'pending-approval' && (
        <div className="border-t border-border px-4 py-3">
          <ApprovalActions
            onApprove={workflow.approve}
            onReject={workflow.reject}
            onReturn={workflow.returnToStep}
            onRefer={() => {}}
            processing={workflow.processing}
          />
        </div>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-xl" onClick={e => e.stopPropagation()} dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <QrCode className="w-4 h-4 text-accent" />
                کد QR نامه
              </h3>
              <button onClick={() => setShowQR(false)} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR placeholder — in production use the `qrcode` package */}
            <div className="bg-white rounded-xl p-4 mb-4 flex items-center justify-center">
              <div className="w-40 h-40 relative">
                <svg viewBox="0 0 100 100" className="w-full h-full">
                  {/* Finder patterns */}
                  <rect x="5" y="5" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="12" y="12" width="16" height="16" rx="1" fill="#000"/>
                  <rect x="65" y="5" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="72" y="12" width="16" height="16" rx="1" fill="#000"/>
                  <rect x="5" y="65" width="30" height="30" rx="3" fill="none" stroke="#000" strokeWidth="3"/>
                  <rect x="12" y="72" width="16" height="16" rx="1" fill="#000"/>
                  {/* Data modules (simplified) */}
                  {[40,44,48,52,56,60].map(x => [40,44,48,52,56,60].map(y =>
                    Math.sin(x * y) > 0.3 ? <rect key={`${x}-${y}`} x={x} y={y} width="3" height="3" fill="#000"/> : null
                  ))}
                  <rect x="40" y="5" width="3" height="3" fill="#000"/>
                  <rect x="48" y="5" width="3" height="3" fill="#000"/>
                  <rect x="56" y="5" width="3" height="3" fill="#000"/>
                  <rect x="40" y="65" width="3" height="3" fill="#000"/>
                  <rect x="48" y="68" width="3" height="3" fill="#000"/>
                  <rect x="65" y="40" width="3" height="3" fill="#000"/>
                  <rect x="68" y="48" width="3" height="3" fill="#000"/>
                  <rect x="65" y="56" width="3" height="3" fill="#000"/>
                </svg>
              </div>
            </div>

            <div className="bg-secondary/50 rounded-lg p-2 mb-4">
              <p className="text-[9px] text-muted-foreground text-center font-mono break-all leading-relaxed">{verifyUrl}</p>
            </div>

            <div className="space-y-2">
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 bg-accent text-white py-2 rounded-lg text-xs font-bold hover:bg-accent/90 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'کپی شد!' : 'کپی لینک'}
              </button>
              <button
                onClick={() => window.print()}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground py-2 rounded-lg text-xs font-medium hover:bg-secondary/80 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                چاپ QR
              </button>
            </div>

            <p className="text-[9px] text-muted-foreground text-center mt-3">
              شماره ثبت: {letter.registryNumber} · هش: {letter.qrHash?.slice(0, 12)}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
