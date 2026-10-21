import { useCommercialStore } from '@/modules/commercial/store/useCommercialStore';

// View-model for the version fields rendered below; the store's Proforma
// exposes versions via a looser shape, so we read them structurally.
interface ProformaVersionRow {
  versionNumber?: number;
  createdAt: string;
  changeNote?: string;
  snapshot?: { totalBeforeDiscount?: number };
}

export function ProformaVersionHistory() {
  const { proformas } = useCommercialStore();
  
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <h2 className="text-lg font-medium mb-3">تاریخچه نسخ</h2>
      
      {proformas.length > 0 && (
        <div className="space-y-2">
          {proformas.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((p) => {
            const version = p as unknown as ProformaVersionRow;
            return (
            <div key={version.versionNumber} className="p-3 border-b border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">نسخه {version.versionNumber}</span>
                <span className="text-xs text-muted-foreground">{version.createdAt}</span>
              </div>
              <div className="text-sm text-gray-700">
                {version.changeNote}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-medium">تغییرات:</span>
                <span className="ml-2">فروقت {version.snapshot?.totalBeforeDiscount || 0} تومان</span>
              </div>
            </div>
            );
          })}
        </div>
      )}
      
      <div className="mt-4">
        <span className="text-sm text-muted-foreground">تغییرات اصلی:</span>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
          {proformas.map((p, index) => {
            const version = p as unknown as ProformaVersionRow;
            return (
            <li key={index + 1}>
              نسخه {version.versionNumber}: {version.changeNote}
            </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}