// ═══════════════════════════════════════════════════════════════════════════════
// M9: Email Service — SMTP (nodemailer) + Mailgun fallback
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';

/** Escape HTML special characters to prevent XSS (SEC-007) */
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Validate URL scheme — only allow http/https to prevent javascript: XSS (SEC-007) */
function sanitizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // Reject javascript:, data:, vbscript: etc.
  return '';
}

export interface EmailProviderResult {
  success: boolean;
  provider: string;
  messageId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface NotificationDigestItem {
  module: string;
  titleFa: string;
  bodyFa?: string;
  count: number;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly fromAddress: string;
  private readonly mailgunApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = this.config.get('SMTP_FROM', 'آوان <noreply@avan.ir>');
    this.mailgunApiKey = this.config.get('MAILGUN_API_KEY', '');

    this.registerHandlebarsHelpers();

    // Setup SMTP transporter
    const smtpHost = this.config.get('SMTP_HOST');
    const smtpPort = this.config.get('SMTP_PORT', '587');
    const smtpUser = this.config.get('SMTP_USER');
    const smtpPass = this.config.get('SMTP_PASS');

    if (smtpHost && smtpUser) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === '465',
        auth: { user: smtpUser, pass: smtpPass },
        connectionTimeout: 15000,
      });
    }
  }

  private registerHandlebarsHelpers(): void {
    Handlebars.registerHelper('jalaliDate', (date: Date) => {
      if (!date) return '';
      try {
        const d = new Date(date);
        // Simple Gregorian to Jalali approximation
        const gy = d.getFullYear();
        const gm = d.getMonth() + 1;
        const gd = d.getDate();
        const gd_j = this.gregorianToJalali(gy, gm, gd);
        return `${gd_j[0]}/${String(gd_j[1]).padStart(2, '0')}/${String(gd_j[2]).padStart(2, '0')}`;
      } catch { return String(date); }
    });

    Handlebars.registerHelper('formatNumber', (num: number) => {
      if (num == null) return '۰';
      const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
      return num.toString().replace(/\d/g, (d) => persianDigits[parseInt(d)]);
    });

    Handlebars.registerHelper('currency', (amount: number, currency?: string) => {
      const formatted = new Intl.NumberFormat('fa-IR').format(amount || 0);
      return `${formatted} ${currency || 'ریال'}`;
    });

    Handlebars.registerHelper('truncate', (str: string, len: number) => {
      if (!str) return '';
      return str.length > len ? str.slice(0, len) + '...' : str;
    });
  }

  private gregorianToJalali(gy: number, gm: number, gd: number): number[] {
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    const gy2 = gm > 2 ? gy + 1 : gy;
    let days = 355666 + (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) + gd + g_d_m[gm - 1];
    let jy = -1595 + (33 * Math.floor(days / 12053));
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    let jm: number, jd: number;
    if (days < 186) { jm = 1 + Math.floor(days / 31); jd = 1 + (days % 31); }
    else { jm = 7 + Math.floor((days - 186) / 30); jd = 1 + ((days - 186) % 30); }
    return [jy, jm, jd];
  }

  async send(dto: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    from?: string;
    replyTo?: string;
  }): Promise<EmailProviderResult> {
    if (this.transporter) {
      try {
        return await this.sendViaSmtp(dto);
      } catch (err) {
        this.logger.warn(`SMTP failed: ${err}, trying Mailgun`);
      }
    }

    if (this.mailgunApiKey) {
      return this.sendViaMailgun(dto);
    }

    return { success: false, provider: 'none', errorMessage: 'No email provider configured' };
  }

  async sendViaSmtp(dto: {
    to: string;
    subject: string;
    htmlBody: string;
    textBody?: string;
    from?: string;
  }): Promise<EmailProviderResult> {
    if (!this.transporter) throw new Error('SMTP not configured');

    const info = await this.transporter.sendMail({
      from: dto.from || this.fromAddress,
      to: dto.to,
      subject: dto.subject,
      html: dto.htmlBody,
      text: dto.textBody || dto.subject,
    });

    return { success: true, provider: 'smtp', messageId: info.messageId };
  }

  async sendViaMailgun(dto: {
    to: string;
    subject: string;
    htmlBody: string;
    from?: string;
  }): Promise<EmailProviderResult> {
    const domain = this.config.get('MAILGUN_DOMAIN', '');
    const url = `https://api.mailgun.net/v3/${domain}/messages`;

    const formData = new URLSearchParams();
    formData.append('from', dto.from || this.fromAddress);
    formData.append('to', dto.to);
    formData.append('subject', dto.subject);
    formData.append('html', dto.htmlBody);

    const auth = Buffer.from(`api:${this.mailgunApiKey}`).toString('base64');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Basic ${auth}` },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const data = await response.json() as any;

      if (response.ok) {
        return { success: true, provider: 'mailgun', messageId: data.id };
      }

      return { success: false, provider: 'mailgun', errorCode: String(response.status), errorMessage: data.message };
    } catch (err: any) {
      clearTimeout(timeout);
      throw err;
    }
  }

  async renderEmailTemplate(
    titleFa: string,
    bodyFa: string,
    actionUrl?: string,
  ): Promise<{ subject: string; html: string; text: string }> {
    // SEC-007: Escape all user-provided content to prevent XSS
    const safeTitle = escapeHtml(titleFa);
    const safeBody = escapeHtml(bodyFa || '');
    const safeActionUrl = actionUrl ? sanitizeUrl(actionUrl) : '';
    const actionButtonHtml = safeActionUrl
      ? `<div style="text-align:center;margin:20px 0"><a href="${safeActionUrl}" style="display:inline-block;background:#1a237e;color:#fff;padding:12px 30px;border-radius:6px;text-decoration:none;font-weight:bold">مشاهده جزئیات</a></div>`
      : '';

    const html = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="font-family:Tahoma,Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 10px rgba(0,0,0,0.1)"><div style="background:linear-gradient(135deg,#001050,#0047E1);padding:20px;text-align:center"><h1 style="color:#fff;margin:0;font-size:20px">آوان</h1></div><div style="padding:30px"><h2 style="color:#333;margin-top:0">${safeTitle}</h2><p style="color:#555;line-height:1.8;font-size:14px">${safeBody}</p>${actionButtonHtml}</div><div style="background:#f9f9f9;padding:15px;text-align:center;color:#999;font-size:12px">سامانه یکپارچه مدیریت شهرک‌های صنعتی — آوان (AVAN)</div></div></body></html>`;

    return { subject: titleFa, html, text: `${titleFa}\n${bodyFa || ''}` };
  }

  async sendNotificationEmail(
    to: string,
    titleFa: string,
    bodyFa: string,
    actionUrl?: string,
  ): Promise<EmailProviderResult> {
    const rendered = await this.renderEmailTemplate(titleFa, bodyFa, actionUrl);
    return this.send({ to, subject: rendered.subject, htmlBody: rendered.html, textBody: rendered.text });
  }

  async sendDigestEmail(
    to: string,
    notifications: NotificationDigestItem[],
    date: string,
  ): Promise<EmailProviderResult> {
    // SEC-007: Escape all user content in digest emails too
    const rows = notifications.map(n => `<tr><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(n.module)}</td><td style="padding:8px;border-bottom:1px solid #eee">${escapeHtml(n.titleFa)}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:center">${n.count}</td></tr>`).join('');

    const htmlBody = `<!DOCTYPE html><html dir="rtl" lang="fa"><head><meta charset="UTF-8"></head><body style="font-family:Tahoma,sans-serif;background:#f5f5f5;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;padding:20px"><h2 style="color:#333">خلاصه اعلان‌های ${escapeHtml(date)}</h2><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#1a237e;color:#fff"><th style="padding:8px">ماژول</th><th style="padding:8px">موضوع</th><th style="padding:8px">تعداد</th></tr></thead><tbody>${rows}</tbody></table></div></body></html>`;

    return this.send({ to, subject: `خلاصه اعلان‌ها — ${date}`, htmlBody });
  }
}
