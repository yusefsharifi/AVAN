// src/modules/finance/components/AccountPicker.tsx
import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronLeft, Search } from 'lucide-react';
import { useFinanceStore } from '../store/useFinanceStore';
import type { Account } from '../types';
import { formatPersianNumber } from '../utils/persianUtils';

interface Props {
  value?: string;                    // selected accountId
  onSelect: (account: Account) => void;
  filterTypes?: string[];
  excludeIds?: string[];
  triggerClassName?: string;
}

const TYPE_LABELS: Record<string, string> = {
  asset: 'دارایی', liability: 'بدهی', equity: 'حقوق صاحبان سهام',
  revenue: 'درآمد', expense: 'هزینه',
};

export function AccountPicker({ value, onSelect, filterTypes, excludeIds, triggerClassName }: Props) {
  const accounts = useFinanceStore((s) => s.accounts);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const selected = accounts.find((a) => a.id === value);

  const visible = useMemo(() => {
    let list = accounts;
    if (filterTypes?.length) list = list.filter((a) => filterTypes.includes(a.type));
    if (excludeIds?.length) list = list.filter((a) => !excludeIds.includes(a.id));
    if (query.trim()) {
      const q = query.trim();
      list = list.filter((a) => a.code.includes(q) || a.name.includes(q));
    }
    return list;
  }, [accounts, filterTypes, excludeIds, query]);

  const roots = visible.filter((a) => !a.parentId || !visible.some((p) => p.id === a.parentId));
  const childrenOf = (id: string) => visible.filter((a) => a.parentId === id);

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const renderNode = (account: Account, depth: number) => {
    const kids = childrenOf(account.id);
    const isCollapsed = collapsed.has(account.id);
    return (
      <div key={account.id}>
        <div
          role="option"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { onSelect(account); setOpen(false); }
            if (e.key === 'ArrowRight' && kids.length) toggle(account.id);
          }}
          onClick={() => { onSelect(account); setOpen(false); }}
          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-amber-500/10 focus:bg-amber-500/20 focus:outline-none"
          style={{ paddingRight: `${depth * 20 + 8}px` }}
        >
          {kids.length > 0 ? (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); toggle(account.id); }}
              className="text-slate-400"
              aria-label="باز/بسته"
            >
              {isCollapsed ? <ChevronLeft size={14} /> : <ChevronDown size={14} />}
            </button>
          ) : (
            <span className="w-3.5" />
          )}
          <span className="font-mono text-xs text-amber-400">{formatPersianNumber(account.code)}</span>
          <span className="flex-1 text-sm text-slate-100">{account.name}</span>
          <span className="text-[10px] text-slate-500">{TYPE_LABELS[account.type] ?? account.type}</span>
        </div>
        {!isCollapsed && kids.map((k) => renderNode(k, depth + 1))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className={triggerClassName ?? 'w-full justify-start'}>
          {selected ? `${selected.code} — ${selected.name}` : 'انتخاب حساب'}
        </Button>
      </DialogTrigger>
      <DialogContent dir="rtl" className="max-h-[80vh] overflow-y-auto bg-slate-900">
        <DialogHeader>
          <DialogTitle>انتخاب حساب از سرفصل‌ها</DialogTitle>
        </DialogHeader>
        <div className="relative mb-2">
          <Search className="absolute right-2 top-2.5 text-slate-500" size={16} />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجو بر اساس کد یا نام حساب…"
            className="pr-8"
          />
        </div>
        <div role="listbox" className="space-y-0.5">
          {roots.length === 0 && <p className="py-6 text-center text-sm text-slate-500">حسابی یافت نشد</p>}
          {roots.map((r) => renderNode(r, 0))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
