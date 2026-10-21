import type {
  FinancialDocument, Payment, ChartOfAccount, GeneralLedgerEntry,
  TrialBalanceRow, FinancialPeriod, AuditEntry, FinNotification,
  AgingReportRow, FinancialSummary, CashFlowRow, CompanyInfo,
} from "./types";

export const CURRENT_COMPANY: CompanyInfo = {
  id: "C001",
  nameFa: "شرکت پلاستیک ایران",
  unit: "بلوک A، واحد ۱۲",
  regNo: "۱۰۲۴۵۶",
  economicCode: "۱۴۰۱۰۲۴۵۶",
  nationalId: "۰۱۰۲۳۴۵۶۷۸۹",
  postalCode: "۱۳۳۵۶۱۷۸۹۰",
  address: "شهرک صنعتی کاوه، بلوک A، واحد ۱۲",
  phone: "۰۲۱-۵۶۷۸۹۰۱۲",
};

export const INVOICES: FinancialDocument[] = [
  { id: "INV-001", docType: "invoice", docNumber: "INV-1403-001", title: "عوارض خدمات ماهانه - تیر ۱۴۰۳", description: "عوارض خدمات نگهداری و بهره‌برداری از زیرساخت‌های شهرک صنعتی", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 42000000, currency: "IRR", vatRate: 9, vatAmount: 3780000, totalAmount: 45780000, issueDate: "۱۴۰۳/۰۴/۰۱", dueDate: "۱۴۰۳/۰۴/۳۱", paidDate: "۱۴۰۳/۰۴/۲۸", status: "paid", category: "عوارض ماهانه", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۴/۰۱ ۰۹:۳۰", isRecurring: true, recurringPeriod: "monthly", attachments: [{ id: "ATT-001", fileName: "invoice-1403-001.pdf", fileType: "application/pdf", fileSize: 245000, uploadedAt: "۱۴۰۳/۰۴/۰۱", uploadedBy: "مدیریت شهرک", isReceipt: false }], lineItems: [{ id: "LI-001", description: "هزینه نگهداری زیرساخت", quantity: 1, unitPrice: 25000000, discount: 0, taxRate: 9, total: 27250000, accountCode: "401001" }, { id: "LI-002", description: "هزینه امنیت و حراست", quantity: 1, unitPrice: 12000000, discount: 0, taxRate: 9, total: 13080000, accountCode: "401002" }, { id: "LI-003", description: "هزینه خدمات شهری", quantity: 1, unitPrice: 5000000, discount: 0, taxRate: 9, total: 5450000, accountCode: "401003" }], relatedDocId: null, targetType: "single" },
  { id: "INV-002", docType: "invoice", docNumber: "INV-1403-002", title: "عوارض خدمات ماهانه - مرداد ۱۴۰۳", description: "عوارض خدمات نگهداری و بهره‌برداری از زیرساخت‌های شهرک صنعتی", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 42000000, currency: "IRR", vatRate: 9, vatAmount: 3780000, totalAmount: 45780000, issueDate: "۱۴۰۳/۰۵/۰۱", dueDate: "۱۴۰۳/۰۵/۳۱", paidDate: null, status: "pending", category: "عوارض ماهانه", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۵/۰۱ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۵/۰۱ ۰۹:۳۰", isRecurring: true, recurringPeriod: "monthly", attachments: [], lineItems: [{ id: "LI-004", description: "هزینه نگهداری زیرساخت", quantity: 1, unitPrice: 25000000, discount: 0, taxRate: 9, total: 27250000, accountCode: "401001" }, { id: "LI-005", description: "هزینه امنیت و حراست", quantity: 1, unitPrice: 12000000, discount: 0, taxRate: 9, total: 13080000, accountCode: "401002" }, { id: "LI-006", description: "هزینه خدمات شهری", quantity: 1, unitPrice: 5000000, discount: 0, taxRate: 9, total: 5450000, accountCode: "401003" }], relatedDocId: null, targetType: "single" },
  { id: "INV-003", docType: "invoice", docNumber: "INV-1403-003", title: "جریمه تأخیر - تیر ۱۴۰۳", description: "جریمه تأخیر در پرداخت عوارض ماهانه خرداد ۱۴۰۳", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 2100000, currency: "IRR", vatRate: 9, vatAmount: 189000, totalAmount: 2289000, issueDate: "۱۴۰۳/۰۴/۱۰", dueDate: "۱۴۰۳/۰۴/۲۵", paidDate: null, status: "overdue", category: "جریمه", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۱۰ ۱۰:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۴/۱۰ ۱۰:۳۰", isRecurring: false, recurringPeriod: null, attachments: [], lineItems: [{ id: "LI-007", description: "جریمه دیرکرد پرداخت", quantity: 1, unitPrice: 2100000, discount: 0, taxRate: 9, total: 2289000, accountCode: "402001" }], relatedDocId: "INV-1403-001", targetType: "single" },
  { id: "INV-004", docType: "invoice", docNumber: "INV-1403-004", title: "هزینه اشتراک زیرساخت - شش ماهه دوم", description: "حق اشتراک استفاده از زیرساخت‌های ارتباطی و فناوری شهرک", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 84000000, currency: "IRR", vatRate: 9, vatAmount: 7560000, totalAmount: 91560000, issueDate: "۱۴۰۳/۰۴/۰۱", dueDate: "۱۴۰۳/۰۵/۱۵", paidDate: null, status: "pending", category: "اشتراک", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۴/۰۱ ۰۹:۰۰", isRecurring: true, recurringPeriod: "quarterly", attachments: [], lineItems: [{ id: "LI-008", description: "اشتراک فیبر نوری", quantity: 6, unitPrice: 8000000, discount: 0, taxRate: 9, total: 52320000, accountCode: "403001" }, { id: "LI-009", description: "اشتراک اینترنت", quantity: 6, unitPrice: 4000000, discount: 0, taxRate: 9, total: 26160000, accountCode: "403002" }, { id: "LI-010", description: "اشتراک سامانه امنیت", quantity: 6, unitPrice: 2000000, discount: 0, taxRate: 9, total: 13080000, accountCode: "403003" }], relatedDocId: null, targetType: "single" },
  { id: "INV-005", docType: "invoice", docNumber: "INV-1403-005", title: "هزینه مصرف آب و برق - تیر ۱۴۰۳", description: "صورتحساب مصرف آب و برق واحد صنعتی", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 18500000, currency: "IRR", vatRate: 9, vatAmount: 1665000, totalAmount: 20165000, issueDate: "۱۴۰۳/۰۴/۳۱", dueDate: "۱۴۰۳/۰۵/۱۵", paidDate: null, status: "pending", category: "مصرف انرژی", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۳۱ ۱۲:۰۰", approvedBy: null, approvedAt: null, isRecurring: true, recurringPeriod: "monthly", attachments: [], lineItems: [{ id: "LI-011", description: "مصرف برق (۱۲,۵۰۰ کیلووات)", quantity: 12500, unitPrice: 1000, discount: 0, taxRate: 9, total: 13625000, accountCode: "404001" }, { id: "LI-012", description: "مصرف آب (۲۵۰ مترمکعب)", quantity: 250, unitPrice: 18000, discount: 0, taxRate: 9, total: 4905000, accountCode: "404002" }], relatedDocId: null, targetType: "single" },
  { id: "INV-006", docType: "invoice", docNumber: "INV-1403-006", title: "اجاره فضای تبلیغاتی - سردرب ورودی", description: "اجاره بیلبورد تبلیغاتی سردرب اصلی شهرک", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 8000000, currency: "IRR", vatRate: 9, vatAmount: 720000, totalAmount: 8720000, issueDate: "۱۴۰۳/۰۳/۲۸", dueDate: "۱۴۰۳/۰۴/۱۵", paidDate: null, status: "overdue", category: "اجاره", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۳/۲۸ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۳/۲۸ ۰۹:۰۰", isRecurring: false, recurringPeriod: null, attachments: [], lineItems: [{ id: "LI-013", description: "اجاره بیلبورد سردرب اصلی (ماهیانه)", quantity: 1, unitPrice: 8000000, discount: 0, taxRate: 9, total: 8720000, accountCode: "405001" }], relatedDocId: null, targetType: "single" },
];

export const STATEMENTS: FinancialDocument[] = [
  { id: "STMT-001", docType: "statement", docNumber: "STM-1403-Q2", title: "صورتحساب دوره‌ای - سه ماهه دوم ۱۴۰۳", description: "خلاصه صورت‌حساب کلیه دریافتی‌ها و بدهی‌های دوره", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 156780000, currency: "IRR", vatRate: 9, vatAmount: 14110200, totalAmount: 170890200, issueDate: "۱۴۰۳/۰۴/۰۱", dueDate: "۱۴۰۳/۰۴/۳۱", paidDate: "۱۴۰۳/۰۴/۲۵", status: "paid", category: "دوره‌ای", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۴/۰۱ ۰۹:۰۰", isRecurring: true, recurringPeriod: "quarterly", attachments: [], lineItems: [{ id: "LI-101", description: "مجموع عوارض سه ماهه", quantity: 1, unitPrice: 126000000, discount: 0, taxRate: 9, total: 137340000, accountCode: "401001" }, { id: "LI-102", description: "مجموع هزینه انرژی", quantity: 1, unitPrice: 30780000, discount: 0, taxRate: 9, total: 33550200, accountCode: "404001" }], relatedDocId: null, targetType: "single" },
  { id: "STMT-002", docType: "statement", docNumber: "STM-1403-Q3", title: "صورتحساب دوره‌ای - سه ماهه سوم ۱۴۰۳", description: "خلاصه صورت‌حساب کلیه دریافتی‌ها و بدهی‌های دوره", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 168000000, currency: "IRR", vatRate: 9, vatAmount: 15120000, totalAmount: 183120000, issueDate: "۱۴۰۳/۰۷/۰۱", dueDate: "۱۴۰۳/۰۷/۳۱", paidDate: null, status: "pending", category: "دوره‌ای", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۷/۰۱ ۰۸:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۷/۰۱ ۰۹:۰۰", isRecurring: true, recurringPeriod: "quarterly", attachments: [], lineItems: [], relatedDocId: null, targetType: "single" },
];

export const BILLS: FinancialDocument[] = [
  { id: "BILL-001", docType: "bill", docNumber: "BL-1403-001", title: "قبوض مصرفی - تیر ۱۴۰۳", description: "قبوض آب، برق و گاز واحد صنعتی", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 12300000, currency: "IRR", vatRate: 9, vatAmount: 1107000, totalAmount: 13407000, issueDate: "۱۴۰۳/۰۴/۱۵", dueDate: "۱۴۰۳/۰۴/۳۰", paidDate: "۱۴۰۳/۰۴/۲۸", status: "paid", category: "مصرف انرژی", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۴/۱۵ ۱۰:۰۰", approvedBy: "احمد کریمی", approvedAt: "۱۴۰۳/۰۴/۱۵ ۱۰:۳۰", isRecurring: false, recurringPeriod: null, attachments: [], lineItems: [{ id: "LI-201", description: "قبض برق", quantity: 1, unitPrice: 7800000, discount: 0, taxRate: 9, total: 8502000, accountCode: "404001" }, { id: "LI-202", description: "قبض آب", quantity: 1, unitPrice: 2500000, discount: 0, taxRate: 9, total: 2725000, accountCode: "404002" }, { id: "LI-203", description: "قبض گاز", quantity: 1, unitPrice: 2000000, discount: 0, taxRate: 9, total: 2180000, accountCode: "404003" }], relatedDocId: null, targetType: "single" },
  { id: "BILL-002", docType: "bill", docNumber: "BL-1403-002", title: "قبوض مصرفی - مرداد ۱۴۰۳", description: "قبوض آب، برق و گاز واحد صنعتی", companyId: "C001", companyName: "شرکت پلاستیک ایران", amount: 13800000, currency: "IRR", vatRate: 9, vatAmount: 1242000, totalAmount: 15042000, issueDate: "۱۴۰۳/۰۵/۱۵", dueDate: "۱۴۰۳/۰۵/۳۱", paidDate: null, status: "pending", category: "مصرف انرژی", createdBy: "مدیریت شهرک", createdAt: "۱۴۰۳/۰۵/۱۵ ۱۰:۰۰", approvedBy: null, approvedAt: null, isRecurring: false, recurringPeriod: null, attachments: [], lineItems: [], relatedDocId: null, targetType: "single" },
];

export const ALL_DOCUMENTS = [...INVOICES, ...STATEMENTS, ...BILLS];

export const PAYMENTS: Payment[] = [
  { id: "PAY-001", documentId: "INV-001", amount: 45780000, currency: "IRR", method: "manual", referenceNumber: "REF-1403-001", transactionId: null, paidAt: "۱۴۰۳/۰۴/۲۸ ۱۴:۳۰", paidBy: "علیرضا صادقی", verifiedBy: "احمد کریمی", verifiedAt: "۱۴۰۳/۰۴/۲۹ ۱۰:۰۰", status: "verified", receiptUrl: null, gatewayResponse: null, notes: "فیش واریزی به حساب شهرک" },
  { id: "PAY-002", documentId: "STMT-001", amount: 170890200, currency: "IRR", method: "mellat", referenceNumber: "ONL-1403-002", transactionId: "TRX-98234", paidAt: "۱۴۰۳/۰۴/۲۵ ۱۱:۱۵", paidBy: "علیرضا صادقی", verifiedBy: null, verifiedAt: null, status: "pending_verification", receiptUrl: null, gatewayResponse: '{"status":"success","refId":"98234","cardPan":"6219****1234"}', notes: "پرداخت آنلاین از طریق درگاه ملت" },
  { id: "PAY-003", documentId: "BILL-001", amount: 13407000, currency: "IRR", method: "manual", referenceNumber: "REF-1403-003", transactionId: null, paidAt: "۱۴۰۳/۰۴/۲۸ ۰۹:۰۰", paidBy: "علیرضا صادقی", verifiedBy: "احمد کریمی", verifiedAt: "۱۴۰۳/۰۴/۲۹ ۱۰:۰۰", status: "verified", receiptUrl: null, gatewayResponse: null, notes: "فیش واریزی بانک ملی" },
];

export const CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  { code: "1", title: "دارایی‌ها", type: "asset", nature: "debtor", level: 0, parentCode: null, isActive: true, balance: 0, currency: "IRR" },
  { code: "1-001", title: "دارایی‌های جاری", type: "asset", nature: "debtor", level: 1, parentCode: "1", isActive: true, balance: 0, currency: "IRR" },
  { code: "1-001-001", title: "صندوق", type: "asset", nature: "debtor", level: 2, parentCode: "1-001", isActive: true, balance: 125000000, currency: "IRR" },
  { code: "1-001-002", title: "بانک - ملت", type: "asset", nature: "debtor", level: 2, parentCode: "1-001", isActive: true, balance: 890000000, currency: "IRR" },
  { code: "1-001-003", title: "بانک - ملی", type: "asset", nature: "debtor", level: 2, parentCode: "1-001", isActive: true, balance: 450000000, currency: "IRR" },
  { code: "1-001-004", title: "حساب‌های دریافتنی تجاری", type: "asset", nature: "debtor", level: 2, parentCode: "1-001", isActive: true, balance: 183120000, currency: "IRR" },
  { code: "1-002", title: "دارایی‌های ثابت", type: "asset", nature: "debtor", level: 1, parentCode: "1", isActive: true, balance: 0, currency: "IRR" },
  { code: "1-002-001", title: "زمین", type: "asset", nature: "debtor", level: 2, parentCode: "1-002", isActive: true, balance: 2000000000, currency: "IRR" },
  { code: "1-002-002", title: "ساختمان", type: "asset", nature: "debtor", level: 2, parentCode: "1-002", isActive: true, balance: 3500000000, currency: "IRR" },
  { code: "1-002-003", title: "ماشین‌آلات و تجهیزات", type: "asset", nature: "debtor", level: 2, parentCode: "1-002", isActive: true, balance: 1500000000, currency: "IRR" },
  { code: "2", title: "بدهی‌ها", type: "liability", nature: "creditor", level: 0, parentCode: null, isActive: true, balance: 0, currency: "IRR" },
  { code: "2-001", title: "بدهی‌های جاری", type: "liability", nature: "creditor", level: 1, parentCode: "2", isActive: true, balance: 0, currency: "IRR" },
  { code: "2-001-001", title: "حساب‌های پرداختنی تجاری", type: "liability", nature: "creditor", level: 2, parentCode: "2-001", isActive: true, balance: 285000000, currency: "IRR" },
  { code: "2-001-002", title: "مالیات پرداختنی", type: "liability", nature: "creditor", level: 2, parentCode: "2-001", isActive: true, balance: 89000000, currency: "IRR" },
  { code: "2-002", title: "بدهی‌های بلندمدت", type: "liability", nature: "creditor", level: 1, parentCode: "2", isActive: true, balance: 0, currency: "IRR" },
  { code: "2-002-001", title: "تسهیلات بانکی بلندمدت", type: "liability", nature: "creditor", level: 2, parentCode: "2-002", isActive: true, balance: 500000000, currency: "IRR" },
  { code: "3", title: "حقوق صاحبان سرمایه", type: "equity", nature: "creditor", level: 0, parentCode: null, isActive: true, balance: 0, currency: "IRR" },
  { code: "3-001", title: "سرمایه", type: "equity", nature: "creditor", level: 1, parentCode: "3", isActive: true, balance: 5000000000, currency: "IRR" },
  { code: "3-002", title: "سود (زیان) انباشته", type: "equity", nature: "creditor", level: 1, parentCode: "3", isActive: true, balance: 1200000000, currency: "IRR" },
  { code: "4", title: "درآمدها", type: "income", nature: "creditor", level: 0, parentCode: null, isActive: true, balance: 0, currency: "IRR" },
  { code: "4-001", title: "درآمدهای عملیاتی", type: "income", nature: "creditor", level: 1, parentCode: "4", isActive: true, balance: 0, currency: "IRR" },
  { code: "4-001-001", title: "درآمد حاصل از فروش", type: "income", nature: "creditor", level: 2, parentCode: "4-001", isActive: true, balance: 8500000000, currency: "IRR" },
  { code: "4-001-002", title: "درآمد حاصل از خدمات", type: "income", nature: "creditor", level: 2, parentCode: "4-001", isActive: true, balance: 1200000000, currency: "IRR" },
  { code: "5", title: "هزینه‌ها", type: "expense", nature: "debtor", level: 0, parentCode: null, isActive: true, balance: 0, currency: "IRR" },
  { code: "5-001", title: "هزینه‌های عملیاتی", type: "expense", nature: "debtor", level: 1, parentCode: "5", isActive: true, balance: 0, currency: "IRR" },
  { code: "5-001-001", title: "بهای تمام شده کالای فروش رفته", type: "expense", nature: "debtor", level: 2, parentCode: "5-001", isActive: true, balance: 5200000000, currency: "IRR" },
  { code: "5-001-002", title: "هزینه حقوق و دستمزد", type: "expense", nature: "debtor", level: 2, parentCode: "5-001", isActive: true, balance: 1800000000, currency: "IRR" },
  { code: "5-001-003", title: "هزینه استهلاک", type: "expense", nature: "debtor", level: 2, parentCode: "5-001", isActive: true, balance: 350000000, currency: "IRR" },
  { code: "5-002", title: "هزینه‌های اداری و عمومی", type: "expense", nature: "debtor", level: 1, parentCode: "5", isActive: true, balance: 0, currency: "IRR" },
  { code: "5-002-001", title: "هزینه اجاره", type: "expense", nature: "debtor", level: 2, parentCode: "5-002", isActive: true, balance: 480000000, currency: "IRR" },
  { code: "5-002-002", title: "هزینه آب و برق و گاز", type: "expense", nature: "debtor", level: 2, parentCode: "5-002", isActive: true, balance: 240000000, currency: "IRR" },
];

export const GENERAL_LEDGER: GeneralLedgerEntry[] = [
  { id: "GL-001", entryNumber: "GL-1403-001", date: "۱۴۰۳/۰۴/۰۱", description: "ثبت عوارض ماهانه تیرماه - شرکت پلاستیک ایران", accountCode: "1-001-004", accountTitle: "حساب‌های دریافتنی تجاری", debit: 45780000, credit: 0, currency: "IRR", documentId: "INV-001", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", financialPeriodId: "FP-1403" },
  { id: "GL-002", entryNumber: "GL-1403-001", date: "۱۴۰۳/۰۴/۰۱", description: "ثبت عوارض ماهانه تیرماه - شرکت پلاستیک ایران", accountCode: "4-001-002", accountTitle: "درآمد حاصل از خدمات", debit: 0, credit: 42000000, currency: "IRR", documentId: "INV-001", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", financialPeriodId: "FP-1403" },
  { id: "GL-003", entryNumber: "GL-1403-001", date: "۱۴۰۳/۰۴/۰۱", description: "ثبت عوارض ماهانه تیرماه - شرکت پلاستیک ایران", accountCode: "2-001-002", accountTitle: "مالیات پرداختنی", debit: 0, credit: 3780000, currency: "IRR", documentId: "INV-001", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", financialPeriodId: "FP-1403" },
  { id: "GL-004", entryNumber: "GL-1403-002", date: "۱۴۰۳/۰۴/۲۸", description: "وصول عوارض ماهانه تیرماه", accountCode: "1-001-002", accountTitle: "بانک - ملت", debit: 45780000, credit: 0, currency: "IRR", documentId: "INV-001", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۲۸ ۱۴:۳۰", financialPeriodId: "FP-1403" },
  { id: "GL-005", entryNumber: "GL-1403-002", date: "۱۴۰۳/۰۴/۲۸", description: "وصول عوارض ماهانه تیرماه", accountCode: "1-001-004", accountTitle: "حساب‌های دریافتنی تجاری", debit: 0, credit: 45780000, currency: "IRR", documentId: "INV-001", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۲۸ ۱۴:۳۰", financialPeriodId: "FP-1403" },
  { id: "GL-006", entryNumber: "GL-1403-003", date: "۱۴۰۳/۰۵/۰۱", description: "ثبت عوارض ماهانه مردادماه", accountCode: "1-001-004", accountTitle: "حساب‌های دریافتنی تجاری", debit: 45780000, credit: 0, currency: "IRR", documentId: "INV-002", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۵/۰۱ ۰۸:۰۰", financialPeriodId: "FP-1403" },
  { id: "GL-007", entryNumber: "GL-1403-004", date: "۱۴۰۳/۰۴/۱۰", description: "ثبت جریمه تأخیر", accountCode: "1-001-004", accountTitle: "حساب‌های دریافتنی تجاری", debit: 2289000, credit: 0, currency: "IRR", documentId: "INV-003", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۱۰ ۱۰:۰۰", financialPeriodId: "FP-1403" },
  { id: "GL-008", entryNumber: "GL-1403-004", date: "۱۴۰۳/۰۴/۱۰", description: "ثبت جریمه تأخیر", accountCode: "4-001-002", accountTitle: "درآمد حاصل از خدمات", debit: 0, credit: 2100000, currency: "IRR", documentId: "INV-003", createdBy: "سیستم", createdAt: "۱۴۰۳/۰۴/۱۰ ۱۰:۰۰", financialPeriodId: "FP-1403" },
];

export const TRIAL_BALANCE: TrialBalanceRow[] = [
  { accountCode: "1-001-001", accountTitle: "صندوق", openingDebit: 120000000, openingCredit: 0, debit: 5000000, credit: 0, closingDebit: 125000000, closingCredit: 0 },
  { accountCode: "1-001-002", accountTitle: "بانک - ملت", openingDebit: 820000000, openingCredit: 0, debit: 70000000, credit: 0, closingDebit: 890000000, closingCredit: 0 },
  { accountCode: "1-001-003", accountTitle: "بانک - ملی", openingDebit: 450000000, openingCredit: 0, debit: 0, credit: 0, closingDebit: 450000000, closingCredit: 0 },
  { accountCode: "1-001-004", accountTitle: "حساب‌های دریافتنی تجاری", openingDebit: 140000000, openingCredit: 0, debit: 93669000, credit: 45780000, closingDebit: 187889000, closingCredit: 0 },
  { accountCode: "1-002-001", accountTitle: "زمین", openingDebit: 2000000000, openingCredit: 0, debit: 0, credit: 0, closingDebit: 2000000000, closingCredit: 0 },
  { accountCode: "1-002-002", accountTitle: "ساختمان", openingDebit: 3500000000, openingCredit: 0, debit: 0, credit: 0, closingDebit: 3500000000, closingCredit: 0 },
  { accountCode: "1-002-003", accountTitle: "ماشین‌آلات و تجهیزات", openingDebit: 1500000000, openingCredit: 0, debit: 0, credit: 0, closingDebit: 1500000000, closingCredit: 0 },
  { accountCode: "2-001-001", accountTitle: "حساب‌های پرداختنی تجاری", openingDebit: 0, openingCredit: 285000000, debit: 0, credit: 0, closingDebit: 0, closingCredit: 285000000 },
  { accountCode: "2-001-002", accountTitle: "مالیات پرداختنی", openingDebit: 0, openingCredit: 85000000, debit: 0, credit: 3780000, closingDebit: 0, closingCredit: 88780000 },
  { accountCode: "2-002-001", accountTitle: "تسهیلات بانکی بلندمدت", openingDebit: 0, openingCredit: 500000000, debit: 0, credit: 0, closingDebit: 0, closingCredit: 500000000 },
  { accountCode: "3-001", accountTitle: "سرمایه", openingDebit: 0, openingCredit: 5000000000, debit: 0, credit: 0, closingDebit: 0, closingCredit: 5000000000 },
  { accountCode: "3-002", accountTitle: "سود (زیان) انباشته", openingDebit: 0, openingCredit: 1100000000, debit: 0, credit: 100000000, closingDebit: 0, closingCredit: 1200000000 },
  { accountCode: "4-001-002", accountTitle: "درآمد حاصل از خدمات", openingDebit: 0, openingCredit: 0, debit: 0, credit: 44100000, closingDebit: 0, closingCredit: 44100000 },
  { accountCode: "5-001-001", accountTitle: "بهای تمام شده کالای فروش رفته", openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
  { accountCode: "5-002-002", accountTitle: "هزینه آب و برق و گاز", openingDebit: 0, openingCredit: 0, debit: 0, credit: 0, closingDebit: 0, closingCredit: 0 },
];

export const FINANCIAL_PERIODS: FinancialPeriod[] = [
  { id: "FP-1402", title: "سال مالی ۱۴۰۲", startDate: "۱۴۰۲/۰۱/۰۱", endDate: "۱۴۰۲/۱۲/۲۹", status: "closed", isCurrent: false },
  { id: "FP-1403", title: "سال مالی ۱۴۰۳", startDate: "۱۴۰۳/۰۱/۰۱", endDate: "۱۴۰۳/۱۲/۲۹", status: "open", isCurrent: true },
  { id: "FP-1404", title: "سال مالی ۱۴۰۴", startDate: "۱۴۰۴/۰۱/۰۱", endDate: "۱۴۰۴/۱۲/۲۹", status: "locked", isCurrent: false },
];

export const AUDIT_TRAIL: AuditEntry[] = [
  { id: "AUD-001", action: "ایجاد", entityType: "invoice", entityId: "INV-001", userId: "U-ADM-001", userName: "احمد کریمی", userRole: "مدیر شهرک", timestamp: "۱۴۰۳/۰۴/۰۱ ۰۸:۰۰", details: "صدور فاکتور عوارض ماهانه برای شرکت پلاستیک ایران", ipAddress: "192.168.1.100", changes: null },
  { id: "AUD-002", action: "پرداخت", entityType: "payment", entityId: "PAY-001", userId: "U-COM-001", userName: "علیرضا صادقی", userRole: "مدیرعامل شرکت", timestamp: "۱۴۰۳/۰۴/۲۸ ۱۴:۳۰", details: "پرداخت دستی فاکتور INV-001 به مبلغ ۴۵,۷۸۰,۰۰۰ ریال", ipAddress: "192.168.1.45", changes: null },
  { id: "AUD-003", action: "تأیید پرداخت", entityType: "payment", entityId: "PAY-001", userId: "U-ADM-001", userName: "احمد کریمی", userRole: "مدیر شهرک", timestamp: "۱۴۰۳/۰۴/۲۹ ۱۰:۰۰", details: "تأیید و تایید پرداخت فیش واریزی", ipAddress: "192.168.1.100", changes: { status: { old: "pending_verification", new: "verified" } } },
  { id: "AUD-004", action: "ایجاد", entityType: "invoice", entityId: "INV-002", userId: "U-ADM-001", userName: "احمد کریمی", userRole: "مدیر شهرک", timestamp: "۱۴۰۳/۰۵/۰۱ ۰۸:۰۰", details: "صدور فاکتور عوارض ماهانه مردادماه", ipAddress: "192.168.1.100", changes: null },
  { id: "AUD-005", action: "پرداخت آنلاین", entityType: "payment", entityId: "PAY-002", userId: "U-COM-001", userName: "علیرضا صادقی", userRole: "مدیرعامل شرکت", timestamp: "۱۴۰۳/۰۴/۲۵ ۱۱:۱۵", details: "پرداخت آنلاین از طریق درگاه بانک ملت به مبلغ ۱۷۰,۸۹۰,۲۰۰ ریال", ipAddress: "192.168.1.45", changes: null },
  { id: "AUD-006", action: "اخطار", entityType: "invoice", entityId: "INV-003", userId: "سیستم", userName: "سیستم", userRole: "سیستم", timestamp: "۱۴۰۳/۰۴/۲۶ ۰۰:۰۰", details: "ارسال اخطار سررسید گذشته برای فاکتور INV-003", ipAddress: "System", changes: null },
  { id: "AUD-007", action: "ایجاد", entityType: "invoice", entityId: "INV-006", userId: "U-ADM-001", userName: "احمد کریمی", userRole: "مدیر شهرک", timestamp: "۱۴۰۳/۰۳/۲۸ ۰۸:۰۰", details: "صدور فاکتور اجاره فضای تبلیغاتی", ipAddress: "192.168.1.100", changes: null },
];

export const NOTIFICATIONS: FinNotification[] = [
  { id: "NOT-001", type: "new_document", title: "فاکتور جدید صادر شد", message: "فاکتور عوارض ماهانه مرداد ۱۴۰۳ به مبلغ ۴۵,۷۸۰,۰۰۰ ریال صادر شد.", documentId: "INV-002", isRead: false, createdAt: "۱۴۰۳/۰۵/۰۱ ۰۸:۰۰" },
  { id: "NOT-002", type: "due_reminder", title: "یادآوری پرداخت", message: "فاکتور عوارض ماهانه تیر ۱۴۰۳ تا ۳ روز دیگر سررسید می‌شود.", documentId: "INV-001", isRead: true, createdAt: "۱۴۰۳/۰۴/۲۸ ۰۰:۰۰" },
  { id: "NOT-003", type: "overdue", title: "پرداخت معوق", message: "فاکتور جریمه تأخیر به مبلغ ۲,۲۸۹,۰۰۰ ریال معوق شده است.", documentId: "INV-003", isRead: false, createdAt: "۱۴۰۳/۰۴/۲۶ ۰۰:۰۰" },
  { id: "NOT-004", type: "payment_confirmed", title: "پرداخت تأیید شد", message: "پرداخت فاکتور عوارض ماهانه تیر ۱۴۰۳ به مبلغ ۴۵,۷۸۰,۰۰۰ ریال تأیید شد.", documentId: "INV-001", isRead: true, createdAt: "۱۴۰۳/۰۴/۲۹ ۱۰:۰۰" },
  { id: "NOT-005", type: "overdue", title: "پرداخت معوق", message: "فاکتور اجاره فضای تبلیغاتی به مبلغ ۸,۷۲۰,۰۰۰ ریال معوق شده است.", documentId: "INV-006", isRead: false, createdAt: "۱۴۰۳/۰۴/۱۶ ۰۰:۰۰" },
  { id: "NOT-006", type: "new_document", title: "قبوض مصرفی صادر شد", message: "قبوض آب، برق و گاز مرداد ۱۴۰۳ به مبلغ ۱۵,۰۴۲,۰۰۰ ریال صادر شد.", documentId: "BILL-002", isRead: false, createdAt: "۱۴۰۳/۰۵/۱۵ ۱۰:۰۰" },
];

export const AGING_REPORT: AgingReportRow[] = [
  { companyName: "شرکت پلاستیک ایران", totalDue: 183120000, current: 91560000, days30: 45780000, days60: 2289000, days90: 8720000, days120plus: 0 },
  { companyName: "صنایع فولاد البرز", totalDue: 312000000, current: 150000000, days30: 85000000, days60: 42000000, days90: 25000000, days120plus: 10000000 },
  { companyName: "پتروشیمی پارس", totalDue: 98000000, current: 50000000, days30: 30000000, days60: 18000000, days90: 0, days120plus: 0 },
];

export const MONTHLY_SUMMARIES: FinancialSummary[] = [
  { period: "فروردین ۱۴۰۳", income: 780000000, expense: 690000000, netProfit: 90000000, receivables: 120000000, payables: 85000000 },
  { period: "اردیبهشت ۱۴۰۳", income: 810000000, expense: 705000000, netProfit: 105000000, receivables: 135000000, payables: 92000000 },
  { period: "خرداد ۱۴۰۳", income: 865000000, expense: 740000000, netProfit: 125000000, receivables: 148000000, payables: 78000000 },
  { period: "تیر ۱۴۰۳", income: 890000000, expense: 760000000, netProfit: 130000000, receivables: 183120000, payables: 95000000 },
];

export const CASH_FLOW: CashFlowRow[] = [
  { category: "فعالیت‌های عملیاتی", items: [{ description: "دریافت از مشتریان", amount: 820000000 }, { description: "پرداخت به تأمین‌کنندگان", amount: -420000000 }, { description: "پرداخت حقوق و دستمزد", amount: -180000000 }, { description: "پرداخت مالیات", amount: -45000000 }], total: 175000000 },
  { category: "فعالیت‌های سرمایه‌گذاری", items: [{ description: "خرید تجهیزات", amount: -250000000 }, { description: "فروش دارایی ثابت", amount: 80000000 }], total: -170000000 },
  { category: "فعالیت‌های تأمین مالی", items: [{ description: "دریافت تسهیلات", amount: 500000000 }, { description: "بازپرداخت تسهیلات", amount: -100000000 }, { description: "سود پرداختی", amount: -35000000 }], total: 365000000 },
];

export const PARK_REVENUE_SUMMARY = {
  totalInvoiced: 3890000000,
  totalCollected: 3410000000,
  totalOutstanding: 480000000,
  collectionRate: 87.6,
  averagePaymentDays: 18,
  overduePercentage: 12.3,
};

export const formatCurrency = (amount: number, currency: string = "IRR"): string => {
  if (currency === "IRR") return `${amount.toLocaleString("fa-IR")} ریال`;
  if (currency === "USD") return `$${amount.toLocaleString("en-US")}`;
  return `${amount.toLocaleString("fa-IR")} ${currency}`;
};

export const DOC_STATUS_CFG: Record<string, { fa: string; bg: string; text: string; dot: string }> = {
  pending:   { fa: "در انتظار پرداخت", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
  paid:      { fa: "پرداخت شده",       bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  overdue:   { fa: "معوق",            bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
  cancelled: { fa: "لغو شده",          bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" },
  partial:   { fa: "پرداخت جزئی",     bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
};

export const DOC_TYPE_CFG: Record<string, { fa: string; icon: string }> = {
  invoice:    { fa: "فاکتور", icon: "📄" },
  statement:  { fa: "صورتحساب", icon: "📋" },
  bill:       { fa: "قبض", icon: "🧾" },
  receipt:    { fa: "رسید", icon: "✅" },
  credit_note: { fa: "یادداشت بستانکار", icon: "💳" },
};

export const PAYMENT_METHOD_CFG: Record<string, { fa: string; icon: string }> = {
  manual:   { fa: "پرداخت دستی", icon: "🏦" },
  zarinpal: { fa: "زرین‌پال", icon: "🌐" },
  mellat:   { fa: "بانک ملت", icon: "🏛️" },
  saderat:  { fa: "بانک صادرات", icon: "🏛️" },
  tejarat:  { fa: "بانک تجارت", icon: "🏛️" },
  saman:    { fa: "بانک سامان", icon: "🏛️" },
  pos:      { fa: "پوز بانکی", icon: "💳" },
};
