/**
 * Step-7 TASK B status: how many in-scope tsc errors remain, split by
 * whether the file is reachable from the router.
 *
 *   node scripts/taskb-status.mjs [path-to-tsc-output.txt]
 *
 * If no output file is given it runs `tsc -p tsconfig.json --noEmit` itself.
 *
 * In-scope codes are the runtime-risk kinds fix7.md B1 allows:
 *   TS2339 property does not exist, TS2345 argument mismatch,
 *   TS7006 implicit any feeding API calls, TS2304 cannot find name.
 * TS6133/TS6196 (unused symbols) are excluded by the same rule.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const IN_SCOPE = new Set(['TS2339', 'TS2345', 'TS7006', 'TS2304']);
const TARGET_AREA = /^src\/modules\/(dashboard|hr)\//;
const ERROR_RE = /^(.+?)\((\d+),(\d+)\): error (TS\d+):(.*)$/;

const arg = process.argv[2];
const outputFile = arg && !arg.startsWith('--') ? resolve(arg) : null;
let output;
if (outputFile) {
  output = readFileSync(outputFile, 'utf8');
} else {
  const tscBin = join(frontendRoot, 'node_modules', 'typescript', 'bin', 'tsc');
  const r = spawnSync(process.execPath, [tscBin, '--noEmit', '-p', 'tsconfig.json'], {
    cwd: frontendRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  output = `${r.stdout ?? ''}\n${r.stderr ?? ''}`;
}

const routed = new Set(
  JSON.parse(readFileSync(join(frontendRoot, '..', '.gate', 'routed-files.json'), 'utf8')).files,
);

const rows = [];
const seen = new Set();
for (const raw of output.split(/\r?\n/)) {
  const m = ERROR_RE.exec(raw.trim());
  if (!m) continue;
  const file = m[1].replace(/\\/g, '/');
  const key = `${file}|${m[2]}|${m[4]}`;
  if (seen.has(key)) continue;
  seen.add(key);
  if (!TARGET_AREA.test(file)) continue;
  rows.push({ file, line: Number(m[2]), code: m[4], msg: m[5].trim(), inScope: IN_SCOPE.has(m[4]) });
}

const inScope = rows.filter((r) => r.inScope);
const routedInScope = inScope.filter((r) => routed.has(r.file));
const unroutedInScope = inScope.filter((r) => !routed.has(r.file));
const outOfScope = rows.filter((r) => !r.inScope);

console.log(`dashboard+hr total errors        : ${rows.length}`);
console.log(`  in-scope (TS2339/2345/7006/2304): ${inScope.length}`);
console.log(`    ROUTED   (work these)         : ${routedInScope.length}`);
console.log(`    UNROUTED (leave as debt)      : ${unroutedInScope.length}`);
console.log(`  out-of-scope (6133/6196/other)  : ${outOfScope.length}`);

const byCode = new Map();
for (const r of routedInScope) byCode.set(r.code, (byCode.get(r.code) ?? 0) + 1);
console.log(`\nrouted in-scope by code:`);
for (const [c, n] of [...byCode].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${c}`);

const byFile = new Map();
for (const r of routedInScope) byFile.set(r.file, (byFile.get(r.file) ?? 0) + 1);
console.log(`\nrouted in-scope by file:`);
for (const [f, n] of [...byFile].sort((a, b) => b[1] - a[1])) console.log(`  ${String(n).padStart(4)}  ${f}`);

if (process.argv.includes('--list')) {
  console.log(`\nremaining routed in-scope errors:`);
  for (const r of routedInScope) console.log(`  ${r.file}(${r.line},1): ${r.code} ${r.msg.slice(0, 120)}`);
}
