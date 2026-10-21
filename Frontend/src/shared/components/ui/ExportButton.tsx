import { Download } from 'lucide-react';

interface ExportButtonProps {
  data: any[];
  filename: string;
  columns: { key: string; header: string }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const exportCSV = () => {
    const headers = columns.map(c => c.header).join(',');
    const rows = data.map(row => columns.map(c => {
      const val = (row as any)[c.key];
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
    }).join(','));
    const csv = '\uFEFF' + headers + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  return (
    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
      <Download className="w-3.5 h-3.5" />
      <span>خروجی Excel</span>
    </button>
  );
}
