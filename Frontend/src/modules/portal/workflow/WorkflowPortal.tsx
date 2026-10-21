import { useState } from "react";
import {
  GitBranch, Play, Pause, AlertTriangle, Clock, CheckCircle2, ChevronLeft, ChevronDown,
  Eye, BarChart3, Zap, TrendingUp, Users, Settings, ArrowLeft, XCircle, RefreshCw,
} from "lucide-react";
import {
  WORKFLOW_LIBRARY, WF_INSTANCES, WF_BOTTLENECKS, WF_CATEGORY_CFG,
  WF_NODES, WF_EDGES, WF_VERSION_HISTORY, WF_VALIDATION_ISSUES,
  WFNode, WFEdge,
} from "@/entities/workflow";

const TABS = [
  { id: "designer", label: "طراح Workflow" },
  { id: "instances", label: "نمونه‌ها" },
  { id: "bottleneck", label: "گلوگاه‌ها" },
] as const;

const INSTANCE_STATUS = {
  onTime:  { fa: "به‌موقع", color: "text-emerald-600", bg: "bg-emerald-50" },
  atRisk:  { fa: "در خطر", color: "text-amber-600", bg: "bg-amber-50" },
  overdue: { fa: "تأخیر", color: "text-red-600", bg: "bg-red-50" },
};

const AUDIT_TRAIL = [
  { id: "a1", time: "۱۴۰۳/۰۴/۱۶ ۰۸:۱۰", action: "شروع Workflow", by: "سیستم", detail: "实例 ایجاد شد" },
  { id: "a2", time: "۱۴۰۳/۰۴/۱۶ ۰۸:۱۲", action: "تخصیص به مرحله", by: "احمد کریمی", detail: "مرحله «تأیید مدیر HSE» فعال شد" },
  { id: "a3", time: "۱۴۰۳/۰۴/۱۶ ۰۹:۳۰", action: "ارجاع", by: "مریم رضایی", detail: "به حسین کاظمی ارجاع شد" },
  { id: "a4", time: "۱۴۰۳/۰۴/۱۶ ۱۰:۱۵", action: "یادآوری SLA", by: "سیستم", detail: "یادآوری خودکار ارسال شد" },
];

const ROOT_CAUSES = [
  { cause: "تأخیر در پاسخ مدیر HSE", count: 34, pct: 42 },
  { cause: "عدم تکمیل مستندات", count: 22, pct: 27 },
  { cause: "عدم دسترسی عامل", count: 15, pct: 18 },
  { cause: "خطای سیستمی", count: 10, pct: 13 },
];

const GANTT_DATA = [
  { task: "بررسی اولیه لجستیک", start: 0, dur: 4, status: "done" as const },
  { task: "تأیید مدیر HSE", start: 4, dur: 24, status: "active" as const },
  { task: "ارسال نوتیفیکیشن", start: 4, dur: 2, status: "done" as const },
  { task: "تأیید نهایی", start: 28, dur: 8, status: "pending" as const },
];

function WorkflowPortal() {
  const [tab, setTab] = useState<typeof TABS[number]["id"]>("designer");
  const [selectedWf, setSelectedWf] = useState<string | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [showInstanceDetail, setShowInstanceDetail] = useState<string | null>(null);
  const [showIntervention, setShowIntervention] = useState(false);
  const [showGantt, setShowGantt] = useState(false);
  const [showRootCauses, setShowRootCauses] = useState(false);

  const selectedInstance = WF_INSTANCES.find((i) => i.id === showInstanceDetail);

  return (
    <div className="h-full flex flex-col bg-background" dir="rtl">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold text-foreground">مدیریت Workflow</h2>
        </div>
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-[11px] px-3 py-1.5 rounded-md transition-colors ${tab === t.id ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* ── DESIGNER TAB ── */}
        {tab === "designer" && (
          <div className="space-y-4">
            {/* Workflow Library */}
            <div className="grid grid-cols-3 gap-4">
              {WORKFLOW_LIBRARY.map((wf) => {
                const catCfg = WF_CATEGORY_CFG[wf.category];
                return (
                  <div
                    key={wf.id}
                    onClick={() => setSelectedWf(selectedWf === wf.id ? null : wf.id)}
                    className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedWf === wf.id ? "border-accent shadow-md" : "border-border hover:border-accent/50"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium" style={{ background: catCfg.color + "15", color: catCfg.color }}>{catCfg.fa}</span>
                      <div className="flex items-center gap-1">
                        {wf.isSystemDefault && <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">پیش‌فرض</span>}
                        <button
                          onClick={(e) => { e.stopPropagation(); setShowPublish(true); }}
                          className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          انتشار
                        </button>
                      </div>
                    </div>
                    <h3 className="text-xs font-bold text-foreground mb-1">{wf.title}</h3>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">{wf.desc}</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-secondary rounded p-2 text-center">
                        <p className="text-sm font-bold text-foreground">{wf.activeInstances}</p>
                        <p className="text-[9px] text-muted-foreground">نمونه فعال</p>
                      </div>
                      <div className="bg-secondary rounded p-2 text-center">
                        <p className="text-sm font-bold text-foreground">{wf.avgTime}</p>
                        <p className="text-[9px] text-muted-foreground">زمان متوسط</p>
                      </div>
                      <div className="bg-secondary rounded p-2 text-center">
                        <p className={`text-sm font-bold ${wf.successRate >= 95 ? "text-emerald-600" : wf.successRate >= 85 ? "text-amber-600" : "text-red-600"}`}>{wf.successRate}%</p>
                        <p className="text-[9px] text-muted-foreground">نرخ موفقیت</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 text-[10px] text-muted-foreground">
                      <span>v{wf.version} · {wf.lastEdit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Designer (reused) */}
            {selectedWf && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-foreground">طراح بصری Workflow — {WORKFLOW_LIBRARY.find((w) => w.id === selectedWf)?.title}</h3>
                  <div className="flex gap-2">
                    <button className="text-[10px] px-3 py-1.5 rounded-lg bg-primary text-white font-medium">ذخیره</button>
                    <button onClick={() => setSelectedWf(null)} className="text-[10px] px-3 py-1.5 rounded-lg border border-border text-muted-foreground">بستن</button>
                  </div>
                </div>
                {/* SVG Canvas */}
                <div className="bg-secondary/50 rounded-xl p-4 overflow-auto">
                  <svg width="960" height="380" className="mx-auto">
                    {WF_EDGES.map((e, i) => {
                      const from = WF_NODES.find((n) => n.id === e.from);
                      const to = WF_NODES.find((n) => n.id === e.to);
                      if (!from || !to) return null;
                      return (
                        <g key={i}>
                          <line x1={from.x + 50} y1={from.y + 20} x2={to.x} y2={to.y + 20} stroke="#CBD5E1" strokeWidth={2} markerEnd="url(#arrow)" />
                          {e.label && (
                            <text x={(from.x + 50 + to.x) / 2} y={(from.y + to.y) / 2 + 10} textAnchor="middle" fill="#6B7A8D" fontSize={10}>{e.label}</text>
                          )}
                        </g>
                      );
                    })}
                    <defs>
                      <marker id="arrow" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                        <path d="M0,0 L8,3 L0,6" fill="#CBD5E1" />
                      </marker>
                    </defs>
                    {WF_NODES.map((n) => {
                      const isStart = n.kind === "start";
                      const isEnd = n.kind.startsWith("end");
                      const isGate = n.kind === "xor" || n.kind === "and";
                      const fill = isStart ? "#0E7C86" : isEnd ? (n.kind === "end-success" ? "#10B981" : "#EF4444") : isGate ? "#F2A541" : "#0F2A44";
                      return (
                        <g key={n.id}>
                          {isGate ? (
                            <rect x={n.x} y={n.y} width={100} height={40} rx={4} fill={fill + "20"} stroke={fill} strokeWidth={1.5} />
                          ) : (
                            <rect x={n.x} y={n.y} width={100} height={40} rx={isStart || isEnd ? 20 : 8} fill={fill + "20"} stroke={fill} strokeWidth={1.5} />
                          )}
                          <text x={n.x + 50} y={n.y + 25} textAnchor="middle" fill="#0F2A44" fontSize={10} fontWeight={600}>{n.title}</text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── INSTANCES TAB ── */}
        {tab === "instances" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGantt(!showGantt)}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border text-medium transition-colors ${showGantt ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:bg-secondary"}`}
                >
                  {showGantt ? "جدول" : "نمودار گانت"}
                </button>
              </div>
            </div>

            {/* Gantt Chart */}
            {showGantt && (
              <div className="bg-card rounded-xl border border-border shadow-sm p-5">
                <h3 className="text-xs font-bold text-foreground mb-3">نمودار گانت — WFI-3401</h3>
                <div className="space-y-2">
                  {GANTT_DATA.map((g, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground w-32 text-left">{g.task}</span>
                      <div className="flex-1 h-6 bg-secondary rounded relative">
                        <div
                          className={`absolute top-0 h-full rounded ${
                            g.status === "done" ? "bg-emerald-500/60" : g.status === "active" ? "bg-accent/60" : "bg-slate-200"
                          }`}
                          style={{ left: `${(g.start / 36) * 100}%`, width: `${(g.dur / 36) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-[9px] font-medium text-foreground">
                          {g.status === "done" ? "✓" : g.status === "active" ? "●" : ""} {g.dur}h
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Instance Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-secondary">
                    {["عملیات", "شناسه", "Workflow", "شرکت", "مرحله فعلی", "عامل", "شروع", "SLA", "وضعیت"].map((h) => (
                      <th key={h} className="px-3 py-2.5 text-right text-[10px] text-muted-foreground font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WF_INSTANCES.map((inst) => {
                    const statusCfg = INSTANCE_STATUS[inst.status];
                    return (
                      <tr key={inst.id} className="border-t border-border hover:bg-secondary/50">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setShowInstanceDetail(inst.id)}
                              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            ><Eye className="w-3 h-3" /></button>
                            <button
                              onClick={() => setShowIntervention(true)}
                              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                            ><Settings className="w-3 h-3" /></button>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-foreground">{inst.id}</td>
                        <td className="px-3 py-2.5 text-foreground">{inst.workflowType}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{inst.company}</td>
                        <td className="px-3 py-2.5 text-foreground font-medium">{inst.currentStage}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{inst.assignee}</td>
                        <td className="px-3 py-2.5 text-muted-foreground">{inst.started}</td>
                        <td className="px-3 py-2.5">
                          <div className="w-20 bg-secondary rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${inst.slaPct > 80 ? "bg-emerald-500" : inst.slaPct > 50 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${inst.slaPct}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground">{inst.slaPct}%</span>
                        </td>
                        <td className="px-3 py-2.5"><span className={`text-[10px] px-2 py-0.5 rounded ${statusCfg.bg} ${statusCfg.color}`}>{statusCfg.fa}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* SLA Breach Prediction */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-4">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> پیش‌بینی نقض SLA
              </h3>
              <div className="space-y-2">
                {WF_INSTANCES.filter((i) => i.slaPct < 50).map((inst) => (
                  <div key={inst.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <span className="text-[10px] font-mono text-foreground">{inst.id}</span>
                    <span className="text-[10px] text-foreground flex-1">{inst.workflowType} — {inst.company}</span>
                    <span className={`text-[10px] font-bold ${inst.slaPct < 20 ? "text-red-600" : "text-amber-600"}`}>
                      {inst.slaPct}% باقی‌مانده
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── BOTTLENECK TAB ── */}
        {tab === "bottleneck" && (
          <div className="space-y-4">
            {/* Heat-Map Table */}
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> نقشه حرارتی گلوگاه‌ها
                </h3>
              </div>
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary/30">
                    {["مرحله", "تأخیر متوسط (ساعت)", "شدت", "تعداد نمونه آسیب‌دیده"].map((h) => (
                      <th key={h} className="text-right py-2.5 px-4 text-[10px] font-semibold text-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {WF_BOTTLENECKS.map((bn) => {
                    const severity = bn.avgDelay > 15 ? "high" : bn.avgDelay > 8 ? "medium" : "low";
                    const severityLabel = severity === "high" ? "بحرانی" : severity === "medium" ? "متوسط" : "کم";
                    return (
                      <tr key={bn.stage} className="border-t border-border hover:bg-secondary/30">
                        <td className="py-2.5 px-4 text-[11px] text-foreground font-medium">{bn.stage}</td>
                        <td className="py-2.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-secondary rounded-full h-2">
                              <div className={`h-2 rounded-full ${severity === "high" ? "bg-red-500" : severity === "medium" ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(bn.avgDelay * 4, 100)}%` }} />
                            </div>
                            <span className={`text-[10px] font-mono ${severity === "high" ? "text-red-600" : severity === "medium" ? "text-amber-600" : "text-emerald-600"}`}>{bn.avgDelay}h</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${severity === "high" ? "bg-red-50 text-red-700" : severity === "medium" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                            {severityLabel}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-foreground">{Math.round(bn.avgDelay * 2.3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Root Cause Frequency Chart */}
            <div className="bg-card rounded-xl border border-border shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-accent" /> دلایل ریشه‌ای و تکرار
                </h3>
                <button
                  onClick={() => setShowRootCauses(!showRootCauses)}
                  className="text-[10px] px-3 py-1 rounded-lg border border-border text-muted-foreground hover:bg-secondary"
                >
                  {showRootCauses ? "بستن" : "مشاهده جزئیات"}
                </button>
              </div>
              <div className="space-y-2">
                {ROOT_CAUSES.map((rc, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[10px] text-muted-foreground w-40">{rc.cause}</span>
                    <div className="flex-1 h-5 bg-secondary rounded relative">
                      <div className="h-full bg-accent/60 rounded" style={{ width: `${rc.pct}%` }} />
                    </div>
                    <span className="text-[10px] font-mono text-foreground w-16 text-left" dir="ltr">{rc.count} ({rc.pct}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Issues */}
            <div className="rounded-xl border border-border p-4">
              <h3 className="text-xs font-bold text-foreground mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-accent" /> اعتبارسنجی Workflow
              </h3>
              {WF_VALIDATION_ISSUES.map((issue, i) => (
                <div key={i} className={`text-xs p-2 rounded-lg mb-1 ${issue.severity === "error" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"}`}>
                  {issue.severity === "error" ? "✕" : "⚠"} {issue.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Instance Detail Modal ── */}
      {showInstanceDetail && selectedInstance && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowInstanceDetail(null)}>
          <div className="bg-card border border-border rounded-2xl w-[560px] max-h-[80vh] overflow-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h3 className="text-sm font-bold text-foreground">جزئیات نمونه {selectedInstance.id}</h3>
              <button onClick={() => setShowInstanceDetail(null)} className="p-1.5 rounded hover:bg-secondary"><XCircle className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Workflow", value: selectedInstance.workflowType },
                  { label: "شرکت", value: selectedInstance.company },
                  { label: "مرحله فعلی", value: selectedInstance.currentStage },
                  { label: "عامل", value: selectedInstance.assignee },
                  { label: "شروع", value: selectedInstance.started },
                  { label: "وضعیت", value: INSTANCE_STATUS[selectedInstance.status].fa },
                ].map((item) => (
                  <div key={item.label} className="bg-secondary rounded-lg p-3">
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    <p className="text-xs text-foreground font-medium">{item.value}</p>
                  </div>
                ))}
              </div>
              {/* Audit Trail */}
              <div>
                <p className="text-xs font-bold text-foreground mb-2">مسیر کنترل کامل</p>
                {AUDIT_TRAIL.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 py-2 border-b border-border/50 last:border-0">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5" />
                    <div className="flex-1">
                      <p className="text-[11px] text-foreground font-medium">{a.action}</p>
                      <p className="text-[10px] text-muted-foreground">{a.by} — {a.detail}</p>
                    </div>
                    <span className="text-[9px] text-muted-foreground font-mono">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Intervention Modal ── */}
      {showIntervention && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowIntervention(false)}>
          <div className="bg-card border border-border rounded-2xl w-[420px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-4">مداخله دستی</h3>
            <div className="space-y-2">
              {[
                { label: "پیش‌رانی اجباری مرحله", icon: ArrowLeft, desc: "رد کردن مرحله فعلی و انتقال به مرحله بعد" },
                { label: "تخصیص مجدد", icon: Users, desc: "تغییر عامل مرحله فعلی" },
                { label: "پایان اجباری", icon: XCircle, desc: "خاتمه دادن به instance" },
                { label: "بازنشانی", icon: RefreshCw, desc: "بازگشت به مرحله اولیه" },
              ].map((action) => (
                <button key={action.label} className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-accent/30 hover:bg-secondary/30 transition-colors text-right">
                  <action.icon className="w-4 h-4 text-accent" />
                  <div>
                    <p className="text-xs font-medium text-foreground">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setShowIntervention(false)} className="flex-1 bg-secondary text-foreground text-xs font-bold py-2 rounded-lg">انصراف</button>
              <button onClick={() => setShowIntervention(false)} className="flex-1 bg-primary text-white text-xs font-bold py-2 rounded-lg">تأیید</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Publish Modal ── */}
      {showPublish && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setShowPublish(false)}>
          <div className="bg-card border border-border rounded-2xl w-[380px] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-foreground mb-4">انتشار / لغو انتشار</h3>
            <p className="text-xs text-muted-foreground mb-4">آیا می‌خواهید وضعیت انتشار این Workflow را تغییر دهید؟</p>
            <div className="flex gap-2">
              <button onClick={() => setShowPublish(false)} className="flex-1 bg-secondary text-foreground text-xs font-bold py-2 rounded-lg">انصراف</button>
              <button onClick={() => setShowPublish(false)} className="flex-1 bg-accent text-white text-xs font-bold py-2 rounded-lg">تأیید</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkflowPortal;
