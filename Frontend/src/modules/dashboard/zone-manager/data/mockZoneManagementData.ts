import type { CompanyOnboardingRecord, MeterReading, OperationalAlert, UtilityMeter } from '../types/zoneManagement.types';

export const mockOnboardingRecords: CompanyOnboardingRecord[] = [
  {
    id: 'onb-001', companyName: 'تجهیزات صنعتی آریا', companyType: 'سهامی خاص', registrationNumber: '۴۲۸۷۱', nationalId: '۱۴۰۰۹۸۷۶۵۴۳', taxNumber: '۴۱۱۲۳۴۵۶۷۸۹۰', industry: 'تجهیزات صنعتی', lifecycleStatus: 'under_review', zoneId: 'zone-kaveh', block: 'بلوک F', unit: 'واحد ۳', employees: 42, operationalCapacity: '۱۲۰۰ دستگاه در سال', hseContact: 'محسن رستمی', financialContact: 'بهاره احمدی', documents: [{ id: 'doc-1', name: 'اساسنامه.pdf', type: 'حقوقی', uploadedAt: '۱۴۰۳/۰۴/۲۰' }], createdAt: '۱۴۰۳/۰۴/۲۰',
  },
];

export const mockUtilityMeters: UtilityMeter[] = [
  { id: 'meter-001', code: 'E-1001', utilityType: 'electricity', companyId: 'C001', companyName: 'شرکت پلاستیک ایران', location: 'بلوک A، واحد ۱۲', unit: 'kWh', status: 'active', lastReading: 125000, lastReadingDate: '۱۴۰۳/۰۴/۲۰', anomalyThreshold: 20 },
  { id: 'meter-002', code: 'W-1002', utilityType: 'water', companyId: 'C002', companyName: 'صنایع فولاد البرز', location: 'بلوک B، واحد ۳', unit: 'm³', status: 'active', lastReading: 4200, lastReadingDate: '۱۴۰۳/۰۴/۲۰', anomalyThreshold: 15 },
];

export const mockMeterReadings: MeterReading[] = [
  { id: 'reading-001', meterId: 'meter-001', readingDate: '۱۴۰۳/۰۴/۲۰', currentValue: 125000, previousValue: 122300, consumption: 2700, source: 'iot', recordedBy: 'سامانه IoT' },
  { id: 'reading-002', meterId: 'meter-002', readingDate: '۱۴۰۳/۰۴/۲۰', currentValue: 4200, previousValue: 3990, consumption: 210, source: 'manual', recordedBy: 'اپراتور Utility' },
];

export const mockOperationalAlerts: OperationalAlert[] = [
  { id: 'alert-001', type: 'utility', severity: 'high', title: 'مصرف غیرعادی آب', description: 'مصرف آب بلوک B نسبت به میانگین ماهانه ۲۲٪ افزایش داشته است.', companyName: 'صنایع فولاد البرز', owner: 'تیم تأسیسات', status: 'open', dueDate: '۱۴۰۳/۰۴/۲۱', createdAt: '۱۴۰۳/۰۴/۲۰ ۱۰:۳۰' },
  { id: 'alert-002', type: 'device', severity: 'medium', title: 'دوربین ورودی جنوبی Offline', description: 'دستگاه بیش از ۳۰ دقیقه ارتباط ندارد.', owner: 'تیم IoT', status: 'investigating', createdAt: '۱۴۰۳/۰۴/۲۰ ۱۱:۰۰' },
];
