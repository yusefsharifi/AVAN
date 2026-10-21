declare module 'exceljs' {
  interface Worksheet {
    columns: { header: string; key: string; width: number }[];
    getRow(rowNum: number): Row;
    getCell(ref: string): Cell;
    getCell(row: number, col: number): Cell;
    mergeCells(range: string): void;
    views: { rightToLeft: boolean }[];
  }

  interface Row {
    getCell(col: number): Cell;
    eachCell(callback: (cell: Cell, colNumber: number) => void): void;
  }

  interface Cell {
    value: any;
    numFmt: string;
    font: {
      bold?: boolean;
      size?: number;
      italic?: boolean;
      color?: { argb: string };
    };
    fill: {
      type: string;
      pattern: string;
      fgColor: { argb: string };
    };
    alignment: {
      horizontal?: string;
      vertical?: string;
      wrapText?: boolean;
    };
    border: {
      top?: { style: string; color?: { argb: string } };
      bottom?: { style: string; color?: { argb: string } };
      left?: { style: string; color?: { argb: string } };
      right?: { style: string; color?: { argb: string } };
    };
  }

  interface WorksheetOptions {
    views?: { rightToLeft: boolean }[];
  }

  interface Workbook {
    creator: string;
    created: Date;
    addWorksheet(name: string, options?: WorksheetOptions): Worksheet;
    xlsx: {
      writeBuffer(): Promise<any>;
    };
  }

  const Workbook: {
    new (): Workbook;
  };

  export default {
    Workbook,
  };
}
