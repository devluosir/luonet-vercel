'use client';

import { useState } from 'react';
import { ConsigneeSection } from '@/components/packinglist/ConsigneeSection';
import { BasicInfoSectionProps } from '../types';

export const BasicInfoSection: React.FC<BasicInfoSectionProps & {
  onShowShippingMarks: () => void;
  inputClassName: string;
  dateInputClassName: string;
  iosCaretStyle: React.CSSProperties;
}> = ({ 
  data, 
  onDataChange, 
  onShowShippingMarks,
  inputClassName,
  dateInputClassName,
  iosCaretStyle
}) => {
  const [showSavedConsignees, setShowSavedConsignees] = useState(false);

  const handleConsigneeChange = (consigneeData: { consigneeName: string; orderNo: string }) => {
    onDataChange({
      ...data,
      consignee: { name: consigneeData.consigneeName },
      orderNo: consigneeData.orderNo
    });
  };

  return (
    <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-[#3A3A3C]">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7] mb-6">
        基本信息
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 收货人信息 */}
        <div className="md:col-span-2 lg:col-span-2">
          <ConsigneeSection
            consigneeName={data.consignee.name}
            orderNo={data.orderNo}
            onChange={handleConsigneeChange}
          />
        </div>

        {/* 发票号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            发票号
          </label>
          <input
            type="text"
            value={data.invoiceNo}
            onChange={(e) => onDataChange({ ...data, invoiceNo: e.target.value })}
            className={inputClassName}
            style={iosCaretStyle}
            placeholder="请输入发票号"
          />
        </div>

        {/* 日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            日期
          </label>
          <input
            type="date"
            value={data.date}
            onChange={(e) => onDataChange({ ...data, date: e.target.value })}
            className={dateInputClassName}
            style={iosCaretStyle}
          />
        </div>

        {/* 唛头号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            唛头号
          </label>
          <div className="relative">
            <input
              type="text"
              value={data.markingNo}
              onChange={(e) => onDataChange({ ...data, markingNo: e.target.value })}
              className={inputClassName}
              style={iosCaretStyle}
              placeholder="请输入唛头号"
            />
            <button
              type="button"
              onClick={onShowShippingMarks}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#007AFF] hover:text-[#0056CC] transition-colors"
              title="编辑唛头"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
