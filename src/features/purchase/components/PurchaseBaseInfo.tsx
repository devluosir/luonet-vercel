import React, { useState, useEffect, useCallback } from 'react';
import { getLocalStorageJSON, getLocalStorageString } from '@/utils/safeLocalStorage';
import { PurchaseSupplierPicker } from '@/features/purchase-supplier/components/PurchaseSupplierPicker';
import { getPrimaryPurchaseSupplierContact } from '@/features/purchase-supplier/services/purchaseSupplierService';
import type { PurchaseSupplierSelection } from '@/features/purchase-supplier/types';

export interface PurchaseBaseInfoValue {
  attn?: string;
  purchaseSupplierId?: string;
  supplierName?: string;
  yourRef?: string;
  supplierQuoteDate?: string;
  orderNo?: string;
  ourRef?: string;
  date?: string;
  from?: string;
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
    from?: boolean;
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

function formatPurchaseSupplierAttn(selection: PurchaseSupplierSelection): string {
  const supplier = selection.supplier;
  if (!supplier) return selection.name;
  const contact = getPrimaryPurchaseSupplierContact(supplier);
  return [
    supplier.name,
    supplier.address,
    contact?.name ? `Attn: ${contact.name}` : '',
    contact?.phone ? `Tel: ${contact.phone}` : '',
    contact?.email ? `Email: ${contact.email}` : '',
  ].filter(Boolean).join('\n');
}

function SupplierField({
  label,
  value,
  supplierName,
  selectedId,
  onSelectionChange,
  onAttnChange,
  placeholder: _placeholder
}: {
  label: string;
  value: string;
  supplierName: string;
  selectedId?: string;
  onSelectionChange: (selection: PurchaseSupplierSelection) => void;
  onAttnChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-2">
      <PurchaseSupplierPicker
        selectedId={selectedId}
        value={supplierName}
        onChange={onSelectionChange}
        placeholder="选择或输入采购供应商"
      />
      <div className="group relative block">
      <textarea
        placeholder={' '}
        value={value}
        onChange={(e) => onAttnChange(e.target.value)}
        className="fi h-[36px] resize-y"
        style={{ height: '36px', minHeight: '36px' }}
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
    </div>
  );
}

export default function PurchaseBaseInfo({
  value,
  onChange,
  config,
  className = ''
}: PurchaseBaseInfoProps) {

  // 使用useCallback优化set函数，避免无限循环
  const set = useCallback((key: keyof PurchaseBaseInfoValue) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onChange({ ...value, [key]: e.target.value });
    }, [onChange, value]);

  // 使用useCallback优化SupplierField的onChange回调
  const handleAttnChange = useCallback((newValue: string) => {
    onChange({ ...value, attn: newValue });
  }, [onChange, value]);

  const handleSupplierSelection = useCallback((selection: PurchaseSupplierSelection) => {
    onChange({
      ...value,
      purchaseSupplierId: selection.id,
      supplierName: selection.supplier?.name || selection.name,
      attn: formatPurchaseSupplierAttn(selection),
    });
  }, [onChange, value]);

  // 移除自动设置from字段的useEffect，因为store已经在初始化时正确设置了

  // 默认显示字段配置
  const defaultShowFields = {
    attn: true,
    yourRef: true,
    supplierQuoteDate: true,
    orderNo: true,
    ourRef: true,
    date: true,
    from: true,
  };

  const showFields = { ...defaultShowFields, ...config.showFields };

  // 默认标签配置 - 根据页面类型动态设置
  const getDefaultLabels = (): Partial<Record<keyof PurchaseBaseInfoValue, string>> => {
    switch (config.type) {
      case 'create':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      case 'edit':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      case 'copy':
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
        };
      default:
        return {
          attn: '供应商信息 Supplier Information',
          yourRef: 'Your Ref',
          supplierQuoteDate: '报价日期 Quote Date',
          orderNo: '订单号 Order No.',
          ourRef: '询价号码 Our ref',
          date: '日期 Date',
          from: 'From',
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
          from: true,
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
          from: true,
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
          from: true,
        };
      default:
        return showFields;
    }
  };

  const fields = getFieldsForType();

  // From选项 - 基于localStorage用户信息
const getFromOptions = useCallback(() => {
  const options = ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'];

  // 在服务器端渲染时，只返回基本选项避免水合错误
  if (typeof window === 'undefined') {
    return options;
  }

  // 从localStorage获取当前用户名，与报价页面保持一致
  const currentUser = (() => {
    try {
      const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
      if (userInfo) return userInfo.username || '';

      // 使用安全的字符串获取函数
      const name = getLocalStorageString('username');
      return name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : '';
    } catch {
      return ''
    }
  })();

  // 如果当前用户不在预设列表中，将其添加到列表开头
  if (currentUser && !options.some(option => option.toLowerCase() === currentUser.toLowerCase())) {
    options.unshift(currentUser);
  }

  // 如果当前值不在列表中，也添加进去
  if (value.from && !options.some(option => option.toLowerCase() === value.from!.toLowerCase())) {
    options.unshift(value.from);
  }

  return options;
}, [value.from]);

  // 使用useState和useEffect来避免水合错误
  const [fromOptions, setFromOptions] = useState<string[]>(['Roger', 'Sharon', 'Emily', 'Summer', 'Nina']);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const options = getFromOptions();
    setFromOptions(options);

    // 如果当前from值是默认值（Roger），且当前用户不是Roger，则自动更新为当前用户
    if (value.from === 'Roger' && typeof window !== 'undefined') {
      try {
        const userInfo = getLocalStorageJSON('userInfo', null) as { username?: string } | null;
        const currentUser = userInfo?.username || getLocalStorageString('username');

        if (currentUser && currentUser.toLowerCase() !== 'roger') {
          const formattedUser = currentUser.charAt(0).toUpperCase() + currentUser.slice(1).toLowerCase();
          // 调用onChange来更新from值
          onChange({
            ...value,
            from: formattedUser
          });
        }
      } catch (error) {
        console.warn('自动更新from字段失败:', error);
      }
    }
  }, [getFromOptions, value.from, onChange, value]);

  return (
    <section className={`${className || ''}`}>
      {/* 对称布局：左右各6列 */}
      <div className="grid grid-cols-12 gap-3">
        {/* 左侧：供应商信息 */}
        {fields.attn && (
          <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-3">
            {/* 第一行：供应商信息 */}
            <div>
              <SupplierField
                label={labels.attn!}
                value={value.attn || ''}
                supplierName={value.supplierName || value.attn?.split(/\r?\n/).find((line) => line.trim())?.trim() || ''}
                selectedId={value.purchaseSupplierId}
                onSelectionChange={handleSupplierSelection}
                onAttnChange={handleAttnChange}
                placeholder={' '}
              />
            </div>
            {/* 第二行：Your Ref + 报价日期 并排 */}
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
        )}

        {/* 右侧：订单信息 */}
        <div className="col-span-12 md:col-span-6 lg:col-span-6 space-y-4">
          {/* 第一行：订单号 + From 并排 */}
          <div className="grid grid-cols-12 gap-2">
            {fields.orderNo && (
              <div className="col-span-7">
                <Field label={labels.orderNo!}>
                  <input
                    placeholder={' '}
                    value={value.orderNo || ''}
                    onChange={set('orderNo')}
                    className="fi"
                  />
                </Field>
              </div>
            )}
            {fields.from && (
              <div className="col-span-5">
                <select
                  value={value.from || ''}
                  onChange={set('from')}
                  className="fi"
                  data-type="select"
                  suppressHydrationWarning
                >
                  {isClient ? (
                    fromOptions.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  ) : (
                    // 服务器端渲染时只显示基本选项，避免水合错误
                    ['Roger', 'Sharon', 'Emily', 'Summer', 'Nina'].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>
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
