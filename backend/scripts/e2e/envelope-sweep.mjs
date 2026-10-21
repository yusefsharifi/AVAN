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
// Task 4 proof: which endpoints would break if client.ts lost its raw-body unwrap?
// GET-only sweep (no mutations). A 200 whose body has NEITHER `success` NOR `data`
// is exactly the set that relied on the tolerant fallback.
import fs from 'node:fs';

const BASE = 'http://localhost:3000/api/v1';
const zoneId = 'c39864e5-acb9-456a-b3cc-394c35c0c669';

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

const rawList = fs
  .readFileSync(process.env.TEMP + '\\api-paths.txt', 'utf8')
  .split(/\r?\n/)
  .map((s) => s.trim())
  .filter(Boolean);

// POST-only routes: skip on the GET sweep.
const POST_ONLY = /login|logout|register|reset-password|forgot-password|send-otp|verify-otp|verify-phone|start$|read-all|adjust|transfer|check-availability|seed|escalate|2fa|password|refresh|approve/i;

const tokens = {};
tokens.company = await login('company@avan.local');
tokens.zone = await login('zone@avan.local');

async function tokenFor(path) {
  if (path.startsWith('/super/')) return tokens.zone ?? tokens.company;
  if (path.startsWith('/commercial/collection')) return tokens.zone;
  return tokens.company ?? tokens.zone;
}

const reliant = [];
const ok = [];
const nonOk = [];

for (const raw of rawList) {
  if (POST_ONLY.test(raw)) continue;
  let path = raw;
  if (path.startsWith('/physical-archive') && !path.includes('zoneId')) {
    path += `?zoneId=${zoneId}`;
  }
  const token = await tokenFor(raw);
  if (!token) continue;
  try {
    const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    const text = await r.text();
    if (r.status !== 200) {
      nonOk.push(`${r.status} ${raw}`);
      continue;
    }
    let j;
    try {
      j = JSON.parse(text);
    } catch {
      reliant.push({ raw, why: 'UNPARSEABLE', sample: text.slice(0, 60) });
      continue;
    }
    const hasSuccess = j !== null && typeof j === 'object' && !Array.isArray(j) && 'success' in j;
    const hasData = j !== null && typeof j === 'object' && 'data' in j;
    if (hasSuccess || hasData) ok.push(raw);
    else
      reliant.push({
        raw,
        why: Array.isArray(j) ? 'BARE_ARRAY' : `BARE_OBJECT keys=${Object.keys(j).slice(0, 8).join(',')}`,
        sample: text.slice(0, 80),
      });
  } catch (e) {
    nonOk.push(`ERR ${raw} :: ${e.message}`);
  }
}

console.log(`\n=== ENVELOPE-OK (safe under strict unwrap): ${ok.length} ===`);
console.log(`\n=== NON-200 / ERR (inconclusive): ${nonOk.length} ===`);
nonOk.forEach((s) => console.log('   ' + s));
console.log(`\n=== RELIED ON RAW-BODY FALLBACK (would break): ${reliant.length} ===`);
reliant.forEach((r) => console.log(`   ${r.raw}\n       ${r.why} | ${r.sample}`));
