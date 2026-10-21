import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { renderInvoiceHtml, InvoiceTemplateData } from '../utils/invoice-template';

@Injectable()
export class InvoicePdfService {
  private readonly logger = new Logger(InvoicePdfService.name);
  private browser: any = null;

  constructor(private readonly config: ConfigService) {}

  /**
   * Lazily launch a shared Puppeteer browser instance.
   * Reuses the same browser across requests for performance.
   */
  private async getBrowser(): Promise<any> {
    if (this.browser && this.browser.connected) {
      return this.browser;
    }

    const puppeteer = await import('puppeteer');
    this.browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none',
      ],
    });

    this.logger.log('Puppeteer browser launched for PDF generation');
    return this.browser;
  }

  /**
   * Generate a PDF buffer from an invoice template data object.
   *
   * @param data - Invoice template data
   * @returns PDF file as a Buffer
   */
  async generatePdf(data: InvoiceTemplateData): Promise<Buffer> {
    const html = renderInvoiceHtml(data);

    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // Wait for fonts to load
      await page.evaluateHandle('document.fonts.ready');

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
        displayHeaderFooter: false,
      });

      return Buffer.from(pdfBuffer);
    } finally {
      await page.close();
    }
  }

  /**
   * Generate a PDF and return it as a base64-encoded string.
   */
  async generatePdfBase64(data: InvoiceTemplateData): Promise<string> {
    const buffer = await this.generatePdf(data);
    return buffer.toString('base64');
  }

  /**
   * Build InvoiceTemplateData from a Prisma Invoice record.
   */
  async buildTemplateData(invoice: any, zone: any): Promise<InvoiceTemplateData> {
    const lines = (invoice.lines || []).map((line: any) => ({
      lineNumber: line.lineNumber,
      description: line.description,
      quantity: Number(line.quantity),
      unit: line.unit || 'عدد',
      unitPrice: Number(line.unitPrice),
      discount: Number(line.discount || 0),
      taxRate: Number(line.taxRate || 9),
      lineSubtotal: Number(line.lineSubtotal),
      lineDiscount: Number(line.lineDiscount),
      lineTax: Number(line.lineTax),
      lineTotal: Number(line.lineTotal),
    }));

    return {
      // Zone info
      zoneName: zone.nameFa || zone.nameEn || 'شهرک صنعتی',
      zoneAddress: zone.address,
      zonePhone: zone.phone,
      zonePostalCode: zone.postalCode,
      zoneNationalId: (zone as any).nationalId,
      zoneEconomicCode: (zone as any).economicCode,
      zoneLogoKey: zone.logoKey,

      // Invoice info
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      invoiceType: this.getInvoiceTypeLabel(invoice.type),
      currencyCode: invoice.currencyCode || 'IRR',

      // Seller (Zone)
      sellerName: zone.nameFa || zone.nameEn || 'شهرک صنعتی',
      sellerNationalId: (zone as any).nationalId,
      sellerAddress: zone.address,
      sellerPhone: zone.phone,
      sellerEconomicCode: (zone as any).economicCode,

      // Buyer (Company)
      buyerName: invoice.partyName,
      buyerNationalId: invoice.partyNationalId,
      buyerAddress: invoice.partyAddress,
      buyerPhone: invoice.partyPhone,
      buyerEconomicCode: invoice.partyCode,

      // Lines
      lines,

      // Totals
      subtotal: Number(invoice.subtotal),
      totalDiscount: Number(invoice.totalDiscount),
      totalTax: Number(invoice.totalTax),
      grandTotal: Number(invoice.grandTotal),
      paidAmount: Number(invoice.paidAmount),
      remainingAmount: Number(invoice.remainingAmount),

      // Payment
      paymentTerms: invoice.paymentTerms,
      paymentMethod: invoice.paymentMethod,

      // Reference
      referenceNumber: invoice.reference,
      notes: invoice.notes,

      // QR
      qrHash: (invoice as any).qrHash,
      verifyUrl: (invoice as any).verifyUrl,
    };
  }

  private getInvoiceTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      WEIGH_SCALE: 'فاکتور باسکول',
      PERMIT_FEE: 'فاکتور مجوز',
      SERVICE_FEE: 'فاکتور خدمات',
      LEASE_RENT: 'فاکتور اجاره',
      COMMERCIAL: 'فاکتور بازرگانی',
      PURCHASE: 'فاکتور خرید',
      PROFORMA: 'پیش‌فاکتور',
      CREDIT_NOTE: 'اعتبارنامه',
      DEBIT_NOTE: 'بدهکارنامه',
    };
    return labels[type] || 'فاکتور';
  }

  async onModuleDestroy() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
