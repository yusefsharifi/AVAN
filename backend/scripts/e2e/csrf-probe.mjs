/**
 * E2E verification harness for the IDOP/AVAN backend.
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on http://localhost:3000/api/v1
 * and asserts against PostgreSQL directly via psql.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis. These harnesses depend on a throwaway in-memory
 *   RESP2 shim listening on 127.0.0.1:6379 (mini-redis.mjs, kept OUTSIDE the repo).
 *   That shim is TEST SCAFFOLD ONLY: not a product component, not referenced by any
 *   runtime code, and must never be shipped or cited as one. Production uses the real
 *   Redis declared in docker-compose.yml -- see docs/DEPLOYMENT.md.
 *
 *   The in-memory shim resets on restart, so its INCR counters restart at 1 and would
 *   collide with numbers already persisted (SO-2026-00001, EMP-...). crud-verify
 *   therefore fast-forwards every counter above the highest value in Postgres first.
 *
 *   browser-survival.mjs additionally needs puppeteer-core (dev-only), which lives in
 *   the harness runtime's node_modules -- run it from there or install it alongside.
 *
 * Source of these files: the Step 4 verification session. See docs/FINAL-REPORT.md
 * section 8 for the artifact index and section 6 for the recorded results.
 */
// CSRF double-submit gate check (BUG-PERSIST-001).
// A state-changing request that carries the HttpOnly idop_refresh cookie MUST be
// rejected with 403 unless x-csrf-token matches the readable idop_csrf cookie.
const BASE = 'http://localhost:3000/api/v1';
let pass = 0, fail = 0;
const rec = (ok, label, extra = '') => {
  if (ok) { pass++; console.log(`PASS | ${label} | ${extra}`); }
  else { fail++; console.log(`FAIL | ${label} | ${extra}`); }
};

const getSetCookies = (res) =>
  typeof res.headers.getSetCookie === 'function'
    ? res.headers.getSetCookie()
    : [res.headers.get('set-cookie')].filter(Boolean);

const jar = (setCookies) => {
  const out = {};
  for (const c of setCookies) {
    const [pair] = c.split(';');
    const i = pair.indexOf('=');
    if (i > 0) out[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return out;
};

const loginRes = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ identifier: 'company@avan.local', password: 'Avan@1404' }),
});
const loginBody = await loginRes.json().catch(() => ({}));
const accessToken = loginBody?.data?.accessToken;
const cookies = jar(getSetCookies(loginRes));
rec(loginRes.status === 200, 'login succeeds', `status=${loginRes.status}`);
rec(!!cookies.idop_refresh, 'login sets idop_refresh (HttpOnly)', String(!!cookies.idop_refresh));
rec(!!cookies.idop_csrf, 'login sets idop_csrf (JS-readable)', String(!!cookies.idop_csrf));
rec(!!accessToken, 'login returns accessToken', String(!!accessToken));

if (!cookies.idop_refresh || !cookies.idop_csrf || !accessToken) {
  console.log('\nCSRF SUMMARY: aborted - login did not produce cookies/token');
  process.exit(1);
}

// 1) State-changing request WITH refresh cookie, NO CSRF header -> must be 403.
const noHeader = await fetch(`${BASE}/auth/logout`, {
  method: 'POST',
  headers: { cookie: `idop_refresh=${cookies.idop_refresh}; idop_csrf=${cookies.idop_csrf}` },
});
const noHeaderBody = await noHeader.json().catch(() => ({}));
rec(noHeader.status === 403, 'refresh cookie WITHOUT x-csrf-token -> 403',
  `status=${noHeader.status} code=${noHeaderBody.code}`);

// 2) Same request WITH a WRONG CSRF header -> must still be 403.
const badHeader = await fetch(`${BASE}/auth/logout`, {
  method: 'POST',
  headers: {
    cookie: `idop_refresh=${cookies.idop_refresh}; idop_csrf=${cookies.idop_csrf}`,
    'x-csrf-token': 'definitely-not-the-cookie-value',
  },
});
rec(badHeader.status === 403, 'mismatched x-csrf-token -> 403', `status=${badHeader.status}`);

// 3) Control: correct CSRF header -> not a CSRF rejection.
const goodHeader = await fetch(`${BASE}/auth/logout`, {
  method: 'POST',
  headers: {
    cookie: `idop_refresh=${cookies.idop_refresh}; idop_csrf=${cookies.idop_csrf}`,
    'x-csrf-token': cookies.idop_csrf,
  },
});
rec(goodHeader.status !== 403, 'matching x-csrf-token -> accepted (not 403)',
  `status=${goodHeader.status}`);

// 4) Bearer-only traffic (no refresh cookie) is unaffected by design.
const bearer = await fetch(`${BASE}/auth/me`, {
  headers: { authorization: `Bearer ${accessToken}` },
});
const bearerBody = await bearer.json().catch(() => ({}));
rec(bearer.status === 200, 'Bearer-only flow unaffected by CSRF (no refresh cookie)',
  `status=${bearer.status} role=${bearerBody?.data?.role ?? 'n/a'}`);

console.log(`\nCSRF SUMMARY: ${pass} / ${pass + fail} checks passed`);
process.exit(fail === 0 ? 0 : 1);
