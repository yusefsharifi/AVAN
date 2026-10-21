export interface AccountSeedData {
  code: string;
  nameFa: string;
  nameEn: string;
  type: string;
  category: string;
  parentCode?: string;
  normalBalance: string;
  level: number;
  isSystem: boolean;
  description?: string;
}

export const CHART_OF_ACCOUNTS_SEED: AccountSeedData[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // 1xxx — ASSETS (دارایی‌ها)
  // ═══════════════════════════════════════════════════════════════════════════
  // Level 1 — Group accounts
  { code: '1100', nameFa: 'صندوق و بانک', nameEn: 'Cash & Bank', type: 'ASSET', category: 'CASH_AND_BANK', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '1200', nameFa: 'حساب‌های دریافتنی', nameEn: 'Accounts Receivable', type: 'ASSET', category: 'ACCOUNTS_RECEIVABLE', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '1300', nameFa: 'موجودی کالا', nameEn: 'Inventory', type: 'ASSET', category: 'INVENTORY', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '1400', nameFa: 'دارایی‌های ثابت', nameEn: 'Fixed Assets', type: 'ASSET', category: 'FIXED_ASSETS', normalBalance: 'DEBIT', level: 1, isSystem: true },

  // Level 2 — Detail accounts under 1100
  { code: '1101', nameFa: 'صندوق نقد', nameEn: 'Cash on Hand', type: 'ASSET', category: 'CASH_AND_BANK', parentCode: '1100', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1102', nameFa: 'حساب بانکی جاری', nameEn: 'Current Bank Account', type: 'ASSET', category: 'CASH_AND_BANK', parentCode: '1100', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1103', nameFa: 'حساب بانکی پس‌انداز', nameEn: 'Savings Bank Account', type: 'ASSET', category: 'CASH_AND_BANK', parentCode: '1100', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 1200
  { code: '1201', nameFa: 'بدهکاران تجاری', nameEn: 'Trade Debtors', type: 'ASSET', category: 'ACCOUNTS_RECEIVABLE', parentCode: '1200', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1202', nameFa: 'اسناد دریافتنی', nameEn: 'Notes Receivable', type: 'ASSET', category: 'ACCOUNTS_RECEIVABLE', parentCode: '1200', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1203', nameFa: 'سایر بدهکاران', nameEn: 'Other Debtors', type: 'ASSET', category: 'ACCOUNTS_RECEIVABLE', parentCode: '1200', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 1300
  { code: '1301', nameFa: 'مواد اولیه', nameEn: 'Raw Materials', type: 'ASSET', category: 'INVENTORY', parentCode: '1300', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1302', nameFa: 'کالای نیمه‌ساخته', nameEn: 'Semi-Finished Goods', type: 'ASSET', category: 'INVENTORY', parentCode: '1300', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1303', nameFa: 'کالای ساخته شده', nameEn: 'Finished Goods', type: 'ASSET', category: 'INVENTORY', parentCode: '1300', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 1400
  { code: '1401', nameFa: 'زمین و ساختمان', nameEn: 'Land & Buildings', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '1400', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1402', nameFa: 'ماشین‌آلات', nameEn: 'Machinery', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '1400', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1403', nameFa: 'وسایل نقلیه', nameEn: 'Vehicles', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '1400', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1404', nameFa: 'تجهیزات اداری', nameEn: 'Office Equipment', type: 'ASSET', category: 'FIXED_ASSETS', parentCode: '1400', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '1405', nameFa: 'استهلاک انباشته', nameEn: 'Accumulated Depreciation', type: 'ASSET', category: 'DEPRECIATION', parentCode: '1400', normalBalance: 'CREDIT', level: 2, isSystem: true },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2xxx — LIABILITIES (بدهی‌ها)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '2100', nameFa: 'حساب‌های پرداختنی', nameEn: 'Accounts Payable', type: 'LIABILITY', category: 'ACCOUNTS_PAYABLE', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '2200', nameFa: 'بدهی‌های کوتاه‌مدت', nameEn: 'Short-term Liabilities', type: 'LIABILITY', category: 'SHORT_TERM_DEBT', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '2300', nameFa: 'بدهی‌های بلندمدت', nameEn: 'Long-term Liabilities', type: 'LIABILITY', category: 'LONG_TERM_DEBT', normalBalance: 'CREDIT', level: 1, isSystem: true },

  // Level 2 — Detail accounts under 2100
  { code: '2101', nameFa: 'بستانکاران تجاری', nameEn: 'Trade Creditors', type: 'LIABILITY', category: 'ACCOUNTS_PAYABLE', parentCode: '2100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2102', nameFa: 'اسناد پرداختنی', nameEn: 'Notes Payable', type: 'LIABILITY', category: 'ACCOUNTS_PAYABLE', parentCode: '2100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2103', nameFa: 'پیش‌دریافت', nameEn: 'Advances Received', type: 'LIABILITY', category: 'ACCOUNTS_PAYABLE', parentCode: '2100', normalBalance: 'CREDIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 2200
  { code: '2201', nameFa: 'تسهیلات بانکی کوتاه‌مدت', nameEn: 'Short-term Bank Loans', type: 'LIABILITY', category: 'SHORT_TERM_DEBT', parentCode: '2200', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2202', nameFa: 'مالیات پرداختنی', nameEn: 'Taxes Payable', type: 'LIABILITY', category: 'SHORT_TERM_DEBT', parentCode: '2200', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2203', nameFa: 'حقوق پرداختنی', nameEn: 'Salaries Payable', type: 'LIABILITY', category: 'SHORT_TERM_DEBT', parentCode: '2200', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2204', nameFa: 'بیمه پرداختنی', nameEn: 'Insurance Payable', type: 'LIABILITY', category: 'SHORT_TERM_DEBT', parentCode: '2200', normalBalance: 'CREDIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 2300
  { code: '2301', nameFa: 'تسهیلات بانکی بلندمدت', nameEn: 'Long-term Bank Loans', type: 'LIABILITY', category: 'LONG_TERM_DEBT', parentCode: '2300', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '2302', nameFa: 'اوراق قرضه', nameEn: 'Bonds Payable', type: 'LIABILITY', category: 'LONG_TERM_DEBT', parentCode: '2300', normalBalance: 'CREDIT', level: 2, isSystem: true },

  // ═══════════════════════════════════════════════════════════════════════════
  // 3xxx — EQUITY (حقوق صاحبان سهام)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '3100', nameFa: 'سرمایه', nameEn: 'Capital', type: 'EQUITY', category: 'CAPITAL', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '3200', nameFa: 'اندوخته قانونی', nameEn: 'Legal Reserve', type: 'EQUITY', category: 'RETAINED_EARNINGS', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '3300', nameFa: 'سود و زیان انباشته', nameEn: 'Retained Earnings', type: 'EQUITY', category: 'RETAINED_EARNINGS', normalBalance: 'CREDIT', level: 1, isSystem: true },

  // ═══════════════════════════════════════════════════════════════════════════
  // 4xxx — REVENUE (درآمدها)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '4100', nameFa: 'درآمد ارائه خدمات', nameEn: 'Service Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '4200', nameFa: 'درآمد فروش محصول', nameEn: 'Sales Revenue', type: 'REVENUE', category: 'SALES_REVENUE', normalBalance: 'CREDIT', level: 1, isSystem: true },
  { code: '4300', nameFa: 'سایر درآمدها', nameEn: 'Other Revenue', type: 'REVENUE', category: 'OTHER_REVENUE', normalBalance: 'CREDIT', level: 1, isSystem: true },

  // Level 2 — Detail accounts under 4100
  { code: '4101', nameFa: 'درآمد وزن‌کشی (باسکول)', nameEn: 'Weigh Scale Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '4102', nameFa: 'درآمد مجوزها', nameEn: 'Permit Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '4103', nameFa: 'درآمد اجاره واحدها', nameEn: 'Lease Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '4104', nameFa: 'درآمد پارکینگ', nameEn: 'Parking Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4100', normalBalance: 'CREDIT', level: 2, isSystem: true },
  { code: '4105', nameFa: 'درآمد سایر خدمات', nameEn: 'Other Service Revenue', type: 'REVENUE', category: 'SERVICE_REVENUE', parentCode: '4100', normalBalance: 'CREDIT', level: 2, isSystem: true },

  // ═══════════════════════════════════════════════════════════════════════════
  // 5xxx — EXPENSES (هزینه‌ها)
  // ═══════════════════════════════════════════════════════════════════════════
  { code: '5100', nameFa: 'هزینه‌های پرسنلی', nameEn: 'Payroll Expenses', type: 'EXPENSE', category: 'PAYROLL_EXPENSE', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '5200', nameFa: 'هزینه‌های عملیاتی', nameEn: 'Operating Expenses', type: 'EXPENSE', category: 'DIRECT_EXPENSE', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '5300', nameFa: 'هزینه‌های اداری', nameEn: 'Administrative Expenses', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '5400', nameFa: 'هزینه استهلاک', nameEn: 'Depreciation Expense', type: 'EXPENSE', category: 'DEPRECIATION', normalBalance: 'DEBIT', level: 1, isSystem: true },
  { code: '5500', nameFa: 'هزینه مالی', nameEn: 'Financial Expenses', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', normalBalance: 'DEBIT', level: 1, isSystem: true },

  // Level 2 — Detail accounts under 5100
  { code: '5101', nameFa: 'حقوق و دستمزد', nameEn: 'Salaries & Wages', type: 'EXPENSE', category: 'PAYROLL_EXPENSE', parentCode: '5100', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5102', nameFa: 'مزایای پرسنلی', nameEn: 'Employee Benefits', type: 'EXPENSE', category: 'PAYROLL_EXPENSE', parentCode: '5100', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5103', nameFa: 'بیمه سهم کارفرما', nameEn: 'Employer Insurance', type: 'EXPENSE', category: 'PAYROLL_EXPENSE', parentCode: '5100', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 5200
  { code: '5201', nameFa: 'هزینه تعمیرات و نگهداری', nameEn: 'Maintenance Expense', type: 'EXPENSE', category: 'DIRECT_EXPENSE', parentCode: '5200', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5202', nameFa: 'هزینه انرژی (برق، آب، گاز)', nameEn: 'Energy Expense', type: 'EXPENSE', category: 'DIRECT_EXPENSE', parentCode: '5200', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5203', nameFa: 'هزینه حمل‌ونقل', nameEn: 'Transportation Expense', type: 'EXPENSE', category: 'DIRECT_EXPENSE', parentCode: '5200', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5204', nameFa: 'هزینه بیمه', nameEn: 'Insurance Expense', type: 'EXPENSE', category: 'DIRECT_EXPENSE', parentCode: '5200', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 5300
  { code: '5301', nameFa: 'هزینه اداری و دفتری', nameEn: 'Office Expense', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', parentCode: '5300', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5302', nameFa: 'هزینه مکاتبات', nameEn: 'Correspondence Expense', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', parentCode: '5300', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5303', nameFa: 'هزینه فناوری اطلاعات', nameEn: 'IT Expense', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', parentCode: '5300', normalBalance: 'DEBIT', level: 2, isSystem: true },

  // Level 2 — Detail accounts under 5500
  { code: '5501', nameFa: 'سود تسهیلات', nameEn: 'Interest Expense', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', parentCode: '5500', normalBalance: 'DEBIT', level: 2, isSystem: true },
  { code: '5502', nameFa: 'کارمزد بانکی', nameEn: 'Bank Charges', type: 'EXPENSE', category: 'INDIRECT_EXPENSE', parentCode: '5500', normalBalance: 'DEBIT', level: 2, isSystem: true },
];
