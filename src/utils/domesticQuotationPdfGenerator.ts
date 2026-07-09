import jsPDF, { GState, ImageProperties } from 'jspdf';
import 'jspdf-autotable';
import type { UserOptions } from 'jspdf-autotable';
import type { NoteConfig } from '@/features/quotation/types/notes';
import type { DomesticPartyDetails, QuotationData } from '@/types/quotation';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { safeSetCnFont } from './pdf/ensureFont';
import { convertToRmbCapital } from './rmbCapitalAmount';
import { getDomesticClauseNumber } from './domesticClauseNumber';
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import { drawHeaderBlock as drawSharedHeaderBlock } from './pdfHeaderBlock';

interface ExtendedJsPDF extends jsPDF {
  autoTable: (options: UserOptions) => void;
  lastAutoTable: { finalY: number };
  getNumberOfPages: () => number;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  setGState: (gState: GState) => jsPDF;
  getImageProperties: (image: string) => ImageProperties;
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

/** 从 baseFontSize 开始逐步缩小字号，直到文本能在 maxWidth 内单行显示（不超过 minFontSize），用于单位地址这类可能超长的单行字段 */
function fitFontSizeToOneLine(
  doc: jsPDF,
  text: string,
  maxWidth: number,
  baseFontSize: number,
  minFontSize = 6
): number {
  if (!text || maxWidth <= 0) return baseFontSize;
  let size = baseFontSize;
  while (size > minFontSize) {
    doc.setFontSize(size);
    if (doc.splitTextToSize(text, maxWidth).length <= 1) return size;
    size -= 0.5;
  }
  doc.setFontSize(minFontSize);
  return minFontSize;
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

// 顶部公司抬头：None / 中英文 / 英文，与外贸报价单口径一致，默认双语。
// 实际绘制逻辑在 pdfHeaderBlock.ts（logo 图标 + 矢量文字，替代原先 ~92KB/24KB 的整条横幅图），
// 6 个 PDF 生成器共用同一份实现，这里只做 headerType 取值的转接。
async function drawHeaderBlock(
  doc: ExtendedJsPDF,
  data: QuotationData,
  margin: number,
  pageWidth: number,
  y: number
): Promise<number> {
  const headerType = data.templateConfig?.headerType || 'bilingual';
  return drawSharedHeaderBlock(doc, headerType, margin, pageWidth, y);
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
  const rightX = margin + contentWidth * 0.72;
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

function buildProductRows(data: QuotationData, showRemarksCol: boolean) {
  const rows = (data.items ?? []).map((item, index) => {
    const row = [
      String(index + 1),
      item.partName || '',
      item.description || '',
      item.unit || '',
      String(item.quantity || ''),
      formatAmount(item.unitPrice || 0),
      formatAmount(item.amount || 0),
    ];
    if (showRemarksCol) row.push(item.remarks || '');
    return row;
  });

  (data.otherFees ?? []).forEach((fee, index) => {
    const row = [
      String((data.items?.length ?? 0) + index + 1),
      fee.description || '其他费用',
      '',
      '',
      '',
      '',
      formatAmount(fee.amount || 0),
    ];
    if (showRemarksCol) row.push(fee.remarks || '');
    rows.push(row);
  });

  return rows;
}

function drawClauses(
  doc: jsPDF,
  notesConfig: NoteConfig[],
  margin: number,
  pageWidth: number,
  pageHeight: number,
  y: number,
  isContract: boolean
): number {
  const contentWidth = pageWidth - margin * 2;
  const clauses = notesConfig
    .filter((note) => note.visible && note.content?.trim())
    .sort((a, b) => a.order - b.order);

  doc.setFontSize(9);
  // 报价单（非合同）条款：行距更紧凑、不加粗；产品购销合同条款也收紧了行距，但保留首行加粗
  const lineHeight = isContract ? 4.8 : 4.2;
  const clauseGap = isContract ? 1.5 : 1;
  clauses.forEach((note, index) => {
    // 产品购销合同用中文数字+顿号（与"一、产品名称..."标题的编号风格一致）；报价单用阿拉伯数字+句点
    const number = isContract ? getDomesticClauseNumber(index) : String(index + 1);
    const numberPunctuation = isContract ? '、' : '.';
    const { title, body } = splitClause(note.content ?? '');
    const text = `${number}${numberPunctuation}${title}${body}`;
    const lines = doc.splitTextToSize(text, contentWidth);
    y = checkPage(doc, y, lines.length * lineHeight + clauseGap + 2, margin, pageHeight);

    lines.forEach((line: string, lineIndex: number) => {
      setCnFont(doc, isContract && lineIndex === 0 ? 'bold' : 'normal');
      doc.text(line, margin, y);
      y += lineHeight;
    });
    y += clauseGap;
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
  const partyRowsData = partyRows(data);
  const rowCount = partyRowsData.length;
  const headerRows = 1;
  const rowsTotal = rowCount + headerRows;

  // 基准尺寸：和原来的视觉效果一致（未压缩时）
  const baseCellPadding = 2.2;
  const baseFontSize = 8.5;
  const baseMinCellHeight = 7;
  const baseNeededHeight = rowsTotal * baseMinCellHeight + 4;

  // 当前页剩余空间不够整张表按基准尺寸绘制时，优先适度压缩行高/内边距/字号，让表格精确贴合剩余
  // 空间、和产品条款留在同一页，而不是整体挪到下一页、在当前页留下一大片空白
  // （供方/需方签章应尽量与正文同页）。压缩到行高 5.2mm / 字号 7pt 这个下限仍放不下，才真正换页。
  let cellPadding = baseCellPadding;
  let bodyFontSize = baseFontSize;
  let minCellHeight = baseMinCellHeight;
  let neededHeight = baseNeededHeight;

  const available = pageHeight - margin - 12 - y;
  if (available < baseNeededHeight) {
    const targetMinCellHeight = (available - 4) / rowsTotal;
    minCellHeight = Math.min(baseMinCellHeight, Math.max(5.2, targetMinCellHeight));
    const scale = minCellHeight / baseMinCellHeight;
    cellPadding = Math.max(1.3, baseCellPadding * scale);
    bodyFontSize = Math.max(7, baseFontSize * Math.max(scale, 0.85));
    neededHeight = rowsTotal * minCellHeight + 4;
  }

  y = checkPage(doc, y, neededHeight, margin, pageHeight);

  const rows = partyRowsData.map(([label, seller, buyer]) => [
    `${label}：${seller}`,
    `${label}：${buyer}`,
  ]);

  // "单位地址"行内容常常偏长（自贸区/门牌号等），字号按需缩小到能单行显示为止，避免自动换行撑高表格
  const colWidth = (pageWidth - margin * 2) / 2 - cellPadding * 2;
  const addressRowIndex = 1; // partyRows 固定顺序：0 单位名称，1 单位地址
  const addressFontSizes = rows[addressRowIndex]?.map((text) =>
    fitFontSizeToOneLine(doc, text, colWidth, bodyFontSize, 6)
  ) ?? [bodyFontSize, bodyFontSize];
  doc.setFontSize(bodyFontSize); // 恢复默认字号，避免测量时的 setFontSize 调用影响后续绘制

  doc.autoTable({
    startY: y,
    head: [['供 方', '需 方']],
    body: rows,
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
      font: 'NotoSansSC',
      fontStyle: 'normal',
      fontSize: bodyFontSize,
      cellPadding,
      textColor: [20, 20, 20],
      lineColor: [90, 90, 90],
      lineWidth: 0.2,
      minCellHeight,
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
      if (hookData.section === 'body' && hookData.row.index === addressRowIndex) {
        hookData.cell.styles.fontSize = addressFontSizes[hookData.column.index] ?? bodyFontSize;
      }
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
  preview = false,
  savedVisibleCols?: string[] | null
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

  // 读取"备注"列显示偏好：优先使用保存时的设置，否则读取页面当前的本地设置，
  // 与导出报价单（quotationPdfGenerator.ts）口径一致，确保页面上的列开关与PDF联动
  const visibleCols = savedVisibleCols ?? getLocalStorageJSON<string[]>('qt.visibleCols', []);
  const showRemarksCol = visibleCols ? visibleCols.includes('remarks') : true;

  y = await drawHeaderBlock(doc, data, margin, pageWidth, y);
  y = drawHeader(doc, data, margin, pageWidth, y, isContract);

  doc.setFontSize(10);
  setCnFont(doc, isContract ? 'bold' : 'normal');
  doc.text(isContract ? '一、产品名称、规格型号、数量、金额' : '感谢您的询价，现报价如下：', margin, y);
  y += 5;

  const head = isContract
    ? ['序号', '产品名称', '规格型号', '单位', '数量', '单价(含税)', '金额(含税)']
    : ['序号', '产品名称', '规格型号', '单位', '数量', '单价(RMB)', '金额(RMB)'];
  if (showRemarksCol) head.push('备注');

  const columnStyles: Record<number, { halign: 'center'; cellWidth: number }> = {
    0: { halign: 'center', cellWidth: 12 },
    1: { halign: 'center', cellWidth: 24 },
    2: { halign: 'center', cellWidth: showRemarksCol ? 42 : 66 }, // 隐藏备注列时，把空出来的宽度补给规格型号列
    3: { halign: 'center', cellWidth: 12 },
    4: { halign: 'center', cellWidth: 14 },
    5: { halign: 'center', cellWidth: 24 },
    6: { halign: 'center', cellWidth: 26 },
  };
  if (showRemarksCol) columnStyles[7] = { halign: 'center', cellWidth: 24 };

  doc.autoTable({
    startY: y,
    head: [head],
    body: buildProductRows(data, showRemarksCol),
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
    columnStyles,
    didParseCell: (hookData) => {
      hookData.cell.styles.font = 'NotoSansSC';
    },
  });

  y = doc.lastAutoTable.finalY + 6;
  const total = (data.items ?? []).reduce((sum, item) => sum + (item.amount || 0), 0)
    + (data.otherFees ?? []).reduce((sum, fee) => sum + (fee.amount || 0), 0);
  const capital = convertToRmbCapital(total);

  const remark = data.domesticTotalRemark || '价格含13个点专票及运费';
  const showRemark = data.showDomesticRemark ?? false;

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

  // 报价单（非合同）条款前加"备注："起头，与产品购销合同的正式编号条款区分开
  if (!isContract) {
    y = checkPage(doc, y, 8, margin, pageHeight);
    doc.setFontSize(9);
    setCnFont(doc, 'normal');
    doc.text('备注：', margin, y);
    y += 5;
  }

  y = drawClauses(doc, notesConfig, margin, pageWidth, pageHeight, y, isContract);

  if (isContract) {
    y = await drawPartyTable(doc, data, margin, pageWidth, pageHeight, y);
  }

  addPageNumbers(doc, pageWidth, pageHeight, margin);

  return preview ? doc.output('blob') : doc.output('blob');
}
