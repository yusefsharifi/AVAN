import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Check } from 'lucide-react';

export interface Column<T> {
  key: string;
  header: string;
  headerFa?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  width?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  keyExtractor: (row: T) => string;
  loading?: boolean;
}

export function DataTable<T>({
  columns, data, pageSize = 10, selectable = false,
  selectedRows = [], onSelectionChange, onRowClick, emptyMessage = 'نتیجه‌ای یافت نشد',
  keyExtractor, loading = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [perPage, setPerPage] = useState(pageSize);

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal === bVal) return 0;
      return sortDir === 'asc' ? (aVal < bVal ? -1 : 1) : (aVal > bVal ? -1 : 1);
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / perPage);
  const paged = sorted.slice((page - 1) * perPage, page * perPage);
  const allSelected = paged.length > 0 && paged.every(r => selectedRows.includes(keyExtractor(r)));

  const toggleAll = () => {
    if (allSelected) onSelectionChange?.(selectedRows.filter(id => !paged.some(r => keyExtractor(r) === id)));
    else {
      const newIds = [...selectedRows];
      paged.forEach(r => { const id = keyExtractor(r); if (!newIds.includes(id)) newIds.push(id); });
      onSelectionChange?.(newIds);
    }
  };

  const toggleRow = (row: T) => {
    const id = keyExtractor(row);
    onSelectionChange?.(selectedRows.includes(id) ? selectedRows.filter(i => i !== id) : [...selectedRows, id]);
  };

  if (loading) return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-secondary/50 rounded-lg animate-pulse" />
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {selectable && (
                <th className="py-3 px-3 w-10">
                  <button onClick={toggleAll} className="p-1 rounded hover:bg-secondary">
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${allSelected ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>
                      {allSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className="text-right py-3 px-3 text-xs font-semibold text-foreground" style={{ width: col.width }}>
                  {col.sortable ? (
                    <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-accent transition-colors">
                      <span>{col.headerFa || col.header}</span>
                      {sortKey === col.key ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />) : <ChevronsUpDown className="w-3 h-3 opacity-40" />}
                    </button>
                  ) : (col.headerFa || col.header)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <tr><td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-sm text-muted-foreground"><p>{emptyMessage}</p></td></tr>
            ) : paged.map(row => {
              const id = keyExtractor(row);
              const isSelected = selectedRows.includes(id);
              return (
                <tr key={id} onClick={() => onRowClick?.(row)} className={`border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors ${onRowClick ? 'cursor-pointer' : ''} ${isSelected ? 'bg-accent/5' : ''}`}>
                  {selectable && (
                    <td className="py-3 px-3 w-10"><button onClick={(e) => { e.stopPropagation(); toggleRow(row); }} className="p-1 rounded hover:bg-secondary"><div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${isSelected ? 'bg-accent border-accent' : 'border-muted-foreground'}`}>{isSelected && <Check className="w-3 h-3 text-white" />}</div></button></td>
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
      {sorted.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-2">
            <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }} className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground">
              {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-xs text-muted-foreground">از {sorted.length.toLocaleString('fa-IR')} رکورد</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40 hover:bg-secondary">قبلی</button>
            <span className="px-2 text-xs text-foreground" dir="ltr">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-2 py-1 rounded text-xs border border-border disabled:opacity-40 hover:bg-secondary">بعدی</button>
          </div>
        </div>
      )}
    </div>
  );
}
