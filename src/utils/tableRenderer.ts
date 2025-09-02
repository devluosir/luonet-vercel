import jsPDF from 'jspdf';

type RGB = [number, number, number];

export interface PdfInlineStyle {
  fontName?: string;
  fontBold?: boolean;
  fontItalic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontSize?: number;
  color?: RGB;
}

type HAlign = 'left' | 'center' | 'right';
type VAlign = 'top' | 'middle' | 'bottom';

interface CellStyle extends PdfInlineStyle {
  fillColor?: RGB;
  borderColor?: RGB;
  borderWidth?: number;
  padding?: number;
  halign?: HAlign;
  valign?: VAlign;
  wrap?: boolean;
}

interface TableCell {
  rawHtml: string;
  text: string;
  colSpan: number;
  rowSpan: number;
  style: CellStyle;
  isHeader?: boolean;
}

interface TableRow {
  cells: TableCell[];
  isHeader?: boolean;
}

interface TableModel {
  rows: TableRow[];
  colCount: number;
}

interface ColumnLayout { width: number }
interface RowLayout { height: number }
interface TableLayout { columns: ColumnLayout[]; rows: RowLayout[] }

const NAMED: Record<string, RGB> = {
  black:[0,0,0], white:[255,255,255], red:[255,0,0], blue:[0,0,255],
  green:[0,128,0], gray:[128,128,128], grey:[128,128,128],
  yellow:[255,255,0], orange:[255,165,0], purple:[128,0,128],
  pink:[255,192,203], cyan:[0,255,255],
};

function parseColorToRGB(color?: string): RGB | undefined {
  if (!color) return;
  const s = color.trim().toLowerCase();
  if (NAMED[s]) return NAMED[s];
  if (s.startsWith('#')) {
    const hex = s.length === 4 ? '#' + s.slice(1).split('').map(c=>c+c).join('') : s;
    return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
  }
  const m = s.match(/rgb\((\d+)[^\d]+(\d+)[^\d]+(\d+)\)/);
  if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}

function applyStyle(doc: jsPDF, s: PdfInlineStyle) {
  const font = s.fontName || 'Helvetica';
  const style =
    s.fontBold && s.fontItalic ? 'bolditalic' :
    s.fontBold ? 'bold' :
    s.fontItalic ? 'italic' : 'normal';
  doc.setFont(font, style as any);
  doc.setFontSize(s.fontSize || 12);
  const [r,g,b] = s.color ?? [0,0,0];
  doc.setTextColor(r,g,b);
}

// 替换：将 <br> → \n，并去掉块级标签末尾的冗余换行
function htmlToPlainText(html: string) {
  const processedHtml = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li)>/gi, '\n');
  const div = document.createElement('div');
  div.innerHTML = processedHtml;
  return (div.textContent || '').replace(/\u00A0/g, ' ');
}

// 新增：按宽度分行（支持硬切超长串）
function layoutLines(
  doc: jsPDF,
  text: string,
  innerWidth: number,
  fontStyle: PdfInlineStyle,
  lineHeight: number
): string[] {
  const widthOf = (s: string) => doc.getTextWidth(s) * 1.01; // 1% buffer，抗抖
  applyStyle(doc, fontStyle);

  const paragraphs = text.replace(/\r/g, '').split('\n');
  const lines: string[] = [];

  const hardCut = (token: string): string[] => {
    // 连续无空格长串：按字符硬切
    const out: string[] = [];
    let cur = '';
    const chars = token.split('');
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (widthOf(cur + ch) > innerWidth && cur.length > 0) {
        out.push(cur);
        cur = ch;
      } else {
        cur += ch;
      }
    }
    if (cur) out.push(cur);
    return out.length ? out : [''];
  };

  for (const para of paragraphs) {
    const tokens = para.split(/(\s+)/).filter(t => t.length > 0);
    let acc = '';
    let accW = 0;

    for (const tk of tokens) {
      const ww = widthOf(tk);
      if (!/\s+/.test(tk) && ww > innerWidth) {
        // 先推送累积，再对当前 token 硬切
        if (acc) { lines.push(acc); acc = ''; accW = 0; }
        const chunks = hardCut(tk);
        lines.push(...chunks.slice(0, -1));
        acc = chunks[chunks.length - 1];
        accW = widthOf(acc);
      } else if (accW + ww > innerWidth && accW > 0) {
        lines.push(acc);
        acc = tk;
        accW = ww;
      } else {
        acc += tk;
        accW += ww;
      }
    }
    lines.push(acc);
  }

  // 去掉首尾多余空行，但保证至少一行
  while (lines.length > 1 && lines[0].trim() === '') lines.shift();
  while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.length ? lines : [''];
}

function getAlign(el: HTMLElement): HAlign | undefined {
  const a = (el.getAttribute('align') || el.style.textAlign || '').toLowerCase();
  if (a.includes('center')) return 'center';
  if (a.includes('right')) return 'right';
  if (a.includes('left')) return 'left';
}

function pickCellStyle(el: HTMLElement, base: PdfInlineStyle): CellStyle {
  const s: CellStyle = {
    ...base,
    padding: 1.5,         // 从 3 降到 1.5
    borderWidth: 0.2,
    borderColor: [0,0,0],
    wrap: true,
    valign: 'middle',     // 默认居中（td/th 上的 vertical-align 会覆盖）
  };
  const color = el.style?.color || el.getAttribute('color') || '';
  const rgb = parseColorToRGB(color);
  if (rgb) s.color = rgb;

  const bg = el.style?.backgroundColor || '';
  const bgrgb = parseColorToRGB(bg);
  if (bgrgb) s.fillColor = bgrgb;

  const ha = getAlign(el);
  if (ha) s.halign = ha;

  // 读取 vertical-align
  const va = (el.getAttribute('valign') || el.style.verticalAlign || '').toLowerCase();
  if (va.includes('middle') || va.includes('center')) s.valign = 'middle';
  else if (va.includes('bottom')) s.valign = 'bottom';
  else if (va.includes('top')) s.valign = 'top';

  if (el.tagName.toLowerCase() === 'th') s.fontBold = true;
  return s;
}

function parseTable(tableEl: HTMLTableElement, base: PdfInlineStyle): TableModel {
  const rows: TableRow[] = [];
  const allTrs: HTMLTableRowElement[] = [];
  const secTags = ['thead','tbody','tfoot'];
  secTags.forEach(t => {
    const sec = tableEl.getElementsByTagName(t)[0];
    if (sec) allTrs.push(...Array.from(sec.getElementsByTagName('tr')));
  });
  if (!allTrs.length) allTrs.push(...Array.from(tableEl.getElementsByTagName('tr')));

  // 计算总列数（展开 colspan）
  let colCount = 0;
  for (const tr of allTrs) {
    let count = 0;
    tr.querySelectorAll('th,td').forEach(c => {
      count += Math.max(1, parseInt(c.getAttribute('colspan') || '1', 10));
    });
    colCount = Math.max(colCount, count);
  }

  const grid: (TableCell | null)[][] = [];
  let rIdx = 0;

  for (const tr of allTrs) {
    if (!grid[rIdx]) grid[rIdx] = Array(colCount).fill(null);
    let cIdx = 0;
    while (cIdx < colCount && grid[rIdx][cIdx] !== null) cIdx++;

    const isHeaderRow = tr.parentElement?.tagName.toLowerCase() === 'thead';
    const cells = Array.from(tr.querySelectorAll('th,td')) as HTMLElement[];

    for (const td of cells) {
      while (cIdx < colCount && grid[rIdx][cIdx] !== null) cIdx++;
      const colSpan = Math.max(1, parseInt(td.getAttribute('colspan') || '1', 10));
      const rowSpan = Math.max(1, parseInt(td.getAttribute('rowspan') || '1', 10));
      const cell: TableCell = {
        rawHtml: td.innerHTML,
        text: htmlToPlainText(td.innerHTML),
        colSpan, rowSpan,
        style: pickCellStyle(td, base),
        isHeader: isHeaderRow || td.tagName.toLowerCase() === 'th',
      };
      for (let r = 0; r < rowSpan; r++) {
        const rr = rIdx + r;
        if (!grid[rr]) grid[rr] = Array(colCount).fill(null);
        for (let c = 0; c < colSpan; c++) {
          grid[rr][cIdx + c] = cell;
        }
      }
      cIdx += colSpan;
    }
    rIdx++;
  }

  // 把 grid 压成行（仅取每个合并块左上角）
  for (let r = 0; r < grid.length; r++) {
    const rowCells: TableCell[] = [];
    const seen = new Set<TableCell>();
    for (let c = 0; c < colCount; c++) {
      const cell = grid[r][c];
      if (!cell || seen.has(cell)) continue;
      const left = c > 0 ? grid[r][c-1] : undefined;
      const up = r > 0 ? grid[r-1][c] : undefined;
      if (left !== cell && up !== cell) {
        rowCells.push(cell);
        seen.add(cell);
      }
    }
    rows.push({ cells: rowCells, isHeader: rowCells.some(x => x.isHeader) });
  }

  return { rows, colCount };
}

function measureTable(doc: jsPDF, model: TableModel, maxWidth: number, base: PdfInlineStyle): TableLayout {
  const n = model.colCount;
  const columns: ColumnLayout[] = Array.from({ length: n }, () => ({ width: maxWidth / n }));
  const rows: RowLayout[] = Array.from({ length: model.rows.length }, () => ({ height: 0 }));
  const min = Array(n).fill(0);

  const expand = (row: TableRow) => {
    const out: { cell: TableCell; start: number; span: number }[] = [];
    let cur = 0;
    for (const cell of row.cells) {
      out.push({ cell, start: cur, span: cell.colSpan });
      cur += cell.colSpan;
    }
    return out;
  };

  // 估算每列最小宽度（最长 token + padding）
  model.rows.forEach(row => {
    for (const { cell, start, span } of expand(row)) {
      const pad = cell.style.padding ?? 3;
      const tokens = cell.text.split(/(\s+)/).filter(Boolean);
      let longest = 0;
      applyStyle(doc, cell.style);
      for (const tk of tokens) {
        longest = Math.max(longest, doc.getTextWidth(tk));
      }
      const needed = longest + pad * 2 + 1;
      const per = needed / span;
      for (let i = 0; i < span; i++) {
        min[start + i] = Math.max(min[start + i], per);
      }
    }
  });

  const sumMin = min.reduce((a,b)=>a+b,0);
  let final = [...min];
  if (sumMin > maxWidth) {
    const ratio = maxWidth / sumMin;
    final = final.map(w => w * ratio);
  } else if (sumMin < maxWidth) {
    const bonus = (maxWidth - sumMin) / n;
    final = final.map(w => w + bonus);
  }
  columns.forEach((c,i)=>c.width = final[i]);

  // 行高：按单元格内容换行结果求最大值
  model.rows.forEach((row, rIdx) => {
    let rowH = 0;
    const ex = expand(row);
    ex.forEach(({cell, start, span}) => {
      const fs = cell.style.fontSize ?? (base.fontSize || 12);
      const lh = Math.round(fs * 1.25);                   // 更紧凑
      const pad = cell.style.padding ?? 1.5;
      const cellW = final.slice(start, start + span).reduce((a,b)=>a+b, 0) - pad * 2;

      const lines = layoutLines(doc, cell.text, cellW, cell.style, lh);
      const h = Math.max(lh, lines.length * lh) + pad * 2;
      rowH = Math.max(rowH, h);
    });
    rows[rIdx].height = rowH;
  });

  return { columns, rows };
}

function drawCellBox(doc: jsPDF, x: number, y: number, w: number, h: number, s: CellStyle) {
  if (s.fillColor) {
    doc.setFillColor(...s.fillColor);
    doc.rect(x, y, w, h, 'F');
  }
  const bw = s.borderWidth ?? 0.2;
  const bc = s.borderColor ?? [0,0,0];
  doc.setLineWidth(bw);
  doc.setDrawColor(...bc);
  doc.rect(x, y, w, h);
}

function drawCellText(doc: jsPDF, text: string, x: number, y: number, w: number, h: number, s: CellStyle) {
  const pad = s.padding ?? 1.5;
  const fs = s.fontSize ?? 12;
  const lh = Math.round(fs * 1.25);
  const innerW = w - pad * 2;
  applyStyle(doc, s);

  const lines = layoutLines(doc, text, innerW, s, lh);
  const halign = s.halign || 'left';
  const valign = s.valign || 'middle';

  let baseY = y + pad;                        // 顶部基线
  const contentH = lines.length * lh;
  if (valign === 'middle') baseY = y + (h - contentH) / 2;
  else if (valign === 'bottom') baseY = y + h - pad - contentH;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let tx = x + pad;
    if (halign === 'center') tx = x + (w - doc.getTextWidth(line)) / 2;
    else if (halign === 'right') tx = x + w - pad - doc.getTextWidth(line);
    doc.text(line, tx, baseY + i * lh, { baseline: 'top' });
  }
}

export function renderTableInPDF(
  doc: jsPDF,
  tableEl: HTMLTableElement,
  startX: number,
  startY: number,
  maxWidth: number,
  base: PdfInlineStyle,
  pageBottomY: number, // e.g. doc.internal.pageSize.getHeight() - 20
) {
  const model = parseTable(tableEl, base);
  const layout = measureTable(doc, model, maxWidth, base);

  // 预计算每列 x
  const colX: number[] = [];
  let cx = startX;
  for (const c of layout.columns) { colX.push(cx); cx += c.width; }

  let y = startY;
  for (let r = 0; r < model.rows.length; r++) {
    const row = model.rows[r];
    const rowH = layout.rows[r].height;

    // 跨页
    if (y + rowH > pageBottomY) {
      doc.addPage();
      y = 20; // 新页上边距（按你项目边距调整）
    }

    // 绘制行
    let colCursor = 0;
    for (const cell of row.cells) {
      const span = cell.colSpan;
      const x = colX[colCursor];
      const w = layout.columns.slice(colCursor, colCursor + span).reduce((a,b)=>a + b.width, 0);

      drawCellBox(doc, x, y, w, rowH, cell.style);
      drawCellText(doc, cell.text, x, y, w, rowH, cell.style);

      colCursor += span;
    }
    y += rowH;
  }
  return y;
}
