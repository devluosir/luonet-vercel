// pdfFonts.ts
import jsPDF from 'jspdf';

let fontsReady = false;

export async function ensureCnFonts(doc: jsPDF): Promise<void> {
  if (fontsReady) {
    // 已经注册过了，直接可用
    doc.setFont('NotoSansSC', 'normal');
    return;
  }

  const { embeddedResources } = await import('@/lib/embedded-resources');

  // 1) 注入 VFS
  doc.addFileToVFS('NotoSansSC-Regular.ttf', embeddedResources.notoSansSCRegular);
  doc.addFileToVFS('NotoSansSC-Bold.ttf', embeddedResources.notoSansSCBold);

  // 2) 注册内部标签
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal');
  doc.addFont('NotoSansSC-Bold.ttf', 'NotoSansSC', 'bold');

  // 3) 默认切换到中文字体
  doc.setFont('NotoSansSC', 'normal');

  fontsReady = true;
}
