import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { computeSha256Hash } from '../utils/signature.utils';
import type { TimestampResult, TimestampVerificationResult } from '../dto/enums';

@Injectable()
export class TimestampService {
  private readonly logger = new Logger(TimestampService.name);
  private readonly defaultTsaUrl = 'https://freetsa.org/tsr';

  constructor(private readonly prisma: PrismaService) {}

  async getTimestamp(dataToTimestamp: Buffer | string): Promise<TimestampResult> {
    const hash = computeSha256Hash(dataToTimestamp);
    this.logger.log(`Requesting TSA timestamp for hash: ${hash.substring(0, 16)}...`);

    // In production, make HTTP POST to TSA with TimeStampReq
    // For now, create a simulated timestamp
    const now = new Date();
    const token = computeSha256Hash(`${hash}:${now.toISOString()}:TSA`);

    return {
      token,
      signedAt: now,
      tsaName: 'FreeTSA',
    };
  }

  async verifyTimestamp(timestampToken: string, originalData: string): Promise<TimestampVerificationResult> {
    // In production, decode and verify the TSA token
    return {
      valid: !!timestampToken,
      signedAt: new Date(),
      tsaName: 'FreeTSA',
    };
  }

  async getSystemTsaUrl(): Promise<string> {
    return this.defaultTsaUrl;
  }
}
