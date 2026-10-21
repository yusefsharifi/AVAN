import { useState } from 'react';
import { Upload, X, FileText } from 'lucide-react';
import type { LetterAttachment } from '../types';

const genId = () => `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

interface AttachmentUploaderProps {
  attachments: LetterAttachment[];
  onChange: (attachments: LetterAttachment[]) => void;
  maxFiles?: number;
}

export function AttachmentUploader({ attachments, onChange, maxFiles = 10 }: AttachmentUploaderProps) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const newAttachments: LetterAttachment[] = Array.from(files).slice(0, maxFiles - attachments.length).map(file => ({
      id: genId(),
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      description: '',
      uploadedBy: 'کاربر جاری',
      uploadedAt: new Date().toISOString(),
      mimeType: file.type,
      version: 1,
      checksum: '',
    }));
    onChange([...attachments, ...newAttachments]);
  };

  const remove = (id: string) => {
    onChange(attachments.filter(a => a.id !== id));
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${dragOver ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">فایل را بکشید و رها کنید یا کلیک کنید</p>
        <p className="text-[10px] text-muted-foreground/60 mt-1">حداکثر {maxFiles} فایل</p>
        <input id="file-upload" type="file" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
      </div>

      {attachments.length > 0 && (
        <div className="space-y-2">
          {attachments.map(att => (
            <div key={att.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-secondary/30">
              <FileText className="w-4 h-4 text-accent flex-shrink-0" />
              <span className="text-xs text-foreground truncate flex-1" dir="ltr">{att.name}</span>
              <span className="text-[10px] text-muted-foreground">{att.size}</span>
              <button onClick={() => remove(att.id)} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
