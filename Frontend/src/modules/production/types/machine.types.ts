export type MaintenanceType = 'preventive' | 'corrective' | 'predictive' | 'calibration';
export type MachineStatus = 'running' | 'idle' | 'maintenance' | 'breakdown' | 'decommissioned';

export interface MaintenanceRecord {
  id: string;
  machineId: string;
  type: MaintenanceType;
  description: string;
  performedBy: string;
  performedAt: string;
  durationHours: number;
  cost: number;
  nextScheduledDate?: string;
  partReplaced?: string;
  workOrderRef?: string;
}

export interface DowntimeLog {
  id: string;
  machineId: string;
  startTime: string;
  endTime?: string;
  reason: 'breakdown' | 'planned_maintenance' | 'material_shortage' | 'power_outage' | 'operator_absence' | 'quality_issue' | 'setup' | 'other';
  description: string;
  impact: 'minor' | 'major' | 'critical';
  reportedBy: string;
  resolvedBy?: string;
  durationMinutes?: number;
}

export interface Machine {
  id: string;
  code: string;
  nameFa: string;
  nameEn: string;
  lineId: string;
  category: 'injection_molding' | 'blow_molding' | 'extrusion' | 'cnc' | 'press' | 'assembly' | 'packaging' | 'quality' | 'utility' | 'other';
  brand: string;
  model: string;
  serialNumber: string;
  installDate: string;
  status: MachineStatus;
  operatingHoursTotal: number;
  operatingHoursSinceLastPM: number;
  pmIntervalHours: number;
  nextPMDue: string;
  currentOperatorId?: string;
  currentOperatorName?: string;
  maintenanceRecords: MaintenanceRecord[];
  downtimeLogs: DowntimeLog[];
  oeeAvailability: number;
  oeePerformance: number;
  oeeQuality: number;
  assetId?: string;
  glAccountCode?: string;
}
