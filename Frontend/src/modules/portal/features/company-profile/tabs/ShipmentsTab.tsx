import { usePortalStore } from '../../../store';
import { DataTable, Column } from '../../../components/DataTable';
import { FilterBar } from '../../../components/FilterBar';
import { useDebounceSearch } from '../../../hooks';
import { SHIPMENT_STATUS_CONFIG } from '../../../constants';
import type { Shipment } from '../../../types';

interface ShipmentsTabProps {
  companyId: string;
}

export function ShipmentsTab({ companyId }: ShipmentsTabProps) {
  const { shipments, shipmentFilters, setShipmentFilters, selectedShipments, toggleShipmentSelection } = usePortalStore();
  const { debouncedQuery, search } = useDebounceSearch();

  const filteredShipments = shipments.filter(s => {
    if (s.companyId !== companyId) return false;
    if (debouncedQuery && !s.waybillNumber.includes(debouncedQuery) && !s.driverName.includes(debouncedQuery)) return false;
    if (shipmentFilters.status && s.status !== shipmentFilters.status) return false;
    return true;
  });

  const columns: Column<Shipment>[] = [
    { key: 'waybillNumber', header: 'Waybill', headerFa: 'شماره بارنامه', sortable: true, render: (row) => <span className="font-mono text-primary" dir="ltr">{row.waybillNumber}</span> },
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
    <div className="space-y-4">
      <FilterBar
        filters={[{ key: 'status', label: 'وضعیت', type: 'select', options: Object.entries(SHIPMENT_STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.fa })) }]}
        values={{ search: debouncedQuery, status: shipmentFilters.status || '' }}
        onChange={(key, val) => { if (key === 'search') search(val); else setShipmentFilters({ [key]: val || undefined }); }}
        onClear={() => { search(''); setShipmentFilters({}); }}
      />
      <div className="bg-card rounded-xl border border-border">
        <DataTable
          columns={columns}
          data={filteredShipments}
          selectable
          selectedRows={selectedShipments}
          onSelectionChange={(ids) => ids.forEach(id => { if (!selectedShipments.includes(id)) toggleShipmentSelection(id); })}
          keyExtractor={(row) => row.id}
          emptyMessage="بارنامه‌ای برای این شرکت ثبت نشده"
        />
      </div>
    </div>
  );
}