export type WarehouseType = 'raw_material' | 'finished_goods' | 'spare_parts' | 'hazmat' | 'cold_storage' | 'cross_dock';
export type WarehouseStatus = 'active' | 'full' | 'maintenance' | 'closed';
export type ZoneType = 'receiving' | 'putaway' | 'bulk' | 'bulk_storage' | 'rack_storage' | 'picking' | 'quarantine' | 'returns' | 'cross_dock' | 'hazmat' | 'cold_room';
export type LocationType = 'floor' | 'rack' | 'shelf' | 'bin' | 'refrigerated' | 'refrigerated_cabinet' | 'tank' | 'silos';
export type LocationStatus = 'empty' | 'occupied' | 'reserved' | 'blocked';

export interface WarehouseCapacity {
  maxWeight: number;
  maxVolume: number;
  maxPallets: number;
}

export interface WarehouseUtilization {
  weightPercent: number;
  volumePercent: number;
  palletPercent: number;
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  nameFa: string;
  type: WarehouseType;
  companyId: string;
  address: string;
  capacity: WarehouseCapacity;
  currentUtilization: WarehouseUtilization;
  zones: WarehouseZone[];
  status: WarehouseStatus;
  glAccountId?: string;
  createdAt: string;
}

export interface WarehouseZone {
  id: string;
  warehouseId: string;
  code: string;
  name?: string;
  nameFa?: string;
  type: ZoneType;
  temperatureControlled: boolean;
  temperatureRange?: [number, number];
  humidityControlled: boolean;
  humidityMax?: number;
  maxWeightKg?: number;
  allowedItemCategories?: string[];
  hazardousCompatibility?: string;
  locationCount: number;
}

export interface StorageLocation {
  id: string;
  zoneId: string;
  warehouseId: string;
  code: string;
  barcode: string;
  rfidTag?: string;
  dimensions: { length: number; width: number; height: number };
  maxWeight: number;
  locationType: LocationType;
  allowedItemCategories: string[];
  status: LocationStatus;
  currentItemId?: string;
  currentLotId?: string;
  currentWeightKg?: number;
  currentQuantity: number;
}
