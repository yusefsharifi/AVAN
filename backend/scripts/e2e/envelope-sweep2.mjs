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
// Task 4 proof, part 2: retry every path that wasn't 200 with ALL seeded users
// (company / zone / super) so permission-403s don't hide a bare 200 body.
const BASE = 'http://localhost:3000/api/v1';
const zoneId = 'c39864e5-acb9-456a-b3cc-394c35c0c669';

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Avan@1404' }),
  });
  const j = await r.json();
  if (!j?.success) return null;
  return j.data.accessToken;
}

const tokens = {
  company: await login('company@avan.local'),
  zone: await login('zone@avan.local'),
  super: await login('super@avan.local'),
};
console.log(
  'tokens:',
  Object.entries(tokens)
    .map(([k, v]) => `${k}=${v ? 'ok' : 'FAIL'} `)
    .join(''),
);

const nonOk = [
  '/b2b/award', '/b2b/awards', '/b2b/bids', '/b2b/categories', '/b2b/evaluation',
  '/b2b/rfqs', '/commercial/collection', '/companies', '/correspondence/audit-logs',
  '/correspondence/notifications', '/finance/accounts', '/finance/accounts/tree',
  '/finance/bank-accounts', '/finance/bank-accounts/treasury-dashboard',
  '/finance/budgets', '/finance/buyer-sellers', '/finance/checkbooks', '/finance/checks',
  '/finance/dashboard', '/finance/documents', '/finance/fixed-assets',
  '/finance/invoices/aging-report', '/finance/invoices/overdue',
  '/finance/journal-vouchers', '/finance/leases/expiring', '/finance/leases/stats',
  '/finance/periods', '/finance/periods/current', '/finance/receipt-payment-docs',
  '/finance/reports/aging', '/finance/reports/balance-sheet', '/finance/reports/budget-variance',
  '/finance/reports/cash-flow', '/finance/reports/income-statement', '/finance/reports/kpi',
  '/finance/reports/revenue-breakdown', '/finance/visitors', '/finance/vouchers',
  '/finance/vouchers/trial-balance', '/hr/dashboard', '/hse/capas', '/hse/drills',
  '/hse/hazmat', '/hse/incidents', '/hse/inspections', '/hse/permits', '/hse/risks',
  '/inventory/contracts', '/inventory/dashboard', '/inventory/grns', '/inventory/rfqs',
  '/iot/dashboard', '/notifications', '/signatures/certificates', '/super/audit/logs',
  '/super/audit/logs/super-actions', '/super/audit/suspicious', '/super/health',
  '/super/metrics/kpis', '/super/users', '/super/zones', '/waybills/stats',
  '/weigh/records', '/weigh/scales', '/workflow-definitions', '/workflow-instances',
  '/zones', '/zones/companies', '/zones/operations/alerts', '/zones/operations/shipments',
  '/zones/utilities/meters',
];

const POST_ONLY = /read-all|adjust|transfer|start$/i;
const bare = [];
const newlyOk = [];
const stillNot = [];

for (const raw of nonOk) {
  if (POST_ONLY.test(raw)) continue;
  let path = raw;
  if (path.startsWith('/physical-archive') && !path.includes('zoneId')) path += `?zoneId=${zoneId}`;
  let saw200 = false;
  for (const [who, token] of Object.entries(tokens)) {
    if (!token) continue;
    let r;
    try {
      r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    } catch {
      continue;
    }
    if (r.status !== 200) continue;
    saw200 = true;
    const text = await r.text();
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      bare.push(`200 UNPARSEABLE via ${who}: ${raw} :: ${text.slice(0, 60)}`);
      continue;
    }
    const hasSuccess = j && typeof j === 'object' && !Array.isArray(j) && 'success' in j;
    const hasData = j && typeof j === 'object' && 'data' in j;
    if (hasSuccess || hasData) newlyOk.push(`200 via ${who}: ${raw}`);
    else
      bare.push(
        `200 via ${who}: ${raw} :: ${Array.isArray(j) ? 'BARE_ARRAY' : 'BARE_OBJECT ' + Object.keys(j).slice(0, 8).join(',')}`,
      );
    break; // first 200 is enough
  }
  if (!saw200) stillNot.push(raw);
}

console.log(`\n=== NEWLY 200 & ENVELOPE-OK: ${newlyOk.length} ===`);
newlyOk.forEach((s) => console.log('   ' + s));
console.log(`\n=== BARE BODY FOUND (must wrap): ${bare.length} ===`);
bare.forEach((s) => console.log('   ' + s));
console.log(`\n=== STILL NO 200 (route absent / guard-blocked for all users): ${stillNot.length} ===`);
stillNot.forEach((s) => console.log('   ' + s));
