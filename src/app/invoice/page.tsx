'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// 移除CSS导入，改为动态加载
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Save, 
  Clipboard,
  Settings,
  History,
  Download
} from 'lucide-react';
import { generateInvoicePDF } from '@/utils/pdfGenerator';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { InvoiceTemplateConfig, InvoiceData, LineItem } from '@/types/invoice';
import { format, addMonths } from 'date-fns';
import { Footer } from '@/components/Footer';
import { CustomerSection } from '@/components/invoice/CustomerSection';
import ItemsTable from '@/components/invoice/ItemsTable';
import { addInvoiceHistory, getInvoiceHistory, saveInvoiceHistory } from '@/utils/invoiceHistory';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

// 动态导入PDFPreviewModal
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

// 添加高亮样式常量
const highlightClass = 'text-red-500 dark:text-red-400 font-medium';

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
  text-center whitespace-pre-wrap
  ios-optimized-input`;

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
  const pathname = usePathname();

  // 1. 状态定义
  // 基础状态
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  // 保存相关状态
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // UI 状态
  const [showSettings, setShowSettings] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);

  // 自定义单位相关状态
  const [customUnit, setCustomUnit] = useState('');
  const [showUnitSuccess, setShowUnitSuccess] = useState(false);

  // 编辑状态
  const [editingUnitPriceIndex, setEditingUnitPriceIndex] = useState<number | null>(null);
  const [editingUnitPrice, setEditingUnitPrice] = useState<string>('');
  const [editingQuantityIndex, setEditingQuantityIndex] = useState<number | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');
  const [editingFeeAmount, setEditingFeeAmount] = useState<string>('');
  const [editingFeeIndex, setEditingFeeIndex] = useState<number | null>(null);
  const [focusedCell, setFocusedCell] = useState<{
    row: number;
    column: string;
  } | null>(null);

  // 动态加载字体CSS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 检查是否已经加载了字体CSS
      if (!document.querySelector('link[href*="pdf-fonts.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/pdf-fonts.css';
        document.head.appendChild(link);
      }
    }
  }, []);

  // 从 window 全局变量获取初始数据
  const initialData = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__INVOICE_DATA__) : null;
  const initialEditId = typeof window !== 'undefined' ? ((window as unknown as CustomWindow).__EDIT_ID__) : null;

  // 2. 数据状态
  const [data, setData] = useState<InvoiceData>(initialData || {
    to: '',
    invoiceNo: '',
    date: format(new Date(), 'yyyy-MM-dd'),
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
    bankInfo: '',
    paymentDate: '',
    showPaymentTerms: false,
    additionalPaymentTerms: '',
    amountInWords: {
      dollars: '',
      cents: '',
      hasDecimals: false
    },
    showHsCode: false,
    showDescription: true,
    showBank: false,
    showInvoiceReminder: false,
    currency: 'USD',
    templateConfig: {
      headerType: 'bilingual',
      invoiceType: 'invoice',
      stampType: 'none'
    },
    customUnits: [],
    otherFees: []
  });

  // 2. 工具函数定义
  const calculateAmount = useCallback((quantity: number, unitPrice: number) => {
    return Number((quantity * unitPrice).toFixed(2));
  }, []);

  const getTotalAmount = useCallback(() => {
    const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
    const feesTotal = (data.otherFees || []).reduce((sum, fee) => sum + fee.amount, 0);
    return itemsTotal + feesTotal;
  }, [data.items, data.otherFees]);

  const calculatePaymentDate = useCallback((date: string) => {
    const baseDate = new Date(date);
    const nextMonth = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
    const year = nextMonth.getFullYear();
    const month = String(nextMonth.getMonth() + 1).padStart(2, '0');
    const day = String(nextMonth.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

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

  const handleAddLine = useCallback(() => {
    setData(prev => ({
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
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, rowIndex: number, column: string) => {
    const columns = [
      ...(data.showHsCode ? ['hsCode'] : []),
      'partname',
      ...(data.showDescription ? ['description'] : []),
      'quantity',
      'unit',
      'unitPrice'
    ];

    const currentColumnIndex = columns.indexOf(column);
    const totalRows = data.items.length;
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
        if (isTextarea && !e.shiftKey) {
          return;
        }
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
  }, [data.showHsCode, data.showDescription, data.items.length]);

  const handleDoubleClick = useCallback((index: number, field: keyof Exclude<LineItem['highlight'], undefined>) => {
    const newItems = [...data.items];
    newItems[index] = {
      ...newItems[index],
      highlight: {
        ...newItems[index].highlight,
        [field]: !newItems[index].highlight?.[field]
      }
    };
    setData(prev => ({
      ...prev,
      items: newItems
    }));
  }, [data.items]);

  const handleOtherFeeDoubleClick = useCallback((index: number, field: 'description' | 'amount') => {
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
  }, [data.otherFees]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (isEditMode && editId) {
        // 更新现有发票
        const history = getInvoiceHistory();
        const updatedHistory = history.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              customerName: data.to,
              invoiceNo: data.invoiceNo,
              totalAmount: getTotalAmount(),
              currency: data.currency,
              data: data,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        saveInvoiceHistory(updatedHistory);
        
        // 记录客户信息使用情况
        if (data.to && data.invoiceNo) {
          const customerName = data.to.split('\n')[0].trim();
          recordCustomerUsage(customerName, 'invoice', data.invoiceNo);
        }
        
        // 生成 PDF
        await generateInvoicePDF(data);
      } else {
        // 生成新发票并保存到历史记录
        const newInvoice = {
          id: uuidv4(),
          customerName: data.to,
          invoiceNo: data.invoiceNo,
          totalAmount: getTotalAmount(),
          currency: data.currency,
          data: data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // 先保存历史记录
        const saved = addInvoiceHistory(newInvoice);
        if (!saved) {
          throw new Error('Failed to save invoice history');
        }
        
        // 记录客户信息使用情况
        if (data.to && data.invoiceNo) {
          const customerName = data.to.split('\n')[0].trim();
          recordCustomerUsage(customerName, 'invoice', data.invoiceNo);
        }
        
        // 生成 PDF
        await generateInvoicePDF(data);
      }
    } catch (error) {
      console.error('Error handling submit:', error);
      alert('处理发票时出错');
    }
  }, [isEditMode, editId, data, getTotalAmount]);

  const updateLineItem = useCallback((index: number, field: keyof LineItem, value: string | number) => {
    setData(prev => {
      const newItems = [...prev.items];
      const item = { ...newItems[index] };
      
      if (field === 'quantity') {
        const quantity = Number(value);
        const baseUnit = item.unit.replace(/s$/, '');
        // 只对默认单位进行复数处理，自定义单位保持不变
        // 检查是否是自定义单位
        const isCustomUnit = (prev.customUnits || []).includes(item.unit) || (prev.customUnits || []).includes(baseUnit);
        
        if (defaultUnits.includes(baseUnit) && !isCustomUnit) {
          item.unit = quantity > 1 ? `${baseUnit}s` : baseUnit;
        }
        // 自定义单位保持不变，不做任何处理
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
  }, [calculateAmount]);

  // 处理自定义单位
  const handleAddCustomUnit = useCallback(() => {
    if (customUnit && !(data.customUnits || []).includes(customUnit)) {
      setData(prev => ({
        ...prev,
        customUnits: [...(prev.customUnits || []), customUnit]
      }));
      setCustomUnit('');
      setShowUnitSuccess(true);
      setTimeout(() => setShowUnitSuccess(false), 2000);
    }
  }, [customUnit, data.customUnits]);

  const handleRemoveCustomUnit = useCallback((index: number) => {
    const newUnits = (data.customUnits || []).filter((_, i) => i !== index);
    setData(prev => ({
      ...prev,
      customUnits: newUnits
    }));
  }, [data.customUnits]);

  // 处理保存功能
  const handleSave = useCallback(async () => {
    if (!data.to.trim()) {
      setSaveMessage('请填写客户名称');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    if (data.items.length === 0 || (data.items.length === 1 && !data.items[0].partname)) {
      setSaveMessage('请添加至少一个商品');
      setSaveSuccess(false);
      setTimeout(() => setSaveMessage(''), 2000);
      return;
    }

    setIsSaving(true);
    try {
      const history = getInvoiceHistory();
      const totalAmount = getTotalAmount();
      
      if (isEditMode && editId) {
        // 更新现有发票
        const updatedHistory = history.map(item => {
          if (item.id === editId) {
            return {
              ...item,
              customerName: data.to,
              invoiceNo: data.invoiceNo,
              totalAmount: totalAmount,
              currency: data.currency,
              data: data,
              updatedAt: new Date().toISOString()
            };
          }
          return item;
        });
        
        const saved = saveInvoiceHistory(updatedHistory);
        if (saved) {
          setSaveSuccess(true);
          setSaveMessage('保存成功');
        } else {
          setSaveSuccess(false);
          setSaveMessage('保存失败');
        }
      } else {
        // 创建新发票记录
        const newInvoice = {
          id: uuidv4(),
          customerName: data.to,
          invoiceNo: data.invoiceNo,
          totalAmount: totalAmount,
          currency: data.currency,
          data: data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        const saved = addInvoiceHistory(newInvoice);
        if (saved) {
          setSaveSuccess(true);
          setSaveMessage('保存成功');
          setEditId(newInvoice.id);
          setIsEditMode(true);
        } else {
          setSaveSuccess(false);
          setSaveMessage('保存失败');
        }
      }
    } catch (error) {
      console.error('Error saving invoice:', error);
      setSaveSuccess(false);
      setSaveMessage('保存失败');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
    }
  }, [data, isEditMode, editId, getTotalAmount]);

  // 处理粘贴功能
  const handlePasteButtonClick = useCallback(async () => {
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
            lineNo: index + 1, // Use index + 1 for new items
            hsCode: '',
            partname: partname || '',
            description: description || '',
            quantity: cleanQuantity,
            unit: baseUnit, // 粘贴时保持原单位，不进行复数处理
            unitPrice: cleanUnitPrice,
            amount: cleanQuantity * cleanUnitPrice,
            highlight: {}
          };
        });

        // 更新发票数据，过滤掉完全空白的行
        setData(prev => {
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
              id: index + 1, // Use index + 1 for new items
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

          setData(prev => ({
            ...prev,
            items: newItems.filter(item => item.partname || item.description).map((item, index) => ({
              ...item,
              lineNo: index + 1,
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
  }, []);

  // 修复 useEffect 的依赖警告
  useEffect(() => {
    // 原有的 effect 代码
    // ...
  }, [/* 其他依赖 */, data]);

  // 3. Effect Hooks
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!mounted) return;

      if (typeof window !== 'undefined') {
        const customWindow = window as unknown as CustomWindow;
        if (customWindow.__INVOICE_DATA__) {
          setData(customWindow.__INVOICE_DATA__);
        }
        if (customWindow.__EDIT_MODE__ !== undefined) {
          setIsEditMode(customWindow.__EDIT_MODE__);
        }
        if (customWindow.__EDIT_ID__ !== undefined) {
          setEditId(customWindow.__EDIT_ID__);
        }

        delete customWindow.__INVOICE_DATA__;
        delete customWindow.__EDIT_MODE__;
        delete customWindow.__EDIT_ID__;
      }
    };
    
    init();
  }, [mounted]);

  useEffect(() => {
    const newPaymentDate = calculatePaymentDate(data.date);
    setData(prev => ({
      ...prev,
      paymentDate: newPaymentDate
    }));
  }, [data.date, calculatePaymentDate]);

  useEffect(() => {
    const total = getTotalAmount();
    const words = numberToWords(total);
    setData(prev => ({
      ...prev,
      amountInWords: words
    }));
  }, [data.items, getTotalAmount, numberToWords]);

  useEffect(() => {
    if (focusedCell) {
      const element = document.querySelector(`[data-row="${focusedCell.row}"][data-column="${focusedCell.column}"]`) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }, [focusedCell]);

  // 避免闪烁
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#000000] dark:text-gray-100 flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={pathname?.includes('/edit/') || pathname?.includes('/copy/') ? '/history' : '/dashboard'} 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl shadow-lg dark:shadow-2xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10 p-4 md:p-8 mt-8">
              <form onSubmit={handleSubmit}>
                {/* 标题和工具栏 */}
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
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href="/history?tab=invoice"
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0"
                      title="历史记录"
                    >
                      <History className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </Link>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 flex-shrink-0 relative"
                      title={isEditMode ? '保存修改' : '保存新记录'}
                    >
                      {isSaving ? (
                        <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <Save className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                      )}
                      {saveMessage && (
                        <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white rounded-lg whitespace-nowrap ${
                          saveSuccess ? 'bg-green-500' : 'bg-red-500'
                        }`}>
                          {saveMessage}
                        </div>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettings(!showSettings)}
                      className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                    >
                      <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                  </div>
                </div>

                {/* 设置面板 */}
                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showSettings ? 'opacity-100 px-4 sm:px-6 py-2 h-auto mb-8' : 'opacity-0 px-0 py-0 h-0'}`}>
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50 rounded-lg p-3 shadow-sm">
                    {/* 响应式布局容器 */}
                    <div className="flex flex-wrap items-center gap-3 text-xs">
                      {/* 第一组：币种 */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Currency:</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'USD', label: '$' },
                            { value: 'CNY', label: '¥' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setData(prev => ({ ...prev, currency: option.value as 'USD' | 'CNY' }))}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                data.currency === option.value 
                                  ? 'bg-[#007AFF] text-white shadow-sm' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

                      {/* 第二组：Header */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Header:</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'none', label: 'None' },
                            { value: 'bilingual', label: 'CN+EN' },
                            { value: 'english', label: 'EN' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setData(prev => ({
                                ...prev,
                                templateConfig: {
                                  ...prev.templateConfig,
                                  headerType: option.value as 'none' | 'bilingual' | 'english'
                                }
                              }))}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                data.templateConfig.headerType === option.value 
                                  ? 'bg-[#007AFF] text-white shadow-sm' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

                      {/* 第三组：Type */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Type:</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'invoice', label: 'Invoice' },
                            { value: 'commercial', label: 'Commercial' },
                            { value: 'proforma', label: 'Proforma' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setData(prev => ({
                                ...prev,
                                templateConfig: {
                                  ...prev.templateConfig,
                                  invoiceType: option.value as 'invoice' | 'commercial' | 'proforma'
                                }
                              }))}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                data.templateConfig.invoiceType === option.value 
                                  ? 'bg-[#007AFF] text-white shadow-sm' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

                      {/* 第四组：Stamp */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Stamp:</span>
                        <div className="flex gap-1">
                          {[
                            { value: 'none', label: 'None' },
                            { value: 'shanghai', label: 'SH' },
                            { value: 'hongkong', label: 'HK' }
                          ].map((option) => (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => setData(prev => ({
                                ...prev,
                                templateConfig: {
                                  ...prev.templateConfig,
                                  stampType: option.value as 'none' | 'shanghai' | 'hongkong'
                                }
                              }))}
                              className={`px-2 py-1 rounded text-[11px] font-medium transition-all ${
                                data.templateConfig.stampType === option.value 
                                  ? 'bg-[#007AFF] text-white shadow-sm' 
                                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-[#007AFF]/40'
                              }`}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 分隔线 */}
                      <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

                      {/* 第五组：显示选项 */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Show:</span>
                        
                        {/* Bank */}
                        <label className="flex items-center gap-1 cursor-pointer p-1 -m-1 rounded min-h-[32px] touch-manipulation">
                          <input
                            type="checkbox"
                            checked={data.showBank}
                            onChange={e => setData(prev => ({ ...prev, showBank: e.target.checked }))}
                            className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
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
                          <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">Bank</span>
                        </label>
                        
                        {/* HS Code */}
                        <label className="flex items-center gap-1 cursor-pointer p-1 -m-1 rounded min-h-[32px] touch-manipulation">
                          <input
                            type="checkbox"
                            checked={data.showHsCode}
                            onChange={e => setData(prev => ({ ...prev, showHsCode: e.target.checked }))}
                            className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
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
                          <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">HS Code</span>
                        </label>
                        
                        {/* Description */}
                        <label className="flex items-center gap-1 cursor-pointer p-1 -m-1 rounded min-h-[32px] touch-manipulation">
                          <input
                            type="checkbox"
                            checked={data.showDescription}
                            onChange={e => setData(prev => ({ ...prev, showDescription: e.target.checked }))}
                            className="w-4 h-4 sm:w-3 sm:h-3 flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
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
                          <span className="text-gray-700 dark:text-gray-300 text-[11px] font-medium">Description</span>
                        </label>
                      </div>

                      {/* 分隔线 */}
                      <div className="hidden lg:block h-4 w-px bg-blue-300 dark:bg-blue-700"></div>

                      {/* 第六组：自定义单位 */}
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="text-blue-700 dark:text-blue-300 font-medium whitespace-nowrap">Units:</span>
                        
                        {/* 自定义单位输入 */}
                        <div className="flex items-center gap-2">
                          <div className="relative">
                            <input
                              type="text"
                              value={customUnit}
                              onChange={e => setCustomUnit(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddCustomUnit();
                                }
                              }}
                              placeholder="Add custom unit"
                              className="w-24 px-2 py-1 rounded text-[9px]
                                bg-white/90 dark:bg-[#1c1c1e]/90
                                border border-gray-200/30 dark:border-[#2c2c2e]/50
                                focus:outline-none focus:ring-1
                                focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                                text-gray-800 dark:text-gray-200
                                placeholder:text-gray-400 placeholder:text-[9px]"
                            />
                            {showUnitSuccess && (
                              <div className="absolute left-0 right-0 -bottom-5 text-center text-[9px] text-green-500 dark:text-green-400
                                animate-[fadeIn_0.2s_ease-in,fadeOut_0.2s_ease-out_1.8s]">
                                Added
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={handleAddCustomUnit}
                            className="px-2 py-1 rounded text-[9px] font-medium
                              bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                              hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                              text-[#007AFF] dark:text-[#0A84FF]"
                          >
                            +
                          </button>
                        </div>

                        {/* 已添加的自定义单位 */}
                        {(data.customUnits || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {(data.customUnits || []).map((unit, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded
                                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                                  text-[#007AFF] dark:text-[#0A84FF]
                                  text-[9px]"
                              >
                                <span>{unit}</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCustomUnit(index)}
                                  className="w-3 h-3 flex items-center justify-center
                                    hover:bg-[#007AFF]/20 dark:hover:bg-[#0A84FF]/20
                                    rounded-full text-[8px]"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 基本信息区域 - 左右两栏布局 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* 左侧：客户信息 */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                    <CustomerSection
                      to={data.to}
                      customerPO={data.customerPO}
                      onChange={({ to, customerPO }) => {
                        setData(prev => ({
                          ...prev,
                          to,
                          customerPO
                        }));
                      }}
                    />
                  </div>

                  {/* 右侧：发票号和日期 */}
                  <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-xl border border-gray-200/50 dark:border-gray-700/50 p-4">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Invoice No.
                        </label>
                        <input
                          type="text"
                          value={data.invoiceNo}
                          onChange={e => setData(prev => ({ ...prev, invoiceNo: e.target.value }))}
                          placeholder="Enter invoice number"
                          className={`${inputClassName} w-full [&::placeholder]:text-[#007AFF]/60 dark:[&::placeholder]:text-[#0A84FF]/60 ${
                            !data.invoiceNo 
                              ? 'border-[#007AFF]/50 dark:border-[#0A84FF]/50' 
                              : ''
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={data.date}
                          onChange={(e) => setData(prev => ({ ...prev, date: e.target.value }))}
                          className={`${inputClassName} w-full`}
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 商品表格 */}
                <ItemsTable
                  invoiceData={data}
                  setInvoiceData={setData}
                  updateLineItem={updateLineItem}
                  handleKeyDown={handleKeyDown}
                  handleDoubleClick={handleDoubleClick}
                  handleOtherFeeDoubleClick={handleOtherFeeDoubleClick}
                  customUnits={data.customUnits || []}
                />

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
                        const newFees = [...(data.otherFees || [])];
                        newFees.push({
                          id: Date.now(),
                          description: '',
                          amount: 0
                        });
                        setData(prev => ({ ...prev, otherFees: newFees }));
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
                        {data.currency === 'USD' ? '$' : '¥'}
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
                      {data.currency === 'USD' ? 'US DOLLARS ' : 'CHINESE YUAN '}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">{data.amountInWords.dollars}</span>
                    {data.amountInWords.hasDecimals && (
                      <>
                        <span className="text-red-500"> AND </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          {data.amountInWords.cents}
                        </span>
                      </>
                    )}
                    {!data.amountInWords.hasDecimals && (
                      <span className="text-gray-600 dark:text-gray-400"> ONLY</span>
                    )}
                  </div>
                </div>

                {/* 银行信息 */}
                {data.showBank && (
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
                          checked={data.showPaymentTerms}
                          onChange={(e) => {
                            setData(prev => ({
                              ...prev,
                              showPaymentTerms: e.target.checked
                            }));
                          }}
                          className="flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
                            checked:bg-[#007AFF] checked:border-[#007AFF] checked:dark:bg-[#0A84FF] checked:dark:border-[#0A84FF]
                            focus:ring-2 focus:ring-[#007AFF]/30 focus:ring-offset-1
                            relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                            before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                            checked:before:scale-100 before:transition-transform before:duration-200
                            w-4 h-4"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        />
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-gray-600 dark:text-gray-400">Full paid not later than</span>
                          <input
                            type="date"
                            value={data.paymentDate}
                            onChange={(e) => setData(prev => ({ 
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
                            pattern="\d{4}-\d{2}-\d{2}"
                          />
                          <span className="text-sm text-gray-600 dark:text-gray-400">by telegraphic transfer.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <textarea
                          value={data.additionalPaymentTerms}
                          onChange={(e) => setData(prev => ({
                            ...prev,
                            additionalPaymentTerms: e.target.value
                          }))}
                          placeholder="Enter additional remarks (each line will be a new payment term)"
                          className={`${inputClassName} min-h-[4em] resize dark:bg-[#1C1C1E]/90`}
                          rows={2}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={data.showInvoiceReminder}
                          onChange={e => setData(prev => ({ ...prev, showInvoiceReminder: e.target.checked }))}
                          className="flex-shrink-0 appearance-none border-2 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 
                            checked:bg-[#007AFF] checked:border-[#007AFF] checked:dark:bg-[#0A84FF] checked:dark:border-[#0A84FF]
                            focus:ring-2 focus:ring-[#007AFF]/30 focus:ring-offset-1
                            relative before:content-[''] before:absolute before:top-0.5 before:left-1 before:w-1 before:h-2 
                            before:border-r-2 before:border-b-2 before:border-white before:rotate-45 before:scale-0 
                            checked:before:scale-100 before:transition-transform before:duration-200
                            w-4 h-4"
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none'
                          }}
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Please state our invoice no. <span className="text-red-500 dark:text-red-400">&quot;{data.invoiceNo}&quot;</span> on your payment documents.
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
                        {isEditMode ? 'Save Changes & Generate' : 'Generate Invoice'}
                      </button>

                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // 准备预览数据，包装成历史记录格式
                        const previewData = {
                          id: editId || 'preview',
                          createdAt: new Date().toISOString(),
                          updatedAt: new Date().toISOString(),
                          customerName: data.to || 'Unknown',
                          invoiceNo: data.invoiceNo || 'N/A',
                          totalAmount: getTotalAmount(),
                          currency: data.currency,
                          data: data
                        };
                        
                        setPreviewItem(previewData);
                        setShowPreview(true);
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
                    Preview
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => {
          setShowPreview(false);
          setPreviewItem(null);
        }}
        item={previewItem}
        itemType="invoice"
      />

      <Footer />
    </div>
  );
}
