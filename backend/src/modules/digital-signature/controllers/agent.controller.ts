import { RequirePermission } from '../../../common/decorators/permissions.decorator';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../../../common/guards/jwt.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { ZoneGuard } from '../../../common/guards/zone.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { HardwareTokenBridgeService } from '../services/hardware-token-bridge.service';

@Controller('/signatures/agent')
@UseGuards(JwtGuard, ZoneGuard, RolesGuard, PermissionsGuard)
export class AgentController {
  constructor(private readonly agentService: HardwareTokenBridgeService) {}

  @Get('status')
  @RequirePermission('digital-signature.agent.list.view')
  async getStatus(@Query('userId') userId: string) {
    const connected = await this.agentService.isAgentConnected(userId);
    return { data: { connected } };
  }

  @Get('tokens')
  @RequirePermission('digital-signature.agent.list.view')
  async getTokens(@Query('userId') userId: string) {
    const tokens = await this.agentService.listTokens(userId);
    return { data: tokens };
  }
}
