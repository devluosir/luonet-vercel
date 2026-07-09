// 统一的 PDF 表头绘制：logo 图标（居左）+ 公司名/地址/联系方式矢量文字（居中）。
//
// 背景：原先 6 个 *PdfGenerator.ts 各自把整条表头横幅图片（header-bilingual.jpg ~92KB /
// header-english.png ~24KB）用 doc.addImage() 嵌进每份 PDF，是文件体积"好几百 KB"的主因之一。
// 这份实现最先在 domesticQuotationPdfGenerator.ts 里落地，跟用户来回核对过好几轮视觉细节
// （logo 大小、中文名字号、行间距），确认满意后抽成共享函数，供其它 5 个生成器复用——
// 不要再复制一份改，样式改动只需要改这一个文件。
//
// 单份 PDF 预计减少约 80KB（双语表头场景，headerImage 94,514 字节 → logoIcon 13,271 字节）。
import jsPDF from 'jspdf';
import { safeSetCnFont } from './pdf/ensureFont';
import { getLogoIcon } from './imageLoader';
import { COMPANY_LETTERHEAD } from './companyLetterhead';

export type PdfHeaderType = 'bilingual' | 'english' | 'none';

/**
 * @param doc jsPDF 文档实例（只用到 addImage/text/setFontSize/getTextWidth，标准 jsPDF 类型即可）
 * @param headerType 'bilingual'（中英双语）| 'english'（仅英文）| 'none'（不画表头，原样返回 y）
 * @param margin 左边距（mm），logo 从这里开始画
 * @param pageWidth 页面宽度（mm），文字整体居中用
 * @param y 表头起始 y 坐标（mm）
 * @returns 表头结束后的 y 坐标（mm），调用方从这里继续往下画正文
 */
export async function drawHeaderBlock(
  doc: jsPDF,
  headerType: PdfHeaderType,
  margin: number,
  pageWidth: number,
  y: number
): Promise<number> {
  if (headerType === 'none') return y;

  try {
    const logoIcon = await getLogoIcon();
    // logoIcon 是从原横幅图裁出来的"菱形 LC 图标 + Luo & Company 文字"完整 lockup（237×246px），
    // 不是正方形——按原图长宽比换算，避免拉伸变形
    const logoHeight = 20;
    const logoWidth = logoHeight * (237 / 246);
    doc.addImage(`data:image/png;base64,${logoIcon}`, 'PNG', margin, y, logoWidth, logoHeight);

    // 文字居中的参照宽度封顶在 180mm：A4 纵向页面（pageWidth≈210mm）算出来的居中点
    // 正好等于 pageWidth/2，跟原先直接用 pageWidth/2 完全一致；只有装箱单等横向大页面
    // （pageWidth≈297mm）会触发封顶——否则文字会居中到页面正中间，logo 留在左边距，
    // 两者之间出现一大截空白，看起来像没对齐。封顶后文字块跟 logo 保持在同一视觉分组里。
    const centerX = margin + Math.min(pageWidth - margin * 2, 180) / 2;
    let textY = y + 5;

    // 中文名固定字号 13.5pt：跟英文名（13pt）视觉重量接近，比按英文名宽度精确反推
    // 算出来的字号（~16.87pt）更克制，用户反馈过太大
    const cnFontSize = 13.5;

    safeSetCnFont(doc, 'bold', 'export');
    doc.setFontSize(13);
    doc.text(COMPANY_LETTERHEAD.nameEn, centerX, textY, { align: 'center' });
    // 双语模式下英文名→中文名的间距收紧到 5mm（原先 6.5mm 明显比下面中文名→地址行的间距空），
    // 两行字号都在 13pt 上下、字身较高，不能收得跟下面小字号行一样紧，否则会跟中文名重叠
    textY += headerType === 'bilingual' ? 5 : 6.5;

    if (headerType === 'bilingual') {
      safeSetCnFont(doc, 'bold', 'export');
      doc.setFontSize(cnFontSize);
      doc.text(COMPANY_LETTERHEAD.nameCn, centerX, textY, { align: 'center' });
      // 中文名→地址行间距放宽到 4.5mm，跟上面英文名→中文名（5mm）基本对称，
      // 不再是"上面明显比下面空"
      textY += 4.5;
    }

    safeSetCnFont(doc, 'bold', 'export');
    doc.setFontSize(7.5);
    doc.text(COMPANY_LETTERHEAD.addressEn, centerX, textY, { align: 'center' });
    textY += 3.4;
    doc.text(COMPANY_LETTERHEAD.contactLine, centerX, textY, { align: 'center' });
    textY += 4;

    const headerHeight = Math.max(logoHeight, textY - y);
    return y + headerHeight + 5;
  } catch (error) {
    console.error('[PDF表头] logo/文字加载失败，跳过:', error);
    return y;
  }
}
