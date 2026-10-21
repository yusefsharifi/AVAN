const fs = require('fs');

// Fix error-codes.ts - remove duplicate
let ec = fs.readFileSync('src/common/constants/error-codes.ts', 'utf-8');
ec = ec.replace("  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 },\n  // M21:", "  CALIBRATION_OVERDUE: { code: 'CALIBRATION_OVERDUE', message: 'کالیبراسیون دیر شده است', httpStatus: 400 },\n  // M21:");
// Check for duplicate keys
const lines = ec.split('\n');
const seen = new Set();
const dedupedLines = [];
for (const line of lines) {
  const match = line.match(/^\s+(\w+):/);
  if (match) {
    if (seen.has(match[1])) continue; // skip duplicate
    seen.add(match[1]);
  }
  dedupedLines.push(line);
}
ec = dedupedLines.join('\n');
fs.writeFileSync('src/common/constants/error-codes.ts', ec, 'utf-8');

// Fix create-dtos.ts - IsUUID({ each: true }) -> IsString({ each: true })
let dtos = fs.readFileSync('src/modules/super-admin/dto/create-dtos.ts', 'utf-8');
dtos = dtos.replace("@IsUUID({ each: true })", "@IsString({ each: true })");
fs.writeFileSync('src/modules/super-admin/dto/create-dtos.ts', dtos, 'utf-8');

// Fix audit-compliance.service.ts - null -> undefined
let audit = fs.readFileSync('src/modules/super-admin/services/audit-compliance.service.ts', 'utf-8');
audit = audit.replace("entityId, null, metadata", "entityId, undefined, metadata");
audit = audit.replace("entityId, null, { module", "entityId, undefined, { module");
fs.writeFileSync('src/modules/super-admin/services/audit-compliance.service.ts', audit, 'utf-8');

// Fix feature-flag.service.ts - null -> undefined
let ff = fs.readFileSync('src/modules/super-admin/services/feature-flag.service.ts', 'utf-8');
ff = ff.replace("zoneId: dto.zoneId || null, companyId: dto.companyId || null", "zoneId: dto.zoneId || undefined, companyId: dto.companyId || undefined");
fs.writeFileSync('src/modules/super-admin/services/feature-flag.service.ts', ff, 'utf-8');

// Fix global-user-management.service.ts - null -> undefined
let gum = fs.readFileSync('src/modules/super-admin/services/global-user-management.service.ts', 'utf-8');
gum = gum.replace("adminId, null, null", "adminId, undefined, undefined");
gum = gum.replace("sessionId)", "sessionId)");
gum = gum.replace("null, 'Session', sessionId", "undefined, 'Session', sessionId");
fs.writeFileSync('src/modules/super-admin/services/global-user-management.service.ts', gum, 'utf-8');

// Fix subscription.service.ts - BigInt -> number issue
let sub = fs.readFileSync('src/modules/super-admin/services/subscription.service.ts', 'utf-8');
sub = sub.replace("amount: sub.plan.price,", "amount: Number(sub.plan.price),");
fs.writeFileSync('src/modules/super-admin/services/subscription.service.ts', sub, 'utf-8');

// Fix system-config.service.ts - null -> undefined
let cfg = fs.readFileSync('src/modules/super-admin/services/system-config.service.ts', 'utf-8');
cfg = cfg.replace("dto.description, category: dto.key.split('_')[0], updatedBy }", "dto.description || undefined, category: dto.key.split('_')[0], updatedBy }");
fs.writeFileSync('src/modules/super-admin/services/system-config.service.ts', cfg, 'utf-8');

// Fix zone-management.service.ts - subscription null issue and notification
let zm = fs.readFileSync('src/modules/super-admin/services/zone-management.service.ts', 'utf-8');
zm = zm.replace("let subscription = null;\n    if (plan) {", "let subscription: any = null;\n    if (plan) {");
zm = zm.replace("await this.prisma.notification.create({\n        data: { zoneId, userId: '', title:", "await this.prisma.notification.create({\n        data: { zoneId, title:");
fs.writeFileSync('src/modules/super-admin/services/zone-management.service.ts', zm, 'utf-8');

console.log('M21 errors fixed');
