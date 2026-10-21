import { Injectable, Logger } from '@nestjs/common';
import { IdopGateway } from '../../../gateway/idop.gateway';

@Injectable()
export class SignatureGatewayService {
  private readonly logger = new Logger(SignatureGatewayService.name);
  constructor(private readonly gateway: IdopGateway) {}

  emitRequestCreated(data: { signerId: string; requestId: string; documentTitle: string; documentType: string; signerRole: string; deadline?: string; requestedByName: string }): void {
    this.gateway.emitToRoom(`user:${data.signerId}`, 'signature:request:created', data);
  }

  emitSignatureNeeded(data: { signerId: string; requestId: string; documentTitle: string; isRequired: boolean; deadline?: string; order: number }): void {
    this.gateway.emitToRoom(`user:${data.signerId}`, 'signature:needed', data);
  }

  emitSigned(data: { zoneId: string; documentOwner: string; requestId: string; documentTitle: string; signerName: string; signerRole: string; signedAt: Date; isComplete: boolean }): void {
    this.gateway.emitToRoom(`user:${data.documentOwner}`, 'signature:signed', data);
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'signature:signed', data);
  }

  emitDeclined(data: { documentOwner: string; requestId: string; documentTitle: string; signerName: string; reason: string }): void {
    this.gateway.emitToRoom(`user:${data.documentOwner}`, 'signature:declined', data);
  }

  emitCompleted(data: { zoneId: string; documentOwner: string; requestId: string; documentTitle: string; documentType: string; documentId: string; signedBy: string[] }): void {
    this.gateway.emitToRoom(`user:${data.documentOwner}`, 'signature:completed', data);
    this.gateway.emitToRoom(`zone:${data.zoneId}`, 'signature:completed', data);
  }

  emitExpired(data: { documentOwner: string; requestId: string; documentTitle: string; deadline?: string }): void {
    this.gateway.emitToRoom(`user:${data.documentOwner}`, 'signature:expired', data);
  }

  emitReminder(data: { signerId: string; requestId: string; documentTitle: string; deadline?: string; hoursRemaining: number }): void {
    this.gateway.emitToRoom(`user:${data.signerId}`, 'signature:reminder', data);
  }

  emitAgentConnected(data: { userId: string; tokenCount: number; tokens: any[] }): void {
    this.gateway.emitToRoom(`user:${data.userId}:agent`, 'agent:connected', data);
  }

  emitAgentSignRequest(data: { userId: string; requestId: string; dataHash: string; tokenSerial: string }): void {
    this.gateway.emitToRoom(`user:${data.userId}:agent`, 'agent:sign:request', data);
  }

  emitAgentSignResult(data: { userId: string; success: boolean; signature?: string; error?: string }): void {
    this.gateway.emitToRoom(`user:${data.userId}:agent`, 'agent:sign:result', data);
  }
}
