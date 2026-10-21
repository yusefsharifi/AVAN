import { PERMISSIONS_CATALOG, getAllPermissionStrings } from '../src/modules/permissions/permissions.catalog';
import * as fs from 'fs';
import * as path from 'path';

function findControllers(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findControllers(fullPath));
    } else if (file.endsWith('.controller.ts')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allCatalogPerms = new Set(getAllPermissionStrings());
console.log('Total catalog permission strings:', allCatalogPerms.size);

const controllers = findControllers('E:/IDOP/backend/src/modules');

const report: Record<string, { total: number; guarded: number; public: number; permissions: string[] }> = {};
let grandTotal = 0;
let grandGuarded = 0;
let grandPublic = 0;
const unmatchedPermissions: string[] = [];

for (const c of controllers) {
  const rel = path.relative('E:/IDOP/backend/src/modules', c);
  const mod = rel.split(path.sep)[0];
  if (!report[mod]) {
    report[mod] = { total: 0, guarded: 0, public: 0, permissions: [] };
  }

  const content = fs.readFileSync(c, 'utf8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const httpMatch = line.match(/^\s*@(Get|Post|Put|Patch|Delete)\s*\((.*)\)/);
    if (httpMatch) {
      report[mod].total++;
      grandTotal++;

      // Check surrounding lines for RequirePermission or RequirePermissions
      const surrounding = lines.slice(Math.max(0, i - 4), Math.min(lines.length, i + 5)).join('\n');
      const permMatch = surrounding.match(/@RequirePermission[s]?\s*\(\s*(['"][^'"]+['"](?:\s*,\s*['"][^'"]+['"])*)\s*\)/);

      if (permMatch) {
        const rawPerms = permMatch[1].match(/['"]([^'"]+)['"]/g) || [];
        report[mod].guarded++;
        grandGuarded++;
        for (const raw of rawPerms) {
          const perm = raw.replace(/['"]/g, '');
          report[mod].permissions.push(perm);

          // Check if catalog has it
          const parts = perm.split('.');
          const hasExact = allCatalogPerms.has(perm);
          let hasFlexible = hasExact;
          if (!hasFlexible && parts.length === 4) {
            hasFlexible = allCatalogPerms.has(`${parts[0]}.${parts[2]}.${parts[3]}`) || allCatalogPerms.has(`${parts[0]}.${parts[1]}.${parts[3]}`);
          } else if (!hasFlexible && parts.length === 3) {
            hasFlexible = Array.from(allCatalogPerms).some(cp => {
              const cpParts = cp.split('.');
              return cpParts.length === 4 && cpParts[0] === parts[0] && cpParts[3] === parts[2] && (cpParts[1] === parts[1] || cpParts[2] === parts[1]);
            });
          }

          if (!hasFlexible) {
            unmatchedPermissions.push(`${rel} -> ${perm}`);
          }
        }
      } else {
        // Public endpoint
        report[mod].public++;
        grandPublic++;
      }
    }
  }
}

console.log('\n================ MODULES COVERAGE SUMMARY ================');
for (const [mod, stats] of Object.entries(report)) {
  console.log(`${mod.padEnd(25)} Total: ${String(stats.total).padEnd(4)} Guarded: ${String(stats.guarded).padEnd(4)} Public: ${stats.public}`);
}
console.log('----------------------------------------------------------');
console.log(`GRAND TOTAL: ${grandTotal} endpoints | Guarded: ${grandGuarded} | Public: ${grandPublic}`);
console.log(`Unmatched permissions count: ${unmatchedPermissions.length}`);
if (unmatchedPermissions.length > 0) {
  console.log('Unmatched:', unmatchedPermissions);
}
