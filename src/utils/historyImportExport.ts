import { format } from 'date-fns';
import { 
  getQuotationHistory, 
  importQuotationHistory 
} from './quotationHistory';
import { 
  getPurchaseHistory, 
  importPurchaseHistory 
} from './purchaseHistory';
import { 
  getInvoiceHistory, 
  importInvoiceHistory 
} from './invoiceHistory';
import {
  getPackingHistory,
  importPackingHistory
} from './packingHistory';

export type HistoryType = 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';

export interface HistoryItem {
  id: string;
  createdAt: string;
  updatedAt: string;
  customerName?: string;
  supplierName?: string;
  consigneeName?: string;
  quotationNo?: string;
  invoiceNo?: string;
  orderNo?: string;
  totalAmount: number;
  currency: string;
  documentType?: string;
  type?: string;
  data: any;
}

export interface ImportResult {
  success: boolean;
  details?: string[];
  otherTabs?: string[];
  error?: string;
  customerImported?: number;
}

export interface ExportResult {
  jsonData: string;
  fileName: string;
  exportStats: string;
}

// 处理单据数据
const processDocumentData = (data: any[], documentType: string): { processedData: any[], customerCount: number } => {
  const processedData = [...data];
  
  console.log(`🔍 处理 ${documentType} 类型数据，共 ${data.length} 条记录`);

  // 移除客户信息提取和保存逻辑，直接返回原始数据
  console.log(`📊 ${documentType} 处理完成，跳过客户信息提取`);
  return { processedData, customerCount: 0 };
};

// 智能导入函数
export const smartImport = (content: string, activeTab: HistoryType): ImportResult => {
  try {
    console.log(`📥 开始智能导入，当前标签: ${activeTab}`);
    
    // 解析JSON数据
    const importData = JSON.parse(content);
    console.log(`📋 导入数据解析成功，包含 ${importData.length} 条记录`);

    if (!Array.isArray(importData) || importData.length === 0) {
      return {
        success: false,
        error: '导入数据格式错误：数据必须是非空数组'
      };
    }

    // 分析数据类型
    const dataTypes = new Set<string>();
    const details: string[] = [];
    const otherTabs: string[] = [];

    importData.forEach((item: any) => {
      if (item.documentType) {
        dataTypes.add(item.documentType);
      }
    });

    console.log(`🔍 检测到数据类型:`, Array.from(dataTypes));

    // 根据数据类型进行导入
    let totalImported = 0;
    let customerImported = 0;

    // 报价单导入
    if (dataTypes.has('quotation') || dataTypes.has('confirmation')) {
      const quotationData = importData.filter((item: any) => 
        item.documentType === 'quotation' || item.documentType === 'confirmation'
      );
      
      if (quotationData.length > 0) {
        const { processedData } = processDocumentData(quotationData, 'quotation');
        importQuotationHistory(JSON.stringify(processedData));
        totalImported += processedData.length;
        details.push(`报价单: ${processedData.length} 条`);
        
        if (activeTab !== 'quotation') {
          otherTabs.push('quotation');
        }
      }
    }

    // 采购单导入
    if (dataTypes.has('purchase')) {
      const purchaseData = importData.filter((item: any) => 
        item.documentType === 'purchase'
      );
      
      if (purchaseData.length > 0) {
        const { processedData } = processDocumentData(purchaseData, 'purchase');
        importPurchaseHistory(JSON.stringify(processedData));
        totalImported += processedData.length;
        details.push(`采购单: ${processedData.length} 条`);
        
        if (activeTab !== 'purchase') {
          otherTabs.push('purchase');
        }
      }
    }

    // 发票导入
    if (dataTypes.has('invoice')) {
      const invoiceData = importData.filter((item: any) => 
        item.documentType === 'invoice'
      );
      
      if (invoiceData.length > 0) {
        const { processedData } = processDocumentData(invoiceData, 'invoice');
        importInvoiceHistory(JSON.stringify(processedData));
        totalImported += processedData.length;
        details.push(`发票: ${processedData.length} 条`);
        
        if (activeTab !== 'invoice') {
          otherTabs.push('invoice');
        }
      }
    }

    // 装箱单导入
    if (dataTypes.has('packing')) {
      const packingData = importData.filter((item: any) => 
        item.documentType === 'packing'
      );
      
      if (packingData.length > 0) {
        const { processedData } = processDocumentData(packingData, 'packing');
        importPackingHistory(JSON.stringify(processedData));
        totalImported += processedData.length;
        details.push(`装箱单: ${processedData.length} 条`);
        
        if (activeTab !== 'packing') {
          otherTabs.push('packing');
        }
      }
    }

    console.log(`✅ 导入完成，总计: ${totalImported} 条记录`);

    return {
      success: true,
      details,
      otherTabs: otherTabs.length > 0 ? otherTabs : undefined,
      customerImported
    };

  } catch (error) {
    console.error('❌ 导入失败:', error);
    return {
      success: false,
      error: `导入失败: ${error instanceof Error ? error.message : '未知错误'}`
    };
  }
};

// 智能导出函数
export const smartExport = (activeTab: HistoryType, selectedIds?: string[]): ExportResult => {
  try {
    console.log(`📤 开始智能导出，当前标签: ${activeTab}`);

    let allData: HistoryItem[] = [];
    let exportStats = '';

    // 根据当前标签获取数据
    switch (activeTab) {
      case 'quotation':
        allData = getQuotationHistory() as HistoryItem[];
        exportStats = `报价单: ${allData.length} 条`;
        break;
      case 'confirmation':
        allData = getQuotationHistory().filter(item => item.type === 'confirmation') as HistoryItem[];
        exportStats = `订单确认: ${allData.length} 条`;
        break;
      case 'purchase':
        allData = getPurchaseHistory() as HistoryItem[];
        exportStats = `采购单: ${allData.length} 条`;
        break;
      case 'invoice':
        allData = getInvoiceHistory() as HistoryItem[];
        exportStats = `发票: ${allData.length} 条`;
        break;
      case 'packing':
        allData = getPackingHistory() as HistoryItem[];
        exportStats = `装箱单: ${allData.length} 条`;
        break;
      default:
        throw new Error(`不支持的导出类型: ${activeTab}`);
    }

    // 如果指定了选中ID，则只导出选中的数据
    if (selectedIds && selectedIds.length > 0) {
      allData = allData.filter(item => selectedIds.includes(item.id));
      exportStats += ` (选中: ${allData.length} 条)`;
    }

    if (allData.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 生成文件名
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `${activeTab}_export_${timestamp}.json`;

    // 转换为JSON字符串
    const jsonData = JSON.stringify(allData, null, 2);

    console.log(`✅ 导出完成: ${fileName}, 数据量: ${allData.length} 条`);

    return {
      jsonData,
      fileName,
      exportStats
    };

  } catch (error) {
    console.error('❌ 导出失败:', error);
    throw new Error(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 全量导出函数
export const fullExport = (): ExportResult => {
  try {
    console.log(`📤 开始全量导出`);

    const allData: HistoryItem[] = [
      ...(getQuotationHistory() as HistoryItem[]),
      ...(getPurchaseHistory() as HistoryItem[]),
      ...(getInvoiceHistory() as HistoryItem[]),
      ...(getPackingHistory() as HistoryItem[])
    ];

    const quotationCount = getQuotationHistory().length;
    const purchaseCount = getPurchaseHistory().length;
    const invoiceCount = getInvoiceHistory().length;
    const packingCount = getPackingHistory().length;

    const exportStats = `全量导出: 报价单 ${quotationCount} 条, 采购单 ${purchaseCount} 条, 发票 ${invoiceCount} 条, 装箱单 ${packingCount} 条, 总计 ${allData.length} 条`;

    if (allData.length === 0) {
      throw new Error('没有数据可导出');
    }

    // 生成文件名
    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm-ss');
    const fileName = `full_export_${timestamp}.json`;

    // 转换为JSON字符串
    const jsonData = JSON.stringify(allData, null, 2);

    console.log(`✅ 全量导出完成: ${fileName}, 数据量: ${allData.length} 条`);

    return {
      jsonData,
      fileName,
      exportStats
    };

  } catch (error) {
    console.error('❌ 全量导出失败:', error);
    throw new Error(`全量导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
};

// 执行导出函数
export const executeExport = (activeTab: HistoryType, selectedIds?: string[]): ExportResult => {
  return smartExport(activeTab, selectedIds);
};

// 下载文件函数
export const downloadFile = (jsonData: string, fileName: string): void => {
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// 处理文件导入函数
export const handleFileImport = (file: File, activeTab: HistoryType): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const result = smartImport(content, activeTab);
        resolve(result);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => {
      reject(new Error('文件读取失败'));
    };
    reader.readAsText(file);
  });
};
