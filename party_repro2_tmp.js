const fs = require('fs');
const { jsPDF, GState } = require('jspdf');
require('jspdf-autotable');

const margin = 16;
const pageWidth = 210;
const pageHeight = 297;
const bottomReserve = 14;
const pageBottom = pageHeight - bottomReserve;

const partyRowsData = [
  ['单位名称(章)', '上海飞罗贸易有限公司', ''],
  ['单位地址', '中国（上海）自由贸易区富特北路211号302部位368室', ''],
  ['法定代表人', '', ''],
  ['委托代理人', '', ''],
  ['电话', '4008930883', ''],
  ['纳税人识别号', '91310115093610593T', ''],
];
const sellerText = partyRowsData.map(([label, seller], i) => i === 0 ? `供方 ${label}：${seller}` : `${label}：${seller}`).join('\n');
const buyerText = partyRowsData.map(([label, , buyer], i) => i === 0 ? `需方 ${label}：${buyer}` : `${label}：${buyer}`).join('\n');

function buildDoc(y) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'normal');
  const bodyFontSize = 8.5;
  const cellPadding = 2.2;
  doc.setFontSize(bodyFontSize);
  doc.autoTable({
    startY: y,
    body: [[sellerText, buyerText]],
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: { fontSize: bodyFontSize, cellPadding, textColor: [20,20,20], lineColor: [90,90,90], lineWidth: 0.2, valign: 'top' },
    columnStyles: { 0: { cellWidth: (pageWidth - margin*2)/2 }, 1: { cellWidth: (pageWidth - margin*2)/2 } },
  });
  const finalY = doc.lastAutoTable.finalY;
  return { doc, finalY, cellPadding };
}

function drawStamp(doc, x, y, w, h, label) {
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.82 }));
  doc.setDrawColor(200,0,0);
  doc.setLineWidth(1.2);
  doc.circle(x + w/2, y + h/2, Math.min(w,h)/2 - 2, 'S');
  doc.setFontSize(6);
  doc.setTextColor(200,0,0);
  doc.text(label, x + 2, y + h/2, {});
  doc.restoreGraphicsState();
}

const y0 = 220;
const { doc, finalY, cellPadding } = buildDoc(y0);
const stampWidth = 34, stampHeight = 34;
const stampX = margin + 34;
const stampY_new = Math.max(y0 - 2, Math.min(y0 + cellPadding - 2, pageBottom - stampHeight));
drawStamp(doc, stampX, stampY_new, stampWidth, stampHeight, 'CHOP');
console.log('table y=%s finalY=%s pageBottom=%s stampY=%s stampBottom=%s', y0, finalY.toFixed(1), pageBottom, stampY_new.toFixed(1), (stampY_new+stampHeight).toFixed(1));
console.log('overlap with company-name line (should be near table top, i.e. stampY close to', y0, '):', stampY_new.toFixed(1));
fs.writeFileSync('/tmp/stamptest/party_new2.pdf', Buffer.from(doc.output('arraybuffer')));
