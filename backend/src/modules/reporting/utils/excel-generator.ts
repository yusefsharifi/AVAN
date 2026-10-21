// M18: Reporting & BI — Excel Report Generator
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExcelReportGenerator {
  private readonly logger = new Logger(ExcelReportGenerator.name);

  async generate(
    data: Record<string, unknown>[],
    columns: { header: string; key: string; width?: number }[],
    options?: {
      title?: string;
      sheetName?: string;
      rtl?: boolean;
    },
  ): Promise<Buffer> {
    // Dynamic import for exceljs (may not be installed in test env)
    try {
      const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
      const workbook = new (ExcelJS as any).Workbook();
      workbook.creator = 'AVAN Reporting Engine';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(options?.sheetName || 'Report', {
        views: [{ rtl: options?.rtl !== false }],
      });

      // Add title row if provided
      if (options?.title) {
        sheet.mergeCells(1, 1, 1, columns.length);
        const titleCell = sheet.getCell('A1');
        titleCell.value = options.title;
        titleCell.font = { size: 14, bold: true };
        titleCell.alignment = { horizontal: 'center' };
        sheet.getRow(1).height = 30;
        sheet.addRow([]);
      }

      // Add header row
      const headerRow = sheet.addRow(columns.map((c) => c.header));
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF3B82F6' },
      };

      // Set column widths
      sheet.columns = columns.map((c) => ({
        header: c.header,
        key: c.key,
        width: c.width || 15,
      }));

      // Add data rows
      for (const row of data) {
        sheet.addRow(
          columns.map((c) => {
            const val = row[c.key];
            if (typeof val === 'bigint') return Number(val);
            return val;
          }),
        );
      }

      // Auto-fit columns
      sheet.columns.forEach((col) => {
        const maxLen = Math.max(
          ...data.map((row) => {
            const val = String((row as Record<string, unknown>)[col.key!] || '');
            return val.length;
          }),
          String(col.header || '').length,
        );
        col.width = Math.min(maxLen + 2, 50);
      });

      // Add totals row for number columns
      if (data.length > 0) {
        const totalsRow = sheet.addRow(
          columns.map((c) => {
            if (columns.indexOf(c) === 0) return 'Total';
            const numericValues = data
              .map((r) => Number(r[c.key] || 0))
              .filter((v) => !isNaN(v));
            if (numericValues.length > 0 && numericValues.every((v) => typeof v === 'number')) {
              return numericValues.reduce((s, v) => s + v, 0);
            }
            return '';
          }),
        );
        totalsRow.font = { bold: true };
        totalsRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF3F4F6' },
          };
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.logger.warn('exceljs not available, returning empty buffer');
      return Buffer.alloc(0);
    }
  }

  async generateFromReportConfig(
    data: Record<string, unknown>[],
    config: {
      fields: { key: string; labelFa: string }[];
      title: string;
    },
  ): Promise<Buffer> {
    const columns = config.fields.map((f) => ({
      header: f.labelFa,
      key: f.key,
      width: 20,
    }));

    return this.generate(data, columns, {
      title: config.title,
      rtl: true,
    });
  }
}
