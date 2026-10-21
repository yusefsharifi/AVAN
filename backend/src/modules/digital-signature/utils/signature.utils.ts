import * as crypto from 'crypto';

export function computeSha256Hash(data: Buffer | string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

export function computeSha1Fingerprint(certDer: Buffer): string {
  return crypto.createHash('sha1').update(certDer).digest('hex').match(/.{2}/g)!.join(':').toUpperCase();
}

export function computeSha256Fingerprint(certDer: Buffer): string {
  return crypto.createHash('sha256').update(certDer).digest('hex').match(/.{2}/g)!.join(':').toUpperCase();
}

export function generateVerificationQrHash(signatureValue: string, signedAt: Date, documentId: string): string {
  const data = `${signatureValue}:${signedAt.toISOString()}:${documentId}`;
  return computeSha256Hash(data);
}

export function computeDocumentHash(documentContent: Buffer | string): string {
  return computeSha256Hash(documentContent);
}

export function createOtpSignature(documentHash: string, signerId: string, timestamp: Date, secret: string): string {
  const payload = `${documentHash}:${signerId}:${timestamp.toISOString()}:${secret}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyOtpSignature(signatureValue: string, documentHash: string, signerId: string, timestamp: Date, secret: string): boolean {
  const expected = createOtpSignature(documentHash, signerId, timestamp, secret);
  return crypto.timingSafeEqual(Buffer.from(signatureValue, 'hex'), Buffer.from(expected, 'hex'));
}

export function createHashSignature(documentHash: string, signerId: string, timestamp: Date): string {
  const payload = `${documentHash}:${signerId}:${timestamp.toISOString()}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function generateSystemSecret(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateAgentToken(userId: string): string {
  const payload = `${userId}:${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function parseCertificatePemBasic(pemContent: string): { subject: string; issuer: string; serialNumber: string; validFrom: Date; validTo: Date } | null {
  try {
    const lines = pemContent.replace(/-----BEGIN CERTIFICATE-----/, '').replace(/-----END CERTIFICATE-----/, '').replace(/\s/g, '');
    const certBuffer = Buffer.from(lines, 'base64');
    // Basic parsing - in production use @peculiar/x509 or node-forge
    return {
      subject: 'CN=Unknown',
      issuer: 'CN=Unknown CA',
      serialNumber: crypto.createHash('sha256').update(certBuffer.slice(0, 32)).digest('hex').substring(0, 32),
      validFrom: new Date(),
      validTo: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
  } catch {
    return null;
  }
}

export function formatJalaliDate(date: Date): string {
  // Simplified Jalali conversion
  const gY = date.getFullYear();
  const gM = date.getMonth() + 1;
  const gD = date.getDate();
  const gDaysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const isLeap = (gY % 4 === 0 && gY % 100 !== 0) || gY % 400 === 0;
  if (isLeap) gDaysInMonth[1] = 29;
  const dayOfYear = gDaysInMonth.slice(0, gM - 1).reduce((a, b) => a + b, 0) + gD;
  const jDayOfYear = dayOfYear - 79;
  let jy = gY - 621;
  let jm: number;
  let jd: number;
  const jMonths = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  if (jDayOfYear <= 0) {
    jy -= 1;
    const dayInPrev = jDayOfYear + (jy % 4 === 0 ? 366 : 365);
    let rem = dayInPrev;
    for (let i = 11; i >= 0; i--) { if (rem <= jMonths[i]) { jm = i + 1; jd = rem; break; } rem -= jMonths[i]; }
    jm = jm!; jd = jd!;
  } else {
    let rem = jDayOfYear;
    jm = 1;
    for (let i = 0; i < 12; i++) { if (rem <= jMonths[i]) { jm = i + 1; jd = rem; break; } rem -= jMonths[i]; }
    jd = jd!;
  }
  return `${jy}/${String(jm!).padStart(2, '0')}/${String(jd!).padStart(2, '0')}`;
}
