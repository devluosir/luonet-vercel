import type { QuotationData } from '@/types/quotation';
import type { PackingData } from '@/types/packing-history';
import type { PackingItem } from '@/features/packing/types';

/**
 * 将订单确认数据转换为装箱单数据，保留合并的名称和描述列信息
 * @param confirmationData - 订单确认数据
 * @returns 转换后的装箱单数据
 */
export function convertConfirmationToPacking(confirmationData: QuotationData): PackingData {
  // 处理合并的描述列
  const mergedDescriptions = new Map<number, string>();
  if (confirmationData.mergedDescriptions) {
    for (const merge of confirmationData.mergedDescriptions) {
      for (let i = merge.startRow; i <= merge.endRow; i++) {
        mergedDescriptions.set(i, merge.content);
      }
    }
  }

  // 转换商品项
  const packingItems: PackingItem[] = confirmationData.items.map((item, index) => {
    // 获取合并的描述内容（如果有）
    const mergedDescription = mergedDescriptions.get(index);

    return {
      id: item.id || Date.now() + index,
      serialNo: (index + 1).toString(),
      // marks 列保持为空，因为 partName 将合并到 description
      marks: '',
      // 将 Part Name 和 Description 合并到 description 列
      description: [
        // Part Name 部分
        item.partName || '',
        // Description 部分（优先使用合并的描述）
        mergedDescription || item.description || ''
      ].filter(Boolean).join('\n'),
      hsCode: '', // 订单确认中通常没有海关编码
      quantity: item.quantity || 0,
      unit: item.unit || 'pc',
      unitPrice: item.unitPrice || 0,
      totalPrice: item.amount || 0,
      netWeight: 0, // 默认值，需要用户后续填写
      grossWeight: 0,
      packageQty: 0,
      dimensions: '',
      highlight: {
        marks: item.highlight?.partName,
        description: item.highlight?.description || (mergedDescription ? true : false),
        quantity: item.highlight?.quantity,
        unit: item.highlight?.unit,
        unitPrice: item.highlight?.unitPrice,
        totalPrice: item.highlight?.amount,
      }
    };
  });

  // 构建装箱单数据
  const packingData: PackingData = {
    // 使用合同号作为订单号
    orderNo: confirmationData.contractNo || confirmationData.quotationNo || '',
    // 发票号需要用户填写
    invoiceNo: '',
    date: confirmationData.date || new Date().toISOString().split('T')[0],
    consignee: {
      name: confirmationData.to || ''
    },
    items: packingItems,
    currency: confirmationData.currency || 'USD',
    remarkOptions: {
      shipsSpares: false,
      customsPurpose: false
    },
    showHsCode: false,
    showDimensions: false,
    showWeightAndPackage: true,
    showPrice: true,
    dimensionUnit: 'cm',
    documentType: 'both', // 默认同时生成形式发票和装箱单
    templateConfig: {
      headerType: confirmationData.templateConfig?.headerType || 'bilingual'
    },
    customUnits: confirmationData.customUnits || [],
    // 分组模式默认关闭
    isInGroupMode: false,
    // 合并模式默认为自动
    packageQtyMergeMode: 'auto',
    dimensionsMergeMode: 'auto',
    marksMergeMode: 'auto',
    // 初始化合并单元格数据
    manualMergedCells: {
      packageQty: [],
      dimensions: [],
      marks: []
    },
    autoMergedCells: {
      packageQty: [],
      dimensions: [],
      marks: confirmationData.mergedDescriptions?.map(merge => ({
        startRow: merge.startRow,
        endRow: merge.endRow,
        content: merge.content,
        isMerged: true
      })) || []
    },
    // 🔑 保留订单确认的列显示设置
    savedVisibleCols: confirmationData.savedVisibleCols || null,
    // 添加其他必需的字段
    otherFees: [],
    isGroupMode: false,
    currentGroupId: undefined,
    packageQtyMergeMode: 'auto',
    dimensionsMergeMode: 'auto',
    marksMergeMode: 'auto'
  };

  return packingData;
}

/**
 * 检查是否包含合并的单元格信息
 * @param confirmationData - 订单确认数据
 * @returns 是否包含合并信息
 */
export function hasMergedCells(confirmationData: QuotationData): boolean {
  return (
    (confirmationData.mergedRemarks && confirmationData.mergedRemarks.length > 0) ||
    (confirmationData.mergedDescriptions && confirmationData.mergedDescriptions.length > 0)
  );
}

/**
 * 获取合并单元格的提示信息
 * @param confirmationData - 订单确认数据
 * @returns 提示信息
 */
export function getMergedCellsInfo(confirmationData: QuotationData): string {
  const info: string[] = [];
  
  if (confirmationData.mergedDescriptions && confirmationData.mergedDescriptions.length > 0) {
    info.push(`${confirmationData.mergedDescriptions.length}个合并的描述列`);
  }
  
  if (confirmationData.mergedRemarks && confirmationData.mergedRemarks.length > 0) {
    info.push(`${confirmationData.mergedRemarks.length}个合并的备注列`);
  }
  
  return info.join('，');
}

