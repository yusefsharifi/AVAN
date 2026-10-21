/**
 * Step-7 TASK B evidence: which source files are reachable from the router.
 *
 * The spec says "touch only files reachable from routed screens (verify via
 * router import chain)". This computes the transitive import closure from
 * src/main.tsx, following static imports, `export ... from` re-exports and
 * dynamic `import()` (the router uses `lazy(() => import(...))` for every
 * screen), so lazy screens are counted as reachable too.
 *
 * Output: .gate/routed-files.json  (reachable) + summary on stdout.
 * Deliberately ignores bare specifiers (node_modules).
 */
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const srcRoot = join(frontendRoot, 'src');

// Match static + dynamic imports and re-exports. Captures the specifier.
const RE = /(?:^|\s)(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|^import\s*['"]([^'"]+)['"]/gm;

function resolveSpecifier(spec, fromFile) {
  let base = null;
  if (spec.startsWith('./') || spec.startsWith('../')) {
    base = resolve(dirname(fromFile), spec);
  } else if (spec.startsWith('@/')) {
    base = join(srcRoot, spec.slice(2));
  } else {
    return null; // bare / absolute specifier -> node_modules
  }
  const candidates = [
    base,
    `${base}.tsx`,
    `${base}.ts`,
    `${base}.jsx`,
    `${base}.js`,
    `${base}.d.ts`,
    join(base, 'index.tsx'),
    join(base, 'index.ts'),
    join(base, 'index.jsx'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

function specsIn(code) {
  const out = [];
  let m;
  RE.lastIndex = 0;
  while ((m = RE.exec(code)) !== null) {
    const s = m[1] ?? m[2] ?? m[3];
    if (s) out.push(s);
  }
  return out;
}

const start = join(srcRoot, 'main.tsx');
const seen = new Set();
const queue = [start];
const missing = [];

while (queue.length) {
  const file = queue.shift();
  if (seen.has(file)) continue;
  seen.add(file);
  let code;
  try {
    code = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const spec of specsIn(code)) {
    const resolved = resolveSpecifier(spec, file);
    if (resolved) {
      if (!seen.has(resolved)) queue.push(resolved);
    } else if (spec.startsWith('./') || spec.startsWith('../') || spec.startsWith('@/')) {
      missing.push(`${relative(frontendRoot, file)} -> ${spec}`);
    }
  }
}

const routable = [...seen]
  .map((f) => relative(frontendRoot, f).split(sep).join('/'))
  .filter((p) => p.startsWith('src/'))
  .sort();

writeFileSync(
  join(frontendRoot, '..', '.gate', 'routed-files.json'),
  JSON.stringify({ total: routable.length, files: routable, unresolved: missing }, null, 2),
  'utf8',
);

const dashboard = routable.filter((p) => p.startsWith('src/modules/dashboard/'));
const hr = routable.filter((p) => p.startsWith('src/modules/hr/'));
const allDashboard = walk(join(srcRoot, 'modules', 'dashboard')).length;
const allHr = walk(join(srcRoot, 'modules', 'hr')).length;

console.log(`reachable from main.tsx : ${routable.length}`);
console.log(`  dashboard reachable   : ${dashboard.length} / ${allDashboard}`);
console.log(`  hr reachable          : ${hr.length} / ${allHr}`);
console.log(`unresolved local imports: ${missing.length}`);
for (const u of missing.slice(0, 10)) console.log(`  ! ${u}`);

function walk(dir) {
  const acc = [];
  if (!existsSync(dir)) return acc;
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) acc.push(...walk(p));
    else if (/\.(tsx?|jsx?)$/.test(e)) acc.push(p);
  }
  return acc;
}
