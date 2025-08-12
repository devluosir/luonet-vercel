'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { MoreHorizontal } from 'lucide-react';
import type { QuotationData } from '@/types/quotation';
import { calculatePaymentDate } from '@/utils/quotationCalculations';

interface PaymentTermsSectionProps {
  data: QuotationData;
  onChange: (data: Partial<QuotationData>) => void;
}

const PRESETS = [
  '100% T/T in advance.',
  '100% before shipment.',
  '30% deposit, 70% before shipment.',
  '50% deposit, 50% before shipment.',
  'D/P (Documents against Payment).',
  'D/A (Documents against Acceptance).',
  'Net 30 days.',
  'Net 60 days.',
  'Net 90 days.',
];

function addDays(iso: string, d: number): string {
  const base = new Date(iso || new Date().toISOString().slice(0, 10));
  base.setDate(base.getDate() + d);
  return base.toISOString().slice(0, 10);
}

// 解析附加条款字符串为数组
function parseAdditionalTerms(text: string): string[] {
  if (!text?.trim()) return [];
  return text.split('\n').map(line => line.trim()).filter(Boolean);
}

// 数组转换为字符串
function termsToString(terms: string[]): string {
  return terms.join('\n');
}

export function PaymentTermsSection({ data, onChange }: PaymentTermsSectionProps) {
  const {
    showPaymentTerms = false,
    paymentDate = '',
    additionalPaymentTerms = '',
    showInvoiceReminder = false,
    showBank = false,
    showStamp = false,
    contractNo = '',
    date = '' // 报价日期作为基准
  } = data;

  const [showMainTerm, setShowMainTerm] = useState(showPaymentTerms);
  const [extra, setExtra] = useState('');
  const [showPresets, setShowPresets] = useState(false);
  const presetsRef = useRef<HTMLDivElement>(null);

  // 解析附加条款为数组
  const additionalTermsArray = useMemo(() => parseAdditionalTerms(additionalPaymentTerms), [additionalPaymentTerms]);

  // 更新函数
  const updateData = useCallback((patch: Partial<QuotationData>) => {
    onChange(patch);
  }, [onChange]);

  const quotationDate = date || new Date().toISOString().slice(0, 10);
  const contractNoExternal = contractNo;

  // 以报价日期为基准计算付款日期
  const dateISO = paymentDate || calculatePaymentDate(quotationDate);
  const main = `Full payment not later than ${dateISO} by telegraphic transfer (T/T).`;
  const contractHint = showInvoiceReminder
    ? `Please state our contract no. "${contractNoExternal?.trim() || 'TBD'}" on your payment documents.`
    : '';

  // 同步showMainTerm到data
  React.useEffect(() => {
    updateData({ showMainPaymentTerm: showMainTerm });
  }, [showMainTerm, updateData]);

  // 同步data.showPaymentTerms到showMainTerm
  React.useEffect(() => {
    setShowMainTerm(showPaymentTerms);
  }, [showPaymentTerms]);

  // 点击外部关闭预设弹窗
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (presetsRef.current && !presetsRef.current.contains(event.target as Node)) {
        setShowPresets(false);
      }
    };

    if (showPresets) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPresets]);

  const preview = useMemo(() => {
    const items: { index: number; content: React.ReactNode }[] = [];
    
    // 计算条款总数
    let totalTerms = 0;
    if (showMainTerm && dateISO && dateISO.trim()) totalTerms++;
    if (additionalTermsArray.length > 0) totalTerms += additionalTermsArray.length;
    if (showInvoiceReminder) totalTerms++;
    
    // 根据条款数量决定使用单数还是复数形式
    const titleText = totalTerms === 1 ? 'Payment Term: ' : 'Payment Terms:';
    
    if (totalTerms === 1) {
      // 单条付款条款的情况，标题和内容在同一行
      if (additionalTermsArray.length > 0) {
        items.push({
          index: 1,
          content: <span dangerouslySetInnerHTML={{ __html: `<strong>${titleText}</strong>${additionalTermsArray[0]}` }} />
        });
      } else if (showMainTerm && dateISO && dateISO.trim()) {
        // 将日期部分高亮为红色
        const mainWithRedDate = main.replace(
          dateISO, 
          `<span style="color: #ef4444">${dateISO}</span>`
        );
        items.push({
          index: 1,
          content: <span dangerouslySetInnerHTML={{ __html: `<strong>${titleText}</strong>${mainWithRedDate}` }} />
        });
      } else if (showInvoiceReminder) {
        const displayContractNo = contractNoExternal?.trim() || 'TBD';
        const hintWithRedContract = contractHint.replace(
          `"${displayContractNo}"`,
          `"<span style="color: #ef4444">${displayContractNo}</span>"`
        );
        items.push({
          index: 1,
          content: <span dangerouslySetInnerHTML={{ __html: `<strong>${titleText}</strong>${hintWithRedContract}` }} />
        });
      }
    } else {
      // 多条付款条款的情况，使用编号列表格式
      let termIndex = 1;
      
      // 1. 附加条款（按行拆分，每行一个条款）
      additionalTermsArray.forEach(term => {
        if (term.trim()) {
          items.push({
            index: termIndex,
            content: `${termIndex}. ${term.trim()}`
          });
          termIndex++;
        }
      });
      
      // 2. 主条款（与PDF逻辑保持一致）
      if (showMainTerm && dateISO && dateISO.trim()) {
        // 将日期部分高亮为红色
        const mainWithRedDate = main.replace(
          dateISO, 
          `<span style="color: #ef4444">${dateISO}</span>`
        );
        items.push({
          index: termIndex,
          content: <span dangerouslySetInnerHTML={{ __html: `${termIndex}. ${mainWithRedDate}` }} />
        });
        termIndex++;
      }
      
      // 3. 合同号提醒（合同号显示为红色）
      if (showInvoiceReminder) {
        const displayContractNo = contractNoExternal?.trim() || 'TBD';
        const hintWithRedContract = contractHint.replace(
          `"${displayContractNo}"`,
          `"<span style="color: #ef4444">${displayContractNo}</span>"`
        );
        items.push({
          index: termIndex,
          content: <span dangerouslySetInnerHTML={{ __html: `${termIndex}. ${hintWithRedContract}` }} />
        });
      }
    }
    
    return items;
  }, [showMainTerm, main, dateISO, additionalTermsArray, contractHint, contractNoExternal, showInvoiceReminder]);



  return (
    <div className="space-y-3">
      {/* 标题移到框外 */}
              <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-800 dark:text-gray-200">Payment Terms</h3>
          {/* Bank按钮 */}
          <button
            type="button"
            onClick={() => updateData({ showBank: !data.showBank })}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
              data.showBank
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border border-green-300 dark:border-green-700'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
            title="显示银行信息"
          >
            <span className={`w-2 h-2 rounded-full ${data.showBank ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            Bank
          </button>
        </div>
      
      {/* 内容框 */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 space-y-3">
        {/* 行1：附加条款 + 预设 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              placeholder="Additional term… (Enter to add)"
              className="w-full rounded border border-blue-300 dark:border-blue-600 pl-8 pr-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-blue-500 dark:placeholder-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && extra.trim()) {
                  const newTerms = Array.from(new Set([...additionalTermsArray, extra.trim()]));
                  updateData({ additionalPaymentTerms: termsToString(newTerms) });
                  setExtra('');
                }
              }}
            />
            <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
            </div>
            <div className="absolute left-6 top-1/2 transform -translate-y-1/2 text-xs text-blue-600 dark:text-blue-400 font-medium">
              +
            </div>
          </div>
          <div className="relative" ref={presetsRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-blue-300 dark:border-blue-600 px-2 py-1.5 text-xs hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/10"
              onClick={() => setShowPresets(!showPresets)}
            >
              <MoreHorizontal size={14} />
            </button>
            {showPresets && (
              <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 p-1 shadow-md">
                {PRESETS.map(p => (
                  <button 
                    key={p}
                    type="button"
                    className="w-full truncate text-left text-xs px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                    onClick={() => {
                      const newTerms = Array.from(new Set([...additionalTermsArray, p]));
                      updateData({ additionalPaymentTerms: termsToString(newTerms) });
                      setShowPresets(false); // 选择后自动关闭
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {!!additionalTermsArray.length && (
          <div className="flex flex-wrap gap-2">
            {additionalTermsArray.map((t, i) => (
              <span 
                key={i} 
                className="group inline-flex items-center gap-1 rounded-full border border-blue-300 dark:border-blue-600 px-2 py-1 text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 shadow-sm"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 flex-shrink-0"></span>
                {t}
                <button 
                  type="button"
                  className="opacity-60 group-hover:opacity-100 hover:text-red-500 ml-1"
                  onClick={() => {
                    const newTerms = additionalTermsArray.filter((_, idx) => idx !== i);
                    updateData({ additionalPaymentTerms: termsToString(newTerms) });
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 行2：主条款（内联控件） */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showMainTerm}
            onChange={(e) => setShowMainTerm(e.target.checked)}
            className="h-4 w-4 accent-black dark:accent-white"
          />
          <span>Full payment not later than</span>
          <input
            type="date"
            className="rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={dateISO}
            onChange={(e) => updateData({ paymentDate: e.target.value })}
          />
          <div className="inline-flex overflow-hidden rounded border border-gray-300 dark:border-gray-600">
            {[3, 7, 30].map(d => (
              <button 
                key={d}
                type="button"
                className="border-r border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs last:border-r-0 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                onClick={() => {
                  const nextDate = addDays(quotationDate, d);
                  updateData({ paymentDate: nextDate });
                }}
              >
                +{d}d
              </button>
            ))}
          </div>
          <span>by telegraphic transfer (T/T).</span>
        </div>
      </div>

      {/* 行3：合同提醒（只读展示合同号） */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showInvoiceReminder}
            onChange={(e) => updateData({ showInvoiceReminder: e.target.checked })}
            className="h-4 w-4 accent-black dark:accent-white"
          />
          <span>Please state our contract no. "</span>
          <span className="font-medium text-orange-600 dark:text-orange-400">
            {contractNoExternal?.trim() || 'TBD'}
          </span>
          <span>" on your payment documents.</span>
        </div>
      </div>

      {/* 预览（简洁版本） */}
      {preview.length > 0 && (
        <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50 p-2 text-[11px] leading-5 text-gray-900 dark:text-gray-100 font-mono">
          {preview.map((item, index) => (
            <div key={index} className="mb-1 last:mb-0">
              {typeof item.content === 'string' ? item.content : item.content}
            </div>
          ))}
        </div>
      )}
      </section>
    </div>
  );
}