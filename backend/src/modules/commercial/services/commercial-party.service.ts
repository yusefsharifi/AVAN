import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateCommercialPartyDto } from '../dto/create-dtos';
import { checkCreditLimit } from '../utils/commercial.utils';
import { CommercialGatewayService } from './commercial-gateway.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class CommercialPartyService {
  private readonly logger = new Logger(CommercialPartyService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: CommercialGatewayService,
  ) {}

  async create(dto: CreateCommercialPartyDto, createdBy: string): Promise<any> {
    // Check code uniqueness within zone
    const existing = await this.prisma.commercialParty.findFirst({
      where: { zoneId: dto.zoneId, code: dto.code },
    });

    if (existing) {
      throw new AppException('PARTY_CODE_DUPLICATE');
    }

    const party = await this.prisma.commercialParty.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        code: dto.code,
        name: dto.name,
        type: dto.type as any,
        nationalId: dto.nationalId,
        taxId: dto.taxId,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        creditLimit: BigInt(dto.creditLimit || 0),
      },
    });

    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: party.id,
      targetType: 'CommercialParty',
      action: 'PARTY_CREATED',
      metadata: { code: dto.code, name: dto.name, type: dto.type },
    });

    return party;
  }

  async update(id: string, dto: Partial<CreateCommercialPartyDto>): Promise<any> {
    await this.findById(id);

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.phone) updateData.phone = dto.phone;
    if (dto.email) updateData.email = dto.email;
    if (dto.address) updateData.address = dto.address;
    if (dto.nationalId) updateData.nationalId = dto.nationalId;
    if (dto.taxId) updateData.taxId = dto.taxId;

    const updated = await this.prisma.commercialParty.update({
      where: { id },
      data: updateData,
    });

    await this.audit.log({
      zoneId: updated.zoneId,
      targetId: id,
      targetType: 'CommercialParty',
      action: 'PARTY_UPDATED',
      metadata: { name: updated.name },
    });

    return updated;
  }

  async findAll(zoneId: string, filter?: any): Promise<any> {
    const where: any = { zoneId };

    if (filter?.type) where.type = filter.type;
    if (filter?.status) where.status = filter.status;

    const limit = filter?.limit || 50;

    const data = await this.prisma.commercialParty.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return data;
  }

  async findById(id: string): Promise<any> {
    const party = await this.prisma.commercialParty.findUnique({ where: { id } });

    if (!party) {
      throw new AppException('PARTY_NOT_FOUND');
    }

    return party;
  }

  async updateCreditUsed(partyId: string, amount: number, operation: 'add' | 'subtract'): Promise<any> {
    const party = await this.findById(partyId);

    const newUsed = operation === 'add'
      ? Number(party.creditUsed) + amount
      : Number(party.creditUsed) - amount;

    const updated = await this.prisma.commercialParty.update({
      where: { id: partyId },
      data: { creditUsed: BigInt(Math.max(0, newUsed)) },
    });

    // Check credit warning
    const creditCheck = checkCreditLimit(
      Number(updated.creditLimit),
      Number(updated.creditUsed),
      0,
    );

    if (creditCheck.warning && party.companyId) {
      this.gateway.emitCreditLimitWarning({
        companyId: party.companyId,
        partyId,
        partyName: updated.name,
        utilizationPercent: creditCheck.utilizationPercent,
        available: creditCheck.available,
      });
    }

    return updated;
  }

  async checkCreditLimit(partyId: string, newAmount: number): Promise<any> {
    const party = await this.findById(partyId);

    return checkCreditLimit(
      Number(party.creditLimit),
      Number(party.creditUsed),
      newAmount,
    );
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<any> {
    const party = await this.findById(id);

    const updated = await this.prisma.commercialParty.update({
      where: { id },
      data: {
        status: 'BLACKLISTED',
        blacklistReason: reason,
        blacklistedAt: new Date(),
      },
    });

    await this.audit.log({
      zoneId: party.zoneId,
      userId: blacklistedBy,
      targetId: id,
      targetType: 'CommercialParty',
      action: 'PARTY_BLACKLISTED',
      metadata: { partyName: party.name, reason },
    });

    return updated;
  }

  async unblacklist(id: string, unblacklistedBy: string): Promise<any> {
    await this.findById(id);

    const updated = await this.prisma.commercialParty.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        blacklistReason: null,
        blacklistedAt: null,
      },
    });

    return updated;
  }

  async updateCreditLimit(id: string, newLimit: number, updatedBy: string): Promise<any> {
    const party = await this.findById(id);

    const updated = await this.prisma.commercialParty.update({
      where: { id },
      data: { creditLimit: BigInt(newLimit) },
    });

    await this.audit.log({
      zoneId: party.zoneId,
      userId: updatedBy,
      targetId: id,
      targetType: 'CommercialParty',
      action: 'PARTY_CREDIT_UPDATED',
      metadata: { partyName: party.name, newLimit },
    });

    return updated;
  }

  async getPartyProfile(id: string, zoneId: string): Promise<any> {
    const party = await this.findById(id);

    const [proformas, orders, contracts, collectionCases] = await Promise.all([
      this.prisma.proforma.findMany({
        where: { zoneId, partyId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.commercialOrder.findMany({
        where: { zoneId, partyId: id, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.commercialContract.findMany({
        where: { zoneId, partyId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.collectionCase.findMany({
        where: { zoneId, partyId: id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const totalPurchased = orders
      .filter((o) => o.direction === 'PURCHASE')
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    const totalSold = orders
      .filter((o) => o.direction === 'SALES')
      .reduce((sum, o) => sum + Number(o.grandTotal), 0);

    const totalOutstanding = collectionCases.reduce(
      (sum, c) => sum + Number(c.remainingAmount),
      0,
    );

    return {
      party,
      proformas,
      orders,
      contracts,
      collectionCases,
      totalPurchased,
      totalSold,
      totalOutstanding,
      creditUtilization: Number(party.creditLimit) > 0
        ? Math.round((Number(party.creditUsed) / Number(party.creditLimit)) * 100)
        : 0,
    };
  }

  async getRanking(zoneId: string, type?: string): Promise<any[]> {
    const where: any = { zoneId, status: 'ACTIVE' };
    if (type) where.type = type;

    const parties = await this.prisma.commercialParty.findMany({ where });

    const rankings = await Promise.all(
      parties.map(async (party) => {
        const orderCount = await this.prisma.commercialOrder.count({
          where: { zoneId, partyId: party.id, deletedAt: null },
        });

        const totalVolume = await this.prisma.commercialOrder.aggregate({
          where: { zoneId, partyId: party.id, deletedAt: null },
          _sum: { grandTotal: true },
        });

        return {
          partyId: party.id,
          partyName: party.name,
          partyType: party.type,
          totalVolume: Number(totalVolume._sum.grandTotal || 0),
          transactionCount: orderCount,
          rating: party.rating,
        };
      }),
    );

    return rankings.sort((a, b) => b.totalVolume - a.totalVolume);
  }
}
