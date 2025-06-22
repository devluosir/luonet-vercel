'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Download, Settings, ChevronDown, ChevronUp, ArrowLeft, Save, History, Eye } from 'lucide-react';
import { generatePurchaseOrderPDF } from '@/utils/purchasePdfGenerator';
import { SettingsPanel } from '@/components/purchase/SettingsPanel';
import { BankInfoSection } from '@/components/purchase/BankInfoSection';
import type { PurchaseOrderData } from '@/types/purchase';
import { savePurchaseHistory } from '@/utils/purchaseHistory';
import { useRouter } from 'next/navigation';

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [editId, setEditId] = useState<string | undefined>(undefined);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const router = useRouter();

  const projectSpecificationRef = useRef<HTMLTextAreaElement>(null);
  const deliveryInfoRef = useRef<HTMLTextAreaElement>(null);
  const orderNumbersRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (session?.user?.name) {
      setData(prevData => ({
        ...prevData,
        from: prevData.from || session.user.name || '',
      }));
    }
  }, [session]);

  useEffect(() => {
    const textarea = projectSpecificationRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [data.projectSpecification]);

  useEffect(() => {
    const textarea = deliveryInfoRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [data.deliveryInfo]);

  useEffect(() => {
    const textarea = orderNumbersRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [data.orderNumbers]);

  // 检查是否为编辑模式
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const injected = (window as any).__PURCHASE_DATA__;
      const injectedId = (window as any).__EDIT_ID__;
      if (injected) {
        setData(injected);
        setEditId(injectedId);
        delete (window as any).__PURCHASE_DATA__;
        delete (window as any).__EDIT_ID__;
      }
    }
  }, []);

  // 生成PDF
  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratingProgress(10);
    let progressInterval: NodeJS.Timeout | undefined;
    try {
      // 启动进度条动画
      progressInterval = setInterval(() => {
        setGeneratingProgress(prev => {
          const increment = Math.max(1, (90 - prev) / 10);
          return prev >= 90 ? prev : prev + increment;
        });
      }, 100);
      const blob = await generatePurchaseOrderPDF(data, false);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `采购订单_${data.orderNo || 'new'}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      
      // 自动保存到历史记录
      try {
        savePurchaseHistory(data, editId);
        setSaveMessage('PDF已生成并保存');
      } catch {
        setSaveMessage('PDF生成成功，但保存失败');
      }
      setTimeout(() => setSaveMessage(''), 2000);
      // 进度条完成
      if (progressInterval) clearInterval(progressInterval);
      setGeneratingProgress(100);
      setTimeout(() => setGeneratingProgress(0), 500);
    } catch (err) {
      alert('生成PDF失败');
      if (progressInterval) clearInterval(progressInterval);
      setGeneratingProgress(0);
    } finally {
      setIsGenerating(false);
    }
  };

  // 预览PDF
  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const blob = await generatePurchaseOrderPDF(data, true);
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
    } catch (err) {
      alert('预览PDF失败');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleAmountBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const amount = parseFloat(value);
    if (!isNaN(amount)) {
      setData(prevData => ({ ...prevData, contractAmount: amount.toFixed(2) }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      savePurchaseHistory(data, editId);
      setSaveMessage('保存成功');
    } catch {
      setSaveMessage('保存失败');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 2000);
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0 relative"
                  title={editId ? '保存修改' : '保存新记录'}
                >
                  {isSaving ? (
                    <svg className="animate-spin h-5 w-5 text-gray-600 dark:text-[#98989D]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <Save className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                  )}
                  {saveMessage && (
                    <div className={`absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1.5 text-xs text-white rounded-lg whitespace-nowrap ${
                      saveMessage === 'PDF已生成并保存' || saveMessage === '保存成功' ? 'bg-green-500' : 'bg-red-500'
                    }`}>
                      {saveMessage}
                    </div>
                  )}
                </button>
                <Link
                  href="/purchase/history"
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                  title="历史记录"
                >
                  <History className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                </Link>
                <button
                  type="button"
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#3A3A3C] flex-shrink-0"
                  title="Settings"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-[#98989D]" />
                </button>
              </div>
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
                    ref={projectSpecificationRef}
                    className={`${inputClass} resize-none overflow-hidden`}
                    rows={1}
                    placeholder="项目规格描述（可多行输入）"
                    value={data.projectSpecification}
                    onChange={e => setData({ ...data, projectSpecification: e.target.value })}
                  />
                </div>
              </div>

              {/* 2. 付款条件 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <label className={subheadingClass}>2. 付款条件</label>
                  <input
                    className={`${inputClass} flex-1`}
                    value={data.paymentTerms}
                    onChange={e => setData({ ...data, paymentTerms: e.target.value })}
                    placeholder="交货后30天"
                  />
                </div>
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
                  <input
                    className={`${inputClass} flex-1`}
                    value={data.invoiceRequirements}
                    onChange={e => setData({ ...data, invoiceRequirements: e.target.value })}
                    placeholder="根据我司财务要求，开具发票。"
                  />
                </div>
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
                    ref={deliveryInfoRef}
                    className={`${inputClass} resize-none overflow-hidden`}
                    rows={1}
                    placeholder="收货人信息（可多行输入）"
                    value={data.deliveryInfo}
                    onChange={e => setData({ ...data, deliveryInfo: e.target.value })}
                  />
                </div>
              </div>

              {/* 5. 客户的订单号码 */}
              <div className="space-y-3">
                <label className={subheadingClass}>5. 客户的订单号码如下，请在交货时写在交货文件中和包装箱外部：</label>
                <textarea
                  ref={orderNumbersRef}
                  className={`${inputClass} resize-none overflow-hidden`}
                  rows={1}
                  placeholder="客户订单号码（可多行输入）"
                  value={data.orderNumbers}
                  onChange={e => setData({ ...data, orderNumbers: e.target.value })}
                />
              </div>
            </div>

            {/* 生成PDF和预览PDF按钮组 */}
            <div className="px-4 sm:px-6 py-4 border-t border-gray-100 dark:border-[#3A3A3C]">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <div className="w-full sm:w-auto sm:min-w-[180px]">
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF] hover:bg-[#0063CC] dark:bg-[#0A84FF] dark:hover:bg-[#0070E0] text-white font-medium shadow-sm shadow-[#007AFF]/20 dark:shadow-[#0A84FF]/20 hover:shadow-lg hover:shadow-[#007AFF]/25 dark:hover:shadow-[#0A84FF]/25 active:scale-[0.98] active:shadow-inner active:bg-[#0052CC] dark:active:bg-[#0063CC] w-full h-10 disabled:opacity-50 disabled:cursor-not-allowed ${isGenerating ? 'scale-[0.98] shadow-inner bg-[#0052CC] dark:bg-[#0063CC]' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      {isGenerating ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>生成中...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          <span>生成PDF</span>
                        </>
                      )}
                    </div>
                  </button>
                  {/* 进度条 */}
                  {isGenerating && (
                    <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
                      <div 
                        className="bg-[#007AFF] dark:bg-[#0A84FF] h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${Math.min(100, generatingProgress)}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={isPreviewing}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08] text-[#007AFF] dark:text-[#0A84FF] font-medium border border-[#007AFF]/20 dark:border-[#0A84FF]/20 hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12] hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30 active:bg-[#007AFF]/[0.16] dark:active:bg-[#0A84FF]/[0.16] active:scale-[0.98] active:shadow-inner w-full sm:w-auto sm:min-w-[120px] h-10 disabled:opacity-50 disabled:cursor-not-allowed ${isPreviewing ? 'scale-[0.98] shadow-inner bg-[#007AFF]/[0.16] dark:bg-[#0A84FF]/[0.16]' : ''}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    {isPreviewing ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>预览中...</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        <span>预览PDF</span>
                      </>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
      {/* PDF预览弹窗 */}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/50 dark:bg-[#000000]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#2C2C2E] w-full max-w-5xl h-[90vh] rounded-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-[#3A3A3C]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-[#F5F5F7]">
                PDF预览
              </h3>
              <button
                onClick={() => setPdfPreviewUrl(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-[#98989D] dark:hover:text-[#F5F5F7]"
              >
                <span className="sr-only">关闭</span>
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-4">
              <iframe
                src={pdfPreviewUrl}
                className="w-full h-full rounded-lg border border-gray-200 dark:border-[#3A3A3C]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}