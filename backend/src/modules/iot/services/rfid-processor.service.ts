// M20: IoT & Device Integration — RFID Processor Service
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { RfidTapDto } from '../dto/create-dtos';
import type { RfidProcessResult, CardInfoDto } from '../dto/enums';
import { IotGatewayService } from './iot-gateway.service';

@Injectable()
export class RfidProcessorService {
  private readonly logger = new Logger(RfidProcessorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
    private readonly gateway: IotGatewayService,
  ) {}

  async processTap(dto: RfidTapDto): Promise<RfidProcessResult> {
    // Save reading
    const reading = await this.prisma.deviceReading.create({
      data: {
        deviceId: dto.deviceId,
        zoneId: dto.zoneId,
        type: 'RFID_TAP',
        payload: { cardNumber: dto.cardNumber, protocol: dto.protocol, signalStrength: dto.signalStrength },
      },
    });

    // Look up employee by card number (cached)
    const cacheKey = `iot:rfid:${dto.cardNumber}:${dto.zoneId}`;
    let empData: { id: string; firstNameFa: string; lastNameFa: string; companyId: string } | null = null;
    const cached = await this.redis.get(cacheKey);
    if (cached) empData = JSON.parse(cached);

    if (!empData) {
      const companies = await this.prisma.company.findMany({ where: { zoneId: dto.zoneId } });
      const companyIds = companies.map((c) => c.id);
      const emp = await this.prisma.employee.findFirst({ where: { rfidCardNumber: dto.cardNumber, companyId: { in: companyIds } } });
      if (emp) {
        empData = { id: emp.id, firstNameFa: emp.firstNameFa, lastNameFa: emp.lastNameFa, companyId: emp.companyId };
        await this.redis.set(cacheKey, JSON.stringify(empData), 300);
      }
    }

    let action: RfidProcessResult['action'] = 'UNKNOWN_CARD';
    let employeeId: string | null = null;
    let employeeName: string | null = null;
    let companyId: string | undefined;

    if (empData) {
      employeeId = empData.id;
      employeeName = `${empData.firstNameFa} ${empData.lastNameFa}`;
      companyId = empData.companyId;
      action = 'CLOCK_IN';

      this.gateway.emitRfidEmployeeIn(companyId || '', { employeeId, employeeName, clockIn: new Date(), gateId: dto.deviceId });
    } else {
      this.gateway.emitRfidUnknownCard(dto.deviceId, { cardNumber: dto.cardNumber, deviceId: dto.deviceId, timestamp: dto.timestamp });
    }

    // Mark as processed
    await this.prisma.deviceReading.update({ where: { id: reading.id }, data: { isProcessed: true, processingResult: { action, employeeId, employeeName } } });

    return { readingId: reading.id, cardNumber: dto.cardNumber, employeeId, employeeName, action, companyId };
  }

  async registerCard(employeeId: string, cardNumber: string, registeredBy: string): Promise<void> {
    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId } });
    if (!employee) return;
    await this.prisma.employee.update({ where: { id: employeeId }, data: { rfidCardNumber: cardNumber } });
  }

  async deregisterCard(cardNumber: string, deregisteredBy: string): Promise<void> {
    const employee = await this.prisma.employee.findFirst({ where: { rfidCardNumber: cardNumber } });
    if (employee) {
      await this.prisma.employee.update({ where: { id: employee.id }, data: { rfidCardNumber: null } });
    }
  }

  async getCardInfo(cardNumber: string, zoneId: string): Promise<CardInfoDto> {
    const companies = await this.prisma.company.findMany({ where: { zoneId } });
    const companyIds = companies.map((c) => c.id);
    const employee = await this.prisma.employee.findFirst({ where: { rfidCardNumber: cardNumber, companyId: { in: companyIds } } });
    if (employee) {
      return { type: 'EMPLOYEE', employee: { id: employee.id, name: `${employee.firstNameFa} ${employee.lastNameFa}`, companyId: employee.companyId }, isValid: true };
    }
    return { type: 'UNKNOWN', isValid: false };
  }
}
