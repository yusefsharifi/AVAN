import { useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Employee, PerformanceScores } from "../types";
import { useHRStore } from "../store/useHRStore";

const inputCls = "w-full bg-secondary border border-border rounded-lg py-2 px-3 text-xs text-foreground focus:outline-none focus:border-accent";
const labelCls = "text-xs font-medium text-muted-foreground mb-1.5 block text-right";

const STATUS_LABELS: Record<string, string> = { draft: "پیش‌نویس", submitted: "ثبت‌شده", acknowledged: "تأییدشده" };

const CRITERIA: { key: keyof PerformanceScores; label: string }[] = [
  { key: "technicalSkills", label: "مهارت فنی" },
  { key: "communication", label: "ارتباطات" },
  { key: "punctuality", label: "وقت‌شناسی" },
  { key: "leadership", label: "رهبری" },
  { key: "teamwork", label: "کار تیمی" },
  { key: "goalAchievement", label: "دستیابی به اهداف" },
];

export default function PerformanceEvaluation({ employees }: { employees: Employee[] }) {
  const { performanceReviews, addPerformanceReview, getPerformanceHistory } = useHRStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [trendEmployeeId, setTrendEmployeeId] = useState(employees[0]?.employeeId ?? "");
  const [form, setForm] = useState({
    employeeId: employees[0]?.employeeId ?? "", period: "", reviewer: "",
    technicalSkills: 5, communication: 5, punctuality: 5, leadership: 5, teamwork: 5, goalAchievement: 5,
    goals: "", strengths: "", improvementAreas: "",
  });

  const avgOverall = performanceReviews.length
    ? (performanceReviews.reduce((s, r) => s + r.weightedScore, 0) / performanceReviews.length).toFixed(2)
    : "—";

  const submitReview = () => {
    const emp = employees.find((e) => e.employeeId === form.employeeId);
    addPerformanceReview({
      employeeId: form.employeeId, employeeName: emp?.name ?? "—", period: form.period || "دوره جاری",
      reviewer: form.reviewer || "—",
      scores: {
        technicalSkills: form.technicalSkills, communication: form.communication, punctuality: form.punctuality,
        leadership: form.leadership, teamwork: form.teamwork, goalAchievement: form.goalAchievement,
      },
      goals: form.goals, strengths: form.strengths, improvementAreas: form.improvementAreas,
    });
    toast.success("ارزیابی ثبت شد");
    setModalOpen(false);
  };

  const trendData = getPerformanceHistory(trendEmployeeId).map((r) => ({ period: r.period, score: r.weightedScore }));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-foreground" dir="ltr">{performanceReviews.length}</p>
          <p className="text-xs text-muted-foreground mt-1">ارزیابی ثبت‌شده</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600" dir="ltr">{avgOverall}</p>
          <p className="text-xs text-muted-foreground mt-1">میانگین امتیاز وزنی (از ۱۰)</p>
        </div>
        <div className="bg-card rounded-xl border border-border shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-amber-600" dir="ltr">{performanceReviews.filter((r) => r.status === "submitted").length}</p>
          <p className="text-xs text-muted-foreground mt-1">در انتظار تأیید کارمند</p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <select dir="rtl" value={trendEmployeeId} onChange={(e) => setTrendEmployeeId(e.target.value)} className={`${inputCls} w-48`}>
            {employees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
          </select>
          <h3 className="text-sm font-semibold text-foreground">روند عملکرد (تاریخچه امتیاز وزنی)</h3>
        </div>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendData}>
              <XAxis dataKey="period" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="score" stroke="var(--accent)" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-sm text-muted-foreground text-center py-8">هنوز ارزیابی‌ای برای این کارمند ثبت نشده</p>}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <button onClick={() => setModalOpen(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /><span>ثبت ارزیابی جدید</span>
          </button>
          <h3 className="text-sm font-semibold text-foreground">ارزیابی عملکرد کارکنان</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              {["وضعیت", "امتیاز وزنی", "ارزیاب", "دوره", "کارمند"].map((h) => (
                <th key={h} className="text-right py-3 px-3 text-xs font-semibold text-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {performanceReviews.map((r) => (
              <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-secondary/20 transition-colors">
                <td className="py-3 px-3"><span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${r.status === "acknowledged" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{STATUS_LABELS[r.status]}</span></td>
                <td className="py-3 px-3 text-sm font-bold text-foreground" dir="ltr">{r.weightedScore}/۱۰</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{r.reviewer}</td>
                <td className="py-3 px-3 text-xs text-muted-foreground">{r.period}</td>
                <td className="py-3 px-3 text-sm font-semibold text-foreground">{r.employeeName}</td>
              </tr>
            ))}
            {performanceReviews.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-sm text-muted-foreground">هنوز ارزیابی‌ای ثبت نشده</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setModalOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-2xl shadow-2xl p-5 w-[32rem] z-50 max-h-[88vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setModalOpen(false)} className="p-1 rounded hover:bg-secondary text-muted-foreground"><X className="w-4 h-4" /></button>
              <p className="text-sm font-bold text-foreground">ثبت ارزیابی عملکرد</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>کارمند</label>
                <select dir="rtl" value={form.employeeId} onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} className={inputCls}>
                  {employees.map((e) => <option key={e.id} value={e.employeeId}>{e.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className={labelCls}>دوره ارزیابی</label><input dir="ltr" value={form.period} onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))} placeholder="Q1 2026" className={inputCls} /></div>
                <div><label className={labelCls}>ارزیاب</label><input dir="rtl" value={form.reviewer} onChange={(e) => setForm((f) => ({ ...f, reviewer: e.target.value }))} className={inputCls} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {CRITERIA.map((c) => (
                  <div key={c.key}>
                    <label className={labelCls}>{c.label} ({(form as any)[c.key]}/۱۰)</label>
                    <input type="range" min={1} max={10} value={(form as any)[c.key]}
                      onChange={(e) => setForm((f) => ({ ...f, [c.key]: Number(e.target.value) }))}
                      className="w-full accent-accent" />
                  </div>
                ))}
              </div>
              <div><label className={labelCls}>نقاط قوت</label><textarea dir="rtl" value={form.strengths} onChange={(e) => setForm((f) => ({ ...f, strengths: e.target.value }))} className={inputCls} rows={2} /></div>
              <div><label className={labelCls}>نیازمند بهبود</label><textarea dir="rtl" value={form.improvementAreas} onChange={(e) => setForm((f) => ({ ...f, improvementAreas: e.target.value }))} className={inputCls} rows={2} /></div>
              <div><label className={labelCls}>اهداف دوره بعد</label><textarea dir="rtl" value={form.goals} onChange={(e) => setForm((f) => ({ ...f, goals: e.target.value }))} className={inputCls} rows={2} /></div>
              <button onClick={submitReview} disabled={!form.employeeId}
                className="w-full py-2.5 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors mt-1">
                ثبت ارزیابی
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
