import { useState } from 'react';
import { useCorrespondenceStore } from '../store';
import { AttachmentUploader } from './AttachmentUploader';
import { LETTER_TYPE_CONFIG, DIRECTION_CONFIG, CLASSIFICATION_CONFIG, PRIORITY_CONFIG, CLOSING_OPTIONS } from '../constants';
import { ArrowRight, ArrowLeft, Send } from 'lucide-react';
import type { LetterType, LetterDirection, LetterClassification, LetterPriority, LetterRecipient, LetterAttachment } from '../types';

interface ComposeWizardProps {
  onBack: () => void;
  onSubmit: () => void;
}

export function ComposeWizard({ onBack, onSubmit }: ComposeWizardProps) {
  const { createLetter } = useCorrespondenceStore();
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<LetterDirection>('outgoing');
  const [type, setType] = useState<LetterType>('official');
  const [classification, setClassification] = useState<LetterClassification>('unclassified');
  const [priority, setPriority] = useState<LetterPriority>('normal');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [closing, setClosing] = useState('با احترام');
  const [recipients, setRecipients] = useState<LetterRecipient[]>([]);
  const [attachments, setAttachments] = useState<LetterAttachment[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [recipientOrg, setRecipientOrg] = useState('');

  const handleAddRecipient = () => {
    if (recipientName.trim()) {
      setRecipients([...recipients, { name: recipientName, org: recipientOrg, action: 'action' }]);
      setRecipientName('');
      setRecipientOrg('');
    }
  };

  const handleSubmit = async () => {
    await createLetter({
      direction, type, classification, priority,
      subject, body, closing, recipients, cc: [], attachments,
      enclosuresCount: attachments.length,
    });
    onSubmit();
  };

  const inputCls = 'w-full bg-secondary border border-border rounded-lg py-2.5 px-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:border-accent';
  const labelCls = 'text-xs font-medium text-muted-foreground mb-1.5 block text-right';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-secondary"><ArrowRight className="w-4 h-4 text-muted-foreground" /></button>
          <h2 className="text-sm font-bold text-foreground">نامه جدید</h2>
        </div>
        <span className="text-xs text-muted-foreground">مرحله {step} از ۴</span>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 py-3 border-b border-border">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${s <= step ? 'bg-accent border-accent text-white' : 'border-border text-muted-foreground'}`}>{s}</div>
            {s < 4 && <div className={`h-0.5 w-8 ${s < step ? 'bg-accent' : 'bg-border'}`} />}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {step === 1 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-foreground text-right">طبقه‌بندی</h3>
            <div><label className={labelCls}>جهت نامه</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(DIRECTION_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setDirection(key as LetterDirection)}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors ${direction === key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{cfg.fa}</button>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>نوع نامه</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(LETTER_TYPE_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setType(key as LetterType)}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors ${type === key ? 'border-accent bg-accent/10 text-accent' : 'border-border text-muted-foreground hover:bg-secondary'}`}>{cfg.fa}</button>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>سطح طبقه‌بندی</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(CLASSIFICATION_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setClassification(key as LetterClassification)}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors ${classification === key ? `border-current ${cfg.color} ${cfg.bg}` : 'border-border text-muted-foreground hover:bg-secondary'}`}>{cfg.fa}</button>
                ))}
              </div>
            </div>
            <div><label className={labelCls}>اولویت</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                  <button key={key} onClick={() => setPriority(key as LetterPriority)}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors flex items-center gap-2 ${priority === key ? `border-current ${cfg.color} ${cfg.bg}` : 'border-border text-muted-foreground hover:bg-secondary'}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />{cfg.fa}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-foreground text-right">گیرندگان</h3>
            <div><label className={labelCls}>نام گیرنده</label>
              <input dir="rtl" value={recipientName} onChange={e => setRecipientName(e.target.value)} className={inputCls} placeholder="نام شخص یا واحد" /></div>
            <div><label className={labelCls}>سازمان</label>
              <input dir="rtl" value={recipientOrg} onChange={e => setRecipientOrg(e.target.value)} className={inputCls} placeholder="نام سازمان" /></div>
            <button onClick={handleAddRecipient} className="w-full py-2 rounded-lg border border-dashed border-accent text-accent text-xs font-medium hover:bg-accent/5">+ افزودن گیرنده</button>
            {recipients.length > 0 && (
              <div className="space-y-1.5">
                {recipients.map((r, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                    <span className="text-xs text-foreground">{r.name} {r.org && <span className="text-muted-foreground">({r.org})</span>}</span>
                    <button onClick={() => setRecipients(recipients.filter((_, j) => j !== i))} className="text-xs text-red-500 hover:underline">حذف</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-foreground text-right">متن و پیوست‌ها</h3>
            <div><label className={labelCls}>موضوع</label>
              <input dir="rtl" value={subject} onChange={e => setSubject(e.target.value)} className={inputCls} placeholder="موضوع نامه" /></div>
            <div><label className={labelCls}>متن نامه</label>
              <textarea dir="rtl" value={body} onChange={e => setBody(e.target.value)} rows={8} className={inputCls} placeholder="متن نامه را بنویسید..." /></div>
            <div><label className={labelCls}>خاتمه</label>
              <select value={closing} onChange={e => setClosing(e.target.value)} className={inputCls}>
                {CLOSING_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>پیوست‌ها</label>
              <AttachmentUploader attachments={attachments} onChange={setAttachments} /></div>
          </div>
        )}
        {step === 4 && (
          <div className="space-y-4 max-w-lg mx-auto">
            <h3 className="text-sm font-bold text-foreground text-right">بازبینی و ارسال</h3>
            <div className="bg-card rounded-xl border border-border p-4 space-y-2">
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">جهت</span><span className="text-xs text-foreground">{DIRECTION_CONFIG[direction].fa}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">نوع</span><span className="text-xs text-foreground">{LETTER_TYPE_CONFIG[type].fa}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">طبقه‌بندی</span><span className="text-xs text-foreground">{CLASSIFICATION_CONFIG[classification].fa}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">اولویت</span><span className="text-xs text-foreground">{PRIORITY_CONFIG[priority].fa}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">موضوع</span><span className="text-xs text-foreground truncate max-w-[200px]">{subject || '—'}</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">گیرندگان</span><span className="text-xs text-foreground">{recipients.length} نفر</span></div>
              <div className="flex justify-between"><span className="text-xs text-muted-foreground">پیوست‌ها</span><span className="text-xs text-foreground">{attachments.length} فقره</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-4 py-3 flex items-center justify-between">
        <button onClick={() => setStep(s => Math.max(1, s - 1))} disabled={step === 1}
          className="px-4 py-2 rounded-lg border border-border text-sm font-medium disabled:opacity-40 flex items-center gap-1.5"><ArrowRight className="w-4 h-4" /><span>قبلی</span></button>
        {step < 4 ? (
          <button onClick={() => setStep(s => s + 1)}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold flex items-center gap-1.5"><ArrowLeft className="w-4 h-4" /><span>بعدی</span></button>
        ) : (
          <button onClick={handleSubmit} disabled={!subject.trim()}
            className="px-5 py-2 rounded-lg bg-accent text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"><Send className="w-4 h-4" /><span>ارسال</span></button>
        )}
      </div>
    </div>
  );
}
