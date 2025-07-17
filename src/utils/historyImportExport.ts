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
  customerImported?: number; // 新增：导入的客户数量
}

export interface ExportResult {
  jsonData: string;
  fileName: string;
  exportStats: string;
}

// 提取客户信息的辅助函数
const extractCustomerInfo = (data: any): { name: string; content: string } | null => {
  try {
    console.log(`🔍 开始提取客户信息:`, {
      hasTo: !!data.to,
      hasData: !!data.data,
      hasDataTo: !!(data.data && data.data.to),
      hasDataConsignee: !!(data.data && data.data.consignee),
      hasConsigneeName: !!data.consigneeName,
      dataKeys: data.data ? Object.keys(data.data) : [],
      itemKeys: Object.keys(data)
    });

    // 从不同单据类型中提取客户信息
    let customerName = '';
    let customerContent = '';

    // 报价单和销售确认 - 直接使用to字段
    if (data.to) {
      customerContent = data.to;
      customerName = data.to.split('\n')[0]?.trim() || '';
      console.log(`📝 从报价单/销售确认提取:`, { customerName, hasContent: !!customerContent });
    }
    // 发票 - 从data.to字段提取
    else if (data.data?.to) {
      customerContent = data.data.to;
      customerName = data.data.to.split('\n')[0]?.trim() || '';
      console.log(`📝 从发票提取:`, { customerName, hasContent: !!customerContent });
    }
    // 装箱单 - 从data.consignee字段提取
    else if (data.data?.consignee) {
      // 检查consignee是字符串还是对象
      if (typeof data.data.consignee === 'string') {
        customerContent = data.data.consignee;
        customerName = data.data.consignee.split('\n')[0]?.trim() || '';
        console.log(`📝 从装箱单提取:`, { customerName, hasContent: !!customerContent });
      } else if (typeof data.data.consignee === 'object' && data.data.consignee !== null) {
        // 如果是对象，尝试提取name字段或转换为字符串
        const consigneeName = data.data.consignee.name || '';
        customerContent = consigneeName;
        customerName = consigneeName.split('\n')[0]?.trim() || '';
        console.log(`📝 从装箱单对象提取:`, { customerName, hasContent: !!customerContent });
      }
    }
    // 装箱单 - 从consigneeName字段提取（备用）
    else if (data.consigneeName) {
      customerContent = data.consigneeName;
      customerName = data.consigneeName.split('\n')[0]?.trim() || '';
      console.log(`📝 从装箱单consigneeName提取:`, { customerName, hasContent: !!customerContent });
    }
    // 装箱单 - 从data.consigneeName字段提取（备用）
    else if (data.data?.consigneeName) {
      customerContent = data.data.consigneeName;
      customerName = data.data.consigneeName.split('\n')[0]?.trim() || '';
      console.log(`📝 从装箱单data.consigneeName提取:`, { customerName, hasContent: !!customerContent });
    }
    // 装箱单 - 从data.consignee.name字段提取（备用）
    else if (data.data?.consignee?.name) {
      const consigneeName = data.data.consignee.name;
      customerContent = consigneeName;
      customerName = consigneeName.split('\n')[0]?.trim() || '';
      console.log(`📝 从装箱单data.consignee.name提取:`, { customerName, hasContent: !!customerContent });
    }

    if (customerName && customerContent) {
      console.log(`✅ 成功提取客户信息:`, { customerName, contentLength: customerContent.length });
      return { name: customerName, content: customerContent };
    }

    console.log(`❌ 无法提取客户信息，所有字段都为空`);
    return null;
  } catch (error) {
    console.error('❌ 提取客户信息失败:', error);
    return null;
  }
};

// 保存客户信息到客户管理系统
const saveCustomerInfo = (customerInfo: { name: string; content: string }, documentType: string, documentNo: string): boolean => {
  try {
    console.log(`💾 开始保存客户信息:`, {
      customerName: customerInfo.name,
      documentType,
      documentNo
    });

    // 获取现有的客户记录
    const customerRecords = localStorage.getItem('customerRecords');
    let records = customerRecords ? JSON.parse(customerRecords) : [];
    
    console.log(`📋 当前客户记录数量: ${records.length}`);
    console.log(`📋 现有客户名称:`, records.map((r: any) => r.name));
    
    // 使用智能匹配查找是否已存在相同名称的客户
    const existingIndex = findBestCustomerMatch(customerInfo.name, records);
    
    console.log(`🔍 客户匹配结果:`, {
      searchName: customerInfo.name,
      existingIndex,
      foundRecord: existingIndex >= 0 ? records[existingIndex]?.name : 'none'
    });
    
    const newRecord = {
      id: existingIndex >= 0 ? records[existingIndex].id : Date.now().toString() + Math.random().toString(36).substr(2, 9),
      name: customerInfo.name,
      content: customerInfo.content,
      createdAt: existingIndex >= 0 ? records[existingIndex].createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageRecords: existingIndex >= 0 ? records[existingIndex].usageRecords : []
    };

    // 添加使用记录
    const usageRecord = {
      documentType: documentType as 'invoice' | 'packing' | 'quotation' | 'confirmation',
      documentNo: documentNo,
      usedAt: new Date().toISOString()
    };

    console.log(`📝 添加使用记录:`, {
      documentType: usageRecord.documentType,
      documentNo: usageRecord.documentNo,
      existingRecordsCount: newRecord.usageRecords.length
    });

    // 检查是否已存在相同的使用记录
    const existingUsageIndex = newRecord.usageRecords.findIndex((record: any) => 
      record.documentType === usageRecord.documentType && 
      record.documentNo === usageRecord.documentNo
    );

    if (existingUsageIndex === -1) {
      newRecord.usageRecords.push(usageRecord);
      console.log(`✅ 添加新使用记录成功: ${documentType}:${documentNo}`);
    } else {
      console.log(`⚠️ 使用记录已存在，跳过添加: ${documentType}:${documentNo}`);
    }

    if (existingIndex >= 0) {
      records[existingIndex] = newRecord;
      console.log(`🔄 更新现有客户记录: ${customerInfo.name}`);
    } else {
      records.push(newRecord);
      console.log(`➕ 添加新客户记录: ${customerInfo.name}`);
    }
    
    // 保存到localStorage
    localStorage.setItem('customerRecords', JSON.stringify(records));
    
    console.log(`💾 客户信息保存成功: ${customerInfo.name}`);
    return true;
  } catch (error) {
    console.error('❌ 保存客户信息失败:', error);
    return false;
  }
};

// 添加客户名称匹配函数
function normalizeCustomerName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ') // 将多个空格替换为单个空格
    .replace(/[^\w\s]/g, '') // 移除特殊字符，只保留字母、数字和空格
    .trim();
}

function findBestCustomerMatch(customerName: string, records: any[]): number {
  const normalizedSearchName = normalizeCustomerName(customerName);
  
  console.log(`🔍 查找客户匹配:`, {
    originalName: customerName,
    normalizedName: normalizedSearchName,
    totalRecords: records.length
  });
  
  // 首先尝试精确匹配
  const exactMatch = records.findIndex(record => {
    const normalizedRecordName = normalizeCustomerName(record.name);
    const isMatch = normalizedRecordName === normalizedSearchName;
    if (isMatch) {
      console.log(`✅ 精确匹配成功:`, {
        recordName: record.name,
        normalizedRecordName,
        recordId: record.id
      });
    }
    return isMatch;
  });
  
  if (exactMatch !== -1) {
    return exactMatch;
  }
  
  // 如果精确匹配失败，尝试模糊匹配（包含关系）
  const fuzzyMatch = records.findIndex(record => {
    const normalizedRecordName = normalizeCustomerName(record.name);
    const searchInRecord = normalizedRecordName.includes(normalizedSearchName);
    const recordInSearch = normalizedSearchName.includes(normalizedRecordName);
    
    if (searchInRecord || recordInSearch) {
      console.log(`🔍 模糊匹配成功:`, {
        recordName: record.name,
        normalizedRecordName,
        searchInRecord,
        recordInSearch,
        recordId: record.id
      });
    }
    
    return searchInRecord || recordInSearch;
  });
  
  if (fuzzyMatch !== -1) {
    return fuzzyMatch;
  }
  
  console.log(`❌ 未找到匹配的客户:`, {
    searchName: customerName,
    normalizedSearchName
  });
  
  return -1;
}

// 处理单据数据并提取客户信息
const processDocumentData = (data: any[], documentType: string): { processedData: any[], customerCount: number } => {
  const processedData = [...data];
  let customerCount = 0;
  
  // 用于去重的Set，避免同一个单据被重复处理
  const processedDocuments = new Set<string>();

  console.log(`🔍 处理 ${documentType} 类型数据，共 ${data.length} 条记录`);

  for (const item of processedData) {
    const customerInfo = extractCustomerInfo(item);
    if (customerInfo) {
      // 根据文档类型选择合适的号码字段
      let documentNo = '';
      if (documentType === 'quotation') {
        documentNo = item.quotationNo || item.data?.quotationNo || '';
      } else if (documentType === 'confirmation') {
        documentNo = item.contractNo || item.data?.contractNo || item.quotationNo || item.data?.quotationNo || '';
      } else if (documentType === 'invoice') {
        documentNo = item.invoiceNo || item.data?.invoiceNo || '';
      } else if (documentType === 'purchase') {
        documentNo = item.orderNo || item.data?.orderNo || '';
      } else if (documentType === 'packing') {
        documentNo = item.invoiceNo || item.data?.invoiceNo || '';
      }
      
      // 如果仍然没有找到号码，才使用ID作为备用
      if (!documentNo) {
        documentNo = item.id || '';
      }
      
      // 创建唯一标识符，用于去重
      const documentKey = `${documentType}:${documentNo}`;
      
      // 检查是否已经处理过这个单据
      if (processedDocuments.has(documentKey)) {
        console.log(`⚠️ 跳过重复单据: ${documentKey}`);
        continue;
      }
      
      processedDocuments.add(documentKey);
      
      console.log(`📝 提取客户信息:`, {
        customerName: customerInfo.name,
        documentType,
        documentNo,
        itemType: item.type || 'unknown',
        hasQuotationNo: !!item.quotationNo,
        hasDataQuotationNo: !!item.data?.quotationNo,
        hasContractNo: !!item.contractNo,
        hasDataContractNo: !!item.data?.contractNo,
        hasInvoiceNo: !!item.invoiceNo,
        hasDataInvoiceNo: !!item.data?.invoiceNo
      });
      const success = saveCustomerInfo(customerInfo, documentType, documentNo);
      if (success) {
        customerCount++;
        console.log(`✅ 成功保存客户使用记录: ${customerInfo.name} - ${documentType}:${documentNo}`);
      } else {
        console.log(`❌ 保存客户使用记录失败: ${customerInfo.name} - ${documentType}:${documentNo}`);
      }
    } else {
      console.log(`⚠️ 无法提取客户信息:`, {
        itemKeys: Object.keys(item),
        hasTo: !!item.to,
        hasData: !!item.data,
        hasDataTo: !!(item.data && item.data.to),
        hasDataConsignee: !!(item.data && item.data.consignee)
      });
    }
  }

  console.log(`📊 ${documentType} 处理完成，成功保存 ${customerCount} 条客户记录，去重后处理 ${processedDocuments.size} 个单据`);
  return { processedData, customerCount };
};

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
          otherTabs: [],
          customerImported: 0
        };

        // 按类型分组数据
        const quotationData = [];
        const confirmationData = [];
        const invoiceData = [];
        const purchaseData = [];
        const packingData = [];

        for (const item of records) {
          if (!item || typeof item !== 'object') continue;

          console.log(`🔍 分析数据项:`, {
            hasQuotationNo: 'quotationNo' in item,
            hasType: 'type' in item,
            hasInvoiceNo: 'invoiceNo' in item,
            hasConsigneeName: 'consigneeName' in item,
            hasOrderNo: 'orderNo' in item,
            hasSupplierName: 'supplierName' in item,
            hasData: 'data' in item,
            itemType: item.type,
            dataKeys: item.data ? Object.keys(item.data) : [],
            // 添加更详细的字段信息
            quotationNo: item.quotationNo,
            invoiceNo: item.invoiceNo,
            orderNo: item.orderNo,
            consigneeName: item.consigneeName,
            supplierName: item.supplierName,
            dataType: item.data?.type,
            dataQuotationNo: item.data?.quotationNo,
            dataInvoiceNo: item.data?.invoiceNo,
            dataOrderNo: item.data?.orderNo,
            dataConsignee: item.data?.consignee,
            dataSupplierName: item.data?.supplierName,
            dataCustomerPO: item.data?.customerPO
          });

          // 识别数据类型
          if ('quotationNo' in item && 'type' in item) {
            // 报价单或确认书数据
            if (item.type === 'quotation') {
              quotationData.push(item);
              console.log(`✅ 识别为报价单: ${item.quotationNo}`);
            } else if (item.type === 'confirmation') {
              confirmationData.push(item);
              console.log(`✅ 识别为订单确认: ${item.quotationNo}`);
            }
          } else if ('invoiceNo' in item && !('quotationNo' in item) && !('consigneeName' in item)) {
            // 发票数据
            invoiceData.push(item);
            console.log(`✅ 识别为发票: ${item.invoiceNo}`);
          } else if ('orderNo' in item && 'supplierName' in item) {
            // 采购单数据
            purchaseData.push(item);
            console.log(`✅ 识别为采购单: ${item.orderNo}`);
          } else if ('consigneeName' in item || ('invoiceNo' in item && 'documentType' in item)) {
            // 装箱单数据
            packingData.push(item);
            console.log(`✅ 识别为装箱单: ${item.invoiceNo || item.consigneeName}`);
          } else if ('data' in item && item.data) {
            // 通过data字段判断类型
            if (item.data.quotationNo && item.data.customerPO === undefined) {
              // 报价单数据
              const type = item.data.type || 'quotation';
              if (type === 'quotation') {
                quotationData.push({
                  ...item,
                  type: 'quotation'
                });
                console.log(`✅ 通过data识别为报价单: ${item.data.quotationNo}`);
              } else if (type === 'confirmation') {
                confirmationData.push({
                  ...item,
                  type: 'confirmation'
                });
                console.log(`✅ 通过data识别为订单确认: ${item.data.quotationNo}`);
              }
            } else if (item.data.invoiceNo && item.data.consignee) {
              // 装箱单数据
              packingData.push(item);
              console.log(`✅ 通过data识别为装箱单: ${item.data.invoiceNo}`);
            } else if (item.data.invoiceNo || item.data.customerPO !== undefined) {
              // 发票数据
              invoiceData.push(item);
              console.log(`✅ 通过data识别为发票: ${item.data.invoiceNo}`);
            } else if (item.data.orderNo && item.data.supplierName) {
              // 采购单数据
              purchaseData.push(item);
              console.log(`✅ 通过data识别为采购单: ${item.data.orderNo}`);
            } else {
              console.log(`⚠️ 无法识别的数据类型:`, {
                hasQuotationNo: !!item.data.quotationNo,
                hasInvoiceNo: !!item.data.invoiceNo,
                hasOrderNo: !!item.data.orderNo,
                hasConsignee: !!item.data.consignee,
                hasCustomerPO: item.data.customerPO !== undefined,
                hasSupplierName: !!item.data.supplierName
              });
            }
          } else {
            console.log(`⚠️ 无法识别的数据项:`, {
              keys: Object.keys(item),
              hasData: 'data' in item
            });
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
        let totalCustomersImported = 0;

        if (quotationData.length > 0) {
          const { processedData, customerCount } = processDocumentData(quotationData, 'quotation');
          const quotationJson = JSON.stringify(processedData);
          const importSuccess = importQuotationHistory(quotationJson);
          console.log('报价单导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`报价单：${quotationData.length} 条`);
            totalImported += quotationData.length;
            totalCustomersImported += customerCount;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs!.push('报价单');
            }
          } else {
            console.error('报价单导入失败');
          }
        }

        if (confirmationData.length > 0) {
          const { processedData, customerCount } = processDocumentData(confirmationData, 'confirmation');
          const confirmationJson = JSON.stringify(processedData);
          const importSuccess = importQuotationHistory(confirmationJson);
          console.log('销售确认导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`销售确认：${confirmationData.length} 条`);
            totalImported += confirmationData.length;
            totalCustomersImported += customerCount;
            if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
              results.otherTabs!.push('销售确认');
            }
          } else {
            console.error('销售确认导入失败');
          }
        }

        if (invoiceData.length > 0) {
          const { processedData, customerCount } = processDocumentData(invoiceData, 'invoice');
          const invoiceJson = JSON.stringify(processedData);
          const importSuccess = importInvoiceHistory(invoiceJson);
          console.log('发票导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`发票：${invoiceData.length} 条`);
            totalImported += invoiceData.length;
            totalCustomersImported += customerCount;
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
          const { processedData, customerCount } = processDocumentData(packingData, 'packing');
          const packingJson = JSON.stringify(processedData);
          const importSuccess = importPackingHistory(packingJson);
          console.log('装箱单导入结果:', importSuccess);
          if (importSuccess) {
            results.details!.push(`装箱单：${packingData.length} 条`);
            totalImported += packingData.length;
            totalCustomersImported += customerCount;
            if (activeTab !== 'packing') {
              results.otherTabs!.push('装箱单');
            }
          } else {
            console.error('装箱单导入失败');
          }
        }

        console.log('筛选数据导入完成，总计:', totalImported, '客户:', totalCustomersImported);
        if (totalImported === 0) {
          return { success: false, error: '筛选数据中未找到有效的历史记录数据' };
        }

        results.details!.unshift(`总计导入：${totalImported} 条记录`);
        if (totalCustomersImported > 0) {
          results.details!.push(`客户信息：${totalCustomersImported} 条`);
        }
        results.customerImported = totalCustomersImported;
        return results;
      }
      
      // 综合数据格式（包含quotation、confirmation、invoice、purchase字段）
      const allData = parsedData;
      const results: ImportResult = {
        success: true,
        details: [],
        otherTabs: [],
        customerImported: 0
      };

      let totalImported = 0;
      let totalCustomersImported = 0;

      // 处理报价单数据
      if (allData.quotation && Array.isArray(allData.quotation) && allData.quotation.length > 0) {
        console.log('处理报价单数据，数量:', allData.quotation.length);
        const { processedData, customerCount } = processDocumentData(allData.quotation, 'quotation');
        const quotationJson = JSON.stringify(processedData);
        const importSuccess = importQuotationHistory(quotationJson);
        console.log('报价单导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`报价单：${allData.quotation.length} 条`);
          totalImported += allData.quotation.length;
          totalCustomersImported += customerCount;
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
        const { processedData, customerCount } = processDocumentData(allData.confirmation, 'confirmation');
        const confirmationJson = JSON.stringify(processedData);
        const importSuccess = importQuotationHistory(confirmationJson);
        console.log('销售确认导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`销售确认：${allData.confirmation.length} 条`);
          totalImported += allData.confirmation.length;
          totalCustomersImported += customerCount;
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
        const { processedData, customerCount } = processDocumentData(allData.invoice, 'invoice');
        const invoiceJson = JSON.stringify(processedData);
        const importSuccess = importInvoiceHistory(invoiceJson);
        console.log('发票导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`发票：${allData.invoice.length} 条`);
          totalImported += allData.invoice.length;
          totalCustomersImported += customerCount;
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
        const { processedData, customerCount } = processDocumentData(allData.packing, 'packing');
        const packingJson = JSON.stringify(processedData);
        const importSuccess = importPackingHistory(packingJson);
        console.log('装箱单导入结果:', importSuccess);
        if (importSuccess) {
          results.details!.push(`装箱单：${allData.packing.length} 条`);
          totalImported += allData.packing.length;
          totalCustomersImported += customerCount;
          if (activeTab !== 'packing') {
            results.otherTabs!.push('装箱单');
          }
        } else {
          console.error('装箱单导入失败');
        }
      }

      console.log('综合数据导入完成，总计:', totalImported, '客户:', totalCustomersImported);
      if (totalImported === 0) {
        return { success: false, error: '综合数据中未找到有效的历史记录数据' };
      }

      results.details!.unshift(`总计导入：${totalImported} 条记录`);
      if (totalCustomersImported > 0) {
        results.details!.push(`客户信息：${totalCustomersImported} 条`);
      }
      results.customerImported = totalCustomersImported;
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
      otherTabs: [],
      customerImported: 0
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
    let totalCustomersImported = 0;

    if (quotationData.length > 0) {
      const { processedData, customerCount } = processDocumentData(quotationData, 'quotation');
      const quotationJson = JSON.stringify(processedData);
      const importSuccess = importQuotationHistory(quotationJson);
      console.log('报价单导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`报价单：${quotationData.length} 条`);
        totalImported += quotationData.length;
        totalCustomersImported += customerCount;
        if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
          results.otherTabs!.push('报价单');
        }
      } else {
        console.error('报价单导入失败');
      }
    }

    if (confirmationData.length > 0) {
      const { processedData, customerCount } = processDocumentData(confirmationData, 'confirmation');
      const confirmationJson = JSON.stringify(processedData);
      const importSuccess = importQuotationHistory(confirmationJson);
      console.log('销售确认导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`销售确认：${confirmationData.length} 条`);
        totalImported += confirmationData.length;
        totalCustomersImported += customerCount;
        if (activeTab !== 'quotation' && activeTab !== 'confirmation') {
          results.otherTabs!.push('销售确认');
        }
      } else {
        console.error('销售确认导入失败');
      }
    }

    if (invoiceData.length > 0) {
      const { processedData, customerCount } = processDocumentData(invoiceData, 'invoice');
      const invoiceJson = JSON.stringify(processedData);
      const importSuccess = importInvoiceHistory(invoiceJson);
      console.log('发票导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`发票：${invoiceData.length} 条`);
        totalImported += invoiceData.length;
        totalCustomersImported += customerCount;
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
      const { processedData, customerCount } = processDocumentData(packingData, 'packing');
      const packingJson = JSON.stringify(processedData);
      const importSuccess = importPackingHistory(packingJson);
      console.log('装箱单导入结果:', importSuccess);
      if (importSuccess) {
        results.details!.push(`装箱单：${packingData.length} 条`);
        totalImported += packingData.length;
        totalCustomersImported += customerCount;
        if (activeTab !== 'packing') {
          results.otherTabs!.push('装箱单');
        }
      } else {
        console.error('装箱单导入失败');
      }
    }

    console.log('数组格式导入完成，总计:', totalImported, '客户:', totalCustomersImported);
    if (totalImported === 0) {
      return { success: false, error: '未能识别任何有效的历史记录数据' };
    }

    results.details!.unshift(`总计导入：${totalImported} 条记录`);
    if (totalCustomersImported > 0) {
      results.details!.push(`客户信息：${totalCustomersImported} 条`);
    }
    results.customerImported = totalCustomersImported;
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