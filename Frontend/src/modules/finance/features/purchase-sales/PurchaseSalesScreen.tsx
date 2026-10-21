import { useState } from 'react';
import PurchaseDocumentsTab from './PurchaseDocumentsTab';
import BuyerSellersTab from './BuyerSellersTab';

const TABS = [
  { id: 'purchase_documents', label: 'اسناد خرید' },
  { id: 'buyers_sellers', label: 'خریداران/فروشندگان' },
] as const;

export default function PurchaseSalesScreen() {
  const [tab, setTab] = useState<typeof TABS[number]['id']>('purchase_documents');
  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center gap-1 bg-card border border-border rounded-lg p-1 w-fit">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3.5 py-1.5 rounded-md text-xs font-medium ${tab === t.id ? 'bg-primary text-white' : 'text-muted-foreground'}`}>{t.label}</button>
        ))}
      </div>
      {tab === 'purchase_documents' && <PurchaseDocumentsTab />}
      {tab === 'buyers_sellers' && <BuyerSellersTab />}
    </div>
  );
}
