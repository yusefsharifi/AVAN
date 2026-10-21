const toLatin = (value: string) => value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
export function CountdownTimer({ deadline }: { deadline: string }) {
  const parts = toLatin(deadline).split('/').map(Number);
  const today = [1403, 4, 20];
  const remaining = Math.max(0, (parts[0] - today[0]) * 365 + (parts[1] - today[1]) * 30 + (parts[2] - today[2]));
  const color = remaining < 2 ? 'text-red-600' : remaining <= 5 ? 'text-amber-600' : 'text-emerald-700';
  return <span className={`text-xs font-semibold ${color}`}>{remaining === 0 ? 'مهلت پایان یافته' : `${remaining.toLocaleString('fa-IR')} روز باقیمانده`}</span>;
}
export default CountdownTimer;
