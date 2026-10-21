// ═══════════════════════════════════════════════════════════════════════════════
// M7: Auto-Letter Generator — Cross-Module Bridge
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { LetterService } from './letter.service';
import { LetterTemplateService } from './letter-template.service';

export interface AutoGenerateLetterPayload {
  templateCode: string;
  variables: Record<string, string>;
  companyId?: string;
  sourceModule: string;
  sourceEntityId: string;
  sourceEventType: string;
  autoSubmit?: boolean;
  autoDispatch?: boolean;
}

@Injectable()
export class AutoLetterGenerator {
  private readonly logger = new Logger(AutoLetterGenerator.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly letterService: LetterService,
    private readonly templateService: LetterTemplateService,
  ) {}

  // ─── M6 (Permit) Events ──────────────────────────────────────────────────

  async fromPermitSubmitted(permitRequest: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_REQUEST',
      {
        company_name: permitRequest.company?.nameFa || '',
        permit_type: permitRequest.type,
        permit_number: permitRequest.requestNumber,
        requested_from: new Date(permitRequest.requestedFrom).toLocaleDateString('fa-IR'),
        requested_until: new Date(permitRequest.requestedUntil).toLocaleDateString('fa-IR'),
        location: permitRequest.locationDescription || '',
      },
      permitRequest.zoneId,
      permitRequest.companyId,
      'PERMIT',
      permitRequest.id,
      'permit.submitted',
      true,
      false,
    );
  }

  async fromPermitIssued(permit: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_ISSUED',
      {
        company_name: permit.company?.nameFa || '',
        permit_type: permit.type,
        permit_number: permit.permitNumber,
        valid_from: new Date(permit.validFrom).toLocaleDateString('fa-IR'),
        valid_until: new Date(permit.validUntil).toLocaleDateString('fa-IR'),
        conditions_summary: '',
      },
      permit.zoneId,
      permit.companyId,
      'PERMIT',
      permit.id,
      'permit.issued',
      true,
      false,
    );
  }

  async fromPermitRejected(permitRequest: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_REJECTED',
      {
        company_name: permitRequest.company?.nameFa || '',
        permit_type: permitRequest.type,
        rejection_reason: permitRequest.rejectionReason || '',
      },
      permitRequest.zoneId,
      permitRequest.companyId,
      'PERMIT',
      permitRequest.id,
      'permit.rejected',
      true,
      false,
    );
  }

  async fromPermitExpiring(permit: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_ISSUED',
      {
        company_name: permit.company?.nameFa || '',
        permit_type: permit.type,
        permit_number: permit.permitNumber,
        valid_from: new Date(permit.validFrom).toLocaleDateString('fa-IR'),
        valid_until: new Date(permit.validUntil).toLocaleDateString('fa-IR'),
        conditions_summary: 'هشدار: مجوز شما در حال انقضا است',
      },
      permit.zoneId,
      permit.companyId,
      'PERMIT',
      permit.id,
      'permit.expiry',
      true,
      false,
    );
  }

  async fromPermitSuspended(permit: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_REJECTED',
      {
        company_name: permit.company?.nameFa || '',
        permit_type: permit.type,
        rejection_reason: `تعلیق مجوز: ${permit.suspendReason || 'بدون دلیل'}`,
      },
      permit.zoneId,
      permit.companyId,
      'PERMIT',
      permit.id,
      'permit.suspended',
      true,
      false,
    );
  }

  async fromPermitRevoked(permit: any): Promise<any> {
    return this.resolveAndCreate(
      'PERMIT_REJECTED',
      {
        company_name: permit.company?.nameFa || '',
        permit_type: permit.type,
        rejection_reason: `لغو مجوز: ${permit.revokeReason || 'بدون دلیل'}`,
      },
      permit.zoneId,
      permit.companyId,
      'PERMIT',
      permit.id,
      'permit.revoked',
      true,
      false,
    );
  }

  // ─── M4 (Waybill) Events ─────────────────────────────────────────────────

  async fromWaybillApproved(waybill: any): Promise<any> {
    return this.resolveAndCreate(
      'WAYBILL_APPROVED',
      {
        waybill_number: waybill.waybillNumber,
        cargo_description: waybill.cargoDescription,
        cargo_category: waybill.cargoCategory,
        net_weight: waybill.netWeight?.toString() || '',
        vehicle_plate: waybill.vehiclePlate,
      },
      waybill.zoneId,
      waybill.companyId,
      'WAYBILL',
      waybill.id,
      'waybill.approved',
      true,
      false,
    );
  }

  // ─── M5 (Visitor) Events ─────────────────────────────────────────────────

  async fromVisitorApprovedVip(request: any): Promise<any> {
    return this.resolveAndCreate(
      'VISITOR_INVITATION',
      {
        visitor_name: request.visitorName,
        company_name: request.visitorCompany || '',
        visit_date: request.expectedDate,
        visit_time: request.expectedTime,
        meeting_point: request.allowedZones?.join(', ') || '',
        host_name: request.hostName,
        host_phone: request.hostPhone,
      },
      request.zoneId,
      request.companyId,
      'VISITOR',
      request.id,
      'visitor.approved.vip',
      true,
      false,
    );
  }

  // ─── M2 (Company) Events ─────────────────────────────────────────────────

  async fromCompanyActivated(company: any): Promise<any> {
    return this.resolveAndCreate(
      'COMPANY_WELCOME',
      {
        company_name: company.nameFa,
        zone_name: company.zone?.nameFa || '',
        company_registration: company.registrationNumber,
        national_id: company.nationalId,
        plot_code: company.plot?.code || '',
      },
      company.zoneId,
      company.id,
      'ONBOARDING',
      company.id,
      'company.activated',
      true,
      false,
    );
  }

  // ─── M11 (Finance) Events ────────────────────────────────────────────────

  async fromPaymentOverdue(company: any, amount: bigint, daysOverdue: number): Promise<any> {
    return this.resolveAndCreate(
      'COLLECTION_REMINDER',
      {
        company_name: company.nameFa,
        amount: amount.toLocaleString('fa-IR'),
        description: 'مطالبات معوق',
        days_overdue: daysOverdue.toString(),
      },
      company.zoneId,
      company.id,
      'FINANCE',
      company.id,
      'finance.overdue',
      true,
      false,
    );
  }

  // ─── Internal Helper ─────────────────────────────────────────────────────

  private async resolveAndCreate(
    templateCode: string,
    variables: Record<string, string>,
    zoneId: string,
    companyId?: string,
    sourceModule?: string,
    sourceEntityId?: string,
    sourceEventType?: string,
    autoSubmit?: boolean,
    autoDispatch?: boolean,
  ): Promise<any> {
    try {
      const template = await this.templateService.findByCode(templateCode, zoneId);
      if (!template) {
        this.logger.warn(`Template not found: ${templateCode}`);
        return null;
      }

      // Get company context if available
      let company: any = null;
      if (companyId) {
        company = await this.prisma.company.findUnique({ where: { id: companyId } });
      }

      const resolved = this.templateService.resolveVariables(template, variables, { company });

      return this.letterService.createAutoGenerated(
        {
          templateCode,
          variables,
          companyId,
          sourceModule: sourceModule || 'SYSTEM',
          sourceEntityId: sourceEntityId || '',
          sourceEventType: sourceEventType || '',
          autoSubmit,
          autoDispatch,
        },
        zoneId,
      );
    } catch (error) {
      this.logger.error(`Failed to auto-generate letter: ${error.message}`);
      return null;
    }
  }
}
