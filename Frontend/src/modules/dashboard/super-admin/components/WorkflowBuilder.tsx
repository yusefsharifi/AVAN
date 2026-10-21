import { useState } from "react";
import { Plus, Download, Edit2, Eye, History, AlertTriangle, Workflow, Play, Pause, RotateCcw, GitCompareArrows, FileText } from "lucide-react";
import { Badge } from "@/shared/components/feedback";
import { WF_NODES, WF_EDGES, WF_NODE_LIB, SIM_TIMELINE, WF_VERSION_HISTORY, WORKFLOW_LIBRARY, WF_CATEGORY_CFG, WF_VALIDATION_ISSUES, WF_HISTORY_LIST } from "@/entities/workflow";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
const nodeShape: Record<string, { rx: number; ry: number; fill: string; stroke: string }> = {
  "start": { rx: 18, ry: 18, fill: "#0E7C86", stroke: "#0E7C86" },
  "end-success": { rx: 18, ry: 18, fill: "#10B981", stroke: "#10B981" },
  "end-rejected": { rx: 18, ry: 18, fill: "#EF4444", stroke: "#EF4444" },
  "human": { rx: 6, ry: 6, fill: "#F2A541", stroke: "#F2A541" },
  "approval": { rx: 6, ry: 6, fill: "#0E7C86", stroke: "#0E7C86" },
  "review": { rx: 6, ry: 6, fill: "#3FA7B3", stroke: "#3FA7B3" },
  "automated": { rx: 6, ry: 6, fill: "#8B5CF6", stroke: "#8B5CF6" },
  "xor": { rx: 0, ry: 0, fill: "none", stroke: "#F2A541" },
  "and": { rx: 0, ry: 0, fill: "none", stroke: "#0E7C86" },
  "timer": { rx: 6, ry: 6, fill: "#6366F1", stroke: "#6366F1" },
  "notification": { rx: 6, ry: 6, fill: "#EC4899", stroke: "#EC4899" },
};

const fmt = (n: number) => n.toLocaleString("fa-IR");

type WFTab = "canvas" | "templates" | "versions" | "sim";

export default function WorkflowBuilder() {
  const [wfTab, setWfTab] = useState<WFTab>("canvas");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [simRunning, setSimRunning] = useState(false);
  const [simStep, setSimStep] = useState(0);

  const getNodeById = (id: string) => WF_NODES.find(n => n.id === id);
  const selNode = selectedNode ? getNodeById(selectedNode) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors"><Plus className="w-3.5 h-3.5" /><span>گردش کار جدید</span></button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"><Download className="w-3.5 h-3.5" /><span>خروجی</span></button>
        </div>
        <h1 className="text-sm font-semibold text-foreground">طراح گردش کار</h1>
      </div>

      <Tabs value={wfTab} onValueChange={v => setWfTab(v as WFTab)}>
        <TabsList>
          <TabsTrigger value="canvas">بوم BPMN</TabsTrigger>
          <TabsTrigger value="templates">کتابخانه قالب‌ها</TabsTrigger>
          <TabsTrigger value="versions">تاریخخه نسخه‌ها</TabsTrigger>
          <TabsTrigger value="sim">شبیه‌سازی</TabsTrigger>
        </TabsList>

        <TabsContent value="canvas">
          <div className="grid gap-5" style={{ gridTemplateColumns: "200px 1fr 220px" }}>
            {/* Node Library */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-3 self-start">
              <p className="text-xs font-semibold text-foreground text-right">کتابخانه گره‌ها</p>
              {WF_NODE_LIB.map(cat => (
                <div key={cat.cat}>
                  <p className="text-[10px] text-muted-foreground text-right mb-1">{cat.cat}</p>
                  <div className="space-y-1">
                    {cat.items.map(item => (
                      <div key={item.kind} className="flex items-center gap-2 px-2 py-1.5 rounded-lg border border-border hover:bg-secondary/50 cursor-pointer transition-colors">
                        <span className="text-sm">{item.emoji}</span>
                        <span className="text-[11px] text-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* BPMN Canvas */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
              <div className="p-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary">ذخیره</button>
                  <button className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary">لغو</button>
                </div>
                <span className="text-xs text-muted-foreground">تأیید بارنامه خطرناک — v5</span>
              </div>
              <div className="relative" style={{ height: 420, background: "#F8FAFC" }}>
                <svg viewBox="0 0 1000 400" className="w-full h-full">
                  {/* Edges */}
                  {WF_EDGES.map((e, i) => {
                    const from = getNodeById(e.from);
                    const to = getNodeById(e.to);
                    if (!from || !to) return null;
                    const x1 = from.x + 40, y1 = from.y + 20, x2 = to.x + 40, y2 = to.y + 20;
                    const mx = (x1 + x2) / 2;
                    return (
                      <g key={i}>
                        <path d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none" stroke="#CBD5E1" strokeWidth={2} markerEnd="url(#arrowhead)" />
                        {e.label && (
                          <text x={mx} y={(y1 + y2) / 2 - 8} textAnchor="middle" className="text-[10px] fill-muted-foreground">{e.label}</text>
                        )}
                      </g>
                    );
                  })}
                  <defs>
                    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                      <polygon points="0 0, 8 3, 0 6" fill="#CBD5E1" />
                    </marker>
                  </defs>
                  {/* Nodes */}
                  {WF_NODES.map(n => {
                    const cfg = nodeShape[n.kind] || nodeShape.human;
                    const isSelected = selectedNode === n.id;
                    const isDiamond = n.kind === "xor" || n.kind === "and";
                    return (
                      <g key={n.id} transform={`translate(${n.x},${n.y})`} className="cursor-pointer" onClick={() => setSelectedNode(n.id)}>
                        {isDiamond ? (
                          <polygon points="40,0 80,20 40,40 0,20" fill="white" stroke={cfg.stroke} strokeWidth={isSelected ? 3 : 2} />
                        ) : (
                          <rect width="80" height="40" rx={cfg.rx} fill={cfg.fill} stroke={isSelected ? "#1E40AF" : cfg.stroke} strokeWidth={isSelected ? 3 : 2} />
                        )}
                        <text x="40" y={isDiamond ? 24 : 24} textAnchor="middle" className={`text-[10px] font-medium ${isDiamond ? "fill-foreground" : "fill-white"}`}>{n.title}</text>
                        {isSelected && <rect width="84" height="44" x="-2" y="-2" rx={isDiamond ? 0 : cfg.rx + 2} fill="none" stroke="#3B82F6" strokeWidth={2} strokeDasharray="4 2" />}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>

            {/* Node Config Panel */}
            <div className="bg-card rounded-xl border border-border p-4 space-y-4 self-start">
              <p className="text-xs font-semibold text-foreground text-right">پیکربندی گره</p>
              {selNode ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-secondary/40 text-right">
                    <p className="text-sm font-bold text-foreground">{selNode.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 font-mono" dir="ltr">نوع: {selNode.kind}</p>
                  </div>
                  {selNode.person && (
                    <div className="text-right">
                      <label className="text-[10px] text-muted-foreground mb-1 block">عهده‌دار</label>
                      <input defaultValue={selNode.person} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent" />
                    </div>
                  )}
                  {selNode.sla && (
                    <div className="text-right">
                      <label className="text-[10px] text-muted-foreground mb-1 block">SLA</label>
                      <input defaultValue={selNode.sla} className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent" dir="rtl" />
                    </div>
                  )}
                  <div className="text-right">
                    <label className="text-[10px] text-muted-foreground mb-1 block">امضای دیجیتال</label>
                    <select className="w-full bg-secondary border border-border rounded-lg py-1.5 px-2.5 text-xs text-foreground focus:outline-none focus:border-accent">
                      <option>غیرفعال</option>
                      <option>اجباری</option>
                      <option>اختیاری</option>
                    </select>
                  </div>
                  <div className="text-right">
                    <label className="text-[10px] text-muted-foreground mb-1 block">اعلان‌ها</label>
                    <div className="space-y-1">
                      {["شروع مرحله", "اتمام SLA", "ارجاع"].map(t => (
                        <label key={t} className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                          <input type="checkbox" defaultChecked={t !== "ارجاع"} className="rounded border-border" />
                          <span>{t}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-8">یک گره را برای پیکربندی انتخاب کنید</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="templates">
          <div className="grid grid-cols-3 gap-4">
            {WORKFLOW_LIBRARY.map(wf => {
              const cat = WF_CATEGORY_CFG[wf.category];
              return (
                <div key={wf.id} className="bg-card rounded-xl border border-border shadow-sm p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: `${cat.color}15`, color: cat.color }}>{cat.fa}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">v{wf.version}</span>
                  </div>
                  <h4 className="text-sm font-bold text-foreground text-right mb-1">{wf.title}</h4>
                  <p className="text-[11px] text-muted-foreground text-right leading-relaxed mb-3">{wf.desc}</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-secondary/40 rounded p-1.5">
                      <p className="text-xs font-bold text-foreground" dir="ltr">{wf.activeInstances}</p>
                      <p className="text-[9px] text-muted-foreground">instanc</p>
                    </div>
                    <div className="bg-secondary/40 rounded p-1.5">
                      <p className="text-xs font-bold text-foreground">{wf.avgTime}</p>
                      <p className="text-[9px] text-muted-foreground">زمان متوسط</p>
                    </div>
                    <div className="bg-secondary/40 rounded p-1.5">
                      <p className={`text-xs font-bold ${wf.successRate >= 95 ? "text-emerald-600" : wf.successRate >= 85 ? "text-amber-600" : "text-red-600"}`} dir="ltr">{wf.successRate}%</p>
                      <p className="text-[9px] text-muted-foreground">موفقیت</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <button className="flex-1 py-1.5 rounded-lg border border-border text-[11px] text-muted-foreground hover:bg-secondary transition-colors">ویرایش</button>
                    <button className="flex-1 py-1.5 rounded-lg bg-accent text-white text-[11px] font-semibold hover:bg-accent/90 transition-colors">استفاده</button>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="versions">
          <div className="space-y-4">
            {Object.entries(WF_VERSION_HISTORY).map(([wfId, versions]) => (
              <div key={wfId} className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border text-right"><h3 className="text-sm font-semibold text-foreground">{wfId === "wf1" ? "تأیید بارنامه خطرناک" : "مکاتبه رسمی خروجی"}</h3></div>
                <div className="divide-y divide-border">
                  {versions.map((v, i) => (
                    <div key={v.version} className="p-4 flex items-center gap-4 hover:bg-secondary/20 transition-colors">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-mono text-accent font-bold" dir="ltr">v{v.version}</span>
                        {i === 0 && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">فعلی</span>}
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-xs font-medium text-foreground">{v.changeNote}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{v.editedBy} · {v.date}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {i < versions.length - 1 && (
                          <button className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary transition-colors">
                            <GitCompareArrows className="w-3 h-3" />
                            <span>مقایسه</span>
                          </button>
                        )}
                        <button className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-secondary transition-colors">
                          <Eye className="w-3 h-3" />
                          <span>مشاهده</span>
                        </button>
                        {i > 0 && (
                          <button className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-accent text-accent hover:bg-accent/10 transition-colors">
                            <RotateCcw className="w-3 h-3" />
                            <span>بازگردانی</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sim">
          <div className="bg-card rounded-xl border border-border shadow-sm p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <button onClick={() => { setSimRunning(!simRunning); if (!simRunning) setSimStep(0); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${simRunning ? "bg-red-500 text-white hover:bg-red-600" : "bg-accent text-white hover:bg-accent/90"}`}>
                  {simRunning ? <><Pause className="w-3.5 h-3.5" /><span>توقف</span></> : <><Play className="w-3.5 h-3.5" /><span>شروع شبیه‌سازی</span></>}
                </button>
                <button onClick={() => { setSimRunning(false); setSimStep(0); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors"><RotateCcw className="w-3.5 h-3.5" /><span>بازنشانی</span></button>
              </div>
              <h3 className="text-sm font-semibold text-foreground">شبیه‌سازی: تأیید بارنامه خطرناک</h3>
            </div>
            {/* Timeline */}
            <div className="space-y-3">
              {SIM_TIMELINE.map((step, i) => (
                <div key={i} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${i <= simStep ? (step.ok ? "border-emerald-200 bg-emerald-50/50" : "border-red-200 bg-red-50/50") : "border-border bg-secondary/20"}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${i <= simStep ? (step.ok ? "bg-emerald-500" : "bg-red-500") : "bg-secondary"}`}>
                    {i <= simStep ? (step.ok ? <span className="text-white text-sm">✓</span> : <span className="text-white text-sm">✗</span>) : <span className="text-muted-foreground text-xs font-bold">{i + 1}</span>}
                  </div>
                  <div className="flex-1 text-right">
                    <p className="text-sm font-semibold text-foreground">{step.stage}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">مدت واقعی: <span className="font-mono" dir="ltr">{step.time}</span> · SLA: <span className="font-mono" dir="ltr">{step.sla}</span></p>
                  </div>
                  {i <= simStep && (
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${step.ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>
                      {step.ok ? "در زمان" : "تأخیر"}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {simRunning && simStep < SIM_TIMELINE.length - 1 && (
              <button onClick={() => setSimStep(s => s + 1)} className="mt-4 w-full py-2 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-colors">مرحله بعدی</button>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}