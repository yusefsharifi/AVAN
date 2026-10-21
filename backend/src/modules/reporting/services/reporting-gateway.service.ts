// M18: Reporting & BI — Gateway service (Socket.io events)
import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ReportingGatewayService {
  private server!: Server;
  private readonly logger = new Logger(ReportingGatewayService.name);

  setServer(server: Server): void {
    this.server = server;
  }

  emitExecutionStarted(
    userId: string,
    payload: {
      executionId: string;
      reportCode: string;
      reportTitle: string;
    },
  ): void {
    this.server?.to(`user:${userId}`).emit('report:execution:started', payload);
  }

  emitExecutionCompleted(
    userId: string,
    payload: {
      executionId: string;
      rowCount: number;
      fileKey?: string;
      downloadUrl?: string;
      duration: number;
    },
  ): void {
    this.server
      ?.to(`user:${userId}`)
      .emit('report:execution:completed', payload);
  }

  emitExecutionFailed(
    userId: string,
    payload: { executionId: string; errorMessage: string },
  ): void {
    this.server?.to(`user:${userId}`).emit('report:execution:failed', payload);
  }

  emitWidgetRefresh(
    userId: string,
    dashboardCode: string,
    payload: { widgetId: string; data: unknown; refreshedAt: Date },
  ): void {
    this.server
      ?.to(`user:${userId}:dashboard:${dashboardCode}`)
      .emit('dashboard:widget:refresh', payload);
  }

  emitSnapshotCompleted(
    zoneId: string,
    payload: { date: string; modulesProcessed: number },
  ): void {
    this.server?.to(`zone:${zoneId}`).emit('metrics:snapshot:completed', payload);
  }

  emitKpiAlert(
    zoneId: string,
    payload: {
      kpiCode: string;
      module: string;
      target: number;
      actual: number;
      progressPercent: number;
      isAtRisk: boolean;
    },
  ): void {
    this.server?.to(`zone:${zoneId}`).emit('kpi:target:alert', payload);
  }

  emitReportProgress(
    userId: string,
    payload: { executionId: string; progressPercent: number; message: string },
  ): void {
    this.server?.to(`user:${userId}`).emit('report:execution:progress', payload);
  }
}
