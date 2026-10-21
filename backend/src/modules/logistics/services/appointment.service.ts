import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../redis/redis.service';
import { AuditService } from '../../../common/services/audit.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { normalizePlate } from '../../../common/utils/plate-normalizer';
import { generateQrPayload } from '../../../common/utils/qr-generator';
import { AppointmentStatus, ShipmentDirection } from '@prisma/client';
import { CreateAppointmentDto } from '../dto/create-appointment.dto';
import { RescheduleAppointmentDto } from '../dto/reschedule-appointment.dto';
import { FilterAppointmentsDto } from '../dto/filter-appointments.dto';

interface PaginatedResult<T> {
  data: T[];
  meta: { total: number; nextCursor?: string };
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly audit: AuditService,
  ) {}

  // ─────────────────────────────────────────────────────
  // CREATE
  // ─────────────────────────────────────────────────────
  async create(dto: CreateAppointmentDto, createdBy: string): Promise<any> {
    // 1. Validate scheduledDate is not in the past
    const scheduledDateTime = new Date(`${dto.scheduledDate}T${dto.scheduledTime}:00+03:30`);
    if (scheduledDateTime < new Date()) {
      throw new AppException('APPOINTMENT_INVALID_DATE');
    }

    // 2. Check if date is a zone holiday
    const holiday = await this.prisma.zoneHoliday.findUnique({
      where: { zoneId_date: { zoneId: dto.zoneId, date: dto.scheduledDate } },
    });
    if (holiday) {
      throw new AppException('APPOINTMENT_HOLIDAY');
    }

    // 3. Check gate capacity for that date+time slot
    const slotFull = await this.checkSlotCapacity(
      dto.zoneId,
      dto.scheduledGateId,
      dto.scheduledDate,
      dto.scheduledTime,
    );
    if (slotFull) {
      throw new AppException('APPOINTMENT_SLOT_FULL');
    }

    // 4. Check dock availability
    if (dto.scheduledDockId) {
      const dock = await this.prisma.dock.findUnique({ where: { id: dto.scheduledDockId } });
      if (!dock || !dock.isAvailable) {
        throw new AppException('APPOINTMENT_DOCK_UNAVAILABLE');
      }
    }

    // 5. Get zone code for appointment number
    const zone = await this.prisma.zone.findUnique({ where: { id: dto.zoneId } });
    if (!zone) throw new AppException('ZONE_NOT_FOUND');

    // 6. Generate appointment number
    const dateStr = dto.scheduledDate.replace(/-/g, '');
    const seqKey = `appointment:seq:${dto.zoneId}:${dateStr}`;
    const seq = await this.redis.incr(seqKey);
    if (seq === 1) {
      await this.redis.set(seqKey, '1', 172800); // 2 days
    }
    const appointmentNumber = `APT-${zone.code}-${dateStr}-${String(seq).padStart(4, '0')}`;

    // 7. Generate QR code for driver
    const qrPayload = generateQrPayload(
      'VISITOR',
      appointmentNumber,
      dto.zoneId,
      process.env.QR_SECRET || 'idop-default-secret',
    );

    // 8. Create appointment
    const normalizedPlate = normalizePlate(dto.vehiclePlate);
    const appointment = await this.prisma.truckAppointment.create({
      data: {
        zoneId: dto.zoneId,
        companyId: dto.companyId,
        waybillId: dto.waybillId,
        appointmentNumber,
        vehiclePlate: normalizedPlate,
        vehicleType: dto.vehicleType,
        driverName: dto.driverName,
        driverPhone: dto.driverPhone,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
        scheduledGateId: dto.scheduledGateId,
        scheduledDockId: dto.scheduledDockId,
        status: 'PENDING',
        direction: dto.direction,
        cargoSummary: dto.cargoSummary,
        estimatedDuration: dto.estimatedDuration,
        qrCode: qrPayload,
        notes: dto.notes,
        createdBy,
      },
    });

    // 9. Link to waybill if provided
    if (dto.waybillId) {
      await this.prisma.waybill.update({
        where: { id: dto.waybillId },
        data: {
          appointmentId: appointment.id,
          status: 'SCHEDULED',
          scheduledGateId: dto.scheduledGateId,
        },
      });
    }

    // 10. Create audit log
    await this.audit.log({
      zoneId: dto.zoneId,
      userId: createdBy,
      targetId: appointment.id,
      targetType: 'TruckAppointment',
      action: 'APPOINTMENT_CREATED',
      metadata: {
        appointmentNumber,
        scheduledDate: dto.scheduledDate,
        scheduledTime: dto.scheduledTime,
        vehiclePlate: normalizedPlate,
      },
    });

    this.logger.log(`Appointment created: ${appointmentNumber} for ${dto.scheduledDate} ${dto.scheduledTime}`);
    return appointment;
  }

  // ─────────────────────────────────────────────────────
  // AVAILABLE SLOTS
  // ─────────────────────────────────────────────────────
  async getAvailableSlots(
    zoneId: string,
    gateId: string,
    date: string,
    direction: ShipmentDirection,
  ): Promise<any> {
    // Check cache first
    const cacheKey = `slots:${zoneId}:${gateId}:${date}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    // Get gate info
    const gate = await this.prisma.gate.findUnique({ where: { id: gateId } });
    if (!gate) throw new AppException('GATE_NOT_FOUND');

    // Get zone settings for working hours
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    const settings = (zone?.settings as any) || {};
    const workingHours = settings.workingHours || { start: '07:00', end: '18:00' };
    const maxPerSlot = settings.maxAppointmentsPerSlot || 5;

    // Generate 30-minute slots
    const slots: { time: string; available: number; total: number }[] = [];
    const startHour = parseInt(workingHours.start.split(':')[0], 10);
    const endHour = parseInt(workingHours.end.split(':')[0], 10);

    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += 30) {
        const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

        // Count existing appointments for this slot
        const count = await this.prisma.truckAppointment.count({
          where: {
            zoneId,
            scheduledGateId: gateId,
            scheduledDate: date,
            scheduledTime: time,
            status: { notIn: ['CANCELLED', 'NO_SHOW'] },
          },
        });

        slots.push({
          time,
          available: Math.max(0, maxPerSlot - count),
          total: maxPerSlot,
        });
      }
    }

    const result = { date, gate, slots };

    // Cache for 2 minutes
    await this.redis.set(cacheKey, JSON.stringify(result), 120);

    return result;
  }

  // ─────────────────────────────────────────────────────
  // FIND ALL
  // ─────────────────────────────────────────────────────
  async findAll(zoneId: string, filter: FilterAppointmentsDto): Promise<PaginatedResult<any>> {
    const limit = filter.limit ?? 20;
    const where: any = { zoneId };

    if (filter.companyId) where.companyId = filter.companyId;
    if (filter.status) where.status = filter.status;
    if (filter.direction) where.direction = filter.direction;
    if (filter.vehiclePlate) {
      where.vehiclePlate = { contains: normalizePlate(filter.vehiclePlate) };
    }
    if (filter.cursor) {
      where.createdAt = { lt: new Date(filter.cursor) };
    }

    const [data, total] = await Promise.all([
      this.prisma.truckAppointment.findMany({
        where,
        orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
        take: limit + 1,
      }),
      this.prisma.truckAppointment.count({ where: { zoneId, ...(filter.companyId && { companyId: filter.companyId }) } }),
    ]);

    const hasMore = data.length > limit;
    const items = hasMore ? data.slice(0, limit) : data;
    const nextCursor = hasMore ? items[items.length - 1]?.createdAt.toISOString() : undefined;

    return { data: items, meta: { total, nextCursor } };
  }

  // ─────────────────────────────────────────────────────
  // FIND BY ID
  // ─────────────────────────────────────────────────────
  async findById(id: string): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({
      where: { id },
      include: { waybill: true, zone: true, company: true },
    });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');
    return appointment;
  }

  // ─────────────────────────────────────────────────────
  // FIND BY DATE
  // ─────────────────────────────────────────────────────
  async findByDate(zoneId: string, date: string, gateId?: string): Promise<any[]> {
    const where: any = { zoneId, scheduledDate: date };
    if (gateId) where.scheduledGateId = gateId;

    return this.prisma.truckAppointment.findMany({
      where,
      orderBy: { scheduledTime: 'asc' },
      include: { company: { select: { nameFa: true } } },
    });
  }

  // ─────────────────────────────────────────────────────
  // RESCHEDULE
  // ─────────────────────────────────────────────────────
  async reschedule(
    id: string,
    dto: RescheduleAppointmentDto,
    rescheduledBy: string,
  ): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({ where: { id } });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');

    const cancellableStatuses: AppointmentStatus[] = ['PENDING', 'CONFIRMED'];
    if (!cancellableStatuses.includes(appointment.status)) {
      throw new AppException('APPOINTMENT_CANNOT_CANCEL');
    }

    // Check new slot availability
    const gateId = dto.newGateId || appointment.scheduledGateId;
    const slotFull = await this.checkSlotCapacity(
      appointment.zoneId,
      gateId,
      dto.newDate,
      dto.newTime,
    );
    if (slotFull) throw new AppException('APPOINTMENT_SLOT_FULL');

    const updated = await this.prisma.truckAppointment.update({
      where: { id },
      data: {
        scheduledDate: dto.newDate,
        scheduledTime: dto.newTime,
        scheduledGateId: gateId,
        scheduledDockId: dto.newDockId || appointment.scheduledDockId,
        status: 'RESCHEDULED',
      },
    });

    await this.audit.log({
      zoneId: appointment.zoneId,
      userId: rescheduledBy,
      targetId: id,
      targetType: 'TruckAppointment',
      action: 'APPOINTMENT_RESCHEDULED',
      metadata: { reason: dto.reason, newDate: dto.newDate, newTime: dto.newTime },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // CANCEL
  // ─────────────────────────────────────────────────────
  async cancel(id: string, reason: string, cancelledBy: string): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({ where: { id } });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');

    const cancellableStatuses: AppointmentStatus[] = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];
    if (!cancellableStatuses.includes(appointment.status)) {
      throw new AppException('APPOINTMENT_CANNOT_CANCEL');
    }

    const updated = await this.prisma.truckAppointment.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
    });

    // Unlink waybill if any
    if (appointment.waybillId) {
      await this.prisma.waybill.update({
        where: { id: appointment.waybillId },
        data: { appointmentId: null, status: 'APPROVED' },
      });
    }

    await this.audit.log({
      zoneId: appointment.zoneId,
      userId: cancelledBy,
      targetId: id,
      targetType: 'TruckAppointment',
      action: 'APPOINTMENT_CANCELLED',
      metadata: { reason },
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // MARK ARRIVED
  // ─────────────────────────────────────────────────────
  async markArrived(id: string, trafficLogId: string): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({ where: { id } });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');

    return this.prisma.truckAppointment.update({
      where: { id },
      data: { status: 'ARRIVED', arrivedAt: new Date() },
    });
  }

  // ─────────────────────────────────────────────────────
  // MARK COMPLETED
  // ─────────────────────────────────────────────────────
  async markCompleted(id: string): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({ where: { id } });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');

    const updated = await this.prisma.truckAppointment.update({
      where: { id },
      data: { status: 'COMPLETED', completedAt: new Date() },
    });

    await this.audit.log({
      zoneId: appointment.zoneId,
      targetId: id,
      targetType: 'TruckAppointment',
      action: 'APPOINTMENT_COMPLETED',
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // MARK NO SHOW
  // ─────────────────────────────────────────────────────
  async markNoShow(id: string): Promise<any> {
    const appointment = await this.prisma.truckAppointment.findUnique({ where: { id } });
    if (!appointment) throw new AppException('APPOINTMENT_NOT_FOUND');

    const updated = await this.prisma.truckAppointment.update({
      where: { id },
      data: { status: 'NO_SHOW', noShowAt: new Date() },
    });

    await this.audit.log({
      zoneId: appointment.zoneId,
      targetId: id,
      targetType: 'TruckAppointment',
      action: 'APPOINTMENT_NO_SHOW',
    });

    return updated;
  }

  // ─────────────────────────────────────────────────────
  // DAILY SCHEDULE
  // ─────────────────────────────────────────────────────
  async getDailySchedule(zoneId: string, date: string): Promise<any> {
    const appointments = await this.prisma.truckAppointment.findMany({
      where: { zoneId, scheduledDate: date },
      orderBy: [{ scheduledTime: 'asc' }],
      include: {
        company: { select: { nameFa: true } },
      },
    });

    // Group by gate and hour
    const grouped: Record<string, Record<string, any[]>> = {};
    for (const apt of appointments) {
      const gateCode = apt.scheduledGateId || 'unknown';
      const hour = apt.scheduledTime.split(':')[0];
      if (!grouped[gateCode]) grouped[gateCode] = {};
      if (!grouped[gateCode][hour]) grouped[gateCode][hour] = [];
      grouped[gateCode][hour].push(apt);
    }

    return { date, zoneId, schedule: grouped, total: appointments.length };
  }

  // ─────────────────────────────────────────────────────
  // STATS
  // ─────────────────────────────────────────────────────
  async getAppointmentStats(zoneId: string, fromDate: string, toDate: string): Promise<any> {
    const where: any = {
      zoneId,
      scheduledDate: { gte: fromDate, lte: toDate },
    };

    const [total, completed, noShow, cancelled, byGate, byCompany] = await Promise.all([
      this.prisma.truckAppointment.count({ where }),
      this.prisma.truckAppointment.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.truckAppointment.count({ where: { ...where, status: 'NO_SHOW' } }),
      this.prisma.truckAppointment.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.truckAppointment.groupBy({
        by: ['scheduledGateId'],
        where,
        _count: true,
      }),
      this.prisma.truckAppointment.groupBy({
        by: ['companyId'],
        where,
        _count: true,
        orderBy: { _count: { companyId: 'desc' } },
        take: 10,
      }),
    ]);

    const onTimeRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      noShow,
      cancelled,
      onTimeRate,
      byGate: Object.fromEntries(byGate.map((r) => [r.scheduledGateId, r._count])),
      byCompany: byCompany.map((r) => ({ companyId: r.companyId, count: r._count })),
      avgArrivalDelayMin: 0,
      byHour: new Array(24).fill(0),
    };
  }

  // ─────────────────────────────────────────────────────
  // UTILS
  // ─────────────────────────────────────────────────────
  private async checkSlotCapacity(
    zoneId: string,
    gateId: string,
    date: string,
    time: string,
  ): Promise<boolean> {
    const zone = await this.prisma.zone.findUnique({ where: { id: zoneId } });
    const settings = (zone?.settings as any) || {};
    const maxPerSlot = settings.maxAppointmentsPerSlot || 5;

    const count = await this.prisma.truckAppointment.count({
      where: {
        zoneId,
        scheduledGateId: gateId,
        scheduledDate: date,
        scheduledTime: time,
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
    });

    return count >= maxPerSlot;
  }
}
