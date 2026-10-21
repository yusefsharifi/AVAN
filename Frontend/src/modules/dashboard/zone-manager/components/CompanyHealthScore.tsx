import type { Company } from '@/entities/document';

const scoreColor = (value: number) => value >= 85 ? 'bg-emerald-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500';

export function CompanyHealthScore({
  company,
  financialScore,
  complianceScore,
  operationalScore,
  energyScore,
  engagementScore,
}: {
  company: Company;
  financialScore: number;
  complianceScore: number;
  operationalScore: number;
  energyScore: number;
  engagementScore: number;
}) {
  const total = Math.round((financialScore + complianceScore + operationalScore + energyScore + engagementScore) / 5);
  const rows = [
    ['مالی و بدهی‌ها', financialScore],
    ['HSE و انطباق', complianceScore],
    ['عملیات و تردد', operationalScore],
    ['انرژی و Utility', energyScore],
    ['تعامل و پاسخگویی', engagementScore],
  ] as const;

  return (
    <div className="space-y-4" dir="rtl">
      <section className="rounded-xl border bg-secondary/30 p-5 text-center">
        <div className={`mx-auto grid h-24 w-24 place-items-center rounded-full border-8 border-white ${scoreColor(total)}`}>
          <span className="text-3xl font-bold text-white">{total}</span>
        </div>
        <h3 className="mt-3 font-bold">Company Health Score</h3>
        <p className="mt-1 text-xs text-muted-foreground">{company.nameFa} — امتیاز ترکیبی از ۱۰۰</p>
      </section>
      <section className="space-y-3 rounded-xl border p-4">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="flex justify-between text-xs"><span>{value}</span><b>{label}</b></div>
            <div className="mt-1 h-2 rounded bg-secondary"><div className={`h-2 rounded ${scoreColor(value)}`} style={{ width: `${value}%` }} /></div>
          </div>
        ))}
      </section>
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        پیشنهاد مدیریتی: برای بهبود امتیاز، بدهی‌های معوق، مجوزهای نزدیک انقضا و مصرف انرژی غیرعادی را بررسی کنید.
      </section>
    </div>
  );
}
export default CompanyHealthScore;
