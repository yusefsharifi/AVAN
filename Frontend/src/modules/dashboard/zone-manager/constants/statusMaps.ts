// Status color maps for Tailwind classes

export const STATUS_COLORS: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-800',
    applicant: 'bg-blue-100 text-blue-800',
    under_review: 'bg-amber-100 text-amber-800',
    finance_review: 'bg-cyan-100 text-cyan-800',
    hse_review: 'bg-purple-100 text-purple-800',
    zone_manager_approval: 'bg-indigo-100 text-indigo-800',
    plot_allocation: 'bg-sky-100 text-sky-800',
    suspended: 'bg-red-100 text-red-800',
    closed: 'bg-gray-100 text-gray-700',
    draft: 'bg-slate-100 text-slate-700',
    pending: 'bg-amber-100 text-amber-800',
    open: 'bg-red-100 text-red-700',
    investigating: 'bg-blue-100 text-blue-800',
    resolved: 'bg-emerald-100 text-emerald-800',
    overdue: 'bg-red-100 text-red-700',
    paid: 'bg-emerald-100 text-emerald-800',
    issued: 'bg-blue-100 text-blue-800',
    sent: 'bg-cyan-100 text-cyan-800',
    cancelled: 'bg-gray-100 text-gray-700',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-800',
    in_progress: 'bg-blue-100 text-blue-800',
    pending_verification: 'bg-amber-100 text-amber-800',
    verified: 'bg-teal-100 text-teal-800',
    completed: 'bg-emerald-100 text-emerald-800',
    scheduled: 'bg-sky-100 text-sky-800',
    quarantine: 'bg-amber-100 text-amber-800',
    blocked: 'bg-red-100 text-red-800',
    faulty: 'bg-red-100 text-red-700',
    maintenance: 'bg-amber-100 text-amber-700',
    inactive: 'bg-gray-100 text-gray-600',
    mitigating: 'bg-blue-100 text-blue-700',
    controlled: 'bg-teal-100 text-teal-700',
    accepted: 'bg-emerald-100 text-emerald-700',
    identified: 'bg-amber-100 text-amber-700',
    assessed: 'bg-cyan-100 text-cyan-700',
    reported: 'bg-amber-100 text-amber-800',
    corrective_action: 'bg-blue-100 text-blue-800',
    reopened: 'bg-orange-100 text-orange-800',
    submitted: 'bg-cyan-100 text-cyan-800',
    zm_review: 'bg-indigo-100 text-indigo-800',
    planned: 'bg-sky-100 text-sky-800',
    pending_finance: 'bg-amber-100 text-amber-800',
    pending_hse: 'bg-purple-100 text-purple-800',
    pending_signature: 'bg-teal-100 text-teal-800',
    expired: 'bg-gray-100 text-gray-700',
    terminated: 'bg-red-100 text-red-800',
    pending_review: 'bg-amber-100 text-amber-700',
    pending_inspection: 'bg-sky-100 text-sky-700',
    decommissioned: 'bg-gray-200 text-gray-600',
};

export const SEVERITY_COLORS: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
    minor: 'bg-slate-100 text-slate-700',
    moderate: 'bg-amber-100 text-amber-800',
    serious: 'bg-orange-100 text-orange-800',
    catastrophic: 'bg-red-100 text-red-900',
};

export const RISK_SCORE_COLOR = (score: number): string => {
    if (score >= 20) return 'bg-red-100 text-red-800';
    if (score >= 12) return 'bg-orange-100 text-orange-800';
    if (score >= 6) return 'bg-amber-100 text-amber-800';
    return 'bg-emerald-100 text-emerald-800';
};

export const RISK_SCORE_LABEL = (score: number): string => {
    if (score >= 20) return 'بحرانی';
    if (score >= 12) return 'بالا';
    if (score >= 6) return 'متوسط';
    return 'کم';
};

export const UTILITY_TYPE_COLORS: Record<string, string> = {
    electricity: 'text-amber-600 bg-amber-50',
    water: 'text-blue-600 bg-blue-50',
    gas: 'text-orange-600 bg-orange-50',
    wastewater: 'text-teal-600 bg-teal-50',
    internet: 'text-purple-600 bg-purple-50',
    steam: 'text-red-600 bg-red-50',
    compressed_air: 'text-sky-600 bg-sky-50',
};

// Re-export from formatters for backward compatibility
export { statusLabel } from '../utils/formatters';
