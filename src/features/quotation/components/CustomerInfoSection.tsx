import React from 'react';
import { FormField, FormRow } from '@/features/core';
import type { QuotationData } from '../types';

interface CustomerInfoSectionProps {
  data: QuotationData;
  onUpdate: (patch: Partial<QuotationData>) => void;
  isReadOnly: boolean;
}

export function CustomerInfoSection({ data, onUpdate, isReadOnly }: CustomerInfoSectionProps) {
  const updateCustomer = (field: 'to' | 'from', key: string, value: string) => {
    onUpdate({
      [field]: {
        ...data[field],
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* 客户信息 */}
      <div>
        <h4 className="text-md font-medium mb-4">客户信息</h4>
        <FormRow>
          <FormField label="客户名称" required>
            <input
              type="text"
              value={data.to.name}
              onChange={(e) => updateCustomer('to', 'name', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          
          <FormField label="联系人" required>
            <input
              type="text"
              value={data.to.contact}
              onChange={(e) => updateCustomer('to', 'contact', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          
          <FormField label="电话">
            <input
              type="text"
              value={data.to.phone}
              onChange={(e) => updateCustomer('to', 'phone', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </FormRow>
        
        <FormField label="地址" required>
          <textarea
            value={data.to.address}
            onChange={(e) => updateCustomer('to', 'address', e.target.value)}
            disabled={isReadOnly}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FormField>
        
        <FormField label="邮箱">
          <input
            type="email"
            value={data.to.email}
            onChange={(e) => updateCustomer('to', 'email', e.target.value)}
            disabled={isReadOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FormField>
      </div>

      {/* 公司信息 */}
      <div>
        <h4 className="text-md font-medium mb-4">公司信息</h4>
        <FormRow>
          <FormField label="公司名称" required>
            <input
              type="text"
              value={data.from.name}
              onChange={(e) => updateCustomer('from', 'name', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          
          <FormField label="联系人" required>
            <input
              type="text"
              value={data.from.contact}
              onChange={(e) => updateCustomer('from', 'contact', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
          
          <FormField label="电话">
            <input
              type="text"
              value={data.from.phone}
              onChange={(e) => updateCustomer('from', 'phone', e.target.value)}
              disabled={isReadOnly}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </FormField>
        </FormRow>
        
        <FormField label="地址" required>
          <textarea
            value={data.from.address}
            onChange={(e) => updateCustomer('from', 'address', e.target.value)}
            disabled={isReadOnly}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FormField>
        
        <FormField label="邮箱">
          <input
            type="email"
            value={data.from.email}
            onChange={(e) => updateCustomer('from', 'email', e.target.value)}
            disabled={isReadOnly}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </FormField>
      </div>
    </div>
  );
}
