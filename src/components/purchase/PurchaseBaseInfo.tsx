import React, { useRef } from 'react';
import { useAutoResizeTextareas } from '@/hooks/useAutoResizeTextareas';

export interface PurchaseBaseInfoValue {
  attn?: string;
  yourRef?: string;
  supplierQuoteDate?: string;
  orderNo?: string;
  ourRef?: string;
  date?: string;
}

export interface PurchaseBaseInfoConfig {
  type: 'create' | 'edit' | 'copy';
  showFields?: {
    attn?: boolean;
    yourRef?: boolean;
    supplierQuoteDate?: boolean;
    orderNo?: boolean;
    ourRef?: boolean;
    date?: boolean;
  };
  labels?: Partial<Record<keyof PurchaseBaseInfoValue, string>>;
  required?: (keyof PurchaseBaseInfoValue)[];
}

export interface PurchaseBaseInfoProps {
  value: PurchaseBaseInfoValue;
  onChange: (value: PurchaseBaseInfoValue) => void;
  config: PurchaseBaseInfoConfig;
  className?: string;
}

// 浮动标签字段组件
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="group block relative">
      {children}
      <span
        className="
          pointer-events-none absolute left-3 top-[14px] text-[13px] text-slate-400 dark:text-gray-400
          transition-all bg-white/80 dark:bg-gray-800/80 px-1 z-10
          group-[&:has(input:focus)]:top-0 group-[&:has(textarea:focus)]:top-0
          group-[&:has(input:not(:placeholder-shown))]:top-0
          group-[&:has(textarea:not(:placeholder-shown))]:top-0
          -translate-y-1/2 group-[&:has(input:focus)]:-translate-y-1/2 group-[&:has(textarea:focus)]:-translate-y-1/2
        "
      >
        {label}
      </span>
    </label>
  );
}

// 供应商信息字段组件（带浮动标签的textarea）
function SupplierField({ 
  label, 
  value, 
  onChange, 
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
}) {
  return (
    <div className="group block relative">
      <textarea
        rows={3}
        placeholder={' '}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fi-multiline h-[90px] resize-y"
      />
      <span
        className="
          pointer-events-none absolute left-3 top-[14px] text-[13px] text-slate-400 dark:text-gray-400
          transition-all bg-white/80 dark:bg-gray-800/80 px-1 z-10
          group-[&:has(textarea:focus)]:top-0
          group-[&:has(textarea:not(:placeholder-shown))]:top-0
          -translate-y-1/2 group-[&:has(textarea:focus)]:-translate-y-1/2
        "
      >
        {label}
      </span>
    </div>
  );
}

export default function PurchaseBaseInfo({ 
  value, 
  onChange, 
  config, 
  className = ''
}: PurchaseBaseInfoProps) {
  const set = (key: keyof PurchaseBaseInfoValue) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange({ ...value, [key]: e.target.value });
    };

  // 默认显示字段配置
  const defaultShowFields = {
    attn: true,
    yourRef: true,
    supplierQuoteDate: true,
    orderNo: true,
    ourRef: true,
    date: true,
  };

  const showFields = { ...defaultShowFields, ...config.showFields };

  // 默认标签配置 - 根据页面类型动态设置
  const getDefaultLabels = (): Record<keyof PurchaseBaseInfoValue, string> => {
    switch (config.type) {
      case 'create':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
        };
      case 'edit':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
        };
      case 'copy':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
        };
      default:
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
        };
    }
  };

  const defaultLabels = getDefaultLabels();
  const labels = { ...defaultLabels, ...config.labels };

  // 根据页面类型动态调整字段配置
  const getFieldsForType = () => {
    switch (config.type) {
      case 'create':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
        };
      case 'edit':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
        };
      case 'copy':
        return {
          ...showFields,
          attn: true,
          yourRef: true,
          supplierQuoteDate: true,
          orderNo: true,
          ourRef: true,
          date: true,
        };
      default:
        return showFields;
    }
  };

  const fields = getFieldsForType();

  return (
    <section className={`rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4 ${className || ''}`}>
      {/* 行1：左大右小 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 左侧：供应商信息 */}
        {fields.attn && (
          <div className="col-span-12 md:col-span-7 lg:col-span-7">
            <div className="space-y-3">
              <div>
                <SupplierField
                  label={labels.attn!}
                  value={value.attn || ''}
                  onChange={(newValue) => onChange({ ...value, attn: newValue })}
                  placeholder={' '}
                />
              </div>
              {/* Your Ref + 报价日期 并排 */}
              <div className="grid grid-cols-12 gap-2">
                {fields.yourRef && (
                  <div className="col-span-7">
                    <Field label={labels.yourRef!}>
                      <input
                        placeholder={' '}
                        value={value.yourRef || ''}
                        onChange={set('yourRef')}
                        className="fi"
                      />
                    </Field>
                  </div>
                )}
                {fields.supplierQuoteDate && (
                  <div className="col-span-5">
                    <Field label={labels.supplierQuoteDate!}>
                      <input
                        type="date"
                        value={value.supplierQuoteDate?.replaceAll('/', '-') || ''}
                        onChange={set('supplierQuoteDate')}
                        className="fi"
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 右侧：订单信息 */}
        <div className="col-span-12 md:col-span-5 lg:col-span-5 space-y-[10px]">
          {/* 第一行：订单号 */}
          {fields.orderNo && (
            <Field label={labels.orderNo!}>
              <input
                placeholder={' '}
                value={value.orderNo || ''}
                onChange={set('orderNo')}
                className="fi"
              />
            </Field>
          )}
          {/* 第二行：询价号 + 日期并排 */}
          <div className="grid grid-cols-12 gap-2">
            {fields.ourRef && (
              <div className="col-span-7">
                <Field label={labels.ourRef!}>
                  <input
                    placeholder={' '}
                    value={value.ourRef || ''}
                    onChange={set('ourRef')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
            {fields.date && (
              <div className="col-span-5">
                <Field label={labels.date!}>
                  <input
                    type="date"
                    value={value.date?.replaceAll('/', '-') || ''}
                    onChange={set('date')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
