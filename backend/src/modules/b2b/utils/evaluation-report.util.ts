import * as puppeteer from 'puppeteer';
import { BidComparisonDto } from '../dto/enums';

/**
 * Generate a PDF evaluation report for an RFQ using Puppeteer.
 * Features RTL layout for Persian/Farsi text and bid comparison table.
 */
export async function generateEvaluationReportPdf(
  comparison: BidComparisonDto,
): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(buildHtml(comparison), { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
      displayHeaderFooter: true,
      headerTemplate: `
        <div style="width:100%;text-align:center;font-size:8px;color:#666;">
          گزارش ارزیابی پیشنهادات — ${comparison.rfq?.rfqNumber || ''}
        </div>
      `,
      footerTemplate: `
        <div style="width:100%;text-align:center;font-size:8px;color:#666;">
          صفحه <span class="pageNumber"></span> از <span class="totalPages"></span>
        </div>
      `,
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

function buildHtml(comparison: BidComparisonDto): string {
  const rfq = comparison.rfq;
  const bids = comparison.bids || [];
  const winner = comparison.winner;

  const bidsTableRows = bids
    .map(
      (b, i) => `
      <tr class="${b.bid?.isWinner ? 'winner-row' : ''}">
        <td style="text-align:center">${i + 1}</td>
        <td>${b.supplier?.companyName || '—'}</td>
        <td style="text-align:center">${b.rank || '—'}</td>
        <td style="text-align:left">${formatNumber(b.financials?.unitPrice || 0)}</td>
        <td style="text-align:left">${formatNumber(b.financials?.finalPrice || 0)}</td>
        <td style="text-align:center">${b.delivery?.days || '—'} روز</td>
        <td style="text-align:center">${b.technical?.warranty || '—'} ماه</td>
        <td style="text-align:center">${b.totalScore?.toFixed(2) || '—'}</td>
        <td style="text-align:center">${b.bid?.isWinner ? '🏆 برنده' : ''}</td>
      </tr>
    `,
    )
    .join('');

  const scoreRows = bids
    .map(
      (b, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${b.supplier?.companyName || '—'}</td>
        ${(b.scores || [])
          .map(
            (s) => `
          <td style="text-align:center">
            <div>${s.score}</div>
            <div style="font-size:10px;color:#666">${s.weight}%</div>
          </td>
        `,
          )
          .join('')}
        <td style="text-align:center;font-weight:bold">${b.totalScore?.toFixed(2) || '—'}</td>
      </tr>
    `
    )
    .join('');

  const criteriaHeaders = bids[0]
    ? (bids[0].scores || [])
        .map((s) => `<th style="text-align:center">${s.criterion} (${s.weight}%)</th>`)
        .join('')
    : '';

  return `
<!DOCTYPE html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="UTF-8">
  <style>
    * { font-family: 'Tahoma', 'Arial', sans-serif; direction: rtl; }
    body { margin: 0; padding: 0; font-size: 12px; color: #333; }
    .header { text-align: center; border-bottom: 2px solid #2c3e50; padding-bottom: 10px; margin-bottom: 20px; }
    .header h1 { font-size: 18px; color: #2c3e50; margin: 0; }
    .header h2 { font-size: 14px; color: #7f8c8d; margin: 5px 0 0; }
    .info-box { background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 8px; padding: 15px; margin-bottom: 20px; }
    .info-box .row { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .info-box .label { font-weight: bold; color: #495057; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
    th { background: #2c3e50; color: white; padding: 8px 6px; text-align: center; }
    td { padding: 6px; border: 1px solid #dee2e6; }
    tr:nth-child(even) { background: #f8f9fa; }
    .winner-row { background: #d4edda !important; font-weight: bold; }
    .section-title { font-size: 14px; font-weight: bold; color: #2c3e50; border-bottom: 1px solid #2c3e50; padding-bottom: 5px; margin: 20px 0 10px; }
    .recommendation { background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin-top: 20px; }
    .recommendation h3 { color: #856404; margin-top: 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>گزارش ارزیابی پیشنهادات</h1>
    <h2>${rfq?.title || '—'}</h2>
  </div>

  <div class="info-box">
    <div class="row"><span class="label">شماره استعلام:</span><span>${rfq?.rfqNumber || '—'}</span></div>
    <div class="row"><span class="label">عنوان:</span><span>${rfq?.title || '—'}</span></div>
    <div class="row"><span class="label">تعداد پیشنهادات:</span><span>${bids.length}</span></div>
    <div class="row"><span class="label">نوع مناقصه:</span><span>${rfq?.biddingMode === 'SEALED' ? 'کور' : rfq?.biddingMode === 'OPEN' ? 'باز' : 'حراج معکوس'}</span></div>
    <div class="row"><span class="label">تاریخ ارزیابی:</span><span>${new Date().toLocaleDateString('fa-IR')}</span></div>
  </div>

  <div class="section-title">جدول مقایسه پیشنهادات</div>
  <table>
    <thead>
      <tr>
        <th>ردیف</th>
        <th>تأمین‌کننده</th>
        <th>رتبه</th>
        <th>قیمت واحد</th>
        <th>قیمت نهایی</th>
        <th>زمان تحویل</th>
        <th>گارانتی</th>
        <th>امتیاز کل</th>
        <th>وضعیت</th>
      </tr>
    </thead>
    <tbody>
      ${bidsTableRows || '<tr><td colspan="9" style="text-align:center">پیشنهادی یافت نشد</td></tr>'}
    </tbody>
  </table>

  <div class="section-title">ماتریس امتیازدهی</div>
  <table>
    <thead>
      <tr>
        <th>ردیف</th>
        <th>تأمین‌کننده</th>
        ${criteriaHeaders}
        <th style="text-align:center">مجموع</th>
      </tr>
    </thead>
    <tbody>
      ${scoreRows || '<tr><td colspan="10" style="text-align:center">داده‌ای موجود نیست</td></tr>'}
    </tbody>
  </table>

  <div class="recommendation">
    <h3>پیشنهاد</h3>
    ${winner ? `<p>برنده پیشنهادی: <strong>${winner.supplier?.companyName || '—'}</strong> با امتیاز ${winner.totalScore?.toFixed(2) || '—'}</p>` : '<p>هنوز برنده‌ای انتخاب نشده است</p>'}
    <p>تاریخ تهیه گزارش: ${new Date().toLocaleDateString('fa-IR')} — ${new Date().toLocaleTimeString('fa-IR')}</p>
  </div>
</body>
</html>`;
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat('fa-IR').format(n);
}
