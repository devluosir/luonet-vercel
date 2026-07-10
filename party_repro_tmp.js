const fs = require('fs');
const { jsPDF, GState } = require('jspdf');
require('jspdf-autotable');

const margin = 16;
const pageWidth = 210;
const pageHeight = 297;
const y = 220; // 假设条款画完后，供需方信息表从这里开始（贴近截图里表格靠下半页的情况）

// 模拟截图里的内容：供方信息基本填满（公司名/地址/电话），需方基本空白
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

function buildDoc() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setFont('helvetica', 'normal'); // 沙箱没有中文字体环境，用英文占位字体测排版位置即可（不测中文渲染）
  const mmPerPt = 0.3528;
  const bodyFontSize = 8.5;
  const cellPadding = 2.2;
  const lineHeightFactor = 1.45;
  doc.setFontSize(bodyFontSize);

  doc.autoTable({
    startY: y,
    body: [[sellerText, buyerText]],
    theme: 'grid',
    margin: { left: margin, right: margin },
    styles: {
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
  });
  const finalY = doc.lastAutoTable.finalY;
  return { doc, finalY, cellPadding };
}

function drawStamp(doc, x, y, w, h) {
  doc.saveGraphicsState();
  doc.setGState(new GState({ opacity: 0.82 }));
  doc.setDrawColor(200, 0, 0);
  doc.setLineWidth(1.2);
  doc.circle(x + w / 2, y + h / 2, Math.min(w, h) / 2 - 2, 'S');
  doc.setFontSize(6);
  doc.setTextColor(200, 0, 0);
  doc.text('CHOP', x + w/2 - 6, y + h/2, {});
  doc.restoreGraphicsState();
}

// 旧公式
{
  const { doc, finalY } = buildDoc();
  const stampWidth = 34, stampHeight = 34;
  const stampX = margin + 34;
  const stampY_old = Math.max(y + 10, finalY - stampHeight - 4);
  drawStamp(doc, stampX, stampY_old, stampWidth, stampHeight);
  console.log('OLD: table y=%s finalY=%s stampY=%s (stamp bottom=%s, table bottom=%s)', y, finalY.toFixed(1), stampY_old.toFixed(1), (stampY_old+stampHeight).toFixed(1), finalY.toFixed(1));
  fs.writeFileSync('/tmp/stamptest/party_old.pdf', Buffer.from(doc.output('arraybuffer')));
}

// 新公式
{
  const { doc, finalY, cellPadding } = buildDoc();
  const stampWidth = 34, stampHeight = 34;
  const stampX = margin + 34;
  const stampY_new = Math.min(y + cellPadding - 2, finalY - stampHeight - 2);
  drawStamp(doc, stampX, stampY_new, stampWidth, stampHeight);
  console.log('NEW: table y=%s finalY=%s stampY=%s (stamp bottom=%s, table bottom=%s)', y, finalY.toFixed(1), stampY_new.toFixed(1), (stampY_new+stampHeight).toFixed(1), finalY.toFixed(1));
  fs.writeFileSync('/tmp/stamptest/party_new.pdf', Buffer.from(doc.output('arraybuffer')));
}
