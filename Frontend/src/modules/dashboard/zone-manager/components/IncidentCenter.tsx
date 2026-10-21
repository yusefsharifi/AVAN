import React, { useState } from 'react';
import { AlertCircle, Plus } from 'lucide-react';
import { useHSEStore } from '../store/useHSEStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { useToastStore } from '../store/useToastStore';
import { zoneEventBus } from '../store/eventBus';
import { DataTable, StatusBadge, Modal } from './primitives';
import { formatJalaliDate } from '../utils/formatters';
import type { Severity } from '../types';

export const IncidentCenter: React.FC = () => {
    const { incidents, addIncident } = useHSEStore();
    const { companies } = useCompanyStore();
    const { addToast } = useToastStore();

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'injury' as 'injury' | 'spill' | 'fire' | 'near_miss' | 'other',
        severity: 'minor' as Severity,
        description: '',
        location: '',
        companyId: ''
    });

    const getCompanyName = (id: string) => companies.find(c => c.id === id)?.companyName || 'عمومی/ناحیه';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            addIncident({
                title: formData.title,
                type: formData.type,
                severity: formData.severity,
                description: formData.description,
                location: formData.location,
                companyId: formData.companyId,
                date: new Date().toISOString(),
                status: 'reported'
            });

            if (['serious', 'critical', 'catastrophic'].includes(formData.severity)) {
                zoneEventBus.emit({
                    type: 'ALERT_TRIGGERED',
                    payload: {
                        title: `حادثه: ${formData.title}`,
                        type: 'hse',
                        severity: formData.severity,
                        description: formData.description,
                        companyId: formData.companyId
                    }
                });
            }

            addToast({ type: 'success', title: 'موفقیت', message: 'شرح رویداد با موفقیت ثبت شد.' });
            setModalOpen(false);
        } catch (err) {
            addToast({ type: 'error', title: 'خطا', message: 'خطا در ثبت رویداد.' });
        }
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-red-50/20">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><AlertCircle className="w-5 h-5 text-red-500" /> مدیریت رویدادها و حوادث</h2>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> گزارش رویداد جدید
                    </button>
                </div>

                <div className="p-4">
                    <DataTable
                        data={incidents}
                        columns={[
                            { header: 'تاریخ', accessorKey: 'date', cell: (info) => <span className="text-sm text-gray-600 font-mono">{formatJalaliDate(info.getValue() as string)}</span> },
                            { header: 'موضوع رویداد', accessorKey: 'title', cell: (info) => <span className="font-semibold text-gray-900">{info.getValue() as string}</span> },
                            { header: 'شرکت/مکان', accessorKey: 'companyId', cell: (info) => getCompanyName(info.getValue() as string) },
                            {
                                header: 'نوع رویداد', accessorKey: 'type', cell: (info) => {
                                    const t = info.getValue() as string;
                                    return t === 'injury' ? 'جراحت' : t === 'spill' ? 'نشتی مواد' : t === 'fire' ? 'آتش‌سوزی' : t === 'near_miss' ? 'شبه‌حادثه' : 'سایر';
                                }
                            },
                            { header: 'شدت پیامد', accessorKey: 'severity', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
                            { header: 'وضعیت پیگیری', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue() as string} /> }
                        ]}
                    />
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="ثبت گزارش رویداد / حادثه">
                <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-right">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عنوان رویداد *</label>
                        <input required type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">نوع رویداد *</label>
                            <select required value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="near_miss">شبه‌حادثه (Near Miss)</option>
                                <option value="injury">جراحت / مصدومیت</option>
                                <option value="fire">آتش‌سوزی</option>
                                <option value="spill">نشتی / انتشار مواد</option>
                                <option value="other">سایر</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">شدت رویداد *</label>
                            <select required value={formData.severity} onChange={e => setFormData({ ...formData, severity: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="low">بسیار خفیف</option>
                                <option value="minor">جزئی</option>
                                <option value="moderate">متوسط</option>
                                <option value="serious">جدی</option>
                                <option value="critical">بحرانی (تأثیر گسترده)</option>
                                <option value="catastrophic">فاجعه‌بار / تلفات جانی</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">شرکت (در صورت وقوع در محدوده شرکت)</label>
                            <select value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="">(فضای عمومی شهرک)</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">مکان دقیق وقوع *</label>
                            <input required type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شرح کامل رویداد *</label>
                        <textarea required rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    <div className="pt-2 flex justify-end gap-2 border-t border-gray-100">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">انصراف</button>
                        <button type="submit" className="px-4 py-2 bg-red-600 rounded-md text-sm font-medium text-white hover:bg-red-700">ثبت و ایجاد پرونده حراستی/ایمنی</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default IncidentCenter;
