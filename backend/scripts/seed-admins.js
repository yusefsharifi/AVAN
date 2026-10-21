/**
 * Seeds the initial zone / company / admin users.
 *
 * NOTE: `seed-admins.js` at the repo root is a Linux `cat >` heredoc from the
 * original provisioning history — it is kept untouched (constraint 4). This
 * script is the cross-platform, runnable equivalent and is idempotent.
 *
 * Usage:  node scripts/seed-admins.js
 * Env:    DATABASE_URL, ADMIN_PASSWORD (default Avan@1404)
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const password = process.env.ADMIN_PASSWORD || 'Avan@1404';
  const hash = await bcrypt.hash(password, 10);

  let zone = await prisma.zone.findFirst();
  if (!zone) {
    zone = await prisma.zone.create({
      data: {
        code: 'Z001',
        nameFa: 'شهرک صنعتی آوان',
        province: 'تهران',
        city: 'تهران',
      },
    });
    console.log('Zone created:', zone.nameFa);
  }

  let company = await prisma.company.findFirst();
  if (!company) {
    company = await prisma.company.create({
      data: {
        zoneId: zone.id,
        registrationNumber: 'REG-001',
        nationalId: '10100100010',
        nameFa: 'شرکت نمونه آوان',
        type: 'MANUFACTURING',
        industryCategory: 'سایر',
        ceoName: 'مدیر نمونه',
        ceoNationalId: '2064951024',
        ceoPhone: '09120134456',
        lifecycleStatus: 'ACTIVE',
        isActive: true,
      },
    });
    console.log('Company created:', company.nameFa);
  }

  const users = [
    { email: 'super@avan.local', phone: '09120134456', firstName: 'مدیر', lastName: 'ارشد', role: 'SUPER_ADMIN', zoneId: null, companyId: null },
    { email: 'zone@avan.local', phone: '09120000002', firstName: 'مدیر', lastName: 'شهرک', role: 'ZONE_MANAGER', zoneId: zone.id, companyId: null },
    { email: 'company@avan.local', phone: '09354121335', firstName: 'مدیر', lastName: 'شرکت', role: 'COMPANY_ADMIN', zoneId: zone.id, companyId: company.id },
    { email: 'guard@avan.local', phone: '09120000004', firstName: 'نگهبان', lastName: 'حراست', role: 'GUARD', zoneId: zone.id, companyId: null },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { passwordHash: hash, status: 'ACTIVE', role: u.role },
      create: { ...u, passwordHash: hash, status: 'ACTIVE' },
    });
    console.log('OK:', u.email, '→', u.role);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
