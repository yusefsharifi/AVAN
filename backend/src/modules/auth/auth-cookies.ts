import type { Request, Response } from 'express';
import {
  appendSetCookie,
  generateCsrfToken,
  isSecureRequest,
  parseCookies,
  serializeCookie,
  CSRF_COOKIE_NAME,
  REFRESH_COOKIE_NAME,
} from '../../common/utils/cookie.util';

/** Matches `JWT_REFRESH_EXPIRY` (default 7d) used by auth.service.ts. */
export const REFRESH_COOKIE_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

/**
 * Issue the cookie pair that lets a session survive a full page refresh
 * (BUG-PERSIST-001, approach B(1)):
 *  - `idop_refresh` — HttpOnly, SameSite=Strict, Path=/api/v1/auth
 *  - `idop_csrf`    — readable double-submit token, SameSite=Strict, Path=/
 *
 * Returns the CSRF token so the controller can also expose it in the response
 * payload (the SPA reads it from there / from localStorage and echoes it back
 * in the `X-CSRF-Token` header).
 */
export function setAuthCookies(
  req: Request,
  res: Response,
  refreshToken: string,
): string {
  const secure = isSecureRequest(req.headers as Record<string, string | string[] | undefined>);
  const csrfToken = generateCsrfToken();

  appendSetCookie(
    res,
    serializeCookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure,
      sameSite: 'Strict',
      path: '/api/v1/auth',
      maxAgeSeconds: REFRESH_COOKIE_MAX_AGE_SECONDS,
    }),
  );

  appendSetCookie(
    res,
    serializeCookie(CSRF_COOKIE_NAME, csrfToken, {
      httpOnly: false,
      secure,
      sameSite: 'Strict',
      path: '/',
      maxAgeSeconds: REFRESH_COOKIE_MAX_AGE_SECONDS,
    }),
  );

  return csrfToken;
}

/** Expire both cookies (logout / logout-all). */
export function clearAuthCookies(res: Response): void {
  for (const [name, path] of [
    [REFRESH_COOKIE_NAME, '/api/v1/auth'],
    [CSRF_COOKIE_NAME, '/'],
  ] as const) {
    appendSetCookie(
      res,
      serializeCookie(name, '', {
        httpOnly: name === REFRESH_COOKIE_NAME,
        sameSite: 'Strict',
        path,
        maxAgeSeconds: 0,
        expires: new Date(0),
      }),
    );
  }
}

/** Read the refresh token from the HttpOnly cookie, if present. */
export function readRefreshCookie(req: Request): string | undefined {
  return parseCookies(req.headers.cookie)[REFRESH_COOKIE_NAME];
}
