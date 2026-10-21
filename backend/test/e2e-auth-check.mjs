/**
 * IDOP Auth E2E Verification (SEC-004 / BUG-001 regression check)
 *
 * Flow:
 *  1. POST /auth/register        → expect success (user created as COMPANY_STAFF/PENDING — SEC-005)
 *  2. Activate user directly in DB (bypass OTP)
 *  3. POST /auth/login           → expect accessToken + refreshToken
 *  4. GET  /auth/me              → expect 200 with Bearer token
 *  5. POST /auth/logout          → expect success
 *  6. GET  /auth/me (same token) → expect 401 (Redis blacklist — SEC-004)
 *
 * Run: cd backend && node test/e2e-auth-check.mjs
 */
import { PrismaClient } from '@prisma/client';

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000/api/v1';
const prisma = new PrismaClient();

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return { status: res.status, json };
}

async function main() {
  const stamp = Date.now();
  const email = `e2e-${stamp}@idop-test.local`;
  const phone = `0912${String(stamp).slice(-8)}`;
  const password = 'Test1234!';

  // 1. Register — role must NOT be accepted from client (SEC-005)
  // Case A: payload with privileged role must be rejected outright (forbidNonWhitelisted)
  const escalation = await api('POST', '/auth/register', {
    body: { email, phone, password, firstName: 'E2E', lastName: 'Test', role: 'SUPER_ADMIN' },
  });
  check('register with client-supplied role REJECTED (SEC-005)', escalation.status === 400, `status=${escalation.status}`);

  // Case B: clean payload succeeds and defaults to COMPANY_STAFF
  const reg = await api('POST', '/auth/register', {
    body: { email, phone, password, firstName: 'E2E', lastName: 'Test' },
  });
  check('register returns 2xx', reg.status >= 200 && reg.status < 300, `status=${reg.status}`);

  const dbUser = await prisma.user.findUnique({ where: { email } });
  check('user persisted in DB', !!dbUser, dbUser ? `role=${dbUser.role}` : 'NOT FOUND');
  check('registered role is COMPANY_STAFF (SEC-005)', dbUser?.role === 'COMPANY_STAFF', `actual=${dbUser?.role}`);
  check('user starts as PENDING', dbUser?.status === 'PENDING', `actual=${dbUser?.status}`);

  if (!dbUser) process.exit(1);

  // 2. Activate user directly in DB (simulates verified OTP)
  await prisma.user.update({ where: { id: dbUser.id }, data: { status: 'ACTIVE' } });

  // 3. Login
  const login = await api('POST', '/auth/login', { body: { identifier: email, password } });
  check('login returns 2xx', login.status >= 200 && login.status < 300, `status=${login.status}`);
  const accessToken = login.json?.data?.accessToken ?? login.json?.accessToken;
  const refreshToken = login.json?.data?.refreshToken ?? login.json?.refreshToken;
  check('login returns accessToken', !!accessToken);
  check('login returns refreshToken', !!refreshToken);
  if (!accessToken) process.exit(1);

  // 4. Authenticated request
  const me = await api('GET', '/auth/me', { token: accessToken });
  check('GET /auth/me with token returns 200', me.status === 200, `status=${me.status}`);

  // 5. Logout
  const logout = await api('POST', '/auth/logout', { token: accessToken });
  check('logout returns 2xx', logout.status >= 200 && logout.status < 300, `status=${logout.status}`);

  // 6. Token reuse after logout — must be rejected (SEC-004 core requirement)
  const reuse = await api('GET', '/auth/me', { token: accessToken });
  check('token REJECTED after logout (SEC-004)', reuse.status === 401, `status=${reuse.status}`);

  // Session state check
  const sessions = await prisma.userSession.findMany({ where: { userId: dbUser.id } });
  const allRevoked = sessions.length > 0 && sessions.every((s) => s.isRevoked);
  check('all DB sessions revoked after logout', allRevoked, `sessions=${sessions.length}`);

  // Cleanup
  await prisma.userSession.deleteMany({ where: { userId: dbUser.id } });
  await prisma.user.delete({ where: { id: dbUser.id } }).catch(() => {});

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length ? 1 : 0);
}

main()
  .catch((e) => { console.error('E2E_FATAL:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
