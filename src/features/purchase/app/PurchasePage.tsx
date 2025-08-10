'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, History, Settings, Download, Eye } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import SupplierSection from '../components/sections/SupplierSection';
import SettingsPanel from '../components/sections/SettingsPanel';
import BankInfoSection from '../components/sections/BankInfoSection';
import ItemsTable from '../components/sections/ItemsTable';
import TotalsSection from '../components/sections/TotalsSection';
import NotesSection from '../components/sections/NotesSection';
import QuickActions from '../components/QuickActions';
import HistoryDrawer from '../components/HistoryDrawer';
import { useTotals, useCanGeneratePdf, useValidationState } from '../state/purchase.selectors';
import { usePurchaseStore } from '../state/purchase.store';
import { usePurchasePdf } from '../hooks/usePurchasePdf';
import { usePurchaseAutosave } from '../hooks/usePurchaseAutosave';
import { Footer } from '@/components/Footer';

export default function PurchasePage() {
  const init = usePurchaseStore(s => s.init);
  const draft = usePurchaseStore(s => s.draft);
  const { subtotal, count } = useTotals();
  const canGeneratePdf = useCanGeneratePdf();
  const { isValid, errors } = useValidationState();
  const { generatePdf } = usePurchasePdf();
  const pathname = usePathname();
  const { data: session } = useSession();

  // 自动保存
  usePurchaseAutosave(300);

  // 初始化数据
  useEffect(() => {
    // 设置默认日期
    if (!draft.settings.date) {
      init({
        settings: {
          ...draft.settings,
          date: new Date().toISOString().split('T')[0]
        }
      });
    }
  }, [init, draft.settings.date]);

  // 设置采购员信息
  useEffect(() => {
    if (session?.user?.name && !draft.settings.purchaser) {
      init({
        settings: {
          ...draft.settings,
          purchaser: session.user.name
        }
      });
    }
  }, [session, draft.settings.purchaser, init]);

  // 生成PDF
  const handleGeneratePdf = async () => {
    if (!canGeneratePdf) {
      alert('请完善必要信息后再生成PDF');
      return;
    }

    try {
      await generatePdf({ 
        open: true, 
        filename: `PO_${draft.settings.poNo || 'new'}.pdf` 
      });
    } catch (error) {
      console.error('生成PDF失败:', error);
      alert('生成PDF失败，请重试');
    }
  };

  // 预览PDF
  const handlePreviewPdf = async () => {
    if (!canGeneratePdf) {
      alert('请完善必要信息后再预览PDF');
      return;
    }

    try {
      await generatePdf({ open: true });
    } catch (error) {
      console.error('预览PDF失败:', error);
      alert('预览PDF失败，请重试');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link 
            href={
              pathname?.includes('/edit/') ? '/history?tab=purchase' : 
              pathname?.includes('/copy/') ? '/history?tab=purchase' : 
              '/dashboard'
            } 
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg mt-6">
            {/* 标题和操作按钮 */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
                采购订单 Purchase Order
              </h1>
              <div className="flex items-center gap-2">
                <Link
                  href="/history?tab=purchase"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                  title="历史记录"
                >
                  <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                </Link>
                <button
                  type="button"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                </button>
              </div>
            </div>

            {/* 主内容区域 */}
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧主要内容 */}
                <div className="lg:col-span-2 space-y-6">
                  <SupplierSection />
                  <ItemsTable />
                  <NotesSection />
                </div>

                {/* 右侧边栏 */}
                <div className="space-y-6">
                  <SettingsPanel />
                  <BankInfoSection />
                  <TotalsSection />
                  <QuickActions />
                  <HistoryDrawer />

                  {/* 验证错误提示 */}
                  {!isValid && errors.length > 0 && (
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-200 dark:border-red-800">
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
                        请完善以下信息：
                      </h4>
                      <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <button
                  type="button"
                  onClick={handleGeneratePdf}
                  disabled={!canGeneratePdf || subtotal <= 0}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] text-white font-medium shadow-sm shadow-[#007AFF]/20 dark:shadow-[#0A84FF]/20 hover:shadow-lg hover:shadow-[#007AFF]/25 dark:hover:shadow-[#0A84FF]/25 active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC] w-full sm:w-auto sm:min-w-[180px] h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Download className="w-4 h-4" />
                    <span>生成PDF</span>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handlePreviewPdf}
                  disabled={!canGeneratePdf || subtotal <= 0}
                  className="px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08] text-[#007AFF] dark:text-[#0A84FF] font-medium border border-[#007AFF]/20 dark:border-[#0A84FF]/20 hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12] hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30 active:bg-[#007AFF]/[0.16] dark:active:bg-[#0A84FF]/[0.16] active:scale-[0.98] active:shadow-inner w-full sm:w-auto sm:min-w-[120px] h-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Eye className="w-4 h-4" />
                    <span>预览PDF</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
