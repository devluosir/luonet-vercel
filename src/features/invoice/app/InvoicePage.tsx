'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Footer } from '@/components/Footer';
import { useInvoiceStore } from '../state/invoice.store';

/**
 * 发票主页面组件 - 最小测试版本
 */
export const InvoicePage = () => {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  const { data, updateData } = useInvoiceStore();

  // 组件挂载状态
  useEffect(() => {
    setMounted(true);
  }, []);

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
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white/90 dark:bg-[#1C1C1E]/90 backdrop-blur-xl rounded-3xl shadow-lg dark:shadow-2xl shadow-black/5 dark:shadow-black/20 border border-black/5 dark:border-white/10 p-4 md:p-8 mt-8">
            {/* 标题 */}
            <div className="mb-6">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Invoice Generator - Test Version
              </h1>
            </div>

            {/* 基本信息 */}
            <div className="space-y-4 mb-8">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Invoice No.
                </label>
                <input
                  type="text"
                  value={data.invoiceNo}
                  onChange={e => updateData({ invoiceNo: e.target.value })}
                  placeholder="Enter invoice number"
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1c1c1e]/95 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  value={data.date}
                  onChange={(e) => updateData({ date: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#1c1c1e]/95 border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 测试信息 */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Invoice No: {data.invoiceNo || 'Not set'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Date: {data.date || 'Not set'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Items count: {data.items.length}
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
