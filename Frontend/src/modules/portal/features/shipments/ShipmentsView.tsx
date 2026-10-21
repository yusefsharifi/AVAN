import { usePortalStore } from '../../store';
import { DataTable, Column } from '../../components/DataTable';
import { FilterBar } from '../../components/FilterBar';
import { useDebounceSearch } from '../../hooks';
import { SHIPMENT_STATUS_CONFIG } from '../../constants';
import type { Shipment } from '../../types';
import { Plus, Download, Eye } from 'lucide-react';
import { useState } from 'react';

export function ShipmentsView() {
  const { shipments, selectedShipments, toggleShipmentSelection, clearShipmentSelection, setActiveCompany } = usePortalStore();
  const { debouncedQuery, search } = useDebounceSearch();
  const [statusFilter, setStatusFilter] = useState('');

  const filtered = shipments.filter(s => {
    if (debouncedQuery && !s.waybillNumber.includes(debouncedQuery) && !s.driverName.includes(debouncedQuery) && !s.plateNumber.includes(debouncedQuery)) return false;
    if (statusFilter && s.status !== statusFilter) return false;
    return true;
  });

  const columns: Column<Shipment>[] = [
    { key: 'waybillNumber', header: 'Waybill', headerFa: 'شماره بارنامه', sortable: true, render: (row) => <span className="font-mono text-primary" dir="ltr">{row.waybillNumber}</span> },
    { key: 'companyId', header: 'Company', headerFa: 'شرکت', render: (row) => {
      const company = usePortalStore.getState().companies.find(c => c.id === row.companyId);
      return <span className="text-foreground">{company?.name || row.companyId}</span>;
    }},
    { key: 'driverName', header: 'Driver', headerFa: 'راننده', sortable: true },
    { key: 'plateNumber', header: 'Plate', headerFa: 'پلاک', render: (row) => <span className="font-mono" dir="ltr">{row.plateNumber}</span> },
    { key: 'cargoType', header: 'Cargo', headerFa: 'نوع بار', sortable: true },
    { key: 'weightDeclared', header: 'Weight', headerFa: 'وزن', render: (row) => <span dir="ltr">{row.weightDeclared.toLocaleString()} kg</span> },
    { key: 'status', header: 'Status', headerFa: 'وضعیت', render: (row) => {
      const cfg = SHIPMENT_STATUS_CONFIG[row.status];
      return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cfg.color} ${cfg.bg}`}>{cfg.fa}</span>;
    }},
    { key: 'scheduledDate', header: 'Date', headerFa: 'تاریخ', sortable: true },
  ];

  return (
    <div className="h-full flex flex-col p-5 space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-foreground">بارنامه‌ها</h1>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90"><Plus className="w-3.5 h-3.5" /><span>بارنامه جدید</span></button>
        </div>
      </div>
      <FilterBar
        filters={[{ key: 'status', label: 'وضعیت', type: 'select', options: Object.entries(SHIPMENT_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.fa })) }]}
        values={{ search: debouncedQuery, status: statusFilter }}
        onChange={(key, val) => { if (key === 'search') search(val); else setStatusFilter(val); }}
        onClear={() => { search(''); setStatusFilter(''); }}
      />
      <div className="flex-1 bg-card rounded-xl border border-border">
        <DataTable columns={columns} data={filtered} selectable selectedRows={selectedShipments}
          onSelectionChange={(ids) => { clearShipmentSelection(); ids.forEach(id => toggleShipmentSelection(id)); }}
          onRowClick={(row) => setActiveCompany(row.companyId)}
          keyExtractor={(row) => row.id} emptyMessage="بارنامه‌ای یافت نشد" />
      </div>
    </div>
  );
}