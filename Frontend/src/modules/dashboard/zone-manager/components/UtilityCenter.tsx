import React, { useState, useMemo } from 'react';
import { Zap, Droplet, Flame, FileText, CheckCircle, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useUtilityStore } from '../store/useUtilityStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { useFinanceStore } from '@/modules/finance/store';
import { useToastStore } from '../store/useToastStore';
import { zoneEventBus } from '../store/eventBus';
import { StatCard, StatusBadge, DataTable, Modal } from './primitives';
import { formatPersianNumber, formatCurrency, formatJalaliDate } from '../utils/formatters';

export const UtilityCenter: React.FC = () => {
  const { meters, readings, tariffs, invoices, addReading, updateReadingStatus, generateInvoice, markInvoicePaid, postInvoiceToFinance, glMapping, updateGLMapping, addTariff, updateTariff } = useUtilityStore();
  const [tariffName, setTariffName] = useState('');
  const [tariffRate, setTariffRate] = useState('');
  const [peakRate, setPeakRate] = useState('');
  const [offPeakRate, setOffPeakRate] = useState('');
  const [tariffUtilityType, setTariffUtilityType] = useState<'electricity' | 'water' | 'gas'>('electricity');
  const { accounts } = useFinanceStore();
  const { companies } = useCompanyStore();
  const { addToast } = useToastStore();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'meters' | 'tariffs' | 'invoices' | 'gl'>('dashboard');

  // Reading Modal State
  const [readingModalOpen, setReadingModalOpen] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<any>(null);
  const [newReading, setNewReading] = useState('');
  const [peakConsumption, setPeakConsumption] = useState('');
  const [offPeakConsumption, setOffPeakConsumption] = useState('');
  const [readingImageName, setReadingImageName] = useState('');

  // Invoice KPIs
  const totalInvoiced = useMemo(() => invoices.reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const totalPaid = useMemo(() => invoices.filter(i => i.paymentStatus === 'paid').reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);
  const totalOverdue = useMemo(() => invoices.filter(i => i.paymentStatus === 'overdue').reduce((sum, inv) => sum + inv.totalAmount, 0), [invoices]);

  // Chart Data
  const consumptionData = useMemo(() => {
    return ['electricity', 'water', 'gas'].map(type => {
      const typeMeters = meters.filter(m => m.utilityType === type).map(m => m.id);
      const typeReadings = readings.filter(r => typeMeters.includes(r.meterId));
      const totalConsumption = typeReadings.reduce((sum, r) => sum + r.consumption, 0);
      return {
        name: type === 'electricity' ? 'برق' : type === 'water' ? 'آب' : 'گاز',
        value: totalConsumption,
        fill: type === 'electricity' ? '#eab308' : type === 'water' ? '#3b82f6' : '#ef4444'
      };
    });
  }, [meters, readings]);

  const handleOpenReading = (meterId: string) => {
    const meter = meters.find(m => m.id === meterId);
    if (meter) {
      setSelectedMeter(meter);
      setNewReading('');
      setPeakConsumption('');
      setOffPeakConsumption('');
      setReadingImageName('');
      setReadingModalOpen(true);
    }
  };

  const handleSubmitReading = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMeter || !newReading) return;

    const readingValue = parseFloat(newReading);
    const totalConsumption = readingValue - selectedMeter.lastReading;
    if (Number(peakConsumption || 0) + Number(offPeakConsumption || 0) > totalConsumption) {
      addToast({ type: 'error', title: 'خطا', message: 'جمع مصرف Peak و Off-Peak نمی‌تواند بیشتر از مصرف کل باشد.' });
      return;
    }
    if (readingValue <= selectedMeter.lastReading) {
      addToast({ type: 'error', title: 'خطا', message: 'مقدار خوانش جدید باید بزرگتر از خوانش قبلی باشد.' });
      return;
    }

    try {
      addReading({
        meterId: selectedMeter.id,
        periodId: 'P-1403-05',
        readingDate: new Date().toISOString(),
        previousReading: selectedMeter.lastReading,
        currentReading: readingValue,
        readerId: 'user-01',
        peakConsumption: Number(peakConsumption || 0),
        offPeakConsumption: Number(offPeakConsumption || 0),
        meterImageName: readingImageName || undefined,
        isAnomaly: false
      });

      const consumption = readingValue - selectedMeter.lastReading;
      if (consumption > 5000) { // threshold mock
        zoneEventBus.emit({
          type: 'ALERT_TRIGGERED',
          payload: {
            title: 'مصرف غیرعادی یوتیلیتی',
            type: 'utility',
            severity: 'high',
            description: `مصرف بسیار بالا ثبت شد: ${consumption} ${selectedMeter.unit}`,
            companyId: selectedMeter.companyId
          }
        });
      }

      addToast({ type: 'success', title: 'موفقیت', message: 'خوانش جدید با موفقیت ثبت شد.' });
      setReadingModalOpen(false);
    } catch (err) {
      addToast({ type: 'error', title: 'خطا', message: 'خطا در ثبت خوانش.' });
    }
  };

  const getCompanyName = (id: string) => companies.find(c => c.id === id)?.companyName || 'نامشخص';

  return (
    <div className="space-y-6" dir="rtl">
      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center px-4 pt-1">
          {[
            { id: 'dashboard', label: 'داشبورد یوتیلیتی', icon: TrendingUp },
            { id: 'meters', label: 'مدیریت کنتورها', icon: Zap },
            { id: 'tariffs', label: 'تعرفه‌گذاری', icon: DollarSign },
            { id: 'invoices', label: 'صورتحساب‌ها', icon: FileText },
            { id: 'gl', label: 'تنظیمات مالی', icon: DollarSign }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
              >
                <Icon className="w-4 h-4" /> {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard title="کل صورتحساب‌های صادر شده" value={formatCurrency(totalInvoiced)} icon={FileText} colorClass="bg-blue-50 text-blue-600" />
            <StatCard title="وصولی (موفق)" value={formatCurrency(totalPaid)} icon={CheckCircle} colorClass="bg-emerald-50 text-emerald-600" />
            <StatCard title="مطالبات معوق" value={formatCurrency(totalOverdue)} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" />
            <StatCard title="کنتورهای فعال" value={meters.filter(m => m.status === 'active').length} icon={Zap} colorClass="bg-amber-50 text-amber-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="font-bold text-gray-900 mb-6">گزارش مصرف حامل‌های انرژی (ماه جاری)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={consumptionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {consumptionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-gray-900">صورتحساب‌های نیازمند پیگیری</h3>
                <button onClick={() => setActiveTab('invoices')} className="text-sm text-blue-600 hover:text-blue-800">مشاهده همه</button>
              </div>
              <div className="space-y-3">
                {invoices.filter(i => i.paymentStatus === 'overdue').slice(0, 5).map(inv => (
                  <div key={inv.id} className="flex justify-between items-center p-3 rounded-lg border border-red-100 bg-red-50/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{getCompanyName(inv.companyId)}</p>
                        <p className="text-xs text-gray-500">شماره قبض: <span className="font-mono">{inv.invoiceNumber}</span></p>
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-red-600 text-sm">{formatCurrency(inv.totalAmount)}</p>
                      <p className="text-[10px] text-gray-500 mt-1">سررسید: {formatJalaliDate(inv.dueDate)}</p>
                    </div>
                  </div>
                ))}
                {invoices.filter(i => i.paymentStatus === 'overdue').length === 0 && <p className="text-center text-gray-500 text-sm">موردی برای پیگیری وجود ندارد.</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'meters' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <DataTable
            data={meters}
            columns={[
              { header: 'شماره کنتور', accessorKey: 'meterCode', cell: (info) => <span className="font-mono">{info.getValue() as string}</span> },
              {
                header: 'نوع یوتیلیتی', accessorKey: 'utilityType', cell: (info) => {
                  const type = info.getValue() as string;
                  return (
                    <div className="flex items-center gap-2">
                      {type === 'electricity' ? <Zap className="w-4 h-4 text-amber-500" /> : type === 'water' ? <Droplet className="w-4 h-4 text-blue-500" /> : <Flame className="w-4 h-4 text-red-500" />}
                      <span>{type === 'electricity' ? 'برق' : type === 'water' ? 'آب' : 'گاز'}</span>
                    </div>
                  )
                }
              },
              { header: 'شرکت/واحد', accessorKey: 'companyId', cell: (info) => getCompanyName(info.getValue() as string) },
              { header: 'تاریخ آخرین خوانش', accessorKey: 'lastReadingDate', cell: (info) => formatJalaliDate(info.getValue() as string) },
              { header: 'آخرین پالس', accessorKey: 'lastReading', cell: (info) => <span className="font-mono">{formatPersianNumber(info.getValue() as number)}</span> },
              { header: 'حالت', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
              {
                header: 'عملیات', id: 'actions', cell: (info) => (
                  <div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleOpenReading(info.row.original.id); }} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium transition-colors">ثبت خوانش</button><button onClick={(e) => { e.stopPropagation(); try { generateInvoice(info.row.original.id, '۱۴۰۳/۰۴/۰۱', '۱۴۰۳/۰۴/۳۱'); addToast({ type: 'success', title: 'موفقیت', message: 'صورتحساب Utility صادر شد.' }); } catch (err) { addToast({ type: 'error', title: 'خطا', message: 'برای صدور قبض، قرائت و تعرفه فعال لازم است.' }); } }} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-medium transition-colors">صدور قبض</button></div>
                )
              }
            ]}
          />
          <div className="mt-6">
            <h3 className="mb-3 font-bold text-gray-900">قرائت‌های اخیر و تأیید</h3>
            <DataTable
              data={readings.slice(0, 10)}
              columns={[
                { header: 'کنتور', accessorKey: 'meterId', cell: (info) => meters.find((meter) => meter.id === info.getValue())?.meterCode || '—' },
                { header: 'تاریخ', accessorKey: 'readingDate', cell: (info) => formatJalaliDate(info.getValue() as string) },
                { header: 'مصرف', accessorKey: 'consumption', cell: (info) => formatPersianNumber(info.getValue() as number) },
                { header: 'تصویر', accessorKey: 'meterImageName', cell: (info) => info.getValue() ? 'ثبت‌شده' : '—' },
                { header: 'تأیید', accessorKey: 'approvalStatus', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
                { header: 'عملیات', id: 'reading-action', cell: (info) => info.row.original.approvalStatus === 'pending' ? <div className="flex gap-2"><button onClick={() => { updateReadingStatus(info.row.original.id, 'approved'); addToast({ type: 'success', title: 'تأیید', message: 'قرائت کنتور تأیید شد.' }); }} className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-xs">تأیید</button><button onClick={() => { updateReadingStatus(info.row.original.id, 'rejected', 'نیاز به بررسی مجدد تصویر کنتور'); addToast({ type: 'error', title: 'رد', message: 'قرائت کنتور رد شد.' }); }} className="px-2 py-1 bg-red-50 text-red-600 rounded text-xs">رد</button></div> : <span className="text-xs text-gray-400">بررسی‌شده</span> },
              ]}
            />
          </div>
        </div>
      )}

      {activeTab === 'tariffs' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="mb-4 flex gap-2">
            <input value={tariffName} onChange={(event) => setTariffName(event.target.value)} placeholder="عنوان تعرفه" className="flex-1 px-3 py-2 border border-gray-300 rounded text-xs" />
            <input value={tariffRate} onChange={(event) => setTariffRate(event.target.value)} placeholder="نرخ پایه" type="number" className="w-32 px-3 py-2 border border-gray-300 rounded text-xs" />
            <input value={peakRate} onChange={(event) => setPeakRate(event.target.value)} placeholder="نرخ Peak" type="number" className="w-32 px-3 py-2 border border-gray-300 rounded text-xs" />
            <input value={offPeakRate} onChange={(event) => setOffPeakRate(event.target.value)} placeholder="نرخ Off-Peak" type="number" className="w-32 px-3 py-2 border border-gray-300 rounded text-xs" />
            <select value={tariffUtilityType} onChange={(event) => setTariffUtilityType(event.target.value as typeof tariffUtilityType)} className="px-3 py-2 border border-gray-300 rounded text-xs"><option value="electricity">برق</option><option value="water">آب</option><option value="gas">گاز</option></select>
            <button onClick={() => { if (!tariffName || !tariffRate) { addToast({ type: 'error', title: 'خطا', message: 'عنوان و نرخ تعرفه الزامی است.' }); return; } addTariff({ utilityType: tariffUtilityType, tariffGroup: 'custom', tariffName, baseRate: Number(tariffRate), peakRate: Number(peakRate || 0), offPeakRate: Number(offPeakRate || 0), taxPercent: 9, effectiveFrom: '۱۴۰۳/۰۵/۰۱', isActive: true }); setTariffName(''); setTariffRate(''); setPeakRate(''); setOffPeakRate(''); addToast({ type: 'success', title: 'موفقیت', message: 'تعرفه جدید ثبت شد.' }); }} className="px-3 py-2 bg-teal-600 text-white rounded text-xs">تعرفه جدید</button>
          </div>
          <DataTable
            data={tariffs}
            columns={[
              { header: 'کد گروه', accessorKey: 'tariffGroup', cell: (info) => <span className="font-mono">{info.getValue() as string}</span> },
              { header: 'عنوان تعرفه', accessorKey: 'tariffName' },
              { header: 'نوع', accessorKey: 'utilityType', cell: (info) => info.getValue() === 'electricity' ? 'برق' : info.getValue() === 'water' ? 'آب' : 'گاز' },
              { header: 'مبلغ پایه (ریال)', accessorKey: 'baseRate', cell: (info) => <span className="font-mono">{formatCurrency(info.getValue() as number).replace(' ریال', '')}</span> },
              { header: 'نرخ Peak', accessorKey: 'peakRate', cell: (info) => <span className="font-mono">{info.getValue() ? formatCurrency(info.getValue() as number).replace(' ریال', '') : '-'}</span> },
              { header: 'نرخ Off-Peak', accessorKey: 'offPeakRate', cell: (info) => <span className="font-mono">{info.getValue() ? formatCurrency(info.getValue() as number).replace(' ریال', '') : '-'}</span> },
              { header: 'حالت', accessorKey: 'isActive', cell: (info) => <StatusBadge status={info.getValue() ? 'active' : 'inactive'} label={info.getValue() ? 'فعال' : 'غیرفعال'} /> },
              { header: 'عملیات', id: 'tariff-actions', cell: (info) => info.row.original.isActive ? <button onClick={() => { updateTariff(info.row.original.id, { isActive: false, effectiveTo: '۱۴۰۳/۰۴/۳۱' }); addToast({ type: 'success', title: 'موفقیت', message: 'تعرفه غیرفعال شد.' }); }} className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded text-xs">غیرفعال‌سازی</button> : <span className="text-xs text-gray-400">پایان‌یافته</span> },
            ]}
          />
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="mb-4 flex justify-end"><button onClick={() => { const rows = [['شماره قبض','شرکت','دوره','مبلغ','وضعیت'], ...invoices.map(invoice => [invoice.invoiceNumber, getCompanyName(invoice.companyId), `${invoice.billingPeriodFrom} تا ${invoice.billingPeriodTo}`, invoice.totalAmount, invoice.paymentStatus])]; const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob(['\ufeff' + rows.map(row => row.join(',')).join('\n')], { type: 'text/csv;charset=utf-8' })); link.download = 'صورتحساب-یوتیلیتی.csv'; link.click(); }} className="px-3 py-2 border border-gray-300 rounded text-xs text-gray-600">خروجی CSV</button></div>
          <DataTable
            data={invoices}
            columns={[
              { header: 'شماره قبض', accessorKey: 'invoiceNumber', cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span> },
              { header: 'شرکت مشترک', accessorKey: 'companyId', cell: (info) => getCompanyName(info.getValue() as string) },
              { header: 'دوره مصرف', id: 'period', cell: (info) => <span className="font-mono text-xs">{info.row.original.billingPeriodFrom} تا {info.row.original.billingPeriodTo}</span> },
              { header: 'مبلغ کل', accessorKey: 'totalAmount', cell: (info) => <span className="font-bold text-gray-900">{formatCurrency(info.getValue() as number)}</span> },
              { header: 'سررسید پرداخت', accessorKey: 'dueDate', cell: (info) => formatJalaliDate(info.getValue() as string) },
              { header: 'وضعیت پرداخت', accessorKey: 'paymentStatus', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
              { header: 'سند مالی', accessorKey: 'journalVoucherId', cell: (info) => info.getValue() ? <span className="font-mono text-xs text-blue-700">{info.getValue() as string}</span> : '—' },
              { header: 'عملیات', id: 'invoice-actions', cell: (info) => <div className="flex gap-2"><button onClick={() => window.print()} className="px-3 py-1 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded text-xs font-medium">چاپ</button>{!info.row.original.journalVoucherId && <button onClick={() => { try { postInvoiceToFinance(info.row.original.id); addToast({ type: 'success', title: 'موفقیت', message: 'سند حسابداری قبض صادر شد.' }); } catch (err) { addToast({ type: 'error', title: 'خطا', message: err instanceof Error ? err.message : 'خطا در ثبت سند مالی' }); } }} className="px-3 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded text-xs font-medium">ثبت مالی</button>}{info.row.original.paymentStatus !== 'paid' ? <button onClick={() => { markInvoicePaid(info.row.original.id); addToast({ type: 'success', title: 'موفقیت', message: 'قبض به‌عنوان پرداخت‌شده ثبت شد.' }); }} className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded text-xs font-medium">ثبت پرداخت</button> : <span className="text-xs text-gray-400">تسویه‌شده</span>}</div> },
            ]}
          />
        </div>
      )}

      {activeTab === 'gl' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-900">Mapping حساب‌های مالی Utility</h3>
          {[
            ['electricityRevenueAccountId', 'حساب درآمد برق'],
            ['waterRevenueAccountId', 'حساب درآمد آب'],
            ['gasRevenueAccountId', 'حساب درآمد گاز'],
            ['receivableAccountId', 'حساب دریافتنی خدمات'],
            ['taxAccountId', 'حساب مالیات Utility'],
            ['penaltyAccountId', 'حساب جرایم دیرکرد'],
            ['collectionBankAccountId', 'حساب بانک / صندوق وصول'],
          ].map(([key, label]) => (
            <label key={key} className="grid grid-cols-2 gap-4 text-sm items-center">
              <span>{label}</span>
              <select value={glMapping[key as keyof typeof glMapping]} onChange={(event) => updateGLMapping({ [key]: event.target.value } as any)} className="px-3 py-2 border border-gray-300 rounded-md">
                <option value="">انتخاب حساب</option>
                {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.nameFa}</option>)}
              </select>
            </label>
          ))}
          <div className="pt-3 text-xs text-gray-500">پس از تکمیل Mapping، صدور قبض می‌تواند Voucher متوازن در Finance Module ایجاد کند.</div>
        </div>
      )}

      {/* Reading Modal */}
      <Modal isOpen={readingModalOpen} onClose={() => setReadingModalOpen(false)} title="ثبت خوانش جدید کنتور" size="md">
        {selectedMeter && (
          <form onSubmit={handleSubmitReading} className="space-y-4 pt-2 text-right">
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 mb-4">
              <div className="flex justify-between mb-2 pb-2 border-b border-gray-200">
                <span>شرکت:</span>
                <span className="font-bold">{getCompanyName(selectedMeter.companyId)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>شماره کنتور:</span>
                <span className="font-mono font-medium">{selectedMeter.meterCode}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span>خوانش قبلی:</span>
                <span className="font-mono font-medium">{selectedMeter.lastReading} {selectedMeter.unit}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>تاریخ قبلی:</span>
                <span>{formatJalaliDate(selectedMeter.lastReadingDate)}</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">مقدار کنتور (خوانش فعلی) *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newReading}
                  onChange={(e) => setNewReading(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 font-mono text-left"
                  dir="ltr"
                />
                <span className="absolute right-3 top-2 text-gray-400 text-sm">{selectedMeter.unit}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مصرف Peak (اختیاری)</label>
                <input type="number" value={peakConsumption} onChange={(e) => setPeakConsumption(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-left" dir="ltr" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">مصرف Off-Peak (اختیاری)</label>
                <input type="number" value={offPeakConsumption} onChange={(e) => setOffPeakConsumption(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-left" dir="ltr" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">تصویر کنتور (اختیاری)</label>
              <input type="file" accept="image/*" onChange={(e) => setReadingImageName(e.target.files?.[0]?.name || '')} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              {readingImageName && <p className="mt-1 text-xs text-emerald-600">{readingImageName}</p>}
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button type="button" onClick={() => setReadingModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-300 rounded-md">انصراف</button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md">ثبت و محاسبه مصرف</button>
            </div>
          </form>
        )}
      </Modal>

    </div>
  );
};
