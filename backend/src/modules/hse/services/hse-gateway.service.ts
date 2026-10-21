import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class HseGatewayService {
  private readonly logger = new Logger(HseGatewayService.name);
  constructor(private readonly gateway: IdopGateway) {}

  emitIncidentReported(data: { zoneId: string; incidentId: string; incidentNumber: string; type: string; severity: string; location: string; occurredAt: Date; reportedByName: string }) {
    this.gateway.emitToZone(data.zoneId, 'incident:reported', {
      incidentId: data.incidentId, incidentNumber: data.incidentNumber,
      type: data.type, severity: data.severity, location: data.location,
      occurredAt: data.occurredAt.toISOString(), reportedByName: data.reportedByName,
      timestamp: new Date().toISOString(),
    });
  }

  emitIncidentCritical(data: { zoneId: string; incidentId: string; type: string; severity: string; location: string }) {
    this.gateway.emitToZone(data.zoneId, 'incident:critical', {
      incidentId: data.incidentId, type: data.type, severity: data.severity,
      location: data.location, timestamp: new Date().toISOString(),
    });
  }

  emitEmergency(data: { zoneId: string; type: string; location: string; details: string; triggeredAt: Date }) {
    this.gateway.emitToZone(data.zoneId, 'hse:emergency', {
      type: data.type, location: data.location, details: data.details,
      triggeredAt: data.triggeredAt.toISOString(), timestamp: new Date().toISOString(),
    });
  }

  emitCapaAssigned(data: { assignedTo: string; capaId: string; actionNumber: string; title: string; priority: string; dueDate: Date }) {
    this.gateway.emitToRoom(`user:${data.assignedTo}`, 'capa:assigned', {
      capaId: data.capaId, actionNumber: data.actionNumber, title: data.title,
      priority: data.priority, dueDate: data.dueDate.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }

  emitCapaOverdue(data: { zoneId: string; assignedTo: string; capaId: string; actionNumber: string; title: string; dueDate: Date; overdueDays: number }) {
    this.gateway.emitToRoom(`user:${data.assignedTo}`, 'capa:overdue', {
      capaId: data.capaId, actionNumber: data.actionNumber, title: data.title,
      dueDate: data.dueDate.toISOString(), overdueDays: data.overdueDays,
      timestamp: new Date().toISOString(),
    });
    this.gateway.emitToZone(data.zoneId, 'capa:overdue', {
      capaId: data.capaId, actionNumber: data.actionNumber,
      title: data.title, overdueDays: data.overdueDays,
      timestamp: new Date().toISOString(),
    });
  }

  emitInspectionScheduled(data: { inspectorId: string; companyId?: string; inspectionId: string; inspectionNumber: string; type: string; scheduledDate: Date; location?: string }) {
    this.gateway.emitToRoom(`user:${data.inspectorId}`, 'inspection:scheduled', {
      inspectionId: data.inspectionId, inspectionNumber: data.inspectionNumber,
      type: data.type, scheduledDate: data.scheduledDate.toISOString(),
      location: data.location, timestamp: new Date().toISOString(),
    });
    if (data.companyId) {
      this.gateway.emitToRoom(`company:${data.companyId}`, 'inspection:scheduled', {
        inspectionId: data.inspectionId, inspectionNumber: data.inspectionNumber,
        type: data.type, scheduledDate: data.scheduledDate.toISOString(),
        timestamp: new Date().toISOString(),
      });
    }
  }

  emitInspectionCompleted(data: { zoneId: string; companyId?: string; inspectionId: string; complianceScore: number; findingsCount: number; criticalFindings: number }) {
    this.gateway.emitToZone(data.zoneId, 'inspection:completed', {
      inspectionId: data.inspectionId, complianceScore: data.complianceScore,
      findingsCount: data.findingsCount, criticalFindings: data.criticalFindings,
      timestamp: new Date().toISOString(),
    });
  }

  emitRiskHighDetected(data: { zoneId: string; assessmentId: string; hazardDescription: string; riskLevel: string; location: string }) {
    this.gateway.emitToZone(data.zoneId, 'risk:high-detected', {
      assessmentId: data.assessmentId, hazardDescription: data.hazardDescription,
      riskLevel: data.riskLevel, location: data.location,
      timestamp: new Date().toISOString(),
    });
  }

  emitTrainingExpiring(data: { companyId: string; recordId: string; planName: string; employeeName: string; expiresAt: Date; daysRemaining: number }) {
    this.gateway.emitToRoom(`company:${data.companyId}`, 'training:expiring', {
      recordId: data.recordId, planName: data.planName, employeeName: data.employeeName,
      expiresAt: data.expiresAt.toISOString(), daysRemaining: data.daysRemaining,
      timestamp: new Date().toISOString(),
    });
  }

  emitEnvironmentalExceedance(data: { zoneId: string; parameter: string; value: number; limit: number; companyName: string; measuredAt: Date }) {
    this.gateway.emitToZone(data.zoneId, 'environmental:exceedance', {
      parameter: data.parameter, value: data.value, limit: data.limit,
      companyName: data.companyName, measuredAt: data.measuredAt.toISOString(),
      timestamp: new Date().toISOString(),
    });
  }
}
