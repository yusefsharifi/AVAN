/**
 * Generates a standard Iranian tax invoice (فاکتور رسمی) HTML template.
 *
 * Layout includes:
 * - Zone letterhead with logo area
 * - Invoice metadata (number, date, type)
 * - Seller/Buyer information blocks
 * - Line items table with tax calculation
 * - Grand total with words (تعداد به حروف)
 * - Digital signature / seal area
 * - Barcode / QR code area
 * - Footer with tax authority notice
 */

export interface InvoiceTemplateData {
  // Zone info
  zoneName: string;
  zoneAddress?: string;
  zonePhone?: string;
  zonePostalCode?: string;
  zoneNationalId?: string;
  zoneEconomicCode?: string;
  zoneLogoKey?: string;

  // Invoice info
  invoiceNumber: string;
  issueDate: string;       // Jalali date string
  dueDate?: string;
  invoiceType: string;     // e.g. "فاکتور فروش"
  currencyCode: string;

  // Parties
  sellerName: string;
  sellerNationalId?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEconomicCode?: string;
  sellerRegistrationNumber?: string;

  buyerName: string;
  buyerNationalId?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEconomicCode?: string;
  buyerRegistrationNumber?: string;

  // Lines
  lines: {
    lineNumber: number;
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    discount: number;
    taxRate: number;
    lineSubtotal: number;
    lineDiscount: number;
    lineTax: number;
    lineTotal: number;
  }[];

  // Totals
  subtotal: number;
  totalDiscount: number;
  totalTax: number;
  grandTotal: number;
  paidAmount: number;
  remainingAmount: number;

  // Amount in words (optional, can be computed)
  grandTotalInWords?: string;

  // Payment info
  paymentTerms?: string;
  paymentMethod?: string;

  // Reference
  referenceNumber?: string;
  notes?: string;

  // QR hash for verification
  qrHash?: string;
  verifyUrl?: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString('fa-IR');
}

function numberToWords_fa(num: number): string {
  // Simplified Persian number-to-words conversion
  if (num === 0) return 'صفر';

  const ones = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
  const tens = ['', 'ده', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
  const hundreds = ['', 'صد', 'دویست', 'سیصد', 'چهارصد', 'پانصد', 'ششصد', 'هفتصد', 'هشتصد', 'نهصد'];
  const thousands = ['', 'هزار', 'میلیون', 'میلیارد', 'تریلیون'];

  function convertGroup(n: number): string {
    if (n === 0) return '';
    let result = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const o = n % 10;

    if (h > 0) result += hundreds[h];
    if (t > 0) {
      if (result) result += ' و ';
      result += tens[t];
    }
    if (o > 0) {
      if (result) result += ' و ';
      result += ones[o];
    }
    return result;
  }

  if (num < 1000) {
    return convertGroup(num);
  }

  let result = '';
  let groupIndex = 0;

  while (num > 0) {
    const group = num % 1000;
    if (group > 0) {
      const groupStr = convertGroup(group);
      const suffix = thousands[groupIndex] ? ` ${thousands[groupIndex]}` : '';
      if (result) {
        result = groupStr + suffix + ' و ' + result;
      } else {
        result = groupStr + suffix;
      }
    }
    num = Math.floor(num / 1000);
    groupIndex++;
  }

  return result;
}

export function renderInvoiceHtml(data: InvoiceTemplateData): string {
  const grandTotalWords = data.grandTotalInWords || numberToWords_fa(data.grandTotal);

  const linesHtml = data.lines
    .map(
      (line) => `
      <tr>
        <td class="center">${line.lineNumber}</td>
        <td>${line.description}</td>
        <td class="center">${formatNumber(line.quantity)}</td>
        <td class="center">${line.unit || '-'}</td>
        <td class="ltr">${formatNumber(line.unitPrice)}</td>
        <td class="ltr">${line.discount > 0 ? `${line.discount}%` : '-'}</td>
        <td class="center">${line.taxRate}%</td>
        <td class="ltr">${formatNumber(line.lineSubtotal)}</td>
        <td class="ltr">${formatNumber(line.lineTax)}</td>
        <td class="ltr bold">${formatNumber(line.lineTotal)}</td>
      </tr>`,
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>فاکتور ${data.invoiceNumber}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Vazirmatn:wght@300;400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Vazirmatn', 'Tahoma', 'Arial', sans-serif;
      font-size: 11px;
      color: #1a1a1a;
      background: #fff;
      direction: rtl;
    }

    .invoice-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 15mm;
      background: #fff;
    }

    /* ── Header ─────────────────────────────────── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 12px;
      margin-bottom: 15px;
    }

    .header-right {
      flex: 1;
    }

    .header-center {
      flex: 1;
      text-align: center;
    }

    .header-left {
      flex: 1;
      text-align: left;
    }

    .zone-name {
      font-size: 18px;
      font-weight: 700;
      color: #0066cc;
      margin-bottom: 4px;
    }

    .zone-info {
      font-size: 9px;
      color: #555;
      line-height: 1.6;
    }

    .invoice-title {
      font-size: 20px;
      font-weight: 700;
      color: #0066cc;
      border: 2px solid #0066cc;
      border-radius: 8px;
      padding: 6px 20px;
      display: inline-block;
    }

    .invoice-meta {
      font-size: 10px;
      color: #333;
      line-height: 1.8;
      text-align: left;
    }

    .invoice-meta strong {
      color: #0066cc;
    }

    /* ── Tax ID Banner ──────────────────────────── */
    .tax-banner {
      background: #f0f6ff;
      border: 1px solid #0066cc;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 15px;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
    }

    .tax-banner .label {
      font-weight: 600;
      color: #0066cc;
    }

    /* ── Parties ────────────────────────────────── */
    .parties {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }

    .party-box {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 10px;
      background: #fafafa;
    }

    .party-box.seller {
      border-color: #0066cc;
    }

    .party-box.buyer {
      border-color: #28a745;
    }

    .party-title {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 8px;
      display: inline-block;
      color: #fff;
    }

    .party-box.seller .party-title { background: #0066cc; }
    .party-box.buyer .party-title { background: #28a745; }

    .party-row {
      display: flex;
      margin-bottom: 3px;
      font-size: 10px;
      line-height: 1.6;
    }

    .party-row .label {
      font-weight: 600;
      min-width: 80px;
      color: #555;
    }

    .party-row .value {
      color: #1a1a1a;
    }

    /* ── Items Table ────────────────────────────── */
    .items-section {
      margin-bottom: 15px;
    }

    .items-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
    }

    .items-table thead th {
      background: #0066cc;
      color: #fff;
      padding: 8px 5px;
      font-weight: 600;
      text-align: center;
      border: 1px solid #0055aa;
    }

    .items-table tbody td {
      padding: 6px 5px;
      border: 1px solid #ddd;
      vertical-align: middle;
    }

    .items-table tbody tr:nth-child(even) {
      background: #f8f9fa;
    }

    .items-table tbody tr:hover {
      background: #e8f0fe;
    }

    .items-table tfoot td {
      padding: 8px 5px;
      font-weight: 600;
      border: 1px solid #ddd;
      background: #f0f6ff;
    }

    .center { text-align: center; }
    .ltr { direction: ltr; text-align: right; font-family: monospace; }
    .bold { font-weight: 700; }

    /* ── Totals ─────────────────────────────────── */
    .totals-section {
      display: flex;
      gap: 15px;
      margin-bottom: 15px;
    }

    .totals-box {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
    }

    .totals-box .title {
      background: #0066cc;
      color: #fff;
      padding: 6px 12px;
      font-weight: 700;
      font-size: 11px;
    }

    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 5px 12px;
      font-size: 10px;
      border-bottom: 1px solid #eee;
    }

    .totals-row:last-child {
      border-bottom: none;
    }

    .totals-row.grand-total {
      background: #0066cc;
      color: #fff;
      font-weight: 700;
      font-size: 12px;
      padding: 8px 12px;
    }

    .totals-row .label { color: #555; }
    .totals-row.grand-total .label { color: #fff; }
    .totals-row .value { font-weight: 600; direction: ltr; font-family: monospace; }

    /* ── Amount in Words ────────────────────────── */
    .amount-words {
      background: #fffbe6;
      border: 1px solid #ffe58f;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 15px;
      font-size: 11px;
    }

    .amount-words .label {
      font-weight: 700;
      color: #d48806;
    }

    /* ── Footer ─────────────────────────────────── */
    .footer {
      border-top: 2px solid #0066cc;
      padding-top: 10px;
      margin-top: 15px;
    }

    .footer-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
    }

    .seal-area {
      width: 150px;
      height: 100px;
      border: 2px dashed #ccc;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 10px;
    }

    .signature-area {
      text-align: center;
      font-size: 10px;
      color: #555;
    }

    .signature-line {
      width: 150px;
      border-top: 1px solid #333;
      margin: 40px auto 5px;
    }

    .qr-area {
      width: 100px;
      height: 100px;
      border: 1px solid #ddd;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #999;
    }

    .tax-notice {
      background: #f8f9fa;
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 8px 12px;
      font-size: 9px;
      color: #666;
      text-align: center;
      margin-top: 10px;
      line-height: 1.8;
    }

    .payment-info {
      margin-bottom: 10px;
      font-size: 10px;
      color: #555;
    }

    .notes-section {
      background: #f8f9fa;
      border: 1px solid #eee;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 15px;
      font-size: 10px;
      color: #555;
    }

    @media print {
      body { background: #fff; }
      .invoice-container {
        margin: 0;
        padding: 10mm;
        width: 100%;
        min-height: auto;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">

    <!-- ═══ HEADER ═══ -->
    <div class="header">
      <div class="header-right">
        <div class="zone-name">${data.zoneName}</div>
        <div class="zone-info">
          ${data.zoneAddress ? `آدرس: ${data.zoneAddress}<br>` : ''}
          ${data.zonePhone ? `تلفن: ${data.zonePhone}` : ''}
          ${data.zonePostalCode ? ` | کدپستی: ${data.zonePostalCode}` : ''}
        </div>
      </div>
      <div class="header-center">
        <div class="invoice-title">فاکتور رسمی</div>
        <div style="font-size:9px; color:#888; margin-top:4px;">(${data.invoiceType})</div>
      </div>
      <div class="header-left">
        <div class="invoice-meta">
          <strong>شماره فاکتور:</strong> ${data.invoiceNumber}<br>
          <strong>تاریخ صدور:</strong> ${data.issueDate}<br>
          ${data.dueDate ? `<strong>تاریخ سررسید:</strong> ${data.dueDate}<br>` : ''}
          ${data.referenceNumber ? `<strong>مرجع:</strong> ${data.referenceNumber}<br>` : ''}
          <strong>واحد پول:</strong> ${data.currencyCode === 'IRR' ? 'ریال ایران' : data.currencyCode}
        </div>
      </div>
    </div>

    <!-- ═══ TAX BANNER ═══ -->
    <div class="tax-banner">
      <div>
        <span class="label">شناسه ملی فروشنده:</span>
        <span>${data.sellerNationalId || '—'}</span>
      </div>
      <div>
        <span class="label">کد اقتصادی فروشنده:</span>
        <span>${data.sellerEconomicCode || '—'}</span>
      </div>
      <div>
        <span class="label">شماره ثبت:</span>
        <span>${data.sellerRegistrationNumber || '—'}</span>
      </div>
    </div>

    <!-- ═══ PARTIES ═══ -->
    <div class="parties">
      <div class="party-box seller">
        <div class="party-title">فروشنده / صادرکننده</div>
        <div class="party-row"><span class="label">نام:</span><span class="value">${data.sellerName}</span></div>
        ${data.sellerNationalId ? `<div class="party-row"><span class="label">کد ملی:</span><span class="value">${data.sellerNationalId}</span></div>` : ''}
        ${data.sellerAddress ? `<div class="party-row"><span class="label">آدرس:</span><span class="value">${data.sellerAddress}</span></div>` : ''}
        ${data.sellerPhone ? `<div class="party-row"><span class="label">تلفن:</span><span class="value">${data.sellerPhone}</span></div>` : ''}
      </div>
      <div class="party-box buyer">
        <div class="party-title">خریدار / دریافت‌کننده</div>
        <div class="party-row"><span class="label">نام:</span><span class="value">${data.buyerName}</span></div>
        ${data.buyerNationalId ? `<div class="party-row"><span class="label">کد ملی/شناسه:</span><span class="value">${data.buyerNationalId}</span></div>` : ''}
        ${data.buyerEconomicCode ? `<div class="party-row"><span class="label">کد اقتصادی:</span><span class="value">${data.buyerEconomicCode}</span></div>` : ''}
        ${data.buyerAddress ? `<div class="party-row"><span class="label">آدرس:</span><span class="value">${data.buyerAddress}</span></div>` : ''}
        ${data.buyerPhone ? `<div class="party-row"><span class="label">تلفن:</span><span class="value">${data.buyerPhone}</span></div>` : ''}
      </div>
    </div>

    <!-- ═══ ITEMS TABLE ═══ -->
    <div class="items-section">
      <table class="items-table">
        <thead>
          <tr>
            <th style="width:30px">ردیف</th>
            <th>شرح کالا / خدمات</th>
            <th style="width:50px">تعداد</th>
            <th style="width:40px">واحد</th>
            <th style="width:80px">-unit price</th>
            <th style="width:45px">تخفیف</th>
            <th style="width:40px">مالیات</th>
            <th style="width:80px">جمع</th>
            <th style="width:60px">مالیات ردیف</th>
            <th style="width:85px">جمع کل</th>
          </tr>
        </thead>
        <tbody>
          ${linesHtml || '<tr><td colspan="10" style="text-align:center;padding:20px;color:#999;">آیتمی ثبت نشده</td></tr>'}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="7" style="text-align:left;font-weight:700">جمع کل</td>
            <td class="ltr">${formatNumber(data.subtotal)}</td>
            <td class="ltr">${formatNumber(data.totalTax)}</td>
            <td class="ltr bold">${formatNumber(data.grandTotal)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <!-- ═══ TOTALS ═══ -->
    <div class="totals-section">
      <div class="totals-box">
        <div class="title">خلاصه مبالغ (ریال)</div>
        <div class="totals-row">
          <span class="label">جمع کل (بدون مالیات)</span>
          <span class="value">${formatNumber(data.subtotal)}</span>
        </div>
        <div class="totals-row">
          <span class="label">تخفیف</span>
          <span class="value">${formatNumber(data.totalDiscount)}</span>
        </div>
        <div class="totals-row">
          <span class="label">مالیات بر ارزش افزوده</span>
          <span class="value">${formatNumber(data.totalTax)}</span>
        </div>
        <div class="totals-row grand-total">
          <span class="label">جمع کل قابل پرداخت</span>
          <span class="value">${formatNumber(data.grandTotal)}</span>
        </div>
        ${data.paidAmount > 0 ? `
        <div class="totals-row">
          <span class="label">پرداخت شده</span>
          <span class="value">${formatNumber(data.paidAmount)}</span>
        </div>
        <div class="totals-row">
          <span class="label">مانده قابل پرداخت</span>
          <span class="value" style="color:#dc3545">${formatNumber(data.remainingAmount)}</span>
        </div>` : ''}
      </div>

      <div class="totals-box" style="flex:0.6">
        <div class="title">توضیحات</div>
        <div style="padding:10px;font-size:10px;color:#555;line-height:1.8">
          ${data.paymentTerms ? `<strong>شرایط پرداخت:</strong> ${data.paymentTerms}<br>` : ''}
          ${data.paymentMethod ? `<strong>نحوه پرداخت:</strong> ${data.paymentMethod}<br>` : ''}
          ${data.notes ? `<strong>یادداشت:</strong> ${data.notes}` : ''}
          ${!data.paymentTerms && !data.paymentMethod && !data.notes ? '—' : ''}
        </div>
      </div>
    </div>

    <!-- ═══ AMOUNT IN WORDS ═══ -->
    <div class="amount-words">
      <span class="label">مبلغ به حروف:</span>
      <span>${grandTotalWords} ریال</span>
      <span style="margin-right:20px;color:#888">(${formatNumber(data.grandTotal)} ریال)</span>
    </div>

    <!-- ═══ FOOTER ═══ -->
    <div class="footer">
      <div class="footer-row">
        <div class="signature-area">
          <div class="signature-line"></div>
          <div>امضای فروشنده</div>
          <div style="font-size:8px;color:#999">مهر و امضای مجاز</div>
        </div>

        <div class="qr-area" id="qr-area">
          ${data.qrHash ? `<div style="text-align:center"><div style="font-size:8px;margin-bottom:4px">QR</div><div style="font-size:6px;word-break:break-all">${data.qrHash.substring(0, 32)}...</div></div>` : 'QR Code'}
        </div>

        <div class="signature-area">
          <div class="signature-line"></div>
          <div>امضای خریدار</div>
          <div style="font-size:8px;color:#999">تایید و امضا</div>
        </div>
      </div>
    </div>

    <!-- ═══ TAX NOTICE ═══ -->
    <div class="tax-notice">
      <strong>توجه:</strong> این فاکتور مطابق با مقررات مالیات بر ارزش افزوده صادر شده است.
      شماره اقتصادی و شناسه ملی فروشنده در بالای فاکتور درج شده است.
      خریدار مکلف است قبل از صدور صورتحساب، احراز هویت فروشنده را از طریق سامانه مودیان مالیاتی تایید نماید.
      ${data.verifyUrl ? `<br><strong>验证 لینک:</strong> ${data.verifyUrl}` : ''}
    </div>

  </div>
</body>
</html>`;
}
