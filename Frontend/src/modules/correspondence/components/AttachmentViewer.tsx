import { FileText, Download, Trash2, Eye } from 'lucide-react';
import type { LetterAttachment } from '../types';

interface AttachmentViewerProps {
  attachments: LetterAttachment[];
  onDelete?: (id: string) => void;
  readonly?: boolean;
}

export function AttachmentViewer({ attachments, onDelete, readonly = false }: AttachmentViewerProps) {
  const getFileIcon = (name: string) => {
    if (name.endsWith('.pdf')) return '📄';
    if (name.endsWith('.docx') || name.endsWith('.doc')) return '📝';
    if (name.endsWith('.xlsx') || name.endsWith('.xls')) return '📊';
    if (name.endsWith('.jpg') || name.endsWith('.png')) return '🖼️';
    return '📎';
  };

  if (attachments.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-muted-foreground">
        <FileText className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p>فایل پیوستی وجود ندارد</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {attachments.map(att => (
        <div key={att.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
          <span className="text-xl">{getFileIcon(att.name)}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{att.name}</p>
            <p className="text-[10px] text-muted-foreground">{att.size} · {att.description}</p>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="مشاهده"><Eye className="w-4 h-4" /></button>
            <button className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="دانلود"><Download className="w-4 h-4" /></button>
            {!readonly && onDelete && (
              <button onClick={() => onDelete(att.id)} className="p-1.5 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors" title="حذف"><Trash2 className="w-4 h-4" /></button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
