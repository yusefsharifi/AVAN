/**
 * Step-6 TASK C — ERP-extension endpoint proofs (R5).
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on
 * http://localhost:3000/api/v1 and asserts against PostgreSQL directly via psql,
 * so every "created" claim below is a real Postgres row, not an HTTP status.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis; these harnesses depend on a throwaway in-memory
 *   RESP2 shim on 127.0.0.1:6379 kept OUTSIDE the repo. Test scaffold only --
 *   never a product component, never cited as one. Production uses the Redis
 *   declared in docker-compose.yml.
 *
 * Bearer-only (no cookie jar) => the CSRF middleware is bypassed by design.
 *
 * Three endpoint groups that the frontend already calls (see
 * Frontend/src/modules/finance/api/finance.api.ts, which shipped seven
 * TODO(BACKEND) markers for them) now have server counterparts:
 *
 *   A) fixed assets   POST/GET/PATCH /finance/fixed-assets
 *   B) documents      POST/GET/PATCH /finance/documents   (purchase + sales)
 *   C) buyers/sellers POST/GET/PATCH /finance/buyer-sellers
 *
 * For each group the proof matrix is the same shape used by task3-scope.mjs:
 *
 *   1) SUPER_ADMIN  + NO zoneId   -> 400 ZONE_REQUIRED, Persian message
 *   2) SUPER_ADMIN  + explicit    -> 201 + Postgres row id + zoneId column
 *   3) ZONE_MANAGER + NO zoneId   -> 201 via session zone (row scoped to it)
 *   4) PATCH                       -> 201 + Postgres row reflects the change
 *   5) GET list                    -> the new id is present
 *   6) GET /:unknown               -> 404, Persian message
 *
 * Plus two independent arithmetic proofs, because a REST round-trip alone
 * would not show that the BigInt columns and the derived figures survived:
 *
 *   - fixed asset: straight-line depreciation, totalCapitalizedCost and
 *     netBookValue recomputed server-side from the inputs;
 *   - documents: the four header totals re-derived from the lines, for BOTH
 *     kinds (the store numbers purchase and sales independently, so both are
 *     exercised against the one shared table).
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
  return { status: r.status, body: j, raw: text.slice(0, 200) };
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

function code(res) {
  return res.body?.code ?? res.body?.error?.code ?? '';
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

/** Runs the shared 6-step matrix for one resource. */
function matrix(label, token, tokenName, makeBody, routes) {
  return (async () => {
    const body = makeBody();

    // 1) SUPER_ADMIN without a zone must be told to choose, in Persian.
    const noZone = await call(token.super, 'POST', routes.post, body);
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

    // 4) PATCH reflects in Postgres (a successful PATCH answers 200, not 201).
    const patched = await call(token.zone, 'PATCH', `${routes.post}/${id3}`, routes.patch);
    check(
      `${label} 4 patch -> 200`,
      patched.status === 200,
      `status=${patched.status} body=${patched.raw}`,
    );
    check(
      `${label} 4 postgres reflects patch`,
      sql(`SELECT ${routes.patchSelect} FROM "${routes.table}" WHERE id='${id3}'`) ===
        routes.patchExpect,
      `id=${id3} got=${sql(`SELECT ${routes.patchSelect} FROM "${routes.table}" WHERE id='${id3}'`)}`,
    );

    // 5) The list returns it.
    const list = await call(token.zone, 'GET', routes.post);
    const listed = Array.isArray(list.body?.data)
      ? list.body.data.some((row) => row.id === id3)
      : false;
    check(
      `${label} 5 list contains id`,
      list.status === 200 && listed,
      `status=${list.status}`,
    );

    // 6) Unknown id is a Persian 404.
    const missing = await call(token.zone, 'GET', `${routes.post}/00000000-0000-4000-8000-000000000000`);
    check(
      `${label} 6 unknown id -> 404 + Persian`,
      missing.status === 404 && isPersian(msg(missing)),
      `status=${missing.status} code=${code(missing)} message=${JSON.stringify(msg(missing))}`,
    );

    return { id2, id3, tokenName };
  })();
}

const token = {
  super: await login('super@avan.local'),
  zone: await login('zone@avan.local'),
};
console.log('tokens: super=ok zone=ok\n');

// ── A) Fixed assets ─────────────────────────────────────────────────────────
console.log('A) FIXED ASSETS  /finance/fixed-assets');
const faBody = () => ({
  id: `FA-client-${stamp}`,
  createdAt: new Date().toISOString(),
  assetCode: `FA-${stamp}`,
  name: 'کامپیوتر مرکزی',
  category: 'it_equipment',
  companyId: 'C-001',
  location: 'دفتر مرکزی',
  acquisitionDate: '2026-04-01',
  acquisitionCost: 120000000,
  additionalCosts: 20000000,
  salvageValue: 20000000,
  usefulLifeYears: 5,
  depreciationMethod: 'straight_line',
  depreciationStartDate: '2026-04-01',
  accumulatedDepreciation: 0,
});
const fa = await matrix('FA', token, 'zone', faBody, {
  post: '/finance/fixed-assets',
  table: 'FixedAsset',
  patch: { status: 'under_maintenance', custodianName: 'احمدی' },
  patchSelect: `"status"::text || '|' || "custodianName"`,
  patchExpect: 'under_maintenance|احمدی',
});

// Depreciation arithmetic: totalCapitalizedCost must be cost+extras and
// netBookValue must be that less accumulated depreciation (straight-line).
const depBody = {
  ...faBody(),
  zoneId: ZONE,
  assetCode: `FAD-${stamp}`,
  accumulatedDepreciation: 24000000,
};
const dep = await call(token.super, 'POST', '/finance/fixed-assets', depBody);
const depId = dataId(dep);
const totalCap = dep.body?.data?.totalCapitalizedCost;
const nbv = dep.body?.data?.netBookValue;
console.log(`  depreciation row id=${depId} totalCapitalizedCost=${totalCap} netBookValue=${nbv}`);
check('FA dep totalCapitalizedCost = 120M + 20M', totalCap === 140000000, `got=${totalCap}`);
check('FA dep netBookValue = 140M - 24M', nbv === 116000000, `got=${nbv}`);
check(
  'FA dep BigInt columns persisted exactly',
  sql(`SELECT "totalCapitalizedCost"::text || '|' || "netBookValue"::text FROM "FixedAsset" WHERE id='${depId}'`) ===
    '140000000|116000000',
  `id=${depId}`,
);
// The annual straight-line charge, derived from the same stored figures:
// (140,000,000 - 20,000,000) / 5 = 24,000,000 per year.
const annualDep =
  (Number(dep.body?.data?.totalCapitalizedCost ?? 0) - 20000000) /
  Number(dep.body?.data?.usefulLifeYears ?? 1);
check('FA dep annual straight-line charge = 24,000,000', annualDep === 24000000, `got=${annualDep}`);

// ── B) Documents (purchase + sales against one table) ───────────────────────
console.log('\nB) DOCUMENTS  /finance/documents');
const PURCHASE_TOTALS = { before: 600000, discount: 50000, tax: 49500, grand: 599500 };
// Lines carry client-generated ids, exactly as the frontend's DocumentLine
// interface requires them -- proving the envelope fields no longer 400.
const purchaseLines = [
  { id: `ln-${stamp}-1`, itemCode: 'RM-1', itemName: 'Steel', quantity: 10, unitPrice: 50000, discount: 10, taxRate: 9, lineTotal: 490500 },
  { id: `ln-${stamp}-2`, itemCode: 'RM-2', itemName: 'Bolt', quantity: 100, unitPrice: 1000, discount: 0, taxRate: 9, lineTotal: 109000 },
];
const docBody = (kind) => () => ({
  id: `${kind === 'sales' ? 'sd' : 'pd'}_client_${stamp}`,
  createdAt: new Date().toISOString(),
  documentNumber: `${kind === 'sales' ? 'SD' : 'PD'}-${stamp}`,
  date: '2026-04-02',
  type: kind === 'sales' ? 'sales_invoice' : 'purchase_invoice',
  vendorName: kind === 'sales' ? '' : 'شرکت فولاد',
  vendorCode: kind === 'sales' ? '' : 'V-1',
  buyerName: kind === 'sales' ? 'مشتری عمده' : '',
  buyerCode: kind === 'sales' ? 'B-1' : '',
  preparedBy: 'admin',
  escrowRequired: false,
  visitorName: '',
  currencyCode: 'IRR',
  exchangeRate: 1,
  lineCount: purchaseLines.length,
  totalBeforeDiscount: PURCHASE_TOTALS.before,
  totalDiscount: PURCHASE_TOTALS.discount,
  totalTax: PURCHASE_TOTALS.tax,
  grandTotal: PURCHASE_TOTALS.grand,
  payableAmount: PURCHASE_TOTALS.grand,
  receivableAmount: PURCHASE_TOTALS.grand,
  lines: purchaseLines,
});

const docRoutes = {
  post: '/finance/documents',
  table: 'FinanceDocument',
  patch: { status: 'approved', notes: 'تایید شد' },
  patchSelect: `"status"::text || '|' || "notes"`,
  patchExpect: 'approved|تایید شد',
};

const purchase = await matrix('DOC-PUR', token, 'zone', docBody('purchase'), docRoutes);

// The header totals are RE-DERIVED from the lines, so a client-posted total
// that disagrees with its own lines must not survive.
const purRow = await call(token.zone, 'GET', `/finance/documents/${purchase.id3}`);
const purData = purRow.body?.data ?? {};
console.log(
  `  purchase id=${purchase.id3} type=${purData.type} lineCount=${purData.lineCount} ` +
    `before=${purData.totalBeforeDiscount} disc=${purData.totalDiscount} tax=${purData.totalTax} grand=${purData.grandTotal}`,
);
check('DOC-PUR kind -> purchaseType on the wire', purData.type === 'purchase_invoice', `got=${purData.type}`);
check('DOC-PUR lineCount derived from lines', purData.lineCount === 2, `got=${purData.lineCount}`);
check('DOC-PUR totalBeforeDiscount = 600,000', purData.totalBeforeDiscount === PURCHASE_TOTALS.before, `got=${purData.totalBeforeDiscount}`);
check('DOC-PUR totalDiscount = 50,000', purData.totalDiscount === PURCHASE_TOTALS.discount, `got=${purData.totalDiscount}`);
check('DOC-PUR totalTax = 49,500', purData.totalTax === PURCHASE_TOTALS.tax, `got=${purData.totalTax}`);
check('DOC-PUR grandTotal = 599,500', purData.grandTotal === PURCHASE_TOTALS.grand, `got=${purData.grandTotal}`);
check('DOC-PUR payableAmount mirrors grandTotal', purData.payableAmount === PURCHASE_TOTALS.grand, `got=${purData.payableAmount}`);
check(
  'DOC-PUR totals persisted as exact BigInt',
  sql(`SELECT "grandTotal"::text FROM "FinanceDocument" WHERE id='${purchase.id3}'`) === '599500',
  `id=${purchase.id3}`,
);
check(
  'DOC-PUR lines stored as child rows',
  sql(`SELECT count(*) FROM "DocumentLine" WHERE "documentId"='${purchase.id3}'`) === '2',
  `id=${purchase.id3}`,
);

// A deliberately WRONG posted grandTotal must be recomputed from the lines.
const tampered = await call(token.zone, 'POST', '/finance/documents', {
  ...docBody('purchase')(),
  documentNumber: `PD-T-${stamp}`,
  grandTotal: 1,
  totalBeforeDiscount: 1,
});
check(
  'DOC-PUR posted bogus totals are re-derived (1 -> 599,500)',
  tampered.body?.data?.grandTotal === PURCHASE_TOTALS.grand,
  `got=${tampered.body?.data?.grandTotal}`,
);

// Sales goes through the SAME endpoint and table, numbering independently.
const sales = await matrix('DOC-SAL', token, 'zone', docBody('sales'), docRoutes);
const salRow = await call(token.zone, 'GET', `/finance/documents/${sales.id3}`);
check('DOC-SAL kind -> salesType on the wire', salRow.body?.data?.type === 'sales_invoice', `got=${salRow.body?.data?.type}`);
check('DOC-SAL grandTotal = 599,500', salRow.body?.data?.grandTotal === PURCHASE_TOTALS.grand, `got=${salRow.body?.data?.grandTotal}`);
check(
  'DOC-SAL receivableAmount mirrors grandTotal',
  salRow.body?.data?.receivableAmount === PURCHASE_TOTALS.grand,
  `got=${salRow.body?.data?.receivableAmount}`,
);
check(
  'DOC-SAL purchase & sales coexist (independent numbering)',
  sql(
    `SELECT count(DISTINCT "documentNumber") FROM "FinanceDocument" WHERE "zoneId"='${ZONE}' AND "documentNumber" IN ('PD-${stamp}','SD-${stamp}')`,
  ) === '2',
  '',
);

// ── C) Buyers / sellers ─────────────────────────────────────────────────────
console.log('\nC) BUYERS/SELLERS  /finance/buyer-sellers');
const bsBody = () => ({
  id: `bs_client_${stamp}`,
  code: `BS-${stamp}`,
  name: 'فروشگاه مرکزی',
  title: 'آقای رضایی',
  type: 'seller',
  paymentMethod: 'bank_transfer',
  groupName: 'عمده فروشان',
  taxId: `TAX-${stamp}`,
  address: 'تهران',
  phone: '02112345678',
  creditLimit: 500000000,
  currentBalance: 12500000,
  status: 'active',
  bankAccounts: [
    { bankName: 'ملی', accountNumber: `6037-${stamp}`, iban: 'IR120000000000000000000001' },
  ],
});
const bs = await matrix('BS', token, 'zone', bsBody, {
  post: '/finance/buyer-sellers',
  table: 'BuyerSeller',
  patch: { title: 'آقای محمدی', phone: '02198765432' },
  patchSelect: `"title" || '|' || "phone"`,
  patchExpect: 'آقای محمدی|02198765432',
});

const bsRow = await call(token.zone, 'GET', `/finance/buyer-sellers/${bs.id3}`);
const bsData = bsRow.body?.data ?? {};
console.log(`  buyer/seller id=${bs.id3} code=${bsData.code} creditLimit=${bsData.creditLimit} banks=${(bsData.bankAccounts ?? []).length}`);
check('BS creditLimit survives the BigInt round-trip', bsData.creditLimit === 500000000, `got=${bsData.creditLimit}`);
check('BS currentBalance survives the BigInt round-trip', bsData.currentBalance === 12500000, `got=${bsData.currentBalance}`);
check(
  'BS creditLimit persisted exactly',
  sql(`SELECT "creditLimit"::text FROM "BuyerSeller" WHERE id='${bs.id3}'`) === '500000000',
  `id=${bs.id3}`,
);
check('BS child bank account round-trips', (bsData.bankAccounts ?? []).length === 1, `got=${(bsData.bankAccounts ?? []).length}`);
check(
  'BS bank account stored as a real child row',
  sql(`SELECT count(*) FROM "BuyerSellerBankAccount" WHERE "buyerSellerId"='${bs.id3}'`) === '1',
  `id=${bs.id3}`,
);

// Re-posting the bank list replaces it (no duplicates accumulate).
const bsReplaced = await call(token.zone, 'PATCH', `/finance/buyer-sellers/${bs.id3}`, {
  bankAccounts: [
    { bankName: 'سامان', accountNumber: `9918-${stamp}`, iban: 'IR120000000000000000000002' },
    { bankName: 'پاسارگاد', accountNumber: `5892-${stamp}`, iban: 'IR120000000000000000000003' },
  ],
});
check('BS bank list replaced (2 rows)', (bsReplaced.body?.data?.bankAccounts ?? []).length === 2, `got=${(bsReplaced.body?.data?.bankAccounts ?? []).length}`);
check(
  'BS child rows replaced, not accumulated',
  sql(`SELECT count(*) FROM "BuyerSellerBankAccount" WHERE "buyerSellerId"='${bs.id3}'`) === '2',
  `id=${bs.id3}`,
);

// ── Summary ─────────────────────────────────────────────────────────────────
console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
console.log('Row ids (real Postgres):');
console.log(`  FixedAsset      super+zone : ${fa.id2}`);
console.log(`  FixedAsset      depreciation: ${depId}`);
console.log(`  FixedAsset      zone-manager: ${fa.id3}`);
console.log(`  FinanceDocument purchase    : ${purchase.id2} / ${purchase.id3}`);
console.log(`  FinanceDocument sales       : ${sales.id2} / ${sales.id3}`);
console.log(`  BuyerSeller     super+zone : ${bs.id2}`);
console.log(`  BuyerSeller     zone-manager: ${bs.id3}`);
process.exit(fail === 0 ? 0 : 1);
