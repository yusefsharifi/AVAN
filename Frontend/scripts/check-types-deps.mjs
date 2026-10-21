#!/usr/bin/env node
/**
 * Guards the @types repair (fix4.md, Revised Task 2 item 1).
 *
 * Background: package.json historically never declared @types/react,
 * @types/react-dom or @types/node. TypeScript was only getting React types from
 * a *transitive* hoist (@types/react-transition-group -> @types/react@19.3.0).
 * Any relink of node_modules silently destroyed them; JSX then degraded to `any`
 * and tsc reported thousands of FALSE errors.
 *
 * This script fails a fresh install if any of the three is missing, is declared
 * as a range rather than an exact pin, or is installed at a different version.
 *
 * Note: it deliberately checks the PHYSICAL local path instead of
 * require.resolve(). A parent directory (e.g. E:\node_modules) can satisfy
 * require.resolve() by walking up the tree, which would mask a broken local
 * install -- exactly the failure mode this guard exists to prevent.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED = ['@types/react', '@types/react-dom', '@types/node'];

const failures = [];
const warnings = [];

let pkg;
try {
  pkg = JSON.parse(readFileSync(join(frontendRoot, 'package.json'), 'utf8'));
} catch (err) {
  console.error(`FAIL: cannot read package.json at ${frontendRoot}: ${err.message}`);
  process.exit(1);
}

// 1) Each must be DECLARED in devDependencies with an EXACT version.
for (const dep of REQUIRED) {
  const declared = pkg.devDependencies?.[dep];
  if (!declared) {
    failures.push(`${dep} is not declared in devDependencies`);
    continue;
  }
  if (/^[~^]/.test(declared)) {
    failures.push(`${dep} is pinned to a range (${declared}); it must be an exact version`);
  }
}

// 2) Each must be physically present under the LOCAL node_modules/@types, at the
//    exact declared version.
for (const dep of REQUIRED) {
  const name = dep.replace('@types/', '');
  const localPkgPath = join(frontendRoot, 'node_modules', '@types', name, 'package.json');
  const declared = pkg.devDependencies?.[dep];

  if (!existsSync(localPkgPath)) {
    failures.push(`${dep} MISSING at ${localPkgPath} -- run the package manager install`);
    continue;
  }

  let installed;
  try {
    installed = JSON.parse(readFileSync(localPkgPath, 'utf8')).version;
  } catch (err) {
    failures.push(`${dep} present but package.json is unreadable/corrupt: ${err.message}`);
    continue;
  }

  if (declared && !/^[~^]/.test(declared) && installed !== declared) {
    failures.push(`${dep} version mismatch: declared ${declared}, installed ${installed}`);
  }

  console.log(`ok   ${dep} ${installed} @ ${localPkgPath}`);
}

// 3) LATENT HAZARD: a parent node_modules/@types that tsc can reach by walking
//    up from the workspace. It is shadowed while the local copy exists, but it
//    silently takes over the moment the local copy vanishes. Outside our
//    control, so this warns loudly rather than failing.
let probe = frontendRoot;
for (let depth = 0; depth < 4; depth += 1) {
  probe = dirname(probe);
  if (probe === dirname(probe)) break;
  const parentTypes = join(probe, 'node_modules', '@types');
  if (!existsSync(parentTypes)) continue;

  for (const dep of REQUIRED) {
    const name = dep.replace('@types/', '');
    const p = join(parentTypes, name, 'package.json');
    if (!existsSync(p)) continue;
    let v = 'unknown';
    try {
      v = JSON.parse(readFileSync(p, 'utf8')).version;
    } catch {
      /* keep 'unknown' */
    }
    const declared = pkg.devDependencies?.[dep];
    const mismatch = declared && v !== declared;
    warnings.push(
      `${dep}@${v} also resolvable at ${parentTypes}` +
        (mismatch ? ` -- DIFFERS from pin ${declared}; a broken local install would silently pick this up` : ''),
    );
  }
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (failures.length > 0) {
  console.error('\nFAIL: @types repair is not intact:');
  for (const f of failures) console.error(`  x ${f}`);
  process.exit(1);
}

console.log('\nPASS: all required @types are declared at exact pins and installed locally.');
