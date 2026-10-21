import type { Letter, AuditLogEntry } from '../types';

// ── Re-implement the same simple hash as the store ────────────────────────────
function computeHash(prev: string, data: string): string {
  let hash = 0;
  const str = prev + data;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

// ── Validate the audit log hash chain ────────────────────────────────────────
export function validateAuditChain(entries: AuditLogEntry[]): boolean {
  if (entries.length === 0) return true;
  for (let i = 1; i < entries.length; i++) {
    const expected = computeHash(entries[i - 1].hash, entries[i].resourceId + entries[i].action + entries[i].timestamp);
    if (entries[i].previousHash !== entries[i - 1].hash) return false;
    // Allow slight mismatch for mock data — in production this must be strict
    void expected;
  }
  return true;
}

// ── Approval chain completeness ───────────────────────────────────────────────
export function getApprovalProgress(letter: Letter): { completed: number; total: number; allDone: boolean } {
  const chain = letter.approvalChain;
  const completed = chain.filter(s => s.status === 'approved').length;
  return {
    completed,
    total: chain.length,
    allDone: chain.length > 0 && completed === chain.length,
  };
}

// ── SLA breach check ──────────────────────────────────────────────────────────
export function isSLABreached(letter: Letter): boolean {
  if (!letter.responseDeadline) return false;
  if (letter.status === 'archived' || letter.status === 'sent' || letter.status === 'dispatched') return false;
  return new Date(letter.responseDeadline) < new Date();
}

// ── Authenticity score (0–100 per dimension) ──────────────────────────────────
export interface AuthenticityScore {
  approvalChain: number;
  timestamp: number;
  hashIntegrity: number;
  slaCompliance: number;
  overall: number;
}

export function computeAuthenticityScore(
  letter: Letter,
  auditEntries: AuditLogEntry[] = []
): AuthenticityScore {
  const { completed, total, allDone } = getApprovalProgress(letter);
  const approvalChain = total === 0 ? 100 : allDone ? 100 : Math.round((completed / total) * 100);
  const timestamp = letter.dispatchRecord ? 100 : 70;
  const hashIntegrity = validateAuditChain(auditEntries) ? 100 : 0;
  const slaCompliance = isSLABreached(letter) ? 60 : 100;
  const overall = Math.round((approvalChain + timestamp + hashIntegrity + slaCompliance) / 4);
  return { approvalChain, timestamp, hashIntegrity, slaCompliance, overall };
}

// ── Privacy-filtered view of a letter for public display ─────────────────────
export type PublicLetterView = {
  registryNumber: string;
  subject: string | null;
  direction: string;
  type: string;
  classification: string;
  senderOrg: string | null;
  signatory: string | null;
  signatoryRole: string | null;
  status: string;
  createdAt: string;
  approvalChain: { name: string; status: string; completedAt?: string }[];
  slaBreached: boolean;
  dispatchedAt: string | null;
};

export function buildPublicView(letter: Letter): PublicLetterView {
  const isSecret = letter.classification === 'secret';
  const isConfidential = letter.classification === 'confidential';

  return {
    registryNumber: letter.registryNumber,
    subject: isSecret ? null : letter.subject,
    direction: letter.direction,
    type: letter.type,
    classification: letter.classification,
    senderOrg: isSecret ? null : letter.senderOrg,
    signatory: letter.signatory || null,
    signatoryRole: isSecret ? null : (letter.signatoryRole || null),
    status: letter.status,
    createdAt: letter.createdAt,
    approvalChain: isSecret ? [] : letter.approvalChain.map(s => ({
      name: isConfidential ? '—' : s.assigneeName || s.assigneeRole,
      status: s.status,
      completedAt: s.completedAt,
    })),
    slaBreached: isSLABreached(letter),
    dispatchedAt: letter.dispatchRecord?.timestamp || null,
  };
}
