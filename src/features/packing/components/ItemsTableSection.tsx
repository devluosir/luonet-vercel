'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ItemsTableEnhanced } from './ItemsTableEnhanced';
import { useTablePrefsHydrated } from '../state/useTablePrefs';
import { ItemsTableSectionProps } from '../types';

export const ItemsTableSection: React.FC<ItemsTableSectionProps & {
  editingUnitPriceIndex: number | null;
  editingUnitPrice: string;
  editingFeeIndex: number | null;
  editingFeeAmount: string;
  setEditingUnitPriceIndex: (index: number | null) => void;
  setEditingUnitPrice: (value: string) => void;
  setEditingFeeIndex: (index: number | null) => void;
  setEditingFeeAmount: (value: string) => void;
}> = ({ 
  data, 
  onDataChange, 
  totals,
  editingUnitPriceIndex,
  editingUnitPrice,
  editingFeeIndex,
  editingFeeAmount,
  setEditingUnitPriceIndex,
  setEditingUnitPrice,
  setEditingFeeIndex,
  setEditingFeeAmount
}) => {
  const { visibleCols, isHydrated } = useTablePrefsHydrated();

  // 合并模式状态管理 - 从主数据初始化
  const [packageQtyMergeMode, setPackageQtyMergeMode] = useState<'auto' | 'manual'>(data.packageQtyMergeMode || 'auto');
  const [dimensionsMergeMode, setDimensionsMergeMode] = useState<'auto' | 'manual'>(data.dimensionsMergeMode || 'auto');
  const [marksMergeMode, setMarksMergeMode] = useState<'auto' | 'manual'>(data.marksMergeMode || 'auto'); // 新增marks合并模式
  
  // 手动合并数据状态 - 从主数据初始化
  const [manualMergedCells, setManualMergedCells] = useState<{
    packageQty: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    dimensions: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    marks: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
  }>(data.manualMergedCells || {
    packageQty: [],
    dimensions: [],
    marks: []
  });

  // 当主数据中的合并相关数据发生变化时，同步更新本地状态
  useEffect(() => {
    if (data.packageQtyMergeMode !== packageQtyMergeMode) {
      setPackageQtyMergeMode(data.packageQtyMergeMode || 'auto');
    }
    if (data.dimensionsMergeMode !== dimensionsMergeMode) {
      setDimensionsMergeMode(data.dimensionsMergeMode || 'auto');
    }
    if (data.marksMergeMode !== marksMergeMode) {
      setMarksMergeMode(data.marksMergeMode || 'auto');
    }
    if (data.manualMergedCells && JSON.stringify(data.manualMergedCells) !== JSON.stringify(manualMergedCells)) {
      setManualMergedCells(data.manualMergedCells);
    }
  }, [data.packageQtyMergeMode, data.dimensionsMergeMode, data.marksMergeMode, data.manualMergedCells, packageQtyMergeMode, dimensionsMergeMode, marksMergeMode, manualMergedCells]);

  // 记忆化合并模式变更回调函数
  const handlePackageQtyMergeModeChange = useCallback((mode: 'auto' | 'manual') => {
    setPackageQtyMergeMode(mode);
    onDataChange({ ...data, packageQtyMergeMode: mode });
  }, [onDataChange, data]);

  const handleDimensionsMergeModeChange = useCallback((mode: 'auto' | 'manual') => {
    setDimensionsMergeMode(mode);
    onDataChange({ ...data, dimensionsMergeMode: mode });
  }, [onDataChange, data]);

  const handleMarksMergeModeChange = useCallback((mode: 'auto' | 'manual') => {
    setMarksMergeMode(mode);
    onDataChange({ ...data, marksMergeMode: mode });
  }, [onDataChange, data]);

  // 处理导入数据
  const handleImport = (newItems: any[]) => {
    const processed = newItems.map((item, index) => ({
      ...item,
      id: Date.now() + index,
      serialNo: (data.items.length + index + 1).toString(),
      totalPrice: item.quantity * item.unitPrice,
      unit: item.unit || 'pc', // 确保导入的数据有默认单位
    }));
    
    onDataChange({ ...data, items: [...data.items, ...processed] });
  };

  // 处理插入导入数据
  const handleInsertImported = (rows: any[], replaceMode = false) => {
    const mapped = rows.map((r, index) => ({
      id: Date.now() + index,
      serialNo: replaceMode ? (index + 1).toString() : (data.items.length + index + 1).toString(),
      description: r.description || '',
      hsCode: r.hsCode || '',
      quantity: Number(r.quantity) || 0,
      unit: r.unit || 'pc', // 确保有默认单位
      unitPrice: Number(r.unitPrice) || 0,
      totalPrice: (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      netWeight: Number(r.netWeight) || 0,
      grossWeight: Number(r.grossWeight) || 0,
      packageQty: Number(r.packageQty) || 0,
      dimensions: r.dimensions || '',
    }));
    
    const finalItems = replaceMode ? mapped : [...data.items, ...mapped];
    onDataChange({ ...data, items: finalItems });
  };

  // 计算自动合并数据
  const autoMergedCells = useMemo(() => {
    const calculateAutoMergedCells = (items: any[], column: 'packageQty' | 'dimensions' | 'marks') => {
      const mergedCells: any[] = [];
      if (!items || items.length === 0) return mergedCells;

      let currentStart = 0;
      let currentContent = column === 'packageQty' ? items[0]?.packageQty.toString() : 
                          column === 'dimensions' ? items[0]?.dimensions : 
                          items[0]?.marks || '';

      for (let i = 1; i <= items.length; i++) {
        const currentItem = items[i];
        const prevItem = items[i - 1];

        const prevContent = column === 'packageQty' ? prevItem?.packageQty.toString() : 
                           column === 'dimensions' ? prevItem?.dimensions : 
                           prevItem?.marks || '';
        const currentContentValue = currentItem
          ? column === 'packageQty' ? currentItem.packageQty.toString() : 
            column === 'dimensions' ? currentItem.dimensions : 
            currentItem.marks || ''
          : '';

        // 合并逻辑：相同内容合并，但排除0和空值
        const shouldEndMerge = !currentItem || 
          (currentContentValue !== prevContent) ||
          // 排除无意义的合并（所有列都排除空值）
          (prevContent === '0' || prevContent === '') ||
          (currentContentValue === '0' || currentContentValue === '') ||
          // 对于Dimensions列，排除纯数字的合并
          (column === 'dimensions' && /^\d+$/.test(prevContent)) ||
          (column === 'dimensions' && currentContentValue && /^\d+$/.test(currentContentValue));

        if (shouldEndMerge) {
          if (i - 1 > currentStart) {
            // 有合并的行
            mergedCells.push({ startRow: currentStart, endRow: i - 1, content: currentContent, isMerged: true });
          } else {
            // 单行，不合并
            mergedCells.push({ startRow: currentStart, endRow: currentStart, content: currentContent, isMerged: false });
          }
          
          if (currentItem) {
            currentStart = i;
            currentContent = currentContentValue;
          }
        }
      }
      return mergedCells;
    };

    return {
      packageQty: calculateAutoMergedCells(data.items, 'packageQty'),
      dimensions: calculateAutoMergedCells(data.items, 'dimensions'),
      marks: calculateAutoMergedCells(data.items, 'marks')
    };
  }, [data.items]);

  // 处理手动合并数据变更
  const handleManualMergeChange = (newManualMergedCells: typeof manualMergedCells) => {
    setManualMergedCells(newManualMergedCells);
    // 同时保存到主数据中，确保PDF生成时能获取到
    onDataChange({ 
      ...data, 
      manualMergedCells: newManualMergedCells,
      autoMergedCells, // 添加自动合并数据
      packageQtyMergeMode,
      dimensionsMergeMode,
      marksMergeMode
    });
  };

  // 当数据变更时，确保自动合并数据也被更新
  useEffect(() => {
    onDataChange({ 
      ...data, 
      autoMergedCells,
      manualMergedCells,
      packageQtyMergeMode,
      dimensionsMergeMode,
      marksMergeMode
    });
  }, [autoMergedCells, manualMergedCells, packageQtyMergeMode, dimensionsMergeMode, marksMergeMode, data.items]);

  return (
    <section>
      {/* 商品表格 */}
      <ItemsTableEnhanced
        data={{
          orderNo: data.orderNo,
          invoiceNo: data.invoiceNo,
          date: data.date,
          consignee: data.consignee,
          markingNo: data.markingNo,
          items: data.items,
          otherFees: data.otherFees,
          currency: data.currency,
          remarks: data.remarks,
          remarkOptions: data.remarkOptions,
          showHsCode: data.showHsCode,
          showDimensions: data.showDimensions,
          showWeightAndPackage: data.showWeightAndPackage,
          showPrice: data.showPrice,
          dimensionUnit: data.dimensionUnit,
          documentType: data.documentType,
          templateConfig: data.templateConfig,
          customUnits: data.customUnits,
          isInGroupMode: data.isInGroupMode,
          currentGroupId: data.currentGroupId,
          // 合并单元格相关
          packageQtyMergeMode,
          dimensionsMergeMode,
          marksMergeMode, // 新增marks合并模式
          manualMergedCells,
          autoMergedCells // 添加自动合并数据
        }}
        totals={totals}
        editingFeeIndex={editingFeeIndex}
        editingFeeAmount={editingFeeAmount}
        setEditingFeeIndex={setEditingFeeIndex}
        setEditingFeeAmount={setEditingFeeAmount}
        onItemChange={(index, field, value) => {
          const newItems = [...data.items];
          const item = { ...newItems[index], [field]: value };
          
          // 当quantity或unitPrice改变时，自动计算totalPrice
          if (field === 'quantity' || field === 'unitPrice') {
            const quantity = field === 'quantity' ? Number(value) : item.quantity;
            const unitPrice = field === 'unitPrice' ? Number(value) : item.unitPrice;
            item.totalPrice = quantity * unitPrice;
          }
          
          newItems[index] = item;
          onDataChange({ ...data, items: newItems });
        }}
        onAddLine={() => {
          const newItem = {
            id: Date.now(),
            serialNo: '',
            marks: '', // 新增marks字段默认值
            description: '',
            hsCode: '',
            quantity: 0,
            unitPrice: 0,
            totalPrice: 0,
            netWeight: 0,
            grossWeight: 0,
            packageQty: 0,
            dimensions: '',
            unit: 'pc', // 设置默认单位为 'pc'
            groupId: data.currentGroupId
          };
          onDataChange({ ...data, items: [...data.items, newItem] });
        }}
        onDeleteLine={(index) => {
          const newItems = data.items.filter((_, i) => i !== index);
          onDataChange({ ...data, items: newItems });
        }}
        onOtherFeeChange={(index, field, value) => {
          const newOtherFees = [...(data.otherFees || [])];
          newOtherFees[index] = { ...newOtherFees[index], [field]: value };
          onDataChange({ ...data, otherFees: newOtherFees });
        }}
        onOtherFeeDoubleClick={(index, field) => {
          if (field === 'amount') {
            setEditingFeeIndex(index);
            setEditingFeeAmount(String((data.otherFees || [])[index]?.amount || ''));
          }
        }}
        onDeleteOtherFee={(index) => {
          const newOtherFees = (data.otherFees || []).filter((_, i) => i !== index);
          onDataChange({ ...data, otherFees: newOtherFees });
        }}
        onEnterGroupMode={() => {
          onDataChange({ ...data, isInGroupMode: true, currentGroupId: `group_${Date.now()}` });
        }}
        onExitGroupMode={() => {
          onDataChange({ ...data, isInGroupMode: false, currentGroupId: undefined });
        }}
        onDataChange={onDataChange}
        // 合并单元格相关回调
        onPackageQtyMergeModeChange={handlePackageQtyMergeModeChange}
        onDimensionsMergeModeChange={handleDimensionsMergeModeChange}
        onMarksMergeModeChange={handleMarksMergeModeChange} // 新增marks合并模式回调
        onManualMergedCellsChange={handleManualMergeChange}
        // 导入相关
        onImport={handleImport}
        onInsertImported={handleInsertImported}
      />
    </section>
  );
};
