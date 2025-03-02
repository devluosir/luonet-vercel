'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Download, Settings, Clipboard, History } from 'lucide-react';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import { InvoiceTemplateConfig, InvoiceData, LineItem } from '@/types/invoice';
import { format, addMonths } from 'date-fns';
import { Footer } from '@/components/Footer';
import { CustomerSection } from '@/components/invoice/CustomerSection';
import { addInvoiceHistory, getInvoiceHistory, saveInvoiceHistory } from '@/utils/invoiceHistory';
import { v4 as uuidv4 } from 'uuid';

// 添加高亮样式常量
const highlightClass = 'text-red-500 font-medium';

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

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

const tableInputClassName = `w-full px-3 py-2 rounded-xl
  bg-transparent backdrop-blur-sm
  border border-transparent
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
  text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  transition-all duration-300 ease-out
  hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
  text-center whitespace-pre-wrap`;

const numberInputClassName = `${tableInputClassName}
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none
  text-center`;

interface CustomWindow extends Window {
  __INVOICE_DATA__?: InvoiceData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

interface ErrorWithMessage {
  message: string;
  code?: string;
  details?: unknown;
}

export default function InvoicePage() {
  const router = useRouter();
  
  // 从 window 全局变量获取初始数据
  const initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__INVOICE_DATA__) : null;
  const initialEditMode = typeof window !== 'undefined' && (window as any).__EDIT_MODE__;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;
  
  const [isEditMode, setIsEditMode] = useState(initialEditMode || false);
  const [editId, setEditId] = useState(initialEditId || null);
  const [invoiceData, setInvoiceData] = useState<InvoiceData>(initialData || {
    invoiceNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    to: '',
    customerPO: '',
    items: [{
      lineNo: 1,
      hsCode: '',
      partname: '',
      description: '',
      quantity: 0,
      unit: 'pc',
      unitPrice: 0,
      amount: 0
    }],
    bankInfo: `Bank Name: The Hongkong and Shanghai Banking Corporation Limited
Swift code: HSBCHKHHHKH
Bank address: Head Office 1 Queen's Road Central Hong Kong
A/C No.: 801470337838
Beneficiary: Luo & Company Co., Limited`,
    paymentDate: format(addMonths(new Date(), 1), 'yyyy/MM/dd'),
    showPaymentTerms: true,
    additionalPaymentTerms: '',
    amountInWords: {
      dollars: '',
      cents: '',
      hasDecimals: false
    },
    remarks: '',
    showHsCode: false,
    showDescription: true,
    showBank: false,
    showInvoiceReminder: true,
    currency: 'USD',
    templateConfig: {
      headerType: 'bilingual',
      invoiceType: 'invoice',
      stampType: 'none'
    },
    otherFees: []
  });

  // 清除注入的数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 获取并保存编辑模式状态
      const editMode = (window as any).__EDIT_MODE__;
      const editId = (window as any).__EDIT_ID__;
      if (editMode !== undefined) {
        setIsEditMode(editMode);
      }
      if (editId !== undefined) {
        setEditId(editId);
      }

      // 清除注入的数据
      delete (window as any).__INVOICE_DATA__;
      delete (window as any).__EDIT_MODE__;
      delete (window as any).__EDIT_ID__;
    }
  }, []);

  const [showSettings, setShowSettings] = useState(false);
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingQuantityIndex, setEditingQuantityIndex] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');
  const [templateConfig, setTemplateConfig] = useState<InvoiceTemplateConfig>({
    headerType: 'bilingual',
    invoiceType: 'invoice',
    stampType: 'none'
  });
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [showPaymentTerms, setShowPaymentTerms] = useState(true);
  const [additionalPaymentTerms, setAdditionalPaymentTerms] = useState('');
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    column: string;
  } | null>(null);

  // 重命名未使用的变量，添加下划线前缀
  const [_templateConfig, _setTemplateConfig] = useState({});
  const [_customUnits, _setCustomUnits] = useState<string[]>([]);
  const [_newUnit, _setNewUnit] = useState('');

  // 将 handleError 包装在 useCallback 中，并添加具体的错误类型
  const handleError = useCallback((error: ErrorWithMessage | Error | unknown): string => {
    if (error instanceof Error) {
      console.error('Error:', error.message);
      return error.message;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const customError = error as ErrorWithMessage;
      console.error('Custom error:', customError.message);
      return customError.message;
    }
    console.error('Unknown error:', error);
    return '发生未知错误';
  }, []);

  // 使用 useCallback 包装 getUnitDisplay 函数
  const getUnitDisplay = useCallback((baseUnit: string, quantity: number) => {
    if (defaultUnits.includes(baseUnit)) {
      return quantity > 1 ? `${baseUnit}s` : baseUnit;
    }
    return baseUnit;
  }, []);

  // 修复 useEffect 的依赖警告
  useEffect(() => {
    // 原有的 effect 代码
    // ...
  }, [/* 其他依赖 */, invoiceData]);

  const handleAddLine = () => {
    setInvoiceData(prev => ({
      ...prev,
      items: [...prev.items, {
        lineNo: prev.items.length + 1,
        hsCode: '',
        partname: '',
        description: '',
        quantity: 0,
        unit: 'pc',
        unitPrice: 0,
        amount: 0,
        highlight: {}
      }]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && editId) {
        // 更新现有发票
        const history = getInvoiceHistory();
        const updatedHistory = history.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              customerName: invoiceData.to,
              invoiceNo: invoiceData.invoiceNo,
              totalAmount: getTotalAmount(),
              currency: invoiceData.currency,
              data: invoiceData,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        saveInvoiceHistory(updatedHistory);
        
        // 生成 PDF
        await generateInvoicePDF(invoiceData);
        
        // 跳转到历史记录页面
        router.push('/invoice/history');
      } else {
        // 生成新发票并保存到历史记录
        const newInvoice = {
          id: uuidv4(),
          customerName: invoiceData.to,
          invoiceNo: invoiceData.invoiceNo,
          totalAmount: getTotalAmount(),
          currency: invoiceData.currency,
          data: invoiceData,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 先保存历史记录
        const saved = addInvoiceHistory(newInvoice);
        if (!saved) {
          throw new Error('Failed to save invoice history');
        }
        
        // 生成 PDF
        await generateInvoicePDF(invoiceData);
        
        // 跳转到历史记录页面
        router.push('/invoice/history');
      }
    } catch (error) {
      console.error('Error handling submit:', error);
      alert('处理发票时出错');
    }
  };

  const calculateAmount = (quantity: number, unitPrice: number) => {
    return Number((quantity * unitPrice).toFixed(2));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    setInvoiceData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        const quantity = Number(value);
        const baseUnit = item.unit.replace(/s$/, '');
        item.unit = quantity > 1 ? `${baseUnit}s` : baseUnit;
      }
      
      if (field !== 'highlight') {
        (item as Record<keyof LineItem, string | number | undefined>)[field] = value;
      }
      
      if (field === 'quantity' || field === 'unitPrice') {
        item.amount = calculateAmount(
          field === 'quantity' ? Number(value) : item.quantity,
          field === 'unitPrice' ? Number(value) : item.unitPrice
        );
      }
      
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const getTotalAmount = useCallback(() => {
    const itemsTotal = invoiceData.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (invoiceData.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    return itemsTotal + feesTotal;
  }, [invoiceData.items, invoiceData.otherFees]);

  // 计算付款日期（设置日期后一个月）
  const calculatePaymentDate = useCallback((date: string) => {
    const baseDate = new Date(date);
    const nextMonth = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
    return format(nextMonth, 'yyyy-MM-dd');
  }, []);

  // 监听日期变化
  useEffect(() => {
    const newPaymentDate = calculatePaymentDate(invoiceData.date);
    setInvoiceData(prev => ({
      ...prev,
      paymentDate: newPaymentDate
    }));
  }, [invoiceData.date, calculatePaymentDate]);

  // 初始化时设置付款日期
  useEffect(() => {
    const initialPaymentDate = calculatePaymentDate(invoiceData.date);
    setInvoiceData(prev => ({
      ...prev,
      paymentDate: initialPaymentDate
    }));
  }, [invoiceData.date, calculatePaymentDate]);

  // 数字转英文大写金额
  const numberToWords = useCallback((num: number) => {
    const ones = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];
    const tens = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
    const teens = ['TEN', 'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
    
    const convertLessThanThousand = (n: number): string => {
      if (n === 0) return '';
      if (n < 10) return ones[n];
      if (n < 20) return teens[n - 10];
      if (n < 100) {
        return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? '-' + ones[n % 10] : '');
      }
      const hundred = ones[Math.floor(n / 100)] + ' HUNDRED';
      const remainder = n % 100;
      if (remainder === 0) return hundred;
      return hundred + ' AND ' + convertLessThanThousand(remainder);
    };

    const convert = (n: number): string => {
      if (n === 0) return 'ZERO';
      
      const billion = Math.floor(n / 1000000000);
      const million = Math.floor((n % 1000000000) / 1000000);
      const thousand = Math.floor((n % 1000000) / 1000);
      const remainder = n % 1000;
      
      let result = '';
      
      if (billion) result += convertLessThanThousand(billion) + ' BILLION ';
      if (million) result += convertLessThanThousand(million) + ' MILLION ';
      if (thousand) result += convertLessThanThousand(thousand) + ' THOUSAND ';
      if (remainder) result += convertLessThanThousand(remainder);
      
      return result.trim();
    };

    const dollars = Math.floor(num);
    const cents = Math.round((num - dollars) * 100);
    
    if (cents > 0) {
      return {
        dollars: convert(dollars),
        cents: `${convert(cents)} CENT${cents === 1 ? '' : 'S'}`,
        hasDecimals: true
      };
    } else {
      return {
        dollars: convert(dollars),
        cents: '',
        hasDecimals: false
      };
    }
  }, []);

  // 监听总金额变化，更新大写金额
  useEffect(() => {
    const total = getTotalAmount();
    const words = numberToWords(total);
    setInvoiceData(prev => ({
      ...prev,
      amountInWords: words
    }));
  }, [invoiceData.items, getTotalAmount, numberToWords]);

  // 处理额外付款条款的变化
  const handleAdditionalTermsChange = (value: string) => {
    setAdditionalPaymentTerms(value);
    setInvoiceData(prev => ({
      ...prev,
      additionalPaymentTerms: value
    }));
  };

  // 添加处理粘贴按钮点击的函数
  const handlePasteButtonClick = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        // 按行分割，但保留引号内的换行符
        const rows = text.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/);
        
        const newItems: LineItem[] = rows.map((row, index) => {
          // 分割单元格，但保留引号内的制表符和换行符
          const cells = row.split(/\t(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => {
            // 保留单元格内的换行符，只去除首尾空格
            return cell.replace(/^\s+|\s+$/g, '');
          });
          
          let partname = '', description = '', quantity = '0', unit = 'pc', unitPrice = '0';

          // 根据不同的列数处理数据
          if (cells.length >= 5) {
            // 5列或更多：名称 tab 描述 tab 数量 tab 单位 tab 单价
            [partname, description, quantity, unit, unitPrice] = cells;
          } else if (cells.length === 4) {
            // 4列：名称 tab tab 数量 tab 单位 tab 单价
            [partname,, quantity, unit, unitPrice] = cells;
          } else if (cells.length === 3) {
            // 3列有多种情况
            if (cells[1] && !isNaN(Number(cells[1]))) {
              if (!isNaN(Number(cells[2]))) {
                // 名称 tab 数量 tab 单价
                [partname, quantity, unitPrice] = cells;
              } else {
                // 名称 tab 数量 tab tab
                [partname, quantity] = cells;
              }
            } else {
              // 名称 tab 描述 tab 数量
              [partname, description, quantity] = cells;
            }
          } else if (cells.length === 2) {
            // 2列：名称 tab 数量
            [partname, quantity] = cells;
          } else if (cells.length === 1) {
            // 1列：只有名称
            [partname] = cells;
          }

          // 清理并验证数据，但保留换行符
          const cleanQuantity = parseInt(quantity.replace(/[^\d.-]/g, '')) || 0;
          const cleanUnitPrice = parseFloat(unitPrice.replace(/[^\d.-]/g, '')) || 0;
          const baseUnit = unit.trim().replace(/s$/, '') || 'pc';

          return {
            lineNo: index + 1,
            hsCode: '',
            partname: partname || '',
            description: description || '',
            quantity: cleanQuantity,
            unit: defaultUnits.includes(baseUnit) ? getUnitDisplay(baseUnit, cleanQuantity) : baseUnit,
            unitPrice: cleanUnitPrice,
            amount: cleanQuantity * cleanUnitPrice,
            highlight: {}
          };
        });

        // 更新发票数据，过滤掉完全空白的行
        setInvoiceData(prev => {
          // 如果是从报价单导入的数据，尝试处理 partName 字段
          const processedItems = newItems.map(item => {
            // @ts-ignore - 处理可能的报价单数据
            if (item.partName && !item.partname) {
              return {
                ...item,
                // @ts-ignore - 处理可能的报价单数据
                partname: item.partName,
                // @ts-ignore - 删除报价单特有的字段
                partName: undefined
              };
            }
            return item;
          });
          
          return {
            ...prev,
            items: processedItems.filter(item => item.partname || item.description)
          };
        });
      }
    } catch (err) {
      console.error('Failed to handle paste:', err);
      // 如果剪贴板访问失败，显示手动输入框
      const input = document.createElement('textarea');
      input.style.position = 'fixed';
      input.style.top = '50%';
      input.style.left = '50%';
      input.style.transform = 'translate(-50%, -50%)';
      input.style.zIndex = '9999';
      input.style.width = '80%';
      input.style.height = '200px';
      input.style.padding = '12px';
      input.style.border = '2px solid #007AFF';
      input.style.borderRadius = '8px';
      input.placeholder = '请将数据粘贴到这里...';
      
      const overlay = document.createElement('div');
      overlay.style.position = 'fixed';
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.right = '0';
      overlay.style.bottom = '0';
      overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
      overlay.style.zIndex = '9998';
      
      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '确认';
      confirmBtn.style.position = 'fixed';
      confirmBtn.style.bottom = '20%';
      confirmBtn.style.left = '50%';
      confirmBtn.style.transform = 'translateX(-50%)';
      confirmBtn.style.zIndex = '9999';
      confirmBtn.style.padding = '8px 24px';
      confirmBtn.style.backgroundColor = '#007AFF';
      confirmBtn.style.color = 'white';
      confirmBtn.style.border = 'none';
      confirmBtn.style.borderRadius = '6px';
      confirmBtn.style.cursor = 'pointer';
      
      const cleanup = () => {
        document.body.removeChild(input);
        document.body.removeChild(overlay);
        document.body.removeChild(confirmBtn);
      };
      
      confirmBtn.onclick = () => {
        const text = input.value;
        if (text) {
          const rows = text.split(/\n(?=(?:[^"]*"[^"]*")*[^"]*$)/);
          const newItems = rows.map((row, index) => {
            const cells = row.split(/\t(?=(?:[^"]*"[^"]*")*[^"]*$)/).map(cell => cell.replace(/^\s+|\s+$/g, ''));
            return {
              lineNo: index + 1,
              hsCode: '',
              partname: cells[0] || '',
              description: cells[1] || '',
              quantity: parseInt(cells[2]?.replace(/[^\d.-]/g, '') || '0') || 0,
              unit: cells[3] || 'pc',
              unitPrice: parseFloat(cells[4]?.replace(/[^\d.-]/g, '') || '0') || 0,
              amount: 0,
              highlight: {}
            };
          });

          setInvoiceData(prev => ({
            ...prev,
            items: newItems.filter(item => item.partname || item.description).map(item => ({
              ...item,
              amount: item.quantity * item.unitPrice
            }))
          }));
        }
        cleanup();
      };
      
      overlay.onclick = cleanup;
      
      document.body.appendChild(overlay);
      document.body.appendChild(input);
      document.body.appendChild(confirmBtn);
      
      input.focus();
    }
  };

  // 处理键盘导航
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, rowIndex: number, column: string) => {
    const columns = [
      ...(invoiceData.showHsCode ? ['hsCode'] : []),
      'partname',
      ...(invoiceData.showDescription ? ['description'] : []),
      'quantity',
      'unit',
      'unitPrice'
    ];

    const currentColumnIndex = columns.indexOf(column);
    const totalRows = invoiceData.items.length;
    const isTextarea = e.target instanceof HTMLTextAreaElement;

    switch (e.key) {
      case 'ArrowRight':
        if (currentColumnIndex < columns.length - 1) {
          const nextColumn = columns[currentColumnIndex + 1];
          setFocusedCell({ row: rowIndex, column: nextColumn });
          e.preventDefault();
        }
        break;
      case 'ArrowLeft':
        if (currentColumnIndex > 0) {
          const prevColumn = columns[currentColumnIndex - 1];
          setFocusedCell({ row: rowIndex, column: prevColumn });
          e.preventDefault();
        }
        break;
      case 'ArrowUp':
        if (rowIndex > 0) {
          setFocusedCell({ row: rowIndex - 1, column });
          e.preventDefault();
        }
        break;
      case 'ArrowDown':
        if (rowIndex < totalRows - 1) {
          setFocusedCell({ row: rowIndex + 1, column });
          e.preventDefault();
        }
        break;
      case 'Enter':
        // 如果是多行文本框且没有按住 Shift 键，允许换行
        if (isTextarea && !e.shiftKey) {
          return; // 不阻止默认行为，允许换行
        }
        // 对于其他输入框，或按住 Shift 键的情况，导航到下一行
        if (rowIndex < totalRows - 1) {
          setFocusedCell({ row: rowIndex + 1, column });
          e.preventDefault();
        }
        break;
      case 'Tab':
        if (!e.shiftKey && currentColumnIndex === columns.length - 1 && rowIndex < totalRows - 1) {
          setFocusedCell({ row: rowIndex + 1, column: columns[0] });
          e.preventDefault();
        } else if (e.shiftKey && currentColumnIndex === 0 && rowIndex > 0) {
          setFocusedCell({ row: rowIndex - 1, column: columns[columns.length - 1] });
          e.preventDefault();
        }
        break;
    }
  };

  // 使用 useEffect 自动聚焦到指定单元格
  useEffect(() => {
    if (focusedCell) {
      const element = document.querySelector(`[data-row="${focusedCell.row}"][data-column="${focusedCell.column}"]`) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }, [focusedCell]);

  useEffect(() => {
    // 初始化数据
    if (!invoiceData) {
      setInvoiceData({
        date: format(new Date(), 'yyyy-MM-dd'),
        paymentDate: format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
        invoiceNo: '',
        to: '',
        customerPO: '',
        items: [],
        bankInfo: '',
        showPaymentTerms: true,
        additionalPaymentTerms: '',
        amountInWords: { dollars: '', cents: '', hasDecimals: false },
        showHsCode: false,
        showDescription: true,
        showBank: false,
        showInvoiceReminder: true,
        currency: 'USD',
        templateConfig: { headerType: 'none', invoiceType: 'invoice', stampType: 'none' },
        otherFees: []
      });
    }
  }, [invoiceData]);

  // 添加处理双击事件的函数
  const handleDoubleClick = (index: number, field: keyof Exclude<LineItem['highlight'], undefined>) => {
    const newItems = [...invoiceData.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field]
      }
    };
    setInvoiceData(prev => ({
      ...prev,
      items: newItems
    }));
  };

  // 添加处理 other fee 双击事件的函数
  const handleOtherFeeDoubleClick = (index: number, field: keyof Exclude<typeof invoiceData.otherFees[number]['highlight'], undefined>) => {
    const newFees = [...(invoiceData.otherFees || [])];
    newFees[index] = {
      ...newFees[index],
      highlight: {
        ...newFees[index].highlight,
        [field]: !newFees[index].highlight?.[field]
      }
    };
    setInvoiceData(prev => ({
      ...prev,
      otherFees: newFees
    }));
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#000000] dark:text-gray-100">
      <div className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-10">
          <div className="max-w-7xl mx-auto space-y-8">
            {/* 返回按钮 */}
            <div className="flex items-center justify-between mb-6">
              <Link href="/tools" className="inline-flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Link>
            </div>

            {/* 主卡片容器 */}
            <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl shadow-lg dark:shadow-2xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10 p-4 md:p-8 mt-8">
              <form onSubmit={handleSubmit}>
                {/* 标题和设置按钮 */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                      Invoice Generator
                    </h1>
                    <button
                      type="button"
                      onClick={handlePasteButtonClick}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0"
                      title="Paste from clipboard"
                    >
                      <Clipboard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                    <Link
                      href="/invoice/history"
                      className="px-3 py-1.5 rounded-lg text-sm font-medium
                        bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                        hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                        text-[#007AFF] dark:text-[#0A84FF]
                        flex items-center gap-1.5"
                    >
                      <History className="w-4 h-4" />
                      历史记录
                    </Link>
                  </div>
                  <div className="hidden sm:flex items-center gap-3">
                    <input
                      type="text"
                      value={invoiceData.invoiceNo}
                      onChange={e => setInvoiceData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                      placeholder="Invoice No."
                      className={`${inputClassName} w-[200px] [&::placeholder]:text-[#007AFF]/60 dark:[&::placeholder]:text-[#0A84FF]/60 ${
                        !invoiceData.invoiceNo 
                          ? 'border-[#007AFF]/50 dark:border-[#0A84FF]/50' 
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                  {/* 小屏时只显示设置按钮 */}
                  <div className="sm:hidden">
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 设置面板 */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSettings ? 'max-h-none opacity-100 mb-8' : 'max-h-0 opacity-0'}`}>
                  <div className="bg-gray-50 dark:bg-[#1C1C1E]/70 p-4 rounded-xl border border-gray-200/30 dark:border-white/10">
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-4">
                        <input
                          type="date"
                          value={invoiceData.date}
                          onChange={(e) => setInvoiceData(prev => ({ ...prev, date: e.target.value }))}
                          className={`${inputClassName} dark:bg-[#1C1C1E]/90`}
                          required
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              invoiceData.currency === 'USD' 
                                ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white' 
                                : 'bg-white/90 dark:bg-[#1c1c1e]/90 text-gray-600 dark:text-gray-400 border border-gray-200/30 dark:border-white/10'
                            }`}
                            onClick={() => setInvoiceData(prev => ({ ...prev, currency: 'USD' }))}
                          >
                            $
                          </button>
                          <button
                            type="button"
                            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                              invoiceData.currency === 'CNY' 
                                ? 'bg-[#007AFF] dark:bg-[#0A84FF] text-white' 
                                : 'bg-white/90 dark:bg-[#1c1c1e]/90 text-gray-600 dark:text-gray-400 border border-gray-200/30 dark:border-white/10'
                            }`}
                            onClick={() => setInvoiceData(prev => ({ ...prev, currency: 'CNY' }))}
                          >
                            ¥
                          </button>
                        </div>
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={invoiceData.showBank}
                            onChange={e => setInvoiceData(prev => ({ ...prev, showBank: e.target.checked }))}
                            className="rounded border-gray-300 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20 dark:border-gray-600"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">Bank</span>
                        </label>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={invoiceData.showHsCode}
                              onChange={e => setInvoiceData(prev => ({ ...prev, showHsCode: e.target.checked }))}
                              className="rounded border-gray-300 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">HS Code</span>
                          </label>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={invoiceData.showDescription}
                              onChange={e => setInvoiceData(prev => ({ ...prev, showDescription: e.target.checked }))}
                              className="rounded border-gray-300 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-600 dark:text-gray-400">Description</span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="relative mb-8">
                  <input
                    type="text"
                    value={invoiceData.invoiceNo}
                    onChange={e => setInvoiceData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                    placeholder="Invoice No."
                    className={`${inputClassName} block sm:hidden w-full mb-6 [&::placeholder]:text-[#007AFF]/60 dark:[&::placeholder]:text-[#0A84FF]/60 ${
                      !invoiceData.invoiceNo 
                        ? 'border-[#007AFF]/50 dark:border-[#0A84FF]/50' 
                        : ''
                    }`}
                  />
                </div>
                {/* 客户信息区域 */}
                <CustomerSection
                  to={invoiceData.to}
                  customerPO={invoiceData.customerPO}
                  onChange={({ to, customerPO }) => {
                    setInvoiceData(prev => {
                      // 检查是否是Nordic Chemtanker，并且之前没有添加过这个费用
                      const isNordicChemtanker = to.includes('Ernst Jacob');
                      const hasNordicFee = prev.otherFees?.some(fee => 
                        fee.description === 'Additional fee' && fee.amount === 27.5
                      );

                      // 如果是Nordic Chemtanker且没有添加过费用，则添加
                      const newOtherFees = isNordicChemtanker && !hasNordicFee
                        ? [...(prev.otherFees || []), {
                            id: Date.now(),
                            description: 'Additional fee',
                            amount: 27.5
                          }]
                        : prev.otherFees;

                      return {
                        ...prev,
                        to,
                        customerPO,
                        otherFees: newOtherFees
                      };
                    });
                  }}
                />

                {/* 商品表格 */}
                <div className="space-y-2">
                  {/* 主表格容器 */}
                  <div className="overflow-x-auto rounded-2xl border border-gray-200/30 dark:border-white/10
                                  bg-white/80 dark:bg-[#1C1C1E]/80 backdrop-blur-xl shadow-lg">
                    <div className="min-w-[600px]">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10
                                        bg-[#007AFF]/5 dark:bg-[#0A84FF]/5">
                            <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[40px]">No.</th>
                            {invoiceData.showHsCode && (
                              <th className="py-2 px-4 text-center text-xs font-bold text-gray-700 dark:text-gray-300 w-[120px]">
                                HS Code
                              </th>
                            )}
                            <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[150px] md:w-[210px]">Part Name</th>
                            {invoiceData.showDescription && (
                              <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 flex-1">Description</th>
                            )}
                            <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[100px]">Q&apos;TY</th>
                            <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[100px]">Unit</th>
                            <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[130px]">U/Price</th>
                            <th className="py-2 px-4 text-center text-[12px] font-bold text-gray-700 dark:text-gray-300 w-[150px]">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceData.items.map((item, index) => (
                            <tr key={item.lineNo} 
                                className="border-b border-[#007AFF]/10 dark:border-[#0A84FF]/10 hover:bg-gray-50/50 dark:hover:bg-gray-800/50">
                              <td className="py-1 px-1 text-sm">
                                <span className="flex items-center justify-center w-6 h-6 rounded-full 
                                               hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 cursor-pointer transition-colors"
                                      onClick={() => {
                                        setInvoiceData(prev => ({
                                          ...prev,
                                          items: prev.items
                                            .filter((_, i) => i !== index)
                                            .map((item, i) => ({
                                              ...item,
                                              lineNo: i + 1
                                            }))
                                        }));
                                      }}
                                      title="Click to delete"
                                >
                                  {item.lineNo}
                                </span>
                              </td>
                              {invoiceData.showHsCode && (
                                <td className="py-1.5 px-1">
                                  <input
                                    type="text"
                                    value={item.hsCode}
                                    onChange={e => updateLineItem(index, 'hsCode', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'hsCode')}
                                    onDoubleClick={() => handleDoubleClick(index, 'hsCode')}
                                    data-row={index}
                                    data-column="hsCode"
                                    className={`${tableInputClassName} ${item.highlight?.hsCode ? highlightClass : ''}`}
                                    placeholder="HS Code"
                                  />
                                </td>
                              )}
                              <td className="py-1.5 px-1">
                                <textarea
                                  value={item.partname}
                                  onChange={e => updateLineItem(index, 'partname', e.target.value)}
                                  onKeyDown={(e) => handleKeyDown(e, index, 'partname')}
                                  onDoubleClick={() => handleDoubleClick(index, 'partname')}
                                  data-row={index}
                                  data-column="partname"
                                  rows={1}
                                  className={`${item.highlight?.partname ? highlightClass : ''}
                                    w-full
                                    resize-none
                                    text-center
                                    py-2 px-3
                                    border border-transparent
                                    rounded-lg
                                    transition-colors
                                    hover:bg-gray-50 dark:hover:bg-gray-800
                                    hover:border-[#007AFF]/50 dark:hover:border-[#0A84FF]/50
                                    focus:bg-gray-50 dark:focus:bg-gray-800
                                    focus:border-[#007AFF]/50 dark:focus:border-[#0A84FF]/50
                                    focus:ring-0 focus:outline-none
                                    bg-transparent
                                    placeholder:text-gray-300 dark:placeholder:text-gray-600
                                    text-[11px] leading-[15px]
                                    whitespace-pre-wrap
                                    overflow-y-hidden
                                  `}
                                  placeholder="Part Name"
                                  style={{ 
                                    height: 'auto',
                                    minHeight: '41px'
                                  }}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = `${target.scrollHeight}px`;
                                  }}
                                />
                              </td>
                              {invoiceData.showDescription && (
                                <td className="py-1 px-1">
                                  <textarea
                                    value={item.description}
                                    onChange={e => updateLineItem(index, 'description', e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(e, index, 'description')}
                                    onDoubleClick={() => handleDoubleClick(index, 'description')}
                                    data-row={index}
                                    data-column="description"
                                    rows={1}
                                    className={`${item.highlight?.description ? highlightClass : ''}
                                      w-full
                                      resize-none
                                      text-center
                                      py-2 px-3
                                      border border-transparent
                                      rounded-lg
                                      transition-colors
                                      hover:bg-gray-50 dark:hover:bg-gray-800
                                      hover:border-[#007AFF]/50 dark:hover:border-[#0A84FF]/50
                                      focus:bg-gray-50 dark:focus:bg-gray-800
                                      focus:border-[#007AFF]/50 dark:focus:border-[#0A84FF]/50
                                      focus:ring-0 focus:outline-none
                                      bg-transparent
                                      placeholder:text-gray-300 dark:placeholder:text-gray-600
                                      text-[11px] leading-[15px]
                                      whitespace-pre-wrap
                                      overflow-y-hidden
                                    `}
                                    placeholder="Enter description"
                                    style={{ 
                                      height: 'auto',
                                      minHeight: '41px'
                                    }}
                                    onInput={(e) => {
                                      const target = e.target as HTMLTextAreaElement;
                                      target.style.height = 'auto';
                                      target.style.height = `${target.scrollHeight}px`;
                                    }}
                                  />
                                </td>
                              )}
                              <td className="py-1.5 px-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editingQuantityIndex === index ? editingQuantity : (item.quantity || '')}
                                  onChange={e => {
                                    const inputValue = e.target.value;
                                    if (/^\d*$/.test(inputValue)) {
                                      setEditingQuantity(inputValue);
                                      const value = parseInt(inputValue);
                                      if (!isNaN(value) || inputValue === '') {
                                        updateLineItem(index, 'quantity', value || 0);
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, index, 'quantity')}
                                  onDoubleClick={() => handleDoubleClick(index, 'quantity')}
                                  data-row={index}
                                  data-column="quantity"
                                  onFocus={(e) => {
                                    setEditingQuantityIndex(index);
                                    setEditingQuantity(item.quantity === 0 ? '' : item.quantity.toString());
                                    e.target.select();
                                  }}
                                  onBlur={() => {
                                    setEditingQuantityIndex(null);
                                    setEditingQuantity('');
                                  }}
                                  className={`${numberInputClassName} ${item.highlight?.quantity ? highlightClass : ''}`}
                                />
                              </td>
                              <td className="py-1.5 px-1">
                                <select
                                  value={item.unit ? item.unit.replace(/s$/, '') : 'pc'}
                                  onChange={e => {
                                    const baseUnit = e.target.value;
                                    const unit = item.quantity <= 1 ? baseUnit : `${baseUnit}s`;
                                    updateLineItem(index, 'unit', unit);
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, index, 'unit')}
                                  onDoubleClick={() => handleDoubleClick(index, 'unit')}
                                  data-row={index}
                                  data-column="unit"
                                  className={`${tableInputClassName} appearance-none ${item.highlight?.unit ? highlightClass : ''}`}
                                >
                                  <option value="pc">pc{item.quantity > 1 ? 's' : ''}</option>
                                  <option value="set">set{item.quantity > 1 ? 's' : ''}</option>
                                  <option value="length">length{item.quantity > 1 ? 's' : ''}</option>
                                  {_customUnits.map((unit) => (
                                    <option key={unit} value={unit}>
                                      {unit}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={editingUnitPriceIndex === index ? editingUnitPrice : (item.unitPrice ? item.unitPrice.toFixed(2) : '')}
                                  onChange={e => {
                                    const inputValue = e.target.value;
                                    if (/^\d*\.?\d{0,2}$/.test(inputValue) || inputValue === '') {
                                      setEditingUnitPrice(inputValue);
                                      const value = parseFloat(inputValue);
                                      if (!isNaN(value)) {
                                        updateLineItem(index, 'unitPrice', value);
                                      }
                                    }
                                  }}
                                  onKeyDown={(e) => handleKeyDown(e, index, 'unitPrice')}
                                  onDoubleClick={() => handleDoubleClick(index, 'unitPrice')}
                                  data-row={index}
                                  data-column="unitPrice"
                                  onFocus={(e) => {
                                    setEditingUnitPriceIndex(index);
                                    setEditingUnitPrice(item.unitPrice === 0 ? '' : item.unitPrice.toString());
                                    e.target.select();
                                  }}
                                  onBlur={() => {
                                    setEditingUnitPriceIndex(null);
                                    setEditingUnitPrice('');
                                  }}
                                  className={`${numberInputClassName} ${item.highlight?.unitPrice ? highlightClass : ''}`}
                                />
                              </td>
                              <td className="py-1 px-1">
                                <input
                                  type="text"
                                  value={item.amount.toFixed(2)}
                                  readOnly
                                  onDoubleClick={() => handleDoubleClick(index, 'amount')}
                                  className={`${numberInputClassName} ${item.highlight?.amount ? highlightClass : ''}`}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Other Fees 区域 */}
                    {/* Other Fees 区域 */}
                    {invoiceData.otherFees && invoiceData.otherFees.length > 0 && (
                      <div className="border-t border-[#007AFF]/10 dark:border-[#0A84FF]/10">
                        {invoiceData.otherFees.map((fee, index) => (
                          <div key={fee.id} 
                               className={`flex items-center ${
                                 index % 2 === 0 ? 'bg-[#007AFF]/[0.02] dark:bg-[#0A84FF]/[0.02]' : ''
                               }`}>
                            <div className="w-[40px] px-4">
                              <span 
                                className="flex items-center justify-center w-6 h-6 rounded-full mx-auto
                                          text-xs text-[#86868B] hover:bg-red-500/10 hover:text-red-500 
                                          cursor-pointer transition-all duration-200"
                                onClick={() => {
                                  const newFees = invoiceData.otherFees?.filter(f => f.id !== fee.id) || [];
                                  setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                                }}
                                title="Click to delete"
                              >
                                ×
                              </span>
                            </div>
                            <div className="flex-1 px-4">
                              <input
                                type="text"
                                value={fee.description}
                                onChange={(e) => {
                                  const newFees = [...(invoiceData.otherFees || [])];
                                  newFees[index] = { ...fee, description: e.target.value };
                                  setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                                }}
                                onDoubleClick={() => handleOtherFeeDoubleClick(index, 'description')}
                                placeholder="Other Fee"
                                className={`${tableInputClassName} text-center ${fee.highlight?.description ? highlightClass : ''}`}
                              />
                            </div>
                            <div className="w-[160px] px-4">
                              <input
                                type="text"
                                inputMode="decimal"
                                value={editingFeeIndex === index ? editingFeeAmount : (fee.amount === 0 ? '' : fee.amount.toFixed(2))}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (/^-?\d*\.?\d{0,2}$/.test(value) || value === '' || value === '-') {
                                    setEditingFeeAmount(value);
                                    const newFees = [...(invoiceData.otherFees || [])];
                                    newFees[index] = { ...fee, amount: value === '' || value === '-' ? 0 : parseFloat(value) || 0 };
                                    setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                                  }
                                }}
                                onDoubleClick={() => handleOtherFeeDoubleClick(index, 'amount')}
                                onFocus={(e) => {
                                  setEditingFeeIndex(index);
                                  setEditingFeeAmount(fee.amount === 0 ? '' : fee.amount.toString());
                                  e.target.select();
                                }}
                                onBlur={() => {
                                  setEditingFeeIndex(null);
                                  setEditingFeeAmount('');
                                }}
                                placeholder="0.00"
                                className={`${numberInputClassName} ${fee.highlight?.amount ? highlightClass : ''}`}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 添加行按钮和总金额 */}
              <div className="flex items-center justify-between gap-4 mt-6 mb-8">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
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

                  <button
                    type="button"
                    onClick={() => {
                      const newFees = [...(invoiceData.otherFees || [])];
                      newFees.push({
                        id: Date.now(),
                        description: '',
                        amount: 0
                      });
                      setInvoiceData(prev => ({ ...prev, otherFees: newFees }));
                    }}
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
                </div>
                
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm font-medium text-gray-500 hidden md:inline">Total Amount</span>
                  <div className="text-right">
                    <span className="text-xl font-semibold tracking-tight whitespace-nowrap">
                      {invoiceData.currency === 'USD' ? '$' : '¥'}
                      {getTotalAmount().toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* 英文大写金额显示区域 */}
              <div className="mt-4 mb-8">
                <div className="inline text-sm">
                  <span className="text-gray-600 dark:text-gray-400">SAY TOTAL </span>
                  <span className="text-blue-500">
                    {invoiceData.currency === 'USD' ? 'US DOLLARS ' : 'CHINESE YUAN '}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{invoiceData.amountInWords.dollars}</span>
                  {invoiceData.amountInWords.hasDecimals && (
                    <>
                      <span className="text-red-500"> AND </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        {invoiceData.amountInWords.cents}
                      </span>
                    </>
                  )}
                  {!invoiceData.amountInWords.hasDecimals && (
                    <span className="text-gray-600 dark:text-gray-400"> ONLY</span>
                  )}
                </div>
              </div>

              {/* 银行信息 */}
              {invoiceData.showBank && (
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Bank Information:</h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                    <p>Bank Name: The Hongkong and Shanghai Banking Corporation Limited</p>
                    <p>Swift Code: HSBCHKHHHKH</p>
                    <p>Bank Address: Head Office 1 Queen&apos;s Road Central Hong Kong</p>
                    <p>A/C No.: 801470337838</p>
                    <p>Beneficiary: Luo &amp; Company Co., Limited</p>
                  </div>
                </div>
              )}

              {/* 付款条款 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Payment Terms:
                </label>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/20">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={showPaymentTerms}
                        onChange={(e) => {
                          setShowPaymentTerms(e.target.checked);
                          setInvoiceData(prev => ({
                            ...prev,
                            showPaymentTerms: e.target.checked
                          }));
                        }}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20"
                      />
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Full paid not later than</span>
                        <input
                          type="date"
                          value={invoiceData.paymentDate}
                          onChange={(e) => setInvoiceData(prev => ({ 
                            ...prev, 
                            paymentDate: e.target.value 
                          }))}
                          className={`${inputClassName} !py-1.5 text-red-500 dark:text-red-400`}
                          style={{ 
                            colorScheme: 'light dark',
                            width: '150px',
                            minWidth: '150px',
                            maxWidth: '150px',
                            flexShrink: 0,
                            flexGrow: 0
                          }}
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">by telegraphic transfer.</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <textarea
                        value={additionalPaymentTerms}
                        onChange={(e) => handleAdditionalTermsChange(e.target.value)}
                        placeholder="Enter additional remarks (each line will be a new payment term)"
                        className={`${inputClassName} min-h-[4em] resize dark:bg-[#1C1C1E]/90`}
                        rows={2}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={invoiceData.showInvoiceReminder}
                        onChange={e => setInvoiceData(prev => ({ ...prev, showInvoiceReminder: e.target.checked }))}
                        className="rounded border-gray-300 dark:border-gray-600 text-[#007AFF] dark:text-[#0A84FF] focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20"
                      />
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Please state our invoice no. <span className="text-red-500 dark:text-red-400">&quot;{invoiceData.invoiceNo}&quot;</span> on your payment documents.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 生成按钮 */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                <button
                  type="submit"
                  className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
                    bg-[#007AFF] dark:bg-[#0A84FF] hover:bg-[#007AFF]/90 dark:hover:bg-[#0A84FF]/90
                    text-white font-medium text-[15px] leading-relaxed
                    transition-all duration-300 ease-out
                    focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
                    shadow-sm hover:shadow-md dark:shadow-[#0A84FF]/10`}
                  >
                    <Download className="w-5 h-5" />
                    {isEditMode ? 'Save Invoice' : 'Generate Invoice'}
                  </button>

                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    try {
                      const pdfUrl = await generateInvoicePDF({
                        ...invoiceData,
                        showPaymentTerms,
                        additionalPaymentTerms,
                        templateConfig
                      }, true);
                      if (pdfUrl) {
                        setPreviewUrl(pdfUrl.toString());
                        setShowPreview(true);
                      }
                    } catch (error) {
                      console.error('Error previewing PDF:', error);
                    }
                  }}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-2xl font-medium
                    bg-white dark:bg-[#1C1C1E]
                    text-[#007AFF] dark:text-[#0A84FF]
                    border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                    flex items-center justify-center gap-2
                    hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
                    hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                    active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
                    transition-all duration-200"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Preview Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* PDF 预览模态框 */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1C1C1E] rounded-2xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Preview Invoice</h3>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setPreviewUrl('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 bg-gray-100 dark:bg-black p-4">
              <iframe
                src={previewUrl}
                className="w-full h-full rounded-lg bg-white dark:bg-[#1C1C1E] shadow-lg"
                title="PDF Preview"
              />
            </div>
          </div>
        </div>
      )}
    

      </div>
      <Footer />
    </div>
  );
}
