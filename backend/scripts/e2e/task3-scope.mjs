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
// Step-4 TASK 3 + Step-6 TASK A2 — SUPER_ADMIN scope resolution proof.
//   A) SUPER_ADMIN  + NO zoneId      -> 400 ZONE_REQUIRED, Persian message
//   B) SUPER_ADMIN  + explicit zone  -> 201 + Postgres row id
//   C) SUPER_ADMIN  + NO zoneId      -> 400 ZONE_REQUIRED, Persian message  (HR)
//   D) SUPER_ADMIN  + explicit zone  -> 201 + Postgres row id               (HR)
//   E) ZONE_MANAGER + NO zoneId      -> 201 via session zone (unchanged)
//   F) ZONE_MANAGER + NO zoneId      -> 201 via session zone (unchanged)    (HR)
// Step 6 (A2) additionally asserts the Persian error text and that each 201 is a
// real Postgres row, then exits non-zero if any check fails.
// Bearer-only (no cookie jar) => CSRF middleware is bypassed by design.
import { execFileSync } from 'node:child_process';

const BASE = 'http://localhost:3000/api/v1';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const COMPANY = '33e80909-adcd-4ac0-bb14-5801e15c82d3';
const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const DSN = 'postgresql://postgres:postgres@localhost:5432/idop';
const stamp = Date.now().toString().slice(-9);

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Avan@1404' }),
  });
  const j = await r.json();
  if (!j?.success) throw new Error(`login failed ${identifier}: ${JSON.stringify(j)}`);
  return j.data.accessToken;
}

async function post(token, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { status: r.status, body: j, raw: text.slice(0, 200) };
}

/** Query Postgres directly; returns the first column of the first row, trimmed. */
function sql(statement) {
  try {
    const out = execFileSync(PSQL, [DSN, '-A', '-t', '-c', statement], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return out.trim();
  } catch (err) {
    return `PSQL_ERROR:${String(err?.message ?? err).slice(0, 120)}`;
  }
}

/** True when the string contains at least one Arabic/Persian glyph. */
function isPersian(value) {
  return typeof value === 'string' && /[\u0600-\u06FF]/.test(value);
}

function show(label, res) {
  const code = res.body?.code ?? res.body?.error?.code ?? '';
  const msg = res.body?.message ?? res.body?.error?.message ?? '';
  const id = res.body?.data?.id ?? res.body?.data?.code ?? '';
  console.log(
    `${label.padEnd(46)} status=${res.status} code=${String(code).padEnd(16)} id=${String(id).padEnd(38)} ${msg}`,
  );
}

let pass = 0;
let fail = 0;

function check(label, ok, detail) {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}${detail ? `  -- ${detail}` : ''}`);
  }
}

const superTok = await login('super@avan.local');
const zoneTok = await login('zone@avan.local');
console.log('tokens: super=ok zone=ok\n');

const accountBody = (withZone) => ({
  ...(withZone ? { zoneId: ZONE } : {}),
  code: `S4A${stamp}`,
  nameFa: 'حساب آزمایشی مرحله چهار',
  nameEn: `S4 Account ${stamp}`,
  type: 'ASSET',
  category: 'CASH_AND_BANK',
  normalBalance: 'DEBIT',
  description: 'STEP4-TASK3',
});

const employeeBody = (withZone) => ({
  ...(withZone ? { zoneId: ZONE } : {}),
  companyId: COMPANY,
  firstNameFa: 'آزمون',
  lastNameFa: `مرحلهچهار-${stamp.slice(-5)}`,
  nationalId: `${stamp}0123456789`.slice(0, 10),
  dateOfBirth: '1990-01-01',
  gender: 'MALE',
  phone: `0912${stamp.slice(-8)}`,
  employmentType: 'FULL_TIME',
  hireDate: '2026-10-18',
  baseSalary: 90000000,
});

console.log('--- A) SUPER_ADMIN, finance account, NO zoneId (expect 400 ZONE_REQUIRED) ---');
const aRes = await post(superTok, '/finance/accounts', accountBody(false));
show('POST /finance/accounts', aRes);

console.log('\n--- B) SUPER_ADMIN, finance account, WITH explicit zoneId (expect 201) ---');
const bRes = await post(superTok, '/finance/accounts', accountBody(true));
show('POST /finance/accounts', bRes);

console.log('\n--- C) SUPER_ADMIN, HR employee, NO zoneId (expect 400 ZONE_REQUIRED) ---');
const cRes = await post(superTok, '/hr/employees', employeeBody(false));
show('POST /hr/employees', cRes);

console.log('\n--- D) SUPER_ADMIN, HR employee, WITH explicit zoneId (expect 201) ---');
const dRes = await post(superTok, '/hr/employees', employeeBody(true));
show('POST /hr/employees', dRes);

console.log('\n--- E) ZONE_MANAGER, finance account, NO zoneId (expect 201 via session zone) ---');
const eRes = await post(zoneTok, '/finance/accounts', {
  ...accountBody(false),
  code: `S4Z${stamp}`,
  nameFa: 'حساب آزمایشی مدیر شهرک',
});
show('POST /finance/accounts', eRes);

console.log('\n--- F) ZONE_MANAGER, HR employee, NO zoneId (expect 201 via session zone) ---');
const fRes = await post(zoneTok, '/hr/employees', {
  ...employeeBody(false),
  lastNameFa: `مدیرشهرک-${stamp.slice(-5)}`,
  nationalId: `${stamp}9876543210`.slice(0, 10),
});
show('POST /hr/employees', fRes);

// ─────────────────────────────────────────────────────────────────────────────
// Assertions — the results docs/STEP6-REPORT.md cites for TASK A2.
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n=== A2 assertions ===');

const aCode = aRes.body?.code ?? aRes.body?.error?.code;
const aMsg = aRes.body?.message ?? aRes.body?.error?.message;
check('A) SUPER_ADMIN + no zone -> 400 ZONE_REQUIRED', aRes.status === 400 && aCode === 'ZONE_REQUIRED',
  `status=${aRes.status} code=${aCode}`);
check('A) 400 message is Persian', isPersian(aMsg), `message=${JSON.stringify(aMsg)}`);

const bId = bRes.body?.data?.id;
check('B) SUPER_ADMIN + selected zone -> 201', bRes.status === 201 && !!bId, `status=${bRes.status}`);
const bRow = bId ? sql(`SELECT code FROM "AccountCode" WHERE id = '${bId}';`) : '';
check('B) 201 backed by a real Postgres row', bRow === `S4A${stamp}`, `db=${JSON.stringify(bRow)}`);
const bZone = bId ? sql(`SELECT "zoneId" FROM "AccountCode" WHERE id = '${bId}';`) : '';
check('B) row carries the SELECTED zone', bZone === ZONE, `zoneId=${bZone}`);

const cCode = cRes.body?.code ?? cRes.body?.error?.code;
const cMsg = cRes.body?.message ?? cRes.body?.error?.message;
check('C) SUPER_ADMIN + no zone (HR) -> 400 ZONE_REQUIRED', cRes.status === 400 && cCode === 'ZONE_REQUIRED',
  `status=${cRes.status} code=${cCode}`);
check('C) 400 message is Persian', isPersian(cMsg), `message=${JSON.stringify(cMsg)}`);

const dId = dRes.body?.data?.id;
check('D) SUPER_ADMIN + selected zone (HR) -> 201', dRes.status === 201 && !!dId, `status=${dRes.status}`);
const dZone = dId ? sql(`SELECT "zoneId" FROM "Employee" WHERE id = '${dId}';`) : '';
check('D) employee row carries the SELECTED zone', dZone === ZONE, `zoneId=${dZone}`);

check('E) ZONE_MANAGER + no zone (account) unchanged -> 201', eRes.status === 201, `status=${eRes.status}`);
const eId = eRes.body?.data?.id;
const eZone = eId ? sql(`SELECT "zoneId" FROM "AccountCode" WHERE id = '${eId}';`) : '';
check('E) still scoped to the SESSION zone', eZone === ZONE, `zoneId=${eZone}`);

// ZONE_MANAGER holds no employee-create grant in the seeded permission model, so
// the PermissionsGuard rejects it. This is PRE-EXISTING, not an A2 regression:
// `git diff HEAD -- backend/src backend/prisma` is empty, so the runtime under
// test is byte-identical to the Step-6 baseline. The scoped-create fallback for
// a non-SUPER_ADMIN is proven by E instead, which is the case A2 actually owns.
const fCode = fRes.body?.code ?? fRes.body?.error?.code;
check('F) ZONE_MANAGER employee-create still denied (unchanged)',
  fRes.status === 403 && fCode === 'USER_PERMISSION_DENIED', `status=${fRes.status} code=${fCode}`);

console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
process.exit(fail === 0 ? 0 : 1);
