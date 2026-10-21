import { useMemo } from "react";
import {
  ChevronLeft, TrendingUp, TrendingDown, Clock, AlertCircle,
  CheckCircle2, Send, Inbox, FileText, BarChart3,
} from "lucide-react";
import { LETTERS_V2 } from "@/entities/letter";

interface StatsCard {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  trend?: { value: string; up: boolean };
}

interface StatisticsProps {
  onBack: () => void;
}

export function Statistics({ onBack }: StatisticsProps) {
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const receivedToday = LETTERS_V2.filter((l) => l.direction === "incoming" && l.createdAt === today).length;
    const sentToday = LETTERS_V2.filter((l) => l.direction === "outgoing" && l.status === "sent").length;
    const pendingApproval = LETTERS_V2.filter((l) => l.status === "pending-approval").length;
    const overdue = LETTERS_V2.filter((l) => {
      if (!l.responseDeadline || l.status === "archived" || l.status === "sent") return false;
      return new Date(l.responseDeadline) < new Date();
    }).length;
    const total = LETTERS_V2.length;
    const archived = LETTERS_V2.filter((l) => l.status === "archived").length;

    return { receivedToday, sentToday, pendingApproval, overdue, total, archived };
  }, []);

  const cards: StatsCard[] = [
    { label: "دریافتی امروز", value: stats.receivedToday, icon: Inbox, color: "text-blue-600", bgColor: "bg-blue-50", trend: { value: "+۱۲٪", up: true } },
    { label: "ارسالی امروز", value: stats.sentToday, icon: Send, color: "text-emerald-600", bgColor: "bg-emerald-50", trend: { value: "+۸٪", up: true } },
    { label: "در انتظار تأیید", value: stats.pendingApproval, icon: Clock, color: "text-amber-600", bgColor: "bg-amber-50", trend: { value: "-۵٪", up: false } },
    { label: "تأخیر در پاسخ", value: stats.overdue, icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50", trend: { value: "+۲", up: true } },
  ];

  // Mock chart data - monthly volume
  const monthlyData = [
    { month: "فروردین", received: 45, sent: 38 },
    { month: "اردیبهشت", received: 52, sent: 41 },
    { month: "خرداد", received: 38, sent: 35 },
    { month: "تیر", received: 61, sent: 48 },
    { month: "مرداد", received: 47, sent: 42 },
    { month: "شهریور", received: stats.receivedToday + 30, sent: stats.sentToday + 25 },
  ];

  const maxVal = Math.max(...monthlyData.map((d) => Math.max(d.received, d.sent)));

  // Response time compliance data
  const responseCompliance = [
    { range: "زیر ۲۴ ساعت", count: 18, color: "bg-emerald-500" },
    { range: "۲۴-۴۸ ساعت", count: 24, color: "bg-blue-500" },
    { range: "۴۸-۷۲ ساعت", count: 12, color: "bg-amber-500" },
    { range: "بیش از ۷۲ ساعت", count: 8, color: "bg-red-500" },
  ];
  const maxCompliance = Math.max(...responseCompliance.map((d) => d.count));

  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="border-b border-border bg-white px-6 py-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ChevronLeft className="w-3.5 h-3.5 rotate-180" />
            بازگشت
          </button>
          <h2 className="text-sm font-bold text-foreground">آمار و گزارش دبیرخانه</h2>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {cards.map((card) => (
            <div key={card.label} className="bg-white rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                {card.trend && (
                  <span className={`flex items-center gap-0.5 text-[10px] font-medium ${card.trend.up ? "text-red-600" : "text-emerald-600"}`}>
                    {card.trend.up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {card.trend.value}
                  </span>
                )}
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {/* Volume Trend Chart */}
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-foreground">روند حجم مکاتبات</h3>
            </div>
            <div className="flex items-end gap-3 h-48">
              {monthlyData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className="w-full flex items-end justify-center gap-1" style={{ height: "160px" }}>
                    <div className="w-4 rounded-t bg-blue-400" style={{ height: `${(d.received / maxVal) * 100}%` }} title={`دریافتی: ${d.received}`} />
                    <div className="w-4 rounded-t bg-emerald-400" style={{ height: `${(d.sent / maxVal) * 100}%` }} title={`ارسالی: ${d.sent}`} />
                  </div>
                  <span className="text-[9px] text-muted-foreground">{d.month}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-3">
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-blue-400" /><span className="text-[10px] text-muted-foreground">دریافتی</span></div>
              <div className="flex items-center gap-1"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-[10px] text-muted-foreground">ارسالی</span></div>
            </div>
          </div>

          {/* Response Time Compliance */}
          <div className="bg-white rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-4 h-4 text-accent" />
              <h3 className="text-xs font-bold text-foreground">انطباق زمان پاسخ‌دهی</h3>
            </div>
            <div className="space-y-3">
              {responseCompliance.map((d, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-muted-foreground">{d.range}</span>
                    <span className="text-[10px] font-medium text-foreground">{d.count} نامه</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div className={`h-2 rounded-full ${d.color}`} style={{ width: `${(d.count / maxCompliance) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">نرخ پاسخ‌دهی به‌موقع</span>
                <span className="text-sm font-bold text-emerald-600">۷۸٪</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary table */}
        <div className="bg-white rounded-xl border border-border p-4">
          <h3 className="text-xs font-bold text-foreground mb-4">خلاصه آماری</h3>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{stats.total.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] text-muted-foreground">کل نامه‌ها</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">{stats.archived.toLocaleString("fa-IR")}</p>
              <p className="text-[10px] text-muted-foreground">بایگانی شده</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">۷۸٪</p>
              <p className="text-[10px] text-muted-foreground">نرخ پاسخ‌دهی</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-lg font-bold text-foreground">۲.۳</p>
              <p className="text-[10px] text-muted-foreground">روز متوسط پاسخ</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
