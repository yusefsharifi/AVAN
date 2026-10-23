import { CompanyGuard } from './company.guard';
import { ForbiddenException, BadRequestException } from '@nestjs/common';

function buildGuard() {
  const prisma = { company: { findUnique: jest.fn() } };
  const guard = new CompanyGuard(prisma as any);
  return { guard, prisma };
}

const SUPER_ROLES = ['SUPER_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR'];

function makeRequest(overrides: Record<string, unknown>, role = 'ZR') {
  return {
    user: { sub: 'user-1', role, zoneId: 'zone-1', companyId: null },
    params: {},
    body: {},
    ...overrides,
  } as any;
}

function ctx(req: any) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('CompanyGuard — supervisor roles (SEC-023)', () => {
  it.each(SUPER_ROLES)('sets request.companyId from an explicit params.companyId (%s)', async (role) => {
    const { guard, prisma } = buildGuard();
    prisma.company.findUnique.mockResolvedValue({ id: 'comp-2', deletedAt: null });
    const req = makeRequest({ params: { companyId: 'comp-2' } }, role);

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.companyId).toBe('comp-2');
  });

  it.each(SUPER_ROLES)('keeps request.companyId undefined when nothing is selected (%s)', async (role) => {
    const { guard } = buildGuard();
    const req = makeRequest({}, role);

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.companyId).toBeUndefined();
  });

  it('rejects an explicit unknown company with 400', async () => {
    const { guard, prisma } = buildGuard();
    prisma.company.findUnique.mockResolvedValue(null);

    await expect(
      guard.canActivate(
        ctx(makeRequest({ params: { companyId: 'comp-x' }, body: { name: 'x' } }, 'ZONE_MANAGER')),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('CompanyGuard — company-level roles (SEC-009)', () => {
  it('allows same-company explicit target and pins request.companyId', async () => {
    const { guard } = buildGuard();
    const req = makeRequest(
      { params: { companyId: 'comp-1' } },
      'COMPANY_ADMIN',
    );
    req.user.companyId = 'comp-1';

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.companyId).toBe('comp-1');
  });

  it('rejects a foreign company with 403 (IDOR via companyId)', async () => {
    const { guard } = buildGuard();
    const req = makeRequest(
      { body: { companyId: 'comp-other' } },
      'COMPANY_STAFF',
    );
    req.user.companyId = 'comp-1';

    await expect(guard.canActivate(ctx(req))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('never treats params.id as a companyId', async () => {
    const { guard } = buildGuard();
    const req = makeRequest({ params: { id: 'comp-other' } }, 'COMPANY_STAFF');
    req.user.companyId = 'comp-1';

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.companyId).toBe('comp-1');
  });
});
