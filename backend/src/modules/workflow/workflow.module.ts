// ═══════════════════════════════════════════════════════════════════════════════
// WorkflowModule — M8: Workflow Engine
// ═══════════════════════════════════════════════════════════════════════════════

import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { RedisModule } from '../../redis/redis.module';
import { WorkflowDefinitionService } from './services/workflow-definition.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { WorkflowSlaService } from './services/workflow-sla.service';
import { WorkflowIntegrationService } from './services/workflow-integration.service';
import { WorkflowDefinitionController } from './controllers/workflow-definition.controller';
import { WorkflowInstanceController } from './controllers/workflow-instance.controller';
import { WorkflowTaskController } from './controllers/workflow-task.controller';
import { WorkflowSlaController } from './controllers/workflow-sla.controller';
import { WorkflowMetricsController } from './controllers/workflow-metrics.controller';

@Module({
  imports: [PrismaModule, RedisModule, EventEmitterModule.forRoot()],
  controllers: [
    WorkflowDefinitionController,
    WorkflowInstanceController,
    WorkflowTaskController,
    WorkflowSlaController,
    WorkflowMetricsController,
  ],
  providers: [
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowSlaService,
    WorkflowIntegrationService,
  ],
  exports: [
    WorkflowDefinitionService,
    WorkflowEngineService,
    WorkflowSlaService,
    WorkflowIntegrationService,
  ],
})
export class WorkflowModule implements OnModuleInit {
  private readonly logger = new Logger(WorkflowModule.name);

  constructor(private readonly definitionService: WorkflowDefinitionService) {}

  async onModuleInit() {
    try {
      const result = await this.definitionService.seedSystemDefinitions();
      this.logger.log(
        `Workflow seed: ${result.created} created, ${result.skipped} skipped`,
      );
    } catch (err) {
      this.logger.warn('Workflow seed skipped (DB may not be ready)');
    }
  }
}
