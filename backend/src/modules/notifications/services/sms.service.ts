// ═══════════════════════════════════════════════════════════════════════════════
// M9: SMS Service — KaveNegar (primary) + Melipayamak (fallback)
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { AppException } from '../../../common/exceptions/app.exception';

export interface SmsProviderResult {
  success: boolean;
  provider: string;
  messageId?: string;
  cost?: number;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly kavenegarApiKey: string;
  private readonly melipayamakUsername: string;
  private readonly melipayamakPassword: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.kavenegarApiKey = this.config.get('KAVENEGAR_API_KEY', '');
    this.melipayamakUsername = this.config.get('MELIPAYAMAK_USERNAME', '');
    this.melipayamakPassword = this.config.get('MELIPAYAMAK_PASSWORD', '');

    // COMP-005: Log SMS provider configuration status at startup
    if (!this.kavenegarApiKey && !this.melipayamakUsername) {
      this.logger.warn('COMP-005: No SMS providers configured. SMS delivery will fail. Set KAVENEGAR_API_KEY or MELIPAYAMAK_USERNAME.');
    } else {
      const providers: string[] = [];
      if (this.kavenegarApiKey) providers.push('KaveNegar');
      if (this.melipayamakUsername) providers.push('MeliPayamak');
      this.logger.log(`SMS providers configured: ${providers.join(', ')}`);
    }
  }

  async send(
    phone: string,
    message: string,
    templateId?: string,
    params?: Record<string, string>,
  ): Promise<SmsProviderResult> {
    const normalized = this.validateIranianPhone(phone);

    // Try KaveNegar first
    if (this.kavenegarApiKey) {
      try {
        const result = await this.sendViaKaveNegar(normalized, message, { templateId, params });
        await this.logSms('kavenegar', normalized, message, result);
        return result;
      } catch (err) {
        this.logger.warn(`KaveNegar failed for ${normalized}, trying Melipayamak: ${err}`);
      }
    }

    // Fallback to Melipayamak
    if (this.melipayamakUsername) {
      try {
        const result = await this.sendViaMelipayamak(normalized, message);
        await this.logSms('melipayamak', normalized, message, result);
        return result;
      } catch (err) {
        this.logger.error(`Melipayamak also failed for ${normalized}: ${err}`);
      }
    }

    // Both providers failed
    await this.logSms('none', normalized, message, {
      success: false,
      provider: 'none',
      errorCode: 'PROVIDERS_UNAVAILABLE',
      errorMessage: 'All SMS providers unavailable',
    });

    return { success: false, provider: 'none', errorCode: 'PROVIDERS_UNAVAILABLE', errorMessage: 'All SMS providers unavailable' };
  }

  async sendViaKaveNegar(
    phone: string,
    message: string,
    options?: { templateId?: string; params?: Record<string, string> },
  ): Promise<SmsProviderResult> {
    const receptor = phone.replace(/^0/, '98');

    let url: string;
    let body: any;

    // SEC-014: Build URL with API key — KaveNegar requires API key in URL path.
    // We redact it from any logs/errors below.
    if (options?.templateId && options.params) {
      // Template SMS
      const paramsStr = Object.entries(options.params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
      url = `https://api.kavenegar.com/v1/${this.kavenegarApiKey}/verify/lookup.json?receptor=${receptor}&token=${options.templateId}&${paramsStr}`;
      body = null;
    } else {
      // Simple SMS
      url = `https://api.kavenegar.com/v1/${this.kavenegarApiKey}/sms/send.json`;
      body = JSON.stringify({ receptor, message });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json() as any;

      if (data.return?.status === 200) {
        return {
          success: true,
          provider: 'kavenegar',
          messageId: data.entries?.[0]?.messageid?.toString(),
        };
      }

      return {
        success: false,
        provider: 'kavenegar',
        errorCode: data.return?.status?.toString(),
        errorMessage: data.return?.message || 'KaveNegar error',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      // SEC-014: Never expose API key in error messages
      throw new Error(`KaveNegar SMS request failed: ${err.message || 'unknown error'}`);
    }
  }

  async sendViaMelipayamak(
    phone: string,
    message: string,
  ): Promise<SmsProviderResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch('https://rest.payamak-panel.com/api/SendSMS/SMS', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.melipayamakUsername,
          password: this.melipayamakPassword,
          to: phone,
          from: '',
          text: message,
          isflash: false,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json() as any;

      if (data.RetStatus === 1) {
        return {
          success: true,
          provider: 'melipayamak',
          messageId: data.Items?.[0]?.RecId?.toString(),
        };
      }

      return {
        success: false,
        provider: 'melipayamak',
        errorCode: data.RetStatus?.toString(),
        errorMessage: data.Message || 'Melipayamak error',
      };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  validateIranianPhone(phone: string): string {
    let normalized = phone.trim();
    // Remove +98, 0098, 98 prefixes
    if (normalized.startsWith('+98')) normalized = '0' + normalized.slice(3);
    else if (normalized.startsWith('0098')) normalized = '0' + normalized.slice(4);
    else if (normalized.startsWith('98')) normalized = '0' + normalized.slice(2);
    else if (!normalized.startsWith('0')) normalized = '0' + normalized;

    if (!/^09\d{9}$/.test(normalized)) {
      throw new AppException('SMS_INVALID_PHONE');
    }

    return normalized;
  }

  async getSmsBalance(): Promise<{ kavenegar: number; melipayamak: number }> {
    let kavenegarBalance = 0;
    let melipayamakBalance = 0;

    if (this.kavenegarApiKey) {
      try {
        const res = await fetch(`https://api.kavenegar.com/v1/${this.kavenegarApiKey}/account/info.json`);
        const data = await res.json() as any;
        kavenegarBalance = data?.statistic?.remaincredit || 0;
      } catch { /* ignore */ }
    }

    if (this.melipayamakUsername) {
      try {
        const res = await fetch('https://rest.payamak-panel.com/api/Package/GetRemainCredit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: this.melipayamakUsername, password: this.melipayamakPassword }),
        });
        const data = await res.json() as any;
        melipayamakBalance = data?.Value || 0;
      } catch { /* ignore */ }
    }

    return { kavenegar: kavenegarBalance, melipayamak: melipayamakBalance };
  }

  private async logSms(
    provider: string,
    recipient: string,
    message: string,
    result: SmsProviderResult,
  ): Promise<void> {
    try {
      // SEC-008: Mask OTP codes and sensitive data in SMS logs
      // Never store plaintext OTP — replace 6-digit codes with masked version
      const maskedMessage = message.replace(
        /\b(\d{6})\b/g,
        (_, code: string) => `${code.substring(0, 2)}****`,
      );

      await this.prisma.smsProviderLog.create({
        data: {
          provider,
          messageId: result.messageId || null,
          recipient,
          message: maskedMessage,
          status: result.success ? 'SENT' : 'FAILED',
          cost: result.cost || null,
          errorCode: result.errorCode || null,
          errorMessage: result.errorMessage || null,
        },
      });
    } catch (err) {
      this.logger.error('Failed to log SMS', err);
    }
  }
}
