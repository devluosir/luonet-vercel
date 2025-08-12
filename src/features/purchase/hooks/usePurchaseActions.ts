import { useCallback, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePurchaseStore } from '../state/purchase.store';
import { savePurchaseHistory } from '@/utils/purchaseHistory';
import { useToast } from '@/components/ui/Toast';
import { usePurchasePdfGenerator } from '@/hooks/usePdfGenerator';
import { useAutoSave } from '@/hooks/useAutoSave';
import type { PurchaseOrderData } from '@/types/purchase';

interface CustomWindow extends Window {
  __PURCHASE_DATA__?: PurchaseOrderData;
  __EDIT_MODE__?: boolean;
  __EDIT_ID__?: string;
}

// 初始化逻辑
export const usePurchaseInit = () => {
  const { data: session } = useSession();
  const { data, editId, init, updateData, setPageMode } = usePurchaseStore();
  const initializedRef = useRef(false);
  
  // 初始化数据 - 只执行一次
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    
    // 清除旧的localStorage数据以确保使用新版本
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('purchase-draft-v5');
      } catch (e) {
        // 忽略错误
      }
    }
    
    const win = window as CustomWindow;
    
    // 优先使用全局数据（编辑模式）
    if (win.__PURCHASE_DATA__) {
      const sanitizedData: PurchaseOrderData = {
        ...win.__PURCHASE_DATA__,
        attn: win.__PURCHASE_DATA__.attn || '',
        yourRef: win.__PURCHASE_DATA__.yourRef || '',
        supplierQuoteDate: win.__PURCHASE_DATA__.supplierQuoteDate || (typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01'),
      };
      
      init(sanitizedData);
      setPageMode('edit'); // 设置编辑模式
      
      // 清理全局变量
      delete win.__PURCHASE_DATA__;
      delete win.__EDIT_ID__;
      delete win.__EDIT_MODE__;
      return;
    }

    // 其次使用草稿数据（新建模式）
    if (typeof window !== 'undefined') {
      try {
        const draft = localStorage.getItem('draftPurchase');
        if (draft) {
          const parsed = JSON.parse(draft);
          
          // 验证数据格式
          if (parsed && typeof parsed === 'object') {
            const sanitizedDraft: PurchaseOrderData = {
              ...parsed,
              attn: parsed.attn || '',
              yourRef: parsed.yourRef || '',
              supplierQuoteDate: parsed.supplierQuoteDate || (typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01'),
              // 确保所有必需字段都有默认值
              orderNo: parsed.orderNo || '',
              ourRef: parsed.ourRef || '',
              date: parsed.date || (typeof window !== 'undefined' ? new Date().toISOString().split('T')[0] : '2024-01-01'),
              contractAmount: parsed.contractAmount || '',
              projectSpecification: parsed.projectSpecification || '',
              paymentTerms: parsed.paymentTerms || '交货后30天',
              invoiceRequirements: parsed.invoiceRequirements || '如前；',
              deliveryInfo: parsed.deliveryInfo || '',
              orderNumbers: parsed.orderNumbers || '',
              showStamp: parsed.showStamp || false,
              showBank: parsed.showBank || false,
              currency: parsed.currency || 'CNY',
              stampType: parsed.stampType || 'none',
              from: parsed.from || '',
            };
            init(sanitizedDraft);
            return;
          }
        }
      } catch (error) {
        console.warn('读取草稿失败:', error);
        // 清除损坏的草稿数据
        try {
          localStorage.removeItem('draftPurchase');
        } catch (e) {
          console.warn('清除损坏草稿失败:', e);
        }
      }
    }

    // 最后使用默认数据
    init();
    setPageMode('create'); // 设置创建模式
  }, [init, setPageMode]); // 依赖 init 和 setPageMode 函数

  // 设置用户信息
  useEffect(() => {
    let userName = '';
    if (session?.user?.name) {
      userName = session.user.name;
    } else if (session?.user?.username) {
      userName = session.user.username;
    } else {
      try {
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const user = JSON.parse(userInfo);
          userName = user.username || '';
        } else {
          userName = localStorage.getItem('username') || '';
        }
      } catch (error) {
        console.warn('获取用户信息失败:', error);
      }
    }
    
    // 格式化用户名
    if (userName) {
      const formattedUser = userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase();
      
      // 如果from字段为空或者是默认值Roger，则更新为当前用户
      if (!data.from || data.from === 'Roger') {
        updateData({ from: formattedUser });
      }
    }
  }, [session, data.from, updateData]);
};

// 自动保存逻辑
export const usePurchaseAutoSave = () => {
  const { data, editId } = usePurchaseStore();
  
  const { clearSaved } = useAutoSave({
    data,
    key: 'draftPurchase',
    delay: 2000,
    enabled: !editId
  });
  
  return { clearSaved };
};

// PDF生成逻辑
export const usePurchasePdfActions = () => {
  const { 
    data, 
    editId, 
    isGenerating, 
    generatingProgress,
    setIsGenerating, 
    setGeneratingProgress, 
    setEditId, 
    setIsEditMode 
  } = usePurchaseStore();
  
  const { showToast } = useToast();
  const { generate: generatePdf } = usePurchasePdfGenerator();
  const { clearSaved } = usePurchaseAutoSave();

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setGeneratingProgress(10);
    let progressInterval: NodeJS.Timeout | undefined;
    
    try {
      // 启动进度条动画
      progressInterval = setInterval(() => {
        const currentProgress = usePurchaseStore.getState().generatingProgress;
        const increment = Math.max(1, (90 - currentProgress) / 10);
        const newProgress = currentProgress >= 90 ? currentProgress : currentProgress + increment;
        setGeneratingProgress(newProgress);
      }, 100);

      // 并行执行保存和PDF生成
      const [saveResult] = await Promise.all([
        savePurchaseHistory(data, editId),
        new Promise(resolve => setTimeout(resolve, 100))
      ]);

      setGeneratingProgress(50);

      if (saveResult && !editId) {
        setEditId(saveResult.id);
        setIsEditMode(true);
      }

      setGeneratingProgress(80);

      // 生成PDF
      const blob = await generatePdf(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PO_${data.orderNo || 'new'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      // 生成成功后清除草稿
      clearSaved();
      showToast('PDF生成成功', 'success');
      
      // 进度条完成
      if (progressInterval) clearInterval(progressInterval);
      setGeneratingProgress(100);
      setTimeout(() => setGeneratingProgress(0), 500);
    } catch (err) {
      console.error('生成PDF失败:', err);
      showToast('PDF生成失败，请重试', 'error');
      if (progressInterval) clearInterval(progressInterval);
      setGeneratingProgress(0);
    } finally {
      setIsGenerating(false);
    }
  }, [data, editId, setIsGenerating, setGeneratingProgress, setEditId, setIsEditMode, generatePdf, clearSaved, showToast]);

  const handlePreview = useCallback(async () => {
    const { setShowPreview, setPreviewItem } = usePurchaseStore.getState();
    
    try {
      const contractAmountNumber = parseFloat(data.contractAmount) || 0;
      
      // 准备预览数据
      const previewData = {
        id: editId || 'preview',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        supplierName: data.from || 'Unknown',
        orderNo: data.orderNo || 'N/A',
        totalAmount: contractAmountNumber,
        currency: data.currency,
        data: data
      };
      
      setPreviewItem(previewData);
      setShowPreview(true);
    } catch (err) {
      console.error('Preview failed:', err);
      showToast('预览PDF失败', 'error');
    }
  }, [data, editId, showToast]);

  return {
    handleGenerate,
    handlePreview,
    isGenerating,
    generatingProgress,
  };
};

// 金额处理逻辑
export const useAmountHandling = () => {
  const { updateData } = usePurchaseStore();
  
  const handleAmountBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      updateData({ contractAmount: amount.toFixed(2) });
    }
  }, [updateData]);
  
  return { handleAmountBlur };
};
