import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { useFinanceStore } from '@/modules/finance/store';
import { useInventoryStore } from '../store';
import type { InventoryItem, ItemType, UnitOfMeasure } from '../types';
import { validateItemForm } from '../utils/itemValidation';

const ALL_TABS = [
  { id: 'identity', label: '۱. هویت' },
  { id: 'classification', label: '۲. طبقه‌بندی' },
  { id: 'physical', label: '۳. فیزیکی' },
  { id: 'financial', label: '۴. مالی' },
  { id: 'manufacturing', label: '۵. تولید' },
  { id: 'inventory', label: '۶. انبار' },
  { id: 'procurement', label: '۷. تأمین' },
  { id: 'documents', label: '۸. مدارک' },
] as const;

type Props = {
  onClose: () => void;
};

const emptyItem = (): Partial<InventoryItem> => ({
  sku: '',
  barcode: '',
  nameFa: '',
  nameEn: '',
  itemType: 'raw_material',
  categoryId: 'cat-general',
  categoryName: 'عمومی',
  uom: 'piece',
  abcClass: 'C',
  status: 'pending',
  dimensions: { length: 0, width: 0, height: 0, weight: 0 },
  storageRequirements: { hazardous: false },
  valuationMethod: 'weighted_average',
  trackingMethod: 'fifo',
  lotTracking: false,
  serialTracking: false,
  expiryTracking: false,
  reorderPoint: 0,
  reorderQuantity: 0,
  minStockLevel: 0,
  maxStockLevel: 0,
  safetyStock: 0,
  movingAverageCost: 0,
  lastPurchasePrice: 0,
  totalQuantity: 0,
  glAccountId: '',
  cogsAccountId: '',
  sellable: true,
  purchasable: true,
  manufacturable: false,
  inventoryControl: 'strict',
  vendors: [],
  documents: [],
});

const fieldClass = 'w-full rounded border border-border bg-background p-2 text-xs';

export function ItemCreationWizard({ onClose }: Props) {
  const { items, warehouses, locations, addItem } = useInventoryStore();
  const { accounts, buyers } = useFinanceStore();
  const [item, setItem] = useState<Partial<InventoryItem>>(emptyItem);
  const [activeTab, setActiveTab] = useState('identity');

  const visibleTabs = useMemo(() => {
    const isService = item.itemType === 'service';
    const isManufacturing = ['raw_material', 'wip', 'finished_good'].includes(item.itemType ?? '');

    return ALL_TABS.filter((tab) => {
      if (tab.id === 'physical' || tab.id === 'inventory') return !isService;
      if (tab.id === 'manufacturing') return isManufacturing;
      return true;
    });
  }, [item.itemType]);

  const validation = validateItemForm(item, visibleTabs.map((tab) => tab.id));
  const activeIndex = visibleTabs.findIndex((tab) => tab.id === activeTab);

  const update = <K extends keyof InventoryItem>(key: K, value: InventoryItem[K]) => {
    setItem((current) => ({ ...current, [key]: value }));
  };

  const copyFromItem = (itemId: string) => {
    const source = items.find((existing) => existing.id === itemId);
    if (!source) return;

    setItem({
      ...source,
      id: undefined,
      sku: '',
      barcode: '',
      nameFa: `کپی ${source.nameFa}`,
      totalQuantity: 0,
      reservedQuantity: 0,
      availableQuantity: 0,
      documents: [],
    });

    toast.success('اطلاعات کالا کپی شد.');
  };

  const save = (draft: boolean) => {
    const result = validateItemForm(item, visibleTabs.map((tab) => tab.id));
    if (!draft && !result.valid) {
      toast.error(result.errors[0]);
      return;
    }

    const sku = item.sku?.trim() || `SKU-CO-${String(items.length + 1).padStart(6, '0')}`;
    if (items.some((existing) => existing.sku === sku)) {
      toast.error('SKU تکراری است.');
      return;
    }

    addItem({
      ...item,
      sku,
      barcode: item.barcode?.trim() || `BC${sku}`,
      nameEn: item.nameEn?.trim() || item.nameFa,
      status: draft ? 'pending' : 'active',
      companyId: 'co-001',
    });

    toast.success(draft ? 'پیش‌نویس کالا ذخیره شد.' : `کالای ${item.nameFa} ثبت شد.`);
    onClose();
  };

  const renderTab = () => {
    if (activeTab === 'identity') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="نام کالا (فارسی) *" value={item.nameFa ?? ''} onChange={(value) => update('nameFa', value)} />
          <Input label="نام کالا (انگلیسی)" value={item.nameEn ?? ''} onChange={(value) => update('nameEn', value)} />
          <Input label="SKU" value={item.sku ?? ''} onChange={(value) => update('sku', value)} />
          <Input label="بارکد داخلی" value={item.barcode ?? ''} onChange={(value) => update('barcode', value)} />
          <Input label="GTIN / EAN" value={item.gtin ?? ''} onChange={(value) => update('gtin', value)} />
          <Input label="کد HS" value={item.hsCode ?? ''} onChange={(value) => update('hsCode', value)} />
          <Input label="برند" value={item.brandName ?? ''} onChange={(value) => update('brandName', value)} />
          <Input label="کد تأمین‌کننده" value={item.vendorPartNumber ?? ''} onChange={(value) => update('vendorPartNumber', value)} />
        </div>
      );
    }

    if (activeTab === 'classification') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="نوع کالا *" value={item.itemType ?? 'raw_material'} onChange={(value) => update('itemType', value as ItemType)} options={[
            ['raw_material', 'مواد اولیه'], ['spare_part', 'قطعه یدکی'], ['wip', 'کالای در جریان ساخت'], ['finished_good', 'محصول نهایی'], ['consumable', 'کالای مصرفی'], ['tool_die', 'ابزار و قالب'], ['fixed_asset', 'دارایی ثابت'], ['service', 'خدمت'],
          ]} />
          <Input label="دسته‌بندی" value={item.categoryName ?? ''} onChange={(value) => { update('categoryName', value); update('categoryId', `cat-${value || 'general'}`); }} />
          <Select label="واحد اندازه‌گیری" value={item.uom ?? 'piece'} onChange={(value) => update('uom', value as UnitOfMeasure)} options={['piece', 'kg', 'meter', 'liter', 'box', 'pallet', 'roll', 'drum'].map((value) => [value, value])} />
          <Select label="وضعیت" value={item.status ?? 'pending'} onChange={(value) => update('status', value as InventoryItem['status'])} options={[
            ['active', 'فعال'], ['pending', 'در حال تأیید'], ['inactive', 'غیرفعال'], ['obsolete', 'منسوخ'],
          ]} />
        </div>
      );
    }

    if (activeTab === 'physical') {
      return (
        <div className="grid gap-3 md:grid-cols-3">
          <NumberInput label="طول (cm)" value={item.dimensions?.length ?? 0} onChange={(value) => update('dimensions', { ...item.dimensions!, length: value })} />
          <NumberInput label="عرض (cm)" value={item.dimensions?.width ?? 0} onChange={(value) => update('dimensions', { ...item.dimensions!, width: value })} />
          <NumberInput label="ارتفاع (cm)" value={item.dimensions?.height ?? 0} onChange={(value) => update('dimensions', { ...item.dimensions!, height: value })} />
          <NumberInput label="وزن ناخالص (kg)" value={item.grossWeightKg ?? 0} onChange={(value) => update('grossWeightKg', value)} />
          <NumberInput label="وزن خالص (kg)" value={item.netWeightKg ?? 0} onChange={(value) => update('netWeightKg', value)} />
          <Input label="متریال" value={item.material ?? ''} onChange={(value) => update('material', value)} />
          <div className="rounded border border-border p-2 text-xs text-muted-foreground">
            حجم محاسبه‌شده: {(((item.dimensions?.length ?? 0) * (item.dimensions?.width ?? 0) * (item.dimensions?.height ?? 0)) / 1000000).toLocaleString('fa-IR')} متر مکعب
          </div>
          <NumberInput
            label="حداقل دمای نگهداری (°C)"
            value={item.storageRequirements?.temperatureRange?.[0] ?? 0}
            onChange={(value) => update('storageRequirements', { ...item.storageRequirements!, temperatureRange: [value, item.storageRequirements?.temperatureRange?.[1] ?? 0] })}
          />
          <NumberInput
            label="حداکثر دمای نگهداری (°C)"
            value={item.storageRequirements?.temperatureRange?.[1] ?? 0}
            onChange={(value) => update('storageRequirements', { ...item.storageRequirements!, temperatureRange: [item.storageRequirements?.temperatureRange?.[0] ?? 0, value] })}
          />
          <NumberInput
            label="حداکثر رطوبت (%)"
            value={item.storageRequirements?.humidityMax ?? 0}
            onChange={(value) => update('storageRequirements', { ...item.storageRequirements!, humidityMax: value })}
          />
          <Toggle
            label="کالای خطرناک"
            checked={item.hazardous ?? false}
            onChange={(value) => {
              update('hazardous', value);
              update('storageRequirements', { ...item.storageRequirements!, hazardous: value });
            }}
          />
          {(item.hazardous ?? false) && (
            <>
              <Input
                label="کلاس خطر UN"
                value={item.storageRequirements?.hazardousClass ?? ''}
                onChange={(value) => update('storageRequirements', { ...item.storageRequirements!, hazardousClass: value })}
              />
              <label className="grid gap-1 text-xs">
                <span>بارگذاری MSDS</span>
                <input
                  className={fieldClass}
                  type="file"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    update('storageRequirements', { ...item.storageRequirements!, msdsDocumentId: file.name });
                  }}
                />
              </label>
            </>
          )}
          <Toggle label="قابل انباشت" checked={item.stackable ?? false} onChange={(value) => update('stackable', value)} />
        </div>
      );
    }

    if (activeTab === 'financial') {
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="روش ارزش‌گذاری" value={item.valuationMethod ?? 'weighted_average'} onChange={(value) => update('valuationMethod', value as InventoryItem['valuationMethod'])} options={[
            ['fifo', 'FIFO'], ['fefo', 'FEFO'], ['lifo', 'LIFO'], ['weighted_average', 'میانگین موزون'], ['standard', 'بهای استاندارد'],
          ]} />
          <NumberInput label="بهای میانگین" value={item.movingAverageCost ?? 0} onChange={(value) => update('movingAverageCost', value)} />
          <NumberInput label="قیمت فروش پیشنهادی" value={item.suggestedSalePrice ?? 0} onChange={(value) => update('suggestedSalePrice', value)} />
          <NumberInput label="نرخ VAT (%)" value={item.vatRate ?? 9} onChange={(value) => update('vatRate', value)} />
          <Select label="حساب دارایی موجودی" value={item.glAccountId ?? ''} onChange={(value) => update('glAccountId', value)} options={accounts.filter((account) => account.type === 'asset').map((account) => [account.id, `${account.code} — ${account.nameFa}`])} />
          <Select label="حساب بهای تمام‌شده" value={item.cogsAccountId ?? ''} onChange={(value) => update('cogsAccountId', value)} options={accounts.filter((account) => account.type === 'expense').map((account) => [account.id, `${account.code} — ${account.nameFa}`])} />
          <Select label="حساب درآمد فروش" value={item.revenueAccountId ?? ''} onChange={(value) => update('revenueAccountId', value)} options={accounts.filter((account) => account.type === 'revenue').map((account) => [account.id, `${account.code} — ${account.nameFa}`])} />
          <Select label="حساب تفاوت قیمت" value={item.priceVarianceAccountId ?? ''} onChange={(value) => update('priceVarianceAccountId', value)} options={accounts.filter((account) => account.type === 'expense').map((account) => [account.id, `${account.code} — ${account.nameFa}`])} />
          <Select label="ارز پیش‌فرض" value={item.defaultCurrency ?? 'IRR'} onChange={(value) => update('defaultCurrency', value as 'IRR' | 'USD' | 'EUR')} options={[['IRR', 'ریال'], ['USD', 'دلار'], ['EUR', 'یورو']]} />
          <NumberInput label="حداقل قیمت فروش" value={item.minimumSalePrice ?? 0} onChange={(value) => update('minimumSalePrice', value)} />
          <NumberInput label="حاشیه سود هدف (%)" value={item.targetMarginPercent ?? 0} onChange={(value) => update('targetMarginPercent', value)} />
          {item.itemType === 'fixed_asset' && (
            <>
              <Toggle label="قابل استهلاک" checked={item.depreciable ?? false} onChange={(value) => update('depreciable', value)} />
              <Select label="روش استهلاک" value={item.depreciationMethod ?? 'straight_line'} onChange={(value) => update('depreciationMethod', value as 'straight_line' | 'declining_balance')} options={[['straight_line', 'خط مستقیم'], ['declining_balance', 'نزولی']]} />
              <NumberInput label="عمر مفید (سال)" value={item.usefulLifeYears ?? 0} onChange={(value) => update('usefulLifeYears', value)} />
              <NumberInput label="ارزش اسقاط" value={item.salvageValue ?? 0} onChange={(value) => update('salvageValue', value)} />
            </>
          )}
        </div>
      );
    }

    if (activeTab === 'manufacturing') {
      const bom = item.bom ?? [];
      const routing = item.routing ?? [];

      return (
        <div className="space-y-5">
          <DynamicSection
            title="لیست مواد (BOM)"
            onAdd={() => setItem((current) => ({
              ...current,
              bom: [
                ...(current.bom ?? []),
                {
                  id: `bom-${Date.now()}`,
                  componentItemId: '',
                  quantity: 1,
                  uom: 'piece',
                  scrapFactor: 1,
                  operationSequence: (current.bom?.length ?? 0) + 1,
                  isCritical: false,
                },
              ],
            }))}
          >
            {bom.map((row, _index) => (
              <div className="grid gap-2 md:grid-cols-5" key={row.id}>
                <select className={fieldClass} value={row.componentItemId} onChange={(event) => setItem((current) => ({ ...current, bom: current.bom?.map((itemRow) => itemRow.id === row.id ? { ...itemRow, componentItemId: event.target.value } : itemRow) }))}>
                  <option value="">قطعه انتخاب کنید</option>
                  {items.filter((existing) => existing.id !== item.id).map((existing) => <option key={existing.id} value={existing.id}>{existing.sku} — {existing.nameFa}</option>)}
                </select>
                <NumberInput label="مقدار" value={row.quantity} onChange={(value) => setItem((current) => ({ ...current, bom: current.bom?.map((itemRow) => itemRow.id === row.id ? { ...itemRow, quantity: value } : itemRow) }))} />
                <NumberInput label="ضریب ضایعات" value={row.scrapFactor} onChange={(value) => setItem((current) => ({ ...current, bom: current.bom?.map((itemRow) => itemRow.id === row.id ? { ...itemRow, scrapFactor: value } : itemRow) }))} />
                <Toggle label="حیاتی" checked={row.isCritical} onChange={(value) => setItem((current) => ({ ...current, bom: current.bom?.map((itemRow) => itemRow.id === row.id ? { ...itemRow, isCritical: value } : itemRow) }))} />
                <button className="rounded border border-red-200 px-3 text-xs text-red-600" onClick={() => setItem((current) => ({ ...current, bom: current.bom?.filter((itemRow) => itemRow.id !== row.id) }))}>حذف</button>
              </div>
            ))}
          </DynamicSection>

          <DynamicSection
            title="مسیر تولید (Routing)"
            onAdd={() => setItem((current) => ({
              ...current,
              routing: [
                ...(current.routing ?? []),
                { id: `routing-${Date.now()}`, sequence: (current.routing?.length ?? 0) + 1, operationName: '', standardTimeMin: 0 },
              ],
            }))}
          >
            {routing.map((row) => (
              <div className="grid gap-2 md:grid-cols-4" key={row.id}>
                <Input label="نام عملیات" value={row.operationName} onChange={(value) => setItem((current) => ({ ...current, routing: current.routing?.map((routingRow) => routingRow.id === row.id ? { ...routingRow, operationName: value } : routingRow) }))} />
                <NumberInput label="توالی" value={row.sequence} onChange={(value) => setItem((current) => ({ ...current, routing: current.routing?.map((routingRow) => routingRow.id === row.id ? { ...routingRow, sequence: value } : routingRow) }))} />
                <NumberInput label="زمان استاندارد (دقیقه)" value={row.standardTimeMin} onChange={(value) => setItem((current) => ({ ...current, routing: current.routing?.map((routingRow) => routingRow.id === row.id ? { ...routingRow, standardTimeMin: value } : routingRow) }))} />
                <button className="rounded border border-red-200 px-3 text-xs text-red-600" onClick={() => setItem((current) => ({ ...current, routing: current.routing?.filter((routingRow) => routingRow.id !== row.id) }))}>حذف</button>
              </div>
            ))}
          </DynamicSection>
        </div>
      );
    }

    if (activeTab === 'inventory') {
      const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === item.defaultWarehouseId);
      const zones = selectedWarehouse?.zones ?? [];
      const visibleLocations = locations.filter((location) => location.zoneId === item.defaultZoneId);

      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Select label="روش ردیابی" value={item.trackingMethod ?? 'fifo'} onChange={(value) => update('trackingMethod', value as InventoryItem['trackingMethod'])} options={[
            ['fifo', 'FIFO'], ['fefo', 'FEFO'], ['lifo', 'LIFO'], ['specific_identification', 'شناسایی ویژه'],
          ]} />
          <NumberInput label="نقطه سفارش" value={item.reorderPoint ?? 0} onChange={(value) => update('reorderPoint', value)} />
          <NumberInput label="حداقل موجودی" value={item.minStockLevel ?? 0} onChange={(value) => update('minStockLevel', value)} />
          <NumberInput label="حداکثر موجودی" value={item.maxStockLevel ?? 0} onChange={(value) => update('maxStockLevel', value)} />
          <NumberInput label="موجودی ایمنی" value={item.safetyStock ?? 0} onChange={(value) => update('safetyStock', value)} />
          <Select label="انبار پیش‌فرض" value={item.defaultWarehouseId ?? ''} onChange={(value) => { update('defaultWarehouseId', value); update('defaultZoneId', ''); update('defaultLocationId', ''); }} options={warehouses.map((warehouse) => [warehouse.id, warehouse.nameFa])} />
          <Select label="زون پیش‌فرض" value={item.defaultZoneId ?? ''} onChange={(value) => { update('defaultZoneId', value); update('defaultLocationId', ''); }} options={zones.map((zone) => [zone.id, zone.code])} />
          <Select label="لوکیشن پیش‌فرض" value={item.defaultLocationId ?? ''} onChange={(value) => update('defaultLocationId', value)} options={visibleLocations.map((location) => [location.id, location.code])} />
          <Toggle label="ردیابی لات" checked={item.lotTracking ?? false} onChange={(value) => update('lotTracking', value)} />
          <Toggle label="ردیابی سریال" checked={item.serialTracking ?? false} onChange={(value) => update('serialTracking', value)} />
          <Toggle label="کنترل موجودی سخت" checked={item.inventoryControl === 'strict'} onChange={(value) => update('inventoryControl', value ? 'strict' : 'soft')} />
        </div>
      );
    }

    if (activeTab === 'procurement') {
      const vendors = item.vendors ?? [];

      return (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <NumberInput
              label="زمان تأمین پیش‌فرض (روز)"
              value={item.leadTimeDays ?? 0}
              onChange={(value) => update('leadTimeDays', value)}
            />
            <Select
              label="تأمین‌کننده پیش‌فرض"
              value={item.defaultVendorId ?? ''}
              onChange={(value) => update('defaultVendorId', value)}
              options={buyers.map((buyer) => [buyer.id, buyer.name])}
            />
          </div>

          <DynamicSection
            title="تأمین‌کنندگان کالا"
            onAdd={() => setItem((current) => ({
              ...current,
              vendors: [
                ...(current.vendors ?? []),
                {
                  vendorId: '',
                  isPrimary: (current.vendors?.length ?? 0) === 0,
                  minOrderQty: 1,
                  contractCurrency: 'IRR',
                  qualityRating: 'B',
                },
              ],
            }))}
          >
            {vendors.map((vendor, index) => (
              <div className="grid gap-2 rounded border border-border p-3 md:grid-cols-6" key={`${vendor.vendorId}-${index}`}>
                <select
                  className={fieldClass}
                  value={vendor.vendorId}
                  onChange={(event) => setItem((current) => ({
                    ...current,
                    vendors: current.vendors?.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, vendorId: event.target.value } : row,
                    ),
                  }))}
                >
                  <option value="">تأمین‌کننده</option>
                  {buyers.map((buyer) => <option key={buyer.id} value={buyer.id}>{buyer.name}</option>)}
                </select>

                <NumberInput
                  label="حداقل سفارش"
                  value={vendor.minOrderQty}
                  onChange={(value) => setItem((current) => ({
                    ...current,
                    vendors: current.vendors?.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, minOrderQty: value } : row,
                    ),
                  }))}
                />

                <NumberInput
                  label="قیمت قرارداد"
                  value={vendor.contractPrice ?? 0}
                  onChange={(value) => setItem((current) => ({
                    ...current,
                    vendors: current.vendors?.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, contractPrice: value } : row,
                    ),
                  }))}
                />

                <Select
                  label="ارز"
                  value={vendor.contractCurrency ?? 'IRR'}
                  onChange={(value) => setItem((current) => ({
                    ...current,
                    vendors: current.vendors?.map((row, rowIndex) =>
                      rowIndex === index ? { ...row, contractCurrency: value as 'IRR' | 'USD' | 'EUR' } : row,
                    ),
                  }))}
                  options={[['IRR', 'ریال'], ['USD', 'دلار'], ['EUR', 'یورو']]}
                />

                <Toggle
                  label="تأمین‌کننده اصلی"
                  checked={vendor.isPrimary}
                  onChange={(value) => setItem((current) => ({
                    ...current,
                    defaultVendorId: value ? vendor.vendorId : current.defaultVendorId,
                    vendors: current.vendors?.map((row, rowIndex) => ({
                      ...row,
                      isPrimary: rowIndex === index ? value : value ? false : row.isPrimary,
                    })),
                  }))}
                />

                <button
                  className="rounded border border-red-200 px-3 text-xs text-red-600"
                  onClick={() => setItem((current) => ({
                    ...current,
                    vendors: current.vendors?.filter((_, rowIndex) => rowIndex !== index),
                  }))}
                >
                  حذف
                </button>
              </div>
            ))}
          </DynamicSection>
        </div>
      );
    }

    const documents = item.documents ?? [];

    return (
      <div className="space-y-4">
        <label className="flex cursor-pointer items-center justify-center rounded-lg border border-dashed border-teal-400 bg-teal-50 p-5 text-sm text-teal-700">
          انتخاب و بارگذاری مدرک
          <input
            className="hidden"
            type="file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;

              setItem((current) => ({
                ...current,
                documents: [
                  ...(current.documents ?? []),
                  {
                    id: `doc-${Date.now()}`,
                    documentType: file.type.startsWith('image/') ? 'image' : 'catalog',
                    fileName: file.name,
                    fileUrl: URL.createObjectURL(file),
                    uploadedAt: new Date().toISOString(),
                    uploadedBy: 'admin',
                  },
                ],
              }));
            }}
          />
        </label>

        <div className="overflow-auto rounded border border-border">
          <table className="w-full text-xs">
            <thead className="bg-secondary/50">
              <tr>
                {['نوع سند', 'نام فایل', 'تاریخ آپلود', 'عملیات'].map((header) => <th className="p-3 text-right" key={header}>{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {documents.map((document) => (
                <tr className="border-t border-border" key={document.id}>
                  <td className="p-3">{document.documentType}</td>
                  <td>{document.fileName}</td>
                  <td>{new Date(document.uploadedAt).toLocaleDateString('fa-IR')}</td>
                  <td><button className="text-red-600 hover:underline" onClick={() => setItem((current) => ({ ...current, documents: current.documents?.filter((itemDocument) => itemDocument.id !== document.id) }))}>حذف</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" dir="rtl">
      <section className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-card shadow-2xl">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap gap-2">
            <select className={fieldClass} onChange={(event) => copyFromItem(event.target.value)} value="">
              <option value="">کپی از کالای موجود</option>
              {items.map((existing) => <option key={existing.id} value={existing.id}>{existing.sku} — {existing.nameFa}</option>)}
            </select>
            <button className="rounded border px-3 py-2 text-xs" onClick={() => toast.info('واردات از اکسل در نسخه بعدی فعال می‌شود.')}>واردات از اکسل</button>
            <button className="rounded border px-3 py-2 text-xs" onClick={() => toast.info('اسکن بارکد در نسخه بعدی فعال می‌شود.')}>اسکن بارکد</button>
          </div>
          <div className="flex items-center gap-2">
            <button className="rounded border px-3 py-2 text-xs" onClick={() => save(true)}><Save className="ml-1 inline h-4 w-4" />ذخیره پیش‌نویس</button>
            <button className="rounded p-2 hover:bg-secondary" onClick={onClose}><X className="h-4 w-4" /></button>
          </div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border p-3">
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return <button key={tab.id} className={`relative whitespace-nowrap rounded px-3 py-2 text-xs ${isActive ? 'bg-teal-600 text-white' : 'bg-secondary text-muted-foreground'}`} onClick={() => setActiveTab(tab.id)}>{activeIndex > visibleTabs.findIndex((item) => item.id === tab.id) && <Check className="ml-1 inline h-3 w-3" />}{tab.label}</button>;
          })}
        </nav>

        <main className="flex-1 overflow-y-auto p-5">
          {validation.errors.length > 0 && <div className="mb-3 rounded bg-red-50 p-3 text-xs text-red-700">{validation.errors[0]}</div>}
          {validation.warnings.map((warning) => <div className="mb-3 rounded bg-amber-50 p-3 text-xs text-amber-700" key={warning}>{warning}</div>)}
          {renderTab()}
        </main>

        <footer className="flex items-center justify-between border-t border-border p-4">
          <button className="rounded border px-3 py-2 text-xs disabled:opacity-40" disabled={activeIndex <= 0} onClick={() => setActiveTab(visibleTabs[activeIndex - 1].id)}><ChevronRight className="ml-1 inline h-4 w-4" />مرحله قبل</button>
          {activeIndex < visibleTabs.length - 1 ? <button className="rounded bg-teal-600 px-3 py-2 text-xs text-white" onClick={() => setActiveTab(visibleTabs[activeIndex + 1].id)}>مرحله بعد<ChevronLeft className="mr-1 inline h-4 w-4" /></button> : <button className="rounded bg-emerald-600 px-3 py-2 text-xs text-white" onClick={() => save(false)}>ثبت نهایی کالا</button>}
        </footer>
      </section>
    </div>
  );
}

function DynamicSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-border p-4">
      <div className="mb-3 flex items-center justify-between">
        <button className="rounded bg-teal-600 px-3 py-2 text-xs text-white" onClick={onAdd}>افزودن</button>
        <h3 className="text-sm font-bold">{title}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="grid gap-1 text-xs"><span>{label}</span><input className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="grid gap-1 text-xs"><span>{label}</span><input className={fieldClass} type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[][] }) {
  return <label className="grid gap-1 text-xs"><span>{label}</span><select className={fieldClass} value={value} onChange={(event) => onChange(event.target.value)}><option value="">انتخاب کنید</option>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center gap-2 rounded border border-border p-2 text-xs"><input checked={checked} type="checkbox" onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}

export default ItemCreationWizard;
