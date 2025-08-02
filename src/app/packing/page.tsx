'use client';

import { useState, useEffect, useCallback } from 'react';
import '../pdf-fonts.css';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Clipboard, History, Save, Eye, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
import { Footer } from '@/components/Footer';
import { generatePackingListPDF } from '@/utils/packingPdfGenerator';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { ItemsTable } from '@/components/packinglist/ItemsTable';
import { SettingsPanel } from '@/components/packinglist/SettingsPanel';
import { ShippingMarksModal } from '@/components/packinglist/ShippingMarksModal';
import { ConsigneeSection } from '@/components/packinglist/ConsigneeSection';
import { savePackingHistory, getPackingHistoryById } from '@/utils/packingHistory';
import dynamic from 'next/dynamic';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

// 基础样式定义
const inputClassName = `w-full px-4 py-2.5 rounded-2xl
  bg-white/95 dark:bg-[#1c1c1e]/95
  border border-[#007AFF]/10 dark:border-[#0A84FF]/10
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  text-[15px] leading-relaxed text-gray-800 dark:text-gray-100
  transition-all duration-300 ease-out
  hover:border-[#007AFF]/20 dark:hover:border-[#0A84FF]/20
  shadow-sm hover:shadow-md`;

// iOS光标优化样式
const iosCaretStyle = {
  caretColor: '#007AFF',
  WebkitCaretColor: '#007AFF',
  WebkitTextFillColor: 'initial',
  WebkitOpacity: 1,
  opacity: 1
} as React.CSSProperties;



// 标题样式
const titleClassName = `text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]`;

// 按钮基础样式
const buttonClassName = `px-4 py-2 rounded-xl text-sm font-medium 
  transition-all duration-300`;

interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
  groupId?: string;
}

interface OtherFee {
  id: number;
  description: string;
  amount: number;
  highlight?: {
    description?: boolean;
    amount?: boolean;
  };
}

interface PackingData {
  orderNo: string;
  invoiceNo: string;
  date: string;
  
  // 收货人信息
  consignee: {
    name: string;
  };
  
  // 唛头信息
  markingNo: string;
  
  items: PackingItem[];
  otherFees?: OtherFee[];
  currency: string;
  remarks: string;
  remarkOptions: {
    shipsSpares: boolean;
    customsPurpose: boolean;
  };
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  documentType: 'proforma' | 'packing' | 'both';
  templateConfig: {
    headerType: 'none' | 'bilingual' | 'english';
  };
  customUnits?: string[];
  isInGroupMode: boolean;
  currentGroupId?: string;
}

interface CustomWindow extends Window {
  __PACKING_DATA__?: PackingData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

// 将Excel数据转换为PackingItem数据
const convertExcelToPackingItems = (rows: string[][]): PackingItem[] => {
  const items: PackingItem[] = [];
  const defaultUnits = ['pc', 'set', 'length'];
  
  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit)) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit;
  };
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    // 跳过空行
    if (row.length === 0 || row.every(cell => !cell.trim())) {
      continue;
    }

    let description = '';
    let hsCode = '';
    let quantity = 0;
    let unit = 'pc';
    let unitPrice = 0;
    let netWeight = 0;
    let grossWeight = 0;
    let packageQty = 0;
    let dimensions = '';

    // 根据列数处理不同格式的数据
    if (row.length >= 8) {
      // 完整格式：描述 HS代码 数量 单位 单价 净重 毛重 包装数量 [尺寸]
      description = row[0]?.trim() || '';
      hsCode = row[1]?.trim() || '';
      quantity = parseInt(row[2]) || 0;
      unit = row[3]?.trim() || 'pc';
      unitPrice = parseFloat(row[4]) || 0;
      netWeight = parseFloat(row[5]) || 0;
      grossWeight = parseFloat(row[6]) || 0;
      packageQty = parseInt(row[7]) || 0;
      dimensions = row[8]?.trim() || '';
    } else if (row.length >= 5) {
      // 基本格式：描述 数量 单位 净重 毛重 [包装数量]
      description = row[0]?.trim() || '';
      quantity = parseInt(row[1]) || 0;
      unit = row[2]?.trim() || 'pc';
      netWeight = parseFloat(row[3]) || 0;
      grossWeight = parseFloat(row[4]) || 0;
      packageQty = parseInt(row[5]) || 0;
    } else if (row.length >= 3) {
      // 最简格式：描述 数量 单位
      description = row[0]?.trim() || '';
      quantity = parseInt(row[1]) || 0;
      unit = row[2]?.trim() || 'pc';
    } else if (row.length === 2) {
      // 两列：描述 数量
      description = row[0]?.trim() || '';
      quantity = parseInt(row[1]) || 0;
    } else {
      // 单列：只有描述
      description = row[0]?.trim() || '';
    }

    // 处理单位格式
    const normalizedUnit = unit.toLowerCase();
    const singularUnit = normalizedUnit.endsWith('s') ? normalizedUnit.slice(0, -1) : normalizedUnit;
    
    if (normalizedUnit === 'pcs') {
      unit = 'pc';
    } else if (defaultUnits.includes(singularUnit)) {
      unit = singularUnit;
    }

    // 使用适当的单复数形式
    unit = getUnitDisplay(unit, quantity);

    items.push({
      id: items.length + 1,
      serialNo: (items.length + 1).toString(),
      description,
      hsCode,
      quantity: Math.floor(quantity), // 确保数量是整数
      unitPrice,
      totalPrice: Math.floor(quantity) * unitPrice,
      netWeight,
      grossWeight,
      packageQty: Math.floor(packageQty), // 确保包装数量是整数
      dimensions,
      unit
    });
  }

  return items;
};

export default function PackingPage() {
  const router = useRouter();
  const pathname = usePathname();

  // 从 window 全局变量获取初始数据
  const initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__PACKING_DATA__) : null;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;

  const [data, setData] = useState<PackingData>(initialData || {
    orderNo: '',
    invoiceNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    consignee: {
      name: ''
    },
    markingNo: '',
    items: [{
      id: 1,
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
      unit: 'pc'
    }],
    otherFees: [],
    currency: 'USD',
    remarks: '',
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
    isInGroupMode: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [editId, setEditId] = useState<string | undefined>(initialEditId || undefined);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [showShippingMarks, setShowShippingMarks] = useState(false);
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');

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

  // 从 URL 获取编辑 ID
  useEffect(() => {
    if (pathname?.startsWith('/packing/edit/')) {
      const id = pathname.split('/').pop();
      setEditId(id);
    }
  }, [pathname]);

  // 计算总价
  const calculateTotalPrice = useCallback((quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  }, []);

  // 默认单位列表（需要单复数变化的单位）
  const defaultUnits = ['pc', 'set', 'length'] as const;

  // 处理单位的单复数
  const getUnitDisplay = (baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit as typeof defaultUnits[number])) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit; // 自定义单位不变化单复数
  };

  // 更新行项目
  const updateLineItem = (index: number, field: keyof PackingItem, value: string | number) => {
    setData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'unit') {
        // 处理单位变更，根据当前数量决定是否需要复数形式
        const baseUnit = value.toString().replace(/s$/, '');
        const quantity = newItems[index].quantity;
        item.unit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
          ? getUnitDisplay(baseUnit, quantity) 
          : value.toString();
      } else if (field === 'quantity') {
        // 更新数量时，同时更新单位的单复数（确保只接受整数）
        const quantity = typeof value === 'string' ? parseInt(value) || 0 : Math.floor(Number(value));
        const baseUnit = newItems[index].unit.replace(/s$/, '');
        item.quantity = quantity;
        item.unit = defaultUnits.includes(baseUnit as typeof defaultUnits[number]) 
          ? getUnitDisplay(baseUnit, quantity) 
          : newItems[index].unit;
        
        // 如果是数量变化，重新计算总价
        item.totalPrice = calculateTotalPrice(quantity, newItems[index].unitPrice);
      } else if (field === 'unitPrice' || field === 'netWeight' || field === 'grossWeight' || field === 'packageQty') {
        // 其他数值字段需要转换为数字
        item[field] = typeof value === 'string' ? parseFloat(value) || 0 : value;
        
        // 如果是单价变化，重新计算总价
        if (field === 'unitPrice') {
          item.totalPrice = calculateTotalPrice(
            newItems[index].quantity,
            item.unitPrice
          );
        }
      } else {
        // 字符串字段直接赋值
        (item as any)[field] = value;
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  // 添加新行
  const handleAddLine = () => {
    setData(prev => {
      const newItem: PackingItem = {
        id: prev.items.length + 1,
        serialNo: (prev.items.length + 1).toString(),
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
      };

      // 如果在分组模式中，为新行分配组ID
      if (prev.isInGroupMode && prev.currentGroupId) {
        newItem.groupId = prev.currentGroupId;
      }

      return {
        ...prev,
        items: [...prev.items, newItem]
      };
    });
  };

  // 删除行
  const handleDeleteLine = (index: number) => {
    if (data.items.length > 1) {
      setData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  // 进入分组模式
  const handleEnterGroupMode = () => {
    const groupId = `group_${Date.now()}`;
    setData(prev => ({
      ...prev,
      isInGroupMode: true,
      currentGroupId: groupId
    }));
  };

  // 退出分组模式
  const handleExitGroupMode = () => {
    setData(prev => ({
      ...prev,
      isInGroupMode: false,
      currentGroupId: undefined
    }));
  };

  // 设置面板回调函数
  const handleDocumentTypeChange = (type: 'proforma' | 'packing' | 'both') => {
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
  };

  // 生成PDF
  const handleGenerate = useCallback(async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsGenerating(true);
    try {
      // 获取编辑 ID（从 URL 或 state）
      const existingId = editId || (pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : undefined);
      // 保存记录
      const saveResult = await savePackingHistory(data, existingId);
      if (saveResult && !editId) {
        setEditId(saveResult.id);
      }
      // 生成PDF，直接用页面端的分组统计逻辑
      const calculateTotals = () => {
        let totalPrice = 0;
        let netWeight = 0;
        let grossWeight = 0;
        let packageQty = 0;
        const processedGroups = new Set<string>();
        data.items.forEach((item) => {
          totalPrice += item.totalPrice;
          const isInGroup = !!item.groupId;
          const groupItems = isInGroup ? data.items.filter(i => i.groupId === item.groupId) : [];
          const isFirstInGroup = isInGroup && groupItems[0]?.id === item.id;
          if (isInGroup) {
            if (isFirstInGroup) {
              netWeight += item.netWeight;
              grossWeight += item.grossWeight;
              packageQty += item.packageQty;
              processedGroups.add(item.groupId!);
            }
          } else {
            netWeight += item.netWeight;
            grossWeight += item.grossWeight;
            packageQty += item.packageQty;
          }
        });
        
        // 添加 other fees 到总计
        if (data.showPrice && data.otherFees) {
          const feesTotal = data.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
          totalPrice += feesTotal;
        }
        
        return { totalPrice, netWeight, grossWeight, packageQty };
      };
      const totals = calculateTotals();
      console.log('导出PDF时的totals:', totals);
      
      // 记录客户信息使用情况
      if (data.consignee.name && data.invoiceNo) {
        const customerName = data.consignee.name.split('\n')[0].trim();
        console.log('装箱单记录客户使用情况:', {
          customerName,
          documentType: 'packing',
          documentNo: data.invoiceNo,
          fullConsigneeName: data.consignee.name
        });
        recordCustomerUsage(customerName, 'packing', data.invoiceNo);
      }
      
      await generatePackingListPDF(data, false, totals);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate packing list. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [data, editId, pathname]);

  // 预览功能
  const handlePreview = useCallback(async () => {
    try {
      // 计算总计
      const calculatedTotals = data.items.reduce((acc, item) => ({
        totalPrice: acc.totalPrice + item.totalPrice,
        netWeight: acc.netWeight + item.netWeight,
        grossWeight: acc.grossWeight + item.grossWeight,
        packageQty: acc.packageQty + item.packageQty
      }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

      // 计算总金额（包括其他费用）
      const otherFeesTotal = data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
      const previewTotalAmount = calculatedTotals.totalPrice + otherFeesTotal;

      // 准备预览数据，包装成历史记录格式
      const previewData = {
        id: editId || 'preview',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        consigneeName: data.consignee.name || 'Unknown',
        invoiceNo: data.invoiceNo || 'N/A',
        orderNo: data.orderNo || 'N/A',
        totalAmount: previewTotalAmount,
        currency: data.currency,
        documentType: data.documentType,
        data: data
      };
      
      setPreviewItem(previewData);
      setShowPreview(true);
    } catch (error) {
      console.error('Preview failed:', error);
      alert('Failed to generate preview. Please try again.');
    }
  }, [data, editId]);

  // 保存
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      // 使用 URL 中的 ID 或现有的 editId
      const id = pathname?.startsWith('/packing/edit/') ? pathname.split('/').pop() : editId;
      
      const result = await savePackingHistory(data, id);
      if (result) {
        setSaveMessage('Saved successfully');
        // 更新 editId，确保后续的保存操作会更新同一条记录
        if (!editId) {
          setEditId(result.id);
        }
      } else {
        setSaveMessage('Save failed');
      }
    } catch (error) {
      console.error('Error saving:', error);
      setSaveMessage('Save failed');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [data, editId, pathname]);

  // 处理 other fee 双击事件
  const handleOtherFeeDoubleClick = (index: number, field: 'description' | 'amount') => {
    const newFees = [...(data.otherFees || [])];
    newFees[index] = {
      ...newFees[index],
      highlight: {
        ...newFees[index].highlight,
        [field]: !newFees[index].highlight?.[field]
      }
    };
    setData(prev => ({
      ...prev,
      otherFees: newFees
    }));
  };

  // 添加 other fee
  const handleAddOtherFee = () => {
    setData(prev => ({
      ...prev,
      otherFees: [
        ...(prev.otherFees || []),
        {
          id: Date.now(),
          description: '',
          amount: 0
        }
      ]
    }));
  };

  // 删除 other fee
  const handleDeleteOtherFee = (index: number) => {
    setData(prev => ({
      ...prev,
      otherFees: prev.otherFees?.filter((_, i) => i !== index)
    }));
  };

  // 更新 other fee
  const handleOtherFeeChange = (index: number, field: keyof OtherFee, value: string | number) => {
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
  };

  // 计算总计
  const totals = data.items.reduce((acc, item) => ({
    totalPrice: acc.totalPrice + item.totalPrice,
    netWeight: acc.netWeight + item.netWeight,
    grossWeight: acc.grossWeight + item.grossWeight,
    packageQty: acc.packageQty + item.packageQty
  }), { totalPrice: 0, netWeight: 0, grossWeight: 0, packageQty: 0 });

  // 计算总金额（包括其他费用）
  const otherFeesTotal = data.otherFees?.reduce((sum, fee) => sum + fee.amount, 0) || 0;
  const totalAmount = totals.totalPrice + otherFeesTotal;

  // 导出Excel功能
  const handleExportExcel = () => {
    try {
      // 格式化数值函数
      const formatNumber = (value: number): string => {
        if (value === 0) return '0';
        if (!value || isNaN(value)) return '';
        // 保留2位小数，避免浮点数精度问题
        return Number(value.toFixed(2)).toString();
      };
      
      // 准备Excel数据
      const excelData = [];
      
      // 添加标题行
      const headers = ['No.', 'Description', 'HS Code', 'Quantity', 'Unit', 'Unit Price', 'Total Price', 'Net Weight', 'Gross Weight', 'Package Qty', 'Dimensions'];
      excelData.push(headers);
      
      // 添加商品数据
      data.items.forEach((item, index) => {
        const row = [
          item.serialNo,
          item.description,
          item.hsCode,
          item.quantity,
          item.unit,
          formatNumber(item.unitPrice),
          formatNumber(item.totalPrice),
          formatNumber(item.netWeight),
          formatNumber(item.grossWeight),
          item.packageQty,
          item.dimensions
        ];
        excelData.push(row);
      });
      
      // 添加其他费用（如果显示价格）
      if (data.showPrice && data.otherFees && data.otherFees.length > 0) {
        excelData.push([]); // 空行
        excelData.push(['Other Fees']); // 标题
        data.otherFees.forEach(fee => {
          excelData.push([fee.description, '', '', '', '', '', formatNumber(fee.amount)]);
        });
      }
      
      // 转换为CSV格式
      const csvContent = excelData.map(row => 
        row.map(cell => `"${cell || ''}"`).join(',')
      ).join('\n');
      
      // 创建并下载文件
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `packing_list_${data.invoiceNo || 'export'}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={pathname?.includes('/edit/') || pathname?.includes('/copy/') ? '/history' : '/dashboard'} 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg mt-6">
            <form>
              {/* 标题和设置按钮 */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex items-center gap-4">
                  <h1 className={titleClassName}>
                    Generate {
                      data.documentType === 'proforma' ? 'Proforma Invoice' :
                      data.documentType === 'packing' ? 'Packing List' :
                      'Proforma Invoice & Packing List'
                    }
                  </h1>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href="/history?tab=packing"
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="导出为Excel"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                    title={editId ? '保存修改' : '保存新记录'}
                  >
                    {isSaving ? (
                      <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-[#98989D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                    )}
                    {saveMessage && (
                      <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white rounded-lg whitespace-nowrap ${
                        saveMessage.includes('成功') ? 'bg-green-500' : 'bg-red-500'
                      }`}>
                        {saveMessage}
                      </div>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
              </div>

              {/* 设置面板 */}
              <SettingsPanel
                isVisible={showSettings}
                documentType={data.documentType}
                showHsCode={data.showHsCode}
                showDimensions={data.showDimensions}
                showWeightAndPackage={data.showWeightAndPackage}
                showPrice={data.showPrice}
                dimensionUnit={data.dimensionUnit}
                currency={data.currency}
                headerType={data.templateConfig.headerType}
                customUnits={data.customUnits}
                onDocumentTypeChange={handleDocumentTypeChange}
                onToggleHsCode={(show) => setData(prev => ({ ...prev, showHsCode: show }))}
                onToggleDimensions={(show) => setData(prev => ({ ...prev, showDimensions: show }))}
                onToggleWeightAndPackage={(show) => setData(prev => ({ ...prev, showWeightAndPackage: show }))}
                onTogglePrice={(show) => setData(prev => ({ 
                  ...prev, 
                  showPrice: show,
                  // 如果关闭价格显示，清除所有 other fees
                  otherFees: show ? prev.otherFees : []
                }))}
                onDimensionUnitChange={(unit) => setData(prev => ({ ...prev, dimensionUnit: unit }))}
                onCurrencyChange={(currency) => setData(prev => ({ ...prev, currency }))}
                onHeaderTypeChange={(headerType) => setData(prev => ({ 
                  ...prev, 
                  templateConfig: { ...prev.templateConfig, headerType } 
                }))}
                onCustomUnitsChange={(units) => setData(prev => ({ ...prev, customUnits: units }))}
              />

              {/* 基本信息区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 收货人信息组 */}
                  <ConsigneeSection
                    consigneeName={data.consignee.name}
                    orderNo={data.orderNo}
                    onChange={({ consigneeName, orderNo }) => setData(prev => ({
                      ...prev,
                      consignee: { ...prev.consignee, name: consigneeName },
                      orderNo
                    }))}
                  />

                  {/* 单据信息组 */}
                  <div className="bg-gray-50 dark:bg-[#1C1C1E] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                          Invoice No.
                        </label>
                        <input
                          type="text"
                          value={data.invoiceNo}
                          onChange={(e) => setData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                          className={inputClassName}
                          style={iosCaretStyle}
                          placeholder="Invoice No. *"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={data.date}
                          onChange={(e) => setData(prev => ({ ...prev, date: e.target.value }))}
                          className={inputClassName}
                          style={iosCaretStyle}
                        />
                      </div>
                      
                      {/* Shipping Marks */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D]">
                            Shipping Marks
                          </label>
                          {data.markingNo && (
                            <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                              Configured
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowShippingMarks(true)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-[#3A3A3C] hover:bg-gray-200 dark:hover:bg-[#48484A] hover:text-gray-700 dark:hover:text-gray-300 rounded-lg transition-all duration-200"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          {data.markingNo ? 'Edit Marks' : 'Add Marks'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 商品表格区域 */}
              <div className="px-0 sm:px-6 py-4">
                <ItemsTable
                  data={{
                    items: data.items,
                    otherFees: data.otherFees,
                    showHsCode: data.showHsCode,
                    showDimensions: data.showDimensions,
                    showWeightAndPackage: data.showWeightAndPackage,
                    showPrice: data.showPrice,
                    dimensionUnit: data.dimensionUnit,
                    currency: data.currency,
                    customUnits: data.customUnits,
                    isInGroupMode: data.isInGroupMode,
                    currentGroupId: data.currentGroupId
                  }}
                  onItemChange={updateLineItem}
                  onAddLine={handleAddLine}
                  onDeleteLine={handleDeleteLine}
                  onOtherFeeChange={handleOtherFeeChange}
                  onOtherFeeDoubleClick={handleOtherFeeDoubleClick}
                  onDeleteOtherFee={handleDeleteOtherFee}
                  editingFeeIndex={editingFeeIndex}
                  editingFeeAmount={editingFeeAmount}
                  setEditingFeeIndex={setEditingFeeIndex}
                  setEditingFeeAmount={setEditingFeeAmount}
                  totals={totals}
                  onEnterGroupMode={handleEnterGroupMode}
                  onExitGroupMode={handleExitGroupMode}
                />
              </div>

              {/* 添加行按钮 - 大屏显示 */}
              <div className="hidden sm:block px-4 sm:px-6 py-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  {/* 分组按钮 */}
                  <button
                    type="button"
                    onClick={data.isInGroupMode ? handleExitGroupMode : handleEnterGroupMode}
                    className={`px-2 sm:px-3 h-7 rounded-lg whitespace-nowrap text-[13px] font-medium
                      flex items-center gap-1 transition-all duration-200 ${
                        data.isInGroupMode 
                          ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
                          : 'bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08] hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12] text-[#007AFF] dark:text-[#0A84FF]'
                      }`}
                  >
                    <span className="text-lg leading-none translate-y-[-1px]">+</span>
                    <span>{data.isInGroupMode ? 'Exit Group' : 'Add Group'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="px-2 sm:px-3 h-7 rounded-lg whitespace-nowrap
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      text-[#007AFF] dark:text-[#0A84FF]
                      text-[13px] font-medium
                      flex items-center gap-1
                      transition-all duration-200"
                  >
                    <span className="text-lg leading-none translate-y-[-1px]">+</span>
                    <span>Add Line</span>
                  </button>

                  {data.showPrice && (
                    <button
                      type="button"
                      onClick={handleAddOtherFee}
                      className="px-2 sm:px-3 h-7 rounded-lg whitespace-nowrap
                        bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                        hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                        text-[#007AFF] dark:text-[#0A84FF]
                        text-[13px] font-medium
                        flex items-center gap-1
                        transition-all duration-200"
                    >
                      <span className="text-lg leading-none translate-y-[-1px]">+</span>
                      <span>Add Other Fee</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 添加行按钮 - 小屏显示 */}
              <div className="block sm:hidden px-4 py-3">
                <div className="bg-[#F5F5F7]/50 dark:bg-[#2C2C2E]/50 rounded-xl p-2.5">
                  <div className="grid grid-cols-3 gap-2">
                    {/* 分组按钮 */}
                    <button
                      type="button"
                      onClick={data.isInGroupMode ? handleExitGroupMode : handleEnterGroupMode}
                      className={`px-2 h-8 rounded-lg whitespace-nowrap text-[13px] font-medium
                        flex items-center justify-center gap-1 transition-all duration-200 ${
                          data.isInGroupMode 
                            ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
                            : 'bg-white/80 dark:bg-[#1C1C1E]/80 hover:bg-white dark:hover:bg-[#1C1C1E] text-[#007AFF] dark:text-[#0A84FF]'
                        }`}
                    >
                      <span className="text-lg leading-none translate-y-[-1px]">+</span>
                      <span>{data.isInGroupMode ? 'Exit' : 'Group'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="px-2 h-8 rounded-lg whitespace-nowrap
                        bg-white/80 dark:bg-[#1C1C1E]/80
                        hover:bg-white dark:hover:bg-[#1C1C1E]
                        text-[#007AFF] dark:text-[#0A84FF]
                        text-[13px] font-medium
                        flex items-center justify-center gap-1
                        transition-all duration-200"
                    >
                      <span className="text-lg leading-none translate-y-[-1px]">+</span>
                      <span>Add Line</span>
                    </button>

                    {data.showPrice && (
                      <button
                        type="button"
                        onClick={handleAddOtherFee}
                        className="px-2 h-8 rounded-lg whitespace-nowrap
                          bg-white/80 dark:bg-[#1C1C1E]/80
                          hover:bg-white dark:hover:bg-[#1C1C1E]
                          text-[#007AFF] dark:text-[#0A84FF]
                          text-[13px] font-medium
                          flex items-center justify-center gap-1
                          transition-all duration-200"
                      >
                        <span className="text-lg leading-none translate-y-[-1px]">+</span>
                        <span>Add Other Fee</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* 备注区域 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="bg-gray-50 dark:bg-[#1C1C1E] rounded-xl p-4 sm:p-6 space-y-4">
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Remarks:</h3>
                    
                    {/* 固定选项 */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.remarkOptions.shipsSpares}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            remarkOptions: {
                              ...prev.remarkOptions,
                              shipsSpares: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
                            checked:bg-[#007AFF] checked:border-[#007AFF] checked:dark:bg-[#0A84FF] checked:dark:border-[#0A84FF]
                            focus:ring-2 focus:ring-[#007AFF]/30 focus:ring-offset-1
                            relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                            before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                            checked:before:scale-100 before:transition-transform before:duration-200"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                          SHIP&apos;S SPARES IN TRANSIT
                        </span>
                      </label>
                      
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={data.remarkOptions.customsPurpose}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            remarkOptions: {
                              ...prev.remarkOptions,
                              customsPurpose: e.target.checked
                            }
                          }))}
                          className="w-4 h-4 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
                            checked:bg-[#007AFF] checked:border-[#007AFF] checked:dark:bg-[#0A84FF] checked:dark:border-[#0A84FF]
                            focus:ring-2 focus:ring-[#007AFF]/30 focus:ring-offset-1
                            relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                            before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                            checked:before:scale-100 before:transition-transform before:duration-200"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">
                          FOR CUSTOMS PURPOSE ONLY
                        </span>
                      </label>
                    </div>
                    
                    {/* 自定义备注文本框 */}
                    <div>
                      <textarea
                        value={data.remarks}
                        onChange={(e) => setData(prev => ({ ...prev, remarks: e.target.value }))}
                        className={`${inputClassName} min-h-[80px] resize-none`}
                        style={iosCaretStyle}
                        placeholder="Enter any additional remarks or special instructions..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 生成按钮和预览按钮 */}
              <div className="px-4 sm:px-6 py-4 sm:py-6 border-t border-gray-100 dark:border-[#3A3A3C] bg-gray-50 dark:bg-[#1C1C1E] rounded-b-2xl sm:rounded-b-3xl">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`${buttonClassName}
                      bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0]
                      text-white font-medium
                      shadow-lg shadow-[#007AFF]/25 dark:shadow-[#0A84FF]/25
                      hover:shadow-xl hover:shadow-[#007AFF]/30 dark:hover:shadow-[#0A84FF]/30
                      active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC]
                      transform transition-all duration-200 ease-out
                      flex-1 sm:flex-none sm:min-w-[180px] h-12
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${isGenerating ? 'scale-[0.98] shadow-inner bg-[#0052CC] dark:bg-[#0063CC]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Generating...</span>
                        </>
                                              ) : (pathname?.startsWith('/packing/edit/') || editId) ? (
                          <>
                            <Download className="w-5 h-5" />
                            <span>Save Changes & Generate</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-5 h-5" />
                            <span>Generate PDF</span>
                          </>
                        )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={false} // Removed isLoading state
                    className={`${buttonClassName}
                      bg-white dark:bg-[#2C2C2E]
                      text-[#007AFF] dark:text-[#0A84FF] font-medium
                      border-2 border-[#007AFF]/20 dark:border-[#0A84FF]/20
                      hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
                      hover:border-[#007AFF]/40 dark:hover:border-[#0A84FF]/40
                      active:bg-[#007AFF]/[0.08] dark:active:bg-[#0A84FF]/[0.08]
                      active:scale-[0.98] active:shadow-inner
                      transform transition-all duration-200 ease-out
                      flex-1 sm:flex-none sm:min-w-[140px] h-12
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-sm hover:shadow-md
                      ${false ? 'scale-[0.98] shadow-inner bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2.5">
                      {false ? ( // Removed isLoading state
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Previewing...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-5 h-5" />
                          <span>Preview</span>
                        </>
                      )}
                    </div>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
      
      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewItem(null);
        }}
        item={previewItem}
        itemType="packing"
      />

      {/* Shipping Marks Modal */}
      <ShippingMarksModal
        isOpen={showShippingMarks}
        onClose={() => setShowShippingMarks(false)}
        value={data.markingNo}
        onChange={(value) => setData(prev => ({ ...prev, markingNo: value }))}
      />
    </div>
  );
}
