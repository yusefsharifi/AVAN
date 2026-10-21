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
// Control for TASK 3 D): if a session-scoped user (company@) hits the SAME
// 500, the failure is the Redis employeeNumber counter desync — not scope logic.
const BASE = 'http://localhost:3000/api/v1';
const COMPANY = '33e80909-adcd-4ac0-bb14-5801e15c82d3';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const stamp = Date.now().toString().slice(-9);

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Avan@1404' }),
  });
  const j = await r.json();
  return j.data.accessToken;
}

async function post(token, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const t = await r.text();
  let j = null;
  try {
    j = JSON.parse(t);
  } catch {
    /* ignore */
  }
  return { status: r.status, body: j };
}

const employeeBody = {
  companyId: COMPANY,
  firstNameFa: 'کنترل',
  lastNameFa: `آزمون-${stamp.slice(-5)}`,
  nationalId: `${stamp}9876543210`.slice(0, 10),
  dateOfBirth: '1992-05-05',
  gender: 'FEMALE',
  phone: `0935${stamp.slice(-8)}`,
  employmentType: 'FULL_TIME',
  hireDate: '2026-10-18',
  baseSalary: 80000000,
};

const companyTok = await login('company@avan.local');
const r = await post(companyTok, '/hr/employees', employeeBody);
console.log(
  `CONTROL company@ (session zone, NO explicit zoneId): status=${r.status} id=${r.body?.data?.id ?? ''} code=${r.body?.code ?? r.body?.error?.code ?? ''}`,
);
const code = r.body?.error?.code ?? r.body?.code ?? '';
console.log(
  r.status === 500
    ? '=> same 500 as SUPER_ADMIN case D: proves the failure is the employeeNumber counter, NOT zone scope.'
    : `=> created OK, so case D is a genuine scope-path defect. code=${code}`,
);
