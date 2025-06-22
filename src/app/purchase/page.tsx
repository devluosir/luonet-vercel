'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Download, Settings, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { SettingsPanel } from '@/components/purchase/SettingsPanel';
import { BankInfoSection } from '@/components/purchase/BankInfoSection';
import type { PurchaseOrderData } from '@/types/purchase';

const defaultData: PurchaseOrderData = {
  attn: '',
  ourRef: '',
  yourRef: '',
  orderNo: '',
  date: new Date().toISOString().split('T')[0],
  supplierQuoteDate: new Date().toISOString().split('T')[0],
  contractAmount: '',
  projectSpecification: '',
  paymentTerms: '交货后30天',
  invoiceRequirements: '',
  deliveryInfo: '',
  orderNumbers: '',
  showStamp: false,
  showBank: false,
  currency: 'CNY',
  stampType: 'none',
  from: '',
};

export default function PurchaseOrderPage() {
  const [data, setData] = useState<PurchaseOrderData>(defaultData);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.name) {
      setData(prevData => ({
        ...prevData,
        from: prevData.from || session.user.name || '',
      }));
    }
  }, [session]);

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

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      setData(prevData => ({ ...prevData, contractAmount: amount.toFixed(2) }));
    }
  };

  // 输入控件样式
  const inputClass =
    'w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
  const subheadingClass = 'block text-lg font-semibold text-gray-800 dark:text-gray-200 pt-6 pb-3';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1C1C1E] flex flex-col">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
          {/* 返回按钮 */}
          <Link href="/tools" className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7] transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Link>

          {/* 主卡片容器 */}
          <div className="bg-white dark:bg-[#2C2C2E] rounded-2xl sm:rounded-3xl shadow-lg mt-6">
            {/* 标题和设置按钮 */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-100 dark:border-[#3A3A3C]">
              <h1 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7]">
                Purchase Order
              </h1>
              <button
                type="button"
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
              </button>
            </div>

            {/* 设置面板 */}
            <div className={`overflow-hidden transition-all duration-300 ease-in-out
              ${showSettings ? 'opacity-100 px-4 sm:px-6 py-6 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
              <SettingsPanel data={data} onDataChange={setData} />
            </div>

            {/* 主内容区域 */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* 基本信息 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 供应商信息组 */}
                <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">供应商信息</h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>供应商 Attn:</label>
                      <input
                        className={inputClass}
                        value={data.attn}
                        onChange={e => setData({ ...data, attn: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>报价号码 Your ref:</label>
                      <input
                        className={inputClass}
                        value={data.yourRef}
                        onChange={e => setData({ ...data, yourRef: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>报价日期 Quote Date:</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={data.supplierQuoteDate}
                        onChange={e => setData({ ...data, supplierQuoteDate: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* 订单信息组 */}
                <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">订单信息</h3>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>订单号 Order No.:</label>
                      <input
                        className={inputClass}
                        value={data.orderNo}
                        onChange={e => setData({ ...data, orderNo: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>询价号码 Our ref:</label>
                      <input
                        className={inputClass}
                        value={data.ourRef}
                        onChange={e => setData({ ...data, ourRef: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>采购订单日期 Date:</label>
                      <input
                        type="date"
                        className={inputClass}
                        value={data.date}
                        onChange={e => setData({ ...data, date: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 1. 供货范围和成交价格 */}
              <div className="space-y-3">
                <label className={subheadingClass}>1. 供货范围和成交价格</label>
                <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl">
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                    客户确认贵司于<strong className="text-blue-600">{data.supplierQuoteDate || '日期'}</strong> <strong className="text-red-600">{data.yourRef || 'Your ref'}</strong>报价提供的项目价格、规格和交货条件；
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className="text-gray-600 dark:text-gray-300 text-sm">
                      该订单的合同价款是：
                    </span>
                    <div className="flex items-center gap-1">
                      {(['CNY', 'USD', 'EUR'] as const).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setData({ ...data, currency: c })}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                            data.currency === c
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <input
                      className={`${inputClass} flex-1 min-w-[150px]`}
                      placeholder="0.00"
                      value={data.contractAmount}
                      onChange={e => setData({ ...data, contractAmount: e.target.value })}
                      onBlur={handleAmountBlur}
                    />
                  </div>
                  <div className="mb-3">
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
              </div>

              {/* 2. 付款条件 */}
              <div className="space-y-3">
                <label className={subheadingClass}>2. 付款条件</label>
                <input
                  className={inputClass}
                  value={data.paymentTerms}
                  onChange={e => setData({ ...data, paymentTerms: e.target.value })}
                  placeholder="交货后30天"
                />
              </div>

              {/* 3. 发票要求 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className={subheadingClass}>3. 发票要求</label>
                  <button
                    onClick={() => setData({ ...data, showBank: !data.showBank })}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                      data.showBank 
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                    title={data.showBank ? '隐藏开票资料' : '显示开票资料'}
                  >
                    {data.showBank ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span>开票资料</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>开票资料</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  className={inputClass}
                  value={data.invoiceRequirements}
                  onChange={e => setData({ ...data, invoiceRequirements: e.target.value })}
                  placeholder="根据我司财务要求，开具发票。"
                />
                <BankInfoSection showBank={data.showBank} />
              </div>

              {/* 4. 关于交货 */}
              <div className="space-y-3">
                <label className={subheadingClass}>4. 关于交货</label>
                <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl">
                  <div className="mb-3">
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
              </div>

              {/* 5. 客户订单号码 */}
              <div className="space-y-3">
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
              <div className="flex justify-end pt-6">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-sm hover:shadow-lg transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Download className="w-5 h-5" />
                  {isGenerating ? '生成中...' : '生成PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}