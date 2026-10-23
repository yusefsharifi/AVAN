import { GuardScopeGuard } from './guard-scope.guard';
import { ForbiddenException } from '@nestjs/common';

function buildGuard() {
  const prisma = { guardAssignment: { findFirst: jest.fn() } };
  const guard = new GuardScopeGuard(prisma as any);
  return { guard, prisma };
}

function ctx(user: Record<string, unknown>) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as any;
}

describe('GuardScopeGuard (SEC-025)', () => {
  it('rejects a GUARD without any active assignment with 403', async () => {
    const { guard, prisma } = buildGuard();
    prisma.guardAssignment.findFirst.mockResolvedValue(null);

    await expect(
      guard.canActivate(ctx({ sub: 'guard-1', role: 'GUARD' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a GUARD whose assignment window has expired', async () => {
    const { guard, prisma } = buildGuard();
    prisma.guardAssignment.findFirst.mockResolvedValue(null); // validTo <= now → filtered out

    await expect(
      guard.canActivate(ctx({ sub: 'guard-1', role: 'GUARD' })),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attaches request.guardScope for a GUARD with an active assignment', async () => {
    const { guard, prisma } = buildGuard();
    prisma.guardAssignment.findFirst.mockResolvedValue({ zoneId: 'zone-1', gateId: 'gate-X' });
    const request: any = { user: { sub: 'guard-1', role: 'GUARD' } };

    await expect(
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => request }),
      } as any),
    ).resolves.toBe(true);

    expect(request.guardScope).toEqual({ zoneId: 'zone-1', gateId: 'gate-X' });
  });

  it('queries only active assignments with a valid time window', async () => {
    const { guard, prisma } = buildGuard();
    prisma.guardAssignment.findFirst.mockResolvedValue({ zoneId: 'zone-1', gateId: null });

    await guard.canActivate(ctx({ sub: 'guard-1', role: 'GUARD' }));

    expect(prisma.guardAssignment.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          guardId: 'guard-1',
          isActive: true,
        }),
      }),
    );
  });

  it('does not apply to non-GUARD roles (they are governed by the other guards)', async () => {
    const { guard, prisma } = buildGuard();

    await expect(
      guard.canActivate(ctx({ sub: 'staff-1', role: 'COMPANY_STAFF' })),
    ).resolves.toBe(true);
    expect(prisma.guardAssignment.findFirst).not.toHaveBeenCalled();
  });

  it('also mirrors the assignment zone onto request.zoneId', async () => {
    const { guard, prisma } = buildGuard();
    prisma.guardAssignment.findFirst.mockResolvedValue({ zoneId: 'zone-9', gateId: 'gate-9' });
    const request: any = { user: { sub: 'guard-1', role: 'GUARD' } };

    await guard.canActivate({ switchToHttp: () => ({ getRequest: () => request }) } as any);

    expect(request.zoneId).toBe('zone-9');
  });
});
