/**
 * Step-8 TASK A — proof that the finance permission keys are now seeded and
 * actually reach a real role.
 *
 * REQUIRES A RUNNING STACK. Talks to a live backend on
 * http://localhost:3000/api/v1 and asserts against PostgreSQL directly via
 * psql, so every "created" claim is a real row, not an HTTP status.
 *
 * TEMP-ONLY DEPENDENCY -- NOT A DELIVERABLE:
 *   This machine has no Redis; the stack runs against a throwaway in-memory
 *   RESP2 shim on 127.0.0.1:6379 kept OUTSIDE the repo. Test scaffold only --
 *   never a product component, never cited as one. Production uses the Redis
 *   declared in docker-compose.yml.
 *
 * Bearer-only (no cookie jar) => the CSRF middleware is bypassed by design.
 *
 * WHAT THIS PROVES, AND WHY IT IS SET UP THIS WAY
 *
 *   Before the seed, `Role`, `RolePermission` and `RoleAssignment` were empty
 *   and `UserPermission` held only two literal `*` rows, so the ONLY accounts
 *   that could call finance were SUPER_ADMIN (PermissionsGuard returns true for
 *   it before consulting anything) and those two wildcards. A real ZONE_MANAGER
 *   got 403.
 *
 *   Guard order on every finance controller is
 *       JwtGuard -> ZoneGuard -> RolesGuard -> PermissionsGuard
 *   and three of those throw the SAME USER_PERMISSION_DENIED code. So a naive
 *   "GUARD gets 403" test would pass for the wrong reason -- it could be
 *   ZoneGuard rejecting an unscoped user.
 *
 *   To make the negative test isolate PermissionsGuard, BOTH fixture users are
 *   given the SAME valid zone and both are ACTIVE and non-wildcard. ZoneGuard
 *   therefore passes for both (it only requires user.zoneId to exist and the
 *   zone to be live -- it does not filter by role), RolesGuard passes through
 *   because no finance controller sets @RequireRoles, and the ONLY difference
 *   between them is the permission set their system role carries.
 *
 *   Both fixtures are fresh users with unique emails, never the wildcard
 *   accounts, so no `*` row can mask a missing grant.
 *
 *   1) idempotency      run the seed twice -> key count stable, no duplicates
 *   2) ZONE_MANAGER     POST all 6 groups -> 201 + a Postgres row, never 403
 *   3) GUARD            POST all 6 groups -> 403 USER_PERMISSION_DENIED
 *   4) control          the GUARD token still authenticates (GET /auth/me
 *                       -> 200), so its 403s are permission denials and not
 *                       an expired or invalid token
 */
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const BASE = 'http://localhost:3000/api/v1';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const PSQL = 'C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe';
const DSN = 'postgresql://postgres:postgres@localhost:5432/idop';
const stamp = Date.now().toString().slice(-9);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SEED = path.resolve(HERE, '..', 'seed-permissions.js');
const PASSWORD = 'Perm@1404';

const prisma = new PrismaClient();

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: PASSWORD }),
  });
  const j = await r.json();
  if (!j?.success) throw new Error(`login failed ${identifier}: ${JSON.stringify(j)}`);
  return j.data.accessToken;
}

async function call(token, method, requestPath, body) {
  const r = await fetch(`${BASE}${requestPath}`, {
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

function msg(res) {
  return res.body?.message ?? res.body?.error?.message ?? '';
}

let pass = 0;
let fail = 0;
function check(label, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${label}${detail ? ` | ${detail}` : ''}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}${detail ? ` | ${detail}` : ''}`);
  }
}

function runSeed() {
  return execFileSync(process.execPath, [SEED], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

// The 7 families the finance controllers require, and the 6 that Step 8 set out
// to unblock. `buyer-sellers` is seeded too because it sits under
// `finance.parties.*` and was unseeded for exactly the same reason.
const ACTIONS = ['create', 'view', 'update', 'delete'];
const FAMILY = {
  assets: 'finance.assets.fixed-assets',
  documents: 'finance.documents.documents',
  visitors: 'finance.parties.visitors',
  buyerSellers: 'finance.parties.buyer-sellers',
  checkbooks: 'finance.treasury.checkbooks',
  checks: 'finance.treasury.checks',
  receiptPaymentDocs: 'finance.treasury.receipt-payment-docs',
};

/** The 6 groups exercised end-to-end, with the permission each one requires. */
const GROUPS = [
  {
    name: 'fixed assets',
    route: '/finance/fixed-assets',
    table: 'FixedAsset',
    key: FAMILY.assets,
    body: () => ({
      id: `FA-p-${stamp}`,
      createdAt: new Date().toISOString(),
      assetCode: `FAP-${stamp}`,
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
    }),
  },
  {
    name: 'documents',
    route: '/finance/documents',
    table: 'FinanceDocument',
    key: FAMILY.documents,
    body: () => ({
      id: `PD-p-${stamp}`,
      createdAt: new Date().toISOString(),
      documentNumber: `PDP-${stamp}`,
      date: '2026-04-02',
      type: 'purchase_invoice',
      vendorName: 'شرکت فولاد',
      vendorCode: 'V-1',
      buyerName: '',
      buyerCode: '',
      preparedBy: 'admin',
      escrowRequired: false,
      visitorName: '',
      currencyCode: 'IRR',
      exchangeRate: 1,
      lineCount: 1,
      totalBeforeDiscount: 600000,
      totalDiscount: 0,
      totalTax: 54000,
      grandTotal: 654000,
      payableAmount: 654000,
      receivableAmount: 654000,
      lines: [
        {
          id: `ln-p-${stamp}-1`,
          itemCode: 'RM-1',
          itemName: 'Steel',
          quantity: 10,
          unitPrice: 60000,
          discount: 0,
          taxRate: 9,
          lineTotal: 654000,
        },
      ],
    }),
  },
  {
    name: 'visitors',
    route: '/finance/visitors',
    table: 'FinanceVisitor',
    key: FAMILY.visitors,
    body: () => ({
      id: `vis_p_${stamp}`,
      code: `VISP-${stamp}`,
      name: 'آقای رضایی',
      phone: '09121234567',
      region: 'تهران',
      commissionRate: 2.5,
      status: 'active',
      notes: 'ویزیتور منطقه یک',
    }),
  },
  {
    name: 'checkbooks',
    route: '/finance/checkbooks',
    table: 'FinanceCheckbook',
    key: FAMILY.checkbooks,
    body: () => ({
      id: `cb_p_${stamp}`,
      bookNumber: `دسته-چک-p-${stamp}`,
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
    }),
  },
  {
    name: 'checks',
    route: '/finance/checks',
    table: 'FinanceCheck',
    key: FAMILY.checks,
    // A check references a checkbook. checkbookId is an opaque string (no FK),
    // but the book is created first so the payload is realistic.
    body: (ctx) => ({
      id: `chk_p_${stamp}`,
      checkNumber: '000123',
      checkbookId: ctx.checkbookId,
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
    }),
  },
  {
    name: 'receipt-payment-docs',
    route: '/finance/receipt-payment-docs',
    table: 'FinanceReceiptPaymentDoc',
    key: FAMILY.receiptPaymentDocs,
    body: () => ({
      id: `rp_p_${stamp}`,
      documentNumber: `RPP-${stamp}`,
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
      lines: [
        {
          id: `rpl-p-${stamp}-1`,
          accountId: '1101',
          accountCode: '1101',
          accountName: 'صندوق',
          amount: 600000,
          description: 'دریافت نقدی',
        },
      ],
    }),
  },
];

/** Create a fresh, non-wildcard user bound to a system role in the test zone. */
async function makeUser(email, roleEnum, systemRoleName) {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email },
    update: { status: 'ACTIVE', role: roleEnum, zoneId: ZONE },
    create: {
      email,
      phone: `0912${Math.floor(Math.random() * 1e7).toString().padStart(7, '0')}`,
      firstName: 'تست',
      lastName: 'دسترسی',
      role: roleEnum,
      zoneId: ZONE,
      companyId: null,
      passwordHash: hash,
      status: 'ACTIVE',
    },
  });
  const role = await prisma.role.findFirst({
    where: { name: systemRoleName, zoneId: null, companyId: null },
  });
  if (!role) throw new Error(`system role ${systemRoleName} missing - run the seed first`);
  await prisma.roleAssignment.upsert({
    where: { userId_roleId: { userId: user.id, roleId: role.id } },
    update: {},
    create: { userId: user.id, roleId: role.id, assignedBy: 'taskA-permissions' },
  });
  return { user, role };
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('tokens + fixtures');
const zoneEmail = `perm-zone-${stamp}@avan.local`;
const guardEmail = `perm-guard-${stamp}@avan.local`;
const zoneFx = await makeUser(zoneEmail, 'ZONE_MANAGER', 'ZONE_MANAGER');
const guardFx = await makeUser(guardEmail, 'GUARD', 'GUARD');
console.log(`  zone  user=${zoneFx.user.id} email=${zoneEmail} role=${zoneFx.role.id}`);
console.log(`  guard user=${guardFx.user.id} email=${guardEmail} role=${guardFx.role.id}`);

// Neither fixture may hold a wildcard, or the permission check would never run.
check(
  'fixtures hold no wildcard permission',
  (await prisma.userPermission.count({ where: { userId: zoneFx.user.id } })) === 0 &&
    (await prisma.userPermission.count({ where: { userId: guardFx.user.id } })) === 0,
);

const tokenZone = await login(zoneEmail);
const tokenGuard = await login(guardEmail);

// ── 1) Idempotency ──────────────────────────────────────────────────────────
console.log('\n1) SEED IDEMPOTENCY');
const financeCount = () =>
  prisma.rolePermission.count({ where: { permission: { startsWith: 'finance.' } } });

// Restore the pre-Step-8 state first, so this harness proves the seed works
// from nothing. Without this reset it would only prove the seed is *already*
// satisfied, which is not the same claim and is trivially true on re-run.
await prisma.rolePermission.deleteMany({
  where: {
    role: { name: { in: ['ZONE_MANAGER', 'COMPANY_ADMIN', 'GUARD'] } },
    permission: { startsWith: 'finance.' },
  },
});
const n0 = await financeCount();
runSeed();
const n1 = await financeCount();
runSeed();
const n2 = await financeCount();

console.log(`  finance RolePermission rows: seeded-state=${n0} after1=${n1} after2=${n2}`);
check('seed populates the keys from an unseeded state', n0 === 0 && n1 > n0, `before=${n0} after=${n1}`);
check('re-running the seed creates no duplicates', n1 === n2, `after1=${n1} after2=${n2}`);

// Every family x action must actually exist for the ZONE_MANAGER role.
const zmRole = await prisma.role.findFirst({
  where: { name: 'ZONE_MANAGER', zoneId: null, companyId: null },
  include: { permissions: true },
});
const zmPerms = new Set((zmRole?.permissions ?? []).map((p) => p.permission));
for (const [label, family] of Object.entries(FAMILY)) {
  const missing = ACTIONS.filter((a) => !zmPerms.has(`${family}.${a}`));
  check(`ZONE_MANAGER has ${label} (4 keys)`, missing.length === 0, `missing=${missing.join(',')}`);
}

const caRole = await prisma.role.findFirst({
  where: { name: 'COMPANY_ADMIN', zoneId: null, companyId: null },
  include: { permissions: true },
});
const caPerms = new Set((caRole?.permissions ?? []).map((p) => p.permission));
check(
  'COMPANY_ADMIN has assets/documents/parties view only',
  [FAMILY.assets, FAMILY.documents, FAMILY.visitors, FAMILY.buyerSellers].every((f) =>
    caPerms.has(`${f}.view`),
  ) && caPerms.size === 4,
  `count=${caPerms.size}`,
);
check(
  'GUARD has none of the new keys',
  (await prisma.rolePermission.count({
    where: {
      role: { name: 'GUARD', zoneId: null, companyId: null },
      permission: { startsWith: 'finance.' },
    },
  })) === 0,
);

// ── 2) ZONE_MANAGER (real role, no wildcard) ────────────────────────────────
console.log(`\n2) ZONE_MANAGER role  ${zoneEmail}`);
// Create the book first so the check payload references a real one.
const cbRes = await call(tokenZone, 'POST', '/finance/checkbooks', GROUPS[3].body({}));
check('checkbook created', cbRes.status === 201, `status=${cbRes.status} ${cbRes.raw}`);
const checkbookId = cbRes.body?.data?.id ?? '';

for (const g of GROUPS) {
  if (g.name === 'checkbooks') continue;
  const res = await call(tokenZone, 'POST', g.route, g.body({ checkbookId }));
  const id = res.body?.data?.id ?? '';
  const inDb = id ? sql(`SELECT count(*) FROM "${g.table}" WHERE id='${id}'`) : '0';
  check(
    `${g.name} -> 201, not 403`,
    res.status === 201 && inDb === '1',
    `status=${res.status} id=${id} dbRows=${inDb} ${res.status === 201 ? '' : res.raw}`,
  );
}

// ── 3) GUARD (same zone, same status, zero new keys) ─────────────────────────
console.log(`\n3) GUARD role  ${guardEmail}`);
for (const g of GROUPS) {
  const res = await call(tokenGuard, 'POST', g.route, g.body({ checkbookId: `cb_none_${stamp}` }));
  check(
    `${g.name} -> 403 USER_PERMISSION_DENIED`,
    res.status === 403 && JSON.stringify(res.body ?? {}).includes('USER_PERMISSION_DENIED'),
    `status=${res.status} code=${JSON.stringify(res.body ?? res.raw).slice(0, 90)}`,
  );
}

// ── 4) Control: the GUARD token is valid, so the 403s above are permissions ──
console.log('\n4) CONTROL');
const me = await call(tokenGuard, 'GET', '/auth/me');
check('GUARD token still authenticates (GET /auth/me -> 200)', me.status === 200, `status=${me.status}`);

console.log(`\nRESULT: PASS=${pass} FAIL=${fail}`);
console.log(
  `  zone user id=${zoneFx.user.id} | guard user id=${guardFx.user.id} | ` +
    `finance keys=${n2}`,
);
await prisma.$disconnect();
process.exit(fail === 0 ? 0 : 1);
