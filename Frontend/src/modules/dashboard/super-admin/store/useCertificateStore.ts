// ============================================================================
// src/modules/dashboard/super-admin/store/useCertificateStore.ts
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useNationalStore } from './useNationalStore';
import { createDiff } from '@/entities/audit';
import type { AuditLogEntry } from '@/entities/audit';
import { api } from '@/shared/api/client';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

export type CertificateTypeCode =
  | 'ISO_9001'
  | 'ISO_14001'
  | 'ISO_45001'
  | 'SAFETY_QUALIFICATION'
  | 'OPERATING_LICENSE'
  | 'CONSTRUCTION_PERMIT'
  | 'HSE_APPROVAL'
  | 'LAND_LEASE_CONTRACT';

export type CertificateStatus = 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'PENDING_RENEWAL';

export interface CertificateTypeDef {
  id: string;
  code: CertificateTypeCode;
  nameFa: string;
  nameEn: string;
  defaultValidityMonths: number;
  issuingAuthority: string;
  mandatoryForOperation: boolean;
  renewalReminderDays: number;
}

export interface CompanyCertificate {
  id: string;
  companyId: string;
  zoneId: string;
  typeCode: CertificateTypeCode;
  issueDate: string;
  expiryDate: string;
  certificateNumber: string;
  issuingAuthorityName: string;
  scannedFileName?: string;
  scannedFileUrl?: string;
  status: CertificateStatus;
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  Mock Data                                                         */
/* ------------------------------------------------------------------ */

function getDefaultTypes(): CertificateTypeDef[] {
  return [
    { id: 'CT-001', code: 'ISO_9001', nameFa: 'ایزو ۹۰۰۱', nameEn: 'ISO 9001', defaultValidityMonths: 36, issuingAuthority: 'سازمان استاندارد', mandatoryForOperation: false, renewalReminderDays: 30 },
    { id: 'CT-002', code: 'ISO_14001', nameFa: 'ایزو ۱۴۰۰۱', nameEn: 'ISO 14001', defaultValidityMonths: 36, issuingAuthority: 'سازمان استاندارد', mandatoryForOperation: false, renewalReminderDays: 30 },
    { id: 'CT-003', code: 'ISO_45001', nameFa: 'ایزو ۴۵۰۰۱', nameEn: 'ISO 45001', defaultValidityMonths: 36, issuingAuthority: 'سازمان استاندارد', mandatoryForOperation: false, renewalReminderDays: 30 },
    { id: 'CT-004', code: 'SAFETY_QUALIFICATION', nameFa: 'صلاحیت ایمنی', nameEn: 'Safety Qualification', defaultValidityMonths: 24, issuingAuthority: 'وزارت کار', mandatoryForOperation: true, renewalReminderDays: 15 },
    { id: 'CT-005', code: 'OPERATING_LICENSE', nameFa: 'پروانه بهره‌برداری', nameEn: 'Operating License', defaultValidityMonths: 60, issuingAuthority: 'وزارت صنعت', mandatoryForOperation: true, renewalReminderDays: 30 },
    { id: 'CT-006', code: 'CONSTRUCTION_PERMIT', nameFa: 'مجوز ساخت', nameEn: 'Construction Permit', defaultValidityMonths: 24, issuingAuthority: 'شهرداری', mandatoryForOperation: false, renewalReminderDays: 15 },
    { id: 'CT-007', code: 'HSE_APPROVAL', nameFa: 'تأییدیه HSE', nameEn: 'HSE Approval', defaultValidityMonths: 12, issuingAuthority: 'اداره HSE', mandatoryForOperation: true, renewalReminderDays: 7 },
    { id: 'CT-008', code: 'LAND_LEASE_CONTRACT', nameFa: 'قرارداد اجاره زمین', nameEn: 'Land Lease Contract', defaultValidityMonths: 120, issuingAuthority: 'سازمان شهرک‌ها', mandatoryForOperation: true, renewalReminderDays: 30 },
  ];
}

function generateMockCertificates(companies: { id: string; zoneId: string }[]): CompanyCertificate[] {
  const certs: CompanyCertificate[] = [];
  const types: CertificateTypeCode[] = ['ISO_9001', 'ISO_14001', 'OPERATING_LICENSE', 'HSE_APPROVAL', 'LAND_LEASE_CONTRACT', 'SAFETY_QUALIFICATION', 'CONSTRUCTION_PERMIT'];
  let idx = 0;

  for (const comp of companies) {
    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const type = types[idx % types.length];
      const issueOffset = -600 + Math.floor(Math.random() * 540);
      const issueDate = new Date();
      issueDate.setDate(issueDate.getDate() + issueOffset);
      const validityMonths = [12, 24, 36, 60, 120][idx % 5];
      const expiryDate = new Date(issueDate);
      expiryDate.setMonth(expiryDate.getMonth() + validityMonths);

      const now = new Date();
      let status: CertificateStatus = 'ACTIVE';
      if (expiryDate < now) status = 'EXPIRED';
      else if (expiryDate.getTime() - now.getTime() < 30 * 86400000) status = 'PENDING_RENEWAL';

      certs.push({
        id: `CERT-${String(idx + 1).padStart(4, '0')}`,
        companyId: comp.id,
        zoneId: comp.zoneId,
        typeCode: type,
        issueDate: issueDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        certificateNumber: `CN-${Date.now()}-${idx}`,
        issuingAuthorityName: 'سازمان مربوطه',
        status,
        createdAt: issueDate.toISOString(),
        updatedAt: new Date().toISOString(),
      });
      idx++;
    }
  }
  return certs;
}

/* ------------------------------------------------------------------ */
/*  Store                                                             */
/* ------------------------------------------------------------------ */

interface CertificateState {
  certificateTypes: CertificateTypeDef[];
  certificates: CompanyCertificate[];
  isLoading: boolean;
  error: string | null;
}

interface CertificateActions {
  initCertificateData: (companies: { id: string; zoneId: string }[]) => void;
  loadFromApi: () => Promise<void>;
  addType: (type: Omit<CertificateTypeDef, 'id'>) => void;
  updateType: (id: string, partial: Partial<CertificateTypeDef>) => void;
  deleteType: (id: string) => void;
  issueCertificate: (cert: Omit<CompanyCertificate, 'id' | 'createdAt' | 'updatedAt'>) => CompanyCertificate;
  updateCertificate: (id: string, partial: Partial<CompanyCertificate>) => void;
  revokeCertificate: (id: string, reason?: string) => void;
  getCertificatesByCompany: (companyId: string) => CompanyCertificate[];
  getExpiringCertificates: (days: number) => CompanyCertificate[];
  getExpiredCertificates: () => CompanyCertificate[];
  recalcStatuses: () => void;
}

type FullCertState = CertificateState & CertificateActions;

const generateId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export const useCertificateStore = create<FullCertState>()(
  persist(
    (set, get) => ({
      certificateTypes: [],
      certificates: [],
      isLoading: false,
      error: null,

      initCertificateData: (companies) => {
        set({ certificateTypes: [], certificates: [] });
      },

      loadFromApi: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await api.get<unknown[]>('/signatures/certificates');
          set({ certificates: (Array.isArray(data) ? data : []) as unknown as CompanyCertificate[], isLoading: false });
        } catch (error: any) {
          set({ isLoading: false, error: error?.message || 'خطا در دریافت گواهینامه‌ها' });
        }
      },

      addType: (type) => {
        const newType: CertificateTypeDef = { ...type, id: `CT-${Date.now()}` };
        set((s) => ({ certificateTypes: [...s.certificateTypes, newType] }));
      },

      updateType: (id, partial) => {
        set((s) => ({
          certificateTypes: s.certificateTypes.map((t) => (t.id === id ? { ...t, ...partial } : t)),
        }));
      },

      deleteType: (id) => {
        set((s) => ({ certificateTypes: s.certificateTypes.filter((t) => t.id !== id) }));
      },

      issueCertificate: (cert) => {
        const newCert: CompanyCertificate = {
          ...cert,
          id: `CERT-${Date.now()}`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        set((s) => ({ certificates: [...s.certificates, newCert] }));
        
        useNationalStore.getState().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId: 'current-user',
          actorName: 'مدیر سیستم ملی',
          actorRole: 'SUPER_ADMIN',
          action: 'CREATE',
          entityType: 'certificate',
          entityId: newCert.id,
          snapshot: newCert as unknown as Record<string, unknown>,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          portal: 'super-admin',
          success: true,
          zoneId: newCert.zoneId,
          companyId: newCert.companyId,
        } as AuditLogEntry);

        return newCert;
      },

      updateCertificate: (id, partial) => {
        set((s) => ({
          certificates: s.certificates.map((c) =>
            c.id === id
              ? {
                  ...c,
                  ...partial,
                  updatedAt: new Date().toISOString(),
                }
              : c
          ),
        }));
      },

      revokeCertificate: (id, reason) => {
        set((s) => ({
          certificates: s.certificates.map((c) =>
            c.id === id ? { ...c, status: 'REVOKED' as CertificateStatus, updatedAt: new Date().toISOString() } : c
          ),
        }));
        
        useNationalStore.getState().addAuditLog({
          id: generateId(),
          timestamp: new Date().toISOString(),
          actorId: 'current-user',
          actorName: 'مدیر سیستم ملی',
          actorRole: 'SUPER_ADMIN',
          action: 'UPDATE',
          entityType: 'certificate',
          entityId: id,
          ipAddress: '127.0.0.1',
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          portal: 'super-admin',
          success: true,
          note: reason,
        } as AuditLogEntry);
      },

      getCertificatesByCompany: (companyId) => get().certificates.filter((c) => c.companyId === companyId),
      getExpiringCertificates: (days) => {
        const now = new Date().getTime();
        const threshold = now + days * 86400000;
        return get().certificates.filter((c) => c.status === 'ACTIVE' && new Date(c.expiryDate).getTime() < threshold);
      },
      getExpiredCertificates: () => get().certificates.filter((c) => c.status === 'EXPIRED'),
      recalcStatuses: () => {
        const now = new Date().getTime();
        set((s) => ({
          certificates: s.certificates.map((c) => {
            const expiry = new Date(c.expiryDate).getTime();
            if (c.status === 'REVOKED') return c;
            if (expiry < now) return { ...c, status: 'EXPIRED' as CertificateStatus };
            if (expiry < now + 30 * 86400000) return { ...c, status: 'PENDING_RENEWAL' as CertificateStatus };
            return { ...c, status: 'ACTIVE' as CertificateStatus };
          }),
        }));
      },
    }),
    {
      name: 'super-admin-certificate-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
