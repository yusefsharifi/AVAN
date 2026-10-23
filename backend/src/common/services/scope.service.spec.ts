import { ScopeService } from './scope.service';

function buildService() {
  const prisma = { company: { findUnique: jest.fn() } };
  return { service: new ScopeService(prisma as any), prisma };
}

describe('ScopeService (SEC-024)', () => {
  describe('resolveZoneScope', () => {
    it('returns the explicit zoneId for a SUPER_ADMIN only when one was selected', async () => {
      const { service } = buildService();

      expect(await service.resolveZoneScope({ role: 'SUPER_ADMIN' })).toBeNull();
      expect(
        await service.resolveZoneScope({ role: 'SUPER_ADMIN', zoneId: 'zone-1' }),
      ).toBe('zone-1');
    });

    it('returns the zone of a zone-level user', async () => {
      const { service } = buildService();

      expect(
        await service.resolveZoneScope({ role: 'ZONE_MANAGER', zoneId: 'zone-7' }),
      ).toBe('zone-7');
    });

    it('derives the zone of a company user from the company relation — never from client input', async () => {
      const { service, prisma } = buildService();
      prisma.company.findUnique.mockResolvedValue({ zoneId: 'zone-5', deletedAt: null });

      const zone = await service.resolveZoneScope({
        role: 'COMPANY_MANAGER',
        companyId: 'comp-1',
      });

      expect(zone).toBe('zone-5');
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: 'comp-1' },
        select: { zoneId: true, deletedAt: true },
      });
    });

    it('returns null for an inactive company', async () => {
      const { service, prisma } = buildService();
      prisma.company.findUnique.mockResolvedValue({ zoneId: 'zone-5', deletedAt: new Date() });

      expect(
        await service.resolveZoneScope({ role: 'COMPANY_STAFF', companyId: 'comp-9' }),
      ).toBeNull();
    });
  });

  describe('resolveCompanyScope', () => {
    it('keeps supervisors company-wide unless a company was explicitly selected', async () => {
      const { service } = buildService();
      for (const role of ['SUPER_ADMIN', 'ZONE_MANAGER', 'ZONE_OPERATOR']) {
        expect(await service.resolveCompanyScope({ role })).toBeNull();
        expect(
          await service.resolveCompanyScope({ role, companyId: 'comp-1' }),
        ).toBe('comp-1');
      }
    });

    it('always narrows company-level users to their own company', async () => {
      const { service } = buildService();

      expect(
        await service.resolveCompanyScope({
          role: 'COMPANY_STAFF',
          companyId: 'comp-1',
        }),
      ).toBe('comp-1');
      expect(await service.resolveCompanyScope({ role: 'COMPANY_STAFF' })).toBeNull();
    });
  });
});
