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
// Step 3 — API-level CRUD persistence verification for all 8 modules.
// Uses two real users because the backend's @Roles decorators are role-scoped:
//   zone@avan.local    -> ZONE_MANAGER (finance endpoints require it)
//   company@avan.local -> COMPANY_ADMIN (HR / inventory / commercial / b2b)
// Performs CREATE -> UPDATE against the real NestJS backend, then verifies the
// row exists via direct psql (independent of any API cache).
import { execFileSync } from 'node:child_process';
import net from 'node:net';

const BASE = 'http://localhost:3000/api/v1';
const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const DSN = 'postgresql://postgres:postgres@localhost:5432/idop';

const results = [];
function log(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} | ${step} | ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`);
}

function dbVal(sql) {
  try { return execFileSync(PSQL, [DSN, '-tAc', sql], { encoding: 'utf8' }).trim(); }
  catch (e) { return `ERR:${String(e.message).slice(0, 120)}`; }
}
const dbCount = (table, id) => Number(dbVal(`SELECT count(*) FROM "${table}" WHERE id = '${id}'`) || 0);

// The mini-redis shim resets its INCR counters on restart, so server-generated
// codes (ITM-*, EMP-*) can collide with rows from earlier runs. Bump a counter
// above the highest code already present in Postgres before creating a row.
function redisSet(key, value) {
  return new Promise((resolve) => {
    const sock = net.connect(6379, '127.0.0.1', () => {
      const payload = `*3\r\n$3\r\nSET\r\n$${Buffer.byteLength(key)}\r\n${key}\r\n$${Buffer.byteLength(String(value))}\r\n${value}\r\n`;
      sock.write(payload);
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

// Same as maxSeq, but restricted to rows whose business number starts with a
// given prefix (e.g. 'SO-2026-%'). Needed where one table has several numbering
// streams sharing a column.
function maxSeqFiltered(table, column, prefix) {
  const v = dbVal(
    `SELECT COALESCE(max(NULLIF(regexp_replace("${column}", '^.*-', ''), '')::int), 0) FROM "${table}" WHERE "${column}" LIKE '${prefix}'`,
  );
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Every business number in this backend (INV-/PO-/RFQ-/ITM-/EMP-/letter registry)
// is minted from a Redis INCR counter. The harness's Redis shim is in-memory, so
// its counters restart at 1 and collide with numbers already stored. Read the
// highest number already persisted and fast-forward the counter past it.
async function syncCounter(redisKey, table, column) {
  const highest = maxSeq(table, column);
  await redisSet(redisKey, highest);
  return { redisKey, highest };
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
  const me = await req('/auth/me', { jar, token });
  const user = me.json?.data ?? me.json;
  return { jar, csrf: jar.idop_csrf, token, user, ok: r.status === 200 && !!token };
}

const zone = await loginAs('zone@avan.local');
const company = await loginAs('company@avan.local');
log('login zone@avan.local (ZONE_MANAGER)', zone.ok, { status: zone.user?.role });
log('login company@avan.local (COMPANY_ADMIN)', company.ok, { status: company.user?.role });

const ZONE = zone.user?.zoneId;
// company@avan.local owns the company; zone@avan.local has companyId=null.
const COMPANY = company.user?.companyId;
log('scope resolved', !!ZONE && !!COMPANY, { zoneId: ZONE, companyId: COMPANY });

const T = () => Date.now();
const today = new Date().toISOString().slice(0, 10);
const year = new Date().getFullYear();
const ZONE_CODE = dbVal(`SELECT code FROM "Zone" WHERE id='${ZONE}'`) || 'Z001';

// Fast-forward every Redis-backed sequence past what Postgres already holds,
// so re-running this harness can never mint a duplicate business number.
const counters = [
  await syncCounter(`finance:invoice:seq:${ZONE}:${year}`, 'Invoice', 'invoiceNumber'),
  await syncCounter(`finance:voucher:seq:${ZONE}:${year}`, 'AccountingVoucher', 'voucherNumber'),
  await syncCounter(`inv:po:seq:${ZONE}:${year}`, 'PurchaseOrder', 'orderNumber'),
  await syncCounter(`b2b:rfq:seq:${ZONE}:${year}`, 'RFQ', 'rfqNumber'),
  await syncCounter(`hr:emp:seq:${COMPANY}`, 'Employee', 'employeeNumber'),
  await syncCounter(`inv:item:seq:${COMPANY}`, 'Item', 'itemCode'),
];
// Commercial orders number as `${dir}-${year}-${seq}`. The backend maps the
// direction enum to a TWO-LETTER dir code before building the Redis key:
//   commercial-order.service.ts: dir = direction === 'SALES' ? 'SO' : 'PO'
// HARNESS BUG FIXED (Step 4): this block previously used the raw direction
// value (e.g. 'SALES') as the key suffix, so the real `SO` counter was never
// advanced. The shim's INCR then restarted at 1 and every run collided on the
// `orderNumber` unique constraint -> HTTP 500 on POST /commercial/orders.
for (const dirCode of ['SO', 'PO']) {
  const highest = maxSeqFiltered('CommercialOrder', 'orderNumber', `${dirCode}-${year}-%`);
  const redisKey = `commercial:order:seq:${ZONE}:${dirCode}:${year}`;
  await redisSet(redisKey, highest);
  counters.push({ redisKey, highest });
}
// Letter registry numbers are `CODE/YYYY/NNNNNN`, so the numeric suffix is not
// dash-delimited; use the dedicated registrySeq column instead.
const letterSeq = Number(dbVal(`SELECT COALESCE(max("registrySeq"), 0) FROM "Letter" WHERE "registryYear"=${year}`)) || 0;
await redisSet(`letter:registry:seq:${ZONE}:${year}`, letterSeq);
counters.push({ redisKey: 'letter:registry:seq', highest: letterSeq });
log('sequence counters fast-forwarded past existing rows', counters.every((c) => Number.isFinite(c.highest)), counters);
const future = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);
const created = {};
const err = (r) => (r.status >= 400 ? String(r.text).slice(0, 220) : undefined);
const okStatus = (r) => r.status === 200 || r.status === 201;
// Some services return the raw entity, others wrap in {success,data}.
const idOf = (r) => r.json?.data?.id ?? r.json?.id;

// ── FINANCE (as ZONE_MANAGER): account + voucher + invoice ──────────────────
{
  const acct = await req('/finance/accounts', { method: 'POST', ...zone, body: {
    zoneId: ZONE, code: `1001-${T()}`, nameFa: 'حساب آزمایشی E2E', nameEn: 'E2E Test Account',
    type: 'ASSET', category: 'CASH_AND_BANK', normalBalance: 'DEBIT',
  }});
  const id = idOf(acct);
  created.financeAccount = id;
  log('FINANCE create account', okStatus(acct) && !!id, { status: acct.status, id, dbRows: id ? dbCount('AccountCode', id) : 0, err: err(acct) });

  if (id) {
    const u = await req(`/finance/accounts/${id}`, { method: 'PATCH', ...zone, body: { nameFa: 'حساب آزمایشی E2E ویرایش‌شده' } });
    log('FINANCE update account', okStatus(u), { status: u.status, err: err(u) });
  }

  // Vouchers are rejected unless an OPEN financial period covers the date.
  // Idempotent: reuse an existing open period covering today instead of creating an overlap.
  const periods = await req('/finance/periods', { ...zone });
  const list = periods.json?.data ?? periods.json ?? [];
  const covered = Array.isArray(list) && list.some((p) => String(p.status) === 'OPEN' && String(p.startDate).slice(0, 10) <= today && String(p.endDate).slice(0, 10) >= today);
  if (covered) {
    log('FINANCE open period', true, { reused: true });
  } else {
    const per = await req('/finance/periods', { method: 'POST', ...zone, body: {
      name: `دوره آزمایشی E2E ${T()}`, startDate: `${new Date().getFullYear()}-01-01`, endDate: `${new Date().getFullYear()}-12-29`,
    }});
    log('FINANCE open period', okStatus(per), { status: per.status, err: err(per) });
  }

  const v = await req('/finance/vouchers', { method: 'POST', ...zone, body: {
    zoneId: ZONE, type: 'JOURNAL', date: today, description: 'سند آزمایشی E2E',
    lines: [{ lineNumber: 1, description: 'بدهکار', debitAccountId: id, debitAmount: 1000 },
            { lineNumber: 2, description: 'بستانکار', creditAccountId: id, creditAmount: 1000 }],
  }});
  const vid = idOf(v);
  created.financeVoucher = vid;
  log('FINANCE create voucher', okStatus(v) && !!vid, { status: v.status, id: vid, dbRows: vid ? dbCount('AccountingVoucher', vid) : 0, err: err(v) });

  const inv = await req('/finance/invoices', { method: 'POST', ...zone, body: {
    zoneId: ZONE, companyId: COMPANY, type: 'COMMERCIAL', direction: 'SALES',
    partyName: 'مشتری آزمایشی E2E', issueDate: today,
    lines: [{ lineNumber: 1, description: 'کالا', quantity: 2, unitPrice: 50000, unit: 'عدد' }],
  }});
  const iid = idOf(inv);
  created.financeInvoice = iid;
  log('FINANCE create invoice', okStatus(inv) && !!iid, { status: inv.status, id: iid, dbRows: iid ? dbCount('Invoice', iid) : 0, err: err(inv) });
}

// ── HR (as COMPANY_ADMIN): employee ─────────────────────────────────────────
{
  // employeeNumber + nationalId are UNIQUE in Postgres; bump the redis counter
  // past codes from earlier runs and use a fresh nationalId per run.
  await redisSet(`hr:emp:seq:${COMPANY}`, maxSeq('Employee', 'employeeNumber'));
  const nationalId = String(Date.now()).slice(-10);
  const r = await req('/hr/employees', { method: 'POST', ...company, body: {
    zoneId: ZONE, companyId: COMPANY, firstNameFa: 'علی', lastNameFa: 'آزمایشی',
    nationalId, dateOfBirth: '1995-04-11', gender: 'MALE', phone: '09120000001',
    employmentType: 'FULL_TIME', hireDate: today, baseSalary: 90000000,
    departmentName: ' واحد عملیاتی E2E', positionName: 'کارشناس ارشد E2E',
  }});
  const id = idOf(r);
  created.hrEmployee = id;
  log('HR create employee', okStatus(r) && !!id, { status: r.status, id, dbRows: id ? dbCount('Employee', id) : 0, err: err(r) });

  if (id) {
    const u = await req(`/hr/employees/${id}`, { method: 'PATCH', ...company, body: { phone: '09120000099' } });
    log('HR update employee', okStatus(u), { status: u.status, err: err(u) });
    log('HR update persisted in DB', dbVal(`SELECT phone FROM "Employee" WHERE id='${id}'`) === '09120000099',
      { phone: dbVal(`SELECT phone FROM "Employee" WHERE id='${id}'`) });
  }
}

// ── INVENTORY (as COMPANY_ADMIN): item ──────────────────────────────────────
{
  const cat = dbVal(`SELECT id FROM "ItemCategory" WHERE code='IC-E2E' LIMIT 1`);
  // itemCode (ITM-XXX-######) comes from a redis INCR counter; align it with
  // the highest code already in Postgres so a shim restart can't collide.
  await redisSet(`inv:item:seq:${COMPANY}`, maxSeq('Item', 'itemCode'));
  const r = await req('/inventory/items', { method: 'POST', ...company, body: {
    zoneId: ZONE, companyId: COMPANY, nameFa: `کالای آزمایشی E2E ${T()}`, categoryId: cat,
    type: 'FINISHED_GOODS', unit: 'عدد',
  }});
  const id = idOf(r);
  created.inventoryItem = id;
  log('INVENTORY create item', okStatus(r) && !!id, { status: r.status, id, dbRows: id ? dbCount('Item', id) : 0, err: err(r) });

  if (id) {
    const u = await req(`/inventory/items/${id}`, { method: 'PATCH', ...company, body: { nameEn: 'E2E Item Updated' } });
    log('INVENTORY update item', okStatus(u), { status: u.status, err: err(u) });
  }
}

// ── PROCUREMENT (inventory purchase-orders): PO ─────────────────────────────
{
  const r = await req('/inventory/purchase-orders', { method: 'POST', ...company, body: {
    zoneId: ZONE, companyId: COMPANY, vendorName: 'تامین‌کننده آزمایشی E2E', orderDate: today,
    lines: [{ itemName: 'متریال E2E', unit: 'کیلوگرم', orderedQty: '10.5', unitPrice: 1000 }],
  }});
  const id = idOf(r);
  created.procurementPO = id;
  log('PROCUREMENT create PO', okStatus(r) && !!id, { status: r.status, id, dbRows: id ? dbCount('PurchaseOrder', id) : 0, err: err(r) });

  if (id) {
    const u = await req(`/inventory/purchase-orders/${id}/approve`, { method: 'POST', ...company, body: {} });
    log('PROCUREMENT approve PO', okStatus(u), { status: u.status, err: err(u) });
  }
}

// ── PRODUCTION (as COMPANY_ADMIN): work order ───────────────────────────────
{
  const r = await req('/production/work-orders', { method: 'POST', ...company, body: {
    plannedQuantity: 100, uom: 'عدد', itemNameFa: 'محصول آزمایشی E2E', itemSku: `E2E-${T()}`,
  }});
  const id = idOf(r);
  created.productionWO = id;
  log('PRODUCTION create work order', okStatus(r) && !!id, { status: r.status, id, dbRows: id ? dbCount('ProductionWorkOrder', id) : 0, err: err(r) });

  if (id) {
    const u = await req(`/production/work-orders/${id}`, { method: 'PATCH', ...company, body: { plannedQuantity: 150 } });
    log('PRODUCTION update work order', okStatus(u), { status: u.status, err: err(u) });
    log('PRODUCTION update persisted in DB', String(dbVal(`SELECT "plannedQuantity" FROM "ProductionWorkOrder" WHERE id='${id}'`)) === '150',
      { plannedQuantity: dbVal(`SELECT "plannedQuantity" FROM "ProductionWorkOrder" WHERE id='${id}'`) });
  }
}

// ── B2B (as COMPANY_ADMIN): RFQ -> publish -> bid ───────────────────────────
{
  const r = await req('/b2b/rfq', { method: 'POST', ...company, body: {
    zoneId: ZONE, companyId: COMPANY, title: 'مناقصه آزمایشی E2E',
    description: 'شرح کامل مناقصه آزمایشی برای بررسی ماندگاری داده‌ها در سامانه',
    categoryId: 'IC-E2E', categoryPath: ['IC-E2E'], quantity: 50, unit: 'عدد',
    biddingMode: 'SEALED', submissionDeadline: new Date(Date.now() + 86400000 * 14).toISOString(),
    evaluationCriteria: [{ criterion: 'قیمت', weight: 60, description: 'ارزیابی قیمت پیشنهادی' },
                         { criterion: 'تکنیکال', weight: 40, description: 'ارزیابی توان فنی' }],
  }});
  const rfqId = idOf(r);
  created.b2bRfq = rfqId;
  log('B2B create RFQ', okStatus(r) && !!rfqId, { status: r.status, id: rfqId, dbRows: rfqId ? dbCount('RFQ', rfqId) : 0, err: err(r) });

  if (rfqId) {
    const pub = await req(`/b2b/rfq/${rfqId}/publish`, { method: 'POST', ...company, body: { rfqId } });
    log('B2B publish RFQ', okStatus(pub), { status: pub.status, err: err(pub) });

    const b = await req('/b2b/bids', { method: 'POST', ...company, body: {
      rfqId, supplierId: COMPANY, unitPrice: 1000, totalPrice: 50000,
      deliveryDays: 14, paymentTerms: '30 روزه',
    }});
    const bid = idOf(b);
    created.b2bBid = bid;
    log('B2B create bid', okStatus(b) && !!bid, { status: b.status, id: bid, dbRows: bid ? dbCount('Bid', bid) : 0, err: err(b) });
  }
}

// ── CORRESPONDENCE: letter (create -> update -> delete) ────────────────────
{
  const r = await req('/letters', { method: 'POST', ...company, body: {
    direction: 'OUTGOING', type: 'OFFICIAL', classification: 'UNCLASSIFIED', priority: 'NORMAL',
    subject: 'نامه آزمایشی E2E', body: 'متن نامه آزمایشی برای بررسی ماندگاری داده در سامانه مکاتبات.',
    senderName: 'مدیرعامل', senderOrgName: 'شرکت آزمایشی',
    recipients: [{ name: 'مدیر منطقه', orgName: 'منطقه یک', action: 'ACTION' }],
  }});
  const id = idOf(r);
  created.correspondenceLetter = id;
  log('CORRESPONDENCE create letter', okStatus(r) && !!id, { status: r.status, id, registryNumber: r.json?.registryNumber, dbRows: id ? dbCount('Letter', id) : 0, err: err(r) });

  if (id) {
    const u = await req(`/letters/${id}`, { method: 'PATCH', ...company, body: { subject: 'نامه آزمایشی E2E ویرایش‌شده' } });
    log('CORRESPONDENCE update letter', okStatus(u), { status: u.status, err: err(u) });
    log('CORRESPONDENCE update persisted in DB',
      dbVal(`SELECT subject FROM "Letter" WHERE id='${id}'`) === 'نامه آزمایشی E2E ویرایش‌شده',
      { subject: dbVal(`SELECT subject FROM "Letter" WHERE id='${id}'`) });
  }
}

// ── COMMERCIAL (as COMPANY_ADMIN): order ────────────────────────────────────
{
  const r = await req('/commercial/orders', { method: 'POST', ...company, body: {
    zoneId: ZONE, companyId: COMPANY, direction: 'SALES', partyName: 'طرف قرارداد E2E',
    lines: [{ lineNumber: 1, itemName: 'کالای تجاری E2E', quantity: '5.5', unitPrice: 20000, unit: 'عدد' }],
    paymentTerms: 'نقدی', deliveryDate: future, deliveryLocation: 'تهران',
  }});
  const id = idOf(r);
  created.commercialOrder = id;
  log('COMMERCIAL create order', okStatus(r) && !!id, { status: r.status, id, dbRows: id ? dbCount('CommercialOrder', id) : 0, err: err(r) });

  if (id) {
    // The create endpoint lands the order in CONFIRMED; per
    // VALID_ORDER_TRANSITIONS, CONFIRMED -> IN_PRODUCTION is the legal next step
    // (CONFIRMED -> CONFIRMED is rejected as ORDER_INVALID_TRANSITION).
    const u = await req(`/commercial/orders/${id}/status`, { method: 'PATCH', ...company, body: { status: 'IN_PRODUCTION' } });
    log('COMMERCIAL update order status', okStatus(u), { status: u.status, err: err(u) });
    log('COMMERCIAL update persisted in DB',
      dbVal(`SELECT status FROM "CommercialOrder" WHERE id='${id}'`) === 'IN_PRODUCTION',
      { status: dbVal(`SELECT status FROM "CommercialOrder" WHERE id='${id}'`) });
  }
}

// ── persistence proof: every row re-read straight from Postgres ─────────────
console.log('\n-- DB row verification (direct psql, independent of API cache) --');
const tableFor = {
  financeAccount: 'AccountCode', financeVoucher: 'AccountingVoucher', financeInvoice: 'Invoice',
  hrEmployee: 'Employee', inventoryItem: 'Item', procurementPO: 'PurchaseOrder',
  productionWO: 'ProductionWorkOrder', b2bRfq: 'RFQ', b2bBid: 'Bid',
  correspondenceLetter: 'Letter', commercialOrder: 'CommercialOrder',
};
let present = 0, total = 0;
for (const [k, table] of Object.entries(tableFor)) {
  const id = created[k];
  if (!id) { console.log(`SKIP  ${k.padEnd(22)} (no id returned)`); continue; }
  total++;
  const n = dbCount(table, id);
  if (n === 1) present++;
  log(`DB row exists: ${table}`, n === 1, { id, rows: n });
}

// ── permission-middleware regression: guard@avan.local has NO permissions ───
{
  const guard = await loginAs('guard@avan.local');
  log('login guard@avan.local (no permissions)', guard.ok, { role: guard.user?.role });
  const r = await req('/hr/employees', { method: 'POST', ...guard, body: {
    zoneId: guard.user?.zoneId, companyId: guard.user?.companyId, firstNameFa: 'x', lastNameFa: 'y',
    nationalId: '0000000000', dateOfBirth: '1990-01-01', gender: 'MALE', phone: '09120000000',
    employmentType: 'FULL_TIME', hireDate: today, baseSalary: 1,
  }});
  log('PERMISSIONS regression: unprivileged user blocked (403)', r.status === 403, { status: r.status, err: err(r) });
}

const passed = results.filter(r => r.ok).length;
console.log(`\nSUMMARY: ${passed} / ${results.length} checks passed | DB rows present: ${present}/${total}`);
console.log(`CREATED IDS: ${JSON.stringify(created, null, 2)}`);
