import { NationalCompany } from '../types';

export const mockNationalCompanies: NationalCompany[] = [
  {
    id: 'comp-001',
    code: 'CMP-TEH-001',
    nameFa: 'شرکت فولاد آریا',
    nameEn: 'Aria Steel Company',
    parkId: 'park-001',
    parkName: 'شهرک صنعتی شمس‌آباد',
    province: 'تهران',
    city: 'ری',
    industry: 'metal',
    size: 'large',
    employeeCount: 450,
    lifecycleStatus: 'active',
    nationalId: '10101234567',
    economicCode: '411234567890',
    registrationNumber: '123456',
    address: 'خیابان صنعت، پلاک ۱۲۵',
    contacts: [
      { name: 'علی احمدی', role: 'مدیرعامل', phone: '09121234567', email: 'ahmadi@ariasteel.ir', isPrimary: true },
      { name: 'مریم رضایی', role: 'مدیر مالی', phone: '09122345678', email: 'rezaei@ariasteel.ir', isPrimary: false }
    ],
    lease: {
      id: 'lease-001',
      plotNumber: 'A-125',
      areaSqM: 5000,
      startDate: '2022-01-01',
      endDate: '2027-01-01',
      monthlyRent: 85000000,
      status: 'active'
    },
    utilities: [
      { type: 'electricity', monthlyConsumption: 125000, monthlyBill: 187500000, lastPaymentDate: '2024-01-10', outstandingAmount: 0 },
      { type: 'water', monthlyConsumption: 3500, monthlyBill: 17500000, lastPaymentDate: '2024-01-10', outstandingAmount: 0 },
      { type: 'gas', monthlyConsumption: 8500, monthlyBill: 42500000, lastPaymentDate: '2024-01-10', outstandingAmount: 0 }
    ],
    hse: {
      lastInspectionDate: '2024-01-05',
      inspectionScore: 92,
      openIncidents: 0,
      workPermitsActive: 3,
      certifications: ['ISO 14001', 'OHSAS 18001'],
      complianceStatus: 'compliant'
    },
    finance: {
      totalReceivables: 0,
      overdueReceivables: 0,
      lastPaymentDate: '2024-01-10',
      creditLimit: 500000000,
      creditUsed: 0,
      paymentHistory: 'excellent'
    },
    healthScore: {
      overall: 94,
      financial: 100,
      hse: 92,
      operational: 95,
      energy: 88,
      engagement: 90,
      leaseCompliance: 100,
      marketplace: 85
    },
    documents: [],
    marketplaceActive: true,
    marketplaceTotalValue: 4500000000,
    createdAt: '2022-01-15',
    updatedAt: '2024-01-20'
  },
  {
    id: 'comp-002',
    code: 'CMP-TEH-002',
    nameFa: 'شرکت صنایع غذایی پارس',
    nameEn: 'Pars Food Industries',
    parkId: 'park-001',
    parkName: 'شهرک صنعتی شمس‌آباد',
    province: 'تهران',
    city: 'ری',
    industry: 'food',
    size: 'medium',
    employeeCount: 180,
    lifecycleStatus: 'active',
    nationalId: '10102345678',
    economicCode: '412345678901',
    registrationNumber: '234567',
    address: 'خیابان صنعت، پلاک ۲۳۰',
    contacts: [
      { name: 'حسن کریمی', role: 'مدیرعامل', phone: '09123456789', email: 'karimi@parsfood.ir', isPrimary: true }
    ],
    lease: {
      id: 'lease-002',
      plotNumber: 'B-230',
      areaSqM: 2500,
      startDate: '2021-06-01',
      endDate: '2026-06-01',
      monthlyRent: 42500000,
      status: 'active'
    },
    utilities: [
      { type: 'electricity', monthlyConsumption: 45000, monthlyBill: 67500000, lastPaymentDate: '2024-01-08', outstandingAmount: 0 },
      { type: 'water', monthlyConsumption: 2800, monthlyBill: 14000000, lastPaymentDate: '2024-01-08', outstandingAmount: 0 }
    ],
    hse: {
      lastInspectionDate: '2024-01-10',
      inspectionScore: 88,
      openIncidents: 1,
      workPermitsActive: 1,
      certifications: ['ISO 22000', 'HACCP'],
      complianceStatus: 'compliant'
    },
    finance: {
      totalReceivables: 67500000,
      overdueReceivables: 0,
      lastPaymentDate: '2024-01-08',
      creditLimit: 200000000,
      creditUsed: 67500000,
      paymentHistory: 'good'
    },
    healthScore: {
      overall: 86,
      financial: 88,
      hse: 88,
      operational: 85,
      energy: 82,
      engagement: 88,
      leaseCompliance: 100,
      marketplace: 78
    },
    documents: [],
    marketplaceActive: true,
    marketplaceTotalValue: 1250000000,
    createdAt: '2021-06-15',
    updatedAt: '2024-01-18'
  },
  {
    id: 'comp-003',
    code: 'CMP-ALB-001',
    nameFa: 'شرکت شیمیایی زاگرس',
    nameEn: 'Zagros Chemical Company',
    parkId: 'park-002',
    parkName: 'شهرک صنعتی البرز',
    province: 'البرز',
    city: 'کرج',
    industry: 'chemical',
    size: 'large',
    employeeCount: 320,
    lifecycleStatus: 'active',
    nationalId: '10103456789',
    economicCode: '413456789012',
    registrationNumber: '345678',
    address: 'بلوار صنعت، پلاک ۴۵',
    contacts: [
      { name: 'محمد نوری', role: 'مدیرعامل', phone: '09124567890', email: 'noori@zagroschem.ir', isPrimary: true }
    ],
    lease: {
      id: 'lease-003',
      plotNumber: 'C-045',
      areaSqM: 8000,
      startDate: '2020-03-01',
      endDate: '2025-03-01',
      monthlyRent: 136000000,
      status: 'active',
      nextRenewalDate: '2025-01-01'
    },
    utilities: [
      { type: 'electricity', monthlyConsumption: 280000, monthlyBill: 420000000, lastPaymentDate: '2023-12-15', outstandingAmount: 420000000 },
      { type: 'water', monthlyConsumption: 12000, monthlyBill: 60000000, lastPaymentDate: '2023-12-15', outstandingAmount: 60000000 },
      { type: 'gas', monthlyConsumption: 25000, monthlyBill: 125000000, lastPaymentDate: '2023-12-15', outstandingAmount: 125000000 }
    ],
    hse: {
      lastInspectionDate: '2023-12-20',
      inspectionScore: 72,
      openIncidents: 2,
      workPermitsActive: 5,
      certifications: ['ISO 14001'],
      complianceStatus: 'minor_issues'
    },
    finance: {
      totalReceivables: 605000000,
      overdueReceivables: 605000000,
      lastPaymentDate: '2023-12-15',
      creditLimit: 800000000,
      creditUsed: 605000000,
      paymentHistory: 'fair'
    },
    healthScore: {
      overall: 62,
      financial: 45,
      hse: 72,
      operational: 78,
      energy: 65,
      engagement: 70,
      leaseCompliance: 85,
      marketplace: 55
    },
    documents: [],
    marketplaceActive: true,
    marketplaceTotalValue: 2800000000,
    createdAt: '2020-03-15',
    updatedAt: '2024-01-15'
  },
  {
    id: 'comp-004',
    code: 'CMP-ESF-001',
    nameFa: 'شرکت نساجی زیبا',
    nameEn: 'Ziba Textile Company',
    parkId: 'park-003',
    parkName: 'شهرک صنعتی اصفهان',
    province: 'اصفهان',
    city: 'اصفهان',
    industry: 'textile',
    size: 'medium',
    employeeCount: 210,
    lifecycleStatus: 'active',
    nationalId: '10104567890',
    economicCode: '414567890123',
    registrationNumber: '456789',
    address: 'فاز ۲، بلوک D، پلاک ۱۵',
    contacts: [
      { name: 'زهرا محمدی', role: 'مدیرعامل', phone: '09125678901', email: 'mohammadi@zibatex.ir', isPrimary: true }
    ],
    lease: {
      id: 'lease-004',
      plotNumber: 'D-015',
      areaSqM: 3500,
      startDate: '2019-08-01',
      endDate: '2024-08-01',
      monthlyRent: 59500000,
      status: 'active',
      nextRenewalDate: '2024-06-01'
    },
    utilities: [
      { type: 'electricity', monthlyConsumption: 85000, monthlyBill: 127500000, lastPaymentDate: '2024-01-12', outstandingAmount: 0 },
      { type: 'water', monthlyConsumption: 4500, monthlyBill: 22500000, lastPaymentDate: '2024-01-12', outstandingAmount: 0 }
    ],
    hse: {
      lastInspectionDate: '2024-01-08',
      inspectionScore: 95,
      openIncidents: 0,
      workPermitsActive: 2,
      certifications: ['ISO 9001', 'OEKO-TEX'],
      complianceStatus: 'compliant'
    },
    finance: {
      totalReceivables: 0,
      overdueReceivables: 0,
      lastPaymentDate: '2024-01-12',
      creditLimit: 300000000,
      creditUsed: 0,
      paymentHistory: 'excellent'
    },
    healthScore: {
      overall: 92,
      financial: 100,
      hse: 95,
      operational: 90,
      energy: 85,
      engagement: 92,
      leaseCompliance: 100,
      marketplace: 82
    },
    documents: [],
    marketplaceActive: true,
    marketplaceTotalValue: 980000000,
    createdAt: '2019-08-20',
    updatedAt: '2024-01-19'
  },
  {
    id: 'comp-005',
    code: 'CMP-KHO-001',
    nameFa: 'شرکت قطعات خودرو شرق',
    nameEn: 'East Auto Parts Company',
    parkId: 'park-004',
    parkName: 'شهرک صنعتی بینالود',
    province: 'خراسان رضوی',
    city: 'مشهد',
    industry: 'automotive',
    size: 'medium',
    employeeCount: 145,
    lifecycleStatus: 'suspended',
    nationalId: '10105678901',
    economicCode: '415678901234',
    registrationNumber: '567890',
    address: 'بلوار صنایع، پلاک ۷۸',
    contacts: [
      { name: 'رضا صادقی', role: 'مدیرعامل', phone: '09126789012', email: 'sadeghi@eastauto.ir', isPrimary: true }
    ],
    lease: {
      id: 'lease-005',
      plotNumber: 'E-078',
      areaSqM: 2800,
      startDate: '2022-04-01',
      endDate: '2027-04-01',
      monthlyRent: 47600000,
      status: 'active'
    },
    utilities: [
      { type: 'electricity', monthlyConsumption: 52000, monthlyBill: 78000000, outstandingAmount: 234000000 },
      { type: 'water', monthlyConsumption: 1800, monthlyBill: 9000000, outstandingAmount: 27000000 }
    ],
    hse: {
      lastInspectionDate: '2023-11-15',
      inspectionScore: 58,
      openIncidents: 3,
      workPermitsActive: 0,
      certifications: [],
      complianceStatus: 'major_issues'
    },
    finance: {
      totalReceivables: 261000000,
      overdueReceivables: 261000000,
      creditLimit: 200000000,
      creditUsed: 261000000,
      paymentHistory: 'poor'
    },
    healthScore: {
      overall: 38,
      financial: 20,
      hse: 58,
      operational: 45,
      energy: 40,
      engagement: 35,
      leaseCompliance: 60,
      marketplace: 25
    },
    documents: [],
    marketplaceActive: false,
    marketplaceTotalValue: 0,
    createdAt: '2022-04-15',
    updatedAt: '2024-01-10'
  }
];

export const industries = [
  { id: 'manufacturing', label: 'تولیدی' },
  { id: 'chemical', label: 'شیمیایی' },
  { id: 'food', label: 'صنایع غذایی' },
  { id: 'textile', label: 'نساجی' },
  { id: 'automotive', label: 'قطعات خودرو' },
  { id: 'electronics', label: 'الکترونیک' },
  { id: 'pharmaceutical', label: 'دارویی' },
  { id: 'metal', label: 'فلزات' },
  { id: 'plastic', label: 'پلاستیک' },
  { id: 'other', label: 'سایر' }
];
