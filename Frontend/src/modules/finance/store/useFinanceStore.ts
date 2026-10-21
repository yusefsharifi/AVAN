import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Account, JournalVoucher, SalesInvoice, VendorInvoice, PurchaseOrder, BankAccount, FixedAsset, VATReturn } from '../types';
import { zustandLocalStorage } from '@/shared/lib/persist';
import { accountApi, voucherApi, bankAccountApi } from '../api';
import {
  buyerSellerApi,
  checkApi,
  checkbookApi,
  documentApi,
  fixedAssetApi,
  receiptPaymentDocApi,
  visitorApi,
} from '../api/finance.api';
import { USE_MOCKS, seedFromMock } from '@/shared/lib/mockMode';
import { loadCollection, persistMutation, reconcileEntity } from '@/shared/lib/serverSync';
import type { PersistMutationOptions } from '@/shared/lib/serverSync';

const genId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ── Mock Data ────────────────────────────────────────────────────────────────
const MOCK_ACCOUNTS: Account[] = [
  { id: 'ACC-001', code: '1101', nameFa: 'صندوق', nameEn: 'Cash', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: true, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 50000000, currentBalance: 50000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-002', code: '1102', nameFa: 'بانک ملت', nameEn: 'Bank Melli', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: true, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 2500000000, currentBalance: 2500000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-003', code: '1103', nameFa: 'بانک صادرات', nameEn: 'Bank Saderat', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: true, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 1800000000, currentBalance: 1800000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-004', code: '1201', nameFa: 'حساب‌های دریافتنی', nameEn: 'Accounts Receivable', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: true, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 850000000, currentBalance: 850000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-005', code: '1501', nameFa: 'ماشین‌آلات', nameEn: 'Machinery', type: 'asset', category: 'fixed_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 12000000000, currentBalance: 12000000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-006', code: '2101', nameFa: 'حساب‌های پرداختنی', nameEn: 'Accounts Payable', type: 'liability', category: 'current_liability', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: true, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 1200000000, currentBalance: 1200000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-007', code: '3001', nameFa: 'سرمایه', nameEn: 'Capital', type: 'equity', category: 'equity', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 50000000000, currentBalance: 50000000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-008', code: '4001', nameFa: 'درآمد اجاره', nameEn: 'Rent Revenue', type: 'revenue', category: 'operating_revenue', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 2400000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-009', code: '5001', nameFa: 'حقوق و دستمزد', nameEn: 'Salaries', type: 'expense', category: 'operating_expense', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 1800000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-010', code: '5002', nameFa: 'استهلاک', nameEn: 'Depreciation', type: 'expense', category: 'operating_expense', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 600000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-011', code: '1104', nameFa: 'موجودی کالا و مواد', nameEn: 'Inventory', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: true, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 3200000000, currentBalance: 3200000000, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-012', code: '5003', nameFa: 'بهای تمام‌شده کالای فروش‌رفته', nameEn: 'Cost of Goods Sold', type: 'expense', category: 'operating_expense', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-013', code: '5101', nameFa: 'بهای تمام‌شده تولید', nameEn: 'Production Cost (COGS)', type: 'expense', category: 'operating_expense', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-014', code: '1301', nameFa: 'مالیات بر ارزش افزوده خرید', nameEn: 'VAT Receivable', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-015', code: '4002', nameFa: 'درآمد فروش', nameEn: 'Sales Revenue', type: 'revenue', category: 'operating_revenue', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-016', code: '2301', nameFa: 'مالیات بر ارزش افزوده فروش', nameEn: 'VAT Payable', type: 'liability', category: 'current_liability', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-017', code: '1202', nameFa: 'اسناد دریافتنی (چک)', nameEn: 'Checks Receivable', type: 'asset', category: 'current_asset', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
  { id: 'ACC-018', code: '2102', nameFa: 'اسناد پرداختنی (چک)', nameEn: 'Checks Payable', type: 'liability', category: 'current_liability', parentId: null, level: 1, isBankAccount: false, isCashAccount: false, isControlAccount: false, currency: 'IRR', companyId: 'C-001', fiscalYearId: 'FY-1403', openingBalance: 0, currentBalance: 0, status: 'active', tags: [], dimensions: {} },
];

const MOCK_VOUCHERS: JournalVoucher[] = [
  { id: 'JV-001', voucherNumber: 'JV-1403-000001', date: '۱۴۰۳/۰۴/۰۱', fiscalYearId: 'FY-1403', periodId: 'PER-1403-04', type: 'general', referenceType: 'manual', referenceId: '', description: 'ثبت درآمد اجاره مرداد شرکت پلاستیک ایران', entries: [{ id: 'JE-001', voucherId: 'JV-001', accountId: 'ACC-002', accountCode: '1102', description: 'واریز به حساب بانک ملت', debit: 52800000, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 52800000, creditBaseCurrency: 0, sourceModule: 'manual' }, { id: 'JE-002', voucherId: 'JV-001', accountId: 'ACC-008', accountCode: '4001', description: 'درآمد اجاره مرداد', debit: 0, credit: 48000000, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 48000000, sourceModule: 'manual' }, { id: 'JE-003', voucherId: 'JV-001', accountId: 'ACC-008', accountCode: '4001', description: 'مالیات ارزش افزوده', debit: 0, credit: 4800000, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 4800000, sourceModule: 'manual' }], status: 'posted', preparedBy: 'admin', approvedBy: 'admin', postedAt: '۱۴۰۳/۰۴/۰۱', totalDebit: 52800000, totalCredit: 52800000, isBalanced: true, attachments: [], createdAt: '۱۴۰۳/۰۴/۰۱', updatedAt: '۱۴۰۳/۰۴/۰۱', postedBy: 'admin' },
  { id: 'JV-002', voucherNumber: 'JV-1403-000002', date: '۱۴۰۳/۰۴/۰۵', fiscalYearId: 'FY-1403', periodId: 'PER-1403-04', type: 'general', referenceType: 'manual', referenceId: '', description: 'ثبت هزینه حقوق و دستمزد', entries: [{ id: 'JE-004', voucherId: 'JV-002', accountId: 'ACC-009', accountCode: '5001', description: 'حقوق پرسنل', debit: 1800000000, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 1800000000, creditBaseCurrency: 0, sourceModule: 'payroll' }, { id: 'JE-005', voucherId: 'JV-002', accountId: 'ACC-002', accountCode: '1102', description: 'پرداخت از حساب بانکی', debit: 0, credit: 1800000000, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 1800000000, sourceModule: 'manual' }], status: 'posted', preparedBy: 'admin', approvedBy: 'admin', postedAt: '۱۴۰۳/۰۴/۰۵', totalDebit: 1800000000, totalCredit: 1800000000, isBalanced: true, attachments: [], createdAt: '۱۴۰۳/۰۴/۰۵', updatedAt: '۱۴۰۳/۰۴/۰۵', postedBy: 'admin' },
  { id: 'JV-003', voucherNumber: 'JV-1403-000003', date: '۱۴۰۳/۰۴/۱۰', fiscalYearId: 'FY-1403', periodId: 'PER-1403-04', type: 'adjusting', referenceType: 'depreciation', referenceId: 'FA-001', description: 'ثبت استهلاک ماهانه ماشین‌آلات', entries: [{ id: 'JE-006', voucherId: 'JV-003', accountId: 'ACC-010', accountCode: '5002', description: 'استهلاک ماهانه', debit: 600000000, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 600000000, creditBaseCurrency: 0, sourceModule: 'fixed_asset' }, { id: 'JE-007', voucherId: 'JV-003', accountId: 'ACC-005', accountCode: '1501', description: 'استهلاک انباشته', debit: 0, credit: 600000000, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: 600000000, sourceModule: 'fixed_asset' }], status: 'posted', preparedBy: 'admin', approvedBy: 'admin', postedAt: '۱۴۰۳/۰۴/۱۰', totalDebit: 600000000, totalCredit: 600000000, isBalanced: true, attachments: [], createdAt: '۱۴۰۳/۰۴/۱۰', updatedAt: '۱۴۰۳/۰۴/۱۰', postedBy: 'admin' },
];

// ── ERP extension mock data ────────────────────────────────────────────────
import type {
  PurchaseDocument, SalesDocument, BuyerSeller, BuyerSellerGroup, Visitor,
  BankAccountRecord, AccountGroupKey, FiscalYear, FiscalYearGroup, DocumentStatus,
} from '../types';

const MOCK_PURCHASE_DOCS: PurchaseDocument[] = [
  { id: 'PD-001', documentNumber: '۱', date: '۱۴۰۴/۰۱/۰۵', notes: 'خرید گرانول HDPE', itemNumber: '۱', vendorName: 'پتروپلیمر خاورمیانه', vendorCode: 'VND-001', lineCount: 1, preparedBy: 'AKBARI', approvedBy: 'AKBARI', authorizedBy: '', status: 'posted', statusChangeDate: '۱۴۰۴/۰۱/۰۶', payableAmount: 1468500000, accountingDocRef: 'JV-002', escrowRequired: false, visitorName: '', type: 'purchase_invoice',
    lines: [{ id: genId('dl'), itemCode: 'RM-PG-001', itemName: 'گرانول HDPE', quantity: 30000, unitPrice: 44500, discount: 0, taxRate: 10, lineTotal: 1468500000, notes: '' }],
    projectId: '', costCenterId: '', currencyCode: 'IRR', exchangeRate: 1, totalBeforeDiscount: 1335000000, totalDiscount: 0, totalTax: 133500000, grandTotal: 1468500000, createdAt: '۱۴۰۴/۰۱/۰۵', updatedAt: '۱۴۰۴/۰۱/۰۶' },
  { id: 'PD-002', documentNumber: '۲', date: '۱۴۰۴/۰۱/۱۰', notes: 'خرید بسته‌بندی', itemNumber: '۲', vendorName: 'بسته‌بندی نوین ایران', vendorCode: 'VND-003', lineCount: 1, preparedBy: 'BAGHAEI', approvedBy: '', authorizedBy: '', status: 'approved', statusChangeDate: '۱۴۰۴/۰۱/۱۱', payableAmount: 264000000, escrowRequired: false, visitorName: 'رضا کاظمی', type: 'purchase_invoice',
    lines: [{ id: genId('dl'), itemCode: 'PKG-001', itemName: 'کارتن بسته‌بندی', quantity: 8000, unitPrice: 30000, discount: 0, taxRate: 10, lineTotal: 264000000, notes: '' }],
    projectId: '', costCenterId: '', currencyCode: 'IRR', exchangeRate: 1, totalBeforeDiscount: 240000000, totalDiscount: 0, totalTax: 24000000, grandTotal: 264000000, createdAt: '۱۴۰۴/۰۱/۱۰', updatedAt: '۱۴۰۴/۰۱/۱۱' },
  { id: 'PD-003', documentNumber: '۳', date: '۱۴۰۴/۰۱/۱۵', notes: '.', itemNumber: '۰', vendorName: '', vendorCode: '', lineCount: 0, preparedBy: '', approvedBy: '', authorizedBy: '', status: 'draft', statusChangeDate: '', payableAmount: 0, escrowRequired: false, visitorName: '', type: 'purchase_invoice',
    lines: [], projectId: '', costCenterId: '', currencyCode: 'IRR', exchangeRate: 1, totalBeforeDiscount: 0, totalDiscount: 0, totalTax: 0, grandTotal: 0, createdAt: '۱۴۰۴/۰۱/۱۵', updatedAt: '۱۴۰۴/۰۱/۱۵' },
];

const MOCK_SALES_DOCS: SalesDocument[] = [
  { id: 'SD-001', documentNumber: '۱', date: '۱۴۰۴/۰۱/۰۸', notes: 'فروش اتصالات HDPE', itemNumber: '۱', buyerName: 'شرکت لوله‌سازی البرز', buyerCode: 'C-101', lineCount: 1, preparedBy: 'AKBARI', approvedBy: 'AKBARI', authorizedBy: '', status: 'posted', statusChangeDate: '۱۴۰۴/۰۱/۰۹', receivableAmount: 1017500000, accountingDocRef: '', escrowRequired: false, visitorName: '', type: 'sales_invoice',
    lines: [{ id: genId('dl'), itemCode: 'FG-HDPE-001', itemName: 'اتصالات لوله HDPE', quantity: 5000, unitPrice: 185000, discount: 0, taxRate: 10, lineTotal: 1017500000, notes: '' }],
    projectId: '', costCenterId: '', currencyCode: 'IRR', exchangeRate: 1, totalBeforeDiscount: 925000000, totalDiscount: 0, totalTax: 92500000, grandTotal: 1017500000, createdAt: '۱۴۰۴/۰۱/۰۸', updatedAt: '۱۴۰۴/۰۱/۰۹' },
];

const MOCK_BANK_ACCOUNTS: BankAccountRecord[] = [
  { id: 'BA-001', code: '1', name: 'بانک ملت‌-۵۳۳۷۴۹۹۶۴۸', notes: 'موسسه حقوقی فکر برتر رایکا', bankName: 'بانک ملت', branch: '', accountNumber: '5337499648', iban: '', glAccountId: 'ACC-002', currentBalance: 2500000000, status: 'active' },
  { id: 'BA-002', code: '2', name: 'بانک مسکن-۴۲۰۰۰۰۰۵۲۸۴۶۰', notes: 'موسسه حقوقی فکر برتر رایکا', bankName: 'بانک مسکن', branch: '', accountNumber: '420000052846', iban: '', glAccountId: 'ACC-003', currentBalance: 800000000, status: 'active' },
  { id: 'BA-003', code: '3', name: 'بانک رفاه کارگران-سلامت ظفر-۱۹۷۰۹۶۶۳۳', notes: 'حسین خرقی و آیدین ظهوری', bankName: 'بانک رفاه', branch: 'سلامت ظفر', accountNumber: '1970966330', iban: '', glAccountId: 'ACC-002', currentBalance: 350000000, status: 'active' },
  { id: 'BA-004', code: '4', name: 'بانک رفاه کارگران-سلامت ظفر-۱۹۷۱۲۵۲۵۶', notes: 'موسسه حقوقی فکر برتر رایکا (خارج)', bankName: 'بانک رفاه', branch: 'سلامت ظفر', accountNumber: '1971252560', iban: '', glAccountId: 'ACC-002', currentBalance: 120000000, status: 'active' },
];

const MOCK_BSGROUPS: BuyerSellerGroup[] = [
  { id: 'BSG-001', code: '1', name: 'خریدار/فروشنده', type: 'both', notes: '' },
];

const MOCK_BUYERS_SELLERS: BuyerSeller[] = [
  { id: 'BS-001', code: '•', name: 'محمد مهدی علمدار', title: '', type: 'buyer', paymentMethod: 'cash', groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', visitorId: '', subAccountId: '', transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: 0, bankAccounts: [], status: 'active' },
  { id: 'BS-002', code: '1', name: 'کاربرد بانکی', title: '', type: 'buyer', paymentMethod: 'cash', groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', visitorId: '', subAccountId: '', transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: 0, bankAccounts: [], status: 'active' },
  { id: 'BS-003', code: '۱۰۰۰۱', name: 'بانک رفاه کارگران / سلامت ظفر / ۹۷۰۹۶۶۳۳', title: '', type: 'both', paymentMethod: 'bank_transfer', groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', visitorId: '', subAccountId: '۱۰۰۰۱', transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: 0, bankAccounts: [], status: 'active' },
  { id: 'BS-004', code: '۱۰۰۰۲', name: 'بانک رفاه کارگران / سلامت ظفر / ۹۷۱۲۵۱۵۶', title: '', type: 'both', paymentMethod: 'bank_transfer', groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', visitorId: '', subAccountId: '۱۰۰۰۲', transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: 0, bankAccounts: [], status: 'active' },
  { id: 'BS-005', code: '۱۰۰۰۳', name: 'بانک رفاه کارگران / سلامت ظفر / ۹۷۱۲۴۶۱۸', title: '', type: 'both', paymentMethod: 'bank_transfer', groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', visitorId: '', subAccountId: '۱۰۰۰۳', transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: 0, bankAccounts: [], status: 'active' },
];

const MOCK_VISITORS: Visitor[] = [
  { id: 'VIS-001', code: '1', name: 'رضا کاظمی', phone: '۰۹۱۶۱۱۱۲۲۳۳', region: 'تهران', commissionRate: 2, status: 'active', notes: '' },
];

const MOCK_ACCOUNT_GROUP_KEYS: AccountGroupKey[] = [
  { code: '۲۰۱۹۲۲۶', groupName: 'دارایی های جاری', notes: 'ایجاد اتوماتیک از سیستم دریافت و پرداخت', isPayable: false, isQuantityAsset: false, hasCostCenter: false, hasProject: false, hasNextLevel: false, accountNote: '', nature: 'بدهکار' },
  { code: '۱۰', groupName: 'حسابهای موقت', notes: '', isPayable: false, isQuantityAsset: false, hasCostCenter: false, hasProject: false, hasNextLevel: false, accountNote: '', nature: 'بدهکار' },
  { code: '۱۱', groupName: 'موجودی نقد و بانک', notes: '', isPayable: false, isQuantityAsset: false, hasCostCenter: false, hasProject: false, hasNextLevel: false, accountNote: '', nature: 'بدهکار' },
  { code: '۱۱۰۱', groupName: 'موجودی نزد بانک ها / ریالی', notes: '', isPayable: false, isQuantityAsset: false, hasCostCenter: false, hasProject: false, hasNextLevel: true, accountNote: '', nature: 'بدهکار' },
  { code: '۲۱۰۱', groupName: 'حسابهای پرداختنی تجاری', notes: '', isPayable: true, isQuantityAsset: false, hasCostCenter: false, hasProject: false, hasNextLevel: false, accountNote: '', nature: 'بستانکار' },
];

const MOCK_FY_GROUPS: FiscalYearGroup[] = [{ id: 'FYG-001', code: '1', name: 'گروه ۱-فکر برتر' }];
const MOCK_FISCAL_YEARS: FiscalYear[] = [
  { id: 'FY-1403', groupId: 'FYG-001', year: '۱۴۰۳', startDate: '۱۴۰۳/۰۱/۰۱', endDate: '۱۴۰۳/۱۲/۲۹', status: 'open', periods: Array.from({ length: 12 }, (_, i) => ({ id: `PER-1403-${String(i + 1).padStart(2, '0')}`, fiscalYearId: 'FY-1403', periodNumber: i + 1, name: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'][i], startDate: '', endDate: '', status: i < 4 ? 'closed' as const : 'open' as const })) },
];

// ── Receipts & Payments / Checks mock data ───────────────────────────────────
import type { ReceiptPaymentDoc, ParentDocument, Check, Checkbook } from '../types';

const MOCK_CHECKBOOKS: Checkbook[] = [
  { id: 'CB-001', bookNumber: 'چک‌بانک-001', bankAccountId: 'BA-001', bankName: 'بانک ملت', accountNumber: '5337499648', series: 'A', startNumber: '100001', endNumber: '100050', currentNumber: '100004', totalLeaves: 50, usedLeaves: 3, remainingLeaves: 47, status: 'active', issuedDate: '۱۴۰۳/۰۱/۰۱' },
  { id: 'CB-002', bookNumber: 'چک‌بانک-002', bankAccountId: 'BA-002', bankName: 'بانک مسکن', accountNumber: '420000052846', series: 'B', startNumber: '200001', endNumber: '200025', currentNumber: '200002', totalLeaves: 25, usedLeaves: 1, remainingLeaves: 24, status: 'active', issuedDate: '۱۴۰۳/۰۲/۱۵' },
];

const MOCK_CHECKS: Check[] = [
  { id: 'CHK-001', checkNumber: '100001', checkbookId: 'CB-001', bankAccountId: 'BA-001', bankName: 'بانک ملت', direction: 'outgoing', payeeName: 'پتروپلیمر خاورمیانه', amount: 500000000, currency: 'IRR', issueDate: '۱۴۰۳/۰۴/۰۱', dueDate: '۱۴۰۳/۰۵/۰۱', status: 'pending_clearance', notes: '', createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۰۱' },
  { id: 'CHK-002', checkNumber: '100002', checkbookId: 'CB-001', bankAccountId: 'BA-001', bankName: 'بانک ملت', direction: 'outgoing', payeeName: 'بسته‌بندی نوین ایران', amount: 120000000, currency: 'IRR', issueDate: '۱۴۰۳/۰۳/۱۰', dueDate: '۱۴۰۳/۰۳/۲۵', clearanceDate: '۱۴۰۳/۰۳/۲۵', status: 'cleared', notes: '', createdBy: 'admin', createdAt: '۱۴۰۳/۰۳/۱۰' },
  { id: 'CHK-003', checkNumber: '100003', checkbookId: 'CB-001', bankAccountId: 'BA-001', bankName: 'بانک ملت', direction: 'incoming', payerName: 'شرکت لوله‌سازی البرز', amount: 300000000, currency: 'IRR', issueDate: '۱۴۰۳/۰۴/۰۵', dueDate: '۱۴۰۳/۰۴/۲۰', status: 'bounced', bounceReason: 'کسری موجودی', bounceDate: '۱۴۰۳/۰۴/۲۰', bouncePenaltyAmount: 5000000, notes: '', createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'CHK-004', checkNumber: '200001', checkbookId: 'CB-002', bankAccountId: 'BA-002', bankName: 'بانک مسکن', direction: 'incoming', payerName: 'صنایع بسته‌بندی پارس', amount: 90000000, currency: 'IRR', issueDate: '۱۴۰۳/۰۴/۱۵', dueDate: '۱۴۰۳/۰۵/۱۵', status: 'issued', notes: '', createdBy: 'admin', createdAt: '۱۴۰۳/۰۴/۱۵' },
];

const MOCK_RP_DOCS: ReceiptPaymentDoc[] = [
  { id: 'RP-001', documentNumber: '۱', docType: 'cash_receipt', date: '۱۴۰۳/۰۴/۰۲', type: 'receipt', status: 'posted', statusChangeDate: '۱۴۰۳/۰۴/۰۲', entityId: 'BS-001', entityName: 'محمد مهدی علمدار', entityType: 'buyer', instrumentType: 'cash', totalAmount: 80000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AKBARI', notes: '', description: 'دریافت نقدی بابت فاکتور', glVoucherId: undefined, createdAt: '۱۴۰۳/۰۴/۰۲' },
  { id: 'RP-002', documentNumber: '۲', docType: 'check_receipt', date: '۱۴۰۳/۰۴/۰۵', type: 'receipt', status: 'posted', statusChangeDate: '۱۴۰۳/۰۴/۰۵', entityId: 'BS-002', entityName: 'شرکت لوله‌سازی البرز', entityType: 'buyer', instrumentType: 'check', checkId: 'CHK-003', checkNumber: '100003', checkDate: '۱۴۰۳/۰۴/۲۰', totalAmount: 300000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'BAGHAEI', notes: '', description: 'دریافت چک بابت فاکتور فروش', createdAt: '۱۴۰۳/۰۴/۰۵' },
  { id: 'RP-003', documentNumber: '۳', docType: 'transfer_receipt', date: '۱۴۰۳/۰۴/۰۸', type: 'receipt', status: 'draft', statusChangeDate: '', entityId: 'BS-003', entityName: 'بانک رفاه کارگران / سلامت ظفر / ۹۷۰۹۶۶۳۳', entityType: 'buyer', instrumentType: 'bank_transfer', bankAccountId: 'BA-001', transactionRef: 'TRX-88213', totalAmount: 150000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AKBARI', notes: '', description: 'دریافت حواله', createdAt: '۱۴۰۳/۰۴/۰۸' },
  { id: 'RP-004', documentNumber: '۴', docType: 'cash_receipt', date: '۱۴۰۳/۰۴/۱۲', type: 'receipt', status: 'prepared', statusChangeDate: '', entityId: 'BS-001', entityName: 'محمد مهدی علمدار', entityType: 'buyer', instrumentType: 'cash', totalAmount: 45000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: true, remainingAmount: 35000000, preparedBy: 'MALEKI', notes: 'تسویه جزئی', description: 'دریافت نقدی بخشی از فاکتور', createdAt: '۱۴۰۳/۰۴/۱۲' },
  { id: 'RP-005', documentNumber: '۵', docType: 'transfer_receipt', date: '۱۴۰۳/۰۴/۱۸', type: 'receipt', status: 'draft', statusChangeDate: '', entityId: 'BS-004', entityName: 'بانک رفاه کارگران / سلامت ظفر / ۹۷۱۲۵۱۵۶', entityType: 'buyer', instrumentType: 'bank_transfer', bankAccountId: 'BA-002', transactionRef: 'TRX-88300', totalAmount: 60000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AZIZI', notes: '', description: 'دریافت حواله بانکی', createdAt: '۱۴۰۳/۰۴/۱۸' },
  { id: 'RP-006', documentNumber: '۶', docType: 'cash_payment', date: '۱۴۰۳/۰۴/۰۳', type: 'payment', status: 'posted', statusChangeDate: '۱۴۰۳/۰۴/۰۳', entityId: 'VND-002', entityName: 'تجهیزات صنعتی آریا', entityType: 'seller', instrumentType: 'cash', totalAmount: 25000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AKBARI', notes: '', description: 'پرداخت نقدی هزینه تعمیرات', createdAt: '۱۴۰۳/۰۴/۰۳' },
  { id: 'RP-007', documentNumber: '۷', docType: 'check_payment', date: '۱۴۰۳/۰۴/۰۱', type: 'payment', status: 'posted', statusChangeDate: '۱۴۰۳/۰۴/۰۱', entityId: 'VND-001', entityName: 'پتروپلیمر خاورمیانه', entityType: 'seller', instrumentType: 'check', checkId: 'CHK-001', checkNumber: '100001', checkDate: '۱۴۰۳/۰۵/۰۱', totalAmount: 500000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'BAGHAEI', notes: '', description: 'پرداخت چک بابت خرید گرانول', createdAt: '۱۴۰۳/۰۴/۰۱' },
  { id: 'RP-008', documentNumber: '۸', docType: 'transfer_payment', date: '۱۴۰۳/۰۴/۰۶', type: 'payment', status: 'draft', statusChangeDate: '', entityId: 'VND-003', entityName: 'بسته‌بندی نوین ایران', entityType: 'seller', instrumentType: 'bank_transfer', bankAccountId: 'BA-001', transactionRef: 'TRX-77102', totalAmount: 90000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'MALEKI', notes: '', description: 'پرداخت حواله‌ای بابت بسته‌بندی', createdAt: '۱۴۰۳/۰۴/۰۶' },
  { id: 'RP-009', documentNumber: '۹', docType: 'check_payment', date: '۱۴۰۳/۰۳/۱۰', type: 'payment', status: 'posted', statusChangeDate: '۱۴۰۳/۰۳/۲۵', entityId: 'VND-003', entityName: 'بسته‌بندی نوین ایران', entityType: 'seller', instrumentType: 'check', checkId: 'CHK-002', checkNumber: '100002', checkDate: '۱۴۰۳/۰۳/۲۵', totalAmount: 120000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AZIZI', notes: '', description: 'پرداخت چک وصول‌شده', createdAt: '۱۴۰۳/۰۳/۱۰' },
  { id: 'RP-010', documentNumber: '۱۰', docType: 'cash_payment', date: '۱۴۰۳/۰۴/۲۰', type: 'payment', status: 'draft', statusChangeDate: '', entityId: 'VND-004', entityName: 'مواد شیمیایی الوند', entityType: 'seller', instrumentType: 'cash', totalAmount: 15000000, currency: 'IRR', exchangeRate: 1, lines: [], isPartial: false, preparedBy: 'AKBARI', notes: '', description: 'پرداخت نقدی متفرقه', createdAt: '۱۴۰۳/۰۴/۲۰' },
];

const MOCK_PARENT_DOCS: ParentDocument[] = [
  { id: 'PAR-001', documentNumber: 'SD-1', date: '۱۴۰۳/۰۴/۰۲', description: 'فاکتور فروش اتصالات HDPE', entityName: 'محمد مهدی علمدار', totalAmount: 125000000, settledAmount: 125000000, remainingAmount: 0, childDocumentIds: ['RP-001'], status: 'fully_applied', notes: '' },
  { id: 'PAR-002', documentNumber: 'SD-2', date: '۱۴۰۳/۰۴/۰۵', description: 'فاکتور فروش به شرکت لوله‌سازی البرز', entityName: 'شرکت لوله‌سازی البرز', totalAmount: 300000000, settledAmount: 300000000, remainingAmount: 0, childDocumentIds: ['RP-002'], status: 'fully_applied', notes: '' },
  { id: 'PAR-003', documentNumber: 'SD-3', date: '۱۴۰۳/۰۴/۱۰', description: 'فاکتور فروش محمد مهدی علمدار (دوره دوم)', entityName: 'محمد مهدی علمدار', totalAmount: 80000000, settledAmount: 45000000, remainingAmount: 35000000, childDocumentIds: ['RP-004'], status: 'partially_applied', notes: '' },
  { id: 'PAR-004', documentNumber: 'PD-1', date: '۱۴۰۳/۰۴/۰۱', description: 'فاکتور خرید گرانول HDPE', entityName: 'پتروپلیمر خاورمیانه', totalAmount: 500000000, settledAmount: 500000000, remainingAmount: 0, childDocumentIds: ['RP-007'], status: 'fully_applied', notes: '' },
  { id: 'PAR-005', documentNumber: 'PD-2', date: '۱۴۰۳/۰۴/۰۶', description: 'فاکتور خرید بسته‌بندی', entityName: 'بسته‌بندی نوین ایران', totalAmount: 210000000, settledAmount: 90000000, remainingAmount: 120000000, childDocumentIds: ['RP-008'], status: 'partially_applied', notes: '' },
];

const MOCK_FIXED_ASSETS: FixedAsset[] = [
  {
    id: 'FA-IT-LAPTOP-014', assetCode: 'IT-LAPTOP-014', name: 'لپ‌تاپ Dell Latitude', category: 'it_equipment',
    companyId: 'C-001', location: 'دفتر مرکزی', acquisitionDate: '۱۴۰۲/۰۶/۰۱', acquisitionCost: 350000000,
    additionalCosts: 0, totalCapitalizedCost: 350000000, depreciationMethod: 'straight_line', usefulLifeYears: 3,
    salvageValue: 20000000, depreciationStartDate: '۱۴۰۲/۰۶/۰۱', accumulatedDepreciation: 110000000,
    netBookValue: 240000000, status: 'active', maintenanceRecords: [], depreciationVoucherIds: [], createdAt: '۱۴۰۲/۰۶/۰۱',
  },
  {
    id: 'FA-COM-SIM-221', assetCode: 'COM-SIM-221', name: 'سیم‌کارت شرکتی', category: 'it_equipment',
    companyId: 'C-001', location: 'دفتر مرکزی', acquisitionDate: '۱۴۰۲/۰۱/۱۵', acquisitionCost: 5000000,
    additionalCosts: 0, totalCapitalizedCost: 5000000, depreciationMethod: 'straight_line', usefulLifeYears: 2,
    salvageValue: 0, depreciationStartDate: '۱۴۰۲/۰۱/۱۵', accumulatedDepreciation: 3000000,
    netBookValue: 2000000, status: 'active', maintenanceRecords: [], depreciationVoucherIds: [], createdAt: '۱۴۰۲/۰۱/۱۵',
  },
];

// ── Store ────────────────────────────────────────────────────────────────────

interface FinanceStore {
  accounts: Account[];
  vouchers: JournalVoucher[];
  fixedAssets: FixedAsset[];
  loading: boolean;
  activeTab: string;
  selectedAccountId: string | null;
  periodStatus: Record<string, 'open' | 'closed'>;
  
  // Actions
  setActiveTab: (tab: string) => void;
  selectAccount: (id: string | null) => void;
  createVoucher: (voucher: Partial<JournalVoucher>) => JournalVoucher;
  postVoucher: (id: string) => void;
  reverseVoucher: (id: string, reason: string) => void;
  loadFromApi: () => Promise<void>;  // COMP-004: Load from backend API

  // Cross-module (called by HR store)
  addPayrollVoucher: (params: { batchId: string; totalNetPay: number; totalGross?: number; totalInsurance?: number; totalTax?: number; totalOtherDeductions?: number; month: string }) => JournalVoucher;
  setAssetCustodian: (assetCode: string, employeeId: string, employeeName: string) => void;
  clearAssetCustodian: (assetCode: string) => void;
  getFixedAssetByCode: (assetCode: string) => FixedAsset | undefined;
  createFixedAsset: (asset: Partial<FixedAsset>) => FixedAsset;
  updateFixedAsset: (id: string, updates: Partial<FixedAsset>) => void;

  // Cross-module (called by Inventory store)
  addInventoryReceiptVoucher: (params: { grnId: string; grnNumber: string; amount: number }) => JournalVoucher;
  addInventoryIssueVoucher: (params: { mrId: string; mrNumber: string; amount: number }) => JournalVoucher;

  // Computed
  getAccountById: (id: string) => Account | undefined;
  getVouchersByPeriod: (periodId: string) => JournalVoucher[];
  getTrialBalance: () => { accountCode: string; accountName: string; openingBalance: number; debitMovement: number; creditMovement: number; closingBalance: number }[];
  getAccountTree: () => Account[];
  getFinancialStats: () => { totalAssets: number; totalLiabilities: number; totalEquity: number; totalRevenue: number; totalExpenses: number; netIncome: number };

  // ── ERP extension: Purchase & Sales ──────────────────────────────────────
  purchaseDocuments: PurchaseDocument[];
  salesDocuments: SalesDocument[];
  buyers: BuyerSeller[];
  buyerSellerGroups: BuyerSellerGroup[];
  visitors: Visitor[];

  // ── ERP extension: Receipts & Payments ───────────────────────────────────
  bankAccountRecords: BankAccountRecord[];
  receiptPaymentDocs: ReceiptPaymentDoc[];
  parentDocuments: ParentDocument[];
  checks: Check[];
  checkbooks: Checkbook[];

  // ── ERP extension: Base info ──────────────────────────────────────────────
  accountGroupKeys: AccountGroupKey[];

  // ── ERP extension: Fiscal year ────────────────────────────────────────────
  fiscalYears: FiscalYear[];
  fiscalYearGroups: FiscalYearGroup[];
  activeFiscalYear: string;
  activeFiscalGroup: string;

  // ── ERP extension: UI state ───────────────────────────────────────────────
  activeSubSystem: 'accounting' | 'receipts_payments' | 'purchase_sales' | 'assets' | 'payroll';
  activePurchaseSalesTab: string;
  activeReceiptsPaymentsTab: string;
  versionNotification: { show: boolean; currentVersion: string; latestVersion: string };

  setActiveSubSystem: (s: FinanceStore['activeSubSystem']) => void;
  setActivePurchaseSalesTab: (t: string) => void;
  setActiveReceiptsPaymentsTab: (t: string) => void;
  dismissVersionNotification: () => void;
  setActiveFiscalYear: (year: string) => void;

  // Purchase documents
  createPurchaseDocument: (partial: Partial<PurchaseDocument>) => PurchaseDocument;
  updatePurchaseDocumentStatus: (id: string, status: DocumentStatus, changedBy: string) => void;
  postPurchaseToGL: (id: string) => JournalVoucher;
  deletePurchaseDocument: (id: string) => void;

  // Sales documents
  createSalesDocument: (partial: Partial<SalesDocument>) => SalesDocument;
  updateSalesDocumentStatus: (id: string, status: DocumentStatus, changedBy: string) => void;
  postSalesToGL: (id: string) => JournalVoucher;
  deleteSalesDocument: (id: string) => void;

  // Buyers/Sellers
  createBuyerSeller: (partial: Partial<BuyerSeller>) => BuyerSeller;
  updateBuyerSeller: (id: string, updates: Partial<BuyerSeller>) => void;
  deleteBuyerSeller: (id: string) => void;
  importBuyerSellerFromAccounting: (accountId: string) => BuyerSeller;

  // Visitors
  createVisitor: (partial: Partial<Visitor>) => Visitor;

  // Bank accounts
  createBankAccountRecord: (partial: Partial<BankAccountRecord>) => BankAccountRecord;
  updateBankAccountRecord: (id: string, updates: Partial<BankAccountRecord>) => void;

  // Account group keys
  createAccountGroupKey: (key: AccountGroupKey) => void;

  // Fiscal year
  closeFiscalYear: (yearId: string) => void;
  finalizeFiscalYear: (yearId: string, newYear: string, openingBalances: Record<string, number>, startDate?: string, endDate?: string) => string;

  // ── Receipts & Payments ───────────────────────────────────────────────────
  createReceiptPaymentDoc: (partial: Partial<ReceiptPaymentDoc>) => ReceiptPaymentDoc;
  postReceiptPaymentToGL: (id: string) => JournalVoucher;
  cancelReceiptPaymentDoc: (id: string, reason: string) => void;
  bounceReceiptPaymentDoc: (id: string, reason: string) => void;

  // Parent documents / settlement
  linkSettlement: (rpDocId: string, parentDocId: string) => void;

  // Checks & checkbooks
  createCheckbook: (partial: Partial<Checkbook>) => Checkbook;
  issueCheck: (checkbookId: string, data: { direction: Check['direction']; payeeName?: string; payerName?: string; amount: number; dueDate: string; notes?: string }) => Check;
  clearCheck: (checkId: string, clearanceDate: string) => void;
  bounceCheck: (checkId: string, reason: string, penaltyAmount: number) => void;
  cancelCheck: (checkId: string, reason: string) => void;
}

function buildAccountTree(accounts: Account[]): Account[] {
  const map = new Map<string, Account>();
  accounts.forEach(a => map.set(a.id, { ...a, children: [] }));
  const roots: Account[] = [];
  accounts.forEach(a => {
    const node = map.get(a.id)!;
    if (a.parentId && map.has(a.parentId)) {
      map.get(a.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

// ── Persistence helpers (BUG-PERSIST-001) ────────────────────────────────────

/**
 * Runs one optimistic mutation through `persistMutation`. In demo mode
 * (VITE_USE_MOCKS=true) only the optimistic change is applied locally — no
 * network call and no failure toasts (`persistMutation`'s `skip` would drop
 * the optimistic write too, hence this wrapper).
 */
function runPersistedMutation<TLocal extends { id: string }, TServer = TLocal>(
  options: PersistMutationOptions<TLocal, TServer>,
): void {
  if (USE_MOCKS) {
    options.optimistic();
    return;
  }
  void persistMutation<TLocal, TServer>(options);
}

/**
 * The treasury API returns `BankAccount` rows while the receipts/payments
 * screens work with ERP `BankAccountRecord` rows — map every field explicitly
 * (never a blind cast) in both directions.
 */
function toBankAccountRecord(bank: BankAccount): BankAccountRecord {
  return {
    id: bank.id,
    code: bank.branchCode || '',
    name: `${bank.bankName || 'حساب بانکی'}${bank.accountNumber ? `-${bank.accountNumber}` : ''}`,
    notes: '',
    bankName: bank.bankName,
    branch: bank.branchName,
    accountNumber: bank.accountNumber,
    iban: bank.iban,
    glAccountId: bank.glAccountId,
    currentBalance: bank.currentBalance,
    // BankAccount allows 'closed' while BankAccountRecord does not.
    status: bank.status === 'inactive' ? 'inactive' : 'active',
  };
}

function toBankAccountPayload(record: BankAccountRecord): Partial<BankAccount> {
  return {
    accountNumber: record.accountNumber,
    iban: record.iban,
    bankName: record.bankName,
    branchName: record.branch,
    branchCode: record.code,
    accountType: 'checking',
    currency: 'IRR',
    glAccountId: record.glAccountId,
    currentBalance: record.currentBalance,
    availableBalance: record.currentBalance,
    blockedAmount: 0,
    reconciliationStatus: 'unreconciled',
    status: record.status,
  };
}

export const useFinanceStore = create<FinanceStore>()(
  persist(
    (set, get) => ({
  // BUG-PERSIST-001: mock data is DEMO-ONLY — in every real build these
  // collections start empty and are hydrated from the backend by loadFromApi.
  accounts: seedFromMock(MOCK_ACCOUNTS),
  vouchers: seedFromMock(MOCK_VOUCHERS),
  fixedAssets: seedFromMock(MOCK_FIXED_ASSETS),
  loading: false,
  activeTab: 'gl',
  selectedAccountId: null,
  // UI preference derived from fiscal data (kept local); fiscalYears /
  // fiscalYearGroups / accountGroupKeys below are user-maintained records and
  // are therefore mock-gated as well.
  periodStatus: { 'PER-1403-04': 'open', 'PER-1403-03': 'closed' },

  purchaseDocuments: seedFromMock(MOCK_PURCHASE_DOCS),
  salesDocuments: seedFromMock(MOCK_SALES_DOCS),
  buyers: seedFromMock(MOCK_BUYERS_SELLERS),
  buyerSellerGroups: seedFromMock(MOCK_BSGROUPS),
  visitors: seedFromMock(MOCK_VISITORS),
  bankAccountRecords: seedFromMock(MOCK_BANK_ACCOUNTS),
  receiptPaymentDocs: seedFromMock(MOCK_RP_DOCS),
  parentDocuments: seedFromMock(MOCK_PARENT_DOCS),
  checks: seedFromMock(MOCK_CHECKS),
  checkbooks: seedFromMock(MOCK_CHECKBOOKS),
  accountGroupKeys: seedFromMock(MOCK_ACCOUNT_GROUP_KEYS),
  fiscalYears: seedFromMock(MOCK_FISCAL_YEARS),
  fiscalYearGroups: seedFromMock(MOCK_FY_GROUPS),
  // UI selection (not a record) — stays a plain default.
  activeFiscalYear: '۱۴۰۳',
  activeFiscalGroup: 'گروه ۱-فکر برتر',
  activeSubSystem: 'accounting',
  activePurchaseSalesTab: 'purchase_documents',
  activeReceiptsPaymentsTab: 'base_info',
  versionNotification: { show: true, currentVersion: '۶٬۴۱۹', latestVersion: '۶٬۴۴۷' },

  setActiveSubSystem: (s) => set({ activeSubSystem: s }),
  setActivePurchaseSalesTab: (t) => set({ activePurchaseSalesTab: t }),
  setActiveReceiptsPaymentsTab: (t) => set({ activeReceiptsPaymentsTab: t }),
  dismissVersionNotification: () => set((s) => ({ versionNotification: { ...s.versionNotification, show: false } })),
  setActiveFiscalYear: (year) => set({ activeFiscalYear: year }),

  // ── API Integration (COMP-004): hydrate collections from the backend ─────
  // BUG-PERSIST-001: the server is the single source of truth. A successful
  // fetch REPLACES the local collection (an empty server list ⇒ empty store),
  // a failed one surfaces a Persian toast — we NEVER fall back to mock data.
  loadFromApi: async () => {
    // Demo mode (VITE_USE_MOCKS=true) is seeded from the mock datasets only.
    if (USE_MOCKS) return;
    set({ loading: true });
    // allSettled: one unreachable endpoint must not hide the other results.
    await Promise.allSettled([
      loadCollection(() => accountApi.list(), (rows) => set({ accounts: rows }), 'خطا در دریافت حساب‌ها'),
      loadCollection(() => voucherApi.list(), (rows) => set({ vouchers: rows }), 'خطا در دریافت اسناد حسابداری'),
      loadCollection(
        () => bankAccountApi.list(),
        (rows) => set({ bankAccountRecords: rows.map(toBankAccountRecord) }),
        'خطا در دریافت حساب‌های بانکی',
      ),
    ]);
    set({ loading: false });
  },

  // ── Purchase documents ────────────────────────────────────────────────────
  createPurchaseDocument: (partial) => {
    const lines = partial.lines || [];
    const totalBeforeDiscount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const totalDiscount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.discount / 100), 0);
    const taxable = totalBeforeDiscount - totalDiscount;
    const totalTax = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.taxRate / 100), 0);
    const grandTotal = taxable + totalTax;
    const doc: PurchaseDocument = {
      id: genId('pd'), documentNumber: String(get().purchaseDocuments.length + 1),
      date: partial.date || new Date().toISOString().slice(0, 10), notes: partial.notes || '',
      itemNumber: String(lines.length), vendorName: partial.vendorName || '', vendorCode: partial.vendorCode || '',
      lineCount: lines.length, preparedBy: partial.preparedBy || 'admin', approvedBy: '', authorizedBy: '',
      status: 'draft', statusChangeDate: '', payableAmount: grandTotal, escrowRequired: partial.escrowRequired || false,
      visitorName: partial.visitorName || '', type: partial.type || 'purchase_invoice', lines,
      projectId: partial.projectId, costCenterId: partial.costCenterId, currencyCode: partial.currencyCode || 'IRR',
      exchangeRate: partial.exchangeRate || 1, totalBeforeDiscount, totalDiscount, totalTax, grandTotal,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    runPersistedMutation<PurchaseDocument>({
      optimistic: () => set((s) => ({ purchaseDocuments: [doc, ...s.purchaseDocuments] })),
      request: () => documentApi.createPurchase(doc),
      rollback: () => set((s) => ({ purchaseDocuments: s.purchaseDocuments.filter((d) => d.id !== doc.id) })),
      reconcile: (server) => set((s) => ({ purchaseDocuments: reconcileEntity(s.purchaseDocuments, doc.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی سند خرید؛ سند ایجاد نشد',
    });
    return doc;
  },
  updatePurchaseDocumentStatus: (id, status, changedBy) => {
    set((s) => ({
      purchaseDocuments: s.purchaseDocuments.map((d) =>
        d.id === id ? { ...d, status, statusChangeDate: new Date().toISOString().slice(0, 10), approvedBy: status === 'approved' ? changedBy : d.approvedBy, authorizedBy: status === 'authorized' ? changedBy : d.authorizedBy } : d
      ),
    }));
  },
  postPurchaseToGL: (id) => {
    const doc = get().purchaseDocuments.find((d) => d.id === id);
    if (!doc) throw new Error('Purchase document not found');
    const inventoryAccount = get().accounts.find((a) => a.code === '1104');
    const vatAccount = get().accounts.find((a) => a.code === '1301');
    const apAccount = get().accounts.find((a) => a.code === '2101');
    const subtotal = doc.totalBeforeDiscount - doc.totalDiscount;
    const voucher = get().createVoucher({
      type: 'general', referenceType: 'purchase_order', referenceId: doc.id,
      description: `خرید کالا — سند ${doc.documentNumber} — ${doc.vendorName || 'بدون نام'}`,
      entries: [
        { id: genId('je'), voucherId: '', accountId: inventoryAccount?.id ?? '', accountCode: inventoryAccount?.code ?? '1104', description: `خرید — سند ${doc.documentNumber}`, debit: subtotal, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: subtotal, creditBaseCurrency: 0, sourceModule: 'manual' },
        { id: genId('je'), voucherId: '', accountId: vatAccount?.id ?? '', accountCode: vatAccount?.code ?? '1301', description: `مالیات خرید — سند ${doc.documentNumber}`, debit: doc.totalTax, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: doc.totalTax, creditBaseCurrency: 0, sourceModule: 'manual' },
        { id: genId('je'), voucherId: '', accountId: apAccount?.id ?? '', accountCode: apAccount?.code ?? '2101', description: `بستانکاری ${doc.vendorName} — سند ${doc.documentNumber}`, debit: 0, credit: doc.grandTotal, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: doc.grandTotal, sourceModule: 'manual' },
      ],
      status: 'draft',
    });
    get().postVoucher(voucher.id);
    set((s) => ({
      purchaseDocuments: s.purchaseDocuments.map((d) => (d.id === id ? { ...d, accountingDocRef: voucher.id, status: 'posted' as const, statusChangeDate: new Date().toISOString().slice(0, 10) } : d)),
    }));
    return voucher;
  },
  deletePurchaseDocument: (id) => {
    set((s) => ({ purchaseDocuments: s.purchaseDocuments.map((d) => (d.id === id ? { ...d, status: 'cancelled' as const } : d)) }));
  },

  // ── Sales documents ───────────────────────────────────────────────────────
  createSalesDocument: (partial) => {
    const lines = partial.lines || [];
    const totalBeforeDiscount = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
    const totalDiscount = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (l.discount / 100), 0);
    const totalTax = lines.reduce((s, l) => s + l.quantity * l.unitPrice * (1 - l.discount / 100) * (l.taxRate / 100), 0);
    const grandTotal = totalBeforeDiscount - totalDiscount + totalTax;
    const doc: SalesDocument = {
      id: genId('sd'), documentNumber: String(get().salesDocuments.length + 1),
      date: partial.date || new Date().toISOString().slice(0, 10), notes: partial.notes || '',
      itemNumber: String(lines.length), buyerName: partial.buyerName || '', buyerCode: partial.buyerCode || '',
      lineCount: lines.length, preparedBy: partial.preparedBy || 'admin', approvedBy: '', authorizedBy: '',
      status: 'draft', statusChangeDate: '', receivableAmount: grandTotal, escrowRequired: partial.escrowRequired || false,
      visitorName: partial.visitorName || '', type: partial.type || 'sales_invoice', lines,
      projectId: partial.projectId, costCenterId: partial.costCenterId, currencyCode: partial.currencyCode || 'IRR',
      exchangeRate: partial.exchangeRate || 1, totalBeforeDiscount, totalDiscount, totalTax, grandTotal,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    runPersistedMutation<SalesDocument>({
      optimistic: () => set((s) => ({ salesDocuments: [doc, ...s.salesDocuments] })),
      request: () => documentApi.createSales(doc),
      rollback: () => set((s) => ({ salesDocuments: s.salesDocuments.filter((d) => d.id !== doc.id) })),
      reconcile: (server) => set((s) => ({ salesDocuments: reconcileEntity(s.salesDocuments, doc.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی سند فروش؛ سند ایجاد نشد',
    });
    return doc;
  },
  updateSalesDocumentStatus: (id, status, changedBy) => {
    set((s) => ({
      salesDocuments: s.salesDocuments.map((d) =>
        d.id === id ? { ...d, status, statusChangeDate: new Date().toISOString().slice(0, 10), approvedBy: status === 'approved' ? changedBy : d.approvedBy, authorizedBy: status === 'authorized' ? changedBy : d.authorizedBy } : d
      ),
    }));
  },
  postSalesToGL: (id) => {
    const doc = get().salesDocuments.find((d) => d.id === id);
    if (!doc) throw new Error('Sales document not found');
    const arAccount = get().accounts.find((a) => a.code === '1201');
    const salesAccount = get().accounts.find((a) => a.code === '4002');
    const vatPayableAccount = get().accounts.find((a) => a.code === '2301');
    const subtotal = doc.totalBeforeDiscount - doc.totalDiscount;
    const voucher = get().createVoucher({
      type: 'general', referenceType: 'invoice', referenceId: doc.id,
      description: `فروش کالا — سند ${doc.documentNumber} — ${doc.buyerName || 'بدون نام'}`,
      entries: [
        { id: genId('je'), voucherId: '', accountId: arAccount?.id ?? '', accountCode: arAccount?.code ?? '1201', description: `بدهکاری ${doc.buyerName} — سند ${doc.documentNumber}`, debit: doc.grandTotal, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: doc.grandTotal, creditBaseCurrency: 0, sourceModule: 'manual' },
        { id: genId('je'), voucherId: '', accountId: salesAccount?.id ?? '', accountCode: salesAccount?.code ?? '4002', description: `درآمد فروش — سند ${doc.documentNumber}`, debit: 0, credit: subtotal, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: subtotal, sourceModule: 'manual' },
        { id: genId('je'), voucherId: '', accountId: vatPayableAccount?.id ?? '', accountCode: vatPayableAccount?.code ?? '2301', description: `مالیات فروش — سند ${doc.documentNumber}`, debit: 0, credit: doc.totalTax, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: doc.totalTax, sourceModule: 'manual' },
      ],
      status: 'draft',
    });
    get().postVoucher(voucher.id);
    set((s) => ({
      salesDocuments: s.salesDocuments.map((d) => (d.id === id ? { ...d, accountingDocRef: voucher.id, status: 'posted' as const, statusChangeDate: new Date().toISOString().slice(0, 10) } : d)),
    }));
    return voucher;
  },
  deleteSalesDocument: (id) => {
    set((s) => ({ salesDocuments: s.salesDocuments.map((d) => (d.id === id ? { ...d, status: 'cancelled' as const } : d)) }));
  },

  // ── Buyers/Sellers ────────────────────────────────────────────────────────
  createBuyerSeller: (partial) => {
    const bs: BuyerSeller = {
      id: genId('bs'), code: partial.code || String(get().buyers.length + 1), name: partial.name || '—', title: partial.title || '',
      type: partial.type || 'buyer', paymentMethod: partial.paymentMethod || 'cash', groupName: partial.groupName || 'خریدار/فروشنده',
      groupId: partial.groupId || 'BSG-001', notes: partial.notes || '', visitorId: partial.visitorId, subAccountId: partial.subAccountId || '',
      transferredFromAccounting: false, taxId: partial.taxId || '', address: partial.address || '', phone: partial.phone || '',
      creditLimit: partial.creditLimit || 0, currentBalance: 0, bankAccounts: partial.bankAccounts || [], status: 'active',
    };
    runPersistedMutation<BuyerSeller>({
      optimistic: () => set((s) => ({ buyers: [bs, ...s.buyers] })),
      request: () => buyerSellerApi.create(bs),
      rollback: () => set((s) => ({ buyers: s.buyers.filter((b) => b.id !== bs.id) })),
      reconcile: (server) => set((s) => ({ buyers: reconcileEntity(s.buyers, bs.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی خریدار/فروشنده؛ رکورد ایجاد نشد',
    });
    return bs;
  },
  updateBuyerSeller: (id, updates) => {
    set((s) => ({ buyers: s.buyers.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
  },
  deleteBuyerSeller: (id) => {
    set((s) => ({ buyers: s.buyers.filter((b) => b.id !== id) }));
  },
  importBuyerSellerFromAccounting: (accountId) => {
    const account = get().accounts.find((a) => a.id === accountId);
    const bs: BuyerSeller = {
      id: genId('bs'), code: account?.code ?? '', name: account?.nameFa ?? '—', title: '', type: 'both', paymentMethod: 'credit',
      groupName: 'خریدار/فروشنده', groupId: 'BSG-001', notes: 'انتقال از حسابداری', subAccountId: accountId,
      transferredFromAccounting: true, taxId: '', address: '', phone: '', creditLimit: 0, currentBalance: account?.currentBalance ?? 0,
      bankAccounts: [], status: 'active',
    };
    runPersistedMutation<BuyerSeller>({
      optimistic: () => set((s) => ({ buyers: [bs, ...s.buyers] })),
      request: () => buyerSellerApi.create(bs),
      rollback: () => set((s) => ({ buyers: s.buyers.filter((b) => b.id !== bs.id) })),
      reconcile: (server) => set((s) => ({ buyers: reconcileEntity(s.buyers, bs.id, server) })),
      messageFa: 'خطا در انتقال خریدار/فروشنده از حسابداری؛ رکورد ذخیره نشد',
    });
    return bs;
  },

  // ── Visitors ──────────────────────────────────────────────────────────────
  createVisitor: (partial) => {
    const v: Visitor = {
      id: genId('vis'), code: partial.code || String(get().visitors.length + 1), name: partial.name || '—', phone: partial.phone || '',
      region: partial.region || '', commissionRate: partial.commissionRate || 0, status: 'active', notes: partial.notes || '',
    };
    runPersistedMutation<Visitor>({
      optimistic: () => set((s) => ({ visitors: [v, ...s.visitors] })),
      request: () => visitorApi.create(v),
      rollback: () => set((s) => ({ visitors: s.visitors.filter((x) => x.id !== v.id) })),
      reconcile: (server) => set((s) => ({ visitors: reconcileEntity(s.visitors, v.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی ویزیتور؛ ویزیتور ایجاد نشد',
    });
    return v;
  },

  // ── Bank accounts ─────────────────────────────────────────────────────────
  createBankAccountRecord: (partial) => {
    const ba: BankAccountRecord = {
      id: genId('ba'), code: partial.code || String(get().bankAccountRecords.length + 1), name: partial.name || '—', notes: partial.notes || '',
      bankName: partial.bankName || '', branch: partial.branch || '', accountNumber: partial.accountNumber || '', iban: partial.iban || '',
      glAccountId: partial.glAccountId || '', currentBalance: 0, status: 'active',
    };
    // The store keeps ERP BankAccountRecord rows while the API speaks treasury
    // BankAccount rows — map the payload (and the response) field by field.
    runPersistedMutation<BankAccountRecord>({
      optimistic: () => set((s) => ({ bankAccountRecords: [ba, ...s.bankAccountRecords] })),
      request: () => bankAccountApi.create(toBankAccountPayload(ba)),
      rollback: () => set((s) => ({ bankAccountRecords: s.bankAccountRecords.filter((b) => b.id !== ba.id) })),
      reconcile: (server) => set((s) => ({ bankAccountRecords: reconcileEntity(s.bankAccountRecords, ba.id, toBankAccountRecord(server)) })),
      messageFa: 'خطا در ذخیره‌سازی حساب بانکی؛ حساب ایجاد نشد',
    });
    return ba;
  },
  updateBankAccountRecord: (id, updates) => {
    set((s) => ({ bankAccountRecords: s.bankAccountRecords.map((b) => (b.id === id ? { ...b, ...updates } : b)) }));
  },

  // ── Account group keys ────────────────────────────────────────────────────
  createAccountGroupKey: (key) => {
    set((s) => ({ accountGroupKeys: [key, ...s.accountGroupKeys] }));
  },

  // ── Fiscal year ───────────────────────────────────────────────────────────
  closeFiscalYear: (yearId) => {
    set((s) => ({ fiscalYears: s.fiscalYears.map((y) => (y.id === yearId ? { ...y, status: 'closed' as const, periods: y.periods.map((p) => ({ ...p, status: 'closed' as const })) } : y)) }));
  },
  finalizeFiscalYear: (yearId, newYear, openingBalances, startDate, endDate) => {
    const newId = `FY-${newYear}`;
    set(s => {
      if (s.fiscalYears.some(y => y.id === newId || y.year === newYear)) throw new Error('سال مالی جدید قبلاً ایجاد شده است.');
      const old = s.fiscalYears.find(y=>y.id===yearId); if (!old) throw new Error('سال مالی یافت نشد.');
      const periods = old.periods.map((p,i)=>({...p,id:`PER-${newYear}-${String(i+1).padStart(2,'0')}`,fiscalYearId:newId,status:'open' as const}));
      const copied = s.accounts.filter(a=>a.fiscalYearId===yearId).map(a=>({...a,id:`${a.id}-${newYear}`,fiscalYearId:newId,parentId:a.parentId?`${a.parentId}-${newYear}`:null,openingBalance:openingBalances[a.id] ?? 0,currentBalance:openingBalances[a.id] ?? 0}));
      return { fiscalYears:[...s.fiscalYears.map(y=>y.id===yearId?{...y,status:'closed' as const,periods:y.periods.map(p=>({...p,status:'closed' as const}))}:y),{id:newId,groupId:old.groupId,year:newYear,startDate:startDate||`${newYear}/01/01`,endDate:endDate||`${newYear}/12/29`,status:'open' as const,periods}], accounts:[...s.accounts,...copied], activeFiscalYear:newYear };
    });
    return newId;
  },

  // ── Receipts & Payments ───────────────────────────────────────────────────
  createReceiptPaymentDoc: (partial) => {
    const parent = partial.parentDocumentId ? get().parentDocuments.find((p) => p.id === partial.parentDocumentId) : undefined;
    const doc: ReceiptPaymentDoc = {
      id: genId('rp'), documentNumber: String(get().receiptPaymentDocs.length + 1),
      docType: partial.docType || 'cash_receipt', date: partial.date || 'امروز',
      type: partial.type || (partial.docType?.includes('payment') ? 'payment' : 'receipt'),
      status: 'draft', statusChangeDate: '', entityId: partial.entityId || '', entityName: partial.entityName || '—',
      entityType: partial.entityType || 'other', instrumentType: partial.instrumentType || 'cash',
      checkNumber: partial.checkNumber, checkDate: partial.checkDate, bankName: partial.bankName,
      bankAccountId: partial.bankAccountId, transactionRef: partial.transactionRef,
      totalAmount: partial.totalAmount || 0, currency: partial.currency || 'IRR', exchangeRate: partial.exchangeRate || 1,
      lines: partial.lines || [], parentDocumentId: partial.parentDocumentId, parentDocNumber: parent?.documentNumber,
      isPartial: !!(parent && partial.totalAmount && partial.totalAmount < parent.remainingAmount),
      remainingAmount: parent ? Math.max(0, parent.remainingAmount - (partial.totalAmount || 0)) : undefined,
      preparedBy: partial.preparedBy || 'admin', notes: partial.notes || '', description: partial.description || '',
      createdAt: new Date().toISOString(),
    };
    runPersistedMutation<ReceiptPaymentDoc>({
      optimistic: () => {
        set((s) => ({ receiptPaymentDocs: [doc, ...s.receiptPaymentDocs] }));
        if (parent) get().linkSettlement(doc.id, parent.id);
      },
      request: () => receiptPaymentDocApi.create(doc),
      rollback: () =>
        set((s) => ({
          receiptPaymentDocs: s.receiptPaymentDocs.filter((d) => d.id !== doc.id),
          // undo the settlement link that was applied optimistically
          parentDocuments: parent
            ? s.parentDocuments.map((p) =>
                p.id === parent.id
                  ? {
                      ...p,
                      settledAmount: parent.settledAmount,
                      remainingAmount: parent.remainingAmount,
                      status: parent.status,
                      childDocumentIds: p.childDocumentIds.filter((cid) => cid !== doc.id),
                    }
                  : p,
              )
            : s.parentDocuments,
        })),
      reconcile: (server) =>
        set((s) => {
          const next: Partial<FinanceStore> = {
            receiptPaymentDocs: reconcileEntity(s.receiptPaymentDocs, doc.id, server),
          };
          if (parent && server.id !== doc.id) {
            // the optimistic settlement link stored the client-generated id —
            // swap in the server id so the linkage survives a reload
            next.parentDocuments = s.parentDocuments.map((p) =>
              p.id === parent.id
                ? { ...p, childDocumentIds: p.childDocumentIds.map((cid) => (cid === doc.id ? server.id : cid)) }
                : p,
            );
          }
          return next;
        }),
      messageFa: 'خطا در ذخیره‌سازی سند دریافت/پرداخت؛ سند ایجاد نشد',
    });
    return doc;
  },

  postReceiptPaymentToGL: (id) => {
    const doc = get().receiptPaymentDocs.find((d) => d.id === id);
    if (!doc) throw new Error('Receipt/payment document not found');
    const isReceipt = doc.type === 'receipt';
    const cashAccount = get().accounts.find((a) => a.code === '1101');
    const bankAccount = get().accounts.find((a) => a.id === doc.bankAccountId) || get().accounts.find((a) => a.code === '1102');
    const arAccount = get().accounts.find((a) => a.code === '1201');
    const apAccount = get().accounts.find((a) => a.code === '2101');
    const checksReceivable = get().accounts.find((a) => a.code === '1202');
    const checksPayable = get().accounts.find((a) => a.code === '2102');

    let debitAccount, creditAccount;
    if (isReceipt) {
      debitAccount = doc.instrumentType === 'check' ? checksReceivable : doc.instrumentType === 'bank_transfer' ? bankAccount : cashAccount;
      creditAccount = arAccount;
    } else {
      debitAccount = apAccount;
      creditAccount = doc.instrumentType === 'check' ? checksPayable : doc.instrumentType === 'bank_transfer' ? bankAccount : cashAccount;
    }

    const voucher = get().createVoucher({
      type: 'general', referenceType: 'payment', referenceId: doc.id,
      description: `${isReceipt ? 'دریافت' : 'پرداخت'} — سند ${doc.documentNumber} — ${doc.entityName}`,
      entries: [
        { id: genId('je'), voucherId: '', accountId: debitAccount?.id ?? '', accountCode: debitAccount?.code ?? '', description: doc.description || doc.documentNumber, debit: doc.totalAmount, credit: 0, currency: doc.currency, exchangeRate: doc.exchangeRate, debitBaseCurrency: doc.totalAmount * doc.exchangeRate, creditBaseCurrency: 0, sourceModule: 'manual' },
        { id: genId('je'), voucherId: '', accountId: creditAccount?.id ?? '', accountCode: creditAccount?.code ?? '', description: doc.description || doc.documentNumber, debit: 0, credit: doc.totalAmount, currency: doc.currency, exchangeRate: doc.exchangeRate, debitBaseCurrency: 0, creditBaseCurrency: doc.totalAmount * doc.exchangeRate, sourceModule: 'manual' },
      ],
      status: 'draft',
    });
    get().postVoucher(voucher.id);

    set((s) => ({
      receiptPaymentDocs: s.receiptPaymentDocs.map((d) => (d.id === id ? { ...d, glVoucherId: voucher.id, status: 'posted' as const, statusChangeDate: new Date().toISOString().slice(0, 10) } : d)),
    }));
    return voucher;
  },

  cancelReceiptPaymentDoc: (id, reason) => {
    set((s) => ({ receiptPaymentDocs: s.receiptPaymentDocs.map((d) => (d.id === id ? { ...d, status: 'cancelled' as const, cancelReason: reason, statusChangeDate: new Date().toISOString().slice(0, 10) } : d)) }));
  },
  bounceReceiptPaymentDoc: (id, reason) => {
    const doc = get().receiptPaymentDocs.find((d) => d.id === id);
    if (!doc) return;
    set((s) => ({ receiptPaymentDocs: s.receiptPaymentDocs.map((d) => (d.id === id ? { ...d, status: 'bounced' as const, bounceReason: reason, statusChangeDate: new Date().toISOString().slice(0, 10) } : d)) }));
    // Reversal voucher, mirroring the original posting
    if (doc.glVoucherId) {
      get().reverseVoucher(doc.glVoucherId, `برگشت سند ${doc.documentNumber}: ${reason}`);
    }
  },

  // ── Parent documents / settlement ─────────────────────────────────────────
  linkSettlement: (rpDocId, parentDocId) => {
    const rpDoc = get().receiptPaymentDocs.find((d) => d.id === rpDocId);
    if (!rpDoc) return;
    set((s) => ({
      parentDocuments: s.parentDocuments.map((p) => {
        if (p.id !== parentDocId) return p;
        const settledAmount = Math.min(p.totalAmount, p.settledAmount + rpDoc.totalAmount);
        const remainingAmount = Math.max(0, p.totalAmount - settledAmount);
        return {
          ...p, settledAmount, remainingAmount, childDocumentIds: [...p.childDocumentIds, rpDocId],
          status: remainingAmount === 0 ? 'fully_applied' as const : 'partially_applied' as const,
        };
      }),
    }));
  },

  // ── Checks & checkbooks ────────────────────────────────────────────────────
  createCheckbook: (partial) => {
    const cb: Checkbook = {
      id: genId('cb'), bookNumber: partial.bookNumber || `چک‌بانک-${String(get().checkbooks.length + 1).padStart(3, '0')}`,
      bankAccountId: partial.bankAccountId || '', bankName: partial.bankName || '', accountNumber: partial.accountNumber || '',
      series: partial.series || '', startNumber: partial.startNumber || '', endNumber: partial.endNumber || '',
      currentNumber: partial.startNumber || '', totalLeaves: partial.totalLeaves || 0, usedLeaves: 0,
      remainingLeaves: partial.totalLeaves || 0, status: 'active', issuedDate: new Date().toISOString().slice(0, 10),
    };
    runPersistedMutation<Checkbook>({
      optimistic: () => set((s) => ({ checkbooks: [cb, ...s.checkbooks] })),
      request: () => checkbookApi.create(cb),
      rollback: () => set((s) => ({ checkbooks: s.checkbooks.filter((c) => c.id !== cb.id) })),
      reconcile: (server) => set((s) => ({ checkbooks: reconcileEntity(s.checkbooks, cb.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی دفترچه چک؛ دفترچه ایجاد نشد',
    });
    return cb;
  },
  issueCheck: (checkbookId, data) => {
    const cb = get().checkbooks.find((c) => c.id === checkbookId);
    if (!cb) throw new Error('Checkbook not found');
    const nextNumber = String(Number(cb.currentNumber) + 1);
    const check: Check = {
      id: genId('chk'), checkNumber: cb.currentNumber, checkbookId, bankAccountId: cb.bankAccountId, bankName: cb.bankName,
      direction: data.direction, payeeName: data.payeeName, payerName: data.payerName, amount: data.amount, currency: 'IRR',
      issueDate: new Date().toISOString().slice(0, 10), dueDate: data.dueDate, status: 'issued', notes: data.notes || '',
      createdBy: 'admin', createdAt: new Date().toISOString(),
    };
    // The optimistic write also consumes the next leaf of the checkbook; the
    // rollback restores the checkbook snapshot taken above.
    runPersistedMutation<Check>({
      optimistic: () =>
        set((s) => ({
          checks: [check, ...s.checks],
          checkbooks: s.checkbooks.map((c) => (c.id === checkbookId ? { ...c, currentNumber: nextNumber, usedLeaves: c.usedLeaves + 1, remainingLeaves: Math.max(0, c.remainingLeaves - 1), status: c.remainingLeaves <= 1 ? 'exhausted' as const : c.status } : c)),
        })),
      request: () => checkApi.create(check),
      rollback: () =>
        set((s) => ({
          checks: s.checks.filter((c) => c.id !== check.id),
          checkbooks: s.checkbooks.map((c) => (c.id === checkbookId ? cb : c)),
        })),
      reconcile: (server) => set((s) => ({ checks: reconcileEntity(s.checks, check.id, server) })),
      messageFa: 'خطا در صدور چک؛ چک صادر نشد',
    });
    return check;
  },
  clearCheck: (checkId, clearanceDate) => {
    const check = get().checks.find((c) => c.id === checkId);
    if (!check) return;
    const bankAccount = get().accounts.find((a) => a.id === check.bankAccountId) || get().accounts.find((a) => a.code === '1102');
    const checksAccount = get().accounts.find((a) => a.code === (check.direction === 'incoming' ? '1202' : '2102'));
    const voucher = get().createVoucher({
      type: 'general', referenceType: 'payment', referenceId: check.id,
      description: `وصول چک شماره ${check.checkNumber}`,
      entries: check.direction === 'incoming'
        ? [
            { id: genId('je'), voucherId: '', accountId: bankAccount?.id ?? '', accountCode: bankAccount?.code ?? '1102', description: `وصول چک ${check.checkNumber}`, debit: check.amount, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: check.amount, creditBaseCurrency: 0, sourceModule: 'manual' },
            { id: genId('je'), voucherId: '', accountId: checksAccount?.id ?? '', accountCode: checksAccount?.code ?? '1202', description: `تسویه اسناد دریافتنی — چک ${check.checkNumber}`, debit: 0, credit: check.amount, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: check.amount, sourceModule: 'manual' },
          ]
        : [
            { id: genId('je'), voucherId: '', accountId: checksAccount?.id ?? '', accountCode: checksAccount?.code ?? '2102', description: `تسویه اسناد پرداختنی — چک ${check.checkNumber}`, debit: check.amount, credit: 0, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: check.amount, creditBaseCurrency: 0, sourceModule: 'manual' },
            { id: genId('je'), voucherId: '', accountId: bankAccount?.id ?? '', accountCode: bankAccount?.code ?? '1102', description: `پرداخت چک ${check.checkNumber}`, debit: 0, credit: check.amount, currency: 'IRR', exchangeRate: 1, debitBaseCurrency: 0, creditBaseCurrency: check.amount, sourceModule: 'manual' },
          ],
      status: 'draft',
    });
    get().postVoucher(voucher.id);
    set((s) => ({ checks: s.checks.map((c) => (c.id === checkId ? { ...c, status: 'cleared' as const, clearanceDate, glVoucherId: voucher.id } : c)) }));
  },
  bounceCheck: (checkId, reason, penaltyAmount) => {
    set((s) => ({ checks: s.checks.map((c) => (c.id === checkId ? { ...c, status: 'bounced' as const, bounceReason: reason, bounceDate: new Date().toISOString().slice(0, 10), bouncePenaltyAmount: penaltyAmount } : c)) }));
  },
  cancelCheck: (checkId, reason) => {
    set((s) => ({ checks: s.checks.map((c) => (c.id === checkId ? { ...c, status: 'cancelled' as const, notes: `${c.notes} | ابطال: ${reason}`.trim() } : c)) }));
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  selectAccount: (id) => set({ selectedAccountId: id }),
  
  createVoucher: (partial) => {
    const targetYear = partial.fiscalYearId || get().fiscalYears.find(y => y.year === get().activeFiscalYear)?.id || 'FY-1403';
    if (get().fiscalYears.find(y => y.id === targetYear)?.status === 'closed') throw new Error('دوره مالی بسته شده است. امکان ثبت سند وجود ندارد.');
    const entries = partial.entries || [];
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    const newVoucher: JournalVoucher = {
      id: genId('JV'),
      voucherNumber: `JV-${get().fiscalYears.find(y => y.id === targetYear)?.year || '1403'}-${String(get().vouchers.filter(v => v.fiscalYearId === targetYear).length + 1).padStart(6, '0')}`, 
      date: new Date().toISOString(),
      fiscalYearId: targetYear,
      periodId: 'PER-1403-04',
      type: 'general',
      referenceType: 'manual',
      referenceId: '',
      description: '',
      entries,
      status: 'draft',
      preparedBy: 'admin',
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      postedBy: '',
      ...partial,
    };
    runPersistedMutation<JournalVoucher>({
      optimistic: () => set(state => ({ vouchers: [newVoucher, ...state.vouchers] })),
      request: () => voucherApi.create(partial),
      rollback: () => set(state => ({ vouchers: state.vouchers.filter(v => v.id !== newVoucher.id) })),
      reconcile: (server) => set(state => ({ vouchers: reconcileEntity(state.vouchers, newVoucher.id, server) })),
      messageFa: 'خطا در ذخیره‌سازی سند حسابداری؛ سند ایجاد نشد',
    });
    return newVoucher;
  },
  
  postVoucher: (id) => {
    const voucher = get().vouchers.find(v => v.id === id);
    if (!voucher) return;
    if (!voucher.isBalanced) throw new Error('سند حسابداری تراز نیست. امکان ثبت سند وجود ندارد.');
    if (get().fiscalYears.find(y => y.id === voucher.fiscalYearId)?.status === 'closed') throw new Error('دوره مالی بسته شده است. امکان ثبت سند وجود ندارد.');
    runPersistedMutation<JournalVoucher>({
      optimistic: () => set(state => ({ vouchers: state.vouchers.map(v => v.id === id ? { ...v, status: 'posted' as const, postedAt: new Date().toISOString(), postedBy: 'admin' } : v) })),
      request: () => voucherApi.post(id),
      rollback: () => set(state => ({ vouchers: state.vouchers.map(v => v.id === id ? { ...v, status: voucher.status, postedAt: voucher.postedAt, postedBy: voucher.postedBy } : v) })),
      reconcile: (server) => set(state => ({ vouchers: reconcileEntity(state.vouchers, id, server) })),
      messageFa: 'خطا در ثبت سند حسابداری؛ سند ثبت نشد',
    });
  },
  
  reverseVoucher: (id, reason) => {
    const original = get().vouchers.find(v => v.id === id);
    if (!original) return;
    // Optimistic build: a locally-posted reversing entry mirroring the original.
    const reversalId = genId('JV');
    const nowIso = new Date().toISOString();
    const year = get().fiscalYears.find(y => y.id === original.fiscalYearId)?.year || '1403';
    const seq = String(get().vouchers.filter(v => v.fiscalYearId === original.fiscalYearId).length + 1).padStart(6, '0');
    const reversalEntries = original.entries.map(e => ({ ...e, voucherId: reversalId, debit: e.credit, credit: e.debit }));
    const totalDebit = reversalEntries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = reversalEntries.reduce((s, e) => s + e.credit, 0);
    const reversal: JournalVoucher = {
      id: reversalId,
      voucherNumber: `JV-${year}-${seq}`,
      date: nowIso,
      fiscalYearId: original.fiscalYearId,
      periodId: original.periodId,
      type: 'reversing',
      referenceType: 'manual',
      referenceId: '',
      description: `واگردانی سند ${original.voucherNumber}: ${reason}`,
      entries: reversalEntries,
      status: 'posted',
      preparedBy: 'admin',
      totalDebit,
      totalCredit,
      isBalanced: totalDebit === totalCredit,
      attachments: [],
      createdAt: nowIso,
      updatedAt: nowIso,
      postedAt: nowIso,
      postedBy: 'admin',
      reversalOf: id,
      reversalReason: reason,
    };
    runPersistedMutation<JournalVoucher>({
      optimistic: () => set(state => ({
        vouchers: [reversal, ...state.vouchers.map(v => v.id === id ? { ...v, status: 'reversed' as const } : v)],
      })),
      request: () => voucherApi.reverse(id, reason),
      rollback: () => set(state => ({
        vouchers: state.vouchers
          .filter(v => v.id !== reversalId)
          .map(v => v.id === id ? { ...v, status: original.status } : v),
      })),
      reconcile: (server) => set(state => {
        // The endpoint may answer with the reversed voucher (same id) or with
        // the server-created reversal voucher — handle both; the server id
        // always wins over the locally generated one.
        if (server.id === id) {
          return { vouchers: reconcileEntity(state.vouchers, id, server) };
        }
        return {
          vouchers: reconcileEntity(state.vouchers, reversalId, server).map(v =>
            v.id === id ? { ...v, status: 'reversed' as const } : v
          ),
        };
      }),
      messageFa: 'خطا در واگردانی سند حسابداری؛ سند واگردانی نشد',
    });
  },

  // ── Cross-module: called from HR's "Run Payroll" action ──────────────────
  addPayrollVoucher: ({ batchId, totalNetPay, totalGross = totalNetPay, totalInsurance = 0, totalTax = 0, totalOtherDeductions = 0, month }) => {
    const accounts = get().accounts;
    const by = (pattern: RegExp, fallback: string) => accounts.find(a => pattern.test(`${a.code} ${a.nameFa}`)) || accounts.find(a=>a.code===fallback);
    const salaryExpense = by(/حقوق|5001/, '5001'); const employerInsurance = by(/بیمه.*کارفرما/, '5001') || salaryExpense;
    const insurancePayable = by(/بیمه.*پرداختنی|210/, '2101'); const taxPayable = by(/مالیات.*پرداختنی|2301/, '2301');
    const salaryPayable = by(/حقوق.*پرداختنی|2101/, '2101'); const employerShare = Math.round(totalGross * .23);
    const mk=(account:any,debit:number,credit:number,description:string)=>({id:genId('JE'),voucherId:'',accountId:account?.id||'',accountCode:account?.code||'',description,debit,credit,currency:'IRR' as const,exchangeRate:1,debitBaseCurrency:debit,creditBaseCurrency:credit,sourceModule:'payroll' as const});
    return get().createVoucher({description:`ثبت هزینه حقوق و دستمزد - ${month} (دسته حقوق ${batchId})`,referenceType:'payroll',referenceId:batchId,entries:[mk(salaryExpense,totalGross,0,`هزینه حقوق ${month}`),mk(employerInsurance,employerShare,0,`بیمه کارفرما ${month}`),mk(insurancePayable,0,totalInsurance+employerShare,`بیمه پرداختنی ${month}`),mk(taxPayable,0,totalTax,`مالیات پرداختنی ${month}`),...(totalOtherDeductions ? [mk(salaryPayable,0,totalOtherDeductions,`سایر کسورات پرداختنی ${month}`)] : []),mk(salaryPayable,0,totalNetPay,`حقوق پرداختنی ${month}`)],status:'draft'});
  },

  // ── Cross-module: called from HR's Asset Custody assign/return actions ───
  setAssetCustodian: (assetCode, employeeId, employeeName) => {
    set(state => ({
      fixedAssets: state.fixedAssets.map(a =>
        a.assetCode === assetCode
          ? { ...a, custodianEmployeeId: employeeId, custodianName: employeeName, assignedAt: new Date().toISOString() }
          : a
      ),
    }));
  },
  clearAssetCustodian: (assetCode) => {
    set(state => ({
      fixedAssets: state.fixedAssets.map(a =>
        a.assetCode === assetCode
          ? { ...a, custodianEmployeeId: undefined, custodianName: undefined, assignedAt: undefined }
          : a
      ),
    }));
  },
  getFixedAssetByCode: (assetCode) => get().fixedAssets.find(a => a.assetCode === assetCode),
  createFixedAsset: (partial) => {
    const cost = partial.totalCapitalizedCost ?? (partial.acquisitionCost ?? 0) + (partial.additionalCosts ?? 0);
    const asset: FixedAsset = { id: genId('FA'), assetCode: partial.assetCode || `FA-${get().activeFiscalYear}-${String(get().fixedAssets.length+1).padStart(3,'0')}`, name: partial.name || 'دارایی جدید', category: partial.category || 'it_equipment', companyId: partial.companyId || 'C-001', location: partial.location || '', acquisitionDate: partial.acquisitionDate || '', acquisitionCost: partial.acquisitionCost || 0, additionalCosts: partial.additionalCosts || 0, totalCapitalizedCost: cost, depreciationMethod: partial.depreciationMethod || 'straight_line', usefulLifeYears: partial.usefulLifeYears || 1, salvageValue: partial.salvageValue || 0, depreciationStartDate: partial.depreciationStartDate || partial.acquisitionDate || '', accumulatedDepreciation: 0, netBookValue: cost, status: 'active', maintenanceRecords: [], depreciationVoucherIds: [], createdAt: new Date().toISOString(), ...partial };
    runPersistedMutation<FixedAsset>({
      optimistic: () => set(s=>({fixedAssets:[asset,...s.fixedAssets]})),
      request: () => fixedAssetApi.create(asset),
      rollback: () => set(s=>({fixedAssets:s.fixedAssets.filter(a=>a.id!==asset.id)})),
      reconcile: (server) => set(s=>({fixedAssets:reconcileEntity(s.fixedAssets, asset.id, server)})),
      messageFa: 'خطا در ذخیره‌سازی دارایی؛ دارایی ایجاد نشد',
    });
    return asset;
  },
  updateFixedAsset: (id, updates) => {
    const previous = get().fixedAssets.find(a => a.id === id);
    runPersistedMutation<FixedAsset>({
      optimistic: () => set(s=>({fixedAssets:s.fixedAssets.map(a=>a.id===id?{...a,...updates}:a)})),
      request: () => fixedAssetApi.update(id, updates),
      rollback: () => set(s=>({fixedAssets:previous?s.fixedAssets.map(a=>a.id===id?previous:a):s.fixedAssets})),
      reconcile: (server) => set(s=>({fixedAssets:reconcileEntity(s.fixedAssets, id, server)})),
      messageFa: 'خطا در به‌روزرسانی دارایی؛ تغییرات ذخیره نشد',
    });
  }, 

  // ── Cross-module: called when a GRN is accepted in Inventory ─────────────
  addInventoryReceiptVoucher: ({ grnId, grnNumber, amount }) => {
    const inventoryAccount = get().accounts.find(a => a.code === '1104');
    const apAccount = get().accounts.find(a => a.code === '2101');
    return get().createVoucher({
      description: `دریافت کالا و ثبت در موجودی - رسید ${grnNumber}`,
      referenceType: 'inventory', referenceId: grnId,
      entries: [
        {
          id: genId('JE'), voucherId: '', accountId: inventoryAccount?.id ?? '', accountCode: inventoryAccount?.code ?? '1104',
          description: `افزایش موجودی - ${grnNumber}`, debit: amount, credit: 0, currency: 'IRR', exchangeRate: 1,
          debitBaseCurrency: amount, creditBaseCurrency: 0, sourceModule: 'inventory',
        },
        {
          id: genId('JE'), voucherId: '', accountId: apAccount?.id ?? '', accountCode: apAccount?.code ?? '2101',
          description: `بستانکاری تأمین‌کننده - ${grnNumber}`, debit: 0, credit: amount, currency: 'IRR', exchangeRate: 1,
          debitBaseCurrency: 0, creditBaseCurrency: amount, sourceModule: 'inventory',
        },
      ],
      status: 'draft',
    });
  },

  // ── Cross-module: called when a requisition is issued in Inventory ───────
  addInventoryIssueVoucher: ({ mrId, mrNumber, amount }) => {
    const cogsAccount = get().accounts.find(a => a.code === '5003');
    const inventoryAccount = get().accounts.find(a => a.code === '1104');
    return get().createVoucher({
      description: `صدور کالا از انبار - درخواست ${mrNumber}`,
      referenceType: 'inventory', referenceId: mrId,
      entries: [
        {
          id: genId('JE'), voucherId: '', accountId: cogsAccount?.id ?? '', accountCode: cogsAccount?.code ?? '5003',
          description: `بهای کالای مصرفی - ${mrNumber}`, debit: amount, credit: 0, currency: 'IRR', exchangeRate: 1,
          debitBaseCurrency: amount, creditBaseCurrency: 0, sourceModule: 'inventory',
        },
        {
          id: genId('JE'), voucherId: '', accountId: inventoryAccount?.id ?? '', accountCode: inventoryAccount?.code ?? '1104',
          description: `کاهش موجودی - ${mrNumber}`, debit: 0, credit: amount, currency: 'IRR', exchangeRate: 1,
          debitBaseCurrency: 0, creditBaseCurrency: amount, sourceModule: 'inventory',
        },
      ],
      status: 'draft',
    });
  },
  
  getAccountById: (id) => get().accounts.find(a => a.id === id),
  
  getVouchersByPeriod: (periodId) => get().vouchers.filter(v => v.periodId === periodId),
  
  getTrialBalance: () => {
    const accounts = get().accounts;
    return accounts.map(a => {
      const vouchers = get().vouchers.filter(v => v.status === 'posted');
      let debitMovement = 0;
      let creditMovement = 0;
      vouchers.forEach(v => v.entries.forEach(e => {
        if (e.accountId === a.id) {
          debitMovement += e.debit;
          creditMovement += e.credit;
        }
      }));
      return {
        accountCode: a.code,
        accountName: a.nameFa,
        openingBalance: a.openingBalance,
        debitMovement,
        creditMovement,
        closingBalance: a.openingBalance + debitMovement - creditMovement,
      };
    });
  },
  
  getAccountTree: () => buildAccountTree(get().accounts),
  
  getFinancialStats: () => {
    const accounts = get().accounts;
    const totalAssets = accounts.filter(a => a.type === 'asset').reduce((s, a) => s + a.currentBalance, 0);
    const totalLiabilities = accounts.filter(a => a.type === 'liability').reduce((s, a) => s + a.currentBalance, 0);
    const totalEquity = accounts.filter(a => a.type === 'equity').reduce((s, a) => s + a.currentBalance, 0);
    const totalRevenue = accounts.filter(a => a.type === 'revenue').reduce((s, a) => s + a.currentBalance, 0);
    const totalExpenses = accounts.filter(a => a.type === 'expense').reduce((s, a) => s + a.currentBalance, 0);
    return { totalAssets, totalLiabilities, totalEquity, totalRevenue, totalExpenses, netIncome: totalRevenue - totalExpenses };
  },
    }),
    {
      name: 'finance-store',
      storage: createJSONStorage(() => zustandLocalStorage),
      partialize: (state) => ({
        // BUG-PERSIST-001: only UI preferences are frozen into localStorage.
        // Entity collections live on the server (hydrated by loadFromApi);
        // demo arrays exist only when VITE_USE_MOCKS=true.
        activeTab: state.activeTab,
        selectedAccountId: state.selectedAccountId,
        periodStatus: state.periodStatus,
        activeFiscalYear: state.activeFiscalYear,
        activeFiscalGroup: state.activeFiscalGroup,
        versionNotification: state.versionNotification,
      }),
      // Old builds froze the mock arrays into localStorage — make sure those
      // stale entity snapshots can never hydrate over the live (empty) state.
      merge: (persistedState, currentState) => {
        const persisted = (persistedState ?? {}) as Partial<FinanceStore>;
        return {
          ...currentState,
          activeTab: persisted.activeTab ?? currentState.activeTab,
          selectedAccountId: persisted.selectedAccountId ?? currentState.selectedAccountId,
          periodStatus: persisted.periodStatus ?? currentState.periodStatus,
          activeFiscalYear: persisted.activeFiscalYear ?? currentState.activeFiscalYear,
          activeFiscalGroup: persisted.activeFiscalGroup ?? currentState.activeFiscalGroup,
          versionNotification: persisted.versionNotification ?? currentState.versionNotification,
        };
      },
    }
  )
);
