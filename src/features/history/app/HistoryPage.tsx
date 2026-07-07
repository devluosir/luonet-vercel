'use client';

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Search, X, RefreshCw, Upload, Download } from 'lucide-react';
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { HistoryTabs } from '../components/HistoryTabs';
import { useHistoryStore } from '../state/history.store';
import { useHistoryActions } from '../hooks/useHistoryActions';
import {
  useHistoryMounted,
  useHistoryActiveTab,
  useHistoryIsDeleting,
  useHistoryShowExportModal,
  useHistoryShowImportModal,
  useHistoryShowDeleteConfirm,
  useHistoryShowPreview,
  useHistoryPreviewItem,
  useHistoryFilters,
  useHistorySelectedCount,
} from '../state/history.selectors';
import { pullAllFromD1 } from '@/utils/d1Pull';
import type { HistoryItem, HistoryType } from '../types';

// 动态导入Tab组件
const QuotationHistoryTab = dynamic(() => import('@/app/history/tabs/QuotationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载报价单历史...</div>,
  ssr: false
});

const ConfirmationHistoryTab = dynamic(() => import('@/app/history/tabs/ConfirmationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载订单确认书历史...</div>,
  ssr: false
});

const DomesticQuotationHistoryTab = dynamic(() => import('@/app/history/tabs/QuotationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载内销报价历史...</div>,
  ssr: false
});

const DomesticContractHistoryTab = dynamic(() => import('@/app/history/tabs/QuotationHistoryTab'), {
  loading: () => <div className="py-8 text-center text-gray-400">正在加载内销合同历史...</div>,
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
  const { user, handleLogout } = useAppUser();

  // 状态
  const mounted = useHistoryMounted();
  const activeTab = useHistoryActiveTab();
  const isDeleting = useHistoryIsDeleting();
  const showExportModal = useHistoryShowExportModal();
  const showImportModal = useHistoryShowImportModal();
  const showDeleteConfirm = useHistoryShowDeleteConfirm();
  const showPreview = useHistoryShowPreview();
  const previewItem = useHistoryPreviewItem();
  const filters = useHistoryFilters();
  const selectedCount = useHistorySelectedCount();

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

  const { setMounted, setActiveTab, setFilters } = useHistoryStore();

  // 手动同步刷新：先从 D1 拉取，再刷新 localStorage 视图
  const isSyncing = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const handleSyncRefresh = useCallback(async () => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    setSyncing(true);
    try {
      await pullAllFromD1();
      handleRefresh();
      ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
        window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
      });
    } catch {
      // 静默失败
    } finally {
      isSyncing.current = false;
      setSyncing(false);
    }
  }, [handleRefresh]);

  // 主色调映射 - 按照tab顺序：报价单、合同确认、装箱单、发票、采购单
  const tabColorMap = {
    quotation: 'blue',      // 报价单 - 蓝色
    confirmation: 'green',   // 合同确认 - 绿色
    domestic: 'cyan',        // 内销报价 - 青色
    'domestic-contract': 'green', // 内销合同 - 绿色
    packing: 'teal',        // 装箱单 - 青色
    invoice: 'purple',      // 发票 - 紫色
    purchase: 'orange'      // 采购单 - 橙色
  };
  const activeColor = tabColorMap[activeTab] || 'blue';

  // 处理URL参数中的tab参数
  useEffect(() => {
      if (mounted && searchParams) {
      const tabParam = searchParams.get('tab');
      if (tabParam && ['quotation', 'confirmation', 'domestic', 'domestic-contract', 'invoice', 'purchase', 'packing'].includes(tabParam)) {
        setActiveTab(tabParam as HistoryType);
      }
    }
  }, [mounted, searchParams, setActiveTab]);

  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    async function syncFromD1() {
      if (cancelled) return;
      await pullAllFromD1();
      if (cancelled) return;
      handleRefresh();
      ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
        window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
      });
    }

    void syncFromD1();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    };

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
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    // 组件卸载时的清理函数
    return () => {
      cancelled = true;
      setMounted(false);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
        const currentData = historyService.getHistory(activeTab) as HistoryItem[];
        const item = currentData.find((item) => item.id === id);
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
          const currentData = historyService.getHistory(activeTab) as HistoryItem[];
          const allIds = currentData.map((item) => item.id);
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
      case 'domestic':
        return (
          <DomesticQuotationHistoryTab
            {...commonProps}
            mainColor={activeColor}
            historyType="domestic"
            emptyText="暂无内销报价历史记录"
            numberLabel="报价单编号"
          />
        );
      case 'domestic-contract':
        return (
          <DomesticContractHistoryTab
            {...commonProps}
            mainColor={activeColor}
            historyType="domestic-contract"
            emptyText="暂无内销合同历史记录"
            numberLabel="合同编号"
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

  const bottomActions: ActionButton[] = [
    { key: 'import', label: '导入', onClick: handleImport, variant: 'secondary', icon: Upload },
    { key: 'export', label: '导出', onClick: handleExport, variant: 'secondary', icon: Download },
    ...(selectedCount > 0 ? [{
      key: 'delete',
      label: isDeleting ? '删除中...' : `删除选中 (${selectedCount})`,
      onClick: handleBatchDelete,
      variant: 'primary' as const,
      loading: isDeleting,
      disabled: isDeleting,
    }] : []),
  ];

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '单据历史' }]}
      user={user}
      onLogout={handleLogout}
      bottomActions={bottomActions}
    >
      <div className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-[#1c1c1e] sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索客户名称、单据号..."
              value={filters.search}
              onChange={(e) => setFilters({ search: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-10 text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder-gray-400"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => setFilters({ search: '' })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={handleSyncRefresh}
            disabled={syncing}
            className="rounded-md border border-gray-300 p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800/50"
            title="同步刷新"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              确认删除
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              确定要删除这条记录吗？此操作无法撤销。
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => useHistoryStore.getState().setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isDeleting ? '删除中...' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
