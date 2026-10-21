import { NationalAlert, MorningBriefingItem, WatchlistItem, NationalKPI } from '../types';

export const mockNationalAlerts: NationalAlert[] = [
  {
    id: 'alert-001',
    type: 'device_offline',
    severity: 'critical',
    sourceModule: 'iot',
    zoneId: 'park-004',
    zoneName: 'شهرک صنعتی بینالود',
    ownerId: 'user-030',
    ownerName: 'مدیر شهرک بینالود',
    slaDeadline: '2024-01-21T12:00:00Z',
    escalationLevel: 2,
    status: 'investigating',
    title: '۳۸٪ دستگاه‌های IoT آفلاین',
    description: '۴۷ دستگاه از ۱۲۵ دستگاه IoT شهرک بینالود در وضعیت آفلاین قرار دارند. آخرین اتصال: ۶ ساعت پیش',
    createdAt: '2024-01-20T06:00:00Z',
    updatedAt: '2024-01-20T10:30:00Z'
  },
  {
    id: 'alert-002',
    type: 'utility_anomaly',
    severity: 'warning',
    sourceModule: 'utility',
    zoneId: 'park-001',
    zoneName: 'شهرک صنعتی شمس‌آباد',
    companyId: 'comp-002',
    companyName: 'شرکت صنایع غذایی پارس',
    ownerId: 'user-002',
    ownerName: 'مدیر مالی شمس‌آباد',
    slaDeadline: '2024-01-22T18:00:00Z',
    escalationLevel: 1,
    status: 'open',
    title: 'مصرف برق غیرعادی',
    description: 'مصرف برق ۴۵٪ بیشتر از میانگین ۳ ماه گذشته. بررسی نشتی یا خرابی تجهیزات توصیه می‌شود.',
    createdAt: '2024-01-20T08:15:00Z',
    updatedAt: '2024-01-20T08:15:00Z'
  },
  {
    id: 'alert-003',
    type: 'hse_incident',
    severity: 'critical',
    sourceModule: 'hse',
    zoneId: 'park-002',
    zoneName: 'شهرک صنعتی البرز',
    companyId: 'comp-003',
    companyName: 'شرکت شیمیایی زاگرس',
    ownerId: 'user-010',
    ownerName: 'مدیر شهرک البرز',
    slaDeadline: '2024-01-20T18:00:00Z',
    escalationLevel: 3,
    status: 'investigating',
    title: 'حادثه نشت مواد شیمیایی',
    description: 'گزارش نشت جزئی مواد شیمیایی در انبار ۲. تیم HSE در محل حضور دارد. نیاز به گزارش فوری.',
    createdAt: '2024-01-20T05:30:00Z',
    updatedAt: '2024-01-20T09:45:00Z'
  },
  {
    id: 'alert-004',
    type: 'finance_overdue',
    severity: 'warning',
    sourceModule: 'finance',
    zoneId: 'park-004',
    zoneName: 'شهرک صنعتی بینالود',
    companyId: 'comp-005',
    companyName: 'شرکت قطعات خودرو شرق',
    ownerId: 'user-030',
    ownerName: 'مدیر شهرک بینالود',
    slaDeadline: '2024-01-25T12:00:00Z',
    escalationLevel: 1,
    status: 'open',
    title: 'مطالبات معوق بیش از ۹۰ روز',
    description: 'مطالبات معوق شرکت به مبلغ ۲۶۱ میلیون تومان از ۹۰ روز گذشته. نیاز به اقدام وصول.',
    createdAt: '2024-01-19T14:00:00Z',
    updatedAt: '2024-01-19T14:00:00Z'
  },
  {
    id: 'alert-005',
    type: 'license_expiry',
    severity: 'warning',
    sourceModule: 'compliance',
    zoneId: 'park-003',
    zoneName: 'شهرک صنعتی اصفهان',
    companyId: 'comp-004',
    companyName: 'شرکت نساجی زیبا',
    ownerId: 'user-020',
    ownerName: 'مدیر شهرک اصفهان',
    slaDeadline: '2024-02-01T12:00:00Z',
    escalationLevel: 0,
    status: 'open',
    title: 'انقضای مجوز فعالیت',
    description: 'مجوز فعالیت شرکت تا ۳۰ روز دیگر منقضی می‌شود. نیاز به تمدید.',
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z'
  },
  {
    id: 'alert-006',
    type: 'power_outage',
    severity: 'warning',
    sourceModule: 'infrastructure',
    zoneId: 'park-001',
    zoneName: 'شهرک صنعتی شمس‌آباد',
    ownerId: 'user-005',
    ownerName: 'مدیر عملیات شمس‌آباد',
    slaDeadline: '2024-01-20T16:00:00Z',
    escalationLevel: 1,
    status: 'investigating',
    title: 'قطع موقت برق ناحیه C',
    description: 'قطع برق در ناحیه C به علت خرابی ترانسفورماتور. زمان تخمینی رفع: ۴ ساعت.',
    createdAt: '2024-01-20T11:00:00Z',
    updatedAt: '2024-01-20T11:30:00Z'
  }
];

export const mockMorningBriefing: MorningBriefingItem[] = [
  {
    id: 'brief-001',
    type: 'iot_alert',
    count: 2,
    message: '۲ شهرک دارای هشدار بحرانی IoT هستند',
    severity: 'critical'
  },
  {
    id: 'brief-002',
    type: 'license_expiry',
    count: 3,
    message: '۳ مجوز شرکت در ۳۰ روز آینده منقضی می‌شود',
    severity: 'warning'
  },
  {
    id: 'brief-003',
    type: 'utility_overdue',
    count: 4,
    message: '۴ فاکتور خدمات معوق بیش از ۶۰ روز',
    severity: 'warning'
  },
  {
    id: 'brief-004',
    type: 'hse_incident',
    count: 1,
    message: '۱ حادثه HSE در انتظار رسیدگی',
    severity: 'critical'
  }
];

export const mockWatchlist: WatchlistItem[] = [
  {
    id: 'watch-001',
    parkId: 'park-004',
    name: 'شهرک صنعتی بینالود',
    type: 'offline_devices',
    score: 38,
    reason: '۳۸٪ دستگاه‌ها آفلاین - نیاز به بررسی فوری زیرساخت',
    addedAt: '2024-01-20T06:00:00Z'
  },
  {
    id: 'watch-002',
    companyId: 'comp-003',
    name: 'شرکت شیمیایی زاگرس',
    type: 'high_receivables',
    score: 45,
    reason: 'مطالبات معوق ۶۰۵ میلیون تومان - ریسک مالی بالا',
    addedAt: '2024-01-15T09:00:00Z'
  },
  {
    id: 'watch-003',
    companyId: 'comp-005',
    name: 'شرکت قطعات خودرو شرق',
    type: 'compliance_issues',
    score: 38,
    reason: 'امتیاز HSE پایین و وضعیت تعلیق - نیاز به اقدام',
    addedAt: '2024-01-10T14:00:00Z'
  },
  {
    id: 'watch-004',
    parkId: 'park-004',
    name: 'شهرک صنعتی بینالود',
    type: 'low_occupancy',
    score: 71,
    reason: 'اشغال ۷۱٪ - پایین‌تر از میانگین ملی',
    addedAt: '2024-01-05T10:00:00Z'
  }
];

export const mockNationalKPI: NationalKPI = {
  totalParks: 7,
  activeParks: 7,
  criticalAlertParks: 2,
  totalCompanies: 2020,
  activeCompanies: 1892,
  suspendedCompanies: 45,
  totalEmployees: 48500,
  totalDevices: 1345,
  offlineDevices: 127,
  monthlyTraffic: 643000,
  financeCollections: 48200000000,
  overdueReceivables: 2850000000,
  utilityConsumption: 4250000,
  hseOpenIncidents: 8,
  openWorkPermits: 156,
  activeRFQs: 89,
  marketplaceValue: 125000000000
};
