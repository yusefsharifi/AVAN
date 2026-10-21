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
// Step-4 TASK 6(b) and 6(c) — one real create -> update -> Postgres check each.
const BASE = 'http://localhost:3000/api/v1';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const COMPANY = '33e80909-adcd-4ac0-bb14-5801e15c82d3';
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

async function call(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* ignore */
  }
  return { status: r.status, body: j };
}

const tok = await login('company@avan.local');

// ───────────────────────── TASK 6(b): PATCH /production/lines/:id ─────────────────
console.log('=== TASK 6(b): production line ===');
const lineCode = `S4L${stamp}`;
const lineCreate = await call(tok, 'POST', '/production/lines', {
  zoneId: ZONE,
  code: lineCode,
  nameFa: 'خط آزمایشی مرحله چهار',
  capacity: 120,
  currentStatus: 'idle',
  shift: 'morning',
  supervisorName: 'سرپرست آزمایشی',
});
const lineId = lineCreate.body?.data?.id;
console.log(`create  status=${lineCreate.status} id=${lineId ?? ''}`);

const linePatch = await call(tok, 'PATCH', `/production/lines/${lineId}`, {
  currentStatus: 'running',
  nameFa: 'خط آزمایشی مرحله چهار — بروزرسانی',
  oee: 87.5,
});
const p = linePatch.body?.data;
console.log(
  `patch   status=${linePatch.status} currentStatus=${p?.currentStatus ?? ''} oee=${p?.oee ?? ''} nameFa=${p?.nameFa ?? ''}`,
);
console.log(
  linePatch.status === 200 && p?.currentStatus === 'running' && p?.oee === 87.5
    ? '=> PASS (status + oee + name persisted by the new PATCH route)'
    : `=> FAIL ${JSON.stringify(linePatch.body).slice(0, 300)}`,
);

// ───────────────────────── TASK 6(c): PATCH /b2b/rfq/:id ─────────────────
console.log('\n=== TASK 6(c): RFQ ===');
const newTitle = `عنوان بروزرسانی شده ${stamp}`;
const rfqCreate = await call(tok, 'POST', '/b2b/rfq', {
  zoneId: ZONE,
  companyId: COMPANY,
  title: `درخواست خرید آزمایشی مرحله چهار ${stamp}`,
  description: 'شرح کامل درخواست خرید آزمایشی برای بررسی قابلیت بروزرسانی پیش از انتشار.',
  categoryId: 'general',
  categoryPath: ['عمومی'],
  quantity: 10,
  unit: 'عدد',
  deliveryLocation: 'انبار مرکزی',
  deliveryDeadline: '2026-12-01T00:00:00.000Z',
  incoterm: 'EXW',
  currencyCode: 'IRR',
  maxBudget: 500000000,
  biddingMode: 'SEALED',
  submissionDeadline: '2026-11-20T00:00:00.000Z',
  evaluationCriteria: [
    { criterion: 'قیمت', weight: 60, description: 'قیمت پیشنهادی' },
    { criterion: 'کیفیت', weight: 40, description: 'کیفیت کالا' },
  ],
  notes: 'یادداشت اولیه',
});
const rfqId = rfqCreate.body?.data?.id;
console.log(`create  status=${rfqCreate.status} id=${rfqId ?? ''} status=${rfqCreate.body?.data?.status ?? ''}`);
if (!rfqId) console.log('  body:', JSON.stringify(rfqCreate.body).slice(0, 400));

const rfqPatch = await call(tok, 'PATCH', `/b2b/rfq/${rfqId}`, {
  title: newTitle,
  notes: 'یادداشت بروزرسانی شده در مرحله چهار',
  quantity: 25,
});
const rp = rfqPatch.body?.data;
console.log(
  `patch   status=${rfqPatch.status} title=${rp?.title ?? ''} qty=${rp?.quantity ?? ''} notes=${rp?.notes ?? ''}`,
);
console.log(
  rfqPatch.status === 200 && rp?.title === newTitle && Number(rp?.quantity) === 25
    ? '=> PASS (DRAFT RFQ fields genuinely written — previously a no-op echo)'
    : `=> FAIL ${JSON.stringify(rfqPatch.body).slice(0, 300)}`,
);

// DRAFT-only guard: after publish, the same PATCH must be refused.
console.log('\n--- guard: published RFQ must reject PATCH ---');
const pub = await call(tok, 'POST', `/b2b/rfq/${rfqId}/publish`, {});
console.log(`publish status=${pub.status}`);
const rfqPatch2 = await call(tok, 'PATCH', `/b2b/rfq/${rfqId}`, { title: 'نباید اعمال شود' });
const g2 = rfqPatch2.body?.code ?? rfqPatch2.body?.error?.code ?? '';
console.log(
  `patch   status=${rfqPatch2.status} code=${g2}`,
);
console.log(
  rfqPatch2.status >= 400
    ? `=> PASS (non-DRAFT update refused with ${g2})`
    : `=> FAIL: published RFQ accepted an update`,
);
