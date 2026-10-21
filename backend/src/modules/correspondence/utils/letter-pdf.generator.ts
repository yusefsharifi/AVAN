// ═══════════════════════════════════════════════════════════════════════════════
// M7: Letter PDF Generator — RTL Persian A4 Document
// ═══════════════════════════════════════════════════════════════════════════════

import { Injectable, Logger } from '@nestjs/common';

export interface LetterPdfData {
  registryNumber: string;
  subject: string;
  body: string;
  senderName: string;
  senderOrgName: string;
  senderRole?: string;
  recipients: Array<{ name: string; orgName: string; role?: string; action: string }>;
  salutation?: string;
  closing?: string;
  signatory?: string;
  signatoryRole?: string;
  enclosuresCount?: number;
  priority: string;
  classification: string;
  qrPayload?: string;
  verifyUrl?: string;
  zoneNameFa: string;
  date: string;
}

@Injectable()
export class LetterPdfGenerator {
  private readonly logger = new Logger(LetterPdfGenerator.name);

  /**
   * Generate official letter PDF using RTL HTML template
   * Returns base64 PDF buffer
   */
  async generatePdf(data: LetterPdfData): Promise<Buffer> {
    const html = this.buildLetterHtml(data);

    // Use puppeteer for RTL PDF generation
    let puppeteer: any;
    try {
      puppeteer = await import('puppeteer');
    } catch {
      this.logger.warn('Puppeteer not available, returning HTML as fallback');
      return Buffer.from(html, 'utf-8');
    }

    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await browser.close();
    }
  }

  /**
   * Build RTL Persian HTML for letter
   */
  buildLetterHtml(data: LetterPdfData): string {
    const recipientsHtml = data.recipients
      .map(
        (r) => `
        <div style="margin-bottom: 8px;">
          <strong>${r.name}</strong>
          ${r.role ? `<span style="color: #666;"> — ${r.role}</span>` : ''}
          <br/>
          <span style="color: #555;">${r.orgName}</span>
          <span style="font-size: 11px; color: #999; margin-right: 8px;">[${r.action}]</span>
        </div>
      `,
      )
      .join('');

    const bodyParagraphs = data.body
      .split('\n')
      .filter((p) => p.trim())
      .map((p) => `<p style="margin: 8px 0; text-align: justify; line-height: 1.8;">${this.escapeHtml(p)}</p>`)
      .join('');

    const classificationBadge = this.getClassificationBadge(data.classification);
    const priorityBadge = this.getPriorityBadge(data.priority);

    return `<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap');
    * { font-family: 'Vazirmatn', 'B Nazanin', 'Tahoma', sans-serif; }
    body { direction: rtl; font-size: 14px; color: #1a1a1a; }
    .letterhead { text-align: center; border-bottom: 3px solid #1a56db; padding-bottom: 15px; margin-bottom: 20px; }
    .zone-name { font-size: 20px; font-weight: bold; color: #1a56db; }
    .letter-info { display: flex; justify-content: space-between; margin: 15px 0; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; background: #f9fafb; }
    .info-item { text-align: center; }
    .info-label { font-size: 11px; color: #6b7280; }
    .info-value { font-size: 15px; font-weight: bold; color: #111827; }
    .recipients-box { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; margin: 15px 0; background: #f9fafb; }
    .subject-line { font-size: 16px; font-weight: bold; color: #1a56db; border-bottom: 2px solid #1a56db; padding-bottom: 8px; margin: 15px 0; }
    .body-content { line-height: 1.8; text-align: justify; }
    .signatory-block { margin-top: 40px; text-align: left; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px; }
    .badge-secret { background: #fecaca; color: #991b1b; }
    .badge-confidential { background: #fed7aa; color: #9a3412; }
    .badge-restricted { background: #fef08a; color: #854d0e; }
    .badge-urgent { background: #fecdd3; color: #be123c; }
    .badge-instant { background: #fecdd3; color: #be123c; }
    .footer { border-top: 1px solid #d1d5db; margin-top: 30px; padding-top: 10px; font-size: 10px; color: #6b7280; display: flex; justify-content: space-between; }
    .qr-section { display: inline-block; margin-top: 10px; }
    .qr-placeholder { width: 80px; height: 80px; border: 1px solid #d1d5db; display: flex; align-items: center; justify-content: center; font-size: 8px; color: #9ca3af; }
    .enclosures { font-size: 12px; color: #6b7280; margin-top: 15px; border-top: 1px dashed #d1d5db; padding-top: 8px; }
    .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 48px; color: rgba(0,0,0,0.03); font-weight: bold; z-index: -1; white-space: nowrap; }
  </style>
</head>
<body>
  <div class="watermark">رونوشت برابر اصل است</div>

  <div class="letterhead">
    <div class="zone-name">${this.escapeHtml(data.zoneNameFa)}</div>
    <div style="font-size: 12px; color: #6b7280;">سامانه مدیریت هوشمند شهرک صنعتی</div>
  </div>

  <div class="letter-info">
    <div class="info-item">
      <div class="info-label">شماره ثبت</div>
      <div class="info-value">${this.escapeHtml(data.registryNumber)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">تاریخ</div>
      <div class="info-value">${this.escapeHtml(data.date)}</div>
    </div>
    <div class="info-item">
      <div class="info-label">طبقه‌بندی</div>
      <div class="info-value">${classificationBadge}</div>
    </div>
    <div class="info-item">
      <div class="info-label">اولویت</div>
      <div class="info-value">${priorityBadge}</div>
    </div>
  </div>

  <div class="recipients-box">
    <div style="font-weight: bold; margin-bottom: 8px;">محترمانه خواهشمند است:</div>
    ${recipientsHtml}
  </div>

  <div class="subject-line">
   موضوع: ${this.escapeHtml(data.subject)}
  </div>

  <div class="body-content">
    ${data.salutation ? `<p>${this.escapeHtml(data.salutation)}</p>` : ''}
    ${bodyParagraphs}
    ${data.closing ? `<p>${this.escapeHtml(data.closing)}</p>` : ''}
  </div>

  ${
    data.enclosuresCount && data.enclosuresCount > 0
      ? `<div class="enclosures">پیوست‌ها: ${data.enclosuresCount} فقره</div>`
      : ''
  }

  <div class="signatory-block">
    ${
      data.signatory
        ? `
      <div style="text-align: left;">
        <div style="font-size: 12px; color: #6b7280;">امضا</div>
        <div style="font-size: 16px; font-weight: bold; margin-top: 30px; border-top: 1px solid #333; padding-top: 5px; display: inline-block; min-width: 150px;">
          ${this.escapeHtml(data.signatory)}
        </div>
        ${data.signatoryRole ? `<div style="font-size: 12px; color: #6b7280; margin-top: 4px;">${this.escapeHtml(data.signatoryRole)}</div>` : ''}
      </div>
    `
        : ''
    }
  </div>

  ${
    data.qrPayload
      ? `
    <div class="qr-section">
      <div class="qr-placeholder">QR</div>
      <div style="font-size: 9px; color: #9ca3af; margin-top: 4px;">برای تأیید اصالت اسکن کنید</div>
    </div>
  `
      : ''
  }

  <div class="footer">
    <div>${data.verifyUrl ? `آدرس تأیید: ${data.verifyUrl}` : ''}</div>
    <div>شماره ثبت: ${this.escapeHtml(data.registryNumber)}</div>
  </div>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  private getClassificationBadge(classification: string): string {
    const badges: Record<string, string> = {
      SECRET: '<span class="badge badge-secret">سری</span>',
      RESTRICTED: '<span class="badge badge-restricted">محرمانه</span>',
      CONFIDENTIAL: '<span class="badge badge-confidential">محرمانه</span>',
      UNCLASSIFIED: '<span class="badge">عادی</span>',
    };
    return badges[classification] || '';
  }

  private getPriorityBadge(priority: string): string {
    const badges: Record<string, string> = {
      INSTANT: '<span class="badge badge-instant">فوری</span>',
      URGENT: '<span class="badge badge-urgent">ضروری</span>',
      NORMAL: '<span class="badge">عادی</span>',
      LOW: '<span class="badge">کم</span>',
    };
    return badges[priority] || '';
  }
}
