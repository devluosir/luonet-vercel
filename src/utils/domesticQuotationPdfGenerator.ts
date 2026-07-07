import jsPDF, { GState } from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type { NoteConfig } from '@/features/quotation/types/notes';
import type { DomesticPartyDetails, QuotationData } from '@/types/quotation';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { safeSetCnFont } from './pdf/ensureFont';
import { convertToRmbCapital } from './rmbCapitalAmount';

interface ExtendedJsPDF extends jsPDF {
  autoTable: (options: UserOptions) => void;
  lastAutoTable: { finalY: number };
  getNumberOfPages: () => number;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  setGState: (gState: GState) => jsPDF;
}

const CN_ORDINAL_DIGITS = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

// 条款序号从"二"开始（"一"是产品明细表标题），支持超过十四条时继续生成 十五/十六/二十一...
function getClauseNumber(index: number): string {
  const n = index + 2;
  if (n < 10) return CN_ORDINAL_DIGITS[n];
  if (n === 10) return '十';
  if (n < 20) return `十${CN_ORDINAL_DIGITS[n - 10]}`;
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const tensPart = tens === 1 ? '十' : `${CN_ORDINAL_DIGITS[tens]}十`;
  return `${tensPart}${ones ? CN_ORDINAL_DIGITS[ones] : ''}`;
}

function setCnFont(doc: jsPDF, style: 'normal' | 'bold' = 'normal') {
  safeSetCnFont(doc, style, 'export');
}

function firstLine(value: string | undefined): string {
  return (value ?? '').split('\n')[0]?.trim() ?? '';
}

function getPartyName(details: DomesticPartyDetails | undefined, fallback: string): string {
  return details?.name?.trim() || firstLine(fallback);
}

function formatAmount(value: number): string {
  return value.toLocaleString('zh-CN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function splitClause(content: string): { title: string; body: string } {
  const normalized = content.trim();
  const index = normalized.search(/[：:]/);
  if (index === -1) return { title: normalized, body: '' };
  return {
    title: normalized.slice(0, index + 1),
    body: normalized.slice(index + 1).trim(),
  };
}

function checkPage(doc: jsPDF, y: number, needed: number, margin: number, pageHeight: number): number {
  if (y + needed > pageHeight - margin - 12) {
    doc.addPage();
    return margin;
  }
  return y;
}

async function getStampImage(stampType: 'none' | 'shanghai' | 'hongkong' | undefined): Promise<string> {
  if (!stampType || stampType === 'none') return '';
  const { embeddedResources } = await import('@/lib/embedded-resources');
  const base64 = stampType === 'shanghai'
    ? embeddedResources.shanghaiStamp
    : embeddedResources.hongkongStamp;
  return base64 ? `data:image/png;base64,${base64}` : '';
}

function addPageNumbers(doc: ExtendedJsPDF, pageWidth: number, pageHeight: number, margin: number) {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    setCnFont(doc, 'normal');
    doc.text(`Page ${page} of ${total}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  }
}

function drawHeader(
  doc: jsPDF,
  data: QuotationData,
  margin: number,
  pageWidth: number,
  y: number,
  isContract: boolean
): number {
  const contentWidth = pageWidth - margin * 2;
  const sellerName = getPartyName(data.domesticSeller, data.from);
  const buyerName = getPartyName(data.domesticBuyer, data.to);
  const title = isContract ? '产 品 购 销 合 同' : '报 价 单';
  const noLabel = isContract ? '合同编号' : '报价单编号';
  const dateLabel = isContract ? '签订时间' : '报价日期';

  doc.setFontSize(18);
  setCnFont(doc, 'bold');
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 12;

  doc.setFontSize(10);
  setCnFont(doc, 'normal');
  const rightX = margin + contentWidth * 0.66;
  const lineGap = 6;
  doc.text(`供方：${sellerName}`, margin, y);
  doc.text(`${noLabel}：${data.quotationNo || ''}`, rightX, y);
  y += lineGap;
  doc.text(`需方：${buyerName}`, margin, y);
  doc.text(`${dateLabel}：${data.date || ''}`, rightX, y);
  y += lineGap;
  doc.text(`询价编号：${data.inquiryNo || ''}`, rightX, y);
  y += 4;

  return y;
}

function buildProductRows(data: QuotationData) {
  const rows = (data.items ?? []).map((item, index) => [
    String(index + 1),
    item.partName || '',
    item.description || '',
    item.unit || '',
    String(item.quantity || ''),
    formatAmount(item.unitPrice || 0),
    formatAmount(item.amount || 0),
    item.remarks || '',
  ]);

  (data.otherFees ?? []).forEach((fee, index) => {
    rows.push([
      String((data.items?.length ?? 0) + index + 1),
      fee.description || '其他费用',
      '',
      '',
      '',
      '',
      formatAmount(fee.amount || 0),
      fee.remarks || '',
    ]);
  });

  return rows;
}

function drawClauses(
  doc: jsPDF,
  notesConfig: NoteConfig[],
  margin: number,
  pageWidth: number,
  pageHeight: number,
  y: number
): number {
  const contentWidth = pageWidth - margin * 2;
  const clauses = notesConfig
    .filter((note) => note.visible && note.content?.trim())
    .sort((a, b) => a.order - b.order);

  doc.setFontSize(9);
  clauses.forEach((note, index) => {
    const number = getClauseNumber(index);
    const { title, body } = splitClause(note.content ?? '');
    const text = `${number}.${title}${body}`;
    const lines = doc.splitTextToSize(text, contentWidth);
    y = checkPage(doc, y, lines.length * 5 + 2, margin, pageHeight);

    lines.forEach((line: string, lineIndex: number) => {
      setCnFont(doc, lineIndex === 0 ? 'bold' : 'normal');
      doc.text(line, margin, y);
      y += 5;
    });
  });

  return y + 3;
}

function partyRows(data: QuotationData): string[][] {
  const seller = data.domesticSeller ?? {};
  const buyer = data.domesticBuyer ?? {};
  const rows = [
    ['单位名称(章)', getPartyName(seller, data.from), getPartyName(buyer, data.to)],
    ['单位地址', seller.address ?? '', buyer.address ?? ''],
    ['法定代表人', seller.legalRepresentative ?? '', buyer.legalRepresentative ?? ''],
    ['委托代理人', seller.agent ?? '', buyer.agent ?? ''],
    ['电话', seller.phone ?? '', buyer.phone ?? ''],
    ['传真', seller.fax ?? '', buyer.fax ?? ''],
    ['纳税人识别号', seller.taxNo ?? '', buyer.taxNo ?? ''],
  ];

  if (data.showBank) {
    rows.push(['开户行', seller.bankName ?? '', buyer.bankName ?? '']);
    rows.push(['帐号', seller.bankAccount ?? '', buyer.bankAccount ?? '']);
  }

  return rows;
}

async function drawPartyTable(
  doc: ExtendedJsPDF,
  data: QuotationData,
  margin: number,
  pageWidth: number,
  pageHeight: number,
  y: number
): Promise<number> {
  y = checkPage(doc, y, data.showBank ? 64 : 52, margin, pageHeight);

  const rows = partyRows(data).map(([label, seller, buyer]) => [
    `${label}：${seller}`,
    `${label}：${buyer}`,
  ]);

  doc.autoTable({
    startY: y,
    head: [['供 方', '需 方']],
    body: rows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'NotoSansSC',
      fontStyle: 'normal',
      fontSize: 8.5,
      cellPadding: 2.2,
      textColor: [20, 20, 20],
      lineColor: [90, 90, 90],
      lineWidth: 0.2,
      minCellHeight: 7,
    },
    headStyles: {
      font: 'NotoSansSC',
      fontStyle: 'bold',
      halign: 'center',
      fillColor: [245, 245, 245],
      textColor: [20, 20, 20],
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) / 2 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 },
    },
    didParseCell: (hookData) => {
      hookData.cell.styles.font = 'NotoSansSC';
    },
  });

  const finalY = doc.lastAutoTable.finalY;

  // 是否盖章只由"印章：无/上海/香港"这一个选择器决定，不再叠加 showStamp 开关
  // （原来两个控件都要打开才会出章，容易选了印章样式却忘记开开关，一直不出章）
  try {
    const stampImage = await getStampImage(data.templateConfig?.stampType);
    if (stampImage) {
      const stampWidth = data.templateConfig?.stampType === 'hongkong' ? 58 : 34;
      const stampHeight = data.templateConfig?.stampType === 'hongkong' ? 27 : 34;
      const stampX = margin + 34;
      const stampY = Math.max(y + 10, finalY - stampHeight - 4);
      doc.saveGraphicsState();
      doc.setGState(new GState({ opacity: 0.82 }));
      doc.addImage(stampImage, 'PNG', stampX, stampY, stampWidth, stampHeight);
      doc.restoreGraphicsState();
    }
  } catch (error) {
    console.warn('[DomesticQuotationPDF] 印章加载失败', error);
  }

  return finalY + 6;
}

export async function generateDomesticQuotationPDF(
  data: QuotationData,
  notesConfig: NoteConfig[],
  preview = false
): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in client-side environment');
  }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as unknown as ExtendedJsPDF;
  await ensurePdfFont(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const isContract = (data.domesticDocType ?? 'contract') === 'contract';
  let y = 18;

  y = drawHeader(doc, data, margin, pageWidth, y, isContract);

  doc.setFontSize(10);
  setCnFont(doc, 'bold');
  doc.text('一、产品名称、规格型号、数量、金额', margin, y);
  y += 5;

  doc.autoTable({
    startY: y,
    head: [['序号', '产品名称', '规格型号', '单位', '数量', '单价(含税)', '金额(含税)', '备注']],
    body: buildProductRows(data),
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'NotoSansSC',
      fontSize: 8,
      cellPadding: 1.8,
      lineColor: [80, 80, 80],
      lineWidth: 0.2,
      valign: 'middle',
      overflow: 'linebreak',
    },
    headStyles: {
      font: 'NotoSansSC',
      fontStyle: 'bold',
      halign: 'center',
      fillColor: [245, 245, 245],
      textColor: [20, 20, 20],
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 12 },
      1: { cellWidth: 24 },
      2: { cellWidth: 42 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'right', cellWidth: 14 },
      5: { halign: 'right', cellWidth: 24 },
      6: { halign: 'right', cellWidth: 26 },
      7: { cellWidth: 24 },
    },
    didParseCell: (hookData) => {
      hookData.cell.styles.font = 'NotoSansSC';
    },
  });

  y = doc.lastAutoTable.finalY + 6;
  const total = (data.items ?? []).reduce((sum, item) => sum + (item.amount || 0), 0)
    + (data.otherFees ?? []).reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const capital = convertToRmbCapital(total);

  const remark = data.domesticTotalRemark || '价格含13个点专票及运费';
  const showRemark = data.showDomesticRemark ?? true;

  y = checkPage(doc, y, 18, margin, pageHeight);
  doc.setFontSize(9);
  setCnFont(doc, 'bold');

  doc.text(`合计：¥${formatAmount(total)}`, pageWidth - margin, y, { align: 'right' });
  const combined = showRemark
    ? `合计（大写）：${capital}（${remark}）`
    : `合计（大写）：${capital}`;
  const amountLines = doc.splitTextToSize(combined, contentWidth - 45);
  amountLines.forEach((line: string, index: number) => {
    if (index > 0) y += 5;
    doc.text(line, margin, y);
  });
  y += 7;

  y = drawClauses(doc, notesConfig, margin, pageWidth, pageHeight, y);

  if (isContract) {
    y = await drawPartyTable(doc, data, margin, pageWidth, pageHeight, y);
  }

  addPageNumbers(doc, pageWidth, pageHeight, margin);

  return preview ? doc.output('blob') : doc.output('blob');
}
