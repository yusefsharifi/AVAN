// M20: IoT & Device Integration — Enums and Interfaces
export {
  DeviceType,
  DeviceProtocol,
  DeviceStatus,
  ReadingType,
  CommandType,
  CommandStatus,
  DeviceAlertType,
  AlertSeverity,
} from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; hasMore: boolean; cursor?: string };
}

export interface DeviceHealthDto {
  deviceId: string;
  isOnline: boolean;
  lastSeenAt: Date | null;
  lastHeartbeatAt: Date | null;
  signalStrength: number | null;
  batteryLevel: number | null;
  uptimeSeconds: number | null;
  avgResponseMs: number | null;
  errorCount: number;
  trend: { time: string; isOnline: boolean; responseMs: number | null }[];
}

export interface DeviceMapDto {
  deviceId: string;
  name: string;
  type: string;
  lat: number | null;
  lng: number | null;
  isOnline: boolean;
  status: string;
}

export interface NetworkTopologyDto {
  totalDevices: number;
  online: number;
  offline: number;
  error: number;
  byType: Record<string, { total: number; online: number }>;
}

export interface IoTDashboardDto {
  totalDevices: number;
  online: number;
  offline: number;
  errorCount: number;
  byType: Record<string, { total: number; online: number }>;
  recentAlerts: any[];
  criticalAlerts: number;
  commandsLast24h: number;
  avgResponseMs: number;
}

export interface FirmwareStatusDto {
  currentVersion: string | null;
  latestVersion: string | null;
  isUpToDate: boolean;
  lastChecked: Date;
}

export interface DiagnosticResult {
  deviceId: string;
  status: string;
  details: Record<string, unknown>;
  completedAt: Date;
}

export interface AnprProcessResult {
  readingId: string;
  plate: string;
  confidence: number;
  action: 'AUTO_PROCESSED' | 'SENT_FOR_REVIEW' | 'LOW_CONFIDENCE';
  vehicleInfo?: any;
}

export interface CalibrationResult {
  recommended: { autoProcess: number; review: number };
  accuracy: number;
  falsePositiveRate: number;
}

export interface AnprStatisticsDto {
  totalReadings: number;
  autoProcessed: number;
  sentForReview: number;
  lowConfidence: number;
  avgConfidence: number;
  readingsByHour: number[];
  topPlates: { plate: string; count: number }[];
}

export interface BarrierStateDto {
  isOpen: boolean;
  lastCommand: string | null;
  lastCommandAt: Date | null;
  lastCommandBy: string | null;
  isOnline: boolean;
  loopDetected: boolean;
}

export interface ScaleProcessResult {
  readingId: string;
  weight: number;
  unit: string;
  isStable: boolean;
  isOverload: boolean;
  vehicleOnScale: boolean;
}

export interface ScaleCurrentDto {
  weight: number;
  unit: string;
  isStable: boolean;
  confidence: number;
  isOnline: boolean;
  lastReadingAt: Date | null;
  isOverload: boolean;
  vehicleOnScale: boolean;
}

export interface AxleWeightDto {
  axle1: number | null;
  axle2: number | null;
  axle3: number | null;
  total: number;
  isOverload: boolean;
}

export interface VehiclePositionDto {
  deviceId: string;
  vehiclePlate: string | null;
  lat: number;
  lng: number;
  speed: number;
  heading: number | null;
  isMoving: boolean;
  recordedAt: Date;
}

export interface SpeedViolationDto {
  deviceId: string;
  plate: string | null;
  speed: number;
  limit: number;
  recordedAt: Date;
  lat: number;
  lng: number;
}

export interface IdleReportDto {
  deviceId: string;
  plate: string | null;
  idleMinutes: number;
  lat: number;
  lng: number;
  lastMovement: Date;
}

export interface RfidProcessResult {
  readingId: string;
  cardNumber: string;
  employeeId: string | null;
  employeeName: string | null;
  action: 'CLOCK_IN' | 'CLOCK_OUT' | 'UNKNOWN_CARD' | 'VEHICLE_ACCESS';
  companyId?: string;
}

export interface CardInfoDto {
  type: 'EMPLOYEE' | 'VEHICLE' | 'UNKNOWN';
  employee?: any;
  vehicle?: any;
  isValid: boolean;
}

export interface EnvironmentalCurrentDto {
  deviceId: string;
  deviceName: string;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  co: number | null;
  noiseLevel: number | null;
  lastReadingAt: Date | null;
}

export interface EnvironmentalHistoryDto {
  timestamp: string;
  temperature: number | null;
  humidity: number | null;
  co2: number | null;
  co: number | null;
}

export interface AirQualityIndexDto {
  index: number;
  level: 'GOOD' | 'MODERATE' | 'UNHEALTHY' | 'HAZARDOUS';
  primaryPollutant: string;
  components: Record<string, number>;
}

export interface DeviceHealthReportDto {
  totalDevices: number;
  avgUptime: number;
  avgAvailability: number;
  totalAlerts: number;
  byAlertType: { type: string; count: number }[];
  bySeverity: { severity: string; count: number }[];
  mostProblematicDevices: { deviceId: string; deviceName: string; alertCount: number }[];
  uptimeTrend: { date: string; onlinePercent: number }[];
}

export interface DeviceMetricsDto {
  deviceId: string;
  metrics: { time: string; isOnline: boolean; signalStrength: number | null; batteryLevel: number | null; cpuPercent: number | null; responseMs: number | null }[];
}

export interface MqttConnectionStatus {
  connected: boolean;
  brokerUrl: string;
  clientId: string;
  subscriptionCount: number;
}
