// Persian number and date formatting utilities

export const toPersianNum = (num: number | string): string => {
    return String(num).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[parseInt(d)]);
};

export const formatPersianNumber = (num: number): string => {
    return num.toLocaleString('fa-IR');
};

export const formatCurrency = (amount: number): string => {
    return `${formatPersianNumber(amount)} ریال`;
};

export const formatCurrencyToman = (amount: number): string => {
    return `${formatPersianNumber(Math.floor(amount / 10))} تومان`;
};

export const formatJalaliDate = (isoDate: string): string => {
    if (!isoDate) return '—';
    if (/[۰-۹]/.test(isoDate) || /^\d{4}\/\d{2}\/\d{2}/.test(isoDate)) return isoDate;
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        const parts = d.toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return parts;
    } catch {
        return isoDate.slice(0, 10);
    }
};

export const formatJalaliDateTime = (isoDate: string): string => {
    if (!isoDate) return '—';
    if (/[۰-۹]/.test(isoDate)) return isoDate;
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        const date = d.toLocaleDateString('fa-IR-u-ca-persian', { year: 'numeric', month: '2-digit', day: '2-digit' });
        const time = d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
        return `${date} ${time}`;
    } catch {
        return isoDate.slice(0, 16).replace('T', ' ');
    }
};

export const relativeTimeLabel = (isoDate: string): string => {
    try {
        const d = new Date(isoDate);
        if (isNaN(d.getTime())) return isoDate;
        const diffMs = Date.now() - d.getTime();
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffDays === 0) return 'امروز';
        if (diffDays === 1) return 'دیروز';
        if (diffDays < 7) return `${toPersianNum(diffDays)} روز پیش`;
        if (diffDays < 30) return `${toPersianNum(Math.floor(diffDays / 7))} هفته پیش`;
        return formatJalaliDate(isoDate);
    } catch {
        return isoDate;
    }
};

export const severityLabel = (s: string): string => {
    const map: Record<string, string> = {
        low: 'کم', medium: 'متوسط', high: 'بالا', critical: 'بحرانی',
        minor: 'جزئی', moderate: 'متوسط', serious: 'جدی', catastrophic: 'فاجعه‌آمیز',
    };
    return map[s] ?? s;
};

export const statusLabel = (s: string): string => {
    const map: Record<string, string> = {
        active: 'فعال', applicant: 'متقاضی', under_review: 'در بررسی', finance_review: 'بررسی مالی',
        hse_review: 'بررسی HSE', plot_allocation: 'تخصیص زمین', zone_manager_approval: 'تأیید مدیر',
        suspended: 'معلق', closed: 'بسته', draft: 'پیش‌نویس', pending: 'در انتظار',
        open: 'باز', investigating: 'در حال بررسی', resolved: 'حل شده',
        reported: 'گزارش شده', corrective_action: 'اقدام اصلاحی', reopened: 'بازگشایی شده',
        identified: 'شناسایی', assessed: 'ارزیابی', mitigating: 'کاهش ریسک',
        controlled: 'کنترل شده', accepted: 'قبول شده', in_progress: 'در جریان',
        pending_verification: 'در انتظار تأیید', verified: 'تأیید شده',
        submitted: 'ارسال شده', zm_review: 'بررسی مدیر',
        approved: 'تأیید شده', cancelled: 'لغو شده', completed: 'تکمیل',
        scheduled: 'برنامه‌ریزی شده', overdue: 'معوق', planned: 'برنامه‌ریزی',
        pending_finance: 'بررسی مالی', pending_hse: 'بررسی HSE', pending_signature: 'در انتظار امضا',
        expired: 'منقضی', terminated: 'فسخ شده',
        issued: 'صادر شده', sent: 'ارسال شده', paid: 'پرداخت شده',
        quarantine: 'قرنطینه', blocked: 'مسدود',
        faulty: 'معیوب', maintenance: 'تعمیر', inactive: 'غیرفعال', decommissioned: 'از رده خارج',
        pending_review: 'در انتظار بررسی', rejected: 'رد شده',
        pending_inspection: 'در انتظار بازرسی',
    };
    return map[s] ?? s;
};

export const utilityTypeLabel = (t: string): string => {
    const map: Record<string, string> = {
        electricity: 'برق', water: 'آب', gas: 'گاز', wastewater: 'فاضلاب',
        internet: 'اینترنت', steam: 'بخار', compressed_air: 'هوای فشرده',
    };
    return map[t] ?? t;
};

export const industryLabel = (i: string): string => i;
