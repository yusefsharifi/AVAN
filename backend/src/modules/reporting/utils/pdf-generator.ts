// M18: Reporting & BI — PDF Report Generator
import { Injectable, Logger } from '@nestjs/common';

// eslint-disable-next-line @typescript-eslint/no-var-requires
let PDFDocument: any = null;

@Injectable()
export class PdfReportGenerator {
  private readonly logger = new Logger(PdfReportGenerator.name);

  async generate(
    data: Record<string, unknown>[],
    columns: { header: string; key: string }[],
    options?: {
      title?: string;
      subtitle?: string;
      rtl?: boolean;
    },
  ): Promise<Buffer> {
    try {
      // Try to load pdfkit dynamically
      if (!PDFDocument) {
        try {
          // Use require to avoid TypeScript module resolution issues
          PDFDocument = require('pdfkit');
        } catch {
          this.logger.warn('pdfkit not available, returning empty buffer');
          return Buffer.alloc(0);
        }
      }

      const bufferChunks: Buffer[] = [];

      return await new Promise<Buffer>((resolve, reject) => {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          bufferPages: true,
          info: {
            Title: options?.title || 'گزارش آوان',
            Author: 'AVAN Reporting Engine',
            Creator: 'AVAN',
          },
        });

        doc.on('data', (chunk: Buffer) => bufferChunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(bufferChunks)));
        doc.on('error', reject);

        // Title
        if (options?.title) {
          doc.fontSize(18).font('Helvetica-Bold').text(options.title, {
            align: 'center',
          });
          doc.moveDown(0.5);
        }

        if (options?.subtitle) {
          doc.fontSize(11).font('Helvetica').text(options.subtitle, {
            align: 'center',
          });
          doc.moveDown(1);
        }

        // Date
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`Generated: ${new Date().toISOString().split('T')[0]}`, {
            align: 'right',
          });
        doc.moveDown(1);

        // Table header
        const colWidth = (doc.page.width - 80) / columns.length;
        const startX = 40;

        doc.fontSize(8).font('Helvetica-Bold');
        columns.forEach((col: { header: string; key: string }, i: number) => {
          doc.text(col.header, startX + i * colWidth, doc.y, {
            width: colWidth,
            align: 'center',
          });
        });
        doc.moveDown(0.5);

        // Draw header underline
        doc
          .moveTo(startX, doc.y)
          .lineTo(doc.page.width - 40, doc.y)
          .stroke();
        doc.moveDown(0.5);

        // Table rows
        doc.font('Helvetica').fontSize(8);
        for (const row of data) {
          if (doc.y > doc.page.height - 60) {
            doc.addPage();
          }

          const y = doc.y;
          columns.forEach((col: { header: string; key: string }, i: number) => {
            const val = row[col.key];
            let text = '';
            if (typeof val === 'bigint') {
              text = val.toLocaleString();
            } else if (val === null || val === undefined) {
              text = '-';
            } else {
              text = String(val);
            }
            doc.text(text.substring(0, 40), startX + i * colWidth, y, {
              width: colWidth,
              align: i === 0 ? 'left' : 'right',
            });
          });

          doc.moveDown(0.3);
          doc
            .moveTo(startX, doc.y)
            .lineTo(doc.page.width - 40, doc.y)
            .strokeColor('#CCCCCC')
            .stroke()
            .strokeColor('#000000');
          doc.moveDown(0.3);
        }

        // Footer
        const pageCount = doc.bufferedPageRange();
        for (let i = 0; i < pageCount.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).font('Helvetica').text(
            `Page ${i + 1} of ${pageCount.count}`,
            startX,
            doc.page.height - 30,
            { align: 'center' },
          );
        }

        doc.end();
      });
    } catch (error) {
      this.logger.warn(`PDF generation failed: ${error}`);
      return Buffer.alloc(0);
    }
  }
}
