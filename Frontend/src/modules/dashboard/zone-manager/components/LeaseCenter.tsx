import React, { useState } from 'react';
import { Home, FileText, CheckCircle, Clock, AlertTriangle, Search, Plus, Calendar } from 'lucide-react';
import { useLeaseStore } from '../store/useLeaseStore';
import { useCompanyStore } from '../store/useCompanyStore';
import { useToastStore } from '../store/useToastStore';
import { StatCard, StatusBadge, DataTable, Modal } from './primitives';
import { formatPersianNumber, formatCurrency, formatJalaliDate } from '../utils/formatters';

export const LeaseCenter: React.FC = () => {
    const { contracts, updateContract, addContract } = useLeaseStore();
    const [newContractOpen, setNewContractOpen] = useState(false);
    const [contractCompanyId, setContractCompanyId] = useState('');
    const [contractBlock, setContractBlock] = useState('');
    const [contractUnit, setContractUnit] = useState('');
    const [contractArea, setContractArea] = useState('');
    const [contractRent, setContractRent] = useState('');
    const { companies } = useCompanyStore();
    const { addToast } = useToastStore();

    const [activeTab, setActiveTab] = useState<'contracts' | 'renewals'>('contracts');
    const [searchTerm, setSearchTerm] = useState('');

    const activeContracts = contracts.filter(c => c.status === 'active');
    const pendingContracts = contracts.filter(c => c.status === 'draft' || c.status === 'pending_signature');
    const expiringContracts = activeContracts.filter(c => {
        // Mock logic: randomly consider some as expiring for demo
        return Number(c.unit) % 3 === 0;
    });

    const filteredContracts = contracts.filter(c =>
        c.contractNumber.includes(searchTerm) ||
        c.block.includes(searchTerm) ||
        c.unit.includes(searchTerm)
    );

    const getCompanyName = (id: string) => companies.find(c => c.id === id)?.companyName || 'نامشخص';

    const handleSignContract = (id: string) => {
        updateContract(id, { status: 'active' });
        addToast({ type: 'success', title: 'موفقیت', message: 'مراحل امضا و تأیید نهایی تکمیل شد. قرارداد فعال است.' });
    };

    const handleRenewContract = (id: string) => {
        // Mock logic for renewal
        updateContract(id, { status: 'active', endDate: '1405/01/01', monthlyRent: 150000000 });
        addToast({ type: 'success', title: 'تمدید قرارداد', message: 'قرارداد با شرایط جدید تمدید شد.' });
    };

    return (
        <div className="space-y-6" dir="rtl">
            <div className="flex justify-end"><button onClick={() => setNewContractOpen(true)} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm"><Plus className="ml-1 inline w-4 h-4"/>قرارداد جدید</button></div>
            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatCard title="قراردادهای فعال" value={activeContracts.length} icon={CheckCircle} colorClass="bg-emerald-50 text-emerald-600" />
                <StatCard title="نزدیک به انقضا" value={expiringContracts.length} icon={AlertTriangle} colorClass="bg-amber-50 text-amber-600" />
                <StatCard title="در انتظار امضا" value={pendingContracts.length} icon={Clock} colorClass="bg-blue-50 text-blue-600" />
                <StatCard title="متوسط مبلغ اجاره" value={formatCurrency(120000000)} icon={FileText} colorClass="bg-indigo-50 text-indigo-600" />
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-100 flex items-center px-4 pt-1 justify-between">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('contracts')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'contracts' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            <FileText className="w-4 h-4" /> لیست قراردادها
                        </button>
                        <button
                            onClick={() => setActiveTab('renewals')}
                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'renewals' ? 'border-blue-600 text-blue-700 bg-blue-50/50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                        >
                            <Calendar className="w-4 h-4" /> تمدیدها و اعلان‌ها
                        </button>
                    </div>
                    <div className="relative pb-2">
                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="جستجو در قراردادها..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full md:w-64 pl-4 pr-10 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                    </div>
                </div>

                <div className="p-4">
                    {activeTab === 'contracts' && (
                        <DataTable
                            data={filteredContracts}
                            columns={[
                                { header: 'شماره قرارداد', accessorKey: 'contractNumber', cell: (info) => <span className="font-mono text-xs">{info.getValue() as string}</span> },
                                { header: 'مستأجر (شرکت)', accessorKey: 'companyId', cell: (info) => <span className="font-medium text-gray-900">{getCompanyName(info.getValue() as string)}</span> },
                                { header: 'مورد اجاره', id: 'location', cell: (info) => <span>بلوک {info.row.original.block} - واحد {info.row.original.unit}</span> },
                                { header: 'متراژ (مترمربع)', accessorKey: 'areaSqM', cell: (info) => <span className="font-mono">{formatPersianNumber(info.getValue() as number)}</span> },
                                { header: 'اجاره ماهیانه', accessorKey: 'monthlyRent', cell: (info) => <span className="text-gray-900 font-bold">{formatCurrency(info.getValue() as number)}</span> },
                                { header: 'وضعیت', accessorKey: 'status', cell: (info) => <StatusBadge status={info.getValue() as string} /> },
                                {
                                    header: 'عملیات', id: 'actions', cell: (info) => {
                                        const status = info.row.original.status;
                                        if (status === 'draft') {
                                            return <button onClick={() => { updateContract(info.row.original.id, { status: 'pending_signature' }); addToast({ type: 'success', title: 'ارسال', message: 'پیش‌نویس برای امضا ارسال شد.' }); }} className="text-xs bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded font-medium whitespace-nowrap">ارسال برای امضا</button>;
                                        }
                                        if (status === 'pending_signature') {
                                            return <button onClick={() => handleSignContract(info.row.original.id)} className="text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded font-medium whitespace-nowrap">ثبت امضا</button>;
                                        }
                                        return <span className="text-gray-400 text-xs">—</span>;
                                    }
                                }
                            ]}
                        />
                    )}

                    {activeTab === 'renewals' && (
                        <div className="space-y-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    <p className="text-amber-800 text-sm font-medium">قراردادهای زیر در ۹۰ روز آینده منقضی می‌شوند. فرآیند مذاکره و تمدید باید آغاز گردد.</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {expiringContracts.map(c => (
                                    <div key={c.id} className="border border-gray-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-3 border-b border-gray-100 pb-3">
                                            <div>
                                                <h4 className="font-bold text-gray-900">{getCompanyName(c.companyId)}</h4>
                                                <p className="text-xs text-gray-500 mt-1 font-mono">{c.contractNumber}</p>
                                            </div>
                                            <StatusBadge status="warning" label="رو به اتمام" className="bg-amber-100 text-amber-800" />
                                        </div>
                                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                                            <div className="flex justify-between">
                                                <span>مورد اجاره:</span>
                                                <span className="font-medium text-gray-900">بلوک {c.block} وا. {c.unit}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>تاریخ پایان:</span>
                                                <span className="font-mono text-red-600">{c.endDate}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>اجاره فعلی:</span>
                                                <span className="font-medium">{formatCurrency(c.monthlyRent)}</span>
                                            </div>
                                        </div>
                                        <button onClick={() => handleRenewContract(c.id)} className="w-full py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg text-sm font-medium transition-colors">
                                            ثبت تمدید قرارداد با نرخ جدید
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <Modal isOpen={newContractOpen} onClose={() => setNewContractOpen(false)} title="ثبت پیش‌نویس قرارداد" size="lg">
                <div className="grid grid-cols-2 gap-4 pt-2 text-right">
                    <select value={contractCompanyId} onChange={(e) => setContractCompanyId(e.target.value)} className="col-span-2 px-3 py-2 border border-gray-300 rounded-md"><option value="">انتخاب شرکت</option>{companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</select>
                    <input value={contractBlock} onChange={(e) => setContractBlock(e.target.value)} placeholder="بلوک" className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input value={contractUnit} onChange={(e) => setContractUnit(e.target.value)} placeholder="Unit / Plot" className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input value={contractArea} onChange={(e) => setContractArea(e.target.value)} type="number" placeholder="متراژ" className="px-3 py-2 border border-gray-300 rounded-md" />
                    <input value={contractRent} onChange={(e) => setContractRent(e.target.value)} type="number" placeholder="اجاره ماهانه" className="px-3 py-2 border border-gray-300 rounded-md" />
                    <button onClick={() => { if (!contractCompanyId || !contractBlock || !contractUnit || !contractArea) { addToast({ type: 'error', title: 'خطا', message: 'شرکت، بلوک، واحد و متراژ الزامی است.' }); return; } addContract({ companyId: contractCompanyId, companyName: getCompanyName(contractCompanyId), block: contractBlock, unit: contractUnit, areaSqM: Number(contractArea), monthlyRent: Number(contractRent || 0), startDate: '۱۴۰۳/۰۵/۰۱', endDate: '۱۴۰۴/۰۵/۰۱', status: 'draft', contractType: 'standard', usageType: 'manufacturing', serviceCharge: 0, maintenanceFee: 0, deposit: 0, escalationClause: '۱۵٪ سالانه', taxPercent: 9, latePaymentPenaltyPercent: 2, billingCycle: 'monthly', documents: [], workflowSteps: [] }); addToast({ type: 'success', title: 'موفقیت', message: 'پیش‌نویس قرارداد ایجاد شد.' }); setNewContractOpen(false); }} className="col-span-2 px-4 py-2 bg-teal-600 text-white rounded-md">ایجاد پیش‌نویس</button>
                </div>
            </Modal>
        </div>
    );
};

export default LeaseCenter;
