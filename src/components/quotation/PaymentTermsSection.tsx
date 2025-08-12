'use client';

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { MoreHorizontal, Copy } from 'lucide-react';
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
    contractNo = '',
    date = '' // 报价日期作为基准
  } = data;

  const [showMainTerm, setShowMainTerm] = useState(false);
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

  // 移除自动同步逻辑，让showMainTerm完全独立控制

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
      if (showMainTerm && dateISO && dateISO.trim()) {
        // 将日期部分高亮为红色
        const mainWithRedDate = main.replace(
          dateISO, 
          `<span style="color: #ef4444">${dateISO}</span>`
        );
        items.push({
          index: 1,
          content: <span dangerouslySetInnerHTML={{ __html: `<strong>${titleText}</strong>${mainWithRedDate}` }} />
        });
      } else if (additionalTermsArray.length > 0) {
        items.push({
          index: 1,
          content: <span dangerouslySetInnerHTML={{ __html: `<strong>${titleText}</strong>${additionalTermsArray[0]}` }} />
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
      
      // 1. 主条款（与PDF逻辑保持一致）
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
      
      // 2. 附加条款（按行拆分，每行一个条款）
      additionalTermsArray.forEach(term => {
        if (term.trim()) {
          items.push({
            index: termIndex,
            content: `${termIndex}. ${term.trim()}`
          });
          termIndex++;
        }
      });
      
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
      <h3 className="font-medium text-gray-800 dark:text-gray-200">Payment Terms</h3>
      
      {/* 内容框 */}
      <section className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3 md:p-4 space-y-3">
        {/* 行1：主条款（内联控件） */}
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

      {/* 行2：附加条款 + 预设 */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input
            placeholder="Additional term… (Enter to add)"
            className="flex-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
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
          <div className="relative" ref={presetsRef}>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-xs hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer text-gray-700 dark:text-gray-300"
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
                className="group inline-flex items-center gap-1 rounded-full border border-gray-300 dark:border-gray-600 px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
              >
                {t}
                <button 
                  type="button"
                  className="opacity-60 group-hover:opacity-100 hover:text-red-500"
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

      {/* 行3：合同提醒（只读展示合同号） */}
      <div className="flex items-center justify-between text-sm">
        <label className="inline-flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={showInvoiceReminder}
            onChange={(e) => updateData({ showInvoiceReminder: e.target.checked })}
            className="h-4 w-4 accent-black dark:accent-white"
          />
          Show contract reminder
        </label>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Contract No: {contractNoExternal?.trim() || 'N/A'}
        </span>
      </div>

      {/* 预览（底部一行卡片） */}
      <div className="rounded-lg border border-gray-200 dark:border-gray-600 bg-neutral-50 dark:bg-gray-800/30 p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Preview</span>
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded border border-gray-300 dark:border-gray-600 px-2 py-0.5 text-[11px] hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            onClick={() => {
              // 生成纯文本版本用于复制
              const textVersion = preview.map(item => {
                if (typeof item.content === 'string') {
                  return item.content;
                } else {
                  // 从HTML中提取纯文本
                  const div = document.createElement('div');
                  div.innerHTML = (item.content as any).props.dangerouslySetInnerHTML.__html;
                  return div.textContent || div.innerText || '';
                }
              }).join('\n');
              navigator.clipboard.writeText(textVersion);
            }}
          >
            <Copy size={12} /> Copy
          </button>
        </div>
        <div className="whitespace-pre-wrap rounded bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 p-2 text-[11px] leading-5 text-gray-900 dark:text-gray-100 font-mono">
          {preview.map((item, index) => (
            <div key={index} className="mb-1 last:mb-0">
              {typeof item.content === 'string' ? item.content : item.content}
            </div>
          ))}
        </div>
      </div>
      </section>
    </div>
  );
}