import { parseExcelData, convertExcelToLineItems } from '@/utils/excelPasteHandler';
import type { LineItem } from '@/types/quotation';

// 从剪贴板文本导入数据
export function importFromClipboardText(text: string): LineItem[] {
  try {
    if (!text || !text.trim()) {
      return [];
    }

    const rows = parseExcelData(text);
    console.log('解析的行数据:', rows); // 调试信息
    
    if (rows.length > 0) {
      const convertedItems = convertExcelToLineItems(rows);
      return convertedItems;
    }
    
    return [];
  } catch (error) {
    console.error('Error parsing pasted data:', error);
    throw new Error('数据解析失败，请检查Excel数据格式是否正确');
  }
}

// 读取剪贴板内容
export async function readClipboardText(): Promise<string> {
  try {
    const text = await navigator.clipboard.readText();
    return text;
  } catch (error) {
    console.error('Error reading clipboard:', error);
    throw new Error('无法访问剪贴板，请手动粘贴');
  }
}
