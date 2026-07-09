import React from 'react';
import BaseInfoCompact, { BaseInfoCompactValue, BaseInfoCompactConfig } from '@/components/BaseInfoCompact';
import type { QuotationData } from '@/types/quotation';

interface CustomerInfoCompactProps {
  data: QuotationData;
  onChange: (data: Partial<QuotationData>) => void;
  type: 'quotation' | 'confirmation';
}

export const CustomerInfoCompact = React.memo(({ data, onChange, type }: CustomerInfoCompactProps) => {
  // 将QuotationData转换为BaseInfoCompact所需的格式
  const baseInfoValue: BaseInfoCompactValue = {
    customer: data.to || '',
    inquiryNo: data.inquiryNo || '',
    contractNo: data.contractNo || '',
    quotationNo: data.quotationNo || '',
    date: data.date || '',
  };

  // 配置BaseInfoCompact组件
  const config: BaseInfoCompactConfig = {
    type: type,
    showFields: {
      customer: true,
      inquiryNo: true, // 两种类型都需要显示询价单号
      contractNo: type === 'confirmation',
      quotationNo: true,
      date: true,
    },
    labels: {
      customer: 'Customer Information',
      inquiryNo: 'Inquiry No.',
      contractNo: 'Contract No.',
      quotationNo: 'Quotation No.',
      date: 'Date',
    },
    required: type === 'quotation' ? ['quotationNo', 'date'] : ['contractNo', 'date'],
  };

  const handleChange = (value: BaseInfoCompactValue) => {
    // 将BaseInfoCompact的值转换回QuotationData格式
    const updates: Partial<QuotationData> = {};

    if (value.customer !== data.to) {
      updates.to = value.customer;
    }
    if (value.inquiryNo !== data.inquiryNo) {
      updates.inquiryNo = value.inquiryNo;
    }
    if (value.contractNo !== data.contractNo) {
      updates.contractNo = value.contractNo;
    }
    if (value.quotationNo !== data.quotationNo) {
      updates.quotationNo = value.quotationNo;
    }
    if (value.date !== data.date) {
      updates.date = value.date;
    }

    // 只有当有实际变化时才调用onChange
    if (Object.keys(updates).length > 0) {
      onChange(updates);
    }
  };

  return (
    <BaseInfoCompact
      value={baseInfoValue}
      onChange={handleChange}
      config={config}
      compact={true}
    />
  );
});

CustomerInfoCompact.displayName = 'CustomerInfoCompact';
