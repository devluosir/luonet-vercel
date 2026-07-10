const fs = require('fs');
const { jsPDF } = require('jspdf');

const regular = fs.readFileSync('public/fonts/NotoSansSC-Regular.ttf');
const bold = fs.readFileSync('public/fonts/NotoSansSC-Bold.ttf');
const regB64 = regular.toString('base64');
const boldB64 = bold.toString('base64');

function makeDoc(opts) {
  const doc = new jsPDF(opts);
  doc.addFileToVFS('NotoSansSC-Regular.ttf', regB64);
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFileToVFS('NotoSansSC-Bold.ttf', boldB64);
  doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  doc.setFont('NotoSansSC', 'normal');
  doc.setFontSize(16);
  doc.text('销售发票 Invoice INV-2026-0001', 10, 15);
  doc.setFontSize(10);
  let y = 30;
  for (let i = 0; i < 40; i++) {
    doc.setFont('NotoSansSC', i % 10 === 0 ? 'bold' : 'normal');
    doc.text(`第${i+1}行 商品名称示例 Product Description Item ${i+1}`, 10, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  return doc;
}

for (const compress of [false, true]) {
  const doc = makeDoc({orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true,compress});
  const out = doc.output('arraybuffer');
  console.log('compress=' + compress, '->', (out.byteLength/1024).toFixed(1), 'KB');
}
