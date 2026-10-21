import { X, ArrowRight } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface DetailPanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  width?: number;
  children: React.ReactNode;
}

export function DetailPanel({ open, onClose, title, subtitle, width = 400, children }: DetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 transition-opacity" onClick={onClose} />
      <div ref={panelRef} className="fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-card border-r border-border shadow-2xl transition-transform"
        style={{ width, transform: open ? 'translateX(0)' : `translateX(-${width}px)` }} dir="rtl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
              <ArrowRight className="w-4 h-4" />
            </button>
            <div>
              <h3 className="text-sm font-bold text-foreground">{title}</h3>
              {subtitle && <p className="text-[10px] text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </>
  );
}
