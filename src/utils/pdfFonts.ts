// pdfFonts.ts
import jsPDF from 'jspdf';

// 从embedded-resources导入字体资源
import { embeddedResources } from '@/lib/embedded-resources';

let fontsReady = false;

export function ensureCnFonts(doc: jsPDF) {
  if (fontsReady) {
    // 已经注册过了，直接可用
    doc.setFont('NotoSansSC', 'normal');
    return;
  }

  // 1) 注入 VFS
  doc.addFileToVFS('NotoSansSC-Regular.ttf', embeddedResources.notoSansSCRegular);
  doc.addFileToVFS('NotoSansSC-Bold.ttf', embeddedResources.notoSansSCBold);

  // 2) 注册内部标签（名字随你，但要和 setFont 用的一致）
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');

  // 3) 默认切换到中文字体（可选）
  doc.setFont('NotoSansSC', 'normal');

  fontsReady = true;
}
