import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/',
})
export class IdopGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(IdopGateway.name);

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('guard:ready')
  handleGuardReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { guardId: string; gateId: string },
  ): void {
    client.join(`gate:${data.gateId}`);
    this.logger.log(`Guard ${data.guardId} joined gate:${data.gateId}`);
  }

  @SubscribeMessage('finance:join')
  handleFinanceJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { zoneId?: string; companyId?: string },
  ): void {
    if (data.zoneId) {
      client.join(`zone:${data.zoneId}`);
      this.logger.log(`Client ${client.id} joined zone:${data.zoneId} for finance events`);
    }
    if (data.companyId) {
      client.join(`company:${data.companyId}`);
      this.logger.log(`Client ${client.id} joined company:${data.companyId} for finance events`);
    }
  }

  // ── Emitting methods ──────────────────────────────────────────────────────

  emitToZone(zoneId: string, event: string, payload: unknown): void {
    this.server?.to(`zone:${zoneId}`).emit(event, payload);
  }

  emitToGate(gateId: string, event: string, payload: unknown): void {
    this.server?.to(`gate:${gateId}`).emit(event, payload);
  }

  emitToGateAndZone(
    gateId: string,
    zoneId: string,
    event: string,
    payload: unknown,
  ): void {
    this.server?.to(`gate:${gateId}`).emit(event, payload);
    this.server?.to(`zone:${zoneId}`).emit(event, payload);
  }

  emitToSuperAdmin(event: string, payload: unknown): void {
    this.server?.to('super-admin').emit(event, payload);
  }

  emitToRoom(room: string, event: string, payload: unknown): void {
    this.server?.to(room).emit(event, payload);
  }

  joinRoom(clientId: string, room: string): void {
    const client = this.server?.sockets?.sockets?.get(clientId);
    client?.join(room);
  }

  joinZone(clientId: string, zoneId: string): void {
    this.joinRoom(clientId, `zone:${zoneId}`);
  }
}
