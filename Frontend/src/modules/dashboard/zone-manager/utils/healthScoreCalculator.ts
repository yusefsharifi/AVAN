import type { CompanyHealthScore } from '../types';
import { useCompanyStore } from '../store/useCompanyStore';
import { useUtilityStore } from '../store/useUtilityStore';
import { useHSEStore } from '../store/useHSEStore';
import { useLeaseStore } from '../store/useLeaseStore';
import { useOperationsStore } from '../store/useOperationsStore';

export const calculateCompanyHealthScore = (companyId: string): CompanyHealthScore => {
    const company = useCompanyStore.getState().getById(companyId);
    const { invoices } = useUtilityStore.getState();
    const { risks, incidents, capas } = useHSEStore.getState();
    const { contracts } = useLeaseStore.getState();
    const { alerts } = useOperationsStore.getState();

    const riskIndicators: string[] = [];
    const recommendations: string[] = [];

    // Financial Score Base (100)
    let financial = 100;
    const overdueInvoices = invoices.filter(i => i.companyId === companyId && i.paymentStatus === 'overdue');
    if (overdueInvoices.length > 0) {
        financial -= overdueInvoices.length * 10;
        riskIndicators.push(`${overdueInvoices.length} صورتحساب معوق`);
        recommendations.push('پیگیری تسویه صورتحساب‌های معوق');
    }

    // HSE Score Base (100)
    let hse = 100;
    const activeRisks = risks.filter(r => r.companyId === companyId && ['identified', 'assessed'].includes(r.status));
    const openCapas = capas.filter(c => c.status === 'open' || c.status === 'in_progress');

    // Actually we need capas for this company but capas source id can be incident id. 
    // For simplicity we penalize based on active high risks and recent incidents
    const highRisks = activeRisks.filter(r => r.riskScore >= 12);
    if (highRisks.length > 0) {
        hse -= highRisks.length * 15;
        riskIndicators.push(`${highRisks.length} ریسک شناسایی شده بالا/بحرانی`);
        recommendations.push('اقدام فوری برای کاهش ریسک‌های بحرانی');
    }

    const recentIncidents = incidents.filter(i => i.companyId === companyId && ['moderate', 'serious', 'critical', 'catastrophic'].includes(i.severity));
    if (recentIncidents.length > 0) {
        hse -= recentIncidents.length * 20;
        riskIndicators.push(`ثبت ${recentIncidents.length} حادثه قابل توجه`);
    }

    // Operational Score Base (100)
    let operational = 100;
    const companyAlerts = alerts.filter(a => a.companyId === companyId && ['open', 'investigating'].includes(a.status));
    if (companyAlerts.length > 0) {
        operational -= companyAlerts.length * 5;
    }

    // Energy Score Base (100)
    let energy = 100;
    // Simulating energy efficiency (mock logic)
    if (company?.needsHighVoltage) {
        energy -= 10;
    }

    // Engagement Score Base (100)
    let engagement = 100;
    if (!company?.hseContact || !company?.financialContact) {
        engagement -= 20;
        recommendations.push('تکمیل اطلاعات رابطین شرکت');
    }

    // Lease Compliance (100)
    let leaseCompliance = 100;
    const activeContracts = contracts.filter(c => c.companyId === companyId && c.status === 'active');
    if (activeContracts.length === 0) {
        leaseCompliance = 0;
        riskIndicators.push('فقدان قرارداد فعال');
    }

    // Ensure lower bound 0
    financial = Math.max(0, financial);
    hse = Math.max(0, hse);
    operational = Math.max(0, operational);
    energy = Math.max(0, energy);
    engagement = Math.max(0, engagement);
    leaseCompliance = Math.max(0, leaseCompliance);

    const overall = Math.round((financial * 0.25) + (hse * 0.25) + (operational * 0.2) + (leaseCompliance * 0.2) + (energy * 0.05) + (engagement * 0.05));

    return {
        companyId,
        overall,
        financial,
        hse,
        operational,
        energy,
        engagement,
        leaseCompliance,
        riskIndicators,
        recommendations
    };
};
