import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { BullService } from '../../bull/bull.service';
import { AuditService } from '../../common/services/audit.service';
import { IdopGateway } from '../../gateway/idop.gateway';
import { MqttService } from '../../mqtt/mqtt.service';
import { REDIS_KEYS, REDIS_TTL } from '../../common/utils/redis-keys';
import { AppException } from '../../common/exceptions/app.exception';
import { normalizePlate } from '../../common/utils/plate-normalizer';
import { verifyQrPayload } from '../../common/utils/qr-generator';
import {
  ProcessEntryDto,
  ManualOverrideDto,
  AnprEventDto,
  FilterTrafficDto,
  StartShiftDto,
  EndShiftDto,
  CreateGateIncidentDto,
  AddToBlacklistDto,
  ScanQrDto,
} from './dto/process-entry.dto';
import {
  TrafficDirection,
  AccessResult,
  IncidentType,
  IncidentSeverity,
  BlacklistType,
  BlacklistSeverity,
  EntryMethod,
  Prisma,
} from '@prisma/client';
import { notify } from '../notifications/utils/notify.helper';

@Injectable()
export class GuardPortalService {
  private readonly logger = new Logger(GuardPortalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly bull: BullService,
    private readonly audit: AuditService,
    private readonly gateway: IdopGateway,
    private readonly mqtt: MqttService,
  ) {
    this.registerBullWorkers();
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MAIN ENTRY/EXIT PROCESSING
  // ══════════════════════════════════════════════════════════════════════════

  async processEntry(
    dto: ProcessEntryDto,
    guardId: string,
    zoneId: string,
  ) {
    // 1. Normalize plate
    const normalizedPlate = normalizePlate(dto.plate);

    // 2. Find gate
    const gate = await this.prisma.gate.findFirst({
      where: { id: dto.gateId, zoneId },
    });
    if (!gate) throw new AppException('GATE_NOT_FOUND');
    if (!gate.isActive) throw new AppException('GATE_NOT_ACTIVE');

    // 3. Run parallel checks
    const [blacklistResult, vehicle, activePermit, zoneSettings] =
      await Promise.all([
        this.checkBlacklist(zoneId, { plates: [normalizedPlate] }),
        this.prisma.vehicle.findFirst({
          where: { zoneId, plateNormalized: normalizedPlate, deletedAt: null },
          include: { company: true },
        }),
        this.findActivePermit(normalizedPlate, zoneId, dto.gateId),
        this.getZoneSettings(zoneId),
      ]);

    // 4. Determine AccessResult
    let accessResult: string = AccessResult.PENDING_GUARD_APPROVAL;
    let denyReason: string | null = null;

    // Priority checks
    if (blacklistResult.isBlacklisted) {
      if (blacklistResult.severity === 'DENY') {
        accessResult = AccessResult.DENIED_BLACKLIST;
        denyReason = blacklistResult.matches[0]?.reason || 'In blacklist';
      } else if (blacklistResult.severity === 'ALERT_SECURITY') {
        accessResult = AccessResult.DENIED_BLACKLIST;
        denyReason = blacklistResult.matches[0]?.reason || 'Security alert';
      }
    } else if (zoneSettings?.status !== 'ACTIVE') {
      accessResult = AccessResult.DENIED_ZONE_CLOSED;
      denyReason = 'Zone is closed';
    } else if (activePermit) {
      // Check gate access
      if (activePermit.allowedGates.length > 0 && !activePermit.allowedGates.includes(dto.gateId)) {
        accessResult = AccessResult.DENIED_WRONG_GATE;
        denyReason = 'Not allowed at this gate';
      } else {
        // Check hours
        const isWorkingHour = await this.isWorkingHours(zoneId);
        if (!isWorkingHour && activePermit.allowedHours) {
          // Check specific permitted hours
          accessResult = AccessResult.ALLOWED; // Has specific hours permit
        } else if (!isWorkingHour) {
          accessResult = AccessResult.DENIED_WRONG_HOURS;
          denyReason = 'Outside working hours';
        } else {
          accessResult = AccessResult.ALLOWED;
        }
      }
    } else if (vehicle && dto.direction === TrafficDirection.ENTRY) {
      // Vehicle exists but no active permit - check if has waybill
      if (dto.waybillId) {
        accessResult = AccessResult.ALLOWED;
      } else {
        accessResult = AccessResult.PENDING_GUARD_APPROVAL;
      }
    } else if (!vehicle && dto.direction === TrafficDirection.ENTRY) {
      accessResult = AccessResult.PENDING_GUARD_APPROVAL;
    }

    // 5. Create TrafficLog
    const trafficLog = await this.prisma.trafficLog.create({
      data: {
        zoneId,
        gateId: dto.gateId,
        vehicleId: vehicle?.id || null,
        plate: dto.plate,
        plateConfidence: (dto.metadata?.confidence as number) || null,
        direction: dto.direction,
        vehicleType: vehicle?.type || null,
        companyId: vehicle?.companyId || null,
        companyName: vehicle?.company?.nameFa || null,
        driverName: dto.driverName || vehicle?.driverName || null,
        waybillId: dto.waybillId || null,
        visitorId: dto.visitorId || null,
        purpose: dto.purpose || null,
        entryMethod: dto.entryMethod,
        accessResult: accessResult as any,
        denyReason,
        imageKey: (dto.metadata?.imageKey as string) || null,
        weight: dto.weight || null,
        guardId,
        notes: dto.notes || null,
        metadata: (dto.metadata || {}) as any,
      },
    });

    // 6. If ALLOWED: open barrier
    const barrierOpened = accessResult === AccessResult.ALLOWED;
    if (barrierOpened) {
      try {
        await this.openBarrier(dto.gateId, `Auto: ${dto.plate}`, guardId);
      } catch (err) {
        this.logger.error(`Failed to open barrier: ${err}`);
      }
    }

    // 7. If DENIED with ALERT_SECURITY: notify security
    if (
      blacklistResult.isBlacklisted &&
      blacklistResult.severity === 'ALERT_SECURITY'
    ) {
      this.gateway.emitToZone(zoneId, 'traffic:denied', {
        plate: dto.plate,
        reason: denyReason,
        severity: 'ALERT_SECURITY',
        timestamp: new Date().toISOString(),
      });

      // Send notification to zone managers
      notify.blacklistAlert({
        zoneId, plate: dto.plate, reason: denyReason || '黑名单匹配',
        severity: 'ALERT_SECURITY',
      }).catch(() => {});
    }

    // 8. If EXIT: compute dwell time
    if (dto.direction === TrafficDirection.EXIT) {
      const entryLog = await this.prisma.trafficLog.findFirst({
        where: {
          zoneId,
          plate: normalizedPlate,
          direction: 'ENTRY',
          exitAt: null,
        },
        orderBy: { processedAt: 'desc' },
      });

      if (entryLog) {
        const dwellMinutes = Math.round(
          (Date.now() - entryLog.processedAt.getTime()) / (1000 * 60),
        );
        await this.prisma.trafficLog.update({
          where: { id: entryLog.id },
          data: { exitAt: new Date(), dwellMinutes },
        });
        trafficLog.dwellMinutes = dwellMinutes;
      }
    }

    // 9. Emit socket events
    const eventName = dto.direction === TrafficDirection.ENTRY ? 'traffic:entry' : 'traffic:exit';
    this.gateway.emitToGateAndZone(dto.gateId, zoneId, eventName, {
      logId: trafficLog.id,
      plate: dto.plate,
      company: vehicle?.company?.nameFa,
      direction: dto.direction,
      accessResult,
      vehicleType: vehicle?.type,
      timestamp: new Date().toISOString(),
      barrierOpened,
    });

    // 10. Audit
    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: trafficLog.id,
      targetType: 'TrafficLog',
      action: dto.direction === TrafficDirection.ENTRY ? 'VEHICLE_ENTRY' : 'VEHICLE_EXIT',
      metadata: {
        plate: dto.plate,
        gateId: dto.gateId,
        accessResult,
        direction: dto.direction,
      },
    });

    return trafficLog;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ANPR INTEGRATION
  // ══════════════════════════════════════════════════════════════════════════

  async processAnprEvent(dto: AnprEventDto, zoneId: string) {
    const normalizedPlate = normalizePlate(dto.plate);

    // 1. Save AnprEvent
    const event = await this.prisma.anprEvent.create({
      data: {
        zoneId,
        gateId: dto.gateId,
        cameraId: dto.cameraId,
        plate: dto.plate,
        plateNormalized: normalizedPlate,
        confidence: dto.confidence,
        imageKey: dto.imageKey || null,
        plateImageKey: dto.plateImageKey || null,
        direction: dto.direction || null,
        vehicleType: dto.vehicleType as any || null,
        color: dto.color || null,
        speed: dto.speed || null,
      },
    });

    // 2. Low confidence
    if (dto.confidence < 0.75) {
      this.gateway.emitToGate(dto.gateId, 'anpr:needs-review', {
        anprEventId: event.id,
        plate: dto.plate,
        confidence: dto.confidence,
        imageKey: dto.imageKey,
        reason: 'Low confidence',
      });
      return { processed: false, needsReview: true };
    }

    // 3. Quick checks
    const [vehicle, blacklist] = await Promise.all([
      this.prisma.vehicle.findFirst({
        where: { zoneId, plateNormalized: normalizedPlate, deletedAt: null },
      }),
      this.checkBlacklist(zoneId, { plates: [normalizedPlate] }),
    ]);

    // 4. Emit socket event
    const suggestedAction =
      dto.confidence >= 0.9 && !blacklist.isBlacklisted
        ? 'AUTO_ALLOW'
        : blacklist.isBlacklisted
          ? 'DENY'
          : 'REVIEW';

    this.gateway.emitToGate(dto.gateId, 'anpr:detected', {
      plate: dto.plate,
      confidence: dto.confidence,
      vehicleType: dto.vehicleType,
      color: dto.color,
      imageKey: dto.imageKey,
      plateImageKey: dto.plateImageKey,
      vehicleInfo: vehicle ? { id: vehicle.id, plate: vehicle.plate, company: vehicle.companyId } : null,
      suggestedAction,
      timestamp: new Date().toISOString(),
    });

    // 5. Auto-process if high confidence
    if (dto.confidence >= 0.9 && !blacklist.isBlacklisted && vehicle) {
      const direction = dto.direction || TrafficDirection.ENTRY;
      await this.processEntry(
        {
          gateId: dto.gateId,
          plate: dto.plate,
          direction,
          entryMethod: EntryMethod.ANPR_AUTO,
          metadata: {
            anprEventId: event.id,
            confidence: dto.confidence,
            imageKey: dto.imageKey,
            cameraId: dto.cameraId,
          },
        },
        'anpr-system',
        zoneId,
      );

      // Open barrier
      await this.openBarrier(dto.gateId, `ANPR auto: ${dto.plate}`, 'anpr-system');
    }

    // 6. Mark as processed
    await this.prisma.anprEvent.update({
      where: { id: event.id },
      data: { isProcessed: true },
    });

    return { processed: true, needsReview: false };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // QR SCANNING
  // ══════════════════════════════════════════════════════════════════════════

  async scanQrCode(dto: ScanQrDto, guardId: string, zoneId: string) {
    const gate = await this.prisma.gate.findFirst({
      where: { id: dto.gateId, zoneId },
    });
    if (!gate) throw new AppException('GATE_NOT_FOUND');

    // Parse QR payload
    const qrSecret = 'idop-qr-secret'; // From config
    const verification = verifyQrPayload(dto.qrPayload, zoneId, qrSecret);

    if (!verification.isValid) {
      throw new AppException('QR_INVALID_SIGNATURE');
    }

    await this.audit.log({
      zoneId,
      userId: guardId,
      action: 'QR_SCANNED',
      metadata: { type: verification.type, id: verification.id },
    });

    switch (verification.type) {
      case 'VISITOR':
        return this.processVisitorQr(verification.id, dto.gateId, zoneId);
      case 'VEHICLE':
        return this.processVehicleQr(verification.id, dto.gateId, zoneId);
      case 'SHIPMENT':
        return this.processShipmentQr(verification.id, dto.gateId, zoneId);
      case 'LETTER':
        return this.processLetterQr(verification.id, dto.gateId, zoneId);
      default:
        throw new AppException('QR_INVALID_FORMAT');
    }
  }

  private async processVisitorQr(visitorId: string, gateId: string, zoneId: string) {
    // Simplified - would query VisitorRequest model (M6)
    return {
      type: 'VISITOR',
      isValid: true,
      result: { visitorId, status: 'APPROVED' },
      actionRequired: 'Allow entry',
      allowEntry: true,
    };
  }

  private async processVehicleQr(permitId: string, gateId: string, zoneId: string) {
    const permit = await this.prisma.vehicleAccessPermit.findUnique({
      where: { id: permitId },
      include: { vehicle: true },
    });

    if (!permit) return { type: 'VEHICLE', isValid: false, result: null, actionRequired: 'Permit not found', allowEntry: false };
    if (!permit.isActive) return { type: 'VEHICLE', isValid: false, result: null, actionRequired: 'Permit inactive', allowEntry: false };
    if (permit.validUntil && permit.validUntil < new Date()) return { type: 'VEHICLE', isValid: false, result: null, actionRequired: 'Permit expired', allowEntry: false };
    if (permit.allowedGates.length > 0 && !permit.allowedGates.includes(gateId)) return { type: 'VEHICLE', isValid: false, result: null, actionRequired: 'Wrong gate', allowEntry: false };

    return {
      type: 'VEHICLE',
      isValid: true,
      result: { permit, vehicle: permit.vehicle },
      actionRequired: 'Allow entry',
      allowEntry: true,
    };
  }

  private async processShipmentQr(shipmentId: string, gateId: string, zoneId: string) {
    // Simplified - would query Shipment/Waybill model (M4)
    return {
      type: 'SHIPMENT',
      isValid: true,
      result: { shipmentId },
      actionRequired: 'Verify carrier plate',
      allowEntry: true,
    };
  }

  private async processLetterQr(letterId: string, gateId: string, zoneId: string) {
    // Simplified - would query Letter model (M8)
    return {
      type: 'LETTER',
      isValid: true,
      result: { letterId },
      actionRequired: 'Archive mode - receive physical letter',
      allowEntry: true,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BARRIER CONTROL
  // ══════════════════════════════════════════════════════════════════════════

  async openBarrier(gateId: string, reason: string, triggeredBy: string, durationSeconds?: number) {
    const gate = await this.prisma.gate.findUnique({ where: { id: gateId } });
    if (!gate) throw new AppException('GATE_NOT_FOUND');
    if (!gate.hasBarrier) return; // No barrier at this gate

    const duration = durationSeconds || 10;
    const topic = `idop/${gate.zoneId}/gate/${gateId}/barrier/open`;

    // Publish MQTT command
    this.mqtt.publish(topic, {
      duration,
      triggeredBy,
      reason,
      timestamp: new Date().toISOString(),
    });

    // Update Redis status
    await this.redis.setJson(
      REDIS_KEYS.gateBarrier(gateId),
      { isOpen: true, lastCommand: 'open', lastCommandAt: new Date().toISOString(), deviceOnline: true },
      REDIS_TTL.GATE_BARRIER,
    );

    // Emit socket event
    this.gateway.emitToGate(gateId, 'barrier:opened', {
      gateId,
      triggeredBy,
      reason,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      zoneId: gate.zoneId,
      userId: triggeredBy,
      targetId: gateId,
      targetType: 'Gate',
      action: 'BARRIER_OPENED',
      metadata: { reason, duration },
    });
  }

  async closeBarrier(gateId: string, triggeredBy: string) {
    const gate = await this.prisma.gate.findUnique({ where: { id: gateId } });
    if (!gate) throw new AppException('GATE_NOT_FOUND');

    const topic = `idop/${gate.zoneId}/gate/${gateId}/barrier/close`;
    this.mqtt.publish(topic, { triggeredBy, timestamp: new Date().toISOString() });

    await this.redis.setJson(
      REDIS_KEYS.gateBarrier(gateId),
      { isOpen: false, lastCommand: 'close', lastCommandAt: new Date().toISOString(), deviceOnline: true },
      REDIS_TTL.GATE_BARRIER,
    );

    this.gateway.emitToGate(gateId, 'barrier:closed', {
      gateId,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      zoneId: gate.zoneId,
      userId: triggeredBy,
      targetId: gateId,
      targetType: 'Gate',
      action: 'BARRIER_CLOSED',
    });
  }

  async getBarrierStatus(gateId: string) {
    const cached = await this.redis.getJson<{
      isOpen: boolean;
      lastCommand: string;
      lastCommandAt: string;
      deviceOnline: boolean;
    }>(REDIS_KEYS.gateBarrier(gateId));

    return cached || {
      isOpen: false,
      lastCommand: 'unknown',
      lastCommandAt: new Date().toISOString(),
      deviceOnline: false,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MANUAL OVERRIDE
  // ══════════════════════════════════════════════════════════════════════════

  async manualOverride(dto: ManualOverrideDto, guardId: string, zoneId: string) {
    const trafficLog = await this.prisma.trafficLog.findUnique({
      where: { id: dto.trafficLogId },
    });
    if (!trafficLog) throw new AppException('SHIFT_NOT_FOUND');
    if (trafficLog.accessResult !== 'PENDING_GUARD_APPROVAL') {
      throw new AppException('OVERRIDE_NOT_PENDING');
    }

    const updated = await this.prisma.trafficLog.update({
      where: { id: dto.trafficLogId },
      data: {
        accessResult: 'OVERRIDE_ALLOWED',
        manualOverride: true,
        overrideBy: guardId,
        overrideReason: dto.reason,
      },
    });

    // Open barrier
    await this.openBarrier(trafficLog.gateId, `Override: ${dto.reason}`, guardId);

    // If durationMinutes set: create time-limited permit
    if (dto.durationMinutes && trafficLog.vehicleId) {
      await this.prisma.vehicleAccessPermit.create({
        data: {
          zoneId,
          vehicleId: trafficLog.vehicleId,
          companyId: trafficLog.companyId,
          type: 'VISITOR',
          allowedGates: [trafficLog.gateId],
          validFrom: new Date(),
          validUntil: new Date(Date.now() + dto.durationMinutes * 60 * 1000),
          issuedBy: guardId,
          notes: `Manual override: ${dto.reason}`,
        },
      });
    }

    // Notify zone manager
    this.gateway.emitToZone(zoneId, 'traffic:override', {
      plate: trafficLog.plate,
      guardId,
      reason: dto.reason,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: dto.trafficLogId,
      targetType: 'TrafficLog',
      action: 'VEHICLE_OVERRIDE',
      metadata: { reason: dto.reason, plate: trafficLog.plate },
    });

    return updated;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLACKLIST
  // ══════════════════════════════════════════════════════════════════════════

  async addToBlacklist(zoneId: string, dto: AddToBlacklistDto, addedBy: string) {
    const existing = await this.prisma.blacklist.findFirst({
      where: { zoneId, type: dto.type as any, value: dto.value, isActive: true },
    });
    if (existing) throw new AppException('BLACKLIST_ENTRY_EXISTS');

    const entry = await this.prisma.blacklist.create({
      data: {
        zoneId,
        type: dto.type as any,
        value: dto.value,
        reason: dto.reason,
        severity: dto.severity as any,
        addedBy,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        notes: dto.notes || null,
      },
    });

    await this.redis.del(REDIS_KEYS.blacklistCheck(zoneId, dto.value));

    await this.audit.log({
      zoneId,
      userId: addedBy,
      targetId: entry.id,
      targetType: 'Blacklist',
      action: 'VEHICLE_BLACKLISTED',
      metadata: { type: dto.type, value: dto.value, reason: dto.reason },
    });

    return entry;
  }

  async removeFromBlacklist(zoneId: string, blacklistId: string, removedBy: string) {
    await this.prisma.blacklist.update({
      where: { id: blacklistId },
      data: { isActive: false, revokedBy: removedBy, revokedAt: new Date() },
    });
    await this.audit.log({
      zoneId,
      userId: removedBy,
      targetId: blacklistId,
      targetType: 'Blacklist',
      action: 'VEHICLE_UNBLACKLISTED',
    });
  }

  async checkBlacklist(
    zoneId: string,
    checks: { plates?: string[]; nationalIds?: string[]; phones?: string[] },
  ): Promise<{ isBlacklisted: boolean; matches: any[]; severity: string | null }> {
    const matches: any[] = [];

    if (checks.plates) {
      for (const plate of checks.plates) {
        const normalized = normalizePlate(plate);
        const cached = await this.redis.getJson(REDIS_KEYS.blacklistCheck(zoneId, normalized));
        if (cached) {
          matches.push(cached);
          continue;
        }

        const entry = await this.prisma.blacklist.findFirst({
          where: {
            zoneId,
            type: 'PLATE',
            value: normalized,
            isActive: true,
            OR: [
              { expiresAt: null },
              { expiresAt: { gt: new Date() } },
            ],
          },
        });

        if (entry) {
          matches.push(entry);
          await this.redis.setJson(REDIS_KEYS.blacklistCheck(zoneId, normalized), entry, REDIS_TTL.BLACKLIST_CHECK);
        }
      }
    }

    const isBlacklisted = matches.length > 0;
    // Severity priority: ALERT_SECURITY > DENY > WARNING
    const severityOrder = { ALERT_SECURITY: 3, DENY: 2, WARNING: 1 };
    const maxSeverity = matches.reduce(
      (max, m) => (severityOrder[m.severity] || 0) > (severityOrder[max] || 0) ? m.severity : max,
      null as string | null,
    );

    return { isBlacklisted, matches, severity: maxSeverity };
  }

  async getBlacklist(zoneId: string, filter?: { type?: string; isActive?: boolean }) {
    const where: Prisma.BlacklistWhereInput = { zoneId };
    if (filter?.type) where.type = filter.type as any;
    if (filter?.isActive !== undefined) where.isActive = filter.isActive;
    return this.prisma.blacklist.findMany({ where, orderBy: { addedAt: 'desc' } });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SHIFTS
  // ══════════════════════════════════════════════════════════════════════════

  async startShift(guardId: string, zoneId: string, dto: StartShiftDto) {
    const activeShift = await this.prisma.guardShift.findFirst({
      where: { guardId, zoneId, endedAt: null },
    });
    if (activeShift) throw new AppException('SHIFT_ALREADY_ACTIVE');

    const shift = await this.prisma.guardShift.create({
      data: { zoneId, gateId: dto.gateId, guardId },
    });

    this.gateway.emitToZone(zoneId, 'guard:shift:started', {
      guardId,
      gateId: dto.gateId,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      zoneId,
      userId: guardId,
      targetId: shift.id,
      targetType: 'GuardShift',
      action: 'SHIFT_STARTED',
    });

    return shift;
  }

  async endShift(shiftId: string, guardId: string, dto: EndShiftDto) {
    const shift = await this.prisma.guardShift.findUnique({ where: { id: shiftId } });
    if (!shift) throw new AppException('SHIFT_NOT_FOUND');

    // Compute summary
    const entries = await this.prisma.trafficLog.count({
      where: { zoneId: shift.zoneId, gateId: shift.gateId, direction: 'ENTRY', processedAt: { gte: shift.startedAt, lte: new Date() } },
    });
    const exits = await this.prisma.trafficLog.count({
      where: { zoneId: shift.zoneId, gateId: shift.gateId, direction: 'EXIT', processedAt: { gte: shift.startedAt, lte: new Date() } },
    });
    const incidents = await this.prisma.gateIncident.count({
      where: { zoneId: shift.zoneId, gateId: shift.gateId, createdAt: { gte: shift.startedAt, lte: new Date() } },
    });
    const overrides = await this.prisma.trafficLog.count({
      where: { zoneId: shift.zoneId, gateId: shift.gateId, manualOverride: true, processedAt: { gte: shift.startedAt, lte: new Date() } },
    });

    const updated = await this.prisma.guardShift.update({
      where: { id: shiftId },
      data: {
        endedAt: new Date(),
        handoverTo: dto.handoverTo || null,
        handoverNotes: dto.handoverNotes || null,
        summary: { totalEntries: entries, totalExits: exits, incidents, overrides },
      },
    });

    this.gateway.emitToZone(shift.zoneId, 'guard:shift:ended', {
      guardId,
      gateId: shift.gateId,
      summary: updated.summary,
      timestamp: new Date().toISOString(),
    });

    await this.audit.log({
      zoneId: shift.zoneId,
      userId: guardId,
      targetId: shiftId,
      targetType: 'GuardShift',
      action: 'SHIFT_ENDED',
      metadata: { summary: updated.summary },
    });

    return updated;
  }

  async getActiveShift(guardId: string, zoneId: string) {
    return this.prisma.guardShift.findFirst({
      where: { guardId, zoneId, endedAt: null },
    });
  }

  async getShiftHistory(gateId: string) {
    return this.prisma.guardShift.findMany({
      where: { gateId },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INCIDENTS
  // ══════════════════════════════════════════════════════════════════════════

  async reportIncident(dto: CreateGateIncidentDto, reportedBy: string, zoneId: string) {
    const incident = await this.prisma.gateIncident.create({
      data: {
        zoneId,
        gateId: dto.gateId,
        guardId: reportedBy,
        trafficLogId: dto.trafficLogId || null,
        type: dto.type as any,
        severity: dto.severity as any,
        description: dto.description,
        plate: dto.plate || null,
        personName: dto.personName || null,
        imageKeys: dto.imageKeys || [],
        videoKey: dto.videoKey || null,
      },
    });

    // If HIGH/CRITICAL: notify zone manager immediately
    if (dto.severity === 'CRITICAL' || dto.severity === 'HIGH') {
      this.gateway.emitToZone(zoneId, 'incident:reported', {
        incidentId: incident.id,
        type: dto.type,
        severity: dto.severity,
        gateId: dto.gateId,
        timestamp: new Date().toISOString(),
      });

      // Send SMS to zone manager
      const managers = await this.prisma.user.findMany({
        where: { zoneId, role: 'ZONE_MANAGER', status: 'ACTIVE' },
      });
      for (const manager of managers) {
        await this.prisma.notification.create({
          data: {
            recipientId: manager.id,
            zoneId,
            module: 'GUARD',
            eventType: 'incident.reported',
            priority: dto.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            title: 'Incident Reported',
            titleFa: 'حادثه در ورودی',
            body: `${dto.type} - شدت: ${dto.severity} - ${dto.description.substring(0, 100)}`,
            bodyFa: `${dto.type} - شدت: ${dto.severity} - ${dto.description.substring(0, 100)}`,
            entityType: 'INCIDENT',
            entityId: incident.id,
            metadata: { incidentId: incident.id },
          },
        });
      }
    }

    await this.audit.log({
      zoneId,
      userId: reportedBy,
      targetId: incident.id,
      targetType: 'GateIncident',
      action: 'INCIDENT_REPORTED',
      metadata: { type: dto.type, severity: dto.severity },
    });

    return incident;
  }

  async resolveIncident(incidentId: string, resolution: string, resolvedBy: string) {
    const incident = await this.prisma.gateIncident.findUnique({ where: { id: incidentId } });
    if (!incident) throw new AppException('INCIDENT_NOT_FOUND');

    return this.prisma.gateIncident.update({
      where: { id: incidentId },
      data: {
        resolvedAt: new Date(),
        resolvedBy,
        resolution,
      },
    });
  }

  async getIncidents(zoneId: string, filter?: FilterTrafficDto) {
    const where: Prisma.GateIncidentWhereInput = { zoneId };
    if (filter?.gateId) where.gateId = filter.gateId;

    const items = await this.prisma.gateIncident.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: filter?.limit || 50,
    });

    const total = await this.prisma.gateIncident.count({ where });
    return { data: items, meta: { total, limit: filter?.limit || 50 } };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIVE DASHBOARD
  // ══════════════════════════════════════════════════════════════════════════

  async getGuardDashboard(guardId: string, gateId: string, zoneId: string) {
    const cached = await this.redis.getJson(REDIS_KEYS.guardDashboard(gateId));
    if (cached) return cached;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [shift, gate, entries, exits, denied, overrides, incidents, pendingApprovals, recentLogs, vehiclesInside] =
      await Promise.all([
        this.prisma.guardShift.findFirst({ where: { guardId, zoneId, endedAt: null } }),
        this.prisma.gate.findUnique({ where: { id: gateId } }),
        this.prisma.trafficLog.count({ where: { zoneId, gateId, direction: 'ENTRY', processedAt: { gte: today } } }),
        this.prisma.trafficLog.count({ where: { zoneId, gateId, direction: 'EXIT', processedAt: { gte: today } } }),
        this.prisma.trafficLog.count({ where: { zoneId, gateId, accessResult: { not: 'ALLOWED' }, processedAt: { gte: today } } }),
        this.prisma.trafficLog.count({ where: { zoneId, gateId, manualOverride: true, processedAt: { gte: today } } }),
        this.prisma.gateIncident.count({ where: { zoneId, gateId, createdAt: { gte: today } } }),
        this.prisma.trafficLog.findMany({
          where: { zoneId, gateId, accessResult: 'PENDING_GUARD_APPROVAL' },
          orderBy: { processedAt: 'desc' },
          take: 10,
        }),
        this.prisma.trafficLog.findMany({
          where: { zoneId, gateId },
          orderBy: { processedAt: 'desc' },
          take: 20,
        }),
        this.prisma.trafficLog.count({
          where: { zoneId, direction: 'ENTRY', exitAt: null, processedAt: { gte: today } },
        }),
      ]);

    const barrierStatus = await this.getBarrierStatus(gateId);

    const dashboard = {
      shift,
      gate,
      todayStats: { entries, exits, denied, overrides, incidents },
      vehiclesInsideCount: vehiclesInside,
      pendingApprovals,
      barrierStatus,
      recentLogs,
      alerts: [] as string[],
    };

    await this.redis.setJson(REDIS_KEYS.guardDashboard(gateId), dashboard, REDIS_TTL.GUARD_DASHBOARD);
    return dashboard;
  }

  async getLiveTrafficFeed(zoneId: string, gateId?: string, limit?: number) {
    return this.prisma.trafficLog.findMany({
      where: { zoneId, ...(gateId && { gateId }) },
      orderBy: { processedAt: 'desc' },
      take: limit || 50,
    });
  }

  async getTrafficStats(zoneId: string, period: 'today' | 'week' | 'month', gateId?: string) {
    const now = new Date();
    let since: Date;
    if (period === 'today') {
      since = new Date(now);
      since.setHours(0, 0, 0, 0);
    } else if (period === 'week') {
      since = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    const where: Prisma.TrafficLogWhereInput = {
      zoneId,
      processedAt: { gte: since },
    };
    if (gateId) where.gateId = gateId;

    const logs = await this.prisma.trafficLog.findMany({ where });

    const totalEntries = logs.filter((l) => l.direction === 'ENTRY').length;
    const totalExits = logs.filter((l) => l.direction === 'EXIT').length;
    const uniqueVehicles = new Set(logs.map((l) => l.plate)).size;
    const deniedCount = logs.filter((l) => l.accessResult !== 'ALLOWED').length;
    const overrideCount = logs.filter((l) => l.manualOverride).length;

    const avgDwellMinutes =
      logs.filter((l) => l.dwellMinutes).reduce((sum, l) => sum + (l.dwellMinutes || 0), 0) /
        (logs.filter((l) => l.dwellMinutes).length || 1);

    // By hour
    const byHour = new Array(24).fill(0);
    logs.forEach((l) => {
      const hour = l.processedAt.getHours();
      byHour[hour]++;
    });

    const peakHour = byHour.indexOf(Math.max(...byHour));

    // By gate
    const byGate: Record<string, { entries: number; exits: number }> = {};
    logs.forEach((l) => {
      if (!byGate[l.gateId]) byGate[l.gateId] = { entries: 0, exits: 0 };
      if (l.direction === 'ENTRY') byGate[l.gateId].entries++;
      else byGate[l.gateId].exits++;
    });

    return {
      totalEntries,
      totalExits,
      uniqueVehicles,
      deniedCount,
      overrideCount,
      peakHour,
      avgDwellMinutes: Math.round(avgDwellMinutes),
      byGate,
      byHour,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VEHICLES CURRENTLY INSIDE
  // ══════════════════════════════════════════════════════════════════════════

  async getVehiclesCurrentlyInside(zoneId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const entryLogs = await this.prisma.trafficLog.findMany({
      where: {
        zoneId,
        direction: 'ENTRY',
        processedAt: { gte: today },
        exitAt: null,
      },
      orderBy: { processedAt: 'desc' },
    });

    return entryLogs.map((log) => ({
      plate: log.plate,
      company: log.companyName,
      entryTime: log.processedAt,
      durationMinutes: Math.round((Date.now() - log.processedAt.getTime()) / (1000 * 60)),
      gateId: log.gateId,
      purpose: log.purpose,
    }));
  }

  async getOverstayAlerts(zoneId: string) {
    const maxDwell = 240; // Default 4 hours
    const cutoff = new Date(Date.now() - maxDwell * 60 * 1000);

    return this.prisma.trafficLog.findMany({
      where: {
        zoneId,
        direction: 'ENTRY',
        processedAt: { lt: cutoff },
        exitAt: null,
      },
      orderBy: { processedAt: 'asc' },
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  private async findActivePermit(plate: string, zoneId: string, gateId: string) {
    const normalizedPlate = normalizePlate(plate);
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { zoneId, plateNormalized: normalizedPlate, deletedAt: null },
    });
    if (!vehicle) return null;

    return this.prisma.vehicleAccessPermit.findFirst({
      where: {
        vehicleId: vehicle.id,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getZoneSettings(zoneId: string) {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    return zone;
  }

  private async isWorkingHours(zoneId: string): Promise<boolean> {
    const zone = await this.getZoneSettings(zoneId);
    if (!zone) return false;
    const settings = (zone.settings as any) || {};
    const now = new Date();
    const tehranTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tehran' }));
    const hour = tehranTime.getHours();
    const minute = tehranTime.getMinutes();
    const dayOfWeek = tehranTime.getDay();

    if (settings.weekends?.includes(dayOfWeek)) return false;
    const [startH, startM] = (settings.workingHours?.start || '07:00').split(':').map(Number);
    const [endH, endM] = (settings.workingHours?.end || '18:00').split(':').map(Number);
    const currentTime = hour * 60 + minute;
    return currentTime >= startH * 60 + startM && currentTime <= endH * 60 + endM;
  }

  private registerBullWorkers(): void {
    this.bull.registerWorker('gate-operations', async (job) => {
      switch (job.name) {
        case 'check-overstay': {
          const zones = await this.prisma.zone.findMany({ where: { status: 'ACTIVE', deletedAt: null } });
          for (const zone of zones) {
            const alerts = await this.getOverstayAlerts(zone.id);
            for (const log of alerts) {
              this.gateway.emitToGateAndZone(log.gateId, zone.id, 'vehicle:overstay', {
                plate: log.plate,
                company: log.companyName,
                entryTime: log.processedAt,
                dwellMinutes: Math.round((Date.now() - log.processedAt.getTime()) / (1000 * 60)),
                timestamp: new Date().toISOString(),
              });
            }
          }
          break;
        }
      }
    });
  }
}
