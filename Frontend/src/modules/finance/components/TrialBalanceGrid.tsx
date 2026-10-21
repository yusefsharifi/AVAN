import { useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import type { TrialBalanceRow } from '../utils/reportCalculators';

const fa = (n:number) => Math.round(n || 0).toLocaleString('fa-IR');
type Props = { rows: TrialBalanceRow[]; onAccount?: (id:string)=>void; maxLevel?: number };
const numeric = ['openingDebit','openingCredit','periodDebit','periodCredit','closingDebit','closingCredit'] as const;

/** RTL, hierarchical trial balance. The calculator remains pure; this component only derives display rollups. */
export function TrialBalanceGrid({ rows, onAccount, maxLevel=4 }: Props) {
  const [hideZero, setHideZero] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(()=>new Set(rows.map(r=>r.accountId)));
  const children = useMemo(() => {
    const result = new Map<string, TrialBalanceRow[]>();
    rows.forEach(r => { if (r.parentId) result.set(r.parentId, [...(result.get(r.parentId) || []), r]); });
    return result;
  }, [rows]);
  const rolled = useMemo(() => rows.map(row => {
    const descendants = (id:string):TrialBalanceRow[] => (children.get(id)||[]).flatMap(c=>[c,...descendants(c.accountId)]);
    const hiddenChildren = descendants(row.accountId).filter(c=>c.level>maxLevel);
    if (!hiddenChildren.length) return row;
    const next = {...row}; numeric.forEach(k => (next[k] = row[k] + hiddenChildren.reduce((s,c)=>s+c[k],0))); return next;
  }).filter(r=>r.level<=maxLevel), [rows, children, maxLevel]);
  const visible = useMemo(() => rolled.filter(row => {
    let parent=row.parentId; while(parent) { if (!expanded.has(parent)) return false; parent=rows.find(x=>x.accountId===parent)?.parentId||null; }
    return !hideZero || numeric.some(k=>row[k] !== 0);
  }), [rolled, expanded, rows, hideZero]);
  const totals = useMemo(() => Object.fromEntries(numeric.map(k=>[k, visible.reduce((s,r)=>s+r[k],0)])) as Record<typeof numeric[number],number>,[visible]);
  const difference=Math.abs(totals.closingDebit-totals.closingCredit);
  const toggle=(id:string)=>setExpanded(old=>{const n=new Set(old);n.has(id)?n.delete(id):n.add(id);return n;});
  return <div className="space-y-3" dir="rtl">
    {difference>0 && <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700">تراز آزمایشی تراز نیست — اختلاف: {fa(difference)}</div>}
    <div className="flex justify-between items-center text-xs"><label className="flex gap-2 items-center"><input type="checkbox" checked={hideZero} onChange={e=>setHideZero(e.target.checked)}/>مخفی کردن مانده صفر</label><span className="text-muted-foreground">نمایش {fa(visible.length)} از {fa(rolled.length)} حساب</span></div>
    <div className="max-h-[560px] overflow-auto rounded-xl border border-border"><table className="w-full whitespace-nowrap text-xs"><thead className="sticky top-0 z-10 bg-secondary"><tr>{['کد','نام گروه حساب','سطح','بدهکار افتتاحیه','بستانکار افتتاحیه','گردش بدهکار','گردش بستانکار','بدهکار اختتامیه','بستانکار اختتامیه','ملاحظات'].map(x=><th className="border-b p-3 text-right" key={x}>{x}</th>)}</tr></thead><tbody>{visible.map(row=>{const hasChildren=children.has(row.accountId);const isOpen=expanded.has(row.accountId);return <tr key={row.accountId} onDoubleClick={()=>onAccount?.(row.accountId)} className="cursor-pointer border-b hover:bg-secondary/50"><td className="p-3 text-left font-mono" dir="ltr">{row.accountCode}</td><td className="p-3" style={{paddingRight:`${12+(row.level-1)*20}px`}}>{hasChildren?<button onClick={e=>{e.stopPropagation();toggle(row.accountId)}} className="ml-1 align-middle">{isOpen?<ChevronDown size={15}/>:<ChevronLeft size={15}/>}</button>:<span className="inline-block w-5"/>}{row.accountName}</td><td className="p-3">{fa(row.level)}</td>{numeric.map(k=><td className="p-3" key={k}>{fa(row[k])}</td>)}<td className="p-3">—</td></tr>})}</tbody><tfoot className="sticky bottom-0 bg-secondary font-bold"><tr><td className="p-3" colSpan={3}>جمع</td>{numeric.map(k=><td className="p-3" key={k}>{fa(totals[k])}</td>)}<td/></tr></tfoot></table></div>
  </div>;
}
export default TrialBalanceGrid;
