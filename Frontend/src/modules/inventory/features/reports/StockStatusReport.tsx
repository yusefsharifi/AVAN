import { useInventoryStore } from '../../store';
import { useStockFilter } from '../../hooks';
import { ABC_CLASS_CONFIG, UOM_CONFIG } from '../../constants';
import { Search, FileText } from 'lucide-react';
import { ExportButton } from '../../../../shared/components/ui';

const EXPORT_COLUMNS = [
  { key: 'sku', header: 'SKU' },
  { key: 'nameFa', header: 'نام کالا' },
  { key: 'nameEn', header: 'نام انگلیسی' },
  { key: 'categoryName', header: 'دسته‌بندی' },
  { key: 'abcClass', header: 'کلاس' },
  { key: 'totalQuantity', header: 'موجودی' },
  { key: 'reservedQuantity', header: 'رزرو' },
  { key: 'availableQuantity', header: 'قابل تحویل' },
  { key: 'movingAverageCost', header: 'قیمت واحد' },
  { key: 'uom', header: 'واحد' },
];

export default function StockStatusReport() {
  const { items } = useInventoryStore();
  const { search, setSearch, category, setCategory, abcClass, setAbcClass, filteredItems } = useStockFilter();

  const categoryOptions = Array.from(new Map(items.map(i => [i.categoryId, i.categoryName || i.categoryId])).entries());

  const totalQty = filteredItems.reduce((s, i) => s + i.totalQuantity, 0);
  const totalReserved = filteredItems.reduce((s, i) => s + i.reservedQuantity, 0);
  const totalAvailable = filteredItems.reduce((s, i) => s + i.availableQuantity, 0);
  const totalValue = filteredItems.reduce((s, i) => s + i.totalQuantity * i.movingAverageCost, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">گزارش وضعیت موجودی</h1>
        <ExportButton data={filteredItems} filename="stock-status-report" columns={EXPORT_COLUMNS} />
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">موجودی کل</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalQty)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">رزرو شده</p>
          <p className="text-lg font-bold text-amber-600" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalReserved)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">قابل تحویل</p>
          <p className="text-lg font-bold text-emerald-600" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalAvailable)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">ارزش کل</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalValue)} ریال</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="جستجو..." value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pr-9 pl-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent" dir="rtl" />
            </div>
            <select value={category} onChange={e => setCategory(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
              <option value="">همه دسته‌بندی‌ها</option>
              {categoryOptions.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            </select>
            <select value={abcClass} onChange={e => setAbcClass(e.target.value)}
              className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
              <option value="">همه کلاس‌ها</option>
              {Object.entries(ABC_CLASS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {['کلاس', 'ارزش', 'قابل تحویل', 'رزرو', 'موجودی', 'واحد', 'دسته‌بندی', 'نام کالا', 'SKU'].map(h => (
                  <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map(item => {
                const abcCfg = ABC_CLASS_CONFIG[item.abcClass];
                const itemValue = item.totalQuantity * item.movingAverageCost;
                const isLowStock = item.availableQuantity <= item.reorderPoint;
                return (
                  <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20">
                    <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${abcCfg.color} ${abcCfg.bg}`}>{abcCfg.fa}</span></td>
                    <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(itemValue)}</td>
                    <td className="py-3 px-3 text-xs font-mono text-emerald-600" dir="ltr">{item.availableQuantity.toLocaleString('fa-IR')}</td>
                    <td className="py-3 px-3 text-xs font-mono text-amber-600" dir="ltr">{item.reservedQuantity.toLocaleString('fa-IR')}</td>
                    <td className="py-3 px-3"><span className={`text-xs font-semibold ${isLowStock ? 'text-red-600' : 'text-foreground'}`} dir="ltr">{item.totalQuantity.toLocaleString('fa-IR')}</span></td>
                    <td className="py-3 px-3 text-xs text-foreground">{UOM_CONFIG[item.uom]?.fa ?? item.uom}</td>
                    <td className="py-3 px-3"><span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-secondary text-foreground">{item.categoryName}</span></td>
                    <td className="py-3 px-3">
                      <p className="text-xs font-semibold text-foreground">{item.nameFa}</p>
                      <p className="text-[10px] text-muted-foreground">{item.nameEn}</p>
                    </td>
                    <td className="py-3 px-3 text-[10px] font-mono text-muted-foreground" dir="ltr">{item.sku}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-border bg-secondary/30 font-semibold">
                <td className="py-3 px-3 text-xs text-foreground">جمع کل</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalValue)}</td>
                <td className="py-3 px-3 text-xs font-mono text-emerald-600" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalAvailable)}</td>
                <td className="py-3 px-3 text-xs font-mono text-amber-600" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalReserved)}</td>
                <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalQty)}</td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
                <td className="py-3 px-3"></td>
              </tr>
            </tfoot>
          </table>
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-10">
            <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">موردی یافت نشد</p>
          </div>
        )}
      </div>
    </div>
  );
}
