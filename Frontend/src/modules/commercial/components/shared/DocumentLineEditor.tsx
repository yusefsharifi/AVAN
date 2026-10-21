import { useState } from 'react';
import type { DocumentLine } from '@/modules/finance/types/purchaseSales.types';
import { formatCurrency } from '@/modules/finance/utils/persianUtils';

export interface DocumentLineEditorProps {
  initialLines: DocumentLine[];
  onLineChange: (lines: DocumentLine[]) => void;
  onAddLine: () => void;
  onRemoveLine: (lineId: string) => void;
  disabled?: boolean;
}

export function DocumentLineEditor({ initialLines, onLineChange, onAddLine, onRemoveLine, disabled = false }: DocumentLineEditorProps) {
  const [lines, setLines] = useState<DocumentLine[]>(initialLines);

  const handleSave = () => {
    onLineChange(lines);
  };

  const handleAdd = () => {
    onAddLine();
  };

  const handleRemove = (lineId: string) => {
    onRemoveLine(lineId);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <button
          onClick={handleAdd}
          disabled={disabled}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-card transition-colors"
        >
          + خط جدید
        </button>
        <button
          onClick={handleSave}
          disabled={disabled}
          className="ml-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground bg-accent text-card transition-colors"
        >
          ذخیره
        </button>
      </div>

      {lines.map((line) => (
        <div
          key={line.id}
          className="grid grid-cols-6 gap-3 px-3 py-2 border-b last:border-0"
        >
          <div className="col-span-1">
            <input
              type="text"
              value={line.itemCode || ''}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, itemCode: e.target.value } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="col-span-1">
            <input
              type="text"
              value={line.itemName || ''}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, itemName: e.target.value } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="col-span-1">
            <input
              type="number"
              value={line.quantity || 0}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, quantity: parseFloat(e.target.value) || 0 } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="col-span-1">
            <input
              type="number"
              value={line.unitPrice || 0}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, unitPrice: parseFloat(e.target.value) || 0 } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="col-span-1">
            <input
              type="number"
              value={line.discount || 0}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, discount: parseFloat(e.target.value) || 0 } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            />
          </div>
          <div className="col-span-1">
            <select
              value={line.taxRate || 9}
              onChange={(e) => {
                const newLines = lines.map((l) =>
                  l.id === line.id ? { ...l, taxRate: parseInt(e.target.value) } : l
                );
                setLines(newLines);
              }}
              className="w-full rounded border border-border px-2 py-1 text-sm"
              disabled={disabled}
            >
              <option value="3">3%</option>
              <option value="6">6%</option>
              <option value="9">9%</option>
              <option value="12">12%</option>
              <option value="15">15%</option>
            </select>
          </div>
          <div className="col-span-1">
            <span className="text-sm font-medium">
              {formatCurrency(line.lineTotal || 0)}
            </span>
          </div>
          <div className="col-span-1">
            <button
              onClick={() => handleRemove(line.id)}
              className="text-red-600 text-xs hover:underline"
              disabled={disabled}
            >
              حذف
            </button>
          </div>
        </div>
      ))}

      <div
        className="grid grid-cols-6 gap-3 px-3 py-2 border-t pt-3 mt-3"
        style={{ borderColor: 'var(--border-border)' }}
      >
        <div className="col-span-5">
          <span className="text-xs text-muted-foreground">مجموع:</span>
        </div>
        <div className="col-span-1 text-right">
          <span className="text-lg font-bold">
            {formatCurrency(
              lines.reduce((sum, l) => sum + (l.lineTotal || 0), 0)
            )}
          </span>
        </div>
      </div>
    </div>
  );
}