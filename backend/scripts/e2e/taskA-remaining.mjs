/**
 * Step-7 TASK A — proofs for the four endpoint groups that Step 6 left with
 * TODO(BACKEND) markers: visitors, checkbooks, checks, receipt-payment-docs.
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on
 * http://localhost:3000/api/v1 and asserts against PostgreSQL directly via psql,
 * so every "created" claim is a real Postgres row, not an HTTP status.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis; these harnesses depend on a throwaway in-memory
 *   RESP2 shim on 127.0.0.1:6379 kept OUTSIDE the repo. Test scaffold only --
 *   never a product component, never cited as one. Production uses the Redis
 *   declared in docker-compose.yml.
 *
 * Bearer-only (no cookie jar) => the CSRF middleware is bypassed by design.
 *
 * Each group runs the same matrix as task3-scope.mjs / taskC-erp.mjs:
 *
 *   1) SUPER_ADMIN  + NO zoneId   -> 400 ZONE_REQUIRED, Persian message
 *   2) SUPER_ADMIN  + explicit    -> 201 + Postgres row id + zoneId column
 *   3) ZONE_MANAGER + NO zoneId   -> 201 via session zone (row scoped to it)
 *   4) PATCH                       -> 200 + Postgres row reflects the change
 *   5) GET list                    -> the new id is present
 *   6) GET /:unknown               -> 404, Persian message
 *
 * Plus per-group arithmetic proofs, because a REST round-trip alone would not
 * show that the derived figures and BigInt columns survived:
 *
 *   - checkbook : remainingLeaves re-derived as totalLeaves - usedLeaves, and
 *                 a book driven to zero flags itself `exhausted`;
 *   - check     : BigInt amount round-trips exactly, ISO dates survive;
 *   - receipt   : totalAmount RE-DERIVED from its lines (a posted bogus total
 *                 of 1 must be corrected), child lines stored, blank
 *                 statusChangeDate falls back to the document date;
 *   - visitor   : commissionRate (a rate, not money) round-trips.
 */
import { execFileSync } from 'node:child_process';

const BASE = 'http://localhost:3000/api/v1';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
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

async function call(token, method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* leave null */
  }
  return { status: r.status, body: j, raw: text.slice(0, 220) };
}

/** Query Postgres directly; returns the first column of the first row, trimmed. */
function sql(statement) {
  try {
    return execFileSync(PSQL, [DSN, '-A', '-t', '-c', statement], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (err) {
    return `PSQL_ERROR:${String(err?.message ?? err).slice(0, 140)}`;
  }
}

function isPersian(value) {
  return typeof value === 'string' && /[\u0600-\u06FF]/.test(value);
}
function msg(res) {
  return res.body?.message ?? res.body?.error?.message ?? '';
}
function dataId(res) {
  return res.body?.data?.id ?? '';
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

/** The shared 6-step matrix. */
function matrix(label, token, makeBody, routes) {
  return (async () => {
    // 1) SUPER_ADMIN without a zone must be told to choose, in Persian.
    const noZone = await call(token.super, 'POST', routes.post, makeBody());
    check(
      `${label} 1 super no-zone -> 400`,
      noZone.status === 400,
      `status=${noZone.status} body=${noZone.raw}`,
    );
    check(
      `${label} 1 super no-zone -> Persian`,
      isPersian(msg(noZone)),
      `message=${JSON.stringify(msg(noZone))}`,
    );

    // 2) SUPER_ADMIN with an explicit zone -> real row, in that zone.
    const withZone = await call(token.super, 'POST', routes.post, {
      ...makeBody(),
      zoneId: ZONE,
    });
    const id2 = dataId(withZone);
    check(
      `${label} 2 super +zone -> 201`,
      withZone.status === 201 && Boolean(id2),
      `status=${withZone.status} id=${id2} body=${withZone.raw}`,
    );
    check(
      `${label} 2 postgres row exists`,
      sql(`SELECT count(*) FROM "${routes.table}" WHERE id='${id2}'`) === '1',
      `id=${id2}`,
    );
    check(
      `${label} 2 zoneId column == ZONE`,
      sql(`SELECT "zoneId" FROM "${routes.table}" WHERE id='${id2}'`) === ZONE,
      `id=${id2}`,
    );

    // 3) ZONE_MANAGER with no zoneId is scoped by its session.
    const scoped = await call(token.zone, 'POST', routes.post, makeBody());
    const id3 = dataId(scoped);
    check(
      `${label} 3 zone-manager no-zone -> 201`,
      scoped.status === 201 && Boolean(id3),
      `status=${scoped.status} id=${id3} body=${scoped.raw}`,
    );
    check(
      `${label} 3 row scoped to session zone`,
      sql(`SELECT "zoneId" FROM "${routes.table}" WHERE id='${id3}'`) === ZONE,
      `id=${id3}`,
    );

    // 4) PATCH reflects in Postgres (a successful PATCH answers 200).
    const patched = await call(token.zone, 'PATCH', `${routes.post}/${id3}`, routes.patch);
    check(
      `${label} 4 patch -> 200`,
      patched.status === 200,
      `status=${patched.status} body=${patched.raw}`,
    );
    const after = sql(`SELECT ${routes.patchSelect} FROM "${routes.table}" WHERE id='${id3}'`);
    check(
      `${label} 4 postgres reflects patch`,
      after === routes.patchExpect,
      `id=${id3} got=${after}`,
    );

    // 5) The list returns it.
    const list = await call(token.zone, 'GET', routes.post);
    const listed = Array.isArray(list.body?.data)
      ? list.body.data.some((row) => row.id === id3)
      : false;
    check(`${label} 5 list contains id`, list.status === 200 && listed, `status=${list.status}`);

    // 6) Unknown id is a Persian 404.
    const missing = await call(
      token.zone,
      'GET',
      `${routes.post}/00000000-0000-4000-8000-000000000000`,
    );
    check(
      `${label} 6 unknown id -> 404 + Persian`,
      missing.status === 404 && isPersian(msg(missing)),
      `status=${missing.status} message=${JSON.stringify(msg(missing))}`,
    );

    return { id2, id3 };
  })();
}

const token = {
  super: await login('super@avan.local'),
  zone: await login('zone@avan.local'),
};
console.log('tokens: super=ok zone=ok\n');

// ── 1) Visitors ─────────────────────────────────────────────────────────────
console.log('1) VISITORS  /finance/visitors');
const visitorBody = () => ({
  id: `vis_client_${stamp}`,
  code: `VIS-${stamp}`,
  name: 'آقای رضایی',
  phone: '09121234567',
  region: 'تهران',
  commissionRate: 2.5,
  status: 'active',
  notes: 'ویزیتور منطقه یک',
});
const vis = await matrix('VIS', token, visitorBody, {
  post: '/finance/visitors',
  table: 'FinanceVisitor',
  patch: { commissionRate: 3.5, region: 'اصفهان' },
  patchSelect: `"commissionRate"::text || '|' || "region"`,
  patchExpect: '3.5|اصفهان',
});

const visRow = await call(token.zone, 'GET', `/finance/visitors/${vis.id3}`);
const visData = visRow.body?.data ?? {};
console.log(`  visitor id=${vis.id3} code=${visData.code} commissionRate=${visData.commissionRate}`);
check('VIS commissionRate (a rate) round-trips', visData.commissionRate === 3.5, `got=${visData.commissionRate}`);
check(
  'VIS only the 8 contract fields are returned',
  Object.keys(visData).sort().join(',') ===
    'code,id,name,notes,phone,region,status,commissionRate'.split(',').sort().join(','),
  `keys=${Object.keys(visData).sort().join(',')}`,
);

// ── 2) Checkbooks ───────────────────────────────────────────────────────────
console.log('\n2) CHECKBOOKS  /finance/checkbooks');
const cbBody = () => ({
  id: `cb_client_${stamp}`,
  bookNumber: `دسته-چک-${stamp}`,
  bankAccountId: 'mock-bank-1',
  bankName: 'ملی',
  accountNumber: '6037991234567890',
  series: '1404-A',
  startNumber: '000123',
  endNumber: '000147',
  currentNumber: '000123',
  totalLeaves: 25,
  usedLeaves: 0,
  remainingLeaves: 25,
  status: 'active',
  issuedDate: '2026-04-01',
});
const cb = await matrix('CB', token, cbBody, {
  post: '/finance/checkbooks',
  table: 'FinanceCheckbook',
  patch: { bankName: 'سامان', status: 'cancelled' },
  patchSelect: `"bankName" || '|' || "status"::text`,
  patchExpect: 'سامان|cancelled',
});

const cbRow = await call(token.zone, 'GET', `/finance/checkbooks/${cb.id3}`);
const cbData = cbRow.body?.data ?? {};
console.log(`  checkbook id=${cb.id3} total=${cbData.totalLeaves} used=${cbData.usedLeaves} remaining=${cbData.remainingLeaves}`);
check('CB remainingLeaves re-derived on create', cbData.remainingLeaves === 25, `got=${cbData.remainingLeaves}`);
check('CB leading zeros preserved', cbData.startNumber === '000123', `got=${cbData.startNumber}`);
check(
  'CB remainingLeaves persisted as derived',
  sql(`SELECT "remainingLeaves"::text FROM "FinanceCheckbook" WHERE id='${cb.id3}'`) === '25',
  `id=${cb.id3}`,
);

// Driving every leaf must re-derive remaining to 0 and flag the book exhausted.
const drained = await call(token.zone, 'PATCH', `/finance/checkbooks/${cb.id3}`, {
  usedLeaves: 25,
  totalLeaves: 25,
});
check(
  'CB usedLeaves=25 -> remainingLeaves re-derived to 0',
  drained.body?.data?.remainingLeaves === 0,
  `got=${drained.body?.data?.remainingLeaves}`,
);
check(
  'CB exhausted flag set when the book runs out',
  drained.body?.data?.status === 'exhausted',
  `got=${drained.body?.data?.status}`,
);
check(
  'CB derivation persisted',
  sql(`SELECT "remainingLeaves"::text || '|' || "status"::text FROM "FinanceCheckbook" WHERE id='${cb.id3}'`) === '0|exhausted',
  `id=${cb.id3}`,
);

// ── 3) Checks ───────────────────────────────────────────────────────────────
console.log('\n3) CHECKS  /finance/checks');
const checkBody = () => ({
  id: `chk_client_${stamp}`,
  checkNumber: '000123',
  checkbookId: cb.id3,
  bankAccountId: 'mock-bank-1',
  bankName: 'ملی',
  direction: 'outgoing',
  payeeName: 'شرکت فولاد',
  payerName: '',
  amount: 45000000,
  currency: 'IRR',
  issueDate: '2026-04-01',
  dueDate: '2026-05-01',
  status: 'issued',
  notes: 'چک بابت فاکتور',
  createdBy: 'admin',
});
const chk = await matrix('CHK', token, checkBody, {
  post: '/finance/checks',
  table: 'FinanceCheck',
  patch: { status: 'cleared', clearanceDate: '2026-05-02' },
  patchSelect: `"status"::text || '|' || to_char("clearanceDate", 'YYYY-MM-DD')`,
  patchExpect: 'cleared|2026-05-02',
});

const chkRow = await call(token.zone, 'GET', `/finance/checks/${chk.id3}`);
const chkData = chkRow.body?.data ?? {};
console.log(`  check id=${chk.id3} no=${chkData.checkNumber} amount=${chkData.amount} issueDate=${chkData.issueDate} dueDate=${chkData.dueDate}`);
check('CHK amount survives the BigInt round-trip', chkData.amount === 45000000, `got=${chkData.amount}`);
check(
  'CHK amount persisted exactly',
  sql(`SELECT "amount"::text FROM "FinanceCheck" WHERE id='${chk.id3}'`) === '45000000',
  `id=${chk.id3}`,
);
check('CHK issueDate round-trips as ISO date', chkData.issueDate === '2026-04-01', `got=${chkData.issueDate}`);
check('CHK dueDate round-trips as ISO date', chkData.dueDate === '2026-05-01', `got=${chkData.dueDate}`);
check('CHK checkbookId stored as an opaque reference', chkData.checkbookId === cb.id3, `got=${chkData.checkbookId}`);

// A bounced check records its penalty — the second BigInt column on this table.
const bounced = await call(token.zone, 'PATCH', `/finance/checks/${chk.id3}`, {
  status: 'bounced',
  bounceReason: 'موجودی ناکافی',
  bounceDate: '2026-05-03',
  bouncePenaltyAmount: 1500000,
});
check('CHK bounce penalty accepted', bounced.status === 200, `status=${bounced.status} body=${bounced.raw}`);
check(
  'CHK bounce penalty persisted as BigInt',
  sql(`SELECT "bouncePenaltyAmount"::text FROM "FinanceCheck" WHERE id='${chk.id3}'`) === '1500000',
  `id=${chk.id3}`,
);

// ── 4) Receipt / payment documents ──────────────────────────────────────────
console.log('\n4) RECEIPT/PAYMENT DOCS  /finance/receipt-payment-docs');
const RP_TOTAL = 600000;
const rpLines = [
  { id: `rpl-${stamp}-1`, accountId: '1101', accountCode: '1101', accountName: 'صندوق', amount: RP_TOTAL, description: 'دریافت نقدی' },
];
const rpBody = () => ({
  id: `rp_client_${stamp}`,
  documentNumber: `RP-${stamp}`,
  docType: 'cash_receipt',
  date: '2026-04-03',
  type: 'receipt',
  status: 'draft',
  statusChangeDate: '',
  entityId: 'ENT-1',
  entityName: 'مشتری عمده',
  entityType: 'buyer',
  instrumentType: 'cash',
  totalAmount: 1,
  currency: 'IRR',
  exchangeRate: 1,
  isPartial: false,
  preparedBy: 'admin',
  notes: '',
  description: 'دریافت نقدی از مشتری',
  lines: rpLines,
});
const rp = await matrix('RP', token, rpBody, {
  post: '/finance/receipt-payment-docs',
  table: 'FinanceReceiptPaymentDoc',
  patch: { status: 'approved', notes: 'تایید شد' },
  patchSelect: `"status"::text || '|' || "notes"`,
  patchExpect: 'approved|تایید شد',
});

const rpRow = await call(token.zone, 'GET', `/finance/receipt-payment-docs/${rp.id3}`);
const rpData = rpRow.body?.data ?? {};
console.log(
  `  doc id=${rp.id3} no=${rpData.documentNumber} totalAmount=${rpData.totalAmount} ` +
    `lines=${(rpData.lines ?? []).length} statusChangeDate=${rpData.statusChangeDate} date=${rpData.date}`,
);
check(
  'RP posted totalAmount=1 is RE-DERIVED from lines -> 600000',
  rpData.totalAmount === RP_TOTAL,
  `got=${rpData.totalAmount}`,
);
check(
  'RP derived total persisted as BigInt',
  sql(`SELECT "totalAmount"::text FROM "FinanceReceiptPaymentDoc" WHERE id='${rp.id3}'`) === String(RP_TOTAL),
  `id=${rp.id3}`,
);
check('RP lines stored as child rows', (rpData.lines ?? []).length === 1, `got=${(rpData.lines ?? []).length}`);
check(
  'RP child rows in Postgres',
  sql(`SELECT count(*) FROM "FinanceReceiptPaymentLine" WHERE "docId"='${rp.id3}'`) === '1',
  `id=${rp.id3}`,
);
check(
  'RP blank statusChangeDate fell back to the document date',
  rpData.statusChangeDate === rpData.date && rpData.date === '2026-04-03',
  `statusChangeDate=${rpData.statusChangeDate} date=${rpData.date}`,
);
check('RP client id ignored, server id issued', rpData.id !== `rp_client_${stamp}`, `got=${rpData.id}`);

// With no lines there is nothing to derive from, so the posted amount stands.
const noLines = await call(token.zone, 'POST', '/finance/receipt-payment-docs', {
  ...rpBody(),
  documentNumber: `RP-NL-${stamp}`,
  lines: [],
  totalAmount: 900000,
});
check(
  'RP amount stands when there are no lines to derive from',
  noLines.body?.data?.totalAmount === 900000,
  `got=${noLines.body?.data?.totalAmount}`,
);

// Re-allocating replaces the line set rather than accumulating it.
const reallocated = await call(token.zone, 'PATCH', `/finance/receipt-payment-docs/${rp.id3}`, {
  lines: [
    { accountCode: '1101', accountName: 'صندوق', amount: 250000, description: 'جمع' },
    { accountCode: '1201', accountName: 'مشتریان', amount: 350000, description: 'باقیمانده' },
  ],
});
check(
  'RP re-allocation re-derives totalAmount -> 600000',
  reallocated.body?.data?.totalAmount === RP_TOTAL,
  `got=${reallocated.body?.data?.totalAmount}`,
);
check(
  'RP line set replaced, not accumulated',
  sql(`SELECT count(*) FROM "FinanceReceiptPaymentLine" WHERE "docId"='${rp.id3}'`) === '2',
  `id=${rp.id3}`,
);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
console.log('Row ids (real Postgres):');
console.log(`  FinanceVisitor            super+zone : ${vis.id2}   zone-manager: ${vis.id3}`);
console.log(`  FinanceCheckbook          super+zone : ${cb.id2}   zone-manager: ${cb.id3}`);
console.log(`  FinanceCheck              super+zone : ${chk.id2}   zone-manager: ${chk.id3}`);
console.log(`  FinanceReceiptPaymentDoc  super+zone : ${rp.id2}   zone-manager: ${rp.id3}`);
process.exit(fail === 0 ? 0 : 1);
