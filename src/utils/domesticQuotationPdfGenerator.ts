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
  // @types/jspdf 这份类型定义比较旧，没收录这两个方法，但 jsPDF 运行时实际支持
  // （见 node_modules/jspdf/types/index.d.ts），供方/需方信息表按可用空间动态调整行距要用到
  getLineHeightFactor: () => number;
  setLineHeightFactor: (value: number) => jsPDF;
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

  // 首行（单位名称(章)）分别加上"供方”/“需方”前缀，替代原来单独一行的表头
  const sellerText = partyRowsData
    .map(([label, seller], index) => (index === 0 ? `供方 ${label}：${seller}` : `${label}：${seller}`))
    .join('\n');
  const buyerText = partyRowsData
    .map(([label, , buyer], index) => (index === 0 ? `需方 ${label}：${buyer}` : `${label}：${buyer}`))
    .join('\n');

  const mmPerPt = 0.3528;
  const comfortableLineHeightFactor = 1.45; // 空间充足时用的行距，比 jsPDF 默认 1.15 更舒展
  const tightLineHeightFactor = 1.15; // 压缩到底也不再往下收的行距下限（jsPDF 默认值）
  const baseCellPadding = 2.2;
  const baseFontSize = 8.5;
  const minFontSize = 7;

  // 按实际渲染宽度精确量出每个字号下会换行成几行（单位地址等字段偏长时本来就会自动
  // 换行成 2 行），比之前"按字段数假设每项 1 行"更准——旧算法没算上换行，容易低估表格
  // 实际所需高度，导致明明放得下也被判定"放不下"而提前换页。
  function measureHeight(fontSize: number, cellPadding: number, lineHeightFactor: number): number {
    doc.setFontSize(fontSize);
    const cellWidth = (pageWidth - margin * 2) / 2 - cellPadding * 2;
    const lines = Math.max(
      doc.splitTextToSize(sellerText, cellWidth).length,
      doc.splitTextToSize(buyerText, cellWidth).length
    );
    return lines * fontSize * mmPerPt * lineHeightFactor + cellPadding * 2 + 2;
  }

  // 共享的 checkPage() 底部预留是 margin + 12（比如 16+12=28mm），这是为"下面还有更多正文
  // 内容要接着排"的场景设计的（条款、合计等中间内容）。但供需双方信息表是这一页最后一块
  // 内容，后面只剩页码（所有内容画完后统一在 pageHeight-8 补画），不需要留出整块 margin
  // 那么大的安全区——照抄 checkPage() 的口径实测发现会白白多留出约 20mm 没用上，明明还有
  // 二三十毫米空白也会被判定放不下、提前跳页，所以这里单独按页码的实际位置算一个更贴近
  // 真实可用空间的下边界，不复用 checkPage()。
  const bottomReserve = 14; // 页码基线在 pageHeight-8，留出安全间距即可
  const pageBottom = pageHeight - bottomReserve;
  const available = pageBottom - y;

  // 优先用基准字号 + 舒展行距；放不下时先收紧行距（对可读性的影响比缩字号小），
  // 行距收到 1.15 下限还不够，再逐步缩字号/内边距，缩到 7pt 下限仍放不下才真正换页。
  let bodyFontSize = baseFontSize;
  let cellPadding = baseCellPadding;
  let lineHeightFactor = comfortableLineHeightFactor;
  let neededHeight = measureHeight(bodyFontSize, cellPadding, lineHeightFactor);

  if (neededHeight > available) {
    for (let factor = comfortableLineHeightFactor - 0.05; factor >= tightLineHeightFactor; factor -= 0.05) {
      const height = measureHeight(bodyFontSize, cellPadding, factor);
      lineHeightFactor = factor;
      neededHeight = height;
      if (height <= available) break;
    }
  }

  if (neededHeight > available) {
    for (let size = baseFontSize - 0.5; size >= minFontSize; size -= 0.5) {
      const scale = size / baseFontSize;
      const padding = Math.max(1.3, baseCellPadding * scale);
      const height = measureHeight(size, padding, tightLineHeightFactor);
      bodyFontSize = size;
      cellPadding = padding;
      lineHeightFactor = tightLineHeightFactor;
      neededHeight = height;
      if (height <= available) break;
    }
  }

  const yBeforePageCheck = y;
  if (y + neededHeight > pageBottom) {
    doc.addPage();
    y = margin;
  }
  if (y !== yBeforePageCheck) {
    // 真的换页了：新的一页从顶部开始，空间充足，不需要沿用压缩后的字号/行距
    bodyFontSize = baseFontSize;
    cellPadding = baseCellPadding;
    lineHeightFactor = comfortableLineHeightFactor;
  }
  doc.setFontSize(bodyFontSize); // 恢复，避免测量时的 setFontSize 影响后续绘制

  // lineHeightFactor 是 doc 级别的全局设置（jspdf-autotable 内部按 doc.getLineHeightFactor()
  // 计算单元格行距），画完这张表要恢复原值，避免影响后面画的页码等其它内容
  const previousLineHeightFactor = doc.getLineHeightFactor();
  doc.setLineHeightFactor(lineHeightFactor);

  doc.autoTable({
    startY: y,
    body: [[sellerText, buyerText]],
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
      valign: 'top',
    },
    columnStyles: {
      0: { cellWidth: (pageWidth - margin * 2) / 2 },
      1: { cellWidth: (pageWidth - margin * 2) / 2 },
    },
    didParseCell: (hookData) => {
      hookData.cell.styles.font = 'NotoSansSC';
    },
  });

  doc.setLineHeightFactor(previousLineHeightFactor);

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

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true
  }) as unknown as ExtendedJsPDF;
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
