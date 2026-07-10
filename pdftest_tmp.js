const fs = require('fs');
const path = require('path');
const { jsPDF } = require('jspdf');

const regular = fs.readFileSync('public/fonts/NotoSansSC-Regular.ttf');
const bold = fs.readFileSync('public/fonts/NotoSansSC-Bold.ttf');
const regB64 = regular.toString('base64');
const boldB64 = bold.toString('base64');

function makeDoc(opts, useBoth) {
  const doc = new jsPDF(opts);
  doc.addFileToVFS('NotoSansSC-Regular.ttf', regB64);
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  if (useBoth) {
    doc.addFileToVFS('NotoSansSC-Bold.ttf', boldB64);
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  }
  doc.setFont('NotoSansSC', 'normal');
  // simulate a typical invoice: header + table w/ chinese+english text, ~40 lines
  doc.setFontSize(16);
  doc.text('销售发票 Invoice INV-2026-0001', 10, 15);
  doc.setFontSize(10);
  let y = 30;
  for (let i = 0; i < 40; i++) {
    doc.text(`第${i+1}行 商品名称示例 Product Description Item ${i+1}  数量: ${i+1}  单价: $${(i*3.5).toFixed(2)}`, 10, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  return doc;
}

const configs = [
  { name: 'A: default opts, regular+bold, no compress flag', opts: {orientation:'portrait',unit:'mm',format:'a4'}, both: true },
  { name: 'B: putOnlyUsedFonts true, regular+bold, no compress flag', opts: {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true,floatPrecision:16}, both: true },
  { name: 'C: putOnlyUsedFonts true + compress true, regular+bold', opts: {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true,floatPrecision:16,compress:true}, both: true },
  { name: 'D: putOnlyUsedFonts true + compress true, regular ONLY (no bold text used)', opts: {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true,floatPrecision:16,compress:true}, both: false },
];

for (const c of configs) {
  const doc = makeDoc(c.opts, c.both);
  const out = doc.output('arraybuffer');
  console.log(c.name, '->', (out.byteLength/1024).toFixed(1), 'KB');
}
