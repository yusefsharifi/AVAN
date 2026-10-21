import { useState } from 'react';
import { useNationalCompanyStore, useNationalStore } from '../store';
import { NationalCompany } from '../types';
import { formatPersianNumber, formatPersianCurrency } from '../utils';
import { 
  Search, Download, MoreVertical, Building2, MapPin, 
  Users, LayoutGrid, Table, Map, ChevronLeft, Eye, Edit, Pause, Play, Trash2
} from 'lucide-react';

export function NationalCompanyRegistry() {
  const { 
    getFilteredCompanies, 
    filters, 
    setFilters, 
    searchQuery, 
    setSearchQuery,
    viewMode,
    setViewMode,
    clearFilters
  } = useNationalCompanyStore();
  const { parks } = useNationalStore();
  
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  
  const companies = getFilteredCompanies();

  const getStatusBadge = (status: NationalCompany['lifecycleStatus']) => {
    const styles = {
      draft: 'bg-slate-100 text-slate-700',
      under_review: 'bg-blue-100 text-blue-700',
      active: 'bg-emerald-100 text-emerald-700',
      suspended: 'bg-red-100 text-red-700',
      terminated: 'bg-slate-200 text-slate-500',
    };
    const labels = {
      draft: 'پیش‌نویس',
      under_review: 'در بررسی',
      active: 'فعال',
      suspended: 'تعلیق',
      terminated: 'خاتمه',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-100';
    if (score >= 60) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  const industries = [
    { id: 'manufacturing', label: 'تولیدی' },
    { id: 'chemical', label: 'شیمیایی' },
    { id: 'food', label: 'صنایع غذایی' },
    { id: 'textile', label: 'نساجی' },
    { id: 'automotive', label: 'قطعات خودرو' },
    { id: 'electronics', label: 'الکترونیک' },
    { id: 'pharmaceutical', label: 'دارویی' },
    { id: 'metal', label: 'فلزات' },
    { id: 'plastic', label: 'پلاستیک' },
    { id: 'other', label: 'سایر' },
  ];

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">ثبت ملی شرکت‌ها</h1>
          <p className="text-slate-500 text-sm mt-1">
            {formatPersianNumber(companies.length)} شرکت از {formatPersianNumber(useNationalCompanyStore.getState().companies.length)} شرکت
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 bg-white rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            <Download className="w-4 h-4" />
            خروجی
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600">
            <Building2 className="w-4 h-4" />
            ثبت شرکت جدید
          </button>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو نام، کد یا شناسه..."
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            />
          </div>

          {/* Park Filter */}
          <select
            value={filters.parkId || ''}
            onChange={(e) => setFilters({ ...filters, parkId: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[150px]"
          >
            <option value="">همه شهرک‌ها</option>
            {parks.map(p => (
              <option key={p.id} value={p.id}>{p.nameFa}</option>
            ))}
          </select>

          {/* Industry Filter */}
          <select
            value={filters.industry || ''}
            onChange={(e) => setFilters({ ...filters, industry: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[120px]"
          >
            <option value="">همه صنایع</option>
            {industries.map(i => (
              <option key={i.id} value={i.id}>{i.label}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filters.lifecycleStatus || ''}
            onChange={(e) => setFilters({ ...filters, lifecycleStatus: e.target.value || undefined })}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[100px]"
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="active">فعال</option>
            <option value="suspended">تعلیق</option>
            <option value="draft">پیش‌نویس</option>
          </select>

          {/* Clear */}
          {(searchQuery || Object.keys(filters).length > 0) && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
            >
              پاک کردن فیلترها
            </button>
          )}

          {/* View Mode */}
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden mr-auto">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 ${viewMode === 'table' ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Table className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`p-2 ${viewMode === 'card' ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`p-2 ${viewMode === 'map' ? 'bg-amber-100 text-amber-600' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Map className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">شرکت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">شهرک</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">صنعت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">وضعیت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">امتیاز سلامت</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">کارکنان</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-slate-500">مطالبات معوق</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-slate-500">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{company.nameFa}</p>
                        <p className="text-xs text-slate-500">{company.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <MapPin className="w-3 h-3" />
                      {company.parkName.replace('شهرک صنعتی ', '')}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {industries.find(i => i.id === company.industry)?.label || company.industry}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(company.lifecycleStatus)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${getHealthScoreColor(company.healthScore.overall)}`}>
                      {formatPersianNumber(company.healthScore.overall)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Users className="w-3 h-3" />
                      {formatPersianNumber(company.employeeCount)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {company.finance.overdueReceivables > 0 ? (
                      <span className="text-red-600 text-sm font-medium">
                        {formatPersianCurrency(company.finance.overdueReceivables)}
                      </span>
                    ) : (
                      <span className="text-emerald-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="relative flex justify-center">
                      <button
                        onClick={() => setOpenMenu(openMenu === company.id ? null : company.id)}
                        className="p-1 rounded hover:bg-slate-100"
                      >
                        <MoreVertical className="w-4 h-4 text-slate-500" />
                      </button>
                      {openMenu === company.id && (
                        <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg z-10">
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            <Eye className="w-4 h-4" /> مشاهده
                          </button>
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                            <Edit className="w-4 h-4" /> ویرایش
                          </button>
                          {company.lifecycleStatus === 'active' ? (
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 hover:bg-amber-50">
                              <Pause className="w-4 h-4" /> تعلیق
                            </button>
                          ) : (
                            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-emerald-600 hover:bg-emerald-50">
                              <Play className="w-4 h-4" /> فعال‌سازی
                            </button>
                          )}
                          <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" /> حذف
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
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((company) => (
            <div key={company.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-slate-500" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{company.nameFa}</p>
                    <p className="text-xs text-slate-500">{company.code}</p>
                  </div>
                </div>
                {getStatusBadge(company.lifecycleStatus)}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">شهرک:</span>
                  <span className="text-slate-700">{company.parkName.replace('شهرک صنعتی ', '')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">صنعت:</span>
                  <span className="text-slate-700">{industries.find(i => i.id === company.industry)?.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">کارکنان:</span>
                  <span className="text-slate-700">{formatPersianNumber(company.employeeCount)} نفر</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className={`px-3 py-1 rounded-full text-sm font-bold ${getHealthScoreColor(company.healthScore.overall)}`}>
                  امتیاز: {formatPersianNumber(company.healthScore.overall)}
                </div>
                <button className="flex items-center gap-1 text-amber-600 text-sm font-medium hover:underline">
                  جزئیات
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Map View Placeholder */}
      {viewMode === 'map' && (
        <div className="bg-white rounded-xl border border-slate-200 p-8 shadow-sm text-center">
          <Map className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600">نقشه ملی شرکت‌ها</h3>
          <p className="text-slate-400 mt-2">نمایش موقعیت جغرافیایی شرکت‌ها روی نقشه (در حال توسعه)</p>
        </div>
      )}
    </div>
  );
}
