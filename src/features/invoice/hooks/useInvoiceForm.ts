import { useEffect, useCallback } from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { InvoiceData } from '../types';
import { calculatePaymentDate, numberToWords, getTotalAmount } from '../utils/calculations';

interface CustomWindow extends Window {
  __INVOICE_DATA__?: InvoiceData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

/**
 * 发票表单Hook
 */
export const useInvoiceForm = () => {
  const {
    data,
    isEditMode,
    editId,
    updateData,
    initialize,
    focusedCell,
    setFocusedCell
  } = useInvoiceStore();

  // 初始化表单数据
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const customWindow = window as unknown as CustomWindow;
      if (customWindow.__INVOICE_DATA__) {
        initialize(customWindow.__INVOICE_DATA__);
      }
      if (customWindow.__EDIT_MODE__ !== undefined) {
        // 这里可以通过store的setter来设置编辑模式
      }
      if (customWindow.__EDIT_ID__ !== undefined) {
        // 这里可以通过store的setter来设置编辑ID
      }

      // 清理全局变量
      delete customWindow.__INVOICE_DATA__;
      delete customWindow.__EDIT_MODE__;
      delete customWindow.__EDIT_ID__;
    }
  }, [initialize]);

  // 自动计算付款日期
  useEffect(() => {
    if (data.date) {
      const newPaymentDate = calculatePaymentDate(data.date);
      updateData({ paymentDate: newPaymentDate });
    }
  }, [data.date, updateData]);

  // 自动计算英文大写金额
  useEffect(() => {
    const total = getTotalAmount(data.items, data.otherFees);
    const words = numberToWords(total);
    updateData({ amountInWords: words });
  }, [data.items, data.otherFees, updateData]);

  // 焦点单元格管理
  useEffect(() => {
    if (focusedCell) {
      const element = document.querySelector(
        `[data-row="${focusedCell.row}"][data-column="${focusedCell.column}"]`
      ) as HTMLElement;
      if (element) {
        element.focus();
      }
    }
  }, [focusedCell]);

  // 处理表单提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // 表单提交逻辑在store中处理
  }, []);

  // 处理输入变化
  const handleInputChange = useCallback((field: keyof InvoiceData, value: any) => {
    updateData({ [field]: value });
  }, [updateData]);

  // 处理日期变化
  const handleDateChange = useCallback((date: string) => {
    updateData({ date });
  }, [updateData]);

  // 处理币种变化
  const handleCurrencyChange = useCallback((currency: 'USD' | 'CNY') => {
    updateData({ currency });
  }, [updateData]);

  // 处理模板配置变化
  const handleTemplateConfigChange = useCallback((config: Partial<InvoiceData['templateConfig']>) => {
    updateData({
      templateConfig: { ...data.templateConfig, ...config }
    });
  }, [data.templateConfig, updateData]);

  // 处理显示选项变化
  const handleDisplayOptionChange = useCallback((option: keyof Pick<InvoiceData, 'showHsCode' | 'showDescription' | 'showBank'>, value: boolean) => {
    updateData({ [option]: value });
  }, [updateData]);

  return {
    data,
    isEditMode,
    editId,
    focusedCell,
    setFocusedCell,
    handleSubmit,
    handleInputChange,
    handleDateChange,
    handleCurrencyChange,
    handleTemplateConfigChange,
    handleDisplayOptionChange
  };
};
