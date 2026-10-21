import { computeSha256Hash } from './signature.utils';

export interface EmbeddedSignatureInfo {
  page: number;
  bounds: { x: number; y: number; width: number; height: number };
  signerName: string;
  signedAt: Date;
}

export class PdfSignatureEmbedder {
  async addVisualSignatureBlock(
    pdfBuffer: Buffer,
    signerName: string,
    signerRole: string,
    signedAt: Date,
    qrHash: string,
    page?: number,
    x?: number,
    y?: number,
  ): Promise<Buffer> {
    // In production: use pdf-lib to add visual signature block
    // 1. Load PDF with pdf-lib
    // 2. Draw signature block with:
    //    - Blue rectangle border
    //    - RTL Persian text: signerName
    //    - Smaller text: signerRole
    //    - Date text (Jalali)
    //    - QR code image
    // 3. Return modified PDF buffer
    this.logger.log(`Embedding signature block for ${signerName} on page ${page || 'last'}`);
    return pdfBuffer;
  }

  async addCryptographicSignature(
    pdfBuffer: Buffer,
    pkcs7Signature: Buffer,
    _certificate: Buffer,
  ): Promise<Buffer> {
    // In production: embed PKCS#7 signature into PDF's AcroForm
    this.logger.log('Embedding cryptographic signature into PDF');
    return pdfBuffer;
  }

  async extractSignaturesFromPdf(pdfBuffer: Buffer): Promise<EmbeddedSignatureInfo[]> {
    // In production: parse PDF and extract signature annotations
    return [];
  }

  private readonly logger = { log: (_msg: string) => {} };
}
