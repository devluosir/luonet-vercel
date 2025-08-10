import { useMemo } from 'react';
import { usePurchaseStore } from './purchase.store';
import type { PurchaseOrderData } from '@/types/purchase';

// ========== 原子选择器（仅返回原始切片/原始值，绝不在这里拼对象/数组） ==========
const useContractAmount = () => usePurchaseStore(s => s.data.contractAmount);
const useCurrency = () => usePurchaseStore(s => s.data.currency);
const useAttn = () => usePurchaseStore(s => s.data.attn);
const useYourRef = () => usePurchaseStore(s => s.data.yourRef);
const useSupplierQuoteDate = () => usePurchaseStore(s => s.data.supplierQuoteDate);
const useOrderNo = () => usePurchaseStore(s => s.data.orderNo);
const useOurRef = () => usePurchaseStore(s => s.data.ourRef);
const useDate = () => usePurchaseStore(s => s.data.date);
const useProjectSpecification = () => usePurchaseStore(s => s.data.projectSpecification);
const usePaymentTerms = () => usePurchaseStore(s => s.data.paymentTerms);
const useInvoiceRequirements = () => usePurchaseStore(s => s.data.invoiceRequirements);
const useShowBank = () => usePurchaseStore(s => s.data.showBank);
const useDeliveryInfo = () => usePurchaseStore(s => s.data.deliveryInfo);
const useOrderNumbers = () => usePurchaseStore(s => s.data.orderNumbers);
const useFrom = () => usePurchaseStore(s => s.data.from);

// 新格式选择器
const useDraftItems = () => usePurchaseStore(s => s.draft.items);
const useDraftSettings = () => usePurchaseStore(s => s.draft.settings);

// UI状态原子选择器
const useIsGenerating = () => usePurchaseStore(s => s.isGenerating);
const useShowSettings = () => usePurchaseStore(s => s.showSettings);
const useEditId = () => usePurchaseStore(s => s.editId);
const useShowPreview = () => usePurchaseStore(s => s.showPreview);
const useGeneratingProgress = () => usePurchaseStore(s => s.generatingProgress);
const useIsEditMode = () => usePurchaseStore(s => s.isEditMode);
const usePreviewItem = () => usePurchaseStore(s => s.previewItem);

// ========== 工具函数（纯函数，不依赖外部状态） ==========
function calcContractAmountNumber(contractAmount: string): number {
  return parseFloat(contractAmount) || 0;
}

// ========== 派生 Hook（在 hook 内用 useMemo 合成对象，稳定引用） ==========

// 获取合同金额数字
export const useContractAmountNumber = () => {
  const contractAmount = useContractAmount();
  
  return useMemo(() => calcContractAmountNumber(contractAmount), [contractAmount]);
};

// 获取基础数据
export const usePurchaseData = () => usePurchaseStore(s => s.data);

// 获取UI状态
export const usePurchaseUI = () => {
  const isGenerating = useIsGenerating();
  const showSettings = useShowSettings();
  const editId = useEditId();
  const showPreview = useShowPreview();
  const generatingProgress = useGeneratingProgress();
  const isEditMode = useIsEditMode();
  const previewItem = usePreviewItem();
  
  return useMemo(() => ({
    isGenerating,
    showSettings,
    editId,
    showPreview,
    generatingProgress,
    isEditMode,
    previewItem,
  }), [isGenerating, showSettings, editId, showPreview, generatingProgress, isEditMode, previewItem]);
};

// 获取供应商信息
export const useSupplierInfo = () => {
  const attn = useAttn();
  const yourRef = useYourRef();
  const supplierQuoteDate = useSupplierQuoteDate();
  
  return useMemo(() => ({
    attn,
    yourRef,
    supplierQuoteDate,
  }), [attn, yourRef, supplierQuoteDate]);
};

// 获取订单信息
export const useOrderInfo = () => {
  const orderNo = useOrderNo();
  const ourRef = useOurRef();
  const date = useDate();
  
  return useMemo(() => ({
    orderNo,
    ourRef,
    date,
  }), [orderNo, ourRef, date]);
};

// 获取合同信息
export const useContractInfo = () => {
  const contractAmount = useContractAmount();
  const currency = useCurrency();
  const projectSpecification = useProjectSpecification();
  
  return useMemo(() => ({
    contractAmount,
    currency,
    projectSpecification,
  }), [contractAmount, currency, projectSpecification]);
};

// 获取发票要求
export const useInvoiceRequirementsInfo = () => {
  const invoiceRequirements = useInvoiceRequirements();
  const showBank = useShowBank();
  
  return useMemo(() => ({
    invoiceRequirements,
    showBank,
  }), [invoiceRequirements, showBank]);
};

// 获取交货信息
export const useDeliveryInfoData = () => useDeliveryInfo();

// 获取订单号码
export const useOrderNumbersData = () => useOrderNumbers();

// 获取采购员信息
export const usePurchaserInfo = () => useFrom();

// 获取订单汇总信息（新格式）
export const useTotals = () => {
  const items = useDraftItems();
  
  return useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
    const count = items.length;
    
    return {
      subtotal,
      count
    };
  }, [items]);
};

// ========== 新增：PDF相关选择器 ==========

// 检查是否可以生成PDF
export const useCanGeneratePdf = () => {
  const attn = useAttn();
  const contractAmount = useContractAmount();
  
  return useMemo(() => {
    const hasSupplier = attn.trim().length > 0;
    const hasAmount = parseFloat(contractAmount) > 0;
    return hasSupplier && hasAmount;
  }, [attn, contractAmount]);
};

// 获取PDF负载数据（不包含时间戳，时间戳在生成时添加）
export const usePdfPayload = () => {
  const data = usePurchaseData();
  const contractAmountNumber = useContractAmountNumber();
  
  return useMemo(() => {
    return {
      ...data,
      contractAmountNumber,
    };
  }, [data, contractAmountNumber]);
};

// ========== 新增：验证状态选择器 ==========

// 获取表单验证状态
export const useValidationState = () => {
  const attn = useAttn();
  const contractAmount = useContractAmount();
  const orderNo = useOrderNo();
  
  return useMemo(() => {
    const errors: string[] = [];
    
    if (!attn.trim()) {
      errors.push('供应商名称不能为空');
    }
    
    if (!contractAmount || parseFloat(contractAmount) <= 0) {
      errors.push('合同金额必须大于0');
    }
    
    if (!orderNo.trim()) {
      errors.push('订单号不能为空');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }, [attn, contractAmount, orderNo]);
};
