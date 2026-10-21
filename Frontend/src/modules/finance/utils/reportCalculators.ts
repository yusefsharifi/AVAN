import type { Account, AccountType, JournalVoucher } from '../types';

export type TrialBalanceRow = {
  accountId: string; accountCode: string; accountName: string; accountType: AccountType; category: string;
  level: number; parentId: string | null; openingDebit: number; openingCredit: number;
  periodDebit: number; periodCredit: number; closingDebit: number; closingCredit: number; notes?: string;
};
export type BalanceSheetRow = { key: string; description: string; level: number; currentPeriod: number; priorPeriod: number; change: number; changePercent: number; kind?: 'header' | 'total' | 'account' };
export type IncomeStatementRow = { key: string; description: string; level: number; currentPeriod: number; priorPeriod: number; budget?: number; variance?: number; percentOfRevenue?: number; kind?: 'header' | 'total' | 'account' };
export type AccountCardRow = { id: string; date: string; voucherId: string; voucherNumber: string; description: string; debit: number; credit: number; balance: number; voucherType: string; isOpening?: boolean; isClosing?: boolean };

const toLatin = (v: string) => v.replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const periodNo = (id: string) => Number(toLatin(id).match(/(\d{1,2})$/)?.[1] ?? 0);
const dateNo = (date: string) => Number(toLatin(date).replace(/\D/g, ''));
const signedOpening = (a: Account) => (a.type === 'liability' || a.type === 'equity' || a.type === 'revenue') ? -a.openingBalance : a.openingBalance;
/** Backward-compatible category normalization for legacy chart-of-account records. */
const reportCategory = (a: Account): string => {
  if (!['current_asset','operating_revenue','operating_expense','current_liability','equity'].includes(a.category)) return a.category;
  const key = `${a.code} ${a.nameFa}`;
  if (/^1101|صندوق/.test(key)) return 'cash'; if (/^1102|^1103|بانک/.test(key)) return 'bank';
  if (/^1201|دریافتنی/.test(key)) return 'receivable'; if (/^1104|موجودی/.test(key)) return 'inventory';
  if (/^1501|ماشین|دارایی ثابت/.test(key)) return 'fixed_asset'; if (/^2101|پرداختنی/.test(key)) return 'payable';
  if (/^2102|اسناد پرداختنی/.test(key)) return 'check_payable'; if (/^2301|ارزش افزوده فروش/.test(key)) return 'vat_payable';
  if (/^3001|سرمایه/.test(key)) return 'capital'; if (/^4002|فروش/.test(key)) return 'sales_revenue';
  if (/^4001|اجاره/.test(key)) return a.type === 'revenue' ? 'service_revenue' : 'rent_expense';
  if (/^5001|حقوق/.test(key)) return 'salary_expense'; if (/^5002|استهلاک/.test(key)) return 'depreciation_expense';
  if (/^5003|بهای تمام/.test(key)) return 'cogs'; return a.category;
};

/** Pure, store-independent trial balance calculation. Amounts are integer IRR. */
export function calculateTrialBalance(accounts: Account[], vouchers: JournalVoucher[], fiscalYearId: string, fromPeriod: number, toPeriod: number, maxLevel = 4): TrialBalanceRow[] {
  const movements = new Map<string, { debit: number; credit: number }>();
  vouchers.filter(v => v.status === 'posted' && v.fiscalYearId === fiscalYearId && periodNo(v.periodId) >= fromPeriod && periodNo(v.periodId) <= toPeriod)
    .forEach(v => v.entries.forEach(e => { const x = movements.get(e.accountId) ?? { debit: 0, credit: 0 }; x.debit += e.debitBaseCurrency || e.debit || 0; x.credit += e.creditBaseCurrency || e.credit || 0; movements.set(e.accountId, x); }));
  return accounts.filter(a => a.fiscalYearId === fiscalYearId && a.level <= maxLevel).sort((a,b) => a.code.localeCompare(b.code)).map(a => {
    const m = movements.get(a.id) ?? { debit: 0, credit: 0 };
    const open = signedOpening(a); const closing = open + m.debit - m.credit;
    return { accountId: a.id, accountCode: a.code, accountName: a.nameFa, accountType: a.type, category: reportCategory(a), level: a.level, parentId: a.parentId,
      openingDebit: Math.max(open,0), openingCredit: Math.max(-open,0), periodDebit: m.debit, periodCredit: m.credit, closingDebit: Math.max(closing,0), closingCredit: Math.max(-closing,0) };
  });
}
const balance = (r: TrialBalanceRow) => r.closingDebit - r.closingCredit;
const sum = (rows: TrialBalanceRow[]) => rows.reduce((s,r) => s + Math.abs(balance(r)), 0);
export function calculateBalanceSheet(trialBalance: TrialBalanceRow[], prior: TrialBalanceRow[] = []): BalanceSheetRow[] {
  const priorById = new Map(prior.map(x => [x.accountId, Math.abs(balance(x))]));
  const section = (title: string, types: AccountType[], key: string, invert = false): BalanceSheetRow[] => {
    const lines = trialBalance.filter(r => types.includes(r.accountType)).map(r => { const current = Math.abs(balance(r)); const p = priorById.get(r.accountId) ?? 0; return { key:r.accountId, description:r.accountName, level:1, currentPeriod:current, priorPeriod:p, change:current-p, changePercent:p ? ((current-p)/p)*100 : 0, kind:'account' as const }; });
    const current = lines.reduce((s,r)=>s+r.currentPeriod,0), p = lines.reduce((s,r)=>s+r.priorPeriod,0);
    return [{key, description:title, level:0, currentPeriod:current, priorPeriod:p, change:current-p, changePercent:p ? (current-p)/p*100:0, kind:'header'}, ...lines];
  };
  return [...section('دارایی‌ها', ['asset'], 'assets'), ...section('بدهی‌ها', ['liability'], 'liabilities'), ...section('حقوق صاحبان سهام', ['equity'], 'equity')];
}
export function calculateIncomeStatement(trialBalance: TrialBalanceRow[], budgetData?: { accountId: string; amount: number }[]): IncomeStatementRow[] {
  const budget = new Map((budgetData ?? []).map(b=>[b.accountId,b.amount]));
  const revenue = trialBalance.filter(r=>r.accountType==='revenue'); const expense = trialBalance.filter(r=>r.accountType==='expense');
  const lines = (rows: TrialBalanceRow[], title: string, sign: number): IncomeStatementRow[] => rows.map(r => { const current = Math.abs(balance(r)); const b = budget.get(r.accountId); return {key:r.accountId,description:r.accountName,level:1,currentPeriod:current,priorPeriod:0,budget:b,variance:b === undefined ? undefined : current-b,kind:'account'}; });
  const rev = sum(revenue), exp = sum(expense), net = rev-exp;
  const output: IncomeStatementRow[] = [{key:'revenue',description:'درآمدهای عملیاتی',level:0,currentPeriod:rev,priorPeriod:0,kind:'header'}, ...lines(revenue,'',1), {key:'expenses',description:'هزینه‌های عملیاتی و بهای تمام‌شده',level:0,currentPeriod:exp,priorPeriod:0,kind:'header'}, ...lines(expense,'',-1), {key:'net',description:'سود (زیان) خالص دوره',level:0,currentPeriod:net,priorPeriod:0,kind:'total'}];
  return output.map(r=>({...r,percentOfRevenue: rev ? r.currentPeriod/rev*100 : 0}));
}
export function calculateAccountCard(accountId: string, vouchers: JournalVoucher[], fromDate: string, toDate: string): AccountCardRow[] {
  const min = fromDate ? dateNo(fromDate) : -Infinity, max = toDate ? dateNo(toDate) : Infinity;
  let running = 0;
  const rows = vouchers.filter(v=>v.status==='posted' && dateNo(v.date)>=min && dateNo(v.date)<=max).sort((a,b)=>dateNo(a.date)-dateNo(b.date)).flatMap(v=>v.entries.filter(e=>e.accountId===accountId).map(e=>({ id:e.id,date:v.date,voucherId:v.id,voucherNumber:v.voucherNumber,description:[v.description,e.description].filter(Boolean).join(' — '),debit:e.debitBaseCurrency||e.debit||0,credit:e.creditBaseCurrency||e.credit||0,voucherType:v.type })));
  const calculated = rows.map(r=>({...r,balance:(running += r.debit-r.credit)}));
  return [{id:'opening',date:fromDate,voucherId:'',voucherNumber:'',description:'سند افتتاحیه',debit:0,credit:0,balance:0,voucherType:'opening',isOpening:true}, ...calculated, {id:'closing',date:toDate,voucherId:'',voucherNumber:'',description:'مانده کل',debit:0,credit:0,balance:running,voucherType:'closing',isClosing:true}];
}
