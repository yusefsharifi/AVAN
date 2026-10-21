import { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
const modules=[
 {label:'حسابداری',items:[['دفتر کل','/finance'],['اسناد حسابداری','/finance'],['تراز آزمایشی','/accounting/reports/trial-balance'],['ترازنامه','/accounting/reports/balance-sheet'],['صورت سود و زیان','/accounting/reports/income-statement'],['بستن سال مالی','/accounting/fiscal-year/close']]},
 {label:'دریافت و پرداخت',items:[['ثبت اسناد','/finance'],['اسناد والد','/finance'],['چک‌ها','/finance'],['گزارشات','/accounting/reports']]},
 {label:'خرید و فروش',items:[['اسناد خرید','/finance'],['اسناد فروش','/finance'],['برگشت از خرید/فروش','/finance'],['گزارشات','/accounting/reports']]},
 {label:'اموال و استهلاک',items:[['ثبت اموال','/accounting/assets/register'],['محاسبه استهلاک','/accounting/assets/depreciation'],['انبارگردانی','/finance']]},
 {label:'حقوق و دستمزد',items:[['داشبورد','/accounting/payroll/dashboard'],['پرسنل','/accounting/payroll/employees'],['محاسبه حقوق','/accounting/payroll/calculation'],['فیش حقوقی','/accounting/payroll/calculation'],['قراردادها','/accounting/payroll/employees'],['مرخصی و ماموریت','/accounting/payroll/employees'],['وام و مساعده','/accounting/payroll/employees'],['گزارشات','/accounting/payroll/reports']]}
];
export function TwoLevelSidebar(){const [open,setOpen]=useState('حسابداری');const navigate=useNavigate();return <aside dir="rtl" className="w-56 bg-sidebar text-sidebar-foreground border-r border-sidebar-border p-2 text-xs print:hidden">{modules.map(m=><div key={m.label} className="mb-1"><button onClick={()=>setOpen(open===m.label?'':m.label)} className={`flex min-h-12 w-full items-center justify-between rounded px-3 py-2 ${open===m.label?'border-r-2 border-sidebar-primary bg-sidebar-active text-white':'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-white'}`}><span>{m.label}</span>{open===m.label?<ChevronDown size={15}/>:<ChevronLeft size={15}/>}</button>{open===m.label&&<div className="mr-3 mt-1 border-r border-sidebar-border">{m.items.map(([label,path])=><button key={label} onClick={()=>navigate(path)} className="block w-full border-r-2 border-transparent px-3 py-2 text-right text-sidebar-foreground/70 hover:border-sidebar-primary hover:bg-sidebar-accent hover:text-white">{label}</button>)}</div>}</div>)}</aside>}
export default TwoLevelSidebar;
