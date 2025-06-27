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
  data: any;
}

export interface ImportResult {
  success: boolean;
  details?: string[];
  otherTabs?: string[];
  error?: string;
}

export interface ExportResult {
  jsonData: string;
  fileName: string;
  exportStats: string;
}

// 智能导入函数
export const smartImport = (content: string, activeTab: HistoryType): ImportResult => {
  try {
    console.log('开始智能导入，内容长度:', content.length);
    let parsedData;
    try {
      parsedData = JSON.parse(content);
      console.log('JSON解析成功，数据类型:', typeof parsedData);
      if (Array.isArray(parsedData)) {
        console.log('数据是数组，长度:', parsedData.length);
      } else if (typeof parsedData === 'object') {
        console.log('数据是对象，键:', Object.keys(parsedData));
      }
    } catch (parseError) {
      console.log('JSON解析失败，尝试修复格式问题');
      console.error('原始解析错误:', parseError);
      // 尝试修复常见的JSON格式问题
      const fixedContent = content
        .replace(/\n/g, '')
        .replace(/\r/g, '')
        .replace(/\t/g, '')
        .trim();
      try {
        parsedData = JSON.parse(fixedContent);
        console.log('修复后JSON解析成功');
      } catch (secondError) {
        console.error('修复后仍然解析失败:', secondError);
        return { success: false, error: 'JSON格式错误，无法解析文件内容' };
      }
    }

    // 检查是否是综合数据格式（包含metadata字段）
    if (parsedData && typeof parsedData === 'object' && 'metadata' in parsedData) {
      console.log('检测到综合数据格式');
      
      // 检查是否是筛选数据格式（包含records字段）
      if ('records' in parsedData && Array.isArray(parsedData.records)) {
        console.log('检测到筛选数据格式，记录数量:', parsedData.records.length);
        // 筛选数据格式，直接处理records数组
        const records = parsedData.records;
        const results: ImportResult = {
          success: true,
          details: [],
          otherTabs: []
        };

        // 按类型分组数据
        const quotationData = [];
        const confirmationData = [];
        const invoiceData = [];
        const purchaseData = [];
        const packingData = [];

        for (const item of records) {
          if (!item || typeof item !== 'object') continue;

          // 识别数据类型
          if ('quotationNo' in item && 'type' in item) {
            // 报价单或确认书数据
            if (item.type === 'quotation') {
              quotationData.push(item);
            } else if (item.type === 'confirmation') {
              confirmationData.push(item);
            }
          } else if ('invoiceNo' in item && !('quotationNo' in item) && !('consigneeName' in item)) {
            // 发票数据
            invoiceData.push(item);
          } else if ('orderNo' in item && 'supplierName' in item) {
            // 采购单数据
            purchaseData.push(item);
          } else if ('consigneeName' in item || ('invoiceNo' in item && 'documentType' in item)) {
            // 装箱单数据
            packingData.push(item);
          } else if ('data' in item && item.data) {
            // 通过data字段判断类型
            if (item.data.quotationNo && item.data.customerPO === undefined) {
              // 报价单数据
              quotationData.push({
                ...item,
                type: item.data.type || 'quotation'
              });
            } else if (item.data.invoiceNo && item.data.consignee) {
              // 装箱单数据
              packingData.push(item);
            } else if (item.data.invoiceNo || item.data.customerPO !== undefined) {
              // 发票数据
              invoiceData.push(item);
            } else if (item.data.orderNo && item.data.supplierName) {
              // 采购单数据
              purchaseData.push(item);
            }
          }
        }

        console.log('筛选数据分组结果:', {
          quotation: quotationData.length,
          confirmation: confirmationData.length,
          invoice: invoiceData.length,
          purchase: purchaseData.length,
          packing: packingData.length
        });

        // 执行导入
        let totalImported = 0;

        if (quotationData.length > 0) {
          const quotationJson = JSON.stringify(quotationData);
          const importSuccess = importQuotationHistory(quotationJson);
          console.log('报价单导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`报价单：${quotationData.length} 条`);
            totalImported += quotationData.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs!.push('报价单');
            }
          } else {
            console.error('报价单导入失败');
          }
        }

        if (confirmationData.length > 0) {
          const confirmationJson = JSON.stringify(confirmationData);
          const importSuccess = importQuotationHistory(confirmationJson);
          console.log('销售确认导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`销售确认：${confirmationData.length} 条`);
            totalImported += confirmationData.length;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs!.push('销售确认');
            }
          } else {
            console.error('销售确认导入失败');
          }
        }

        if (invoiceData.length > 0) {
          const invoiceJson = JSON.stringify(invoiceData);
          const importSuccess = importInvoiceHistory(invoiceJson);
          console.log('发票导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`发票：${invoiceData.length} 条`);
            totalImported += invoiceData.length;
            if (activeTab !== 'invoice') {
              results.otherTabs!.push('发票');
            }
          } else {
            console.error('发票导入失败');
          }
        }

        if (purchaseData.length > 0) {
          const purchaseJson = JSON.stringify(purchaseData);
          const importSuccess = importPurchaseHistory(purchaseJson);
          console.log('采购单导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`采购单：${purchaseData.length} 条`);
            totalImported += purchaseData.length;
            if (activeTab !== 'purchase') {
              results.otherTabs!.push('采购单');
            }
          } else {
            console.error('采购单导入失败');
          }
        }

        if (packingData.length > 0) {
          const packingJson = JSON.stringify(packingData);
          const importSuccess = importPackingHistory(packingJson);
          console.log('装箱单导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`装箱单：${packingData.length} 条`);
            totalImported += packingData.length;
            if (activeTab !== 'packing') {
              results.otherTabs!.push('装箱单');
            }
          } else {
            console.error('装箱单导入失败');
          }
        }

        console.log('筛选数据导入完成，总计:', totalImported);
        if (totalImported === 0) {
          return { success: false, error: '筛选数据中未找到有效的历史记录数据' };
        }

        results.details!.unshift(`总计导入：${totalImported} 条记录`);
        return results;
      }
      
      // 综合数据格式（包含quotation、confirmation、invoice、purchase字段）
      const allData = parsedData;
      const results: ImportResult = {
        success: true,
        details: [],
        otherTabs: []
      };

      let totalImported = 0;

      // 处理报价单数据
      if (allData.quotation && Array.isArray(allData.quotation) && allData.quotation.length > 0) {
        console.log('处理报价单数据，数量:', allData.quotation.length);
        const quotationJson = JSON.stringify(allData.quotation);
        const importSuccess = importQuotationHistory(quotationJson);
        console.log('报价单导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`报价单：${allData.quotation.length} 条`);
          totalImported += allData.quotation.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs!.push('报价单');
          }
        } else {
          console.error('报价单导入失败');
        }
      }

      // 处理销售确认数据
      if (allData.confirmation && Array.isArray(allData.confirmation) && allData.confirmation.length > 0) {
        console.log('处理销售确认数据，数量:', allData.confirmation.length);
        const confirmationJson = JSON.stringify(allData.confirmation);
        const importSuccess = importQuotationHistory(confirmationJson);
        console.log('销售确认导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`销售确认：${allData.confirmation.length} 条`);
          totalImported += allData.confirmation.length;
          if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
            results.otherTabs!.push('销售确认');
          }
        } else {
          console.error('销售确认导入失败');
        }
      }

      // 处理发票数据
      if (allData.invoice && Array.isArray(allData.invoice) && allData.invoice.length > 0) {
        console.log('处理发票数据，数量:', allData.invoice.length);
        const invoiceJson = JSON.stringify(allData.invoice);
        const importSuccess = importInvoiceHistory(invoiceJson);
        console.log('发票导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`发票：${allData.invoice.length} 条`);
          totalImported += allData.invoice.length;
          if (activeTab !== 'invoice') {
            results.otherTabs!.push('发票');
          }
        } else {
          console.error('发票导入失败');
        }
      }

      // 处理采购单数据
      if (allData.purchase && Array.isArray(allData.purchase) && allData.purchase.length > 0) {
        console.log('处理采购单数据，数量:', allData.purchase.length);
        const purchaseJson = JSON.stringify(allData.purchase);
        const importSuccess = importPurchaseHistory(purchaseJson);
        console.log('采购单导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`采购单：${allData.purchase.length} 条`);
          totalImported += allData.purchase.length;
          if (activeTab !== 'purchase') {
            results.otherTabs!.push('采购单');
          }
        } else {
          console.error('采购单导入失败');
        }
      }

      // 处理装箱单数据
      if (allData.packing && Array.isArray(allData.packing) && allData.packing.length > 0) {
        console.log('处理装箱单数据，数量:', allData.packing.length);
        const packingJson = JSON.stringify(allData.packing);
        const importSuccess = importPackingHistory(packingJson);
        console.log('装箱单导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`装箱单：${allData.packing.length} 条`);
          totalImported += allData.packing.length;
          if (activeTab !== 'packing') {
            results.otherTabs!.push('装箱单');
          }
        } else {
          console.error('装箱单导入失败');
        }
      }

      console.log('综合数据导入完成，总计:', totalImported);
      if (totalImported === 0) {
        return { success: false, error: '综合数据中未找到有效的历史记录数据' };
      }

      results.details!.unshift(`总计导入：${totalImported} 条记录`);
      return results;
    }

    console.log('检测到数组格式数据');
    // 原有的数组格式处理逻辑
    if (!Array.isArray(parsedData) || parsedData.length === 0) {
      return { success: false, error: '文件格式错误：需要包含数据的JSON数组或综合数据格式' };
    }

    const results: ImportResult = {
      success: true,
      details: [],
      otherTabs: []
    };

    // 按类型分组数据
    const quotationData = [];
    const confirmationData = [];
    const invoiceData = [];
    const purchaseData = [];
    const packingData = [];

    for (const item of parsedData) {
      if (!item || typeof item !== 'object') continue;

      // 识别数据类型
      if ('quotationNo' in item && 'type' in item) {
        // 报价单或确认书数据
        if (item.type === 'quotation') {
          quotationData.push(item);
        } else if (item.type === 'confirmation') {
          confirmationData.push(item);
        }
      } else if ('invoiceNo' in item && !('quotationNo' in item) && !('consigneeName' in item)) {
        // 发票数据
        invoiceData.push(item);
      } else if ('orderNo' in item && 'supplierName' in item) {
        // 采购单数据
        purchaseData.push(item);
      } else if ('consigneeName' in item || ('invoiceNo' in item && 'documentType' in item)) {
        // 装箱单数据
        packingData.push(item);
      } else if ('data' in item && item.data) {
        // 通过data字段判断类型
        if (item.data.quotationNo && item.data.customerPO === undefined) {
          // 报价单数据
          quotationData.push({
            ...item,
            type: item.data.type || 'quotation'
          });
        } else if (item.data.invoiceNo && item.data.consignee) {
          // 装箱单数据
          packingData.push(item);
        } else if (item.data.invoiceNo || item.data.customerPO !== undefined) {
          // 发票数据
          invoiceData.push(item);
        } else if (item.data.orderNo && item.data.supplierName) {
          // 采购单数据
          purchaseData.push(item);
        }
      }
    }

    console.log('数据分组结果:', {
      quotation: quotationData.length,
      confirmation: confirmationData.length,
      invoice: invoiceData.length,
      purchase: purchaseData.length,
      packing: packingData.length
    });

    // 执行导入
    let totalImported = 0;

    if (quotationData.length > 0) {
      const quotationJson = JSON.stringify(quotationData);
      const importSuccess = importQuotationHistory(quotationJson);
      console.log('报价单导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`报价单：${quotationData.length} 条`);
        totalImported += quotationData.length;
        if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
          results.otherTabs!.push('报价单');
        }
      } else {
        console.error('报价单导入失败');
      }
    }

    if (confirmationData.length > 0) {
      const confirmationJson = JSON.stringify(confirmationData);
      const importSuccess = importQuotationHistory(confirmationJson);
      console.log('销售确认导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`销售确认：${confirmationData.length} 条`);
        totalImported += confirmationData.length;
        if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
          results.otherTabs!.push('销售确认');
        }
      } else {
        console.error('销售确认导入失败');
      }
    }

    if (invoiceData.length > 0) {
      const invoiceJson = JSON.stringify(invoiceData);
      const importSuccess = importInvoiceHistory(invoiceJson);
      console.log('发票导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`发票：${invoiceData.length} 条`);
        totalImported += invoiceData.length;
        if (activeTab !== 'invoice') {
          results.otherTabs!.push('发票');
        }
      } else {
        console.error('发票导入失败');
      }
    }

    if (purchaseData.length > 0) {
      const purchaseJson = JSON.stringify(purchaseData);
      const importSuccess = importPurchaseHistory(purchaseJson);
      console.log('采购单导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`采购单：${purchaseData.length} 条`);
        totalImported += purchaseData.length;
        if (activeTab !== 'purchase') {
          results.otherTabs!.push('采购单');
        }
      } else {
        console.error('采购单导入失败');
      }
    }

    if (packingData.length > 0) {
      const packingJson = JSON.stringify(packingData);
      const importSuccess = importPackingHistory(packingJson);
      console.log('装箱单导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`装箱单：${packingData.length} 条`);
        totalImported += packingData.length;
        if (activeTab !== 'packing') {
          results.otherTabs!.push('装箱单');
        }
      } else {
        console.error('装箱单导入失败');
      }
    }

    console.log('数组格式导入完成，总计:', totalImported);
    if (totalImported === 0) {
      return { success: false, error: '未能识别任何有效的历史记录数据' };
    }

    results.details!.unshift(`总计导入：${totalImported} 条记录`);
    return results;

  } catch (error) {
    console.error('Smart import error:', error);
    return { success: false, error: `文件解析失败: ${error instanceof Error ? error.message : '未知错误'}` };
  }
};

// 执行导出
export const executeExport = (exportType: 'current' | 'all' | 'filtered', activeTab: HistoryType, filteredData?: HistoryItem[]): ExportResult => {
  let jsonData = '';
  let fileName = '';
  let exportStats = '';

  switch (exportType) {
    case 'current':
      // 导出当前选项卡数据
      switch (activeTab) {
        case 'quotation':
          const quotationData = getQuotationHistory().filter(item => item.type === 'quotation');
          jsonData = JSON.stringify(quotationData, null, 2);
          fileName = `quotation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `报价单：${quotationData.length} 条`;
          break;
        case 'confirmation':
          const confirmationData = getQuotationHistory().filter(item => item.type === 'confirmation');
          jsonData = JSON.stringify(confirmationData, null, 2);
          fileName = `confirmation_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `销售确认：${confirmationData.length} 条`;
          break;
        case 'invoice':
          jsonData = JSON.stringify(getInvoiceHistory(), null, 2);
          const invoiceData = getInvoiceHistory();
          fileName = `invoice_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `发票：${invoiceData.length} 条`;
          break;
        case 'purchase':
          jsonData = JSON.stringify(getPurchaseHistory(), null, 2);
          const purchaseData = getPurchaseHistory();
          fileName = `purchase_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `采购单：${purchaseData.length} 条`;
          break;
        case 'packing':
          jsonData = JSON.stringify(getPackingHistory(), null, 2);
          const packingData = getPackingHistory();
          fileName = `packing_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
          exportStats = `装箱单：${packingData.length} 条`;
          break;
      }
      break;

    case 'all':
      // 导出所有历史记录
      const allData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: 0,
          breakdown: {
            quotation: 0,
            confirmation: 0,
            invoice: 0,
            purchase: 0,
            packing: 0
          }
        },
        quotation: getQuotationHistory().filter(item => item.type === 'quotation'),
        confirmation: getQuotationHistory().filter(item => item.type === 'confirmation'),
        invoice: getInvoiceHistory(),
        purchase: getPurchaseHistory(),
        packing: getPackingHistory()
      };

      // 计算统计信息
      allData.metadata.breakdown.quotation = allData.quotation.length;
      allData.metadata.breakdown.confirmation = allData.confirmation.length;
      allData.metadata.breakdown.invoice = allData.invoice.length;
      allData.metadata.breakdown.purchase = allData.purchase.length;
      allData.metadata.breakdown.packing = allData.packing.length;
      allData.metadata.totalRecords = Object.values(allData.metadata.breakdown).reduce((sum, count) => sum + count, 0);

      jsonData = JSON.stringify(allData, null, 2);
      fileName = `all_history_records_${format(new Date(), 'yyyy-MM-dd')}.json`;
      exportStats = `总计：${allData.metadata.totalRecords} 条\n` +
        `报价单：${allData.metadata.breakdown.quotation} 条\n` +
        `销售确认：${allData.metadata.breakdown.confirmation} 条\n` +
        `发票：${allData.metadata.breakdown.invoice} 条\n` +
        `采购单：${allData.metadata.breakdown.purchase} 条\n` +
        `装箱单：${allData.metadata.breakdown.packing} 条`;
      break;

    case 'filtered':
      // 导出筛选后的数据
      const filteredExportData = {
        metadata: {
          exportDate: new Date().toISOString(),
          totalRecords: filteredData?.length || 0
        },
        records: filteredData || []
      };

      jsonData = JSON.stringify(filteredExportData, null, 2);
      fileName = `filtered_history_${format(new Date(), 'yyyy-MM-dd')}.json`;
      exportStats = `筛选结果：${filteredData?.length || 0} 条`;
      break;
  }

  return { jsonData, fileName, exportStats };
};

// 处理文件下载
export const downloadFile = (jsonData: string, fileName: string) => {
  if (jsonData) {
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  }
  return false;
};

// 处理文件导入
export const handleFileImport = (file: File, activeTab: HistoryType): Promise<ImportResult> => {
  return new Promise((resolve, reject) => {
    console.log('handleFileImport: 开始导入文件:', file.name, '大小:', file.size);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const content = e.target?.result as string;
      console.log('handleFileImport: 文件内容长度:', content.length);
      console.log('handleFileImport: 文件内容前100字符:', content.substring(0, 100));
      
      try {
        console.log('handleFileImport: 调用smartImport函数');
        const importResult = smartImport(content, activeTab);
        console.log('handleFileImport: 导入结果:', importResult);
        resolve(importResult);
      } catch (error) {
        console.error('handleFileImport: Error importing:', error);
        console.error('handleFileImport: 错误详情:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        reject({ success: false, error: `文件格式错误: ${error instanceof Error ? error.message : String(error)}` });
      }
    };
    
    reader.onerror = (error) => {
      console.error('handleFileImport: 文件读取失败:', error);
      console.error('handleFileImport: 错误详情:', {
        error: error,
        readyState: reader.readyState,
        result: reader.result
      });
      reject({ success: false, error: '文件读取失败，请重试' });
    };
    
    reader.onabort = () => {
      console.error('handleFileImport: 文件读取被中断');
      reject({ success: false, error: '文件读取被中断' });
    };
    
    try {
      console.log('handleFileImport: 开始读取文件');
      reader.readAsText(file);
    } catch (readError) {
      console.error('handleFileImport: 读取文件时发生错误:', readError);
      reject({ success: false, error: `读取文件失败: ${readError instanceof Error ? readError.message : String(readError)}` });
    }
  });
}; 