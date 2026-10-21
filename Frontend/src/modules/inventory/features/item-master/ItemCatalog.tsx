import { useState } from 'react';
import { useInventoryStore } from '../../store';
import { useStockFilter } from '../../hooks';
import { StockCard } from '../../components';
import ItemCreationWizard from '../../components/ItemCreationWizard';
import { ABC_CLASS_CONFIG, ITEM_STATUS_CONFIG, UOM_CONFIG } from '../../constants';
import { Search, Grid3X3, List, Plus, Package } from 'lucide-react';

// Distinct categories present in the current item list (real data uses free-text
// categoryName rather than the fixed English keys ITEM_CATEGORY_CONFIG expects,
// so we build the filter/display options straight from the data instead).
function useCategoryOptions(items: { categoryId: string; categoryName?: string }[]) {
  const map = new Map<string, string>();
  items.forEach((i) => map.set(i.categoryId, i.categoryName || i.categoryId));
  return Array.from(map.entries());
}

export default function ItemCatalog() {
  const { items } = useInventoryStore();
  const { search, setSearch, category, setCategory, abcClass, setAbcClass, status, setStatus, filteredItems, totalCount } = useStockFilter();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [modalOpen, setModalOpen] = useState(false);

  const categoryOptions = useCategoryOptions(items);
  const totalValue = items.reduce((s, i) => s + i.totalQuantity * i.movingAverageCost, 0);
  const lowStockCount = items.filter(i => i.totalQuantity <= i.reorderPoint).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>کالای جدید</span></button>
        <h1 className="text-lg font-bold text-foreground">کاتالوگ اقلام</h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">تعداد کل اقلام</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">{totalCount}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">ارزش کل موجودی</p>
          <p className="text-lg font-bold text-foreground" dir="ltr">{new Intl.NumberFormat('fa-IR').format(totalValue)}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs text-muted-foreground">اقلام کم‌موجودی</p>
          <p className="text-lg font-bold text-red-600" dir="ltr">{lowStockCount}</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="جستجو بر اساس SKU، نام، بارکد..." value={search} onChange={e => setSearch(e.target.value)}
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
            {Object.entries(ABC_CLASS_CONFIG ?? {}).map(([k, v]: [string, any]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 rounded-lg border border-border bg-background text-xs text-foreground focus:outline-none">
            <option value="">همه وضعیت‌ها</option>
            {Object.entries(ITEM_STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.fa}</option>)}
          </select>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button onClick={() => setViewMode('grid')} className={`p-2 ${viewMode === 'grid' ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-secondary'}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('table')} className={`p-2 ${viewMode === 'table' ? 'bg-accent text-white' : 'bg-background text-muted-foreground hover:bg-secondary'}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredItems.map(item => <StockCard key={item.id} item={item} />)}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-secondary/30">
                  {['وضعیت', 'موجودی', 'رزرو', 'قیمت واحد', 'واحد', 'کلاس', 'دسته‌بندی', 'نام کالا', 'SKU'].map(h => (
                    <th key={h} className="text-right py-3 px-3 text-[10px] font-semibold text-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => {
                  const abcCfg = ABC_CLASS_CONFIG[item.abcClass];
                  const statusCfg = ITEM_STATUS_CONFIG[item.status];
                  const isLowStock = item.totalQuantity <= item.reorderPoint;
                  return (
                    <tr key={item.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusCfg.color} ${statusCfg.bg}`}>{statusCfg.fa}</span></td>
                      <td className="py-3 px-3"><span className={`text-xs font-semibold ${isLowStock ? 'text-red-600' : 'text-foreground'}`} dir="ltr">{item.totalQuantity.toLocaleString('fa-IR')} {UOM_CONFIG[item.uom]?.fa ?? item.uom}</span></td>
                      <td className="py-3 px-3 text-xs text-foreground" dir="ltr">{item.reservedQuantity.toLocaleString('fa-IR')}</td>
                      <td className="py-3 px-3 text-xs font-mono text-foreground" dir="ltr">{item.movingAverageCost.toLocaleString('fa-IR')}</td>
                      <td className="py-3 px-3 text-xs text-foreground">{UOM_CONFIG[item.uom]?.fa ?? item.uom}</td>
                      <td className="py-3 px-3"><span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${abcCfg.color} ${abcCfg.bg}`}>{abcCfg.fa}</span></td>
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
            </table>
          </div>
        )}

        {filteredItems.length === 0 && (
          <div className="text-center py-10">
            <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">موردی یافت نشد</p>
          </div>
        )}
      </div>

      {modalOpen && <ItemCreationWizard onClose={() => setModalOpen(false)} />}
    </div>
  );
}
