import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, FileText } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
  hideOnMobile?: boolean;
}

interface PersianTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  selectable?: boolean;
  selectedRows?: T[];
  onSelectionChange?: (rows: T[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
}

export function PersianTable<T>({
  columns, data, pageSize = 10, selectable = false,
  selectedRows = [], onSelectionChange, onRowClick, emptyMessage = 'نتیجه‌ای یافت نشد', keyExtractor,
}: PersianTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [perPage, setPerPage] = useState(pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal === bVal) return 0;
      const cmp = aVal < bVal ? -1 : 1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((page - 1) * perPage, page * perPage);

  const allSelected = paged.length > 0 && paged.every(r => selectedRows.some(sr => keyExtractor(sr) === keyExtractor(r)));

  const toggleSelectAll = () => {
    if (allSelected) {
      onSelectionChange?.(selectedRows.filter(sr => !paged.some(r => keyExtractor(r) === keyExtractor(sr))));
    } else {
      const newSelected = [...selectedRows];
      paged.forEach(r => {
        if (!newSelected.some(sr => keyExtractor(sr) === keyExtractor(r))) {
          newSelected.push(r);
        }
      });
      onSelectionChange?.(newSelected);
    }
  };

  const toggleRow = (row: T) => {
    const id = keyExtractor(row);
    if (selectedRows.some(r => keyExtractor(r) === id)) {
      onSelectionChange?.(selectedRows.filter(r => keyExtractor(r) !== id));
    } else {
      onSelectionChange?.([...selectedRows, row]);
    }
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {selectable && (
                <th className="py-3 px-3 w-10">
                  <button onClick={toggleSelectAll} className="p-1 rounded hover:bg-secondary">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className="text-right py-3 px-3 text-xs font-semibold text-foreground">
                  {col.sortable ? (
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-accent transition-colors">
                      <span>{col.header}</span>
                      {sortKey === col.key ? (
                        sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronsUpDown className="w-3 h-3 opacity-40" />
                      )}
                    </button>
                  ) : col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-sm text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center">
                      <FileText className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : paged.map((row) => {
              const id = keyExtractor(row);
              const isSelected = selectedRows.some(r => keyExtractor(r) === id);
              return (
                <tr key={id} onClick={() => onRowClick?.(row)} className={`border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-accent/5' : ''}`}>
                  {selectable && (
                    <td className="py-3 px-3 w-10">
                      <button onClick={(e) => { e.stopPropagation(); toggleRow(row); }} className="p-1 rounded hover:bg-secondary">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="py-3 px-3 text-sm text-foreground">
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">نمایش</span>
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">از {sorted.length.toLocaleString('fa-IR')} رکورد</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40 hover:bg-secondary">قبلی</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4));
              const p = start + i;
              if (p > totalPages) return null;
              return (
                <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-xs ${p === page ? 'bg-accent text-white' : 'border border-border text-foreground hover:bg-secondary'}`}>{p.toLocaleString('fa-IR')}</button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40 hover:bg-secondary">بعدی</button>
          </div>
        </div>
      )}
    </div>
  );
}
