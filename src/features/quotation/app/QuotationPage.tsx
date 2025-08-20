'use client';

import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { unstable_batchedUpdates as batch } from 'react-dom';
import { useQuotationStore } from '../state/useQuotationStore';
import { sel } from '../state/selectors';
import { isAllowedSettingsKey, SETTINGS_ALLOWED_KEYS } from '../constants/settings-allowed-keys';
import { smartEqual, hasChanged } from '../utils/smartEquality';
// 移除选择器导入，直接使用store
import { useInitQuotation } from '../hooks/useInitQuotation';
import { useClipboardImport } from '../hooks/useClipboardImport';
import { useAutoSave } from '@/hooks/useAutoSave';
import { getInitialQuotationData } from '@/utils/quotationInitialData';
import { useToast } from '@/components/ui/Toast';
import { numberToWords } from '@/utils/quotationCalculations';
import type { QuotationData, LineItem, OtherFee } from '@/types/quotation';
import { saveOrUpdate } from '../services/quotation.service';
import { useGenerateService } from '../services/generate.service';
import { downloadPdf } from '../services/generate.service';
import { buildPreviewPayload } from '../services/preview.service';
import { exportQuotationToExcel, exportSalesConfirmationToExcel } from '../services/excel.service';
import { recordCustomerUsage } from '@/utils/customerUsageTracker';
import { usePdfWarmup } from '@/hooks/usePdfWarmup';


// 动态导入组件
import dynamic from 'next/dynamic';

// 动态导入PDF预览组件
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { 
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-64"></div>,
  suspense: false
});

// 动态导入PaymentTermsSection
const DynamicPaymentTermsSection = dynamic(() => import('@/components/quotation/PaymentTermsSection').then(mod => ({ default: mod.PaymentTermsSection })), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 dark:bg-gray-700 rounded-lg h-8"></div>,
  suspense: false
});

// 导入现有组件
import { TabButton } from '@/components/quotation/TabButton';
import { CustomerInfoCompact } from '@/components/quotation/CustomerInfoCompact';
import { ItemsTable } from '@/components/quotation/ItemsTable';
import { NotesSection } from '../components/NotesSection';
import { SettingsPanel } from '@/components/quotation/SettingsPanel';
import { ImportDataButton } from '@/components/quotation/ImportDataButton';
import { PasteDialog } from '@/components/quotation/PasteDialog';
import { Footer } from '@/components/Footer';
import { Clipboard, History, Save, Settings, Download, Eye, FileSpreadsheet } from 'lucide-react';



export default function QuotationPage() {
  const pathname = usePathname();
  const { showToast } = useToast();
  
  // 性能调试开关（开发模式）
  if (process.env.NODE_ENV === 'development') {
    // 可选：启用why-did-you-render
    // import('why-did-you-render').then(({ default: wdyr }) => {
    //   wdyr(React, { trackAllPureComponents: true });
    // });
  }
  
  // 使用选择器工具带，简洁且类型安全
  // 状态 selectors
  const activeTab = useQuotationStore(sel.tab);
  const data = useQuotationStore(sel.data);
  const editId = useQuotationStore(sel.editId);
  const isGenerating = useQuotationStore(sel.isGenerating);
  const generatingProgress = useQuotationStore(sel.generatingProgress);
  const isPreviewing = useQuotationStore(sel.isPreviewing);
  const previewProgress = useQuotationStore(sel.previewProgress);
  const showSettings = useQuotationStore(sel.showSettings);
  const showPreview = useQuotationStore(sel.showPreview);
  const isPasteDialogOpen = useQuotationStore(sel.isPasteDialogOpen);
  const previewItem = useQuotationStore(sel.previewItem);
  const notesConfig = useQuotationStore(sel.notesConfig);
  
  // 原子字段 selectors（用于优化依赖）
  const from = useQuotationStore(sel.from);
  const currency = useQuotationStore(sel.currency);
  
  // Action selectors（actions是稳定引用）
  const setTab = useQuotationStore(sel.setTab);
  const setEditId = useQuotationStore(sel.setEditId);
  const setGenerating = useQuotationStore(sel.setGenerating);
  const setProgress = useQuotationStore(sel.setProgress);
  const setPreviewing = useQuotationStore(sel.setPreviewing);
  const setPreviewProgress = useQuotationStore(sel.setPreviewProgress);
  const setShowSettings = useQuotationStore(sel.setShowSettings);
  const setShowPreview = useQuotationStore(sel.setShowPreview);
  const setPasteDialogOpen = useQuotationStore(sel.setPasteDialogOpen);
  const setPreviewItem = useQuotationStore(sel.setPreviewItem);
  const updateItems = useQuotationStore(sel.updateItems);
  const updateOtherFees = useQuotationStore(sel.updateOtherFees);
  const _updateData = useQuotationStore(sel.updateData);
  const updateFrom = useQuotationStore(sel.updateFrom);
  const _updateCurrency = useQuotationStore(sel.updateCurrency);
  const updateFromField = useQuotationStore(sel.updateFromField);
  const updateCurrency = useMemo(() => _updateCurrency ?? (() => {}), [_updateCurrency]); // 空函数兜底
  
  // 页面级白名单：覆盖Items & CustomerInfo & AutoSave等所有入口
  const PAGE_ALLOWED_KEYS = useMemo(() => {
    const pageKeys = new Set<string>([
      // 商品信息
      'items', 'otherFees',
      // 客户信息（客户选择只应修改这些字段）
      'to', 'address', 'contact', 'email', 'phone',
      // 单据信息
      'inquiryNo', 'quotationNo', 'contractNo', 'date',
      // 其他必要字段
      'notes', 'currency', 'from', 'amountInWords', 'paymentDate',
      // 支付条款字段
      'additionalPaymentTerms',
      // 显示控制字段
      'showBank', 'showStamp'
    ]);
    
    // 合并 SETTINGS_ALLOWED_KEYS
    SETTINGS_ALLOWED_KEYS.forEach(key => pageKeys.add(key));
    
    return pageKeys;
  }, []);

  // 页面层保险丝：拦截超大补丁 + 白名单过滤
  const updateData = useCallback((patch: Partial<QuotationData>) => {
    if (!patch) return;

    // 白名单过滤
    const filtered = Object.fromEntries(
      Object.entries(patch).filter(([k]) => PAGE_ALLOWED_KEYS.has(k as keyof QuotationData))
    );

    if (process.env.NODE_ENV === 'development') {
      const originalKeys = Object.keys(patch);
      const filteredKeys = Object.keys(filtered);
      const dropped = originalKeys.filter(k => !PAGE_ALLOWED_KEYS.has(k as keyof QuotationData));
      
      if (dropped.length > 0) {
        console.warn('[Guard] Dropped unknown page patch keys:', dropped);
      }
      
      if (filteredKeys.length > 8) {
        console.warn('[Guard] Large patch at page adapter (after filtering)', {
          originalKeys,
          filteredKeys,
          droppedKeys: dropped,
          caller: 'page-adapter'
        });
      }
    }

    _updateData(filtered);
  }, [_updateData, PAGE_ALLOWED_KEYS]);

  // Items表格专用适配器：拒绝整包，只写items字段
  const handleItemsChange = useCallback((
    nextItems: LineItem[] | ((prev: LineItem[]) => LineItem[])
  ) => {
    if (typeof nextItems === 'function') {
      // 支持函数式更新
      const prevItems = data.items ?? [];
      const computed = nextItems(prevItems);
      updateItems(computed);
    } else {
      updateItems(nextItems);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[handleItemsChange] 更新items数组', { 
        count: Array.isArray(nextItems) ? nextItems.length : 'function' 
      });
    }
  }, [data.items, updateItems]);

  // OtherFees表格专用适配器：拒绝整包，只写otherFees字段  
  const handleOtherFeesChange = useCallback((
    nextFees: OtherFee[] | ((prev: OtherFee[]) => OtherFee[])
  ) => {
    if (typeof nextFees === 'function') {
      // 支持函数式更新
      const prevFees = data.otherFees ?? [];
      const computed = nextFees(prevFees);
      updateOtherFees(computed);
    } else {
      updateOtherFees(nextFees);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[handleOtherFeesChange] 更新otherFees数组', { 
        count: Array.isArray(nextFees) ? nextFees.length : 'function' 
      });
    }
  }, [data.otherFees, updateOtherFees]);
  
  // 初始化
  useInitQuotation();
  
  // 客户端渲染时更新from字段
  useEffect(() => {
    if (typeof window !== 'undefined') {
      updateFromField();
    }
  }, [updateFromField]);
  
  // PDF生成服务
  const { generatePdf } = useGenerateService();
  
  // PDF预热（自动执行，无需手动调用）
  usePdfWarmup();
  
  // 使用选择器工具带的派生选择器，避免重复计算
  const itemsTotal = useQuotationStore(sel.itemsTotal);
  const feesTotal = useQuotationStore(sel.feesTotal);
  const totalAmount = useMemo(() => 
    itemsTotal + feesTotal, 
    [itemsTotal, feesTotal]
  );
  const currencySymbol = useMemo(() => 
    currency === 'USD' ? '$' : currency === 'EUR' ? '€' : '¥', 
    [currency]
  );
  
  // 剪贴板导入
  const { handleClipboardButtonClick, handleGlobalPaste } = useClipboardImport();
  
  // 自动保存 - 传序列化后的数据，避免引用抖动
  const { clearSaved: clearAutoSave } = useAutoSave({
    data: JSON.stringify({
      ...data ?? getInitialQuotationData(),
      notesConfig
    }),
    key: 'draftQuotation',
    delay: 2000,
    enabled: !editId
  });
  
  // 处理标签切换 - 同值不set，减少无谓渲染
  const handleTabChange = useCallback((tab: 'quotation' | 'confirmation') => {
    if (activeTab === tab) return;
    setTab(tab);
  }, [activeTab, setTab]);

  // 去重限频的notes警告
  const warnedNotesRef = useRef(false);
  const pendingPatchRef = useRef<Partial<QuotationData> | null>(null);
  
  // 清理notes并发出警告（去重限频）
  const guardNotes = useCallback((patch: Partial<QuotationData>) => {
    if (!('notes' in patch)) return;
    delete (patch as Record<string, unknown>).notes;
    if (process.env.NODE_ENV === 'development' && !warnedNotesRef.current) {
      console.debug('[Guard] UI should not pass `notes` in SettingsPanel.onChange (正确阻断，降噪显示)');
      warnedNotesRef.current = true;
    }
  }, []);

  // 单帧合并的补丁刷新
  const flushPendingPatch = useCallback(() => {
    if (!pendingPatchRef.current) return;
    
    const patch = pendingPatchRef.current;
    pendingPatchRef.current = null;

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleSettingsChange] flushing batch:', patch);
    }

    // 清理notes
    guardNotes(patch);

    // 专用字段优先处理
    if (typeof patch.from === 'string' && !smartEqual(patch.from, from, 'from')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateFrom]', patch.from);
      }
      updateFrom(patch.from);
    }
    
    if (patch.currency && !smartEqual(patch.currency, currency, 'currency')) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateCurrency]', patch.currency);
      }
      updateCurrency(patch.currency);
    }

    // 过滤剩余字段：仅白名单 + 真变更 + 排除已处理字段
    const { from: patchFrom, currency: patchCurrency, notes, ...rest } = patch;
    const restFiltered = Object.fromEntries(
      Object.entries(rest)
        .filter(([key]) => isAllowedSettingsKey(key))
        .filter(([key, value]) => hasChanged(value, (data as any)[key], key))
    );

    if (Object.keys(restFiltered).length > 0) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[updateData] filtered keys:', Object.keys(restFiltered));
      }
      updateData(restFiltered);
    }
  }, [from, currency, data, updateFrom, updateCurrency, updateData, guardNotes]);

  // 严控入口的设置变更处理器
  const handleSettingsChange = useCallback((patch: Partial<QuotationData>) => {
    if (!patch || Object.keys(patch).length === 0) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[handleSettingsChange] received:', {
        keys: Object.keys(patch),
        allowedKeys: Object.keys(patch).filter(isAllowedSettingsKey),
        rejectedKeys: Object.keys(patch).filter(k => !isAllowedSettingsKey(k))
      });
    }

    // 合并到单帧队列
    pendingPatchRef.current = { ...(pendingPatchRef.current || {}), ...patch };
    
    // 用rAF汇聚多次onChange，配合React批处理
    requestAnimationFrame(() => {
      batch(() => flushPendingPatch());
    });
  }, [flushPendingPatch]);
  
  // 处理保存
  const handleSave = async () => {
    if (!data) return;

    try {
                   const result = await saveOrUpdate(activeTab, data, notesConfig, editId);
      if (result) {
        if (!editId) {
          setEditId(result.id);
        }
        clearAutoSave();
        showToast('保存成功', 'success');
      }
    } catch (error) {
      console.error('Error saving:', error);
      showToast('保存失败，请重试', 'error');
    }
  };
  
  // 合并模式状态 - 分别管理两列
  const [descriptionMergeMode, setDescriptionMergeMode] = useState<'auto' | 'manual'>('auto');
  const [remarksMergeMode, setRemarksMergeMode] = useState<'auto' | 'manual'>('auto');
  
  // 手动合并数据状态
  const [manualMergedCells, setManualMergedCells] = useState<{
    description: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
    remarks: Array<{
      startRow: number;
      endRow: number;
      content: string;
      isMerged: boolean;
    }>;
  }>({
    description: [],
    remarks: []
  });

  // 调试日志：监听手动合并数据变化 - 添加去重逻辑
  const lastMergeRef = useRef<{remarks: any[]; description: any[]}>({remarks:[], description:[]});

  const handleManualMergeChange = useCallback((next: typeof manualMergedCells) => {
    const prev = lastMergeRef.current;
    if (JSON.stringify(prev) === JSON.stringify(next)) return; // 相等就不setState
    lastMergeRef.current = next;
    setManualMergedCells(next);
    if (process.env.NODE_ENV === 'development') {
      console.log('[QuotationPage] 手动合并数据更新:', next);
    }
  }, []);

  // 处理生成PDF
  const handleGenerate = async () => {
    if (!data) return;

    setGenerating(true);
    setProgress(5);

    try {
      // 并行执行保存和PDF生成，去掉无意义的100ms延迟
      const [saveResult, pdfBlob] = await Promise.all([
        saveOrUpdate(activeTab, data, notesConfig, editId),
        generatePdf(activeTab, data, notesConfig, setProgress, { 
          mode: 'final', 
          descriptionMergeMode,
          remarksMergeMode,
          manualMergedCells
        })
      ]);

      if (saveResult && !editId) {
        setEditId(saveResult.id);
      }

      // 记录使用情况
      const documentNo = activeTab === 'confirmation' 
        ? (data.contractNo || data.quotationNo) 
        : data.quotationNo;
      if (documentNo) {
        recordCustomerUsage(data.to.split('\n')[0].trim(), activeTab, documentNo);
      }

      downloadPdf(pdfBlob, activeTab, data);

      // 生成成功后清除草稿
      clearAutoSave();
      showToast('PDF生成成功', 'success');

    } catch (error) {
      console.error('Error generating PDF:', error);
      showToast('PDF生成失败，请重试', 'error');
    } finally {
      setGenerating(false);
      setProgress(0);
    }
  };
  
  // 处理预览
  const handlePreview = async () => {
    if (!data) return;

    setPreviewing(true);
    setPreviewProgress(0);

    try {
      setPreviewProgress(10); // 开始准备资源
      console.log('开始预览PDF生成...');
      
      let pdfUrl: string;
      
      // 第一阶段：PDF生成核心（service层已包含监控，避免重复）
      const blob = await generatePdf(activeTab, data, notesConfig, (progress) => {
        // 将生成进度映射到预览进度（10-80%）
        const mappedProgress = 10 + (progress * 0.7);
        setPreviewProgress(mappedProgress);
      }, { 
        mode: 'preview', 
        descriptionMergeMode,
        remarksMergeMode,
        manualMergedCells
      });
      
      setPreviewProgress(80); // PDF生成完成，开始挂载预览
      
      // 第二阶段：预览挂载（独立监控，阈值1200ms）
      const { monitorPreviewMount } = await import('@/utils/performance');
      await monitorPreviewMount('setup', async () => {
        // 先清空预览状态，避免布局抖动
        setPreviewItem(null);
        setShowPreview(false);
        
        // 创建预览URL
        pdfUrl = URL.createObjectURL(blob);
        
        // 使用requestAnimationFrame优化UI更新
        await new Promise<void>(resolve => {
          requestAnimationFrame(() => {
            const previewData = {
              ...buildPreviewPayload(activeTab, data, editId, totalAmount),
              pdfUrl // 使用URL而不是blob，避免大对象传递
            };
            
            setPreviewItem(previewData);
            setShowPreview(true);
            resolve();
          });
        });
      });
      
      setPreviewProgress(100); // 完成
      showToast('预览生成成功', 'success');
    } catch (error) {
      console.error('Error previewing PDF:', error);
      showToast('预览失败，请重试', 'error');
    } finally {
      setPreviewing(false);
      setPreviewProgress(0);
    }
  };
  
  // 处理Excel导出
  const handleExportExcel = () => {
    if (!data) return;
    
    try {
      if (activeTab === 'confirmation') {
        exportSalesConfirmationToExcel(data);
      } else {
        exportQuotationToExcel(data, activeTab);
      }
      showToast('Excel导出成功', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      showToast('Excel导出失败，请重试', 'error');
    }
  };

  // 处理表单提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerate();
  };


  
  // 守卫：等待数据初始化完成
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#007AFF] dark:border-[#0A84FF]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
          {/* 返回按钮 */}
          <Link 
            href={
              pathname?.includes('/edit/') ? `/history?tab=${activeTab}` : 
              pathname?.includes('/copy/') ? `/history?tab=${activeTab}` : 
              '/dashboard'
            } 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 标签切换 */}
          <div className="flex justify-center gap-1.5 sm:gap-3 mt-3 sm:mt-4 mb-4 sm:mb-6">
            <TabButton 
              active={activeTab === 'quotation'}
              onClick={() => handleTabChange('quotation')}
            >
              Quotation
            </TabButton>
            <TabButton 
              active={activeTab === 'confirmation'}
              onClick={() => handleTabChange('confirmation')}
            >
              Order Confirmation
            </TabButton>
          </div>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg">
            <form onSubmit={handleSubmit}>
              {/* 标题和设置按钮 */}
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
                    Generate {activeTab === 'quotation' ? 'Quotation' : 'Order'}
                  </h1>
                  <button
                    type="button"
                    onClick={handleClipboardButtonClick}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Paste from clipboard"
                  >
                    <Clipboard className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {/* HK Stamp按钮 - 仅在确认订单模式显示 */}
                  {activeTab === 'confirmation' && (
                    <button
                      type="button"
                      onClick={() => updateData({ showStamp: !data.showStamp })}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        data.showStamp
                          ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                      title="在PDF中添加香港印章"
                    >
                      <span className={`w-2 h-2 rounded-full ${data.showStamp ? 'bg-purple-500' : 'bg-gray-400'}`}></span>
                      HK Stamp
                    </button>
                  )}
                  <Link
                    href={`/history?tab=${activeTab}`}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="历史记录"
                  >
                    <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </Link>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                    title={editId ? '保存修改' : '保存新记录'}
                  >
                    <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    onClick={handleExportExcel}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="导出Excel"
                  >
                    <FileSpreadsheet className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowSettings(!showSettings)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  </button>

                </div>
              </div>

              {/* 设置面板 */}
              {showSettings && (
                <div className="overflow-hidden transition-all duration-300 ease-in-out opacity-100 px-4 sm:px-6 py-3 mb-4">
                  <SettingsPanel 
                    data={data}
                    onChange={handleSettingsChange}
                    activeTab={activeTab}
                  />
                </div>
              )}

              {/* 客户信息区域 */}
              <div className={`px-4 sm:px-6 ${
                showSettings ? 'py-2' : 'py-4'
              }`}>
                <CustomerInfoCompact 
                  data={data}
                  onChange={updateData}
                  type={activeTab}
                />
              </div>

              {/* 商品表格区域 */}
              <div className={`px-0 sm:px-6 py-2`}>
                <div className="space-y-4">
                  <div className="px-4 sm:px-0">
                    <ImportDataButton onImport={updateItems} />
                  </div>
                            <ItemsTable 
                  data={data} 
                  onItemsChange={handleItemsChange}
                  onOtherFeesChange={handleOtherFeesChange}
                  onDescriptionMergeModeChange={setDescriptionMergeMode}
                  onRemarksMergeModeChange={setRemarksMergeMode}
                  onManualMergedCellsChange={handleManualMergeChange}
                  mergedRemarks={data.mergedRemarks}
                  mergedDescriptions={data.mergedDescriptions}
                />
                </div>

                {/* 按钮和总金额区域 */}
                <div className="mt-4 px-4 sm:px-0 flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        const newItems = [...(data.items || [])];
                        newItems.push({
                          id: newItems.length + 1,
                          partName: '',
                          description: '',
                          quantity: 0,
                          unit: 'pc',
                          unitPrice: 0,
                          amount: 0,
                          remarks: ''
                        });
                        updateItems(newItems);
                      }}
                      className="px-3 h-7 rounded-lg
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
                        const maxId = newFees.reduce((max, fee) => Math.max(max, fee.id), 0);
                        newFees.push({
                          id: maxId + 1,
                          description: '',
                          amount: 0,
                          remarks: ''
                        });
                        updateOtherFees(newFees);
                      }}
                      className="px-3 h-7 rounded-lg
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

                  <div className="text-right">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block text-sm text-[#86868B] dark:text-gray-400">Total Amount:</div>
                        <div className="text-xl sm:text-2xl font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                          {currencySymbol}{totalAmount.toFixed(2)}
                        </div>
                      </div>
                      
                      {/* 定金显示 */}
                      {data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0 && (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">
                              {data.depositPercentage}% Deposit:
                            </span>
                            <span className="text-lg font-semibold tracking-tight whitespace-nowrap text-blue-600 dark:text-blue-400">
                              {currencySymbol}{data.depositAmount.toFixed(2)}
                            </span>
                          </div>
                          
                          {/* 尾款显示 */}
                          {data.showBalance && (
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-500">
                                {100 - data.depositPercentage}% Balance:
                              </span>
                              <span className="text-lg font-semibold tracking-tight whitespace-nowrap text-green-600 dark:text-green-400">
                                {currencySymbol}{data.balanceAmount?.toFixed(2) || (totalAmount - data.depositAmount).toFixed(2)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 英文大写金额显示区域 - 仅在销售确认页面显示 */}
              {activeTab === 'confirmation' && (
                <div className="px-4 sm:px-6 py-3 border-t border-gray-100 dark:border-[#3A3A3C]">
                  <div className="inline text-sm">
                    {data.depositPercentage && data.depositPercentage > 0 && data.depositAmount && data.depositAmount > 0 ? (
                      data.showBalance ? (
                        // 显示尾款金额的大写
                        (() => {
                          const balanceAmount = data.balanceAmount || (totalAmount - data.depositAmount);
                          const balanceWords = numberToWords(balanceAmount);
                          return (
                            <>
                              <span className="text-gray-600 dark:text-gray-400">SAY {100 - data.depositPercentage}% Balance </span>
                              <span className="text-blue-500">
                                {data.currency === 'USD' ? 'US DOLLARS ' : 'CHINESE YUAN '}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">{balanceWords.dollars}</span>
                              {balanceWords.hasDecimals && (
                                <>
                                  <span className="text-red-500"> AND </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {balanceWords.cents}
                                  </span>
                                </>
                              )}
                              {!balanceWords.hasDecimals && (
                                <span className="text-gray-600 dark:text-gray-400"> ONLY</span>
                              )}
                            </>
                          );
                        })()
                      ) : (
                        // 显示定金金额的大写
                        (() => {
                          const depositWords = numberToWords(data.depositAmount);
                          return (
                            <>
                              <span className="text-gray-600 dark:text-gray-400">SAY {data.depositPercentage}% Deposit </span>
                              <span className="text-blue-500">
                                {data.currency === 'USD' ? 'US DOLLARS ' : 'CHINESE YUAN '}
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">{depositWords.dollars}</span>
                              {depositWords.hasDecimals && (
                                <>
                                  <span className="text-red-500"> AND </span>
                                  <span className="text-gray-600 dark:text-gray-400">
                                    {depositWords.cents}
                                  </span>
                                </>
                              )}
                              {!depositWords.hasDecimals && (
                                <span className="text-gray-600 dark:text-gray-400"> ONLY</span>
                              )}
                            </>
                          );
                        })()
                      )
                    ) : (
                      // 显示总金额的大写
                      <>
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
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Notes 部分 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="space-y-6">
                  <NotesSection 
                    data={data}
                    onChange={updateData}
                  />

                  {/* 银行信息区域 */}
                  {activeTab === 'confirmation' && data.showBank && (
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-600 dark:text-[#98989D] mb-2">
                        Bank Information:
                      </label>
                      <div className="bg-gray-50 dark:bg-[#3A3A3C] p-3 sm:p-4 rounded-xl text-sm dark:text-[#F5F5F7]">
                        <p>Bank Name: The Hongkong and Shanghai Banking Corporation Limited</p>
                        <p>Swift code: HSBCHKHHHKH</p>
                        <p>Bank address: Head Office 1 Queen&apos;s Road Central Hong Kong</p>
                        <p>A/C No.: 801470337838</p>
                        <p>Beneficiary: Luo & Company Co., Limited</p>
                      </div>
                    </div>
                  )}

                  {/* 动态加载PaymentTermsSection */}
                  {activeTab === 'confirmation' && (
                    <DynamicPaymentTermsSection
                      data={data}
                      onChange={updateData}
                    />
                  )}
                </div>
              </div>

              {/* 操作按钮区域 */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
                  {/* 主要操作按钮 - 生成PDF */}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`flex items-center justify-center gap-2 px-6 py-3 rounded-2xl
                      bg-[#007AFF] dark:bg-[#0A84FF] hover:bg-[#007AFF]/90 dark:hover:bg-[#0A84FF]/90
                      text-white font-medium text-[15px] leading-relaxed
                      transition-all duration-300 ease-out
                      focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 dark:focus:ring-[#0A84FF]/30
                      shadow-sm hover:shadow-md dark:shadow-[#0A84FF]/10
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isGenerating ? (
                      <>
                        <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Generating...</span>
                      </>
                    ) : (pathname?.startsWith('/quotation/edit/') || editId) ? (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Save & Generate</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-5 h-5" />
                        <span>Generate {activeTab === 'quotation' ? 'Quotation' : 'Order'}</span>
                      </>
                    )}
                  </button>

                  {/* 次要操作按钮组 */}
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {/* 预览按钮 */}
                    <button
                      type="button"
                      onClick={handlePreview}
                      disabled={isPreviewing || isGenerating}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium
                        bg-white dark:bg-[#1C1C1E]
                        text-[#007AFF] dark:text-[#0A84FF]
                        border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                        flex items-center justify-center gap-2
                        hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
                        hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                        active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
                        transition-all duration-200
                        disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isPreviewing ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Previewing...</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          <span>Preview</span>
                        </>
                      )}
                    </button>

                    {/* Excel导出按钮 */}
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="w-full sm:w-auto px-4 py-2.5 rounded-xl font-medium
                        bg-white dark:bg-[#1C1C1E]
                        text-[#007AFF] dark:text-[#0A84FF]
                        border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                        flex items-center justify-center gap-2
                        hover:bg-[#007AFF]/[0.05] dark:hover:bg-[#0A84FF]/[0.05]
                        hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                        active:bg-[#007AFF]/[0.1] dark:active:bg-[#0A84FF]/[0.1]
                        transition-all duration-200"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      <span>Excel</span>
                    </button>
                  </div>
                </div>

                {/* 进度条 */}
                {(isGenerating || isPreviewing) && (
                  <div className="mt-3 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                    <div 
                      className="bg-[#007AFF] dark:bg-[#0A84FF] h-1.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${Math.min(100, isGenerating ? generatingProgress : previewProgress)}%` }}
                    />
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* PDF预览弹窗 */}
      <PDFPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        item={previewItem}
        itemType={activeTab}
      />

      {/* 粘贴对话框组件 */}
      <PasteDialog
        isOpen={isPasteDialogOpen}
        onClose={() => setPasteDialogOpen(false)}
        onConfirm={handleGlobalPaste}
      />

      <Footer />
    </div>
  );
}
