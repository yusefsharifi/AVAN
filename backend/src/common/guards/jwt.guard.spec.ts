import { JwtGuard, JwtPayload } from './jwt.guard';
import { UnauthorizedException } from '@nestjs/common';

const userDbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'user-1',
  status: 'ACTIVE',
  role: 'COMPANY_STAFF',
  zoneId: 'zone-1' as string | null,
  companyId: null,
  deletedAt: null,
  ...overrides,
});

function buildGuard() {
  const jwtVerify = jest.fn();
  const guard = new JwtGuard(
    { verify: jwtVerify } as any,
    { get: jest.fn().mockReturnValue('secret') } as any,
    {
      exists: jest.fn().mockResolvedValue(0),
      set: jest.fn(),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    } as any,
    {} as any,
  );
  return { guard, jwtVerify };
}

function request(token = 'valid-token') {
  return {
    headers: { authorization: `Bearer ${token}` },
  } as any;
}

function context(req: any) {
  return {
    switchToHttp: () => ({ getRequest: () => req, getResponse: () => undefined }),
  } as any;
}

describe('JwtGuard — user state validation (SEC-020)', () => {
  const prismaUserFindUnique = jest.fn();

  function buildGuardWithPrisma() {
    const { guard, jwtVerify } = buildGuard();
    (guard as any).prisma = {
      user: { findUnique: prismaUserFindUnique },
    };
    return { guard, jwtVerify };
  }

  it('rejects a valid token for a user who was later BANNED (401)', async () => {
    const { guard, jwtVerify } = buildGuardWithPrisma();
    prismaUserFindUnique.mockResolvedValue(userDbRow({ status: 'BANNED' }));
    const payload: Partial<JwtPayload> = { sub: 'user-1', jti: 'j-1', type: 'access' };
    jwtVerify.mockReturnValue(payload);

    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a valid token for a soft-deleted user (401)', async () => {
    const { guard, jwtVerify } = buildGuardWithPrisma();
    prismaUserFindUnique.mockResolvedValue(userDbRow({ deletedAt: new Date() }));
    jwtVerify.mockReturnValue({ sub: 'user-1', jti: 'j-2', type: 'access' });

    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects a stale token whose role no longer matches the DB — and blacklists its jti', async () => {
    const { guard, jwtVerify } = buildGuardWithPrisma();
    prismaUserFindUnique.mockResolvedValue(userDbRow({ role: 'ZONE_OPERATOR' }));
    jwtVerify.mockReturnValue({
      sub: 'user-1',
      role: 'COMPANY_STAFF', // old role in the token
      zoneId: 'zone-1',
      companyId: null,
      type: 'access',
      jti: 'jti-stale',
    });

    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(guard['redis'].set).toHaveBeenCalledWith(
      'auth:blacklist:jti-stale',
      'stale-token',
      expect.any(Number),
    );
  });

  it('attaches the DB-derived identity to request.user for an active matching user', async () => {
    const { guard, jwtVerify } = buildGuardWithPrisma();
    prismaUserFindUnique.mockResolvedValue(userDbRow());
    jwtVerify.mockReturnValue({
      sub: 'user-1',
      role: 'COMPANY_STAFF',
      zoneId: 'zone-1',
      companyId: null,
      type: 'access',
      jti: 'j-3',
      iat: 1,
      exp: 2,
    });

    const req: any = request();
    const result = await guard.canActivate(context(req));

    expect(result).toBe(true);
    expect(req.user.role).toBe('COMPANY_STAFF');
    expect(req.user.zoneId).toBe('zone-1');
    expect(req.user.jti).toBe('j-3');
    // fresh DB read was cached
    expect(guard['redis'].setJson).toHaveBeenCalledWith(
      'user:profile:user-1:auth',
      expect.objectContaining({ status: 'ACTIVE', role: 'COMPANY_STAFF' }),
      expect.any(Number),
    );
  });

  it('serves the user state from the 45s Redis cache without hitting Prisma', async () => {
    const redis = {
      exists: jest.fn().mockResolvedValue(0),
      set: jest.fn(),
      getJson: jest.fn().mockResolvedValue({
        status: 'ACTIVE',
        role: 'COMPANY_STAFF',
        zoneId: 'zone-1',
        companyId: null,
        deletedAt: null,
      }),
      setJson: jest.fn(),
    };
    const guard = new JwtGuard(
      { verify: jest.fn().mockReturnValue({ sub: 'user-1', role: 'COMPANY_STAFF', zoneId: 'zone-1', type: 'access', jti: 'j-4' }) } as any,
      { get: jest.fn().mockReturnValue('secret') } as any,
      redis as any,
      { user: { findUnique: jest.fn() } } as any,
    );

    const req: any = request();
    await expect(guard.canActivate(context(req))).resolves.toBe(true);
    expect((guard as any).prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('blacklists a token presented after logout (jti in Redis blacklist)', async () => {
    const redis = {
      exists: jest.fn().mockResolvedValue(1),
      set: jest.fn(),
      getJson: jest.fn().mockResolvedValue(null),
      setJson: jest.fn(),
    };
    const guard = new JwtGuard(
      { verify: jest.fn().mockReturnValue({ sub: 'user-1', type: 'access', jti: 'j-5' }) } as any,
      { get: jest.fn().mockReturnValue('secret') } as any,
      redis as any,
      { user: { findUnique: jest.fn() } } as any,
    );

    await expect(guard.canActivate(context(request()))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
