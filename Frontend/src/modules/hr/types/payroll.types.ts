export type PayrollComponentCategory = 'earning' | 'deduction';
export type PayrollCalculationMethod = 'fixed' | 'formula' | 'percentage' | 'hourly' | 'daily' | 'monthly';
export interface PayrollComponent {
  id: string;
  code: string;
  name: string;
  category: PayrollComponentCategory;
  method: PayrollCalculationMethod;
  amount: number;
  formula?: string;
  taxable: boolean;
  insuranceable: boolean;
  effectiveDate: string;
  expirationDate?: string;
  priority: number;
  glAccountId?: string;
  costCenterId?: string;
  currency: 'IRR';
  description?: string;
  active: boolean;
}
export interface EmployeePayrollComponent { id:string; employeeId:string; componentId:string; amount?:number; active:boolean; effectiveDate:string; expirationDate?:string }
export const DEFAULT_PAYROLL_COMPONENTS: PayrollComponent[] = [
  ['BASIC','حقوق پایه','earning',true,true],['HOUSING','حق مسکن','earning',true,true],['FOOD','حق بن','earning',true,true],['CHILD','حق اولاد','earning',true,true],['RESP','حق مسئولیت','earning',true,true],['SHIFT','حق شیفت','earning',true,true],['MISSION','حق ماموریت','earning',true,false],['BONUS','پاداش عملکرد','earning',true,true],['OT','اضافه کار','earning',true,true],['TAX','مالیات','deduction',false,false],['INSURANCE','بیمه','deduction',false,true],['LOAN','وام','deduction',false,false],['ADVANCE','مساعده','deduction',false,false],['PENALTY','جریمه','deduction',false,false],['ABSENCE','غیبت','deduction',false,false],['LATE','تاخیر','deduction',false,false]
].map(([code,name,category,taxable,insuranceable],i)=>({id:`PC-${code}`,code:code as string,name:name as string,category:category as PayrollComponentCategory,method:'fixed' as PayrollCalculationMethod,amount:0,taxable:taxable as boolean,insuranceable:insuranceable as boolean,effectiveDate:'۱۴۰۳/۰۱/۰۱',priority:i+1,currency:'IRR' as const,active:true}));
