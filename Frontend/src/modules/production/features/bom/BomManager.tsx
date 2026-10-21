import { useState, Fragment } from 'react';
import { toast } from 'sonner';
import { useProductionStore } from '../../store/useProductionStore';
import { useInventoryStore } from '@/modules/inventory';
import { calculateProductionCost } from '../../utils';
import { Plus, Search, ChevronLeft, X, Check } from 'lucide-react';

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const BOM_STATUS_LABELS: Record<string, { fa: string; color: string; bg: string }> = {
  draft: { fa: 'پیش‌نویس', color: 'text-slate-600', bg: 'bg-slate-100' },
  active: { fa: 'فعال', color: 'text-emerald-700', bg: 'bg-emerald-50' },
  obsolete: { fa: 'منسوخ', color: 'text-red-700', bg: 'bg-red-50' },
};

export default function BomManager() {
  const { boms, createBOM, approveBOM } = useProductionStore();
  const { items } = useInventoryStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [step, setStep] = useState(1);

  const [finishedItemName, setFinishedItemName] = useState('');
  const [finishedItemSku, setFinishedItemSku] = useState('');
  const [outputQuantity, setOutputQuantity] = useState('1');
  const [processingCost, setProcessingCost] = useState('');
  const [version, setVersion] = useState('v1.0');
  const [lines, setLines] = useState([{ itemId: items[0]?.id ?? '', quantity: '', scrapFactor: '0.02' }]);

  const filtered = boms.filter((b) => (!statusFilter || b.status === statusFilter) && (!search || b.finishedItemNameFa.includes(search) || b.bomNumber.includes(search)));

  const itemPrices = Object.fromEntries(items.map((i) => [i.id, i.movingAverageCost]));
  const wizardMaterialCost = calculateProductionCost(
    lines.map((l) => ({ id: '', itemId: l.itemId, itemNameFa: '', itemSku: '', quantity: Number(l.quantity || 0), uom: '', scrapFactor: Number(l.scrapFactor || 0), effectiveQuantity: Number(l.quantity || 0) * (1 + Number(l.scrapFactor || 0)), isOptional: false, notes: '' })),
    1, itemPrices
  );

  const submitBOM = () => {
    const bomLines = lines.filter((l) => l.itemId && l.quantity).map((l) => {
      const item = items.find((i) => i.id === l.itemId);
      return { id: `boml-${Date.now()}-${Math.random()}`, itemId: l.itemId, itemNameFa: item?.nameFa ?? '—', itemSku: item?.sku ?? '', quantity: Number(l.quantity), uom: item?.uom ?? 'kg', scrapFactor: Number(l.scrapFactor || 0), effectiveQuantity: 0, isOptional: false, notes: '' };
    });
    if (!finishedItemName.trim() || bomLines.length === 0) { toast.error('نام محصول نهایی و حداقل یک ماده اولیه الزامی است'); return; }
    createBOM({
      finishedItemId: `fg-${Date.now()}`, finishedItemNameFa: finishedItemName, finishedItemSku: finishedItemSku || `FG-${Date.now().toString().slice(-4)}`,
      version, outputQuantity: Number(outputQuantity || 1), outputUom: 'piece', lines: bomLines, processingCost: Number(processingCost || 0),
    });
    toast.success('BOM جدید ایجاد شد');
    setWizardOpen(false);
    setStep(1);
    setFinishedItemName(''); setFinishedItemSku(''); setLines([{ itemId: items[0]?.id ?? '', quantity: '', scrapFactor: '0.02' }]);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setWizardOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" />BOM جدید</button>
        <h1 className="text-lg font-bold text-foreground">مدیریت BOM</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجوی محصول نهایی، شماره BOM..." className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs" dir="rtl" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-lg border border-border bg-background text-xs">
            <option value="">همه وضعیت‌ها</option>
            <option value="draft">پیش‌نویس</option><option value="active">فعال</option><option value="obsolete">منسوخ</option>
          </select>
        </div>

        <table className="w-full">
          <thead><tr className="border-b border-border bg-secondary/30">{['عملیات', 'هزینه مواد', 'تعداد اقلام', 'وضعیت', 'نسخه', 'SKU', 'محصول نهایی', 'شماره BOM'].map((h) => <th key={h} className="text-right py-2.5 px-3 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
          <tbody>
            {filtered.map((b) => {
              const cfg = BOM_STATUS_LABELS[b.status];
              const isExp = expandedId === b.id;
              const materialCost = b.lines.reduce((sum, l) => sum + l.quantity * (1 + l.scrapFactor) * (itemPrices[l.itemId] ?? 0), 0);
              return (
                <Fragment key={b.id}>
                  <tr className="border-b border-border/50 last:border-0 hover:bg-secondary/20 cursor-pointer" onClick={() => setExpandedId(isExp ? null : b.id)}>
                    <td className="py-2.5 px-3">
                      {b.status === 'draft' && <button onClick={(e) => { e.stopPropagation(); approveBOM(b.id, 'مدیر تولید'); toast.success('BOM تأیید شد'); }} className="flex items-center gap-1 text-[10px] text-emerald-700 hover:underline"><Check className="w-3 h-3" />تأیید BOM</button>}
                    </td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{materialCost.toLocaleString('fa-IR')}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-foreground" dir="ltr">{b.lines.length}</td>
                    <td className="py-2.5 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span></td>
                    <td className="py-2.5 px-3 text-xs text-muted-foreground" dir="ltr">{b.version}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-muted-foreground" dir="ltr">{b.finishedItemSku}</td>
                    <td className="py-2.5 px-3 text-xs text-foreground">{b.finishedItemNameFa}</td>
                    <td className="py-2.5 px-3 text-xs font-mono text-primary flex items-center gap-1" dir="ltr"><ChevronLeft className={`w-3 h-3 transition-transform ${isExp ? '-rotate-90' : ''}`} />{b.bomNumber}</td>
                  </tr>
                  {isExp && (
                    <tr><td colSpan={8} className="bg-secondary/20 p-3">
                      <table className="w-full mb-2">
                        <thead><tr className="border-b border-border">{['موجود در انبار', 'بهای واحد', 'مقدار مؤثر', 'ضایعات', 'واحد', 'مقدار', 'ماده اولیه'].map((h) => <th key={h} className="text-right py-1.5 px-2 text-[10px] font-semibold text-foreground">{h}</th>)}</tr></thead>
                        <tbody>
                          {b.lines.map((l) => {
                            const item = items.find((i) => i.id === l.itemId);
                            return (
                              <tr key={l.id} className="border-b border-border/30 last:border-0">
                                <td className={`py-1.5 px-2 text-[10px] font-mono ${(item?.availableQuantity ?? 0) < l.quantity * 10 ? 'text-amber-600' : 'text-foreground'}`} dir="ltr">{item?.availableQuantity ?? '—'}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{(item?.movingAverageCost ?? 0).toLocaleString('fa-IR')}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{(l.quantity * (1 + l.scrapFactor)).toFixed(4)}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{(l.scrapFactor * 100).toFixed(0)}٪</td>
                                <td className="py-1.5 px-2 text-[10px] text-muted-foreground">{l.uom}</td>
                                <td className="py-1.5 px-2 text-[10px] font-mono" dir="ltr">{l.quantity}</td>
                                <td className="py-1.5 px-2 text-[10px] text-foreground">{l.itemNameFa}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div className="flex items-center gap-4 text-[11px] justify-end">
                        <span className="text-foreground font-semibold">جمع کل: <span dir="ltr">{(materialCost + b.processingCost).toLocaleString('fa-IR')}</span></span>
                        <span className="text-muted-foreground">هزینه فرآوری: <span dir="ltr">{b.processingCost.toLocaleString('fa-IR')}</span></span>
                        <span className="text-muted-foreground">هزینه مواد: <span dir="ltr">{materialCost.toLocaleString('fa-IR')}</span></span>
                      </div>
                    </td></tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && <div className="text-center py-10 text-sm text-muted-foreground">BOM یافت نشد</div>}
      </div>

      {/* Wizard */}
      {wizardOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setWizardOpen(false)}>
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] max-h-[85vh] overflow-y-auto" dir="rtl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setWizardOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">BOM جدید — گام {step} از ۳</p>
            </div>

            {step === 1 && (
              <div className="space-y-3">
                <div><label className={labelCls}>نام محصول نهایی</label><input value={finishedItemName} onChange={(e) => setFinishedItemName(e.target.value)} className={inputCls} dir="rtl" /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className={labelCls}>SKU محصول</label><input value={finishedItemSku} onChange={(e) => setFinishedItemSku(e.target.value)} className={inputCls} dir="ltr" /></div>
                  <div><label className={labelCls}>تعداد تولیدی</label><input type="number" value={outputQuantity} onChange={(e) => setOutputQuantity(e.target.value)} className={inputCls} dir="ltr" /></div>
                </div>
                <button onClick={() => setStep(2)} disabled={!finishedItemName.trim()} className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 mt-1">مرحله بعد</button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <button onClick={() => setLines((l) => [...l, { itemId: items[0]?.id ?? '', quantity: '', scrapFactor: '0.02' }])} className="text-[10px] text-accent hover:underline">+ افزودن ماده اولیه</button>
                  <label className={labelCls}>مواد اولیه (BOM Lines)</label>
                </div>
                {lines.map((l, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-2">
                    <select value={l.itemId} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, itemId: e.target.value } : x))} className={inputCls} dir="rtl">
                      {items.map((i) => <option key={i.id} value={i.id}>{i.nameFa}</option>)}
                    </select>
                    <input type="number" placeholder="مقدار" value={l.quantity} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} className={inputCls} dir="ltr" />
                    <input type="number" placeholder="ضریب ضایعات (۰.۰۲)" step="0.01" value={l.scrapFactor} onChange={(e) => setLines((prev) => prev.map((x, i) => i === idx ? { ...x, scrapFactor: e.target.value } : x))} className={inputCls} dir="ltr" />
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep(3)} className="flex-1 py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90">مرحله بعد</button>
                  <button onClick={() => setStep(1)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-3">
                <div className="bg-secondary/30 rounded-lg p-3 space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-muted-foreground">هزینه مواد (به‌ازای واحد)</span><span className="font-mono text-foreground" dir="ltr">{wizardMaterialCost.toLocaleString('fa-IR')}</span></div>
                </div>
                <div><label className={labelCls}>هزینه فرآوری</label><input type="number" value={processingCost} onChange={(e) => setProcessingCost(e.target.value)} className={inputCls} dir="ltr" /></div>
                <div><label className={labelCls}>نسخه</label><input value={version} onChange={(e) => setVersion(e.target.value)} className={inputCls} dir="ltr" /></div>
                <div className="flex items-center gap-2">
                  <button onClick={submitBOM} className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500">ثبت BOM</button>
                  <button onClick={() => setStep(2)} className="flex-1 py-2.5 rounded-lg border border-border text-foreground text-sm font-semibold hover:bg-secondary">بازگشت</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
