import type { Request, Response, NextFunction } from 'express';
import { CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, parseCookies } from '../utils/cookie.util';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Double-submit CSRF validation for cookie-authenticated requests (BUG-PERSIST-001).
 *
 * The refresh token travels in an HttpOnly cookie scoped to `Path=/api/v1/auth`,
 * so only `/api/v1/auth/*` requests ever carry it. For any state-changing method
 * that arrives WITH that cookie, the `X-CSRF-Token` header must match the readable
 * `idop_csrf` cookie. Bearer-only API traffic (no refresh cookie) is unaffected,
 * and the CORS whitelist stays exactly as it was.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const cookies = parseCookies(req.headers.cookie);
  if (!cookies[REFRESH_COOKIE_NAME]) {
    // Not a cookie-authenticated request — standard Bearer flow.
    next();
    return;
  }

  const csrfCookie = cookies[CSRF_COOKIE_NAME];
  const headerValue = req.headers['x-csrf-token'];
  const csrfHeader = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (!csrfCookie || !csrfHeader || csrfHeader !== csrfCookie) {
    // Respond with the platform response envelope (middleware runs outside the
    // NestJS exception-filter chain, so the body is produced here directly).
    res.status(403).json({
      success: false,
      code: 'CSRF_TOKEN_INVALID',
      message: 'درخواست نامعتبر: توکن CSRF یافت نشد. لطفاً دوباره وارد شوید.',
    });
    return;
  }

  next();
}
