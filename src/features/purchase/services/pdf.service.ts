// 适配旧 purchasePdfGenerator.ts，统一一个 generate 出口
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';

export interface PdfOptions {
  open?: boolean;          // 预览
  download?: boolean;      // 下载
  filename?: string;
  stamp?: 'none'|'company'|'finance';
}

export const PdfService = {
  generate: async (draft: any, opts: PdfOptions = {}) => {
    // 这里可挂接统一的安全字体注册/水印/印章资源注入（若已在旧工具里做了可直通）
    return generatePurchaseOrderPDF(draft, opts.open || false);
  }
};
