const fs = require('fs');
const { jsPDF } = require('jspdf');
const { GState } = require('jspdf');

// 用一张纯色半透明 PNG 模拟印章图片（1x1 蓝色像素放大更简单：直接用一个 100x100 蓝色方块 PNG，base64 生成）
// 用 canvas 不方便，这里手搓一个最小合法 PNG（纯色）比较麻烦，改用 jsPDF 自带的矩形+透明度模拟"印章"，
// 而不是真的 addImage，因为我们要验证的是"重叠区域内文字是否被后画的图形盖住/是否被正确重画在上层"这个通用绘制顺序问题，
// 用 doc.rect + setGState 模拟一个半透明色块作为"印章"完全等价（jsPDF 内部渲染管线一样是顺序绘制+透明度合成）。

function makeDoc() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  return doc;
}

// ---- 复刻 orderConfirmationPdfGenerator.ts 里新增的机制 ----
function attachTracking(doc) {
  const contentTextRuns = [];
  const emitText = (text, x, y) => {
    doc.text(text, x, y);
    const font = doc.getFont();
    contentTextRuns.push({
      text, x, y,
      page: doc.getNumberOfPages(),
      fontName: font.fontName,
      fontStyle: font.fontStyle,
      fontSize: doc.getFontSize(),
      color: doc.getTextColor(),
    });
  };
  const redrawTextOverStamp = (stampPage, stampY, stampHeight) => {
    const overlapTop = stampY - 1;
    const overlapBottom = stampY + stampHeight + 1;
    const matches = contentTextRuns.filter(r => r.page === stampPage && r.y >= overlapTop && r.y <= overlapBottom);
    const restoreFont = doc.getFont();
    const restoreFontSize = doc.getFontSize();
    const restoreColor = doc.getTextColor();
    for (const run of matches) {
      doc.setFont(run.fontName, run.fontStyle);
      doc.setFontSize(run.fontSize);
      doc.setTextColor(run.color);
      doc.text(run.text, run.x, run.y);
    }
    doc.setFont(restoreFont.fontName, restoreFont.fontStyle);
    doc.setFontSize(restoreFontSize);
    doc.setTextColor(restoreColor);
    return matches.length;
  };
  return { emitText, redrawTextOverStamp };
}

function drawFakeStamp(doc, x, y, w, h) {
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.9 }));
  doc.setFillColor(30, 60, 200); // 蓝色模拟印章底色
  doc.roundedRect(x, y, w, h, 3, 3, 'F');
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(1.2);
  doc.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 2, 'S'); // 红圈模拟印章轮廓
  doc.restoreGraphicsState();
}

// ---- 场景A：旧行为（无修复）——文字先画，图形（印章）后画，没有重画机制 ----
const docOld = makeDoc();
docOld.setFontSize(10);
let y = 20;
const noteLines = [];
for (let i = 0; i < 12; i++) {
  noteLines.push(`第${i+1}行 EXW Shanghai, China. EXW Shanghai, China. EXW Shanghai, China.`);
}
noteLines.forEach(line => { docOld.text(line, 20, y); y += 6; });
const stampY_old = y - 6 * 5 - 10; // 故意往上偏移，制造与最后几行文字重叠
drawFakeStamp(docOld, 100, stampY_old, 70, 30);
fs.writeFileSync('/tmp/stamptest/old.pdf', Buffer.from(docOld.output('arraybuffer')));

// ---- 场景B：新行为（修复后）——emitText 记录 + 印章画完后 redrawTextOverStamp ----
const docNew = makeDoc();
docNew.setFontSize(10);
const { emitText, redrawTextOverStamp } = attachTracking(docNew);
y = 20;
noteLines.forEach(line => { emitText(line, 20, y); y += 6; });
const stampY_new = y - 6 * 5 - 10;
drawFakeStamp(docNew, 100, stampY_new, 70, 30);
const redrawnCount = redrawTextOverStamp(docNew.getNumberOfPages(), stampY_new, 30);
fs.writeFileSync('/tmp/stamptest/new.pdf', Buffer.from(docNew.output('arraybuffer')));

console.log('stampY_old =', stampY_old.toFixed(1), 'stampY_new =', stampY_new.toFixed(1));
console.log('redrawn text runs count (should be > 0):', redrawnCount);
