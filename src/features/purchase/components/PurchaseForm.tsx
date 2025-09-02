'use client';
import React, { useRef, useCallback, useEffect, useState } from 'react';
import { SettingsPanel } from '@/components/purchase/SettingsPanel';
import { BankInfoSection } from '@/components/purchase/BankInfoSection';
import PurchaseBaseInfo from '@/components/purchase/PurchaseBaseInfo';
import { usePurchaseStore } from '../state/purchase.store';
import { useAutoResizeTextareas } from '@/hooks/useAutoResizeTextareas';

export default function PurchaseForm() {
  const { 
    data, 
    showSettings, 
    updateData, 
    toggleBank, 
    changeCurrency,
    pageMode,
    updateFromField
  } = usePurchaseStore();

  const [isClient, setIsClient] = useState(false);

  const deliveryInfoRef = useRef<HTMLTextAreaElement>(null);
  const orderNumbersRef = useRef<HTMLTextAreaElement>(null);
  const paymentTermsRef = useRef<HTMLTextAreaElement>(null);
  const projectSpecificationRef = useRef<HTMLTextAreaElement>(null);

  // 使用统一的textarea自动高度调整Hook（包含规格描述）
  useAutoResizeTextareas(
    [deliveryInfoRef, orderNumbersRef, paymentTermsRef, projectSpecificationRef],
    [data.deliveryInfo, data.orderNumbers, data.paymentTerms, data.projectSpecification]
  );

  // 确保客户端渲染
  useEffect(() => {
    setIsClient(true);
    // 在客户端渲染时更新from字段为当前用户
    updateFromField();
  }, [updateFromField]);

  // 使用useCallback优化onChange回调，避免无限循环
  const handleBaseInfoChange = useCallback((value: any) => {
    updateData({
      attn: value.attn,
      yourRef: value.yourRef,
      supplierQuoteDate: value.supplierQuoteDate,
      orderNo: value.orderNo,
      ourRef: value.ourRef,
      date: value.date,
      from: value.from, // 添加from字段的处理
    });
  }, [updateData]);

  // 输入控件样式
  const inputClass =
    'w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm';

  const dateInputClass =
    'w-full min-w-0 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm';

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
  const subheadingClass = 'block text-lg font-semibold text-gray-800 dark:text-gray-200 pt-6 pb-3';



  // 如果不在客户端，显示加载状态
  if (!isClient) {
    return (
      <div className="p-4 sm:p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* 设置面板 */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out
        ${showSettings ? 'opacity-100 px-4 sm:px-6 py-6 h-auto' : 'opacity-0 px-0 py-0 h-0'}`}>
        <SettingsPanel data={data} onDataChange={updateData} />
      </div>
      

      


      {/* 主内容区域 */}
      <div className="p-4 sm:p-6 space-y-6">
        {/* 基本信息 - 使用动态标题组件 */}
        <PurchaseBaseInfo
          value={{
            attn: data.attn,
            yourRef: data.yourRef,
            supplierQuoteDate: data.supplierQuoteDate,
            orderNo: data.orderNo,
            ourRef: data.ourRef,
            date: data.date,
            from: data.from, // 添加from字段
          }}
          onChange={handleBaseInfoChange}
          config={{
            type: pageMode,
            labels: {
              attn: '供应商信息 Supplier Information',
              yourRef: 'Your Ref',
              supplierQuoteDate: '报价日期 Quote Date',
              orderNo: '订单号 Order No.',
              ourRef: '询价号码 Our ref',
              date: '日期 Date',
            },
          }}
        />

        {/* 主体内容 - 优化布局 */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* 左侧列 */}
          <div className="flex-1 space-y-6 pr-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
            {/* 1. 供货范围和成交价格 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">1. 供货范围和成交价格</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                客户确认贵司于<strong className="text-blue-600"><span suppressHydrationWarning>{data.supplierQuoteDate || '日期'}</span></strong> <strong className="text-red-600"><span suppressHydrationWarning>{data.yourRef || 'Your ref'}</span></strong>报价提供的项目价格、规格和交货条件；
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
                      onClick={() => changeCurrency(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                        ${data.currency === c
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <input
                  className={`${inputClass} flex-1 min-w-[120px]`}
                  placeholder="0.00"
                  value={data.contractAmount}
                  onChange={e => updateData({ contractAmount: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <span className="text-gray-600 dark:text-gray-300 text-sm">
                  客户确认订单时对于项目的<strong className="text-blue-600 font-bold">规格描述</strong>供你们参考：
                </span>
              </div>
              <textarea
                ref={projectSpecificationRef}
                className={`${inputClass} resize-none overflow-hidden`}
                rows={4}
                value={data.projectSpecification}
                onChange={e => updateData({ projectSpecification: e.target.value })}
                placeholder="项目规格描述（可多行输入）"
              />
            </div>

            {/* 2. 付款条件 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">2. 付款条件</h3>
              <textarea
                ref={paymentTermsRef}
                className={`${inputClass} resize-none overflow-hidden`}
                rows={2}
                value={data.paymentTerms}
                onChange={e => updateData({ paymentTerms: e.target.value })}
                placeholder="交货后30天"
              />
            </div>

            {/* 3. 发票要求 */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">3. 发票要求</h3>
                <button
                  onClick={toggleBank}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    data.showBank 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-gray-700'
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
                <input
                  className={`${inputClass} flex-1`}
                  value={data.invoiceRequirements}
                  onChange={e => updateData({ invoiceRequirements: e.target.value })}
                  placeholder="如前"
                />
              </div>
              <BankInfoSection showBank={data.showBank} />
            </div>
          </div>



          {/* 右侧列 */}
          <div className="flex-1 space-y-6 pl-6 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl p-4">
            {/* 4. 关于交货 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">4. 关于交货</h3>
              <textarea
                ref={deliveryInfoRef}
                className={`${inputClass} resize-none overflow-hidden`}
                rows={4}
                placeholder="收货人信息（可多行输入）"
                value={data.deliveryInfo || '收货人信息如下：'}
                onChange={e => updateData({ deliveryInfo: e.target.value })}
              />
            </div>

            {/* 5. 客户的订单号码 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">5. 客户的订单号码</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                请在交货时写在交货文件中和包装箱外部：
              </p>
              <textarea
                ref={orderNumbersRef}
                className={`${inputClass} resize-none overflow-hidden`}
                rows={4}
                placeholder="客户订单号码（可多行输入）"
                value={data.orderNumbers}
                onChange={e => updateData({ orderNumbers: e.target.value })}
              />
            </div>

            {/* 6. 印章 */}
            <div>
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">6. 印章</h3>
              <div className="flex gap-2">
                {[
                  { value: 'none', label: '无', color: 'gray' },
                  { value: 'shanghai', label: '上海', color: 'emerald' },
                  { value: 'hongkong', label: '香港', color: 'indigo' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateData({ ...data, stampType: option.value as 'none' | 'shanghai' | 'hongkong' })}
                    className={`px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                      data.stampType === option.value 
                        ? 'bg-blue-500 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
