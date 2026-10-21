import React, { useState } from 'react';
import { ShieldCheck, Users, Search, Filter, Key, Activity, Eye, FileText, Bell } from 'lucide-react';
import { useGovernanceStore } from '../store/useGovernanceStore';
import { useAuditStore } from '../store/useAuditStore';
import { DataTable, StatusBadge, StatCard } from './primitives';
import { formatJalaliDateTime } from '../utils/formatters';

export const GovernanceCenter: React.FC = () => {
  const { roles = [], users = [], notificationRules: rules = [] } = useGovernanceStore();
  const { logs: entries = [] } = useAuditStore();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit' | 'rules'>('users');

  return (
    <div className="space-y-6" dir="rtl">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="کاربران فعال" value={users.filter(u => u.isActive).length} icon={Users} colorClass="bg-blue-50 text-blue-600" />
        <StatCard title="نقش‌های سیستمی" value={roles.length} icon={Key} colorClass="bg-emerald-50 text-emerald-600" />
        <StatCard title="رویدادهای ثبت شده" value={entries.length} icon={Activity} colorClass="bg-indigo-50 text-indigo-600" />
        <StatCard title="قوانین اعلان" value={rules.filter(r => r.isActive).length} icon={Bell} colorClass="bg-amber-50 text-amber-600" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex px-4 pt-1 border-b border-gray-100 bg-gray-50/50 justify-between items-center">
          <div className="flex">
            {[
              { id: 'users', label: 'مدیریت کاربران', icon: Users },
              { id: 'roles', label: 'ماتریس دسترسی', icon: ShieldCheck },
              { id: 'rules', label: 'قوانین اطلاع‌رسانی', icon: Bell },
              { id: 'audit', label: 'لاگ حسابرسی', icon: FileText }
            ].map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-700 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              )
            })}
          </div>
          <div className="pb-2">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="جستجو..." className="w-48 pl-4 pr-10 py-1.5 bg-white border border-gray-200 rounded-lg text-sm outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
          </div>
        </div>

        <div className="p-4 bg-white">
          {activeTab === 'users' && (
            <DataTable
              data={users}
              columns={[
                { header: 'نام کاربری', accessorKey: 'username', cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span> },
                { header: 'نام و نام خانوادگی', accessorKey: 'fullName', cell: (info) => <span className="font-semibold text-gray-900">{info.getValue() as string}</span> },
                { header: 'ایمیل / تماس', accessorKey: 'email', cell: (info) => <span className="text-gray-500 text-xs">{info.getValue() as string}</span> },
                { header: 'شرکت / واحد', accessorKey: 'companyId', cell: (info) => info.getValue() === 'zm' ? <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">سازمان منطقه ویژه</span> : <span className="text-gray-600">شرکت اختصاصی</span> },
                {
                  header: 'نقش کاربری', accessorKey: 'roleId', cell: (info) => {
                    const role = roles.find(r => r.id === (info.getValue() as string));
                    return <span className="bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded text-[10px] text-gray-700">{role?.name || (info.getValue() as string)}</span>;
                  }
                },
                { header: 'وضعیت', accessorKey: 'isActive', cell: (info) => <StatusBadge status={info.getValue() ? 'active' : 'inactive'} label={info.getValue() ? 'فعال' : 'غیرفعال'} /> },
              ]}
            />
          )}

          {activeTab === 'roles' && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="p-3 border border-gray-200 font-semibold w-1/4">محدوده دسترسی (ماژول)</th>
                    {roles.map(r => (
                      <th key={r.id} className="p-3 border border-gray-200 font-semibold text-center align-bottom whitespace-nowrap">
                        <div className="flex flex-col items-center">
                          <ShieldCheck className="w-5 h-5 text-gray-400 mb-1" />
                          <span>{r.name}</span>
                          <span className="text-[10px] text-gray-500 mt-1 font-normal max-w-[120px] truncate">{r.description}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { id: 'companies', label: 'مدیریت متقاضیان و شرکت‌ها' },
                    { id: 'utilities', label: 'مدیریت یوتیلیتی و قبوض' },
                    { id: 'operations', label: 'مرکز عملیات و هشدارها' },
                    { id: 'hse', label: 'مدیریت HSE و ایمنی' },
                    { id: 'leases', label: 'مدیریت واگذاری و قراردادها' },
                    { id: 'governance', label: 'پیکربندی و نظارت سیستم' },
                  ].map(module => (
                    <tr key={module.id} className="hover:bg-gray-50">
                      <td className="p-3 border border-gray-200 font-medium text-gray-900 bg-gray-50/50">{module.label}</td>
                      {roles.map(r => {
                        const perms = r.permissions as unknown as string[];
                        const hasAll = perms.includes('*');
                        const canWrite = hasAll || perms.includes(`${module.id}:create`) || perms.includes(`${module.id}:approve`);
                        const canRead = hasAll || canWrite || perms.includes(`${module.id}:read`);
                        return (
                          <td key={r.id} className="p-3 border border-gray-200 text-center">
                            {canWrite ? (
                              <span className="inline-flex bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-1 rounded">خوانش + ویرایش</span>
                            ) : canRead ? (
                              <span className="inline-flex bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-1 rounded">فقط خواندن</span>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'audit' && (
            <DataTable
              data={entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
              columns={[
                { header: 'زمان رویداد', accessorKey: 'timestamp', cell: (info) => <span className="font-mono text-xs">{formatJalaliDateTime(info.getValue() as string)}</span> },
                {
                  header: 'کاربر', accessorKey: 'userId', cell: (info) => {
                    const u = users.find(x => x.id === info.getValue() as string);
                    return <span className="font-semibold text-gray-800">{u?.fullName || info.getValue() as string}</span>
                  }
                },
                {
                  header: 'نوع رویداد', accessorKey: 'action', cell: (info) => {
                    const a = info.getValue() as string;
                    return <span className={`text-[10px] px-2 py-0.5 rounded font-bold font-mono ${a === 'CREATE' ? 'bg-emerald-100 text-emerald-800' : a === 'UPDATE' ? 'bg-amber-100 text-amber-800' : a === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{a}</span>
                  }
                },
                { header: 'شناسه موجودیت', accessorKey: 'entityId', cell: (info) => <span className="font-mono text-xs text-gray-500">{info.getValue() as string}</span> },
                {
                  header: 'جزئیات تغییرات', accessorKey: 'changes', cell: (info) => {
                    const ch = info.getValue() as any;
                    return <div className="text-[10px] text-gray-500 max-w-sm truncate" dir="ltr">{ch ? JSON.stringify(ch) : '-'}</div>
                  }
                }
              ]}
            />
          )}

          {activeTab === 'rules' && (
            <DataTable
              data={rules}
              columns={[
                { header: 'نام قانون', accessorKey: 'name' },
                { header: 'شرط فعال‌ساز', accessorKey: 'condition', cell: (info) => <span className="font-mono text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded">{info.getValue() as string}</span> },
                { header: 'کانال ارتباطی', accessorKey: 'channels', cell: (info) => (info.getValue() as string[]).map(c => <span className="bg-gray-100 px-1.5 mx-0.5 rounded text-xs">{c}</span>) },
                { header: 'گیرندگان', accessorKey: 'recipients' },
                { header: 'وضعیت', accessorKey: 'isActive', cell: (info) => <StatusBadge status={info.getValue() ? 'active' : 'inactive'} label={info.getValue() ? 'فعال' : 'غیرفعال'} /> },
              ]}
            />
          )}
        </div>
      </div>
    </div>
  );
};
export default GovernanceCenter;
