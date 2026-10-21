/**
 * Seeds the finance permission keys that Steps 6-7 enforced but never seeded.
 *
 * WHY THIS EXISTS
 *   `RequirePermission('finance.treasury.checks.create')` is enforced by
 *   PermissionsGuard, which resolves a user's effective permissions from
 *   RoleAssignment -> Role -> RolePermission, unioned with UserPermission rows
 *   (src/modules/permissions/permissions.service.ts). SUPER_ADMIN bypasses the
 *   guard outright, so before this script there was no way for any other role
 *   to reach these endpoints: a real ZONE_MANAGER got 403 USER_PERMISSION_DENIED.
 *
 *   `Role`, `RolePermission` and `RoleAssignment` were all empty and
 *   `UserPermission` held only two literal `*` rows, so the only accounts that
 *   could call finance were SUPER_ADMIN and those two wildcards.
 *
 * FOLLOW THE EXISTING MECHANISM - do not invent a new one:
 *   - the same `rolePermission.createMany({ data: [{ roleId, permission }] })`
 *     the roles API uses (roles.service.ts -> setRolePermissions);
 *   - the same post-write permission-cache invalidation that path performs;
 *   - the same find-then-create idempotency style as seed-admins.js.
 *
 * THE ACTION VERB IS `view`, NOT `read`.
 *   The catalog (permissions.catalog.ts, ACTIONS) and every finance controller
 *   use view/create/update/delete. Seeding a `read` key would grant a string no
 *   endpoint ever asks for and would leave the real requirement unsatisfied.
 *
 * KEYS ARE TAKEN FROM THE CONTROLLERS, NOT FROM MEMORY.
 *   e.g. the checkbook controller asks for
 *   `finance.treasury.checkbooks.create` while serving `/finance/checkbooks`.
 *   The key and the route differ deliberately; this script seeds the key.
 *
 * Usage:  node scripts/seed-permissions.js
 * Env:    DATABASE_URL  (required, via Prisma)
 *         REDIS_URL     (optional, default redis://127.0.0.1:6379)
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Exact key families the finance controllers require. `buyer-sellers` is
// included because it lives under `finance.parties.*` alongside visitors and
// was unseeded for the same reason.
const FAMILIES = {
  assets: 'finance.assets.fixed-assets',
  documents: 'finance.documents.documents',
  visitors: 'finance.parties.visitors',
  buyerSellers: 'finance.parties.buyer-sellers',
  checkbooks: 'finance.treasury.checkbooks',
  checks: 'finance.treasury.checks',
  receiptPaymentDocs: 'finance.treasury.receipt-payment-docs',
};

const ACTIONS = ['create', 'view', 'update', 'delete'];

/** Expand a family to its four `<family>.<action>` keys. */
const keysOf = (family) => ACTIONS.map((a) => `${family}.${a}`);
/** Expand several families, optionally filtered to a single action. */
const keysOfAll = (families, action) =>
  families.flatMap((f) => (action ? [`${f}.${action}`] : keysOf(f)));

const ALL_FAMILIES = Object.values(FAMILIES);

/**
 * System roles and their default grants.
 *
 *   ZONE_MANAGER  - the operator that runs a zone's finance desk, so full
 *                   access to every new family (7 families x 4 actions = 28).
 *   COMPANY_ADMIN - a company sees its own assets/documents/parties but does
 *                   not run a zone treasury, so `view` only, and only on the
 *                   assets, documents and parties families (4 keys).
 *   GUARD         - receives nothing new. Explicitly empty rather than omitted,
 *                   so the intent is recorded and a later reader cannot mistake
 *                   an omission for an oversight.
 *
 * SUPER_ADMIN needs none of this: PermissionsGuard returns true for it before
 * consulting any permission, and that bypass is deliberately untouched.
 */
const ROLES = [
  {
    name: 'ZONE_MANAGER',
    nameFa: 'مدیر شهرک',
    permissions: keysOfAll(ALL_FAMILIES),
  },
  {
    name: 'COMPANY_ADMIN',
    nameFa: 'مدیر شرکت',
    permissions: keysOfAll(
      [FAMILIES.assets, FAMILIES.documents, FAMILIES.visitors, FAMILIES.buyerSellers],
      'view',
    ),
  },
  {
    name: 'GUARD',
    nameFa: 'نگهبان حراست',
    permissions: [],
  },
];

/** Tie the users created by seed-admins.js to the matching system role. */
const ASSIGNMENTS = [
  { email: 'zone@avan.local', roleName: 'ZONE_MANAGER' },
  { email: 'company@avan.local', roleName: 'COMPANY_ADMIN' },
  { email: 'guard@avan.local', roleName: 'GUARD' },
];

/**
 * Permission resolution is cached in Redis under `user:permissions:effective:<id>`
 * for REDIS_TTL.USER_PERMISSIONS (5 min). roles.service.ts invalidates after it
 * writes permissions, so this script does the same; if Redis is not reachable it
 * degrades to "the TTL clears it" rather than failing the seed.
 */
async function invalidatePermissionCache() {
  const url = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
  let Redis;
  try {
    Redis = require('ioredis');
  } catch {
    return 'cache not invalidated: ioredis is not installed';
  }
  const redis = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
  });
  // ioredis emits 'error' even when we handle the rejected connect() ourselves;
  // with no listener that surfaces as an "Unhandled error event" stack trace on
  // an otherwise successful seed. The fallback below already reports the outage.
  redis.on('error', () => {});
  try {
    await redis.connect();
    const found = await redis.keys('user:permissions:effective:*');
    if (found.length > 0) await redis.del(...found);
    return `${found.length} cached permission list(s) invalidated`;
  } catch (err) {
    return `Redis unreachable (${String(err?.message ?? err).slice(0, 60)}) - the 5-minute TTL will clear the cache`;
  } finally {
    try {
      redis.disconnect();
    } catch {
      /* ignore */
    }
  }
}

async function countRolePermissions() {
  return prisma.rolePermission.count();
}

async function ensureRole({ name, nameFa, permissions }) {
  // Role has @@unique([name, zoneId, companyId]). PostgreSQL treats NULLs as
  // distinct inside a unique index, so `upsert` cannot be used: two GLOBAL
  // roles (zoneId/companyId both NULL) with the same name would both be
  // "the first" and an upsert would insert a duplicate. find-then-create is the
  // only reliable path, and it is the one seed-admins.js already uses for the
  // same reason.
  let role = await prisma.role.findFirst({
    where: { name, zoneId: null, companyId: null },
  });
  let created = false;
  if (!role) {
    role = await prisma.role.create({
      data: { name, nameFa, scopeType: 'GLOBAL', isSystem: true },
    });
    created = true;
  }

  // RolePermission has @@unique([roleId, permission]) with both columns
  // non-null, so skipDuplicates is a real, complete idempotency guarantee.
  const result = await prisma.rolePermission.createMany({
    data: permissions.map((permission) => ({ roleId: role.id, permission })),
    skipDuplicates: true,
  });

  return { role, created, inserted: result.count };
}

async function ensureAssignment(userId, roleId) {
  // RoleAssignment's primary key IS (userId, roleId), so upsert is exact.
  await prisma.roleAssignment.upsert({
    where: { userId_roleId: { userId, roleId } },
    update: {},
    create: { userId, roleId, assignedBy: 'seed-permissions' },
  });
}

async function main() {
  const before = await countRolePermissions();

  console.log('Finance permission seed');
  console.log(`  families: ${ALL_FAMILIES.length}  keys: ${keysOfAll(ALL_FAMILIES).length}`);
  console.log(`  RolePermission rows before: ${before}`);

  const totals = { rolesCreated: 0, keysInserted: 0, assignments: 0 };

  for (const spec of ROLES) {
    const { role, created, inserted } = await ensureRole(spec);
    totals.rolesCreated += created ? 1 : 0;
    totals.keysInserted += inserted;
    console.log(
      `  ${created ? 'CREATED' : 'reused '} role ${spec.name} (${role.id}) ` +
        `-> ${spec.permissions.length} keys, ${inserted} inserted`,
    );
  }

  for (const { email, roleName } of ASSIGNMENTS) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`  skip assignment: ${email} not found (run scripts/seed-admins.js first)`);
      continue;
    }
    const role = await prisma.role.findFirst({
      where: { name: roleName, zoneId: null, companyId: null },
    });
    if (!role) continue;
    await ensureAssignment(user.id, role.id);
    totals.assignments += 1;
    console.log(`  assigned ${email} -> ${roleName}`);
  }

  const cacheNote = await invalidatePermissionCache();
  const after = await countRolePermissions();

  console.log('');
  console.log(`  roles created:        ${totals.rolesCreated}`);
  console.log(`  keys inserted:        ${totals.keysInserted}`);
  console.log(`  assignments created:  ${totals.assignments}`);
  console.log(`  RolePermission rows after: ${after}`);
  console.log(`  cache: ${cacheNote}`);
  console.log(`RESULT: seed ok (before=${before} after=${after})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
