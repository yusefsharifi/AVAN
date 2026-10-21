import React, { useState } from 'react';
import { AlertTriangle, Activity, Bell, CheckCircle, ShieldAlert, Zap, Truck, BookX, Settings, UserPlus, Filter, ShieldCheck, Clock } from 'lucide-react';
import { useOperationsStore } from '../store/useOperationsStore';
import { useToastStore } from '../store/useToastStore';
import { StatCard, StatusBadge } from './primitives';
import { formatPersianNumber, formatJalaliDateTime } from '../utils/formatters';
import type { AlertStatus } from '../types';

export const OperationsCenter: React.FC = () => {
  const { alerts, tasks, updateAlert, updateTask } = useOperationsStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'alerts' | 'tasks'>('alerts');
  const [alertFilter, setAlertFilter] = useState<AlertStatus | 'all'>('all');

  const filteredAlerts = alerts.filter(a => alertFilter === 'all' || a.status === alertFilter);

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'resolved');

  const handleStartTask = (id: string) => {
    updateTask(id, { status: 'in_progress' });
    addToast({ type: 'info', title: 'تغییر وضعیت', message: 'وظیفه در حال انجام است.' });
  };

  const handleCompleteTask = (id: string) => {
    updateTask(id, { status: 'completed' });
    addToast({ type: 'success', title: 'انجام شد', message: 'وظیفه با موفقیت بسته شد.' });
  };

  const handleStartAlert = (id: string) => {
    updateAlert(id, { status: 'investigating' });
    addToast({ type: 'info', title: 'شروع رسیدگی', message: 'وضعیت هشدار به در حال بررسی تغییر یافت.' });
  };

  const handleResolveAlert = (id: string) => {
    updateAlert(id, { status: 'resolved', resolvedAt: new Date().toISOString() });
    addToast({ type: 'success', title: 'رفع هشدار', message: 'هشدار حل شده در نظر گرفته شد.' });
  };

  const alertIcon = (type: string) => {
    switch (type) {
      case 'security': return <ShieldAlert className="w-5 h-5 text-red-500" />;
      case 'utility': return <Zap className="w-5 h-5 text-blue-500" />;
      case 'hse': return <Activity className="w-5 h-5 text-emerald-500" />;
      case 'logistics': return <Truck className="w-5 h-5 text-amber-500" />;
      case 'finance': return <CheckCircle className="w-5 h-5 text-cyan-500" />;
      default: return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="هشدارهای باز" value={alerts.filter(a => a.status === 'open').length} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" />
        <StatCard title="در حال رسیدگی" value={alerts.filter(a => a.status === 'investigating').length} icon={Activity} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="وظایف باز" value={pendingTasks.length + inProgressTasks.length} icon={Settings} colorClass="bg-amber-50 text-amber-600" />
        <StatCard title="وظایف انجام شده" value={completedTasks.length} icon={CheckCircle} colorClass="bg-emerald-50 text-emerald-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-100 flex items-center px-4 pt-1">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'alerts' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            داشبورد هشدارها
          </button>
          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'tasks' ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            بورد وظایف (کانبان)
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Filter className="w-4 h-4" /> فیلتر بر اساس:
                </div>
                <select
                  className="px-3 py-1.5 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={alertFilter}
                  onChange={(e) => setAlertFilter(e.target.value as any)}
                >
                  <option value="all">همه هشدارها</option>
                  <option value="open">باز (اقدام نشده)</option>
                  <option value="investigating">در حال بررسی</option>
                  <option value="resolved">رفع شده</option>
                </select>
              </div>

              <div className="grid gap-3">
                {filteredAlerts.map(alert => (
                  <div key={alert.id} className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors bg-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2.5 rounded-lg bg-gray-50 border border-gray-100 flex-shrink-0">
                          {alertIcon(alert.type)}
                        </div>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                            <StatusBadge status={alert.status} />
                            {alert.severity === 'critical' && <StatusBadge status="critical" label="بحرانی" className="bg-red-100 text-red-800 border border-red-200" />}
                          </div>
                          <p className="text-sm text-gray-600 mb-2 leading-relaxed max-w-3xl">{alert.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-500 font-mono">
                            <span>کد رهگیری: {alert.alertNumber}</span>
                            <span>ایجاد: {formatJalaliDateTime(alert.createdAt)}</span>
                            {alert.companyName && <span>مکان: {alert.companyName} ({alert.zone})</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        {alert.status === 'open' && (
                          <button onClick={() => handleStartAlert(alert.id)} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm whitespace-nowrap">
                            شروع رسیدگی
                          </button>
                        )}
                        {alert.status === 'investigating' && (
                          <button onClick={() => handleResolveAlert(alert.id)} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium transition-colors shadow-sm whitespace-nowrap">
                            تأیید رفع مشکل
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {filteredAlerts.length === 0 && <p className="text-center text-gray-500 py-6">موردی یافت نشد.</p>}
              </div>
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Backlog / Pending */}
              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" /> در انتظار اقدام
                  </h3>
                  <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded-full font-mono">{formatPersianNumber(pendingTasks.length)}</span>
                </div>
                <div className="space-y-3">
                  {pendingTasks.map((t) => (
                    <div key={t.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm hover:shadow relative group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-amber-400 rounded-r-lg" />
                      <div className="mr-2">
                        <p className="text-xs text-gray-500 font-mono mb-1">{t.taskNumber}</p>
                        <p className="font-bold text-sm text-gray-800 mb-2">{t.title}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{t.assignedTeam}</span>
                          <button onClick={() => handleStartTask(t.id)} className="text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 font-medium">شروع کار</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* In Progress */}
              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" /> در حال انجام
                  </h3>
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-mono">{formatPersianNumber(inProgressTasks.length)}</span>
                </div>
                <div className="space-y-3">
                  {inProgressTasks.map((t) => (
                    <div key={t.id} className="bg-white p-3 rounded-lg border border-blue-200 shadow-sm hover:shadow relative group">
                      <div className="absolute top-0 right-0 w-1 h-full bg-blue-500 rounded-r-lg" />
                      <div className="mr-2">
                        <p className="text-xs text-blue-600/70 font-mono mb-1">{t.taskNumber}</p>
                        <p className="font-bold text-sm text-gray-800 mb-2">{t.title}</p>
                        <div className="space-y-1 mb-3">
                          {t.checklist.map(c => (
                            <div key={c.id} className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-sm border ${c.completed ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`} />
                              <span className={`text-[11px] ${c.completed ? 'text-gray-400 line-through' : 'text-gray-600'}`}>{c.text}</span>
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-between items-center border-t border-gray-100 pt-2">
                          <span className="text-[10px] text-gray-500">{t.assignedUser}</span>
                          <button onClick={() => handleCompleteTask(t.id)} className="text-[10px] bg-emerald-50 py-1 px-2 text-emerald-700 hover:bg-emerald-100 rounded font-medium">پایان کار</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Done */}
              <div className="flex-1 bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> انجام شده
                  </h3>
                  <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-mono">{formatPersianNumber(completedTasks.length)}</span>
                </div>
                <div className="space-y-3">
                  {completedTasks.slice(0, 5).map((t) => (
                    <div key={t.id} className="bg-white p-3 rounded-lg border border-emerald-100 opacity-70 hover:opacity-100 transition-opacity">
                      <p className="font-medium text-sm text-gray-700 line-through mb-1">{t.title}</p>
                      <p className="text-[10px] text-gray-400">بسته شده توسط {t.assignedUser}</p>
                    </div>
                  ))}
                  {completedTasks.length > 5 && (
                    <p className="text-xs text-center text-gray-500">و {formatPersianNumber(completedTasks.length - 5)} مورد دیگر...</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
