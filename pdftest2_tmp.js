const fs = require('fs');
const { jsPDF } = require('jspdf');

const regular = fs.readFileSync('public/fonts/NotoSansSC-Regular.ttf');
const bold = fs.readFileSync('public/fonts/NotoSansSC-Bold.ttf');
const regB64 = regular.toString('base64');
const boldB64 = bold.toString('base64');

function makeDoc(opts, registerBold, useBoldInText) {
  const doc = new jsPDF(opts);
  doc.addFileToVFS('NotoSansSC-Regular.ttf', regB64);
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  if (registerBold) {
    doc.addFileToVFS('NotoSansSC-Bold.ttf', boldB64);
    doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');
  }
  doc.setFont('NotoSansSC', 'normal');
  doc.setFontSize(16);
  doc.text('销售发票 Invoice INV-2026-0001', 10, 15);
  doc.setFontSize(10);
  let y = 30;
  for (let i = 0; i < 40; i++) {
    if (useBoldInText && i % 10 === 0) doc.setFont('NotoSansSC','bold'); else doc.setFont('NotoSansSC','normal');
    doc.text(`第${i+1}行 商品名称示例 Product Description Item ${i+1}`, 10, y);
    y += 6;
    if (y > 280) { doc.addPage(); y = 20; }
  }
  return doc;
}

const tests = [
  ['only-regular-registered, no putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4'}, false, false],
  ['only-regular-registered, putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true}, false, false],
  ['both-registered but bold unused, no putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4'}, true, false],
  ['both-registered but bold unused, putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true}, true, false],
  ['both-registered, bold USED, putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4',putOnlyUsedFonts:true}, true, true],
  ['both-registered, bold USED, no putOnlyUsedFonts', {orientation:'portrait',unit:'mm',format:'a4'}, true, true],
];
for (const [name, opts, regBold, useBold] of tests) {
  const doc = makeDoc(opts, regBold, useBold);
  const out = doc.output('arraybuffer');
  console.log(name, '->', (out.byteLength/1024).toFixed(1), 'KB');
}
