import type { ReactNode } from 'react';
export function PrintTemplate({ title, fiscalYear, period, children }: {title:string; fiscalYear:string; period:string; children:ReactNode}) {
  return <section dir="rtl" className="print-report"><header className="hidden print:block text-center border-b-2 border-black pb-3 mb-4"><h1 className="font-bold text-lg">شرکت نمونه صنعتی</h1><h2 className="font-bold mt-1">{title}</h2><p className="text-xs mt-1">سال مالی {fiscalYear} — {period} — تاریخ چاپ: {new Date().toLocaleDateString('fa-IR')}</p></header>{children}<footer className="hidden print:flex justify-between mt-12 text-sm"><span>تنظیم کننده</span><span>تأیید کننده</span><span>مدیر مالی</span></footer><style>{`@media print { .print\:hidden { display:none!important } .print-report { color:#000!important; } @page { size: A4 landscape; margin: 12mm; } }`}</style></section>
}
export default PrintTemplate;
