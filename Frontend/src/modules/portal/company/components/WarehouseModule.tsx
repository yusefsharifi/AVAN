import { useState } from "react";
import { Plus, Search, AlertTriangle, Package, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft, Truck, Building } from "lucide-react";
import { InventoryItem, GoodsMovement, BinLocation, INVENTORY_ITEMS, BIN_LOCATIONS, GOODS_MOVEMENTS } from "@/entities/document";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const BIN_COLORS: Record<BinLocation["occupancy"], string> = {
  empty: "bg-slate-100 border-slate-200", partial: "bg-amber-50 border-amber-200",
  full: "bg-emerald-50 border-emerald-200", reserved: "bg-blue-50 border-blue-200",
};
const BIN_DOT: Record<BinLocation["occupancy"], string> = {
  empty: "bg-slate-300", partial: "bg-amber-400", full: "bg-emerald-400", reserved: "bg-blue-400",
};
const BIN_LABELS: Record<BinLocation["occupancy"], string> = {
  empty: "خالی", partial: "جزئی", full: "پر", reserved: "رزرو",
};

const SUPPLIERS = [
  { name: "پتروشیمی پارس", contact: "فرید نجفی", phone: "۰۹۱۳۱۲۳۴۵۶۷", category: "مواد شیمیایی", rating: 4.5 },
  { name: "فولاد البرز", contact: "امیر صادقی", phone: "۰۹۱۲۱۱۱۲۲۳۳", category: "فلزات", rating: 4.2 },
  { name: "پلاستیک ایران", contact: "علی محمدی", phone: "۰۹۱۲۳۴۵۶۷۸۹", category: "مواد اولیه پلاستیک", rating: 4.8 },
  { name: "تجهیزات صنعتی پارس", contact: "رضا کریمی", phone: "۰۹۱۲۲۲۲۳۳۴۴", category: "تجهیزات", rating: 3.9 },
  { name: "رنگ البرز", contact: "کمال صادقی", phone: "۰۹۱۴۲۲۲۳۳۴۴", category: "رنگ و تینر", rating: 4.1 },
];

export default function WarehouseModule() {
  const [tab, setTab] = useState<"overview" | "stock" | "movements" | "receipt" | "issue" | "suppliers">("overview");
  const [search, setSearch] = useState("");
  const [inventoryItems] = useState<InventoryItem[]>(INVENTORY_ITEMS);
  const [movements] = useState<GoodsMovement[]>(GOODS_MOVEMENTS);
  const [bins] = useState<BinLocation[]>(BIN_LOCATIONS);

  // Receipt form
  const [receiptForm, setReceiptForm] = useState({ itemId: INVENTORY_ITEMS[0]?.id || "", quantity: "", ref: "", notes: "" });
  // Issue form
  const [issueForm, setIssueForm] = useState({ itemId: INVENTORY_ITEMS[0]?.id || "", quantity: "", destination: "", ref: "", notes: "" });

  const lowStockItems = inventoryItems.filter((i) => i.quantity <= i.reorderPoint);
  const totalValue = inventoryItems.reduce((s, i) => s + i.quantity, 0);
  const fullBins = bins.filter((b) => b.occupancy === "full").length;
  const occupancyPct = Math.round((bins.filter((b) => b.occupancy !== "empty").length / bins.length) * 100);

  const filteredStock = inventoryItems.filter((i) =>
    !search || i.name.includes(search) || i.sku.includes(search) || i.category.includes(search)
  );

  const movementTypeIcon = (type: GoodsMovement["type"]) => {
    switch (type) {
      case "receipt": return <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />;
      case "issue": return <ArrowUpCircle className="w-3.5 h-3.5 text-red-500" />;
      case "transfer": return <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" />;
      case "adjustment": return <Package className="w-3.5 h-3.5 text-amber-500" />;
    }
  };
  const movementTypeLabel = (type: GoodsMovement["type"]) => {
    switch (type) {
      case "receipt": return "رسید";
      case "issue": return "حواله";
      case "transfer": return "انتقال";
      case "adjustment": return "اصلاح";
    }
  };

  const rows = ["A", "B", "C", "D", "E", "F"];
  const cols = [1, 2, 3, 4];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1">
          {([
            { id: "overview", label: "نمای کلی" },
            { id: "stock", label: "موجودی" },
            { id: "movements", label: "گردش کالا" },
            { id: "receipt", label: "رسید کالا" },
            { id: "issue", label: "حواله کالا" },
            { id: "suppliers", label: "تأمین‌کنندگان" },
          ] as const).map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${tab === t.id ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <h1 className="text-sm font-semibold text-foreground">مدیریت انبار و موجودی</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{inventoryItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">کل اقلام</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600" dir="ltr">{occupancyPct}%</p>
          <p className="text-xs text-muted-foreground mt-1">ظرفیت انبار</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600" dir="ltr">{lowStockItems.length}</p>
          <p className="text-xs text-muted-foreground mt-1">هشدار کمبود</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{movements.length}</p>
          <p className="text-xs text-muted-foreground mt-1">گردش این ماه</p>
        </div>
      </div>

      {/* Overview - Bin Grid */}
      {tab === "overview" && (
        <div className="space-y-5">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                {(["empty", "partial", "full", "reserved"] as const).map((occ) => (
                  <div key={occ} className="flex items-center gap-1.5">
                    <span className={`w-3 h-3 rounded ${BIN_DOT[occ]}`} />
                    <span className="text-[11px] text-muted-foreground">{BIN_LABELS[occ]}</span>
                  </div>
                ))}
              </div>
              <h3 className="text-sm font-semibold text-foreground">نمای انبار — شبکه خانه‌ها</h3>
            </div>
            <div className="space-y-1.5">
              {rows.map((row) => (
                <div key={row} className="flex items-center gap-1.5">
                  <span className="w-5 text-[10px] text-muted-foreground font-mono text-center">{row}</span>
                  {cols.map((col) => {
                    const bin = bins.find((b) => b.row === row && b.column === col);
                    if (!bin) return null;
                    return (
                      <div key={bin.id} className={`flex-1 aspect-square rounded-lg border ${BIN_COLORS[bin.occupancy]} p-2 flex flex-col items-center justify-center cursor-default transition-transform hover:scale-105`}>
                        <span className="text-[9px] font-mono text-muted-foreground">{row}-{String(col).padStart(2, '0')}</span>
                        {bin.itemName && <span className="text-[8px] text-foreground text-center leading-tight mt-0.5 truncate w-full">{bin.itemName}</span>}
                        {bin.quantity !== undefined && <span className="text-[8px] font-mono text-muted-foreground mt-0.5" dir="ltr">{bin.quantity.toLocaleString()}</span>}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {/* Low Stock Alerts */}
          {lowStockItems.length > 0 && (
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">هشدار کمبود موجودی</h3>
              </div>
              <div className="space-y-2">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                    <div className="text-right">
                      <p className="text-xs font-semibold text-foreground">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sku} · {item.binLocation}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-mono font-bold text-amber-600" dir="ltr">{item.quantity.toLocaleString()} {item.unit}</p>
                      <p className="text-[10px] text-muted-foreground">نقطه سفارش: {item.reorderPoint.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock Register Tab */}
      {tab === "stock" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input dir="rtl" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="جستجو..."
                className="bg-secondary border border-border rounded-lg py-1.5 pr-3 pl-9 text-xs text-foreground focus:outline-none focus:border-accent w-52" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">دفتر موجودی</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["وضعیت", "مصرف روزانه", "نقطه سفارش", "موجودی", "خانه", "واحد", "دسته", "نام", "SKU"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredStock.map((item) => {
                const isLow = item.quantity <= item.reorderPoint;
                return (
                  <tr key={item.id} className={`border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors ${isLow ? "bg-amber-50/50" : ""}`}>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isLow ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {isLow ? "کمبود" : "موجود"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{item.avgDailyConsumption.toLocaleString()} / روز</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{item.reorderPoint.toLocaleString()}</td>
                    <td className="py-3 px-3 text-xs font-semibold font-mono" dir="ltr">{item.quantity.toLocaleString()}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{item.binLocation}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{item.unit}</td>
                    <td className="py-3 px-3 text-xs text-muted-foreground">{item.category}</td>
                    <td className="py-3 px-3 text-sm font-semibold text-foreground">{item.name}</td>
                    <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{item.sku}</td>
                  </tr>
                );
              })}
              {filteredStock.length === 0 && <tr><td colSpan={9} className="text-center py-8 text-sm text-muted-foreground">نتیجه‌ای یافت نشد</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Movements Tab */}
      {tab === "movements" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">گردش کالاها</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["عملیات", "تاریخ", "از", "به", "مقدار", "کالا", "مرجع", "نوع"].map((h) => (
                  <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-3 text-xs text-muted-foreground">{m.user}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground">{m.date}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{m.fromLocation}</td>
                  <td className="py-3 px-3 text-xs text-muted-foreground font-mono" dir="ltr">{m.toLocation}</td>
                  <td className="py-3 px-3 text-xs font-mono font-semibold" dir="ltr">{Math.abs(m.quantity).toLocaleString()}</td>
                  <td className="py-3 px-3 text-xs text-foreground font-semibold">{m.itemName}</td>
                  <td className="py-3 px-3 text-xs font-mono text-primary" dir="ltr">{m.reference}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      {movementTypeIcon(m.type)}
                      <span className="text-[10px] text-muted-foreground">{movementTypeLabel(m.type)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Receipt Tab */}
      {tab === "receipt" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <ArrowDownCircle className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-semibold text-foreground">فرم رسید کالا</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>کالا</label>
              <select dir="rtl" value={receiptForm.itemId} onChange={(e) => setReceiptForm((f) => ({ ...f, itemId: e.target.value }))} className={inputCls}>
                {inventoryItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>مقدار</label><input dir="ltr" type="number" min={1} value={receiptForm.quantity} onChange={(e) => setReceiptForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>شماره مرجع</label><input dir="ltr" value={receiptForm.ref} onChange={(e) => setReceiptForm((f) => ({ ...f, ref: e.target.value }))} placeholder="GR-XXXX-XXX" className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>توضیحات</label><input dir="rtl" value={receiptForm.notes} onChange={(e) => setReceiptForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
            <button className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">ثبت رسید</button>
          </div>
        </div>
      )}

      {/* Issue Tab */}
      {tab === "issue" && (
        <div className="bg-card rounded-xl border border-border shadow-sm p-5 max-w-lg">
          <div className="flex items-center gap-2 mb-4">
            <ArrowUpCircle className="w-4 h-4 text-red-500" />
            <h3 className="text-sm font-semibold text-foreground">فرم حواله کالا</h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className={labelCls}>کالا</label>
              <select dir="rtl" value={issueForm.itemId} onChange={(e) => setIssueForm((f) => ({ ...f, itemId: e.target.value }))} className={inputCls}>
                {inventoryItems.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.sku}) — موجودی: {i.quantity.toLocaleString()}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><label className={labelCls}>مقدار</label><input dir="ltr" type="number" min={1} value={issueForm.quantity} onChange={(e) => setIssueForm((f) => ({ ...f, quantity: e.target.value }))} className={inputCls} /></div>
              <div><label className={labelCls}>شماره مرجع</label><input dir="ltr" value={issueForm.ref} onChange={(e) => setIssueForm((f) => ({ ...f, ref: e.target.value }))} placeholder="GI-XXXX-XXX" className={inputCls} /></div>
            </div>
            <div><label className={labelCls}>مقصد</label><input dir="rtl" value={issueForm.destination} onChange={(e) => setIssueForm((f) => ({ ...f, destination: e.target.value }))} className={inputCls} /></div>
            <div><label className={labelCls}>توضیحات</label><input dir="rtl" value={issueForm.notes} onChange={(e) => setIssueForm((f) => ({ ...f, notes: e.target.value }))} className={inputCls} /></div>
            <button className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 transition-colors">ثبت حواله</button>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === "suppliers" && (
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="text-sm font-semibold text-foreground">فهرست تأمین‌کنندگان</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-secondary/30">
                {["امتیاز", "دسته‌بندی", "تلفن", "مخاطب", "نام"].map((h) => (
                  <th key={h} className="text-right py-3 px-4 text-xs font-semibold text-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SUPPLIERS.map((s, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                  <td className="py-3 px-4 text-xs font-mono text-amber-600" dir="ltr">{s.rating}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{s.category}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground font-mono" dir="ltr">{s.phone}</td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">{s.contact}</td>
                  <td className="py-3 px-4 text-sm font-semibold text-foreground">{s.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
