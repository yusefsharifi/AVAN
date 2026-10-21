export {
  CertificateType,
  CertificateStatus,
  CertStorageType,
  SignableDocumentType,
  SignatureRequestStatus,
  SigningMode,
  SignerStatus,
  SignatureType,
} from '@prisma/client';

export interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; cursor?: string; hasMore: boolean };
}

export interface ParsedCertificateDto {
  commonName: string;
  organizationName?: string;
  organizationalUnit?: string;
  serialNumber: string;
  issuerName: string;
  issuerDN: string;
  subjectDN: string;
  issuedAt: Date;
  expiresAt: Date;
  keyAlgorithm: string;
  keySize: number;
  signatureAlgorithm: string;
  publicKeyPem: string;
  sha1Fingerprint: string;
  sha256Fingerprint: string;
}

export interface CertificateValidityDto {
  isValid: boolean;
  isExpired: boolean;
  isRevoked: boolean;
  daysUntilExpiry: number;
  chainValid: boolean;
  revocationStatus: 'GOOD' | 'REVOKED' | 'UNKNOWN';
}

export interface SignatureRequestStatusDto {
  requestId: string;
  documentTitle: string;
  status: string;
  signers: { name: string; role: string; status: string; signedAt?: Date }[];
  completionPercent: number;
  nextExpectedSigner?: string;
}

export interface SignatureVerificationResult {
  signatureId: string;
  isValid: boolean;
  documentIntact: boolean;
  signatureValid: boolean;
  certificateValid: boolean;
  certificateNotExpiredAtSigning: boolean;
  revocationStatus: string;
  timestampValid: boolean;
  timestampAt?: Date;
  signerName: string;
  signerRole: string;
  signedAt: Date;
  documentTitle: string;
  documentType: string;
  issuerName: string;
  overallResult: 'VALID' | 'INVALID' | 'UNKNOWN';
}

export interface DocumentVerificationResult {
  documentType: string;
  documentId: string;
  documentTitle: string;
  signatures: SignatureVerificationResult[];
  allValid: boolean;
  signerCount: number;
  firstSignedAt?: Date;
  lastSignedAt?: Date;
  isFullySigned: boolean;
  summary: string;
}

export interface SigningStatsDto {
  totalRequests: number;
  completed: number;
  pending: number;
  declined: number;
  expired: number;
  avgSigningHours: number;
  byDocumentType: { type: string; count: number }[];
  byUser: { userId: string; name: string; count: number }[];
  bySignatureType: { type: string; count: number }[];
  pendingCount: number;
}

export interface TimestampResult {
  token: string;
  signedAt: Date;
  tsaName: string;
}

export interface TimestampVerificationResult {
  valid: boolean;
  signedAt?: Date;
  tsaName?: string;
}

export interface TokenInfo {
  serialNumber: string;
  manufacturer: string;
  model: string;
  label: string;
}

export interface HardwareSignResult {
  success: boolean;
  signature?: string;
  certificate?: string;
  error?: string;
}
