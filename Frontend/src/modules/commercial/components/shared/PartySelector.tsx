import { useState } from 'react';
import type { BuyerSeller } from '@/modules/finance/types/purchaseSales.types';

export interface PartySelectorProps {
  initialValue?: string;
  onSelect: (party: BuyerSeller) => void;
  onSearch: (query: string) => BuyerSeller[];
  disabled?: boolean;
}

export function PartySelector({ initialValue, onSelect, onSearch, disabled = false }: PartySelectorProps) {
  const [query, setQuery] = useState('');
  const [selectedCode, setSelectedCode] = useState(initialValue || '');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const filtered = onSearch(query);

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm" dir="rtl">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="جستجو برای طرف مقابل..."
            value={query}
            onChange={handleSearch}
            className="w-full rounded border border-border px-3 py-2 text-sm"
            disabled={disabled}
          />
          {filtered.length > 0 && (
            <div
              className="absolute top-full z-10 max-h-60 overflow-y-auto rounded border border-border bg-card max-w-full shadow-sm"
              style={{ marginTop: 4 }}
            >
              {filtered.map((party) => (
                <div
                  key={party.id}
                  className="px-3 py-2 cursor-pointer hover:bg-accent/20 transition-colors"
                  onClick={() => onSelect(party)}
                >
                  <span className="font-medium">{party.name || party.title || '—'}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{party.code || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex items-center flex-shrink-0">
          <span
            className="px-3 py-2 rounded border border-border text-sm"
            title={selectedCode || ''}
          >
            {selectedCode || 'انتخاب نشده'}
          </span>
        </div>
      </div>
    </div>
  );
}