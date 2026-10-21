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
// Task 5 (fix4.md) — ISO-8601 date round-trip proof.
//
// Asserts: dates travel as ISO on the wire, legacy Jalali input is ACCEPTED and
// converted (with a deprecation warning), malformed input is REJECTED rather
// than persisted, and probationEndDate is derived correctly in Gregorian space.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';

const BASE = 'http://localhost:3000/api/v1';
const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const DSN = 'postgresql://postgres:postgres@localhost:5432/idop';
const BACKEND_LOG = 'C:\\Users\\administrator.FB\\.local\\share\\opencode\\shell\\dcc45fbe19f4f6d41b0573844d8f19d678b821ce\\sh_15264f689001wDrQg4xiBLmzf9.out';

const results = [];
const log = (step, ok, detail) => {
  results.push({ step, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step} | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
};

function dbVal(sql) {
  try { return execFileSync(PSQL, [DSN, '-tAc', sql], { encoding: 'utf8' }).trim(); }
  catch (e) { return `ERR:${String(e.message).slice(0, 120)}`; }
}

function redisSet(key, value) {
  return new Promise((resolve) => {
    const sock = net.connect(6379, '127.0.0.1', () => {
      sock.write(`*3\r\n$3\r\nSET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n$${Buffer.byteLength(String(value))}\r\n${value}\r\n`);
    });
    sock.on('data', () => { sock.end(); resolve(true); });
    sock.on('error', () => resolve(false));
  });
}

function maxSeq(table, column) {
  const v = dbVal(`SELECT COALESCE(max(NULLIF(regexp_replace("${column}", '^.*-', ''), '')::int), 0) FROM "${table}"`);
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function parseCookies(setCookieHeaders) {
  const jar = {};
  for (const h of setCookieHeaders || []) {
    const [pair] = h.split(';');
    const i = pair.indexOf('=');
    if (i > 0) jar[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
  }
  return jar;
}

async function req(path, { method = 'GET', body, jar = {}, csrf, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const cookieStr = Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');
  if (cookieStr) headers.Cookie = cookieStr;
  if (csrf) headers['X-CSRF-Token'] = csrf;
  if (token) headers.Authorization = `Bearer ${token}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual',
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    return { status: 599, json: null, text: `CLIENT_TIMEOUT: ${e?.name ?? e}`, setCookies: [] };
  }
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* html */ }
  return { status: res.status, json, text, setCookies: res.headers.getSetCookie?.() ?? [] };
}

async function loginAs(identifier) {
  const r = await req('/auth/login', { method: 'POST', body: { identifier, password: 'Avan@1404' } });
  const jar = parseCookies(r.setCookies);
  const token = r.json?.data?.accessToken ?? r.json?.accessToken;
  return { jar, csrf: jar.idop_csrf, token, ok: r.status === 200 && !!token };
}

const idOf = (r) => r.json?.data?.id ?? r.json?.id ?? null;
const okStatus = (r) => r.status >= 200 && r.status < 300;
const errMsg = (r) => r.json?.message ?? r.json?.error ?? String(r.text ?? '').slice(0, 160);

const company = await loginAs('company@avan.local');
log('login company@avan.local', company.ok, {});
const { jar, csrf, token } = company;

const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const COMPANY = '33e80909-adcd-4ac0-bb14-5801e15c82d3';

// The mini-redis shim resets INCR counters on restart; bump past existing rows
// so employeeNumber never collides.
await redisSet(`hr:emp:seq:${COMPANY}`, maxSeq('Employee', 'employeeNumber'));

let nationalSeq = 0;
const nextNationalId = () => String(Date.now() + (nationalSeq += 1)).slice(-10);

async function createEmployee(hireDate, label) {
  // Unique department/position per case: Position.code is a sha1 hash of the
  // title, so re-using one common title across different departments trips a
  // pre-existing unique constraint (unrelated to date handling — it fires
  // before any date code runs).
  const uniq = `${label}-${Date.now()}-${(nationalSeq += 1)}`;
  const r = await req('/hr/employees', {
    method: 'POST', jar, csrf, token,
    body: {
      zoneId: ZONE, companyId: COMPANY, firstNameFa: 'تاریخ', lastNameFa: label,
      nationalId: nextNationalId(), dateOfBirth: '1995-04-11', gender: 'MALE', phone: '09120000001',
      employmentType: 'FULL_TIME', hireDate, baseSalary: 90000000,
      departmentName: `واحد ${uniq}`, positionName: `کارشناس ${uniq}`,
    },
  });
  return { r, id: idOf(r) };
}

// ── 1. Canonical ISO input passes through unchanged ─────────────────────────
const a = await createEmployee('2025-03-21', 'ISO');
const aDb = a.id ? dbVal(`SELECT "hireDate" FROM "Employee" WHERE id='${a.id}'`) : 'NO_ROW';
log('ISO hireDate stored verbatim', okStatus(a.r) && aDb === '2025-03-21', { status: a.r.status, id: a.id, stored: aDb });

// ── 2. Legacy Jalali input is converted to ISO ──────────────────────────────
const b = await createEmployee('1404-01-01', 'Jalali');
const bDb = b.id ? dbVal(`SELECT "hireDate" FROM "Employee" WHERE id='${b.id}'`) : 'NO_ROW';
log('Jalali 1404-01-01 -> ISO 2025-03-21', okStatus(b.r) && bDb === '2025-03-21', { status: b.r.status, id: b.id, stored: bDb });

// ── 3. Persian digits + slash separator (what the UI input actually holds) ──
const c = await createEmployee('۱۴۰۴/۰۱/۰۱', 'PersianDigits');
const cDb = c.id ? dbVal(`SELECT "hireDate" FROM "Employee" WHERE id='${c.id}'`) : 'NO_ROW';
log('Persian ۱۴۰۴/۰۱/۰۱ -> ISO 2025-03-21', okStatus(c.r) && cDb === '2025-03-21', { status: c.r.status, id: c.id, stored: cDb, msg: c.r?.json?.message ?? null, raw: c.r?.json?.data ?? null });

// ── 4. probationEndDate: +90 days in Gregorian space (old arithmetic was off
//       ~2.5 months because jalaliToDate('1403-01-01') returned 2024-01-01)
const bProb = b.id ? dbVal(`SELECT "probationEndDate" FROM "Employee" WHERE id='${b.id}'`) : 'NO_ROW';
log('probationEndDate = hire + 90d (ISO)', bProb === '2025-06-19', { stored: bProb, expected: '2025-06-19' });

// ── 5. Malformed input is REJECTED, not persisted as a placeholder ──────────
const d = await createEmployee('not-a-date', 'Malformed');
const rejected = d.r.status === 400 || d.r.status === 422;
log('malformed hireDate rejected (400/422) not stored', rejected, {
  status: d.r.status, id: d.id, message: errMsg(d.r),
});

// ── 6. Round-trip: value returned by the API is still ISO ───────────────────
if (b.id) {
  const g = await req(`/hr/employees/${b.id}`, { jar, csrf, token });
  const returned = g.json?.data?.hireDate ?? g.json?.hireDate ?? null;
  log('GET round-trip returns ISO hireDate', okStatus(g) && returned === '2025-03-21', { status: g.status, returned });
}

// ── 7. Deprecation warning was actually emitted for the non-ISO inputs ──────
let depLog = '';
try { depLog = fs.readFileSync(BACKEND_LOG, 'utf8'); } catch { /* stream may still be flushing */ }
const depCount = (depLog.match(/DEPRECATED non-ISO date/g) || []).length;
log('deprecation warning logged for non-ISO input', depCount >= 2, { occurrences: depCount });

const failed = results.filter((r) => !r.ok);
console.log(`\n=== Task 5 date proof: ${results.length - failed.length}/${results.length} passed ===`);
process.exit(failed.length === 0 ? 0 : 1);
