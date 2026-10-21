// Device and IoT Types

export type DeviceType = 'camera' | 'anpr' | 'weighbridge' | 'gate_controller' | 'sensor' | 'meter' | 'barrier' | 'display' | 'reader' | 'other';
export type DeviceStatus = 'online' | 'offline' | 'maintenance' | 'error' | 'unknown';
export type CalibrationStatus = 'valid' | 'due_soon' | 'overdue' | 'not_required';

export interface Device {
  id: string;
  code: string;
  name: string;
  type: DeviceType;
  parkId: string;
  parkName: string;
  location: string;
  ipAddress?: string;
  macAddress?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  firmwareVersion?: string;
  status: DeviceStatus;
  lastOnlineAt?: string;
  lastOfflineAt?: string;
  uptimePercent: number;
  healthScore: number;
  calibrationStatus?: CalibrationStatus;
  lastCalibrationDate?: string;
  nextCalibrationDate?: string;
  installationDate: string;
  warrantyExpiryDate?: string;
  maintenanceNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeviceAlert {
  id: string;
  deviceId: string;
  deviceName: string;
  parkId: string;
  parkName: string;
  type: 'offline' | 'error' | 'calibration_due' | 'maintenance_required' | 'firmware_update' | 'security';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  occurredAt: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

export interface WeighbridgeScale {
  id: string;
  code: string;
  name: string;
  parkId: string;
  parkName: string;
  location: string;
  maxCapacityKg: number;
  minCapacityKg: number;
  accuracy: string;
  status: DeviceStatus;
  calibrationStatus: CalibrationStatus;
  lastCalibrationDate: string;
  nextCalibrationDate: string;
  calibrationCertificateId?: string;
  totalWeighings: number;
  todayWeighings: number;
  lastWeighingAt?: string;
  gateIntegration: boolean;
  anprIntegration: boolean;
  financialChargeEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WeightTicket {
  id: string;
  ticketNumber: string;
  scaleId: string;
  scaleName: string;
  parkId: string;
  parkName: string;
  vehiclePlate: string;
  driverName?: string;
  driverNationalId?: string;
  companyId?: string;
  companyName?: string;
  direction: 'inbound' | 'outbound';
  grossWeight: number;
  tareWeight: number;
  netWeight: number;
  firstWeighingAt: string;
  secondWeighingAt?: string;
  waybillId?: string;
  chargeAmount?: number;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  createdAt: string;
}

export interface Waybill {
  id: string;
  waybillNumber: string;
  parkId: string;
  parkName: string;
  companyId: string;
  companyName: string;
  carrierId?: string;
  carrierName?: string;
  driverName: string;
  driverNationalId: string;
  driverMobile: string;
  vehiclePlate: string;
  vehicleType: string;
  direction: 'inbound' | 'outbound' | 'internal';
  origin: string;
  destination: string;
  cargoDescription: string;
  cargoWeight?: number;
  cargoValue?: number;
  gateEntryAt?: string;
  gateEntryGateId?: string;
  gateExitAt?: string;
  gateExitGateId?: string;
  weighbridgeTicketId?: string;
  documents: string[];
  damageReport?: string;
  discrepancyReport?: string;
  chargeAmount?: number;
  status: 'draft' | 'approved' | 'gate_entry' | 'in_park' | 'gate_exit' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface DeviceHealthSummary {
  parkId: string;
  parkName: string;
  totalDevices: number;
  onlineDevices: number;
  offlineDevices: number;
  errorDevices: number;
  maintenanceDevices: number;
  uptimePercent: number;
  calibrationDue: number;
  calibrationOverdue: number;
  activeAlerts: number;
}
