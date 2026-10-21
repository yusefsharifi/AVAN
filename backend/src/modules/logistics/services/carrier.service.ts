import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { AuditService } from '../../../common/services/audit.service';
import { CreateCarrierDto } from '../dto/create-carrier.dto';
import { UpdateCarrierDto } from '../dto/update-carrier.dto';

@Injectable()
export class CarrierService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(zoneId: string, dto: CreateCarrierDto, createdBy: string): Promise<any> {
    // Check for duplicate license number
    if (dto.licenseNumber) {
      const existing = await this.prisma.carrier.findFirst({
        where: { zoneId, licenseNumber: dto.licenseNumber },
      });
      if (existing) {
        throw new AppException('BLACKLIST_ENTRY_EXISTS'); // Reuse code
      }
    }

    const carrier = await this.prisma.carrier.create({
      data: {
        zoneId,
        name: dto.name,
        nationalId: dto.nationalId,
        licenseNumber: dto.licenseNumber,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        rating: dto.rating ?? 5,
      },
    });

    await this.audit.log({
      zoneId,
      userId: createdBy,
      targetId: carrier.id,
      targetType: 'Carrier',
      action: 'CARRIER_BLACKLISTED', // Reuse for creation
      metadata: { name: dto.name },
    });

    return carrier;
  }

  async findAll(zoneId: string): Promise<any[]> {
    return this.prisma.carrier.findMany({
      where: { zoneId },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string): Promise<any> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id } });
    if (!carrier) throw new AppException('CARRIER_NOT_FOUND');
    return carrier;
  }

  async update(id: string, dto: UpdateCarrierDto): Promise<any> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id } });
    if (!carrier) throw new AppException('CARRIER_NOT_FOUND');

    return this.prisma.carrier.update({ where: { id }, data: dto });
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<any> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id } });
    if (!carrier) throw new AppException('CARRIER_NOT_FOUND');

    const updated = await this.prisma.carrier.update({
      where: { id },
      data: { isBlacklisted: true, blacklistReason: reason },
    });

    await this.audit.log({
      zoneId: carrier.zoneId,
      userId: blacklistedBy,
      targetId: id,
      targetType: 'Carrier',
      action: 'CARRIER_BLACKLISTED',
      metadata: { reason },
    });

    return updated;
  }

  async unblacklist(id: string, unblacklistedBy: string): Promise<any> {
    const carrier = await this.prisma.carrier.findUnique({ where: { id } });
    if (!carrier) throw new AppException('CARRIER_NOT_FOUND');

    const updated = await this.prisma.carrier.update({
      where: { id },
      data: { isBlacklisted: false, blacklistReason: null },
    });

    await this.audit.log({
      zoneId: carrier.zoneId,
      userId: unblacklistedBy,
      targetId: id,
      targetType: 'Carrier',
      action: 'CARRIER_UNBLACKLISTED',
    });

    return updated;
  }
}
