import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../../redis/redis.service';
import { AppException } from '../../../common/exceptions/app.exception';
import { computeSha256Hash, generateAgentToken } from '../utils/signature.utils';
import type { TokenInfo, HardwareSignResult } from '../dto/enums';

@Injectable()
export class HardwareTokenBridgeService {
  private readonly logger = new Logger(HardwareTokenBridgeService.name);

  constructor(private readonly redis: RedisService) {}

  async requestSign(userId: string, tokenSerial: string, dataToSign: Buffer, pinCode: string): Promise<HardwareSignResult> {
    const isConnected = await this.isAgentConnected(userId);
    if (!isConnected) throw new AppException('SIG_AGENT_NOT_CONNECTED');

    const dataHash = computeSha256Hash(dataToSign);
    this.logger.log(`Hardware sign request for user ${userId}, hash: ${dataHash.substring(0, 16)}...`);

    // In production: send to agent WebSocket and wait for response
    // For now, simulate
    return {
      success: true,
      signature: computeSha256Hash(`${dataHash}:${pinCode}:${Date.now()}`),
      certificate: 'HARDWARE_TOKEN_CERT',
    };
  }

  async listTokens(userId: string): Promise<TokenInfo[]> {
    const tokensJson = await this.redis.get(`agent:tokens:${userId}`);
    return tokensJson ? JSON.parse(tokensJson) : [];
  }

  async registerAgentConnection(userId: string): Promise<string> {
    const token = generateAgentToken(userId);
    await this.redis.set(`agent:conn:${userId}`, token, 600);
    this.logger.log(`Agent connected for user ${userId}`);
    return token;
  }

  async isAgentConnected(userId: string): Promise<boolean> {
    const token = await this.redis.get(`agent:conn:${userId}`);
    return !!token;
  }

  async heartbeat(userId: string): Promise<void> {
    const key = `agent:conn:${userId}`;
    const existing = await this.redis.get(key);
    if (existing) {
      await this.redis.set(key, existing, 600);
    }
  }
}
