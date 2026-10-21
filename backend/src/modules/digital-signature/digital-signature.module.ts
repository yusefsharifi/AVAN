import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { GatewayModule } from '../../gateway/gateway.module';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { AuditService } from '../../common/services/audit.service';
import { BullService } from '../../bull/bull.service';

import { CertificateService } from './services/certificate.service';
import { SignatureService } from './services/signature.service';
import { SignatureVerificationService } from './services/verification.service';
import { TimestampService } from './services/timestamp.service';
import { HardwareTokenBridgeService } from './services/hardware-token-bridge.service';
import { SignatureGatewayService } from './services/signature-gateway.service';

import { CertificateController } from './controllers/certificate.controller';
import { SignatureRequestController } from './controllers/signature-request.controller';
import { VerificationController } from './controllers/verification.controller';
import { DocumentSignatureController, BulkSignController } from './controllers/document-signature.controller';
import { TemplateController } from './controllers/template.controller';
import { AgentController } from './controllers/agent.controller';

@Module({
  imports: [GatewayModule],
  controllers: [
    CertificateController, SignatureRequestController, VerificationController,
    DocumentSignatureController, BulkSignController, TemplateController, AgentController,
  ],
  providers: [
    CertificateService, SignatureService, SignatureVerificationService,
    TimestampService, HardwareTokenBridgeService, SignatureGatewayService,
  ],
  exports: [
    CertificateService, SignatureService, SignatureVerificationService,
    TimestampService, HardwareTokenBridgeService, SignatureGatewayService,
  ],
})
export class DigitalSignatureModule implements OnModuleInit {
  private readonly logger = new Logger(DigitalSignatureModule.name);

  constructor(
    private readonly bull: BullService,
    private readonly prisma: PrismaService,
    private readonly certService: CertificateService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing Digital Signature module BullMQ workers...');

    this.bull.registerWorker('digital-signatures', async (job) => {
      this.logger.log(`Processing Digital Signature job: ${job.name}`);
      switch (job.name) {
        case 'send-signing-reminders': await this.processReminders(); break;
        case 'expire-signature-requests': await this.processExpiry(); break;
        case 'check-expiring-certificates': await this.processCertExpiry(); break;
        default: this.logger.warn(`Unknown Digital Signature job: ${job.name}`);
      }
    });

    const queue = this.bull.getQueue('digital-signatures');

    // send-signing-reminders: every hour
    queue.add('send-signing-reminders', {}, { repeat: { pattern: '0 * * * *' } });
    // expire-signature-requests: every hour
    queue.add('expire-signature-requests', {}, { repeat: { pattern: '0 * * * *' } });
    // check-expiring-certificates: daily at 09:00 Tehran (05:30 UTC)
    queue.add('check-expiring-certificates', {}, { repeat: { pattern: '30 5 * * *' } });
  }

  private async processReminders(): Promise<void> {
    this.logger.log('Processing signing reminders...');
    const pending = await this.prisma.signatureRequestSigner.findMany({
      where: { status: { in: ['PENDING', 'NOTIFIED'] } },
      include: { request: true },
    });
    for (const signer of pending) {
      if (signer.request.deadline) {
        const hoursRemaining = (signer.request.deadline.getTime() - Date.now()) / (1000 * 60 * 60);
        if (hoursRemaining < 24 && hoursRemaining > 0) {
          this.logger.log(`Reminder: ${signer.signerId} has ${Math.round(hoursRemaining)}h remaining for ${signer.request.documentTitle}`);
        }
      }
    }
  }

  private async processExpiry(): Promise<void> {
    this.logger.log('Processing expired signature requests...');
    const expired = await this.prisma.signatureRequest.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] }, deadline: { lt: new Date() } },
    });
    for (const req of expired) {
      await this.prisma.signatureRequest.update({
        where: { id: req.id },
        data: { status: 'EXPIRED', cancelReason: 'Deadline passed' },
      });
      this.logger.log(`Expired: ${req.documentTitle}`);
    }
  }

  private async processCertExpiry(): Promise<void> {
    this.logger.log('Checking expiring certificates...');
    const expiring = await this.certService.getExpiringCertificates(30);
    this.logger.log(`Found ${expiring.length} certificates expiring within 30 days`);
  }
}
