import { useMemo } from 'react';
import { usePurchaseStore } from './purchase.store';

// 获取合同金额数字
export const useContractAmountNumber = () => {
  const contractAmount = usePurchaseStore(s => s.data.contractAmount);
  
  return useMemo(() => {
    return parseFloat(contractAmount) || 0;
  }, [contractAmount]);
};

// 获取基础数据
export const usePurchaseData = () => usePurchaseStore(s => s.data);

// 获取UI状态
export const usePurchaseUI = () => {
  const isGenerating = usePurchaseStore(s => s.isGenerating);
  const showSettings = usePurchaseStore(s => s.showSettings);
  const editId = usePurchaseStore(s => s.editId);
  const showPreview = usePurchaseStore(s => s.showPreview);
  const generatingProgress = usePurchaseStore(s => s.generatingProgress);
  const isEditMode = usePurchaseStore(s => s.isEditMode);
  const previewItem = usePurchaseStore(s => s.previewItem);
  
  return {
    isGenerating,
    showSettings,
    editId,
    showPreview,
    generatingProgress,
    isEditMode,
    previewItem,
  };
};

// 获取供应商信息
export const useSupplierInfo = () => {
  const data = usePurchaseStore(s => s.data);
  
  return useMemo(() => ({
    attn: data.attn,
    yourRef: data.yourRef,
    supplierQuoteDate: data.supplierQuoteDate,
  }), [data.attn, data.yourRef, data.supplierQuoteDate]);
};

// 获取订单信息
export const useOrderInfo = () => {
  const data = usePurchaseStore(s => s.data);
  
  return useMemo(() => ({
    orderNo: data.orderNo,
    ourRef: data.ourRef,
    date: data.date,
  }), [data.orderNo, data.ourRef, data.date]);
};

// 获取合同信息
export const useContractInfo = () => {
  const data = usePurchaseStore(s => s.data);
  
  return useMemo(() => ({
    contractAmount: data.contractAmount,
    currency: data.currency,
    projectSpecification: data.projectSpecification,
  }), [data.contractAmount, data.currency, data.projectSpecification]);
};

// 获取付款条件
export const usePaymentTerms = () => usePurchaseStore(s => s.data.paymentTerms);

// 获取发票要求
export const useInvoiceRequirements = () => {
  const data = usePurchaseStore(s => s.data);
  
  return useMemo(() => ({
    invoiceRequirements: data.invoiceRequirements,
    showBank: data.showBank,
  }), [data.invoiceRequirements, data.showBank]);
};

// 获取交货信息
export const useDeliveryInfo = () => usePurchaseStore(s => s.data.deliveryInfo);

// 获取订单号码
export const useOrderNumbers = () => usePurchaseStore(s => s.data.orderNumbers);

// 获取采购员信息
export const usePurchaserInfo = () => usePurchaseStore(s => s.data.from);
