import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DomesticPartyDetails, QuotationData } from '@/types/quotation';
import type { Customer } from '@/features/customer/types';
import { findCustomerByName, getAllCustomers, getCachedCustomers, upsertDomesticCustomerInfo } from '@/features/customer/services/customerService';
import { Field } from '@/components/BaseInfoCompact';

interface DomesticCustomerInfoProps {
  data: QuotationData;
  onChange: (patch: Partial<QuotationData>) => void;
}

type PartyKey = 'domesticSeller' | 'domesticBuyer';
type PartyField = keyof DomesticPartyDetails;

const partyFields: Array<{ key: PartyField; label: string }> = [
  { key: 'name', label: '单位名称' },
  { key: 'address', label: '单位地址' },
  { key: 'legalRepresentative', label: '法定代表人' },
  { key: 'agent', label: '委托代理人' },
  { key: 'phone', label: '电话' },
  { key: 'fax', label: '传真' },
  { key: 'taxNo', label: '纳税人识别号' },
  { key: 'bankName', label: '开户行' },
  { key: 'bankAccount', label: '帐号' },
];

const fieldLabel = (key: PartyField): string => partyFields.find((f) => f.key === key)?.label ?? key;

const BUYER_CUSTOMER_LIST_ID = 'domestic-buyer-customer-options';

// 与外贸报价合同页面（BaseInfoCompact.tsx）同一套浮动标签输入框样式：.fi + placeholder=' '
function TextField({
  label,
  value,
  onChange,
  onBlur,
  listId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  listId?: string;
}) {
  return (
    <Field label={label}>
      <input
        type="text"
        placeholder=" "
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        list={listId}
        className="fi"
      />
    </Field>
  );
}

// 单位地址内容通常较长（自贸区/门牌号等），用可自动增高的多行文本框展示，
// 避免像单行 input 那样把后半段内容裁掉看不见
function TextAreaField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const adjust = useCallback((el: HTMLTextAreaElement) => {
    el.style.height = '36px';
    el.style.height = `${Math.max(36, Math.min(el.scrollHeight, 120))}px`;
  }, []);

  useEffect(() => {
    if (ref.current) adjust(ref.current);
  }, [value, adjust]);

  return (
    <Field label={label}>
      <textarea
        ref={ref}
        value={value}
        rows={1}
        placeholder=" "
        onChange={(e) => {
          onChange(e.target.value);
          adjust(e.target);
        }}
        className="fi-multiline resize-none overflow-hidden"
      />
    </Field>
  );
}

export const DomesticCustomerInfo = React.memo(function DomesticCustomerInfo({
  data,
  onChange,
}: DomesticCustomerInfoProps) {
  const seller = useMemo(() => data.domesticSeller ?? {}, [data.domesticSeller]);
  const buyer = useMemo(() => data.domesticBuyer ?? {}, [data.domesticBuyer]);
  const isContract = (data.domesticDocType ?? 'contract') === 'contract';

  const [customerOptions, setCustomerOptions] = useState<Customer[]>([]);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');

  // 需方"客户名称"候选列表，用于 <datalist> 提示 + 精确匹配后调用已保存资料
  useEffect(() => {
    let cancelled = false;
    setCustomerOptions(getCachedCustomers('customer'));
    getAllCustomers().then((customers) => {
      if (!cancelled) setCustomerOptions(customers);
    }).catch(() => {
      // 静默失败：保留缓存/空列表，不影响手动录入
    });
    return () => { cancelled = true; };
  }, []);

  // 供方/需方字段的独立更新：仅写入 domesticSeller/domesticBuyer 自身，
  // 不再回写 data.from/data.to —— 那两个字段是外贸报价单/销售确认的客户资料，
  // 内销报价单必须与它们完全独立，避免互相污染
  const updateParty = useCallback(
    (party: PartyKey, field: PartyField, value: string) => {
      const current = party === 'domesticSeller' ? seller : buyer;
      const nextParty = { ...current, [field]: value };
      onChange({ [party]: nextParty } as Partial<QuotationData>);
    },
    [buyer, onChange, seller]
  );

  // 需方单位名称失焦时，若与已保存客户档案精确匹配，则整段调用该客户的内销资料
  const handleBuyerNameBlur = useCallback(() => {
    const name = (buyer.name ?? '').trim();
    if (!name) return;
    const matched = customerOptions.find((c) => c.name.trim() === name);
    if (!matched) return;

    const nextBuyer: DomesticPartyDetails = {
      ...buyer,
      name: matched.name,
      address: matched.address || buyer.address,
      legalRepresentative: matched.domesticInfo?.legalRepresentative ?? buyer.legalRepresentative,
      agent: matched.domesticInfo?.agent ?? buyer.agent,
      phone: matched.domesticInfo?.phone ?? buyer.phone,
      fax: matched.domesticInfo?.fax ?? buyer.fax,
      taxNo: matched.domesticInfo?.taxNo ?? buyer.taxNo,
      bankName: matched.domesticInfo?.bankName ?? buyer.bankName,
      bankAccount: matched.domesticInfo?.bankAccount ?? buyer.bankAccount,
    };
    onChange({ domesticBuyer: nextBuyer });
  }, [buyer, customerOptions, onChange]);

  const handleSaveBuyerToCustomer = useCallback(async () => {
    const name = (buyer.name ?? '').trim();
    if (!name) {
      setSaveState('error');
      setSaveMessage('请先填写需方单位名称');
      return;
    }
    setSaveState('saving');
    setSaveMessage('');
    try {
      await upsertDomesticCustomerInfo({
        name,
        address: buyer.address,
        domesticInfo: {
          legalRepresentative: buyer.legalRepresentative,
          agent: buyer.agent,
          phone: buyer.phone,
          fax: buyer.fax,
          taxNo: buyer.taxNo,
          bankName: buyer.bankName,
          bankAccount: buyer.bankAccount,
        },
      });
      setSaveState('saved');
      setSaveMessage('已保存至客户资料，下次输入相同单位名称可自动调用');
      // 刷新候选列表，便于同一页面内立即"调用"
      const refreshed = await findCustomerByName(name);
      if (refreshed) {
        setCustomerOptions((prev) => {
          const others = prev.filter((c) => c.id !== refreshed.id);
          return [...others, refreshed];
        });
      }
    } catch (error) {
      setSaveState('error');
      setSaveMessage(error instanceof Error ? error.message : '保存失败');
    }
  }, [buyer]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <TextField
          label={isContract ? '合同编号' : '报价单编号'}
          value={data.quotationNo || ''}
          onChange={(value) => onChange({ quotationNo: value })}
        />
        <TextField
          label={isContract ? '签订时间' : '报价日期'}
          value={data.date || ''}
          onChange={(value) => onChange({ date: value })}
        />
        <TextField
          label="询价编号"
          value={data.inquiryNo || ''}
          onChange={(value) => onChange({ inquiryNo: value })}
        />
      </div>

      <datalist id={BUYER_CUSTOMER_LIST_ID}>
        {customerOptions.map((customer) => (
          <option key={customer.id} value={customer.name} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {([
          ['domesticSeller', '供方', seller],
          ['domesticBuyer', '需方', buyer],
        ] as const).map(([party, title, details]) => (
          <section
            key={party}
            className="rounded-xl border border-[#E5E5EA] bg-white/70 p-2.5 dark:border-[#3A3A3C] dark:bg-[#1C1C1E]/60"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
                {title}
              </h3>
              {isContract && party === 'domesticBuyer' && (
                <button
                  type="button"
                  onClick={handleSaveBuyerToCustomer}
                  disabled={saveState === 'saving'}
                  className="rounded-lg border border-[#007AFF]/30 px-2 py-1 text-xs font-medium text-[#007AFF] transition-colors hover:bg-[#007AFF]/10 disabled:opacity-50 dark:border-[#0A84FF]/40 dark:text-[#0A84FF]"
                >
                  {saveState === 'saving' ? '保存中…' : '保存客户资料'}
                </button>
              )}
            </div>
            {/* 报价单模式下 PDF 只显示单位名称，法定代表人/税号/开户行等详情表仅产品购销合同模式才输出，
                这里也只保留"单位名称"字段，避免用户填了却用不上 */}
            {!isContract ? (
              <TextField
                label={fieldLabel('name')}
                value={String(details.name ?? '')}
                onChange={(value) => updateParty(party, 'name', value)}
                onBlur={party === 'domesticBuyer' ? handleBuyerNameBlur : undefined}
                listId={party === 'domesticBuyer' ? BUYER_CUSTOMER_LIST_ID : undefined}
              />
            ) : (
              <div className="space-y-2">
                {/* 长字段各占一行：名称、地址（多行文本框），避免单行输入框把后半段内容裁掉 */}
                <TextField
                  label={fieldLabel('name')}
                  value={String(details.name ?? '')}
                  onChange={(value) => updateParty(party, 'name', value)}
                  onBlur={party === 'domesticBuyer' ? handleBuyerNameBlur : undefined}
                  listId={party === 'domesticBuyer' ? BUYER_CUSTOMER_LIST_ID : undefined}
                />
                <TextAreaField
                  label={fieldLabel('address')}
                  value={String(details.address ?? '')}
                  onChange={(value) => updateParty(party, 'address', value)}
                />
                {/* 纳税人识别号/电话两两配对，法定代表人/委托代理人、开户行/帐号同理，进一步收紧行数 */}
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label={fieldLabel('taxNo')}
                    value={String(details.taxNo ?? '')}
                    onChange={(value) => updateParty(party, 'taxNo', value)}
                  />
                  <TextField
                    label={fieldLabel('phone')}
                    value={String(details.phone ?? '')}
                    onChange={(value) => updateParty(party, 'phone', value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label={fieldLabel('legalRepresentative')}
                    value={String(details.legalRepresentative ?? '')}
                    onChange={(value) => updateParty(party, 'legalRepresentative', value)}
                  />
                  <TextField
                    label={fieldLabel('agent')}
                    value={String(details.agent ?? '')}
                    onChange={(value) => updateParty(party, 'agent', value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <TextField
                    label={fieldLabel('bankName')}
                    value={String(details.bankName ?? '')}
                    onChange={(value) => updateParty(party, 'bankName', value)}
                  />
                  <TextField
                    label={fieldLabel('bankAccount')}
                    value={String(details.bankAccount ?? '')}
                    onChange={(value) => updateParty(party, 'bankAccount', value)}
                  />
                </div>
              </div>
            )}
            {!isContract && (
              <p className="mt-2 text-[11px] text-[#86868B] dark:text-[#98989D]">
                提示：切换到「产品购销合同」可填写地址/法定代表人/税号/开户行等详情并加盖印章。
              </p>
            )}
            {isContract && party === 'domesticBuyer' && saveMessage && (
              <p className={`mt-2 text-xs ${saveState === 'error' ? 'text-red-500' : 'text-[#34C759] dark:text-[#30D158]'}`}>
                {saveMessage}
              </p>
            )}
            {isContract && party === 'domesticBuyer' && (
              <p className="mt-2 text-[11px] text-[#86868B] dark:text-[#98989D]">
                提示：单位名称与已保存客户资料完全一致时，失焦后会自动调用其地址/税号/开户行等信息。
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
});
