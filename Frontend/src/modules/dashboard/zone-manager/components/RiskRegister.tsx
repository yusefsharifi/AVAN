import React, { useState } from 'react';
import { AlertTriangle, Plus, ShieldCheck, Activity } from 'lucide-react';
import { useHSEStore } from '../store/useHSEStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { useToastStore } from '../store/useToastStore';
import { DataTable, StatusBadge, Modal, StatCard } from './primitives';
import { formatJalaliDate } from '../utils/formatters';

export const RiskRegister: React.FC = () => {
    const { risks, addRisk, updateRisk } = useHSEStore();
    const { companies } = useCompanyStore();
    const { addToast } = useToastStore();

    const [modalOpen, setModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        hazard: '',
        location: '',
        owner: '',
        likelihood: 3,
        impact: 3,
        companyId: ''
    });

    const getCompanyName = (id: string) => companies.find(c => c.id === id)?.companyName || 'عمومی/ناحیه';

    const calculateScore = (l: number, i: number) => l * i;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        try {
            addRisk({
                hazard: formData.hazard,
                location: formData.location,
                owner: formData.owner,
                likelihood: formData.likelihood,
                impact: formData.impact,
                riskScore: calculateScore(formData.likelihood, formData.impact),
                companyId: formData.companyId,
                status: 'identified',
                reviewDate: new Date().toISOString()
            });
            addToast({ type: 'success', title: 'موفقیت', message: 'ریسک جدید با موفقیت ثبت شد.' });
            setModalOpen(false);
        } catch (err) {
            addToast({ type: 'error', title: 'خطا', message: 'خطا در ثبت ریسک.' });
        }
    };

    const getScoreBadge = (score: number) => {
        if (score >= 15) return <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded text-xs font-bold font-mono">{score} - بحرانی</span>;
        if (score >= 10) return <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded text-xs font-bold font-mono">{score} - بالا</span>;
        if (score >= 5) return <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded text-xs font-bold font-mono">{score} - متوسط</span>;
        return <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-xs font-bold font-mono">{score} - پایین</span>;
    };

    return (
        <div className="space-y-6" dir="rtl">
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="ریسک‌های بحرانی" value={risks.filter(r => r.riskScore >= 15).length} icon={AlertTriangle} colorClass="bg-red-50 text-red-600" />
                <StatCard title="کل ریسک‌ها" value={risks.length} icon={Activity} colorClass="bg-blue-50 text-blue-600" />
                <StatCard title="ریسک‌های تحت کنترل" value={risks.filter(r => r.status === 'controlled' || r.status === 'closed').length} icon={ShieldCheck} colorClass="bg-emerald-50 text-emerald-600" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                    <h2 className="text-lg font-bold text-gray-900">ماتریس ثبت ریسک‌های سایت</h2>
                    <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <Plus className="w-4 h-4" /> ثبت ریسک جدید
                    </button>
                </div>

                <div className="p-4">
                    <DataTable
                        data={risks}
                        columns={[
                            {
                                header: 'شرکت/موقعیت', accessorKey: 'companyId', cell: (info) => (
                                    <div className="flex flex-col">
                                        <span className="font-semibold text-gray-900">{getCompanyName(info.getValue() as string)}</span>
                                        <span className="text-xs text-gray-500">{info.row.original.location}</span>
                                    </div>
                                )
                            },
                            { header: 'شرح مخاطره', accessorKey: 'hazard', cell: (info) => <span className="text-gray-900 text-sm max-w-sm truncate block">{info.getValue() as string}</span> },
                            { header: 'احتمال × شدت', id: 'calc', cell: (info) => <div className="text-sm font-mono text-gray-500 text-center">{info.row.original.likelihood} × {info.row.original.impact}</div> },
                            { header: 'نمره ریسک', accessorKey: 'riskScore', cell: (info) => getScoreBadge(info.getValue() as number) },
                            { header: 'مالک', accessorKey: 'owner' },
                            { header: 'وضعیت', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
                            { header: 'بروزرسانی', accessorKey: 'reviewDate', cell: (info) => <span className="text-xs text-gray-500 font-mono">{formatJalaliDate(info.getValue() as string)}</span> },
                        ]}
                    />
                </div>
            </div>

            <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="ثبت مخاطره (ریسک) جدید">
                <form onSubmit={handleSubmit} className="space-y-4 pt-4 text-right">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شرکت مرتبط</label>
                        <select
                            value={formData.companyId}
                            onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                            <option value="">(محدوده عمومی شهرک)</option>
                            {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">شرح مخاطره *</label>
                        <textarea
                            required
                            rows={2}
                            value={formData.hazard}
                            onChange={(e) => setFormData({ ...formData, hazard: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">مکان دقیق</label>
                            <input
                                type="text"
                                required
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">مسئول پیگیری (مالک ریسک)</label>
                            <input
                                type="text"
                                required
                                value={formData.owner}
                                onChange={(e) => setFormData({ ...formData, owner: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 border border-gray-200 rounded-lg">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">احتمال وقوع (۱ تا ۵)</label>
                            <input
                                type="range"
                                min="1" max="5"
                                value={formData.likelihood}
                                onChange={(e) => setFormData({ ...formData, likelihood: Number(e.target.value) })}
                                className="w-full"
                            />
                            <div className="text-center font-mono font-bold mt-1 text-blue-600">{formData.likelihood}</div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">شدت پیامد (۱ تا ۵)</label>
                            <input
                                type="range"
                                min="1" max="5"
                                value={formData.impact}
                                onChange={(e) => setFormData({ ...formData, impact: Number(e.target.value) })}
                                className="w-full"
                            />
                            <div className="text-center font-mono font-bold mt-1 text-red-600">{formData.impact}</div>
                        </div>
                    </div>

                    <div className="pt-2 flex justify-between items-center border-t border-gray-100">
                        <div className="text-sm">نمره ریسک ارزیابی شده: <span className="font-bold font-mono ml-1">{calculateScore(formData.likelihood, formData.impact)}</span></div>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50">انصراف</button>
                            <button type="submit" className="px-4 py-2 bg-blue-600 rounded-md text-sm font-medium text-white hover:bg-blue-700">ثبت ریسک</button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default RiskRegister;
