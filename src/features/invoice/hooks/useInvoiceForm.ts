'use client';

import { useEffect, useMemo } from 'react';
import { useInvoiceStore } from '../state/invoice.store';
import { calculateAmount, calculatePaymentDate, numberToWords } from '../utils/calculations';

/**
 * 发票表单逻辑Hook
 */
export const useInvoiceForm = () => {
  const {
    data,
    updateData,
    updateLineItem,
    setFocusedCell
  } = useInvoiceStore();

  // 使用useMemo优化计算，避免不必要的重新计算
  const totalAmount = useMemo(() => {
    return data.items.reduce((total, item) => total + item.amount, 0) +
           data.otherFees.reduce((total, fee) => total + fee.amount, 0);
  }, [data.items, data.otherFees]);

  // 优化金额大写计算
  const amountInWords = useMemo(() => {
    return numberToWords(totalAmount);
  }, [totalAmount]);

  // 优化付款日期计算
  const paymentDate = useMemo(() => {
    return calculatePaymentDate(data.date || new Date().toISOString().split('T')[0]);
  }, [data.date]);

  // 初始化表单
  useEffect(() => {
    // 设置默认付款日期
    if (!data.paymentDate) {
      updateData({ paymentDate });
    }
  }, [data.paymentDate, paymentDate, updateData]);

  // 自动计算金额
  useEffect(() => {
    const newItems = data.items.map(item => ({
      ...item,
      amount: calculateAmount(item.quantity, item.unitPrice)
    }));
    
    // 只有当金额实际发生变化时才更新
    const hasChanges = newItems.some((item, index) => 
      item.amount !== data.items[index]?.amount
    );
    
    if (hasChanges) {
      updateData({ items: newItems });
    }
  }, [data.items, updateData]);

  // 更新金额大写
  useEffect(() => {
    updateData({ amountInWords });
  }, [amountInWords, updateData]);

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 表单提交逻辑
  };

  // 处理输入变化
  const handleInputChange = (field: keyof typeof data, value: any) => {
    updateData({ [field]: value });
  };

  // 处理商品行变化
  const handleLineItemChange = (index: number, field: keyof typeof data.items[0], value: any) => {
    updateLineItem(index, field, value);
  };

  // 处理焦点单元格
  const handleCellFocus = (row: number, column: string) => {
    setFocusedCell({ row, column });
  };

  // 处理单元格失焦
  const handleCellBlur = () => {
    setFocusedCell(null);
  };

  return {
    totalAmount,
    amountInWords,
    paymentDate,
    handleSubmit,
    handleInputChange,
    handleLineItemChange,
    handleCellFocus,
    handleCellBlur
  };
};
