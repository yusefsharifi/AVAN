import { randomBytes } from 'crypto';

/**
 * Cookie helpers for the refresh-token / CSRF transport (BUG-PERSIST-001).
 *
 * NOTE: NestJS/Express here has NO `cookie-parser` dependency on purpose —
 * these helpers are dependency-free and cover exactly what the auth module
 * needs (read a few cookies, emit a few `Set-Cookie` headers).
 */

export const REFRESH_COOKIE_NAME = 'idop_refresh';
export const CSRF_COOKIE_NAME = 'idop_csrf';

export interface CookieOptions {
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
  path?: string;
  maxAgeSeconds?: number;
  expires?: Date;
}

/** Parse a `Cookie:` request header into a name → value map. */
export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (!name) continue;
    let value = part.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    try {
      out[name] = decodeURIComponent(value);
    } catch {
      out[name] = value;
    }
  }
  return out;
}

/** Serialize a single `Set-Cookie` value. */
export function serializeCookie(
  name: string,
  value: string,
  options: CookieOptions = {},
): string {
  const {
    httpOnly = false,
    secure = false,
    sameSite = 'Strict',
    path = '/',
    maxAgeSeconds,
    expires,
  } = options;

  const segments = [`${name}=${encodeURIComponent(value)}`];
  segments.push(`Path=${path}`);
  segments.push(`SameSite=${sameSite}`);
  if (httpOnly) segments.push('HttpOnly');
  if (secure) segments.push('Secure');
  if (typeof maxAgeSeconds === 'number') segments.push(`Max-Age=${Math.floor(maxAgeSeconds)}`);
  if (expires) segments.push(`Expires=${expires.toUTCString()}`);
  return segments.join('; ');
}

/**
 * Determine whether the client request arrived over TLS.
 * Trusts `X-Forwarded-Proto` because production terminates TLS at nginx
 * (`Frontend/nginx.conf` sets `X-Forwarded-Proto $scheme`).
 */
export function isSecureRequest(headers: Record<string, string | string[] | undefined>): boolean {
  const forwarded = headers['x-forwarded-proto'];
  const proto = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim().toLowerCase();
  if (proto) return proto === 'https';
  return false;
}

/** Cryptographically random, URL-safe token (used for the double-submit CSRF value). */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Append to an existing `Set-Cookie` header without clobbering sibling cookies. */
export function appendSetCookie(
  res: { getHeader(name: string): string | string[] | number | undefined; setHeader(name: string, value: string | string[]): void },
  cookie: string,
): void {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }
  const list = Array.isArray(existing) ? existing.map(String) : [String(existing)];
  res.setHeader('Set-Cookie', [...list, cookie]);
}
