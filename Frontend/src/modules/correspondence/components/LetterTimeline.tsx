import { CheckCircle, XCircle, RotateCcw, MessageSquare, PenLine, FileText, Send, Archive, Clock } from 'lucide-react';
import type { WorkflowAction } from '../types';

interface LetterTimelineProps {
  actions: WorkflowAction[];
  annotations: { id: string; author: string; date: string; text: string; color: string; isParaph: boolean }[];
}

export function LetterTimeline({ actions, annotations }: LetterTimelineProps) {
  const allEvents = [
    ...actions.map(a => ({ ...a, eventType: 'action' as const })),
    ...annotations.map(a => ({ ...a, eventType: 'annotation' as const, action: a.isParaph ? 'paraph' : 'annotate' as any }))
  ].sort((a, b) => new Date(a.performedAt || a.date).getTime() - new Date(b.performedAt || b.date).getTime());

  const getIcon = (action: string) => {
    switch (action) {
      case 'approve': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'reject': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'return': return <RotateCcw className="w-4 h-4 text-amber-500" />;
      case 'annotate': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'paraph': return <PenLine className="w-4 h-4 text-purple-500" />;
      case 'refer': return <Send className="w-4 h-4 text-indigo-500" />;
      case 'sign': return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'archive': return <Archive className="w-4 h-4 text-slate-500" />;
      default: return <Clock className="w-4 h-4 text-slate-400" />;
    }
  };

  if (allEvents.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        <Clock className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p>رویدادی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="absolute right-4 top-0 bottom-0 w-px bg-border" />
      <div className="space-y-4">
        {allEvents.map((event) => (
          <div key={event.id || event.action} className="flex gap-3 relative">
            <div className="w-8 h-8 rounded-full bg-background border-2 border-border flex items-center justify-center flex-shrink-0 z-10">
              {getIcon(event.action || 'annotate')}
            </div>
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground">{event.performedBy || event.author}</span>
                <span className="text-[10px] text-muted-foreground" dir="ltr">{event.performedAt || event.date}</span>
              </div>
              {event.comment || event.text ? (
                <div className="text-sm text-foreground/80 rounded-lg p-2 mt-1" style={{ background: event.color || '#f8fafc' }}>
                  {event.comment || event.text}
                </div>
              ) : null}
              {event.eventType === 'annotation' && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground mt-1">یادداشت</span>
              )}
              {event.eventType === 'action' && event.isParaph && (
                <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 mt-1">پاراف</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
