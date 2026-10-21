import React, { useMemo } from 'react';
import { X, Building2, MapPin, Users, Phone, Zap, Briefcase, FileText, AlertTriangle, ShieldCheck } from 'lucide-react';
import type { CompanyOnboardingRecord } from '../types';
import { useUtilityStore } from '../store/useUtilityStore';
import { useHSEStore } from '../store/useHSEStore';
import { useLeaseStore } from '../store/useLeaseStore';
import { useOperationsStore } from '../store/useOperationsStore';
import { calculateCompanyHealthScore } from '../utils/healthScoreCalculator';
import { StatusBadge, DataTable, StatCard, Timeline } from './primitives';
import { formatPersianNumber, formatJalaliDate, formatCurrency } from '../utils/formatters';
import { TimelineTab } from '@/modules/portal/features/company-profile/tabs/TimelineTab';

type TabId = 'overview' | 'contacts' | 'facilities' | 'utilities' | 'leases' | 'hse' | 'operations' | 'documents' | 'workflow' | 'history' | 'health' | 'timeline';

const TABS: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'نمای کلی' },
    { id: 'health', label: 'سلامت شرکت' },
    { id: 'timeline', label: 'تایم‌لاین' },
    { id: 'contacts', label: 'اطلاعات تماس' },
    { id: 'facilities', label: 'تأسیسات و ماشین‌آلات' },
    { id: 'utilities', label: 'انرژی و قبوض' },
    { id: 'leases', label: 'قراردادها' },
    { id: 'hse', label: 'ایمنی و بهداشت' },
    { id: 'operations', label: 'عملیات و هشدارها' },
    { id: 'documents', label: 'مدارک' },
    { id: 'workflow', label: 'گردش کار' },
];

interface CompanyDetailProps {
    company: CompanyOnboardingRecord;
    onClose: () => void;
    activeTab: TabId;
    onChangeTab: (tab: TabId) => void;
}

export const CompanyDetail: React.FC<CompanyDetailProps> = ({ company, onClose, activeTab, onChangeTab }) => {
    const { meters, invoices } = useUtilityStore();
    const { risks, incidents, capas } = useHSEStore();
    const { contracts } = useLeaseStore();
    const { alerts } = useOperationsStore();

    const healthScore = useMemo(() => calculateCompanyHealthScore(company.id), [company.id]);
    const companyMeters = meters.filter((m) => m.companyId === company.id);
    const companyInvoices = invoices.filter((i) => i.companyId === company.id);
    const companyRisks = risks.filter((r) => r.companyId === company.id);
    const companyAlerts = alerts.filter((a) => a.companyId === company.id);
    const companyLeases = contracts.filter((c) => c.companyId === company.id);

    return (
        <>
            <div className="absolute inset-0 bg-black/40 z-40 transition-opacity backdrop-blur-sm" onClick={onClose} />
            <div className="absolute top-0 bottom-0 right-0 w-[800px] max-w-[90vw] bg-gray-50 border-l border-gray-200 shadow-2xl z-50 flex flex-col" dir="rtl">
                {/* Header */}
                <div className="bg-white px-6 py-4 border-b border-gray-200 flex flex-col gap-4 shadow-sm z-10">
                    <div className="flex items-center justify-between">
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 justify-end">
                                    {company.companyName}
                                    <StatusBadge status={company.lifecycleStatus} />
                                </h2>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1 justify-end font-mono" dir="ltr">
                                    <span>شناسه ملی: {formatPersianNumber(Number(company.nationalId))}</span>
                                    <span>•</span>
                                    <span>شماره ثبت: {formatPersianNumber(Number(company.registrationNumber))}</span>
                                </div>
                            </div>
                            <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 shadow-inner">
                                <Building2 className="w-7 h-7 text-blue-600" />
                            </div>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 hide-scrollbar">
                        {TABS.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => onChangeTab(t.id)}
                                className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${activeTab === t.id
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                                    }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-4 gap-4">
                                <StatCard title="امتیاز سلامت" value={healthScore.overall} icon={ShieldCheck} colorClass="bg-emerald-50 text-emerald-600" />
                                <StatCard title="تعداد پرسنل" value={company.employees} icon={Users} colorClass="bg-blue-50 text-blue-600" />
                                <StatCard title="متراژ کل (مترمربع)" value={company.areaSqM || 0} icon={MapPin} colorClass="bg-amber-50 text-amber-600" />
                                <StatCard title="قرارداد فعال" value={companyLeases.filter(l => l.status === 'active').length} icon={FileText} colorClass="bg-indigo-50 text-indigo-600" />
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                <h3 className="text-sm font-bold text-gray-900 mb-4 border-b pb-2">اطلاعات پایه</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">حوزه فعالیت:</span>
                                        <span className="text-sm font-medium text-gray-900">{company.industry}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">موقعیت استقرار:</span>
                                        <span className="text-sm font-medium text-gray-900">
                                            ناحیه {company.address.zoneId}، بلوک {company.address.block}، واحد {company.address.unit}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">تاریخ تشکیل پرونده:</span>
                                        <span className="text-sm font-medium text-gray-900 font-mono">{formatJalaliDate(company.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-gray-50">
                                        <span className="text-sm text-gray-500">نوع حقوقی:</span>
                                        <span className="text-sm font-medium text-gray-900">{company.companyType === 'private_joint_stock' ? 'سهامی خاص' : company.companyType === 'limited_liability' ? 'مسئولیت محدود' : company.companyType}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'timeline' && (
                        <div className="p-1">
                            <TimelineTab companyId={company.id} />
                        </div>
                    )}

                    {activeTab === 'health' && (
                        <div className="space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">نمره جامع سلامت شرکت</h3>
                                    <p className="text-sm text-gray-500 mt-1">ارزیابی ۳۶۰ درجه عملکرد شرکت از دیدگاه مالی، ایمنی و عملیاتی شهرک.</p>
                                </div>
                                <div className="w-24 h-24 rounded-full border-8 border-emerald-500 flex items-center justify-center bg-emerald-50">
                                    <span className="text-3xl font-bold text-emerald-600">{healthScore.overall}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <h4 className="font-semibold text-gray-800 mb-4">شاخص‌های ارزیابی</h4>
                                    <div className="space-y-4">
                                        {[
                                            { label: 'انطباق مالی', score: healthScore.financial },
                                            { label: 'ایمنی و بهداشت (HSE)', score: healthScore.hse },
                                            { label: 'عملکرد عملیاتی', score: healthScore.operational },
                                            { label: 'رعایت تعهدات قرارداد', score: healthScore.leaseCompliance },
                                        ].map((idx, i) => (
                                            <div key={i}>
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="text-gray-600">{idx.label}</span>
                                                    <span className="font-semibold">{idx.score}</span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-2">
                                                    <div className={`h-2 rounded-full ${idx.score >= 80 ? 'bg-emerald-500' : idx.score >= 50 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${idx.score}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                                    <h4 className="font-semibold text-gray-800 mb-4">توصیه‌های اقدام</h4>
                                    <div className="space-y-3">
                                        {healthScore.recommendations.map((rec, i) => (
                                            <div key={i} className="flex items-start gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                                                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                                                <span>{rec}</span>
                                            </div>
                                        ))}
                                        {healthScore.recommendations.length === 0 && (
                                            <p className="text-sm text-gray-500 text-center py-4">وضعیت شرکت کاملاً مطلوب است و توصیه خاصی وجود ندارد.</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'contacts' && (
                        <div className="space-y-4">
                            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                                <h4 className="font-semibold text-gray-800 mb-4">نمایندگان و رابطین</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 border border-gray-100 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">مدیرعامل / نماینده قانونی</p>
                                        <p className="font-medium text-gray-900">{company.legalRepName || '—'}</p>
                                    </div>
                                    <div className="p-4 border border-gray-100 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">رابط HSE</p>
                                        <p className="font-medium text-gray-900">{company.hseContact || '—'}</p>
                                    </div>
                                    <div className="p-4 border border-gray-100 rounded-lg">
                                        <p className="text-xs text-gray-500 mb-1">رابط مالی</p>
                                        <p className="font-medium text-gray-900">{company.financialContact || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'utilities' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-900">کنتورهای متصل</h3>
                            <div className="grid grid-cols-2 gap-4">
                                {companyMeters.map(meter => (
                                    <div key={meter.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <p className="text-xs text-gray-500 font-mono tracking-wider">{meter.meterCode}</p>
                                                <p className="font-bold text-gray-900">{meter.utilityType === 'electricity' ? 'برق' : meter.utilityType === 'water' ? 'آب' : 'گاز'} - {meter.tariffGroup === 'industrial' ? 'صنعتی' : 'استاندارد'}</p>
                                            </div>
                                            <StatusBadge status={meter.status} />
                                        </div>
                                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                                            <p className="text-2xl font-bold font-mono tracking-widest text-gray-800" dir="ltr">{formatPersianNumber(meter.lastReading)} <span className="text-sm font-sans tracking-normal text-gray-500">{meter.unit}</span></p>
                                            <p className="text-xs text-gray-500 mt-1">آخرین خوانش: {meter.lastReadingDate}</p>
                                        </div>
                                    </div>
                                ))}
                                {companyMeters.length === 0 && <p className="text-gray-500 col-span-2">کنتوری برای این شرکت ثبت نشده است.</p>}
                            </div>

                            <h3 className="font-bold text-gray-900 pt-4 border-t">صورتحساب‌های اخیر</h3>
                            <div className="space-y-3">
                                {companyInvoices.map(inv => (
                                    <div key={inv.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-full ${inv.utilityType === 'electricity' ? 'bg-amber-100 text-amber-600' : inv.utilityType === 'water' ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                                <Zap className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900">دوره {inv.billingPeriodFrom} تا {inv.billingPeriodTo}</p>
                                                <p className="text-xs text-gray-500 mt-1 font-mono">{inv.invoiceNumber}</p>
                                            </div>
                                        </div>
                                        <div className="text-left flex flex-col items-end gap-1">
                                            <p className="font-bold text-gray-900">{formatCurrency(inv.totalAmount)}</p>
                                            <StatusBadge status={inv.paymentStatus} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'hse' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-900 border-b pb-2">ریسک‌های شناسایی شده</h3>
                            <div className="space-y-3">
                                {companyRisks.map(risk => (
                                    <div key={risk.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex gap-4">
                                        <div className="shrink-0 pt-1">
                                            <AlertTriangle className={`w-5 h-5 ${risk.riskScore >= 12 ? 'text-red-500' : 'text-amber-500'}`} />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="font-medium text-gray-900 text-sm leading-tight">{risk.hazard}</p>
                                                <StatusBadge status={risk.status} className="shrink-0 mr-2" />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">موقعیت: {risk.location} • مالک ریسک: {risk.owner}</p>
                                        </div>
                                    </div>
                                ))}
                                {companyRisks.length === 0 && <p className="text-sm text-gray-500">هیچ ریسکی برای این شرکت ثبت نشده است.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'operations' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-900 border-b pb-2">هشدارهای عملیاتی مرتبط</h3>
                            <div className="space-y-3">
                                {companyAlerts.map(alert => (
                                    <div key={alert.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                                            <StatusBadge status={alert.status} />
                                        </div>
                                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{alert.description}</p>
                                        <div className="flex justify-between items-center text-xs text-gray-500">
                                            <span>کد: <span className="font-mono">{alert.alertNumber}</span></span>
                                            <span>تیم پیگیری: {alert.team}</span>
                                            <span>ایجاد: <span className="font-mono">{formatJalaliDate(alert.createdAt)}</span></span>
                                        </div>
                                    </div>
                                ))}
                                {companyAlerts.length === 0 && <p className="text-sm text-gray-500">موردی یافت نشد.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'leases' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-900 border-b pb-2">قراردادهای واگذاری</h3>
                            <div className="space-y-4">
                                {companyLeases.map(lease => (
                                    <div key={lease.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                                        <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-50">
                                            <div>
                                                <p className="font-bold text-gray-900 text-lg">قرارداد اجاره بلوک {lease.block} واحد {lease.unit}</p>
                                                <p className="text-sm text-gray-500 font-mono mt-1">شماره: {lease.contractNumber}</p>
                                            </div>
                                            <StatusBadge status={lease.status} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">شروع قرارداد</p>
                                                <p className="font-medium font-mono text-gray-900">{lease.startDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">پایان قرارداد</p>
                                                <p className="font-medium font-mono text-gray-900">{lease.endDate}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">اجاره ماهیانه</p>
                                                <p className="font-medium font-mono text-gray-900">{formatCurrency(lease.monthlyRent)}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-500 mb-1">مبلغ ودیعه</p>
                                                <p className="font-medium font-mono text-gray-900">{formatCurrency(lease.deposit)}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {companyLeases.length === 0 && <p className="text-sm text-gray-500">شرکت فاقد قرارداد فعال است.</p>}
                            </div>
                        </div>
                    )}

                    {activeTab === 'workflow' && (
                        <div className="space-y-6">
                            <h3 className="font-bold text-gray-900 border-b pb-2">گردش کار پروسه ثبت‌نام</h3>
                            <Timeline items={[
                                { id: '1', title: 'تشکیل پرونده اولیه', date: company.createdAt, isActive: true },
                                { id: '2', title: 'بررسی صحت‌سنجی حقوقی', date: company.createdAt, isActive: company.lifecycleStatus !== 'applicant' },
                                { id: '3', title: 'ارزیابی مالی و بدهی‌ها', date: company.createdAt, isActive: ['finance_review', 'hse_review', 'plot_allocation', 'active'].includes(company.lifecycleStatus) },
                            ]} />
                        </div>
                    )}

                    {(activeTab === 'documents' || activeTab === 'facilities') && (
                        <div className="bg-gray-50 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                            <p className="text-gray-500 text-sm mb-2">این بخش در فازهای بعدی تکمیل خواهد شد.</p>
                        </div>
                    )}

                </div>
            </div>
        </>
    );
};
