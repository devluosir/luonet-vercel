'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Download, Settings, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { SettingsPanel } from '@/components/purchase/SettingsPanel';
import type { PurchaseOrderData } from '@/types/purchase';

const defaultData: PurchaseOrderData = {
  attn: '',
  ourRef: '',
  yourRef: '',
  orderNo: '',
  date: new Date().toISOString().split('T')[0],
  contractAmount: '',
  projectSpecification: '',
  paymentTerms: '交货后30天',
  invoiceRequirements: '',
  deliveryInfo: '',
  orderNumbers: '',
  showStamp: false,
  showBank: false,
  currency: 'CNY',
};

export default function PurchaseOrderPage() {
  const [data, setData] = useState<PurchaseOrderData>(defaultData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // 生成PDF
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const blob = await generatePurchaseOrderPDF(data, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${data.orderNo || 'new'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('生成PDF失败');
    } finally {
      setIsGenerating(false);
    }
  };

  // 输入控件
  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';
  const subheadingClass = 'block text-base font-semibold text-gray-800 dark:text-gray-200 pt-4 pb-1';

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-4">
        <Link href="/tools" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">返回工具页</span>
        </Link>
      </div>

      <div className="relative mb-6">
        <h1 className="text-center text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">Purchase Order</h1>
        
        {/* 设置按钮 */}
        <div 
          className="absolute top-1 right-0 flex items-center gap-2 cursor-pointer text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 transition-colors"
          onClick={() => setShowSettings(!showSettings)}
        >
          <Settings className="w-5 h-5" />
          <span className="text-sm font-medium">设置</span>
          {showSettings ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </div>

      {/* 设置面板 */}
      {showSettings && (
        <div className="mb-6">
          <SettingsPanel data={data} onDataChange={setData} />
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-8">
        {/* 主内容区域 */}
        <div className="flex-1 space-y-6">
          {/* 基本信息 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Attn:</label>
              <input
                className={inputClass}
                value={data.attn}
                onChange={e => setData({ ...data, attn: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Our ref:</label>
              <input
                className={inputClass}
                value={data.ourRef}
                onChange={e => setData({ ...data, ourRef: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Your ref:</label>
              <input
                className={inputClass}
                value={data.yourRef}
                onChange={e => setData({ ...data, yourRef: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Order No.:</label>
              <input
                className={inputClass}
                value={data.orderNo}
                onChange={e => setData({ ...data, orderNo: e.target.value })}
              />
            </div>
            <div>
              <label className={labelClass}>Date:</label>
              <input
                type="date"
                className={inputClass}
                value={data.date}
                onChange={e => setData({ ...data, date: e.target.value })}
              />
            </div>
          </div>

          {/* 1. 供货范围和成交价格 */}
          <div className="space-y-2">
            <label className={subheadingClass}>1. 供货范围和成交价格</label>
            <p className="text-gray-600 dark:text-gray-300 text-sm">
              客户确认贵司于<strong className="text-blue-600">{data.date || '日期'}</strong> <strong className="text-red-600">{data.yourRef || 'Your ref'}</strong>报价提供的项目价格、规格和交货条件；
            </p>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                该订单的合同价款是：
              </span>
              <input
                className={`${inputClass} flex-1 min-w-[200px]`}
                placeholder="合同价款"
                value={data.contractAmount}
                onChange={e => setData({ ...data, contractAmount: e.target.value })}
              />
            </div>
            <div className="mt-2">
              <span className="text-gray-600 dark:text-gray-300 text-sm">
                客户确认订单时对于项目的<strong className="text-blue-600 font-bold">规格描述</strong>供你们参考：
              </span>
            </div>
            <textarea
              className={inputClass}
              rows={3}
              placeholder="项目规格描述（可多行输入）"
              value={data.projectSpecification}
              onChange={e => setData({ ...data, projectSpecification: e.target.value })}
            />
          </div>

          {/* 2. 付款条件 */}
          <div className="space-y-2">
            <label className={subheadingClass}>2. 付款条件</label>
            <input
              className={inputClass}
              value={data.paymentTerms}
              onChange={e => setData({ ...data, paymentTerms: e.target.value })}
              placeholder="交货后30天"
            />
          </div>

          {/* 3. 发票要求 */}
          <div className="space-y-2">
            <label className={subheadingClass}>3. 发票要求</label>
            <input
              className={inputClass}
              value={data.invoiceRequirements}
              onChange={e => setData({ ...data, invoiceRequirements: e.target.value })}
              placeholder="如前"
            />
          </div>

          {/* 4. 关于交货 */}
          <div className="space-y-2">
            <label className={subheadingClass}>4. 关于交货</label>
            <div className="mb-2">
              <span className="text-gray-600 dark:text-gray-300 text-sm">收货人信息如下：</span>
            </div>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="收货人信息（可多行输入或粘贴图片）"
              value={data.deliveryInfo}
              onChange={e => setData({ ...data, deliveryInfo: e.target.value })}
            />
          </div>

          {/* 5. 客户订单号码 */}
          <div className="space-y-2">
            <label className={subheadingClass}>5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：</label>
            <textarea
              className={inputClass}
              rows={2}
              placeholder="客户订单号码（可多行输入）"
              value={data.orderNumbers}
              onChange={e => setData({ ...data, orderNumbers: e.target.value })}
            />
          </div>

          {/* 操作按钮 */}
          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <Download className="w-5 h-5" />
              {isGenerating ? '生成中...' : '生成PDF'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
