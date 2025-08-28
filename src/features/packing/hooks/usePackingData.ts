import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { PackingData, PackingItem, OtherFee } from '../types';
import { createNewPackingItem, updateItemUnitDisplay, updateItemUnitPrice, createNewOtherFee } from '../utils/calculations';

// 初始数据
const getInitialData = (): PackingData => ({
  orderNo: '',
  invoiceNo: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  consignee: {
    name: ''
  },

  items: [{
    id: 1,
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
    unit: 'pc'
  }],
  otherFees: [],
  currency: 'USD',
  remarkOptions: {
    shipsSpares: false,
    customsPurpose: false
  },
  showHsCode: true,
  showDimensions: true,
  showWeightAndPackage: true,
  showPrice: true,
  dimensionUnit: 'cm',
  documentType: 'packing',
  templateConfig: {
    headerType: 'bilingual'
  },
  customUnits: [],
  isInGroupMode: false,
  // 合并单元格相关
  packageQtyMergeMode: 'auto',
  dimensionsMergeMode: 'auto',
  marksMergeMode: 'auto',
  manualMergedCells: {
    packageQty: [],
    dimensions: [],
    marks: []
  },
  autoMergedCells: {
    packageQty: [],
    dimensions: [],
    marks: []
  },
  // 🆕 保存时的列显示设置
  savedVisibleCols: null
});

interface CustomWindow extends Window {
  __PACKING_DATA__?: PackingData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

export const usePackingData = () => {
  const [data, setData] = useState<PackingData>(getInitialData);
  const [editId, setEditId] = useState<string | undefined>(undefined);

  // 记忆化 setEditId 函数
  const setEditIdMemo = useCallback((id: string | undefined) => {
    setEditId(id);
  }, []);

  // 检查并加载注入的数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const customWindow = window as unknown as CustomWindow;
      const injectedData = customWindow.__PACKING_DATA__;
      const injectedEditId = customWindow.__EDIT_ID__;
      const editMode = customWindow.__EDIT_MODE__;
      
      if (injectedData) {
        setData(injectedData);
        setEditId(injectedEditId);
        
        // 清除注入的数据
        delete customWindow.__PACKING_DATA__;
        delete customWindow.__EDIT_MODE__;
        delete customWindow.__EDIT_ID__;
      }
    }
  }, []);

  // 更新行项目
  const updateLineItem = useCallback((index: number, field: keyof PackingItem, value: string | number) => {
    setData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'unit') {
        // 处理单位变更
        const baseUnit = value.toString().replace(/s$/, '');
        const quantity = newItems[index].quantity;
        item.unit = baseUnit === 'pc' || baseUnit === 'set' || baseUnit === 'length'
          ? (quantity > 1 ? `${baseUnit}s` : baseUnit)
          : value.toString();
      } else if (field === 'quantity') {
        // 更新数量时，同时更新单位的单复数
        const updatedItem = updateItemUnitDisplay(item, typeof value === 'string' ? parseInt(value) || 0 : Math.floor(Number(value)));
        newItems[index] = updatedItem;
        return { ...prev, items: newItems };
      } else if (field === 'unitPrice') {
        // 更新单价时，重新计算总价
        const updatedItem = updateItemUnitPrice(item, typeof value === 'string' ? parseFloat(value) || 0 : value);
        newItems[index] = updatedItem;
        return { ...prev, items: newItems };
      } else if (field === 'netWeight' || field === 'grossWeight' || field === 'packageQty') {
        // 其他数值字段
        item[field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
      } else {
        // 字符串字段直接赋值
        (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  }, []);

  // 添加新行
  const handleAddLine = useCallback(() => {
    setData(prev => {
      const newItem = createNewPackingItem(prev.items.length, prev);
      return {
        ...prev,
        items: [...prev.items, newItem]
      };
    });
  }, []);

  // 删除行
  const handleDeleteLine = useCallback((index: number) => {
    setData(prev => {
      if (prev.items.length > 1) {
        return {
          ...prev,
          items: prev.items.filter((_, i) => i !== index)
        };
      }
      return prev;
    });
  }, []);

  // 进入分组模式
  const handleEnterGroupMode = useCallback(() => {
    const groupId = `group_${Date.now()}`;
    setData(prev => ({
      ...prev,
      isInGroupMode: true,
      currentGroupId: groupId
    }));
  }, []);

  // 退出分组模式
  const handleExitGroupMode = useCallback(() => {
    setData(prev => ({
      ...prev,
      isInGroupMode: false,
      currentGroupId: undefined
    }));
  }, []);

  // 设置面板回调函数
  const handleDocumentTypeChange = useCallback((type: 'proforma' | 'packing' | 'both') => {
    setData(prev => {
      const updates: Partial<PackingData> = { documentType: type };
      
      // 根据文档类型自动调整显示选项
      switch (type) {
        case 'proforma':
          updates.showPrice = true;
          updates.showWeightAndPackage = false;
          break;
        case 'packing':
          updates.showPrice = false;
          updates.showWeightAndPackage = true;
          break;
        case 'both':
          updates.showPrice = true;
          updates.showWeightAndPackage = true;
          break;
      }
      
      return { ...prev, ...updates };
    });
  }, []);

  // 处理 other fee 双击事件
  const handleOtherFeeDoubleClick = useCallback((index: number, field: 'description' | 'amount') => {
    setData(prev => {
      const newFees = [...(prev.otherFees || [])];
      newFees[index] = {
        ...newFees[index],
        highlight: {
          ...newFees[index].highlight,
          [field]: !newFees[index].highlight?.[field]
        }
      };
      return {
        ...prev,
        otherFees: newFees
      };
    });
  }, []);

  // 添加 other fee
  const handleAddOtherFee = useCallback(() => {
    setData(prev => ({
      ...prev,
      otherFees: [
        ...(prev.otherFees || []),
        createNewOtherFee()
      ]
    }));
  }, []);

  // 删除 other fee
  const handleDeleteOtherFee = useCallback((index: number) => {
    setData(prev => ({
      ...prev,
      otherFees: prev.otherFees?.filter((_, i) => i !== index)
    }));
  }, []);

  // 更新 other fee
  const handleOtherFeeChange = useCallback((index: number, field: keyof OtherFee, value: string | number) => {
    setData(prev => {
      const newFees = [...(prev.otherFees || [])];
      newFees[index] = {
        ...newFees[index],
        [field]: value
      };
      return {
        ...prev,
        otherFees: newFees
      };
    });
  }, []);

  return {
    data,
    setData,
    editId,
    setEditId: setEditIdMemo,
    updateLineItem,
    handleAddLine,
    handleDeleteLine,
    handleEnterGroupMode,
    handleExitGroupMode,
    handleDocumentTypeChange,
    handleOtherFeeDoubleClick,
    handleAddOtherFee,
    handleDeleteOtherFee,
    handleOtherFeeChange
  };
};
