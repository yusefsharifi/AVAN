import { ZoneGuard } from './zone.guard';
import { BadRequestException } from '@nestjs/common';

function buildGuard() {
  const prisma = {
    zone: { findUnique: jest.fn() },
  };
  const audit = { log: jest.fn() };
  const guard = new ZoneGuard(prisma as any, audit as any);
  return { guard, prisma, audit };
}

function user(overrides: Partial<{ sub: string; role: string; zoneId: string | null }> = {}) {
  return { sub: 'admin-1', role: 'SUPER_ADMIN', zoneId: null, ...overrides };
}

function makeRequest(overrides: Record<string, unknown>) {
  return { user: user(), query: {}, body: {}, params: {}, ...overrides } as any;
}

function ctx(req: any) {
  return { switchToHttp: () => ({ getRequest: () => req }) } as any;
}

describe('ZoneGuard — SUPER_ADMIN explicit scope (SEC-022)', () => {
  it('ignores request.params.id: hitting a company route must NOT set request.zoneId', async () => {
    const { guard } = buildGuard();
    const req = makeRequest({ params: { id: 'a-company-id' } });

    const result = await guard.canActivate(ctx(req));

    expect(result).toBe(true);
    expect(req.zoneId).toBeUndefined();
  });

  it('sets request.zoneId from a valid query.zoneId and audits the selection', async () => {
    const { guard, prisma, audit } = buildGuard();
    prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', deletedAt: null });
    const req = makeRequest({ query: { zoneId: 'zone-1' } });

    const result = await guard.canActivate(ctx(req));

    expect(result).toBe(true);
    expect(req.zoneId).toBe('zone-1');
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_SCOPE_SELECTED',
        metadata: { zoneId: 'zone-1' },
      }),
    );
  });

  it('rejects an unknown / soft-deleted query.zoneId with 400', async () => {
    const { guard, prisma } = buildGuard();
    prisma.zone.findUnique
      .mockResolvedValueOnce(null) // unknown
      .mockResolvedValueOnce({ id: 'zone-1', deletedAt: new Date() }); // deleted

    await expect(
      guard.canActivate(ctx(makeRequest({ query: { zoneId: 'zone-x' } }))),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      guard.canActivate(ctx(makeRequest({ query: { zoneId: 'zone-1' } }))),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts body.zoneId for data-driven actions and validates it', async () => {
    const { guard, prisma } = buildGuard();
    prisma.zone.findUnique.mockResolvedValue({ id: 'zone-2', deletedAt: null });
    const req = makeRequest({ body: { zoneId: 'zone-2', name: 'New Gate' } });

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.zoneId).toBe('zone-2');
  });

  it('without explicit zoneId keeps global access (zoneId undefined)', async () => {
    const { guard } = buildGuard();
    const req = makeRequest({});

    await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
    expect(req.zoneId).toBeUndefined();
  });

  describe('non-super-admin users', () => {
    it('derives the zone from the server-side user record', async () => {
      const { guard, prisma } = buildGuard();
      prisma.zone.findUnique.mockResolvedValue({ id: 'zone-1', deletedAt: null });
      const req: any = { user: user({ role: 'ZONE_MANAGER', zoneId: 'zone-1' }), query: {}, params: {} };

      await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
      expect(req.zoneId).toBe('zone-1');
    });

    it('rejects zone users without a zoneId', async () => {
      const { guard } = buildGuard();
      const req: any = { user: user({ role: 'COMPANY_MANAGER', zoneId: null }) };

      await expect(guard.canActivate(ctx(req))).rejects.toThrow();
    });

    it('lets a GUARD through without a zoneId — scope is the GuardScopeGuard job (SEC-025)', async () => {
      const { guard, prisma } = buildGuard();
      const req: any = { user: user({ role: 'GUARD', zoneId: null }), query: {}, body: {}, params: {} };

      await expect(guard.canActivate(ctx(req))).resolves.toBe(true);
      expect(prisma.zone.findUnique).not.toHaveBeenCalled();
      expect(req.zoneId).toBeUndefined(); // GuardScopeGuard sets it later
    });
  });
});
