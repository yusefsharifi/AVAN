import { useState } from 'react';
import { ChevronRight, ChevronDown, FolderOpen, FileText } from 'lucide-react';
import type { Account } from '../types';
import { ACCOUNT_CATEGORY_CONFIG } from '../constants';

interface AccountTreeProps {
  accounts: Account[];
  onSelect?: (account: Account) => void;
  selectedId?: string;
}

function AccountNode({ account, depth = 0, onSelect, selectedId }: { account: Account; depth?: number; onSelect?: (a: Account) => void; selectedId?: string }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = account.children && account.children.length > 0;
  const catCfg = ACCOUNT_CATEGORY_CONFIG[account.category];
  return (
    <div>
      <div className={`flex items-center gap-1 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors ${selectedId === account.id ? 'bg-accent/10 border border-accent/30' : ''}`} style={{ paddingLeft: depth * 16 }}
        onClick={() => { if (hasChildren) setExpanded(!expanded); onSelect?.(account); }}>
        {hasChildren ? (expanded ? <ChevronDown className="w-3 h-3 text-muted-foreground" /> : <ChevronRight className="w-3 h-3 text-muted-foreground" />) : <div className="w-3" />}
        {hasChildren ? <FolderOpen className="w-3.5 h-3.5 text-amber-500" /> : <FileText className="w-3.5 h-3.5 text-muted-foreground" />}
        <span className="text-[10px] font-mono text-muted-foreground w-16" dir="ltr">{account.code}</span>
        <span className="text-xs text-foreground flex-1">{account.nameFa}</span>
        <span className="text-[10px] font-mono text-muted-foreground" dir="ltr">{account.currentBalance.toLocaleString('fa-IR')}</span>
      </div>
      {expanded && hasChildren && account.children!.map(child => (
        <AccountNode key={child.id} account={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
      ))}
    </div>
  );
}

export function AccountTree({ accounts, onSelect, selectedId }: AccountTreeProps) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-auto" style={{ maxHeight: 500 }}>
      <div className="p-2">
        {accounts.map(account => (
          <AccountNode key={account.id} account={account} onSelect={onSelect} selectedId={selectedId} />
        ))}
      </div>
    </div>
  );
}
