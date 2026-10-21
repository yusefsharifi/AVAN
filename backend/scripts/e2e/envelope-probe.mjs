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
// Task 4 evidence: does each endpoint return the {success,data} envelope or a raw body?
// Read-only probe. Prints ENVELOPED / RAW per route.
const BASE = 'http://localhost:3000/api/v1';

async function login(identifier) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password: 'Avan@1404' }),
  });
  const j = await r.json();
  if (!j?.success) throw new Error(`login failed for ${identifier}: ${JSON.stringify(j)}`);
  return { token: j.data.accessToken, cookie: r.headers.get('set-cookie') || '' };
}

async function probe(token, label, path) {
  try {
    const r = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const text = await r.text();
    let shape = 'UNPARSEABLE';
    try {
      const j = JSON.parse(text);
      if (j && typeof j === 'object' && 'success' in j) shape = 'ENVELOPED';
      else if (Array.isArray(j)) shape = `RAW (array len=${j.length})`;
      else if (j && typeof j === 'object') shape = `RAW (keys=${Object.keys(j).slice(0, 6).join(',')})`;
      else shape = `RAW (${typeof j})`;
    } catch {
      shape = `RAW/HTML (${text.slice(0, 40)})`;
    }
    console.log(`${shape.padEnd(40)} ${r.status}  ${label}  ${path}`);
  } catch (e) {
    console.log(`ERROR${''.padEnd(35)} ${label} ${path} :: ${e.message}`);
  }
}

const targets = [
  ['company', '/commercial/collection/cases', 'collection (no successResponse)'],
  ['company', '/hr/employees', 'hr employee'],
  ['company', '/finance/accounts', 'finance accounts'],
  ['company', '/commercial/orders', 'commercial orders'],
  ['company', '/b2b/rfq', 'b2b rfq'],
  ['company', '/inventory/items', 'inventory items'],
  ['company', '/production/work-orders', 'production work orders'],
  ['company', '/correspondence/letters', 'correspondence letters'],
  ['company', '/physical-archive/shelves', 'physical-archive shelves'],
  ['company', '/physical-archive/report', 'physical-archive report'],
  ['company', '/super/health', 'super health (base.api getSystemHealth)'],
  ['company', '/zones', 'zones'],
];

const auths = {};
for (const ident of ['company@avan.local', 'zone@avan.local']) {
  try {
    auths[ident.startsWith('company') ? 'company' : 'zone'] = await login(ident);
  } catch (e) {
    console.log(`LOGIN FAIL ${ident}: ${e.message}`);
  }
}

for (const [who, path, label] of targets) {
  const a = auths[who];
  if (!a) {
    console.log(`NO-TOKEN                                       ${label} ${path}`);
    continue;
  }
  await probe(a.token, label, path);
}
