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
// Task 4 proof, part 3: many controllers read zoneId from @Query(). Without it the
// ZoneGuard answers 403, which HIDES the response body. Re-probe with zoneId.
const BASE = 'http://localhost:3000/api/v1';
const ZONE = 'c39864e5-acb9-456a-b3cc-394c35c0c669';
const COMPANY = '33e80909-adcd-4ac0-bb14-5801e15c82d3';

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Avan@1404' }),
  });
  const j = await r.json();
  return j?.success ? j.data.accessToken : null;
}
const zoneTok = await login('zone@avan.local');
const compTok = await login('company@avan.local');

const paths = [
  '/finance/accounts', '/finance/accounts/tree', '/finance/documents',
  '/finance/checkbooks', '/finance/checks', '/finance/dashboard',
  '/finance/fixed-assets', '/finance/journal-vouchers', '/finance/receipt-payment-docs',
  '/finance/visitors', '/finance/buyer-sellers', '/hr/dashboard', '/hse/capas',
  '/hse/drills', '/hse/hazmat', '/hse/permits', '/inventory/contracts',
  '/inventory/dashboard', '/inventory/grns', '/inventory/rfqs', '/iot/dashboard',
  '/notifications', '/signatures/certificates', '/correspondence/audit-logs',
  '/correspondence/notifications', '/b2b/award', '/b2b/awards', '/b2b/bids',
  '/b2b/categories', '/b2b/evaluation', '/b2b/rfqs', '/commercial/collection',
  '/zones/companies', '/zones/operations/alerts', '/zones/operations/shipments',
  '/zones/utilities/meters',
];

const bare = [];
const ok = [];
const still = [];

for (const p of paths) {
  const sep = p.includes('?') ? '&' : '?';
  let found = false;
  for (const [who, tok] of [
    ['zone', zoneTok],
    ['company', compTok],
  ]) {
    if (!tok) continue;
    for (const qs of [`${sep}zoneId=${ZONE}`, `${sep}zoneId=${ZONE}&companyId=${COMPANY}`]) {
      let r;
      try {
        r = await fetch(`${BASE}${p}${qs}`, { headers: { Authorization: `Bearer ${tok}` } });
      } catch {
        continue;
      }
      if (r.status !== 200) continue;
      found = true;
      const text = await r.text();
      let j;
      try {
        j = JSON.parse(text);
      } catch {
        bare.push(`UNPARSEABLE ${who} ${p} :: ${text.slice(0, 50)}`);
        break;
      }
      const has = j && typeof j === 'object' && ('data' in j || 'success' in j);
      if (has) ok.push(`200 enveloped ${who}: ${p}`);
      else
        bare.push(
          `200 BARE ${who}: ${p} :: ${Array.isArray(j) ? 'ARRAY' : 'OBJ ' + Object.keys(j).slice(0, 8).join(',')}`,
        );
      break;
    }
    if (found) break;
  }
  if (!found) still.push(p);
}

console.log(`=== 200 ENVELOPED: ${ok.length} ===`);
console.log(`=== 200 BARE (must wrap): ${bare.length} ===`);
bare.forEach((s) => console.log('   ' + s));
console.log(`=== STILL NOT 200: ${still.length} ===`);
still.forEach((s) => console.log('   ' + s));
