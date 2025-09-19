'use client';

import React, { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Footer } from '@/components/Footer';
import { HistoryHeader } from '../components/HistoryHeader';
import { HistoryTabs } from '../components/HistoryTabs';
import { useHistoryStore } from '../state/history.store';
import { useHistoryActions } from '../hooks/useHistoryActions';
import { 
  useHistoryMounted,
  useHistoryActiveTab,
  useHistoryShowFilters,
  useHistoryIsDeleting,
  useHistoryShowExportModal,
  useHistoryShowImportModal,
  useHistoryShowDeleteConfirm,
  useHistoryShowPreview,
  useHistoryDeleteConfirmId,
  useHistoryPreviewItem,
} from '../state/history.selectors';

// 动态导入Tab组件
const QuotationHistoryTab = dynamic(() => import('@/app/history/tabs/QuotationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载报价单历史...</div>,
  ssr: false
});

const ConfirmationHistoryTab = dynamic(() => import('@/app/history/tabs/ConfirmationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载订单确认书历史...</div>,
  ssr: false
});

const InvoiceHistoryTab = dynamic(() => import('@/app/history/tabs/InvoiceHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载发票历史...</div>,
  ssr: false
});

const PurchaseHistoryTab = dynamic(() => import('@/app/history/tabs/PurchaseHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载采购单历史...</div>,
  ssr: false
});

const PackingHistoryTab = dynamic(() => import('@/app/history/tabs/PackingHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载装箱单历史...</div>,
  ssr: false
});

// 动态导入模态框组件
const ExportModal = dynamic(() => import('@/app/history/ExportModal'), { ssr: false });
const ImportModal = dynamic(() => import('@/app/history/ImportModal'), { ssr: false });
const PDFPreviewModal = dynamic(() => import('@/components/history/PDFPreviewModal'), { ssr: false });

export function HistoryPage() {
  const searchParams = useSearchParams();
  
  // 状态
  const mounted = useHistoryMounted();
  const activeTab = useHistoryActiveTab();
  const showFilters = useHistoryShowFilters();
  const isDeleting = useHistoryIsDeleting();
  const showExportModal = useHistoryShowExportModal();
  const showImportModal = useHistoryShowImportModal();
  const showDeleteConfirm = useHistoryShowDeleteConfirm();
  const showPreview = useHistoryShowPreview();
  const deleteConfirmId = useHistoryDeleteConfirmId();
  const previewItem = useHistoryPreviewItem();

  // Actions
  const {
    handleRefresh,
    handleExport,
    handleImport,
    handleBatchDelete,
    handleTabChange,
    handleConfirmDelete,
    handleEdit,
    handleCopy,
    handleDelete,
    handleConvert,
    handlePreview,
  } = useHistoryActions();

  const { setMounted, setActiveTab, setShowFilters } = useHistoryStore();

  // 主色调映射 - 按照tab顺序：报价单、合同确认、装箱单、发票、采购单
  const tabColorMap = {
    quotation: 'blue',      // 报价单 - 蓝色
    confirmation: 'green',   // 合同确认 - 绿色
    packing: 'teal',        // 装箱单 - 青色
    invoice: 'purple',      // 发票 - 紫色
    purchase: 'orange'      // 采购单 - 橙色
  };
  const activeColor = tabColorMap[activeTab] || 'blue';

  // 处理URL参数中的tab参数
  useEffect(() => {
    if (mounted && searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['quotation', 'confirmation', 'invoice', 'purchase', 'packing'].includes(tabParam)) {
        setActiveTab(tabParam as any);
      }
    }
  }, [mounted, searchParams, setActiveTab]);

  useEffect(() => {
    setMounted(true);
    
    // 监听localStorage变化，自动刷新数据
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && (
        event.key.includes('quotation_history') ||
        event.key.includes('packing_history') ||
        event.key.includes('invoice_history') ||
        event.key.includes('purchase_history')
      )) {
        console.log('检测到localStorage变化，刷新历史记录...');
        handleRefresh();
      }
    };

    // 监听自定义存储变化事件
    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail?.key && (
        event.detail.key.includes('quotation_history') ||
        event.detail.key.includes('packing_history') ||
        event.detail.key.includes('invoice_history') ||
        event.detail.key.includes('purchase_history')
      )) {
        console.log('检测到自定义存储变化，刷新历史记录...');
        handleRefresh();
      }
    };

    // 添加事件监听器
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    
    // 组件卸载时的清理函数
    return () => {
      setMounted(false);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [setMounted, handleRefresh]);

  // 渲染Tab内容
  const renderTabContent = () => {
    const commonProps = {
      filters: useHistoryStore.getState().filters,
      sortConfig: useHistoryStore.getState().sortConfig,
      onSort: (key: string) => useHistoryStore.getState().toggleSort(key),
      onEdit: handleEdit,
      onCopy: handleCopy,
      onDelete: handleDelete,
      onPreview: (id: string) => {
        // 根据id找到对应的item并预览
        const historyService = require('../services/history.service').HistoryService;
        const currentData = historyService.getHistory(activeTab);
        const item = currentData.find((item: any) => item.id === id);
        if (item) {
          handlePreview(item);
        }
      },
      selectedIds: useHistoryStore.getState().selectedItems,
      onSelect: (id: string, selected: boolean) => {
        if (selected) {
          useHistoryStore.getState().addSelectedItem(id);
        } else {
          useHistoryStore.getState().removeSelectedItem(id);
        }
      },
      onSelectAll: (selected: boolean) => {
        if (selected) {
          // 全选当前tab的所有数据
          const historyService = require('../services/history.service').HistoryService;
          const currentData = historyService.getHistory(activeTab);
          const allIds = currentData.map((item: any) => item.id);
          useHistoryStore.getState().setSelectedItems(new Set(allIds));
        } else {
          useHistoryStore.getState().clearSelectedItems();
        }
      },
      refreshKey: useHistoryStore.getState().refreshKey,
    };

    switch (activeTab) {
      case 'quotation':
        return <QuotationHistoryTab {...commonProps} mainColor={activeColor} />;
      case 'confirmation':
        return (
          <ConfirmationHistoryTab 
            {...commonProps} 
            mainColor={activeColor}
            onConvert={handleConvert}
          />
        );
      case 'packing':
        return <PackingHistoryTab {...commonProps} mainColor="teal" />;
      case 'invoice':
        return <InvoiceHistoryTab {...commonProps} mainColor={activeColor} />;
      case 'purchase':
        return <PurchaseHistoryTab {...commonProps} mainColor={activeColor} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <HistoryHeader
        onRefresh={handleRefresh}
        onExport={handleExport}
        onImport={handleImport}
        onBatchDelete={handleBatchDelete}
        isDeleting={isDeleting}
      />

      {/* 筛选器 */}
      {/* <HistoryFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
      /> */}

      {/* 标签页 */}
      <HistoryTabs onTabChange={handleTabChange} />

      {/* 主要内容 */}
      <div className="flex-1 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-none">
          <div className="bg-white dark:bg-[#1c1c1e] rounded-lg">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* 页脚 */}
      <Footer />

      {/* 模态框 */}
      {showExportModal && (
        <ExportModal
          isOpen={showExportModal}
          onClose={() => useHistoryStore.getState().setShowExportModal(false)}
          activeTab={activeTab}
          selectedIds={useHistoryStore.getState().selectedItems}
        />
      )}
      {showImportModal && (
        <ImportModal
          isOpen={showImportModal}
          onClose={() => useHistoryStore.getState().setShowImportModal(false)}
          activeTab={activeTab}
        />
      )}
      {showPreview && previewItem && (
        <PDFPreviewModal
          isOpen={showPreview}
          onClose={() => useHistoryStore.getState().setShowPreview(false)}
          item={previewItem}
          itemType={activeTab}
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除这条记录吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => useHistoryStore.getState().setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
