import React, { useCallback, useMemo } from 'react';
import type { DomesticPartyDetails, QuotationData } from '@/types/quotation';

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

function FieldInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-[#86868B] dark:text-[#98989D]">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-lg border border-[#E5E5EA] bg-white px-2 text-sm text-[#1D1D1F] outline-none transition-colors focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/25 dark:border-[#3A3A3C] dark:bg-[#1C1C1E] dark:text-[#F5F5F7]"
      />
    </label>
  );
}

export const DomesticCustomerInfo = React.memo(function DomesticCustomerInfo({
  data,
  onChange,
}: DomesticCustomerInfoProps) {
  const seller = useMemo(() => data.domesticSeller ?? {}, [data.domesticSeller]);
  const buyer = useMemo(() => data.domesticBuyer ?? {}, [data.domesticBuyer]);

  const updateParty = useCallback(
    (party: PartyKey, field: PartyField, value: string) => {
      const current = party === 'domesticSeller' ? seller : buyer;
      const nextParty = { ...current, [field]: value };
      const patch: Partial<QuotationData> = { [party]: nextParty };

      if (party === 'domesticSeller' && field === 'name') {
        patch.from = value;
      }
      if (party === 'domesticBuyer' && field === 'name') {
        patch.to = value;
      }

      onChange(patch);
    },
    [buyer, onChange, seller]
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E5E5EA] bg-white/70 p-3 dark:border-[#3A3A3C] dark:bg-[#1C1C1E]/60 md:grid-cols-3">
        <FieldInput
          label="报价单编号"
          value={data.quotationNo || ''}
          onChange={(value) => onChange({ quotationNo: value })}
        />
        <FieldInput
          label="报价日期"
          value={data.date || ''}
          onChange={(value) => onChange({ date: value })}
        />
        <FieldInput
          label="询价编号"
          value={data.inquiryNo || ''}
          onChange={(value) => onChange({ inquiryNo: value })}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {([
          ['domesticSeller', '供方', seller],
          ['domesticBuyer', '需方', buyer],
        ] as const).map(([party, title, details]) => (
          <section
            key={party}
            className="rounded-xl border border-[#E5E5EA] bg-white/70 p-3 dark:border-[#3A3A3C] dark:bg-[#1C1C1E]/60"
          >
            <h3 className="mb-3 text-sm font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {title}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {partyFields.map((field) => (
                <FieldInput
                  key={field.key}
                  label={field.label}
                  value={String(details[field.key] ?? '')}
                  onChange={(value) => updateParty(party, field.key, value)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
});
