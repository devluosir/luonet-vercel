// PDF 表头文字信息（与原 public/images/header-bilingual.jpg / header-english.png 横幅图上的文字一致）。
// 用于 drawHeaderBlock() 系列函数把整条横幅图替换成"logo + 矢量文字"排版时复用，
// 避免每个 *PdfGenerator.ts 各写一份、后续公司信息变更要改多处。
export const COMPANY_LETTERHEAD = {
  nameEn: 'LUO & COMPANY CO., LTD.',
  nameCn: '上海飞罗贸易有限公司',
  addressEn: 'No.211, North Fute Road, (Shanghai) Free Trade Zone, China 200131',
  contactLine: 'Tel: (86) 4008930883   E-mail: sales@luocompany.com   Website: www.luocompany.com',
} as const;
