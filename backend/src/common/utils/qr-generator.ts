import * as crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// QR Generation & Verification
// ═══════════════════════════════════════════════════════════════════════════════

export type QrType = 'VISITOR' | 'VEHICLE' | 'SHIPMENT' | 'LETTER';

export function generateQrPayload(
  type: QrType,
  id: string,
  zoneId: string,
  secret: string,
): string {
  const message = `${type}:${id}:${zoneId}`;
  const hmac = crypto.createHmac('sha256', secret).update(message).digest('base64');
  return `IDOP:${type}:${id}:${hmac}`;
}

export function verifyQrPayload(
  payload: string,
  zoneId: string,
  secret: string,
): { isValid: boolean; type: QrType; id: string } {
  if (!payload || !payload.startsWith('IDOP:')) {
    return { isValid: false, type: 'VISITOR', id: '' };
  }

  const parts = payload.split(':');
  if (parts.length !== 4) {
    return { isValid: false, type: 'VISITOR', id: '' };
  }

  const [, type, id, providedHmac] = parts;

  if (!['VISITOR', 'VEHICLE', 'SHIPMENT', 'LETTER'].includes(type)) {
    return { isValid: false, type: 'VISITOR', id: '' };
  }

  const message = `${type}:${id}:${zoneId}`;
  const expectedHmac = crypto.createHmac('sha256', secret).update(message).digest('base64');

  // Timing-safe comparison
  const hmacBuffer = Buffer.from(providedHmac);
  const expectedBuffer = Buffer.from(expectedHmac);

  if (hmacBuffer.length !== expectedBuffer.length) {
    return { isValid: false, type: type as QrType, id };
  }

  const isValid = crypto.timingSafeEqual(hmacBuffer, expectedBuffer);
  return { isValid, type: type as QrType, id };
}

export function generateIdempotencyKey(): string {
  return crypto.randomUUID();
}
