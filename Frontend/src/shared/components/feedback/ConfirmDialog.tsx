import { AlertTriangle } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning';
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmText = 'تأیید', cancelText = 'انصراف', variant = 'danger',
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open && dialogRef.current) dialogRef.current.focus();
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div ref={dialogRef} tabIndex={-1} className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-6 w-96 z-50 outline-none" dir="rtl">
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-50' : 'bg-amber-50'}`}>
            <AlertTriangle className={`w-7 h-7 ${variant === 'danger' ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex items-center gap-3 w-full">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary transition-colors">{cancelText}</button>
            <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold text-white transition-colors ${variant === 'danger' ? 'bg-red-600 hover:bg-red-500' : 'bg-amber-600 hover:bg-amber-500'}`}>{confirmText}</button>
          </div>
        </div>
      </div>
    </>
  );
}
