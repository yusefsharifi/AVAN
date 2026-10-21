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
// Probe: compare candidate Jalali<->Gregorian conversions against known anchors.
// Anchor set: Persian New Year (Nowruz) 1403 = 2024-03-20, 1404 = 2025-03-21.
const anchors = [
  { j: [1403, 1, 1], g: [2024, 3, 20] },
  { j: [1404, 1, 1], g: [2025, 3, 21] },
  { j: [1404, 11, 1], g: [2026, 1, 21] }, // Bahman 1, 1404 ~ Jan 21 2026
];

// ---- Candidate A: Intl Persian calendar (format direction) -----------------
let intlOk = false;
let PERSIAN_FMT;
try {
  PERSIAN_FMT = new Intl.DateTimeFormat('en-u-ca-persian-nu-latn', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
  intlOk = true;
} catch (e) {
  console.log('Intl persian calendar UNAVAILABLE:', e.message);
}

function intlParts(d) {
  const out = {};
  for (const p of PERSIAN_FMT.formatToParts(d)) {
    if (p.type === 'year') out.y = Number(p.value);
    if (p.type === 'month') out.m = Number(p.value);
    if (p.type === 'day') out.d = Number(p.value);
  }
  return out.y ? [out.y, out.m, out.d] : null;
}

console.log('=== A) Intl Gregorian -> Jalali ===');
if (intlOk) {
  for (const a of anchors) {
    const d = new Date(a.g[0], a.g[1] - 1, a.g[2], 12, 0, 0, 0);
    const got = intlParts(d);
    const ok = got && got[0] === a.j[0] && got[1] === a.j[1] && got[2] === a.j[2];
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'} expected ${a.j.join('/')} got ${got ? got.join('/') : 'null'}`,
    );
  }
}

// ---- Candidate A2: Intl inverse via bounded search -------------------------
function isoToJalaliISO(iso) {
  const d = new Date(`${iso}T12:00:00`);
  const p = intlParts(d);
  return p ? p.join('-') : null;
}

function jalaliToIso(jy, jm, jd) {
  // seed: Nowruz of Jalali year jy lands ~March 20/21 of Gregorian (jy + 621)
  const G = jy + 621;
  const M = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  const doy = M.slice(0, jm - 1).reduce((s, x) => s + x, 0) + jd;
  let seed = new Date(G, 2, 21 + (doy - 1), 12, 0, 0, 0);
  for (let i = 0; i < 32; i += 1) {
    const got = intlParts(seed);
    if (!got) return null;
    if (got[0] === jy && got[1] === jm && got[2] === jd) {
      return `${seed.getFullYear()}-${String(seed.getMonth() + 1).padStart(2, '0')}-${String(seed.getDate()).padStart(2, '0')}`;
    }
    const less =
      got[0] < jy || (got[0] === jy && (got[1] < jm || (got[1] === jm && got[2] < jd)));
    seed = new Date(seed.getTime() + (less ? 1 : -1) * 86400000);
  }
  return null;
}

console.log('=== A2) Jalali -> ISO via Intl inverse search ===');
for (const a of anchors) {
  const got = jalaliToIso(...a.j);
  const want = a.g.join('-');
  console.log(`  ${got === want ? 'PASS' : 'FAIL'} ${a.j.join('/')} -> ${got} (want ${want})`);
}

// ---- Candidate B: the backend's existing approximate implementation --------
console.log('=== B) backend hr.utils approach (reimplemented inline) ===');
function jalaliToDate_approx(jalaliDate) {
  const [jy, jm, jd] = jalaliDate.split('-').map(Number);
  const gy = jy + 621;
  const monthOffsets = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const dayOfYear = monthOffsets[jm - 1] + jd;
  const isLeap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const adjustedDayOfYear = dayOfYear + (isLeap && jm > 6 ? 1 : 0);
  return new Date(gy, 0, adjustedDayOfYear);
}
for (const a of anchors) {
  const d = jalaliToDate_approx(a.j.join('-'));
  const want = a.g.join('-');
  const got = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  console.log(`  ${got === want ? 'PASS' : 'FAIL'} ${a.j.join('/')} -> ${got} (want ${want})`);
}

// ---- round-trip stability of Intl display (what the frontend will render) --
console.log('=== C) round-trip: Jalali -> ISO -> Jalali (display) ===');
for (const a of anchors) {
  const iso = jalaliToIso(...a.j);
  const back = isoToJalaliISO(iso);
  const ok = back === a.j.join('-');
  console.log(`  ${ok ? 'PASS' : 'FAIL'} ${a.j.join('/')} -> ${iso} -> ${back}`);
}

// ---- what does a bogus input produce (the "silent Invalid Date" hazard) ----
console.log('=== D) Invalid Date hazard ===');
const bad = new Date('امروز');
console.log('  new Date("امروز")           ->', bad.toString());
console.log('  bad.toLocaleDateString(fa)  ->', bad.toLocaleDateString('fa-IR'));
console.log('  isNaN(bad.getTime())        ->', isNaN(bad.getTime()), ' (note: toLocaleDateString did NOT throw)');
console.log("  new Date('1404-01-01')      ->", new Date('1404-01-01').toISOString());
