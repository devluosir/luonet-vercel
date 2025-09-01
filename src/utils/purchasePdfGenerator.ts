import jsPDF, { GState, ImageProperties } from 'jspdf';
import { UserOptions } from 'jspdf-autotable';
import { PurchaseOrderData } from '@/types/purchase';
import { getBankInfo } from '@/utils/bankInfo';
import { ensurePdfFont } from '@/utils/pdfFontRegistry';
import { safeSetCnFont } from './pdf/ensureFont';

/**
 * 统一字体设置工具 - 使用安全的字体设置函数
 */
function setCnFont(doc: jsPDF, style: 'normal'|'bold'|'italic'|'bolditalic' = 'normal') {
  try {
    safeSetCnFont(doc, style, 'export');
  } catch (e) {
    console.warn('[PDF] 中文字体设置失败，回退:', e);
    doc.setFont('helvetica', style === 'bold' ? 'bold' : 'normal');
  }
}

/**
 * 在PDF中渲染表格
 */
function renderTableInPDF(
  doc: jsPDF, 
  tableText: string, 
  startX: number, 
  startY: number, 
  maxWidth: number,
  checkAndAddPage: (y: number, needed?: number) => number
): number {
  // 解析表格数据
  const lines = tableText.split('\n').filter(line => line.trim());
  if (lines.length === 0) return startY;

  const tableData = lines.map(line => line.split('\t').map(cell => cell.trim()));
  
  // 检测合并单元格（通过空单元格判断）
  const processedData: Array<Array<{value: string, rowSpan: number, colSpan: number}>> = [];
  
  for (let rowIndex = 0; rowIndex < tableData.length; rowIndex++) {
    const row = tableData[rowIndex];
    const processedRow: Array<{value: string, rowSpan: number, colSpan: number}> = [];
    
    for (let colIndex = 0; colIndex < row.length; colIndex++) {
      const cell = row[colIndex];
      
      // 检查是否应该跳过这个单元格（被合并的）
      let shouldSkip = false;
      for (let r = 0; r < rowIndex; r++) {
        for (let c = 0; c < processedData[r]?.length; c++) {
          const existingCell = processedData[r][c];
          if (existingCell.rowSpan > 1 && r + existingCell.rowSpan > rowIndex) {
            if (c + existingCell.colSpan > colIndex) {
              shouldSkip = true;
              break;
            }
          }
        }
        if (shouldSkip) break;
      }
      
      if (shouldSkip) {
        continue;
      }
      
      // 计算合并范围
      let rowSpan = 1;
      let colSpan = 1;
      
      // 检查向下合并（包括空单元格）
      for (let r = rowIndex + 1; r < tableData.length; r++) {
        const nextCell = tableData[r][colIndex];
        // 如果当前单元格不为空，检查下一行是否为空或相同
        if (cell !== '') {
          if (nextCell === '' || nextCell === cell) {
            rowSpan++;
          } else {
            break;
          }
        } else {
          // 如果当前单元格为空，检查是否应该被上面的单元格合并
          let shouldBeMerged = false;
          for (let checkRow = rowIndex - 1; checkRow >= 0; checkRow--) {
            const checkCell = tableData[checkRow][colIndex];
            if (checkCell !== '') {
              // 检查这个单元格是否已经向下合并到这里
              let checkRowSpan = 1;
              for (let sr = checkRow + 1; sr < tableData.length; sr++) {
                if (tableData[sr][colIndex] === '' || tableData[sr][colIndex] === checkCell) {
                  checkRowSpan++;
                } else {
                  break;
                }
              }
              if (checkRow + checkRowSpan > rowIndex) {
                shouldBeMerged = true;
                break;
              }
            }
          }
          if (shouldBeMerged) {
            continue; // 跳过这个空单元格
          }
        }
      }
      
      // 检查向右合并
      for (let c = colIndex + 1; c < row.length; c++) {
        const nextCell = row[c];
        if (cell !== '') {
          if (nextCell === '' || nextCell === cell) {
            colSpan++;
          } else {
            break;
          }
        }
      }
      
      // 只有当单元格不为空或者有合并范围时才添加
      if (cell !== '' || rowSpan > 1 || colSpan > 1) {
        processedRow.push({
          value: cell,
          rowSpan,
          colSpan
        });
      }
    }
    
    processedData.push(processedRow);
  }
  
  // 计算列宽 - 根据内容自适应
  const columnCount = Math.max(...processedData.map(row => row.length));
  const minColumnWidth = 15; // 最小列宽15mm
  const maxColumnWidth = 50; // 最大列宽50mm
  
  // 计算每列的最大内容宽度
  const columnWidths: number[] = [];
  for (let col = 0; col < columnCount; col++) {
    let maxWidth = 0;
    processedData.forEach(row => {
      if (row[col]) {
        const textWidth = doc.getTextWidth(row[col].value);
        maxWidth = Math.max(maxWidth, textWidth);
      }
    });
    // 添加一些内边距
    columnWidths[col] = Math.max(minColumnWidth, Math.min(maxColumnWidth, maxWidth + 4));
  }
  
  // 如果总宽度超过可用宽度，按比例缩小
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  if (totalWidth > maxWidth) {
    const scale = maxWidth / totalWidth;
    columnWidths.forEach((width, index) => {
      columnWidths[index] = Math.max(minColumnWidth, width * scale);
    });
  }
  
  // 计算表格总宽度
  const tableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  
  // 计算每行的实际高度（支持多行文本）
  const rowHeights: number[] = [];
  const cellPadding = 2; // 单元格内边距
  const lineHeight = 4; // 行高
  
  processedData.forEach((row, rowIndex) => {
    let maxCellHeight = 6; // 最小行高
    
    row.forEach((cell, colIndex) => {
      if (cell.value) {
        const availableWidth = columnWidths[colIndex] - (cellPadding * 2);
        const wrappedText = doc.splitTextToSize(cell.value, availableWidth);
        const cellHeight = Math.max(6, wrappedText.length * lineHeight + (cellPadding * 2));
        maxCellHeight = Math.max(maxCellHeight, cellHeight);
      }
    });
    
    rowHeights[rowIndex] = maxCellHeight;
  });
  
  // 计算总高度
  const totalHeight = rowHeights.reduce((sum, height) => sum + height, 0);
  let currentY = checkAndAddPage(startY, totalHeight);
  
  // 绘制表格边框和内容
  setCnFont(doc, 'normal');
  doc.setFontSize(9);
  
  processedData.forEach((row, rowIndex) => {
    const rowY = currentY;
    const rowHeight = rowHeights[rowIndex];
    
    // 绘制行边框
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.1);
    doc.line(startX, rowY, startX + tableWidth, rowY);
    
    // 绘制单元格内容和边框
    let cellX = startX;
    row.forEach((cell, colIndex) => {
      const cellWidth = columnWidths[colIndex] * cell.colSpan;
      const cellY = rowY;
      
      // 绘制垂直边框
      doc.line(cellX, cellY, cellX, cellY + rowHeight);
      
      // 绘制单元格内容
      doc.setTextColor(0, 0, 0);
      const cellText = cell.value || '';
      
      // 如果是第一行，使用粗体
      if (rowIndex === 0) {
        setCnFont(doc, 'bold');
      } else {
        setCnFont(doc, 'normal');
      }
      
      if (cellText) {
        // 文本换行处理
        const availableWidth = cellWidth - (cellPadding * 2);
        const wrappedText = doc.splitTextToSize(cellText, availableWidth);
        
        // 计算文本起始位置（垂直居中）
        const textHeight = wrappedText.length * lineHeight;
        const textStartY = cellY + (rowHeight - textHeight) / 2 + lineHeight;
        
        // 绘制文本
        wrappedText.forEach((line: string, lineIndex: number) => {
          const textY = textStartY + (lineIndex * lineHeight);
          doc.text(line, cellX + cellPadding, textY);
        });
      }
      
      cellX += cellWidth;
    });
    
    // 绘制最后一列的右边框
    doc.line(cellX, rowY, cellX, rowY + rowHeight);
    
    currentY += rowHeight;
  });
  
  // 绘制底部边框
  doc.line(startX, currentY, startX + tableWidth, currentY);
  
  return currentY + 5; // 返回表格底部位置，加上5mm间距
}

/** ---- 基础类型 ---- */
type RGB = [number, number, number];

interface PdfInlineStyle {
  fontName?: string;              // e.g. 'Helvetica' / 'PingFangSC'，你项目里 setCnFont 时要保证已注册
  fontBold?: boolean;
  fontItalic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;              // px 或 pt。下方统一用 jsPDF 的单位（默认 pt）
  color?: RGB;                    // [r,g,b]
}

interface LayoutOptions {
  x: number;             // 左起始
  y: number;             // 顶部起始
  maxWidth: number;      // 可排版区域宽度
  lineHeight: number;    // 行高（推荐 = 字号 * 1.4）
  paragraphSpacing?: number; // 段落间距，默认 0
}

/** ---- 工具：样式应用与测量 ---- */
function applyStyle(doc: jsPDF, s: PdfInlineStyle) {
  const name = s.fontName || 'Helvetica';
  const style = (s.fontBold ? 'bold' : 'normal') + (s.fontItalic ? 'italic' : '');
  // jsPDF 里组合样式通常是 'normal' | 'bold' | 'italic' | 'bolditalic'
  const styleName =
    s.fontBold && s.fontItalic ? 'bolditalic' :
    s.fontBold ? 'bold' :
    s.fontItalic ? 'italic' : 'normal';

  doc.setFont(name, styleName as any);
  doc.setFontSize(s.fontSize || 9);
  const [r, g, b] = s.color ?? [0, 0, 0];
  doc.setTextColor(r, g, b);
}

function textWidth(doc: jsPDF, text: string, s: PdfInlineStyle): number {
  applyStyle(doc, s);
  return doc.getTextWidth(text);
}

/** ---- 工具：下划线 / 删除线绘制 ---- */
function drawDecoration(
  doc: jsPDF, 
  text: string,
  x: number,
  y: number,
  s: PdfInlineStyle,
  baseline: 'top' | 'alphabetic',
) {
  if (!s.underline && !s.strike) return;

  applyStyle(doc, s);
  const w = doc.getTextWidth(text);
  const fs = s.fontSize || 9;

  // 以绘制时的 baseline 决定线条位置；这里假定我们用 'top'（见下方 render 时的选项）
  // 如果你项目中使用默认基线（alphabetic），可以适当调整偏移
  const thickness = Math.max(0.5, fs * 0.06); // 线粗
  const underlineOffset = fs * 0.15;          // 下划线距顶部偏移
  const strikeOffset = fs * 0.45;             // 删除线距顶部偏移

  const yOffsetTop = baseline === 'top' ? y : y - fs; // 若 baseline=alphabetic，可换算

  if (s.underline) {
    const uy = yOffsetTop + fs - underlineOffset;
    doc.setLineWidth(thickness);
    doc.line(x, uy, x + w, uy);
  }
  if (s.strike) {
    const sy = yOffsetTop + strikeOffset;
    doc.setLineWidth(thickness);
    doc.line(x, sy, x + w, sy);
  }
}

/** ---- 将颜色字符串解析为 RGB ---- */
function parseColorToRGB(color: string | undefined): RGB | undefined {
  if (!color) return undefined;
  // 简单处理：#rrggbb / rgb(r,g,b) / 常见颜色名（可按需扩展）
  const named: Record<string, RGB> = {
    red: [255, 0, 0],
    blue: [0, 0, 255],
    green: [0, 128, 0],
    black: [0, 0, 0],
    white: [255, 255, 255],
    gray: [128, 128, 128],
    grey: [128, 128, 128],
    yellow: [255, 255, 0],
    orange: [255, 165, 0],
    purple: [128, 0, 128],
    // ... 按需扩展
  };
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    const hex = color.length === 4
      ? '#' + color.slice(1).split('').map(c => c + c).join('')
      : color;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
  }
  if (color.startsWith('rgb')) {
    const m = color.match(/rgb\(\s*(\d+)[^\d]+(\d+)[^\d]+(\d+)\s*\)/i);
    if (m) return [parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)];
  }
  const lower = color.toLowerCase();
  if (named[lower]) return named[lower];
  return undefined;
}

/** ---- 从 DOM 节点提取内联 runs（仅关注内联：b, i, u, s, font color, span style 等） ---- */
interface TextRun {
  text: string;
  style: PdfInlineStyle;
}
interface Paragraph {
  runs: TextRun[];
  isListItem?: boolean; // 如需列表渲染可扩展
}

function cloneStyle(base: PdfInlineStyle): PdfInlineStyle {
  return { ...base };
}

function isBlockElement(tag: string) {
  return ['p', 'div', 'li', 'ul', 'ol', 'table', 'tr', 'td', 'th', 'h1','h2','h3','h4','h5','h6'].includes(tag);
}

function collectParagraphsFromHTML(html: string, baseStyle: PdfInlineStyle): Paragraph[] {
  // 用一个临时容器解析（在浏览器端可用；若服务端需 JSDOM，自行注入）
  const container = document.createElement('div');
  container.innerHTML = html;

  const paragraphs: Paragraph[] = [];
  let current: Paragraph = { runs: [] };

  function flushParagraph() {
    if (current.runs.length) {
      paragraphs.push(current);
      current = { runs: [] };
    }
  }

  function walk(node: Node, inherited: PdfInlineStyle) {
    if (node.nodeType === Node.TEXT_NODE) {
      const raw = (node.textContent || '').replace(/\r/g, '');
      if (raw.length) {
        current.runs.push({ text: raw, style: cloneStyle(inherited) });
      }
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // 块级元素：结束当前段落，开始新段
    if (isBlockElement(tag)) {
      // 段落换行：先冲掉已有的
      flushParagraph();
      // 进入块内部
      Array.from(el.childNodes).forEach(child => walk(child, inherited));
      // 块结束再 flush（除非内部已经产生内容）
      flushParagraph();
      return;
    }

    // 处理内联样式
    const nextStyle = cloneStyle(inherited);
    if (tag === 'b' || tag === 'strong') nextStyle.fontBold = true;
    if (tag === 'i' || tag === 'em') nextStyle.fontItalic = true;
    if (tag === 'u') nextStyle.underline = true;
    if (tag === 's' || tag === 'strike' || tag === 'del') nextStyle.strike = true;
    if (tag === 'font') {
      const color = (el.getAttribute('color') || '').trim();
      const rgb = parseColorToRGB(color);
      if (rgb) nextStyle.color = rgb;
    }
    // style 属性里的 color
    const inlineColor = el.style?.color;
    if (inlineColor) {
      const rgb = parseColorToRGB(inlineColor);
      if (rgb) nextStyle.color = rgb;
    }

    if (tag === 'br') {
      // 用换行符标记，让后续布局阶段处理换行
      current.runs.push({ text: '\n', style: cloneStyle(nextStyle) });
      return;
    }

    Array.from(el.childNodes).forEach(child => walk(child, nextStyle));
  }

  Array.from(container.childNodes).forEach(n => walk(n, baseStyle));
  // 收尾
  flushParagraph();
  return paragraphs;
}

/** ---- 将一个段落按"逐词布局，超宽换行"的方式绘制到 PDF ---- */
function renderParagraphInline(
  doc: jsPDF,
  para: Paragraph,
  opt: LayoutOptions,
) {
  const baseline: 'top' | 'alphabetic' = 'top'; // 推荐 'top'，便于自己控制行高
  let x = opt.x;
  let y = opt.y;
  const right = opt.x + opt.maxWidth;

  for (const run of para.runs) {
    // 将 run.text 按"空白与非空白"分词；保留空格与换行
    const tokens = run.text.split(/(\s+)/); // ["Hello", " ", "world", ...]
    for (const tk of tokens) {
      if (!tk) continue;

      // 显式换行符
      if (tk.includes('\n')) {
        const parts = tk.split('\n');
        for (let i = 0; i < parts.length; i++) {
          const chunk = parts[i];
          if (chunk) {
            const w = textWidth(doc, chunk, run.style);
            // 如果这一行放不下，先换行
            if (x + w > right) {
              x = opt.x;
              y += opt.lineHeight;
            }
            applyStyle(doc, run.style);
            doc.text(chunk, x, y, { baseline });
            drawDecoration(doc, chunk, x, y, run.style, baseline);
            x += w;
          }
          // 除了最后一个 part，其余都意味着一个换行
          if (i < parts.length - 1) {
            x = opt.x;
            y += opt.lineHeight;
          }
        }
        continue;
      }

      const w = textWidth(doc, tk, run.style);

      // 软换行：本词太长则折到下一行
      if (x + w > right && x !== opt.x) {
        x = opt.x;
        y += opt.lineHeight;
      }

      applyStyle(doc, run.style);
      doc.text(tk, x, y, { baseline });
      drawDecoration(doc, tk, x, y, run.style, baseline);
      x += w;
    }
  }

  // 返回绘制后的 y，用于上层叠加段落间距
  return y;
}

/**
 * 在PDF中渲染富文本内容
 */
function renderRichTextInPDF(
  doc: jsPDF, 
  htmlText: string, 
  startX: number, 
  startY: number, 
  maxWidth: number,
  checkAndAddPage: (y: number, needed?: number) => number
): number {
  let currentY = startY;
  
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    // 服务器端环境，使用简单的文本解析
    return renderSimpleRichText(doc, htmlText, startX, startY, maxWidth, checkAndAddPage);
  }
  
  console.log('PDF生成器接收到的HTML:', htmlText);
  
  // 使用新的"先布局、后绘制"方案
  const baseStyle: PdfInlineStyle = {
    fontName: 'NotoSansSC',   // 使用项目中的中文字体
    fontSize: 9,              // 与PDF其他部分保持一致的字号
    color: [0, 0, 0],
    fontBold: false,
    fontItalic: false,
    underline: false,
    strike: false,
  };
  
  // 1) 解析 HTML -> 段落（每段包含 runs）
  const paragraphs = collectParagraphsFromHTML(htmlText, baseStyle);
  console.log('解析出的段落数量:', paragraphs.length);
  
  // 2) 逐段排版绘制（不因样式变化换行）
  const fs = baseStyle.fontSize || 9;
  const lh = Math.round(fs * 1.4); // 增加行高倍数，确保行间距足够
  const paragraphSpacing = 5; // 添加适当的段落间距
  
  for (const p of paragraphs) {
    console.log('处理段落，runs数量:', p.runs.length);
    const lastY = renderParagraphInline(doc, p, {
      x: startX,
      y: currentY,
      maxWidth,
      lineHeight: lh,
      paragraphSpacing,
    });
    currentY = lastY + paragraphSpacing; // 添加段落间距
  }
  
  // 恢复默认样式，确保后续渲染不受影响
  setCnFont(doc, 'normal');
  doc.setFontSize(9); // 恢复到PDF其他部分使用的字号
  doc.setTextColor(0, 0, 0);
  
  // 在富文本内容结束后添加额外的间距，确保与下一个区域有合适的距离
  return currentY + 8;
}

/**
 * 服务器端简单的富文本解析（不使用DOM）
 */
function renderSimpleRichText(
  doc: jsPDF, 
  htmlText: string, 
  startX: number, 
  startY: number, 
  maxWidth: number,
  checkAndAddPage: (y: number, needed?: number) => number
): number {
  let currentY = startY;
  
  // 简单的HTML标签处理
  let text = htmlText;
  
  // 移除HTML标签，保留文本内容
  text = text
    .replace(/<br\s*\/?>/gi, '\n') // 换行
    .replace(/<\/p>/gi, '\n\n') // 段落结束
    .replace(/<p[^>]*>/gi, '') // 段落开始
    .replace(/<strong[^>]*>|<\/strong>|<b[^>]*>|<\/b>/gi, '**') // 粗体标记
    .replace(/<em[^>]*>|<\/em>|<i[^>]*>|<\/i>/gi, '*') // 斜体标记
    .replace(/<u[^>]*>|<\/u>/gi, '_') // 下划线标记
    .replace(/<s[^>]*>|<\/s>|<strike[^>]*>|<\/strike>/gi, '~~') // 删除线标记
    .replace(/<span[^>]*style="[^"]*font-size:\s*([^;"]+)[^"]*"[^>]*>|<\/span>/gi, '') // 移除字体大小span
    .replace(/<span[^>]*style="[^"]*color:\s*([^;"]+)[^"]*"[^>]*>|<\/span>/gi, '') // 移除颜色span
    .replace(/<font[^>]*color="[^"]*"[^>]*>|<\/font>/gi, '') // 移除font标签的颜色
    .replace(/<span[^>]*>|<\/span>/gi, '') // 移除其他span
    .replace(/<ul[^>]*>|<\/ul>|<ol[^>]*>|<\/ol>/gi, '') // 列表容器
    .replace(/<li[^>]*>|<\/li>/gi, '\n• ') // 列表项
    .replace(/<table[^>]*>|<\/table>/gi, '') // 表格容器
    .replace(/<tr[^>]*>|<\/tr>/gi, '\n') // 表格行
    .replace(/<td[^>]*>|<\/td>|<th[^>]*>|<\/th>/gi, '\t') // 表格单元格
    .replace(/<img[^>]*>/gi, '[图片]') // 图片
    .replace(/<a[^>]*>|<\/a>/gi, '') // 链接
    .replace(/<[^>]*>/g, ''); // 移除其他HTML标签
  
  // 处理粗体文本
  const boldRegex = /\*\*(.*?)\*\*/g;
  let match;
  let lastIndex = 0;
  let processedText = '';
  
  while ((match = boldRegex.exec(text)) !== null) {
    processedText += text.slice(lastIndex, match.index);
    processedText += `[BOLD]${match[1]}[/BOLD]`;
    lastIndex = match.index + match[0].length;
  }
  processedText += text.slice(lastIndex);
  
  // 处理斜体文本
  const italicRegex = /\*(.*?)\*/g;
  lastIndex = 0;
  text = processedText;
  processedText = '';
  
  while ((match = italicRegex.exec(text)) !== null) {
    processedText += text.slice(lastIndex, match.index);
    processedText += `[ITALIC]${match[1]}[/ITALIC]`;
    lastIndex = match.index + match[0].length;
  }
  processedText += text.slice(lastIndex);
  
  // 处理下划线文本
  const underlineRegex = /_(.*?)_/g;
  lastIndex = 0;
  text = processedText;
  processedText = '';
  
  while ((match = underlineRegex.exec(text)) !== null) {
    processedText += text.slice(lastIndex, match.index);
    processedText += `[UNDERLINE]${match[1]}[/UNDERLINE]`;
    lastIndex = match.index + match[0].length;
  }
  processedText += text.slice(lastIndex);
  
  // 处理删除线文本
  const strikethroughRegex = /~~(.*?)~~/g;
  lastIndex = 0;
  text = processedText;
  processedText = '';
  
  while ((match = strikethroughRegex.exec(text)) !== null) {
    processedText += text.slice(lastIndex, match.index);
    processedText += `[STRIKETHROUGH]${match[1]}[/STRIKETHROUGH]`;
    lastIndex = match.index + match[0].length;
  }
  processedText += text.slice(lastIndex);
  
  // 按行处理文本
  const lines = processedText.split('\n');
  
  for (const line of lines) {
    if (line.trim() === '') {
      continue; // 跳过空行，不添加额外间距
    }
    
    // 检查是否包含制表符（表格）
    if (line.includes('\t')) {
      const cells = line.split('\t');
      const cellWidth = maxWidth / cells.length;
      const rowHeight = 6;
      
      currentY = checkAndAddPage(currentY, rowHeight);
      
      cells.forEach((cell, cellIndex) => {
        const cellX = startX + (cellIndex * cellWidth);
        const cellText = cell.trim();
        
        // 绘制单元格边框
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.1);
        doc.rect(cellX, currentY, cellWidth, rowHeight);
        
        // 绘制文本
        if (cellText) {
          const wrappedCellText = doc.splitTextToSize(cellText, cellWidth - 2);
          wrappedCellText.forEach((line: string, lineIndex: number) => {
            if (lineIndex === 0) {
              doc.text(line, cellX + 1, currentY + 3);
            }
          });
        }
      });
      
      currentY += rowHeight;
    } else {
      // 普通文本行
      let currentX = startX;
      let currentLine = line;
      
      // 处理格式化标记
      const formatRegex = /\[(BOLD|ITALIC|UNDERLINE|STRIKETHROUGH)\](.*?)\[\/(BOLD|ITALIC|UNDERLINE|STRIKETHROUGH)\]/g;
      let formatMatch;
      let textStart = 0;
      
      while ((formatMatch = formatRegex.exec(line)) !== null) {
        // 先渲染标记前的文本
        const beforeText = line.slice(textStart, formatMatch.index);
        if (beforeText) {
          const wrappedText = doc.splitTextToSize(beforeText, maxWidth - (currentX - startX));
          currentY = checkAndAddPage(currentY, wrappedText.length * 4);
          wrappedText.forEach((textLine: string) => {
            doc.text(textLine, currentX, currentY);
            currentY += 4;
          });
          currentX = startX;
        }
        
        // 渲染格式化文本
        const formatType = formatMatch[1];
        const formatText = formatMatch[2];
        
        if (formatType === 'BOLD') {
          setCnFont(doc, 'bold');
        }
        
        const wrappedFormatText = doc.splitTextToSize(formatText, maxWidth);
        currentY = checkAndAddPage(currentY, wrappedFormatText.length * 4);
        wrappedFormatText.forEach((textLine: string) => {
          doc.text(textLine, currentX, currentY);
          currentY += 4;
        });
        
        if (formatType === 'BOLD') {
          setCnFont(doc, 'normal');
        }
        // 注意：删除线在PDF中可能不显示，但文本会正常显示
        
        currentX = startX;
        textStart = formatMatch.index + formatMatch[0].length;
      }
      
      // 渲染剩余的文本
      const remainingText = line.slice(textStart);
      if (remainingText) {
        const wrappedText = doc.splitTextToSize(remainingText, maxWidth);
        currentY = checkAndAddPage(currentY, wrappedText.length * 4);
        wrappedText.forEach((textLine: string) => {
          doc.text(textLine, currentX, currentY);
          currentY += 4;
        });
      }
    }
  }
  
  return currentY + 5;
}

// 扩展jsPDF类型
interface ExtendedJsPDF extends jsPDF {
  lastAutoTable: {
    finalY: number;
  };
  autoTable: (options: UserOptions) => void;
  getNumberOfPages: () => number;
  saveGraphicsState: () => jsPDF;
  restoreGraphicsState: () => jsPDF;
  setGState: (gState: GState) => jsPDF;
  GState: (parameters: GState) => GState;
  getImageProperties: (image: string) => ImageProperties;
}

// 获取印章图片的简化版本
async function getStampImage(stampType: string): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  if (stampType === 'shanghai') {
    return embeddedResources.shanghaiStamp;
  } else if (stampType === 'hongkong') {
    return embeddedResources.hongkongStamp;
  }
  return '';
}

// 获取表头图片
async function getHeaderImage(): Promise<string> {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  return embeddedResources.headerImage;
}

// 生成采购订单PDF
export const generatePurchaseOrderPDF = async (data: PurchaseOrderData, preview = false): Promise<Blob> => {
  // 检查是否在客户端环境
  if (typeof window === 'undefined') {
    throw new Error('PDF generation is only available in client-side environment');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  }) as ExtendedJsPDF;

  // 添加中文字体
  await ensurePdfFont(doc);

  // 开发期自检断言
  if (process.env.NODE_ENV === 'development') {
    const fonts = doc.getFontList();
    if (!fonts['NotoSansSC'] || !fonts['NotoSansSC']?.includes('normal')) {
      console.error('[PDF] NotoSansSC 未在当前 doc 注册完整', fonts);
    } else {
      console.log('[PDF] 采购单字体注册验证通过:', fonts['NotoSansSC']);
    }
  }

  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;  // 页面边距
  let startY = margin;  // 初始化起始位置

  const pageHeight = doc.internal.pageSize.height;
  const checkAndAddPage = (y: number, needed = 20) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  };

  try {
    // 添加表头
    try {
      const headerImage = `data:image/png;base64,${await getHeaderImage()}`;
      const imgProperties = doc.getImageProperties(headerImage);
      const imgWidth = pageWidth - 30;  // 左右各留15mm
      const imgHeight = (imgProperties.height * imgWidth) / imgProperties.width;
      doc.addImage(
        headerImage,
        'PNG',
        15,  // 左边距15mm
        15,  // 上边距15mm
        imgWidth,
        imgHeight
      );
      doc.setFontSize(14);
      setCnFont(doc, 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + imgHeight + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    } catch (error) {
      console.error('Error processing header:', error);
      // 使用默认布局
      doc.setFontSize(14);
      setCnFont(doc, 'bold');
      const title = 'PURCHASE ORDER';
      const titleWidth = doc.getTextWidth(title);
      const titleY = margin + 5;  // 标题Y坐标
      doc.text(title, (pageWidth - titleWidth) / 2, titleY);  // 标题位置
      startY = titleY + 10;  // 主体内容从标题下方开始
    }

    // 设置字体和样式
    doc.setFontSize(9);
    setCnFont(doc, 'normal');
    
    let currentY = startY;
    const leftMargin = 20;
    const maxWidth = pageWidth - 2 * margin;
    const indent = 5;
    const contentMargin = leftMargin + indent;
    const contentMaxWidth = maxWidth - indent;

    // 基本信息区域 - 调整为左右两列布局
    const leftInfoItems = [
      { label: 'Attn:', value: data.attn },
      { label: 'Our ref:', value: data.ourRef },
      { label: 'Your ref:', value: data.yourRef }
    ];

    const rightInfoItems = [
      { label: 'Order No.:', value: data.orderNo },
      { label: 'Date:', value: data.date },
      { label: 'From:', value: data.from.charAt(0).toUpperCase() + data.from.slice(1) }
    ];

    // 绘制左侧基本信息
    leftInfoItems.forEach((item, index) => {
      const y = startY + (index * 5);
      setCnFont(doc, 'bold');
      doc.text(item.label, leftMargin, y);
      setCnFont(doc, 'normal');
      const labelWidth = doc.getTextWidth(item.label);
      const valueX = leftMargin + labelWidth + 2;
      const valueText = item.value || '';
      const maxValueWidth = (pageWidth / 2) - leftMargin - labelWidth - 5;
      const wrappedValue = doc.splitTextToSize(valueText, maxValueWidth);
      wrappedValue.forEach((line: string, lineIndex: number) => {
        doc.text(line, valueX, y + (lineIndex * 4));
      });
      currentY = Math.max(currentY, y + (wrappedValue.length * 4));
    });

    // 定义右侧值的起始X坐标，并右对齐标签
    const rightValuesX = pageWidth - margin - 30;

    // 绘制右侧基本信息
    rightInfoItems.forEach((item: { label: string; value: string }, index) => {
      const y = startY + (index * 5); // 统一行间距
      
      // 绘制标签 (黑色, 加粗)
      setCnFont(doc, 'bold');
      doc.setTextColor(0, 0, 0);
      const labelWidth = doc.getTextWidth(item.label);
      const labelX = rightValuesX - labelWidth - 2;
      doc.text(item.label, labelX, y);
      
      // 绘制值
      if (item.label === 'Order No.:') {
        setCnFont(doc, 'bold');
        doc.setTextColor(0, 0, 255); // Blue
      } else {
        setCnFont(doc, 'normal');
        doc.setTextColor(0, 0, 0); // Black
      }

      const valueX = rightValuesX;
      const valueText = item.value || '';
      const maxValueWidth = pageWidth - margin - valueX;
      const wrappedValue = doc.splitTextToSize(valueText, maxValueWidth);
      wrappedValue.forEach((line: string, lineIndex: number) => {
        doc.text(line, valueX, y + (lineIndex * 4));
      });
      currentY = Math.max(currentY, y + (wrappedValue.length * 4));
    });

    // 重置样式
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);

    currentY += 10;

    // 1. 供货范围和成交价格
    currentY = checkAndAddPage(currentY, 25);
    setCnFont(doc, 'bold');
    doc.text('1. 供货范围和成交价格：', leftMargin, currentY);
    currentY += 6;
    
    setCnFont(doc, 'normal');
    doc.setFontSize(9);
    
    let currentX = contentMargin;

    // Helper to draw text parts with different styles
    const drawPart = (text: string, style: 'normal' | 'bold', color: [number, number, number]) => {
      setCnFont(doc, style);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(text, currentX, currentY);
      currentX += doc.getTextWidth(text);
    };

    // Draw parts of the line with specific styling
    drawPart('客户确认贵司于', 'normal', [0, 0, 0]);
    drawPart(data.supplierQuoteDate, 'bold', [0, 0, 255]);
    drawPart(' ', 'normal', [0, 0, 0]);
    drawPart(data.yourRef, 'bold', [0, 0, 255]);

    // Handle the rest of the text with wrapping
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    const suffix = ' 报价提供的项目价格、规格和交货条件；';
    const remainingWidth = pageWidth - margin - currentX;
    const wrappedSuffix = doc.splitTextToSize(suffix, remainingWidth);
    
    // jsPDF's text method handles rendering the array of wrapped lines
    doc.text(wrappedSuffix, currentX, currentY);
    
    // Update Y position based on the number of lines in the wrapped text
    currentY += (wrappedSuffix.length - 1) * 4;

    currentY += 5; // Move to the next logical line

   

    const line2Text = '该订单的合同价款是：';
    doc.text(line2Text, contentMargin, currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255);
    const line2TextWidth = doc.getTextWidth(line2Text);
    const amount = parseFloat(data.contractAmount) || 0;
    const formattedAmount = amount.toFixed(2);
    const fullContractAmount = `${data.currency} ${formattedAmount}`;
    doc.text(fullContractAmount, contentMargin + line2TextWidth + 1, currentY);
    currentY += 5;

    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('客户确认订单时对于项目的', contentMargin, currentY);
    const specDescText = '规格描述';
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 255);
    doc.text(specDescText, contentMargin + doc.getTextWidth('客户确认订单时对于项目的'), currentY);
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text('供你们参考；', contentMargin + doc.getTextWidth('客户确认订单时对于项目的规格描述'), currentY);
    currentY += 2; // 减少间距，为富文本内容留出更紧凑的空间

    // 项目规格描述（支持富文本格式）
    const specText = data.projectSpecification || '';
    if (specText.trim()) {
      console.log('规格描述文本:', specText); // 调试信息
      
      // 检查是否包含HTML标签，如果是则渲染为富文本
      if (specText.includes('<') && specText.includes('>')) {
        console.log('使用富文本渲染'); // 调试信息
        currentY = renderRichTextInPDF(doc, specText, contentMargin, currentY, contentMaxWidth, checkAndAddPage);
      } else if (specText.includes('\t')) {
        // 检查是否包含制表符，如果是则渲染为表格
        currentY = renderTableInPDF(doc, specText, contentMargin, currentY, contentMaxWidth, checkAndAddPage);
      } else {
        // 普通文本渲染
        const wrappedSpecText = doc.splitTextToSize(specText, contentMaxWidth);
        if (wrappedSpecText.length > 0) {
          currentY = checkAndAddPage(currentY, wrappedSpecText.length * 4);
          doc.setTextColor(0, 0, 255); // 设置蓝色
          wrappedSpecText.forEach((line: string) => {
            doc.text(line, contentMargin, currentY);
            currentY += 4; 
          });
          doc.setTextColor(0, 0, 0); // 恢复黑色
          currentY += 5;
        }
      }
    } else {
      // 当没有规格描述内容时，也要添加适当的间距
      currentY += 8;
    }

    // 2. 付款条件
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    const paymentTitle = '2. 付款条件：';
    doc.text(paymentTitle, leftMargin, currentY);
    const paymentTitleWidth = doc.getTextWidth(paymentTitle);
    
    setCnFont(doc, 'normal');
    const paymentText = data.paymentTerms || '交货后30天；';
    const paymentContentX = leftMargin + paymentTitleWidth;
    const wrappedPaymentText = doc.splitTextToSize(paymentText, maxWidth - paymentTitleWidth);
    doc.text(wrappedPaymentText, paymentContentX, currentY);
    currentY += wrappedPaymentText.length * 4;

    currentY += 5;

    // 3. 发票要求
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    const invoiceTitle = '3. 发票要求：';
    doc.text(invoiceTitle, leftMargin, currentY);
    const invoiceTitleWidth = doc.getTextWidth(invoiceTitle);
    
    setCnFont(doc, 'normal');
    const invoiceText = data.invoiceRequirements || '请在发票开具前与我司财务确认；';
    const invoiceContentX = leftMargin + invoiceTitleWidth;
    const wrappedInvoiceText = doc.splitTextToSize(invoiceText, maxWidth - invoiceTitleWidth);
    doc.text(wrappedInvoiceText, invoiceContentX, currentY);
    currentY += wrappedInvoiceText.length * 4;

    // 添加银行信息（如果启用）
    if (data.showBank) {
      const bankInfo = getBankInfo();
      currentY = checkAndAddPage(currentY, bankInfo.length * 4);
      
      doc.setFontSize(9);
      
      bankInfo.forEach((line, index) => {
        if (index === 0) {
          setCnFont(doc, 'bold');
        } else {
          setCnFont(doc, 'normal');
        }
        doc.text(line, contentMargin, currentY + (index * 4));
      });

      currentY += bankInfo.length * 4;
    }

    currentY += 5;

    // 4. 关于交货
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('4. 关于交货：', leftMargin, currentY);
    currentY += 5;
    
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 255);
    doc.text('收货人信息如下：', contentMargin, currentY);
    currentY += 5;

    // 交货信息（多行文本框）
    const deliveryText = data.deliveryInfo || 'TBD';
    const wrappedDeliveryText = doc.splitTextToSize(deliveryText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedDeliveryText.length * 4);
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 0);
    wrappedDeliveryText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 6;

    // 5. 客户的订单号码
    currentY = checkAndAddPage(currentY);
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text('5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：', leftMargin, currentY);
    currentY += 5;
    
    setCnFont(doc, 'normal');
    doc.setTextColor(0, 0, 255);
    const orderNumbersText = data.orderNumbers || 'TBD';
    const wrappedOrderNumbersText = doc.splitTextToSize(orderNumbersText, contentMaxWidth);
    currentY = checkAndAddPage(currentY, wrappedOrderNumbersText.length * 4);
    wrappedOrderNumbersText.forEach((line: string) => {
      doc.text(line, contentMargin, currentY);
      currentY += 4;
    });

    currentY += 8;

    // 结尾确认语和印章
    const confirmationText = '上述订单，烦请确认！';
    const textHeight = 4; // 9pt字体大约4mm高
    
    // 检查分页，为印章和文字预留空间
    const stampHeight = data.stampType === 'shanghai' ? 40 : 34;
    const requiredHeight = data.stampType !== 'none' ? stampHeight + 5 : textHeight + 5;
    let confirmationY = checkAndAddPage(currentY, requiredHeight);
    
    const textY = confirmationY + 0; // 定义文字的Y坐标

    // 1. 添加印章（如果启用），先绘制
    if (data.stampType !== 'none') {
      try {
        // 使用优化的印章图片
        const stampImageBase64 = await getStampImage(data.stampType);
        
        if (stampImageBase64 && stampImageBase64.trim()) {
          const stampImage = `data:image/png;base64,${stampImageBase64}`;
          const stampWidth = data.stampType === 'shanghai' ? 40 : 73;

          let stampX = leftMargin;
          let stampY = textY - 5; // 默认Y位置

          if (data.stampType === 'shanghai') {
            stampX += 10; // 上海印章右移10mm
          } else if (data.stampType === 'hongkong') {
            stampY += 5; // 香港印章下移5mm
          }

          doc.saveGraphicsState();
          doc.setGState(new GState({ opacity: 0.9 }));
          doc.addImage(stampImage, 'PNG', stampX, stampY, stampWidth, stampHeight);
          doc.restoreGraphicsState();
        }
      } catch (error) {
        console.error('Error loading stamp image:', error);
        // 如果印章加载失败，继续执行，不中断PDF生成
      }
    }
    
    // 2. 结尾确认语，后绘制（使其位于上层）
    setCnFont(doc, 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(confirmationText, leftMargin, textY);

    // 更新currentY，以便后续内容可以正确衔接
    currentY = data.stampType !== 'none' ? textY + stampHeight - 15 : textY + 5;


    // 添加页码 - 调整到右下角
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      setCnFont(doc, 'normal');
      const pageText = `Page ${i} of ${pageCount}`;
      const pageTextWidth = doc.getTextWidth(pageText);
      const pageHeight = doc.internal.pageSize.height;
      // 将页码放在右下角，距离右边距10mm，距离下边距10mm
      doc.text(pageText, pageWidth - pageTextWidth - 10, pageHeight - 10);
    }

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }

  if (preview) {
    return doc.output('blob');
  }

  return doc.output('blob');
}; 