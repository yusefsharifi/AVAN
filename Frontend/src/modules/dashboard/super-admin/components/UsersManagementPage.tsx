import { useState } from 'react';
import { useGovernanceStore } from '../store';
import { User } from '../types';
import { formatJalaliDate, getRelativeTime } from '../utils';
import { 
  Search, MoreVertical, UserPlus, Shield, Key, Lock, Unlock,
  LogOut, Mail, CheckCircle, XCircle, Pause, Play, Download
} from 'lucide-react';

export function UsersManagementPage() {
  const { 
    getFilteredUsers, 
    roles, 
    userFilters, 
    setUserFilters, 
    clearUserFilters,
    suspendUser,
    activateUser,
    lockUser,
    unlockUser,
    resetPassword,
    forceMFA,
    revokeAllSessions
  } = useGovernanceStore();
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  const users = getFilteredUsers();

  const getStatusBadge = (status: User['lifecycleStatus']) => {
    const config = {
      invited: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'دعوت شده' },
      pending_activation: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'در انتظار فعال‌سازی' },
      active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'فعال' },
      suspended: { bg: 'bg-red-100', text: 'text-red-700', label: 'تعلیق' },
      deactivated: { bg: 'bg-slate-100', text: 'text-slate-700', label: 'غیرفعال' },
      terminated: { bg: 'bg-slate-200', text: 'text-slate-500', label: 'خاتمه' },
    };
    const { bg, text, label } = config[status];
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>;
  };

  const handleAction = (userId: string, action: string) => {
    setOpenMenu(null);
    switch (action) {
      case 'suspend':
        suspendUser(userId);
        break;
      case 'activate':
        activateUser(userId);
        break;
      case 'lock':
        lockUser(userId);
        break;
      case 'unlock':
        unlockUser(userId);
        break;
      case 'resetPassword':
        resetPassword(userId);
        break;
      case 'forceMFA':
        forceMFA(userId);
        break;
      case 'revokeSessions':
        revokeAllSessions(userId);
        break;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">مدیریت کاربران</h1>
          <p className="text-slate-500 text-sm mt-1">مدیریت کاربران سامانه در سطح ملی</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" />
            خروجی
          </button>
          <button 
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600"
          >
            <UserPlus className="w-4 h-4" />
            کاربر جدید
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">{users.length}</p>
          <p className="text-sm text-slate-500">کل کاربران</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{users.filter(u => u.lifecycleStatus === 'active').length}</p>
          <p className="text-sm text-slate-500">فعال</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{users.filter(u => u.lifecycleStatus === 'suspended').length}</p>
          <p className="text-sm text-slate-500">تعلیق</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{users.filter(u => u.isLocked).length}</p>
          <p className="text-sm text-slate-500">قفل شده</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{users.filter(u => u.mfaRequired).length}</p>
          <p className="text-sm text-slate-500">MFA فعال</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={userFilters.searchQuery || ''}
              onChange={(e) => setUserFilters({ ...userFilters, searchQuery: e.target.value })}
              placeholder="جستجو نام، ایمیل..."
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Role Filter */}
          <select
            value={userFilters.roleId || ''}
            onChange={(e) => setUserFilters({ ...userFilters, roleId: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[150px]"
          >
            <option value="">همه نقش‌ها</option>
            {roles.map(r => (
              <option key={r.id} value={r.id}>{r.nameFa}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={userFilters.lifecycleStatus || ''}
            onChange={(e) => setUserFilters({ ...userFilters, lifecycleStatus: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[120px]"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="suspended">تعلیق</option>
            <option value="invited">دعوت شده</option>
            <option value="deactivated">غیرفعال</option>
          </select>

          {/* Clear */}
          {Object.keys(userFilters).length > 0 && (
            <button
              onClick={clearUserFilters}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">کاربر</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">نقش</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">وضعیت</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">MFA</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">آخرین ورود</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">تاریخ ایجاد</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">عملیات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((user) => (
              <tr key={user.id} className={`hover:bg-slate-50 ${user.isLocked ? 'bg-red-50/50' : ''}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.isLocked ? 'bg-red-100' : 'bg-slate-100'
                    }`}>
                      <span className="text-sm font-medium text-slate-600">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.firstName} {user.lastName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {user.email}
                        </span>
                        {user.isLocked && (
                          <span className="flex items-center gap-1 text-red-600">
                            <Lock className="w-3 h-3" />
                            قفل شده
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">{user.roleName}</span>
                  </div>
                </td>
                <td className="px-4 py-3">{getStatusBadge(user.lifecycleStatus)}</td>
                <td className="px-4 py-3">
                  {user.mfaRequired ? (
                    <span className="flex items-center gap-1 text-emerald-600 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      فعال
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-slate-400 text-sm">
                      <XCircle className="w-4 h-4" />
                      غیرفعال
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {user.lastLoginAt ? getRelativeTime(user.lastLoginAt) : '—'}
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatJalaliDate(user.createdAt, 'short')}
                </td>
                <td className="px-4 py-3">
                  <div className="relative flex justify-center">
                    <button
                      onClick={() => setOpenMenu(openMenu === user.id ? null : user.id)}
                      className="p-1 rounded hover:bg-slate-100"
                    >
                      <MoreVertical className="w-4 h-4 text-slate-500" />
                    </button>
                    {openMenu === user.id && (
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                          <UserPlus className="w-4 h-4" /> مشاهده پروفایل
                        </button>
                        <hr className="my-1" />
                        {user.lifecycleStatus === 'active' ? (
                          <button 
                            onClick={() => handleAction(user.id, 'suspend')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50"
                          >
                            <Pause className="w-4 h-4" /> تعلیق کاربر
                          </button>
                        ) : user.lifecycleStatus === 'suspended' ? (
                          <button 
                            onClick={() => handleAction(user.id, 'activate')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                          >
                            <Play className="w-4 h-4" /> فعال‌سازی
                          </button>
                        ) : null}
                        {user.isLocked ? (
                          <button 
                            onClick={() => handleAction(user.id, 'unlock')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50"
                          >
                            <Unlock className="w-4 h-4" /> باز کردن قفل
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleAction(user.id, 'lock')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Lock className="w-4 h-4" /> قفل کردن
                          </button>
                        )}
                        <hr className="my-1" />
                        <button 
                          onClick={() => handleAction(user.id, 'resetPassword')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <Key className="w-4 h-4" /> بازنشانی رمز
                        </button>
                        {!user.mfaRequired && (
                          <button 
                            onClick={() => handleAction(user.id, 'forceMFA')}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                          >
                            <Shield className="w-4 h-4" /> فعال‌سازی MFA اجباری
                          </button>
                        )}
                        <button 
                          onClick={() => handleAction(user.id, 'revokeSessions')}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                        >
                          <LogOut className="w-4 h-4" /> لغو همه نشست‌ها
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
