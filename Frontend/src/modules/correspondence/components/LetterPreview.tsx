import type { Letter } from '../types';

interface LetterPreviewProps {
  letter: Letter;
}

export function LetterPreview({ letter }: LetterPreviewProps) {
  const classificationWatermark = letter.classification !== 'unclassified'
    ? letter.classification === 'confidential' ? 'محرمانه' : 'سری'
    : '';

  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-8 max-w-[600px] mx-auto" dir="rtl">
      {classificationWatermark && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-red-200/30 text-4xl font-bold rotate-[-15deg] select-none pointer-events-none">
          {classificationWatermark}
        </div>
      )}

      {/* Header */}
      <div className="text-center border-b-2 border-primary pb-4 mb-6">
        <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-2xl font-bold text-primary">آوان</span>
        </div>
        <h2 className="text-base font-bold text-foreground">شهرک صنعتی کاوه</h2>
        <p className="text-xs text-muted-foreground">سامانه مدیریت مکاتبات اداری</p>
      </div>

      {/* Registry Number & Date */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs text-muted-foreground">شماره ثبت: <span className="font-mono text-foreground" dir="ltr">{letter.registryNumber}</span></p>
          <p className="text-xs text-muted-foreground">تاریخ: {letter.createdAt}</p>
        </div>
        <div className="text-left">
          <p className="text-xs text-muted-foreground">اولویت: <span className="font-semibold text-foreground">{letter.priority === 'urgent' ? 'فوری' : letter.priority === 'instant' ? 'خیلی فوری' : 'عادی'}</span></p>
        </div>
      </div>

      {/* Subject */}
      <h3 className="text-sm font-bold text-foreground mb-4">موضوع: {letter.subject}</h3>

      {/* Recipients */}
      <div className="text-sm text-foreground mb-4">
        <p className="font-semibold mb-1">محترمین:</p>
        {letter.recipients.map((r, i) => (
          <p key={i} className="text-sm mr-4">{r.name} {r.org && <span className="text-muted-foreground text-xs">({r.org})</span>}</p>
        ))}
        {letter.cc.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">رونوشت: {letter.cc.join('، ')}</p>
        )}
      </div>

      {/* Body */}
      <div className="text-sm text-foreground leading-relaxed mb-6 whitespace-pre-wrap">
        {letter.body}
      </div>

      {/* Closing */}
      <p className="text-sm text-foreground mb-8">{letter.closing}</p>

      {/* Signature */}
      <div className="text-left">
        <p className="text-sm font-semibold text-foreground">{letter.signatory}</p>
        <p className="text-xs text-muted-foreground">{letter.signatoryRole}</p>
      </div>

      {/* Enclosures */}
      {letter.enclosuresCount > 0 && (
        <div className="mt-6 pt-4 border-t border-border">
          <p className="text-xs text-muted-foreground">پیوست‌ها: {letter.enclosuresCount} فقره</p>
        </div>
      )}
    </div>
  );
}
