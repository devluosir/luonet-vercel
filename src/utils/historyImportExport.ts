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
  data: unknown;
}

type NumericLike = string | number;

type ImportRecord = Record<string, unknown> & {
  id?: string;
  type?: string;
  documentType?: string;
  createdAt?: string;
  updatedAt?: string;
  customerName?: string;
  supplierName?: string;
  consigneeName?: string;
  quotationNo?: string;
  invoiceNo?: string;
  orderNo?: string;
  purchaseNo?: string;
  packingNo?: string;
  totalAmount?: NumericLike;
  amount?: NumericLike;
  price?: NumericLike;
  quantity?: NumericLike;
  currency?: string;
  data?: ImportRecord[];
  items?: ImportRecord[];
  records?: ImportRecord[];
  history?: ImportRecord[];
};

const isImportRecord = (value: unknown): value is ImportRecord => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const toImportRecords = (value: unknown): ImportRecord[] => (
  Array.isArray(value) ? value.filter(isImportRecord) : []
);

const toNumber = (value: unknown): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

const recordsFromNumericKeys = (record: ImportRecord, numericKeys: string[]): ImportRecord[] => (
  numericKeys
    .sort((a, b) => Number(a) - Number(b))
    .map(key => record[key])
    .filter(isImportRecord)
);

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
const processDocumentData = (data: ImportRecord[], documentType: string): { processedData: ImportRecord[], customerCount: number } => {
  const processedData = data.map(item => {
    // 为导入的数据添加必要的默认值，确保组件能正常渲染
    const processedItem = {
      ...item,
      // 确保有ID
      id: item.id || `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      // 确保有类型字段
      type: item.type || documentType,
      documentType: item.documentType || documentType,
      // 确保有时间字段
      createdAt: item.createdAt || new Date().toISOString(),
      updatedAt: item.updatedAt || new Date().toISOString(),
      // 确保有金额字段（装箱单需要）
      totalAmount: toNumber(item.totalAmount),
      currency: item.currency || 'USD',
      // 确保金额字段不为undefined
      amount: toNumber(item.amount),
      price: toNumber(item.price),
      quantity: toNumber(item.quantity),
      // 确保有基本字段
      customerName: item.customerName || '',
      supplierName: item.supplierName || '',
      consigneeName: item.consigneeName || '',
      // 确保有编号字段
      quotationNo: item.quotationNo || '',
      orderNo: item.orderNo || '',
      invoiceNo: item.invoiceNo || '',
      purchaseNo: item.purchaseNo || '',
      packingNo: item.packingNo || '',
      // 确保有items数组
      items: item.items || []
    };

    return processedItem;
  });

  console.log(`🔍 处理 ${documentType} 类型数据，共 ${data.length} 条记录`);

  // 移除客户信息提取和保存逻辑，直接返回处理后的数据
  console.log(`📊 ${documentType} 处理完成，跳过客户信息提取`);
  return { processedData, customerCount: 0 };
};

// 智能导入函数
export const smartImport = (content: string, activeTab: HistoryType): ImportResult => {
  try {
    console.log(`📥 开始智能导入，当前标签: ${activeTab}`);

    // 解析JSON数据
    const parsedData: unknown = JSON.parse(content);
    console.log(`📋 导入数据解析成功，数据类型: ${typeof parsedData}, 是否为数组: ${Array.isArray(parsedData)}, 包含 ${Array.isArray(parsedData) ? parsedData.length : '非数组'} 条记录`);

    // 处理不同的数据格式
    let importData: ImportRecord[];

    if (Array.isArray(parsedData)) {
      // 直接是数组格式
      importData = toImportRecords(parsedData);
    } else if (isImportRecord(parsedData)) {
      // 对象格式，尝试提取数组数据
      console.log('🔍 检测到对象格式数据，尝试提取数组...');

      // 检查常见的对象结构
      if (parsedData.data && Array.isArray(parsedData.data)) {
        importData = toImportRecords(parsedData.data);
        console.log(`✅ 从 data 字段提取到 ${importData.length} 条记录`);
      } else if (parsedData.items && Array.isArray(parsedData.items)) {
        importData = toImportRecords(parsedData.items);
        console.log(`✅ 从 items 字段提取到 ${importData.length} 条记录`);
      } else if (parsedData.records && Array.isArray(parsedData.records)) {
        importData = toImportRecords(parsedData.records);
        console.log(`✅ 从 records 字段提取到 ${importData.length} 条记录`);
      } else if (parsedData.history && Array.isArray(parsedData.history)) {
        importData = toImportRecords(parsedData.history);
        console.log(`✅ 从 history 字段提取到 ${importData.length} 条记录`);
      } else {
        // 尝试将对象转换为数组
        const objectKeys = Object.keys(parsedData);
        if (objectKeys.length > 0) {
          // 检查是否所有值都是对象（可能是以ID为键的对象数组）
          const allValuesAreObjects = objectKeys.every(key => isImportRecord(parsedData[key]));

          if (allValuesAreObjects) {
            importData = objectKeys.map(key => ({
              id: key,
              ...(parsedData[key] as ImportRecord)
            }));
            console.log(`✅ 将对象转换为数组，共 ${importData.length} 条记录`);
          } else {
            return {
              success: false,
              error: `导入数据格式错误：无法从对象中提取数组数据。请确保数据是数组格式，或包含 data/items/records/history 字段`
            };
          }
        } else {
          return {
            success: false,
            error: '导入数据为空：对象中没有数据'
          };
        }
      }
    } else {
      return {
        success: false,
        error: `导入数据格式错误：期望数组或对象，实际得到 ${typeof parsedData} 类型`
      };
    }

    if (importData.length === 0) {
      return {
        success: false,
        error: '导入数据为空：提取到的数组为空'
      };
    }

    // 分析数据类型
    const dataTypes = new Set<string>();
    const details: string[] = [];
    const otherTabs: string[] = [];

    importData.forEach((item: ImportRecord, index: number) => {
      console.log(`🔍 检查第${index + 1}条数据:`, {
        id: item.id,
        documentType: item.documentType,
        type: item.type,
        customerName: item.customerName,
        supplierName: item.supplierName
      });

      // 检查多种可能的类型字段
      if (item.documentType) {
        dataTypes.add(item.documentType);
        console.log(`✅ 添加documentType: ${item.documentType}`);
      } else if (item.type) {
        // 历史数据使用 type 字段
        if (item.type === 'quotation' || item.type === 'confirmation') {
          dataTypes.add(item.type);
          console.log(`✅ 添加type: ${item.type}`);
        } else if (item.type === 'purchase') {
          dataTypes.add('purchase');
          console.log(`✅ 添加type: purchase`);
        } else if (item.type === 'invoice') {
          dataTypes.add('invoice');
          console.log(`✅ 添加type: invoice`);
        } else if (item.type === 'packing') {
          dataTypes.add('packing');
          console.log(`✅ 添加type: packing`);
        } else {
          console.log(`⚠️ 未知的type: ${item.type}`);
        }
      } else {
        // 尝试通过其他字段智能识别数据类型
        if (item.supplierName && !item.customerName) {
          // 有供应商名称但没有客户名称，可能是采购单
          dataTypes.add('purchase');
          console.log(`🔍 通过supplierName智能识别为采购单`);
        } else if (item.consigneeName && !item.customerName && !item.supplierName) {
          // 有收货人名称但没有客户或供应商名称，可能是装箱单
          dataTypes.add('packing');
          console.log(`🔍 通过consigneeName智能识别为装箱单`);
        } else if (item.invoiceNo && !item.quotationNo && !item.orderNo) {
          // 有发票号但没有报价单号或订单号，可能是发票
          dataTypes.add('invoice');
          console.log(`🔍 通过invoiceNo智能识别为发票`);
        } else if (item.id && ['quotation', 'confirmation', 'purchase', 'invoice', 'packing'].includes(item.id)) {
          // 通过ID字段识别数据类型（兼容旧版导出格式）
          dataTypes.add(item.id);
          console.log(`🔍 通过ID字段智能识别为${item.id}`);
        } else {
          console.log(`⚠️ 第${index + 1}条数据没有documentType或type字段，且无法智能识别`);
        }
      }
    });

    console.log(`🔍 检测到数据类型:`, Array.from(dataTypes));

    // 根据数据类型进行导入
    let totalImported = 0;
    let customerImported = 0;

    // 报价单导入
    if (dataTypes.has('quotation')) {
      const quotationItem = importData.find((item: ImportRecord) => item.id === 'quotation');
      let quotationData: ImportRecord[] = [];

      if (quotationItem) {
        // 如果找到ID为'quotation'的对象，提取其数据
        console.log(`🔍 quotation对象结构:`, {
          id: quotationItem.id,
          hasData: !!quotationItem.data,
          hasItems: !!quotationItem.items,
          hasRecords: !!quotationItem.records,
          dataType: typeof quotationItem.data,
          dataIsArray: Array.isArray(quotationItem.data),
          dataLength: quotationItem.data?.length,
          keys: Object.keys(quotationItem)
        });
        console.log(`🔍 quotation对象完整内容:`, quotationItem);

        if (Array.isArray(quotationItem.data)) {
          quotationData = quotationItem.data;
        } else if (Array.isArray(quotationItem.items)) {
          quotationData = quotationItem.items;
        } else if (Array.isArray(quotationItem.records)) {
          quotationData = quotationItem.records;
        } else {
          // 检查是否是以数字为键的对象（如 {0: {...}, 1: {...}, 2: {...}}）
          const numericKeys = Object.keys(quotationItem).filter(key =>
            key !== 'id' && !isNaN(Number(key))
          );

          if (numericKeys.length > 0) {
            // 按数字键排序并提取数据
            quotationData = recordsFromNumericKeys(quotationItem, numericKeys);
            console.log(`🔍 从quotation对象中按数字键提取到 ${quotationData.length} 条记录`);
          } else {
            // 如果quotationItem本身就是数据数组
            quotationData = [quotationItem];
          }
        }
        console.log(`🔍 从quotation对象中提取到 ${quotationData.length} 条记录`);
      } else {
        // 兼容旧格式：直接过滤数组中的quotation数据
        quotationData = importData.filter((item: ImportRecord) =>
          item.documentType === 'quotation' || item.type === 'quotation'
        );
      }

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

    // 订单确认导入
    if (dataTypes.has('confirmation')) {
      const confirmationItem = importData.find((item: ImportRecord) => item.id === 'confirmation');
      let confirmationData: ImportRecord[] = [];

      if (confirmationItem) {
        // 如果找到ID为'confirmation'的对象，提取其数据
        console.log(`🔍 confirmation对象结构:`, {
          id: confirmationItem.id,
          hasData: !!confirmationItem.data,
          hasItems: !!confirmationItem.items,
          hasRecords: !!confirmationItem.records,
          dataType: typeof confirmationItem.data,
          dataIsArray: Array.isArray(confirmationItem.data),
          dataLength: confirmationItem.data?.length,
          keys: Object.keys(confirmationItem)
        });

        if (Array.isArray(confirmationItem.data)) {
          confirmationData = confirmationItem.data;
        } else if (Array.isArray(confirmationItem.items)) {
          confirmationData = confirmationItem.items;
        } else if (Array.isArray(confirmationItem.records)) {
          confirmationData = confirmationItem.records;
        } else {
          // 检查是否是以数字为键的对象（如 {0: {...}, 1: {...}, 2: {...}}）
          const numericKeys = Object.keys(confirmationItem).filter(key =>
            key !== 'id' && !isNaN(Number(key))
          );

          if (numericKeys.length > 0) {
            // 按数字键排序并提取数据
            confirmationData = recordsFromNumericKeys(confirmationItem, numericKeys);
            console.log(`🔍 从confirmation对象中按数字键提取到 ${confirmationData.length} 条记录`);
          } else {
            // 如果confirmationItem本身就是数据数组
            confirmationData = [confirmationItem];
          }
        }
        console.log(`🔍 从confirmation对象中提取到 ${confirmationData.length} 条记录`);
      } else {
        // 兼容旧格式：直接过滤数组中的confirmation数据
        confirmationData = importData.filter((item: ImportRecord) =>
          item.documentType === 'confirmation' || item.type === 'confirmation'
        );
      }

      if (confirmationData.length > 0) {
        const { processedData } = processDocumentData(confirmationData, 'confirmation');
        importQuotationHistory(JSON.stringify(processedData));
        totalImported += processedData.length;
        details.push(`订单确认: ${processedData.length} 条`);

        if (activeTab !== 'confirmation') {
          otherTabs.push('confirmation');
        }
      }
    }

    // 采购单导入
    if (dataTypes.has('purchase')) {
      const purchaseItem = importData.find((item: ImportRecord) => item.id === 'purchase');
      let purchaseData: ImportRecord[] = [];

      if (purchaseItem) {
        // 如果找到ID为'purchase'的对象，提取其数据
        console.log(`🔍 purchase对象结构:`, {
          id: purchaseItem.id,
          hasData: !!purchaseItem.data,
          hasItems: !!purchaseItem.items,
          hasRecords: !!purchaseItem.records,
          dataType: typeof purchaseItem.data,
          dataIsArray: Array.isArray(purchaseItem.data),
          dataLength: purchaseItem.data?.length,
          keys: Object.keys(purchaseItem)
        });
        console.log(`🔍 purchase对象完整内容:`, purchaseItem);

        if (Array.isArray(purchaseItem.data)) {
          purchaseData = purchaseItem.data;
        } else if (Array.isArray(purchaseItem.items)) {
          purchaseData = purchaseItem.items;
        } else if (Array.isArray(purchaseItem.records)) {
          purchaseData = purchaseItem.records;
        } else {
          // 检查是否是以数字为键的对象（如 {0: {...}, 1: {...}, 2: {...}}）
          const numericKeys = Object.keys(purchaseItem).filter(key =>
            key !== 'id' && !isNaN(Number(key))
          );

          if (numericKeys.length > 0) {
            // 按数字键排序并提取数据
            purchaseData = recordsFromNumericKeys(purchaseItem, numericKeys);
            console.log(`🔍 从purchase对象中按数字键提取到 ${purchaseData.length} 条记录`);
          } else {
            // 如果purchaseItem本身就是数据数组
            purchaseData = [purchaseItem];
          }
        }
        console.log(`🔍 从purchase对象中提取到 ${purchaseData.length} 条记录`);
      } else {
        // 兼容旧格式：直接过滤数组中的purchase数据
        purchaseData = importData.filter((item: ImportRecord) =>
          item.documentType === 'purchase' ||
          item.type === 'purchase' ||
          (item.supplierName && !item.customerName && !item.documentType && !item.type)
        );
      }

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
      const invoiceItem = importData.find((item: ImportRecord) => item.id === 'invoice');
      let invoiceData: ImportRecord[] = [];

      if (invoiceItem) {
        // 如果找到ID为'invoice'的对象，提取其数据
        if (Array.isArray(invoiceItem.data)) {
          invoiceData = invoiceItem.data;
        } else if (Array.isArray(invoiceItem.items)) {
          invoiceData = invoiceItem.items;
        } else if (Array.isArray(invoiceItem.records)) {
          invoiceData = invoiceItem.records;
        } else {
          // 检查是否是以数字为键的对象（如 {0: {...}, 1: {...}, 2: {...}}）
          const numericKeys = Object.keys(invoiceItem).filter(key =>
            key !== 'id' && !isNaN(Number(key))
          );

          if (numericKeys.length > 0) {
            // 按数字键排序并提取数据
            invoiceData = recordsFromNumericKeys(invoiceItem, numericKeys);
            console.log(`🔍 从invoice对象中按数字键提取到 ${invoiceData.length} 条记录`);
          } else {
            // 如果invoiceItem本身就是数据数组
            invoiceData = [invoiceItem];
          }
        }
        console.log(`🔍 从invoice对象中提取到 ${invoiceData.length} 条记录`);
      } else {
        // 兼容旧格式：直接过滤数组中的invoice数据
        invoiceData = importData.filter((item: ImportRecord) =>
          item.documentType === 'invoice' ||
          item.type === 'invoice' ||
          (item.invoiceNo && !item.quotationNo && !item.orderNo && !item.documentType && !item.type)
        );
      }

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
      const packingItem = importData.find((item: ImportRecord) => item.id === 'packing');
      let packingData: ImportRecord[] = [];

      if (packingItem) {
        // 如果找到ID为'packing'的对象，提取其数据
        if (Array.isArray(packingItem.data)) {
          packingData = packingItem.data;
        } else if (Array.isArray(packingItem.items)) {
          packingData = packingItem.items;
        } else if (Array.isArray(packingItem.records)) {
          packingData = packingItem.records;
        } else {
          // 检查是否是以数字为键的对象（如 {0: {...}, 1: {...}, 2: {...}}）
          const numericKeys = Object.keys(packingItem).filter(key =>
            key !== 'id' && !isNaN(Number(key))
          );

          if (numericKeys.length > 0) {
            // 按数字键排序并提取数据
            packingData = recordsFromNumericKeys(packingItem, numericKeys);
            console.log(`🔍 从packing对象中按数字键提取到 ${packingData.length} 条记录`);
          } else {
            // 如果packingItem本身就是数据数组
            packingData = [packingItem];
          }
        }
        console.log(`🔍 从packing对象中提取到 ${packingData.length} 条记录`);
      } else {
        // 兼容旧格式：直接过滤数组中的packing数据
        packingData = importData.filter((item: ImportRecord) =>
          item.documentType === 'packing' ||
          item.type === 'packing' ||
          (item.consigneeName && !item.customerName && !item.supplierName && !item.documentType && !item.type)
        );
      }

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

    const quotationHistory = getQuotationHistory();
    const quotationData = quotationHistory.filter(item => item.type === 'quotation');
    const confirmationData = quotationHistory.filter(item => item.type === 'confirmation');
    const purchaseData = getPurchaseHistory() as HistoryItem[];
    const invoiceData = getInvoiceHistory() as HistoryItem[];
    const packingData = getPackingHistory() as HistoryItem[];

    console.log(`📊 全量导出数据统计:`);
    console.log(`  - 报价单: ${quotationData.length} 条`);
    console.log(`  - 订单确认: ${confirmationData.length} 条`);
    console.log(`  - 采购单: ${purchaseData.length} 条`);
    console.log(`  - 发票: ${invoiceData.length} 条`);
    console.log(`  - 装箱单: ${packingData.length} 条`);

    // 为采购单数据添加类型标识
    const purchaseDataWithType = purchaseData.map(item => ({
      ...item,
      type: 'purchase'
    }));

    // 为发票数据添加类型标识
    const invoiceDataWithType = invoiceData.map(item => ({
      ...item,
      type: 'invoice'
    }));

    // 为装箱单数据添加类型标识
    const packingDataWithType = packingData.map(item => ({
      ...item,
      type: 'packing'
    }));

    const allData: HistoryItem[] = [
      ...quotationData,
      ...confirmationData,
      ...purchaseDataWithType,
      ...invoiceDataWithType,
      ...packingDataWithType
    ];

    const quotationCount = quotationData.length;
    const confirmationCount = confirmationData.length;
    const purchaseCount = purchaseData.length;
    const invoiceCount = invoiceData.length;
    const packingCount = packingData.length;

    const exportStats = `全量导出: 报价单 ${quotationCount} 条, 订单确认 ${confirmationCount} 条, 采购单 ${purchaseCount} 条, 发票 ${invoiceCount} 条, 装箱单 ${packingCount} 条, 总计 ${allData.length} 条`;

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

// 执行导出函数（智能导出的别名，保持向后兼容）
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
