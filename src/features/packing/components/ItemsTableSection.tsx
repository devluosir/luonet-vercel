'use client';
import React, { useState, useEffect, useCallback } from 'react';
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
  }>(data.manualMergedCells || {
    packageQty: [],
    dimensions: []
  });

  // 当主数据中的合并相关数据发生变化时，同步更新本地状态
  useEffect(() => {
    if (data.packageQtyMergeMode !== packageQtyMergeMode) {
      setPackageQtyMergeMode(data.packageQtyMergeMode || 'auto');
    }
    if (data.dimensionsMergeMode !== dimensionsMergeMode) {
      setDimensionsMergeMode(data.dimensionsMergeMode || 'auto');
    }
    if (data.manualMergedCells && JSON.stringify(data.manualMergedCells) !== JSON.stringify(manualMergedCells)) {
      setManualMergedCells(data.manualMergedCells);
    }
  }, [data.packageQtyMergeMode, data.dimensionsMergeMode, data.manualMergedCells, packageQtyMergeMode, dimensionsMergeMode, manualMergedCells]);

  // 记忆化合并模式变更回调函数
  const handlePackageQtyMergeModeChange = useCallback((mode: 'auto' | 'manual') => {
    setPackageQtyMergeMode(mode);
    onDataChange({ ...data, packageQtyMergeMode: mode });
  }, [onDataChange, data]);

  const handleDimensionsMergeModeChange = useCallback((mode: 'auto' | 'manual') => {
    setDimensionsMergeMode(mode);
    onDataChange({ ...data, dimensionsMergeMode: mode });
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

  // 处理手动合并数据变更
  const handleManualMergeChange = (newManualMergedCells: typeof manualMergedCells) => {
    setManualMergedCells(newManualMergedCells);
    // 同时保存到主数据中，确保PDF生成时能获取到
    onDataChange({ 
      ...data, 
      manualMergedCells: newManualMergedCells,
      packageQtyMergeMode,
      dimensionsMergeMode
    });
  };

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
          manualMergedCells
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
        onManualMergedCellsChange={handleManualMergeChange}
        // 导入相关
        onImport={handleImport}
        onInsertImported={handleInsertImported}
      />
    </section>
  );
};
