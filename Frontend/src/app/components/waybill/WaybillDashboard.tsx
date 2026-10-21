import { useState } from "react";
import {
  Plus, Search, Filter, Truck, Package, Calculator,
  TrendingUp, TrendingDown, AlertTriangle, Check,
  Clock, User, MapPin, Phone, FileText, Download,
  ChevronLeft, ChevronRight, Eye, Edit2, Trash2,
  Settings, Workflow, BarChart2, PieChart, Activity,
} from "lucide-react";
import type { Waybill, WaybillScenario, ItemMasterData } from "./waybillTypes";
import {
  CURRENT_WAYBILL,
  WAYBILL_SCENARIOS,
  ITEM_MASTER_DATA,
  formatCurrency,
  getStatusColor,
  getStatusLabel,
} from "./waybillMockData";

/* ─── Stat Card Component ─── */
const StatCard = ({ 
  title, titleFa, value, change, icon: Icon, color,
  className,
}: {
  title: string;
  titleFa: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease" | "neutral";
    label: string;
  };
  icon: any;
  color: string;
  className?: string;
}) => (
  <div className={`bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 ${className}`}>
    <div className="flex items-center justify-between mb-2">
      <div className={`p-2 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      {change && (
        <div className="flex items-center gap-1 text-[10px] font-medium" dir="ltr">
          {change.type === "increase" ? (
            <TrendingUp className="w-3 h-3 text-emerald-600" />
          ) : change.type === "decrease" ? (
            <TrendingDown className="w-3 h-3 text-red-600" />
          ) : null}
          <span className={change.type === "increase" ? "text-emerald-600" : change.type === "decrease" ? "text-red-600" : "text-muted-foreground"}>
            {change.value > 0 ? `+${change.value}%` : `${change.value}%`}
          </span>
          <span className="text-muted-foreground text-[9px]">{change.label}</span>
        </div>
      )}
    </div>

    <div className="text-right">
      <p className="text-xs text-muted-foreground mb-1">{titleFa}</p>
      <p className="text-xl font-bold text-foreground font-mono" dir="ltr">
        {value}
      </p>
      <p className="text-xs font-medium text-foreground mt-1">{title}</p>
    </div>
  </div>
);

/* ─── Status Distribution Component ─── */
const StatusDistribution = () => {
  const statusData = [
    { status: "draft", count: 3, color: "bg-slate-500" },
    { status: "submitted", count: 7, color: "bg-amber-500" },
    { status: "technical_verified", count: 5, color: "bg-blue-500" },
    { status: "manager_approved", count: 4, color: "bg-emerald-500" },
    { status: "security_verified", count: 6, color: "bg-purple-500" },
    { status: "completed", count: 12, color: "bg-green-500" },
    { status: "rejected", count: 2, color: "bg-red-500" },
    { status: "empty_exit", count: 1, color: "bg-orange-500" },
  ];

  const total = statusData.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4 text-right">
        توزیع وضعیت‌های بارنامه
      </h3>
      <div className="space-y-2">
        {statusData.map((item) => {
          const percentage = (item.count / total) * 100;
          return (
            <div key={item.status} className="flex items-center gap-2">
              <div className="flex items-center gap-1 flex-1">
                <div className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                <span className="text-xs text-muted-foreground">پسوند{getStatusLabel(item.status)}</span>
              </div>
              <div className="w-32 bg-secondary rounded-full h-1.5 overflow-hidden">
                <div
                  className={`${item.color} h-full transition-all duration-300`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-[10px] font-mono text-foreground" dir="ltr">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── Quick Action Card Component ─── */
const QuickActionCard = ({ 
  title, titleFa, icon: Icon, color, onClick,
}: {
  title: string;
  titleFa: string;
  icon: any;
  color: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4 hover:scale-105 transition-all duration-200 cursor-pointer group"
  >
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-lg ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-right flex-1">
        <p className="text-sm font-semibold text-foreground">{titleFa}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
      </div>
      <ChevronLeft className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </div>
  </button>
);

export default function WaybillDashboard() {
  const [activeScenario, setActiveScenario] = useState(WAYBILL_SCENARIOS.find((s) => s.isDefault)?.id || "");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });

  /* ─── Computed values ─── */
  const filteredWaybills = CURRENT_WAYBILL;

  const stats = {
    total: filteredWaybills.length,
    draft: filteredWaybills.filter((w) => w.status === "draft").length,
    submitted: filteredWaybills.filter((w) => w.status === "submitted").length,
    inProcess: filteredWaybills.filter((w) => w.status !== "draft" && w.status !== "completed").length,
    completed: filteredWaybills.filter((w) => w.status === "completed").length,
  };

  const formatWeight = (weight: number) => {
    return weight.toLocaleString("fa-IR");
  };

  const getCategoryDistribution = () => {
    const categories = CURRENT_WAYBILL.items.reduce((acc, item) => {
      const category = item.categoryName || "سایر";
      acc[category] = (acc[category] || 0) + item.weight;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(categories).map(([name, weight]) => ({ name, weight }));
  };

  const categoryData = getCategoryDistribution();

  /* ─── Render ─── */
  return (
    <div className="h-full flex flex-col p-6 space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">مدیریت بارنامه</h1>
          <p className="text-sm text-muted-foreground mt-1">
            مدیریت و کنترل تمام فرآیندهای تایید کالا
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span>بارنامه جدید</span>
          </button>
          <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors">
            <Download className="w-4 h-4" />
            <span>خروجی CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard
          titleFa="پیش‌نویس"
          title="پیش‌نویس"
          value={stats.draft}
          icon={Edit2}
          color="bg-slate-100 text-slate-600"
        />
        <StatCard
          titleFa="در انتظار تأیید"
          title="فرآیند در انتظار"
          value={stats.submitted}
          icon={Clock}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          titleFa="در حال پردازش"
          title="در حال پردازش"
          value={stats.inProcess}
          change={{ value: 12, type: "increase", label: "شب گذشته" }}
          icon={Activity}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          titleFa="تأیید شده"
          title="تأیید شده"
          value={stats.completed}
          change={{ value: 8, type: "increase", label: "شب گذشته" }}
          icon={Check}
          color="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          titleFa="رد شده"
          title="رد شده"
          value={stats.total - stats.completed}
          change={{ value: 3, type: "decrease", label: "شب گذشته" }}
          icon={AlertTriangle}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Left Panel: Quick Actions */}
        <div className="col-span-1 space-y-4 overflow-auto">
          <h2 className="text-base font-semibold text-foreground sticky top-0 bg-background pb-2">
            عملیات سریع
          </h2>

          <QuickActionCard
            titleFa="ایجاد بارنامه جدید"
            title="ایجاد بارنامه با مجموعه کالاهای از پیش تعریف‌شده"
            icon={Plus}
            color="bg-blue-100 text-blue-600"
            onClick={() => {}}
          />
          <QuickActionCard
            titleFa="ورود داده‌های بارنامه از CSV"
            title="آوردن تعداد دفعات کالا و وزن"
            icon={Download}
            color="bg-emerald-100 text-emerald-600"
            onClick={() => {}}
          />
          <QuickActionCard
            titleFa="شروع عملیات خروجی کالا"
            title="شروع کنترل خروجی کالا از طریق گیت"
            icon={Truck}
            color="bg-purple-100 text-purple-600"
            onClick={() => {}}
          />
          <QuickActionCard
            titleFa="سنجش داده‌های تأیید"
            title="تحلیل داده‌های مرحله‌های تأیید"
            icon={BarChart2}
            color="bg-amber-100 text-amber-600"
            onClick={() => {}}
          />
          <QuickActionCard
            titleFa="ویرایش تنظیمات سناریو"
            title="ویرایش تنظیمات فرآیندکار"
            icon={Settings}
            color="bg-slate-100 text-slate-600"
            onClick={() => {}}
          />
          <QuickActionCard
            titleFa="مدیریت شرکت‌ها"
            title="مدیریت پروفایل شرکت‌ها و مجوزها"
            icon={User}
            color="bg-orange-100 text-orange-600"
            onClick={() => {}}
          />
        </div>

        {/* Middle Panel: Status Distribution */}
        <div className="col-span-1 overflow-hidden">
          <StatusDistribution />
        </div>

        {/* Right Panel: Category Distribution */}
        <div className="col-span-1 bg-card rounded-xl border border-border shadow-[0_2px_12px_rgba(0,0,0,0.05)] p-4">
          <h3 className="text-sm font-semibold text-foreground mb-4 text-right">
            توزیع کاتاگوری‌ها (بر اساس وزن)
          </h3>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {categoryData.map((item, index) => {
              const maxWeight = Math.max(...categoryData.map((d) => d.weight));
              const percentage = maxWeight > 0 ? (item.weight / maxWeight) * 100 : 0;

              return (
                <div key={index} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {item.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
                        {formatWeight(item.weight)}
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}