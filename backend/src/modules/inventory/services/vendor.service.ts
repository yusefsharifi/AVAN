import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { CreateVendorDto } from '../dto/create-dtos';

@Injectable()
export class VendorService {
  private readonly logger = new Logger(VendorService.name);

  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  async create(dto: CreateVendorDto, createdBy: string): Promise<any> {
    const existing = await this.prisma.vendor.findFirst({ where: { zoneId: dto.zoneId, code: dto.code } });
    if (existing) throw new AppException('VENDOR_NOT_FOUND');
    return this.prisma.vendor.create({ data: { ...dto, isActive: true } });
  }

  async findAll(zoneId: string): Promise<any[]> {
    return this.prisma.vendor.findMany({ where: { zoneId, isActive: true }, orderBy: { nameFa: 'asc' } });
  }

  async findById(id: string): Promise<any> {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppException('VENDOR_NOT_FOUND');
    return vendor;
  }

  async update(id: string, dto: Partial<CreateVendorDto>): Promise<any> {
    const existing = await this.prisma.vendor.findUnique({ where: { id } });
    if (!existing) throw new AppException('VENDOR_NOT_FOUND');
    return this.prisma.vendor.update({ where: { id }, data: { ...dto } });
  }

  async blacklist(id: string, reason: string, blacklistedBy: string): Promise<any> {
    const vendor = await this.prisma.vendor.findUnique({ where: { id } });
    if (!vendor) throw new AppException('VENDOR_NOT_FOUND');
    return this.prisma.vendor.update({ where: { id }, data: { isBlacklisted: true, blacklistReason: reason } });
  }
}
