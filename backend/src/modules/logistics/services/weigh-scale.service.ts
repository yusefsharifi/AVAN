import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { normalizePlate } from '../../../common/utils/plate-normalizer';
import { ScaleStatus, WeighType, VehicleType } from '@prisma/client';
import { RecordWeightDto } from '../dto/record-weight.dto';
import { ScaleSensorReadingDto } from '../dto/scale-sensor.dto';
import { CreateScaleDto } from '../dto/create-scale.dto';
import { UpdateScaleDto } from '../dto/update-scale.dto';
import { FilterWeighDto } from '../dto/filter-weigh.dto';

interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; nextCursor?: string };
}

@Injectable()
export class WeighScaleService {
  private readonly logger = new Logger(WeighScaleService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────
  // SCALE MANAGEMENT
  // ─────────────────────────────────────────────────────
  async createScale(zoneId: string, dto: CreateScaleDto, createdBy: string): Promise<any> {
    const scale = await this.prisma.weighScale.create({
      data: {
        zoneId,
        code: dto.code,
        nameFa: dto.nameFa,
        capacity: dto.capacity,
        precision: dto.precision,
        gateId: dto.gateId,
        deviceId: dto.deviceId,
        isAutoCapture: dto.isAutoCapture ?? false,
      },
    });

    await this.audit.log({
      zoneId,
      userId: createdBy,
      targetId: scale.id,
      targetType: 'WeighScale',
      action: 'SCALE_CALIBRATED',
      metadata: { code: dto.code, capacity: dto.capacity },
    });

    return scale;
  }

  async updateScale(id: string, dto: UpdateScaleDto): Promise<any> {
    const scale = await this.prisma.weighScale.findUnique({ where: { id } });
    if (!scale) throw new AppException('SCALE_NOT_FOUND');

    return this.prisma.weighScale.update({
      where: { id },
      data: dto,
    });
  }

  async getScales(zoneId: string): Promise<any[]> {
    return this.prisma.weighScale.findMany({
      where: { zoneId },
      orderBy: { code: 'asc' },
    });
  }

  // ─────────────────────────────────────────────────────
  // IoT SENSOR READING
  // ─────────────────────────────────────────────────────
  async receiveSensorReading(dto: ScaleSensorReadingDto): Promise<void> {
    // 1. Find scale by deviceId
    const scale = await this.prisma.weighScale.findFirst({
      where: { deviceId: dto.deviceId, status: 'ACTIVE' },
    });
    if (!scale) {
      this.logger.warn(`Scale not found for deviceId: ${dto.deviceId}`);
      return;
    }

    // 2. Update current weight and stability
    await this.prisma.weighScale.update({
      where: { id: scale.id },
      data: {
        currentWeight: dto.weight / 1000, // Convert kg to ton
        isStable: dto.isStable,
        lastReadingAt: new Date(dto.timestamp),
      },
    });

    // 3. Cache in Redis
    const cacheKey = `scale:reading:${scale.id}`;
    await this.redis.set(
      cacheKey,
      JSON.stringify({
        weight: dto.weight / 1000,
        isStable: dto.isStable,
        confidence: dto.confidence,
        timestamp: dto.timestamp,
        isOnline: true,
      }),
      30,
    );

    // 4. Emit socket event (if Gateway available)
    // this.gateway.emitToRoom(`scale:${scale.id}`, 'scale:reading', {
    //   scaleId: scale.id,
    //   weight: dto.weight / 1000,
    //   unit: 'ton',
    //   isStable: dto.isStable,
    //   timestamp: dto.timestamp,
    // });

    // 5. Overload alert
    if (dto.isStable && dto.weight / 1000 > Number(scale.capacity)) {
      this.logger.warn(`OVERLOAD on scale ${scale.code}: ${dto.weight / 1000} ton > ${scale.capacity} ton capacity`);
      // this.gateway.emitToRoom(`zone:${scale.zoneId}`, 'scale:overload', {
      //   scaleId: scale.id,
      //   currentWeight: dto.weight / 1000,
      //   maxCapacity: Number(scale.capacity),
      // });
    }
  }

  async getCurrentReading(scaleId: string): Promise<any> {
    const cacheKey = `scale:reading:${scaleId}`;
    const cached = await this.redis.get(cacheKey);
    if (!cached) {
      throw new AppException('SCALE_OFFLINE');
    }
    return JSON.parse(cached);
  }

  // ─────────────────────────────────────────────────────
  // RECORD WEIGHT (core anti-fraud logic)
  // ─────────────────────────────────────────────────────
  async recordWeight(dto: RecordWeightDto, operatorId: string, zoneId: string): Promise<any> {
    // 1. Find scale
    const scale = await this.prisma.weighScale.findUnique({ where: { id: dto.scaleId } });
    if (!scale) throw new AppException('SCALE_NOT_FOUND');
    if (scale.status !== 'ACTIVE') throw new AppException('SCALE_NOT_FOUND');

    let grossWeight = dto.grossWeight;
    let tareWeight = dto.tareWeight;

    // 2. Auto-capture from sensor
    if (scale.isAutoCapture) {
      const reading = await this.getCurrentReading(scale.id);
      if (!reading.isStable) {
        throw new AppException('SCALE_NOT_STABLE');
      }
      grossWeight = reading.weight;
    }

    // 3. Compute net weight
    let netWeight = grossWeight;
    if (dto.weighType === 'GROSS' && tareWeight) {
      netWeight = grossWeight - tareWeight;
    }

    // 4. Anti-fraud: check discrepancy with waybill
    let isTamperFlag = false;
    let tamperReason: string | null = null;

    if (dto.waybillId) {
      const waybill = await this.prisma.waybill.findUnique({ where: { id: dto.waybillId } });
      if (waybill) {
        const declaredWeight = Number(waybill.quantity);
        const discrepancyPercent = declaredWeight > 0
          ? Math.abs((netWeight - declaredWeight) / declaredWeight) * 100
          : 0;

        // Get threshold from zone settings
        const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
        const settings = (zone?.settings as any) || {};
        const threshold = settings.weightDiscrepancyThreshold || 5;

        if (discrepancyPercent > threshold) {
          isTamperFlag = true;
          tamperReason = `وزن با بارنامه مغایرت دارد (${discrepancyPercent.toFixed(1)}% > ${threshold}%)`;

          this.logger.warn(`TAMPER DETECTED: waybill ${dto.waybillId}, declared ${declaredWeight} ton, actual ${netWeight} ton`);

          // Notify zone manager
          // In production: send SMS + in-app notification
        }
      }
    }

    // 5. Anti-fraud: check rapid re-weigh
    if (!isTamperFlag) {
      const recentWeighings = await this.prisma.weighRecord.findMany({
        where: {
          zoneId,
          vehiclePlate: normalizePlate(dto.vehiclePlate),
          weighedAt: { gte: new Date(Date.now() - 30 * 60 * 1000) }, // Last 30 min
        },
        orderBy: { weighedAt: 'desc' },
        take: 2,
      });

      if (recentWeighings.length > 0) {
        const lastWeight = Number(recentWeighings[0].netWeight || 0);
        if (Math.abs(netWeight - lastWeight) > 2) {
          isTamperFlag = true;
          tamperReason = `مغایرت وزن بیش از ۲ تن در ۳۰ دقیقه اخیر`;
        }
      }
    }

    // 6. Calculate charge
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    const settings = (zone?.settings as any) || {};
    const feePerTon = settings.weighingFeePerTon || 50000; // 50,000 IRR per ton
    const chargeAmount = BigInt(Math.round(netWeight * feePerTon));

    // 7. Get operator info
    const operator = await this.prisma.user.findUnique({ where: { id: operatorId } });

    // 8. Create WeighRecord
    const normalizedPlate = normalizePlate(dto.vehiclePlate);
    const weighRecord = await this.prisma.weighRecord.create({
      data: {
        zoneId,
        scaleId: dto.scaleId,
        waybillId: dto.waybillId,
        vehiclePlate: normalizedPlate,
        vehicleType: dto.vehicleType,
        companyId: dto.companyId,
        weighType: dto.weighType,
        grossWeight,
        tareWeight,
        netWeight,
        isAutoCapture: scale.isAutoCapture,
        isTamperFlag,
        tamperReason,
        operatorId,
        operatorName: operator ? `${operator.firstName} ${operator.lastName}` : 'Unknown',
        imageKey: dto.imageKey,
        chargeAmount,
      },
    });

    // 9. Generate receipt PDF (placeholder — in production use pdfkit)
    const receiptKey = `weigh-receipts/${weighRecord.id}/receipt.pdf`;
    await this.prisma.weighRecord.update({
      where: { id: weighRecord.id },
      data: { receiptKey },
    });

    // 10. Update linked waybill
    if (dto.waybillId) {
      const waybill = await this.prisma.waybill.findUnique({ where: { id: dto.waybillId } });
      if (waybill) {
        const discrepancy = waybill.quantity
          ? Math.abs((netWeight - Number(waybill.quantity)) / Number(waybill.quantity)) * 100
          : 0;

        await this.prisma.waybill.update({
          where: { id: dto.waybillId },
          data: {
            grossWeight,
            tareWeight,
            netWeight,
            weighedAt: new Date(),
            weighedBy: operatorId,
            weighScaleId: dto.scaleId,
            weightImageKey: dto.imageKey,
            weightDiscrepancy: discrepancy,
            chargeAmount,
            status: 'WEIGHED',
          },
        });

        // Create tracking event
        await this.prisma.shipmentTracking.create({
          data: {
            waybillId: dto.waybillId,
            zoneId,
            status: 'WEIGHED',
            description: `وزن خالص: ${netWeight} تن${isTamperFlag ? ' (مغایرت تشخیص داده شد)' : ''}`,
            actorId: operatorId,
          },
        });
      }
    }

    // 11. Create audit log
    await this.audit.log({
      zoneId,
      userId: operatorId,
      targetId: weighRecord.id,
      targetType: 'WeighRecord',
      action: 'WEIGH_RECORDED',
      metadata: {
        plate: normalizedPlate,
        grossWeight,
        tareWeight,
        netWeight,
        isTamperFlag,
        chargeAmount: chargeAmount.toString(),
      },
    });

    if (isTamperFlag) {
      await this.audit.log({
        zoneId,
        userId: operatorId,
        targetId: weighRecord.id,
        targetType: 'WeighRecord',
        action: 'WEIGH_TAMPER_FLAGGED',
        metadata: { tamperReason },
      });
    }

    this.logger.log(`Weight recorded: ${normalizedPlate} → ${netWeight} ton (tamper: ${isTamperFlag})`);
    return weighRecord;
  }

  // ─────────────────────────────────────────────────────
  // VOID WEIGH RECORD
  // ─────────────────────────────────────────────────────
  async voidWeighRecord(id: string, reason: string, voidedBy: string): Promise<any> {
    const record = await this.prisma.weighRecord.findUnique({ where: { id } });
    if (!record) throw new AppException('WEIGH_RECORD_NOT_FOUND');
    if (record.isVoided) throw new AppException('WEIGH_RECORD_ALREADY_VOIDED');

    const updated = await this.prisma.weighRecord.update({
      where: { id },
      data: {
        isVoided: true,
        voidedBy,
        voidedAt: new Date(),
        voidReason: reason,
      },
    });

    // Recompute waybill if linked
    if (record.waybillId) {
      const lastValidWeighing = await this.prisma.weighRecord.findFirst({
        where: {
          waybillId: record.waybillId,
          isVoided: false,
          id: { not: id },
        },
        orderBy: { weighedAt: 'desc' },
      });

      await this.prisma.waybill.update({
        where: { id: record.waybillId },
        data: {
          grossWeight: lastValidWeighing?.grossWeight ?? null,
          tareWeight: lastValidWeighing?.tareWeight ?? null,
          netWeight: lastValidWeighing?.netWeight ?? null,
          weighedAt: lastValidWeighing?.weighedAt ?? null,
          weighedBy: lastValidWeighing?.operatorId ?? null,
          weightDiscrepancy: lastValidWeighing ? null : null,
          status: lastValidWeighing ? 'WEIGHED' : 'AT_SCALE',
        },
      });
    }

    await this.audit.log({
      zoneId: record.zoneId,
      userId: voidedBy,
      targetId: id,
      targetType: 'WeighRecord',
      action: 'WEIGH_VOIDED',
      metadata: { reason },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // WEIGH HISTORY
  // ─────────────────────────────────────────────────────
  async getWeighHistory(zoneId: string, filter: FilterWeighDto): Promise<PaginatedResult<any>> {
    const limit = filter.limit ?? 20;
    const where: any = { zoneId };

    if (filter.scaleId) where.scaleId = filter.scaleId;
    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.weighType) where.weighType = filter.weighType;
    if (filter.vehicleType) where.vehicleType = filter.vehicleType;
    if (filter.vehiclePlate) {
      where.vehiclePlate = { contains: normalizePlate(filter.vehiclePlate) };
    }
    if (filter.isTamperFlag !== undefined) where.isTamperFlag = filter.isTamperFlag;
    if (filter.fromDate || filter.toDate) {
      where.weighedAt = {};
      if (filter.fromDate) where.weighedAt.gte = new Date(filter.fromDate);
      if (filter.toDate) where.weighedAt.lte = new Date(filter.toDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.weighRecord.findMany({
        where,
        orderBy: { weighedAt: 'desc' },
        take: limit,
      }),
      this.prisma.weighRecord.count({ where }),
    ]);

    return { data, meta: { total } };
  }

  // ─────────────────────────────────────────────────────
  // OPERATOR DASHBOARD
  // ─────────────────────────────────────────────────────
  async getOperatorDashboard(operatorId: string, scaleId: string): Promise<any> {
    const scale = await this.prisma.weighScale.findUnique({ where: { id: scaleId } });
    if (!scale) throw new AppException('SCALE_NOT_FOUND');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pendingWaybills, todayStats, recentRecords] = await Promise.all([
      // Pending waybills at gate awaiting weigh
      this.prisma.waybill.findMany({
        where: {
          zoneId: scale.zoneId,
          status: 'AT_SCALE',
          weighScaleId: scaleId,
        },
        take: 10,
      }),
      // Today stats
      this.prisma.weighRecord.aggregate({
        where: {
          scaleId,
          weighedAt: { gte: today },
          isVoided: false,
        },
        _count: true,
        _sum: { netWeight: true, chargeAmount: true },
      }),
      // Recent records
      this.prisma.weighRecord.findMany({
        where: { scaleId, isVoided: false },
        orderBy: { weighedAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      scale,
      currentReading: await this.getCurrentReading(scaleId).catch(() => ({
        weight: 0,
        isStable: false,
        isOnline: false,
      })),
      pendingWaybills,
      todayStats: {
        totalWeighings: todayStats._count,
        totalWeightTon: Number(todayStats._sum.netWeight ?? 0),
        flaggedCount: await this.prisma.weighRecord.count({
          where: { scaleId, isTamperFlag: true, weighedAt: { gte: today } },
        }),
        totalFees: todayStats._sum.chargeAmount ?? BigInt(0),
      },
      recentRecords,
    };
  }

  // ─────────────────────────────────────────────────────
  // TAMPER ALERTS
  // ─────────────────────────────────────────────────────
  async getTamperAlerts(zoneId: string, fromDate?: string): Promise<any[]> {
    const where: any = { zoneId, isTamperFlag: true };
    if (fromDate) {
      where.weighedAt = { gte: new Date(fromDate) };
    }

    return this.prisma.weighRecord.findMany({
      where,
      orderBy: { weighedAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────────────
  // CALIBRATE
  // ─────────────────────────────────────────────────────
  async calibrateScale(
    scaleId: string,
    calibratedBy: string,
    certificateFile: Express.Multer.File,
  ): Promise<any> {
    const scale = await this.prisma.weighScale.findUnique({ where: { id: scaleId } });
    if (!scale) throw new AppException('SCALE_NOT_FOUND');

    const ext = certificateFile.originalname.split('.').pop();
    const certificateKey = `scale-certificates/${scaleId}/${Date.now()}.${ext}`;

    // In production: upload to MinIO

    const updated = await this.prisma.weighScale.update({
      where: { id: scaleId },
      data: {
        lastCalibrated: new Date(),
        calibratedBy,
        certificateKey,
        status: 'ACTIVE',
      },
    });

    await this.audit.log({
      zoneId: scale.zoneId,
      userId: calibratedBy,
      targetId: scaleId,
      targetType: 'WeighScale',
      action: 'SCALE_CALIBRATED',
      metadata: { certificateKey },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // DAILY REPORT
  // ─────────────────────────────────────────────────────
  async generateDailyReport(zoneId: string, date: string): Promise<{ reportKey: string }> {
    const start = new Date(`${date}T00:00:00+03:30`);
    const end = new Date(`${date}T23:59:59+03:30`);

    const records = await this.prisma.weighRecord.findMany({
      where: {
        zoneId,
        weighedAt: { gte: start, lte: end },
        isVoided: false,
      },
      include: { scale: { select: { code: true, nameFa: true } } },
    });

    const reportKey = `reports/${zoneId}/weighing/${date}.pdf`;

    // In production: generate PDF with pdfkit
    // const PDFDocument = require('pdfkit');
    // ... write weighing report

    return { reportKey };
  }
}
