import React, { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import type { Customer as SupplierProfile } from '@/features/customer/types';
import { customerService, getPrimaryContact } from '@/features/customer/services/customerService';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';

export default function SupplierSection() {
  const { field, setField } = usePurchaseForm();
  const [suppliers, setSuppliers] = useState<SupplierProfile[]>([]);
  const [query, setQuery] = useState('');
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void customerService.fetchAllCustomers('supplier')
      .then(({ items }) => {
        if (!cancelled) setSuppliers(items);
      })
      .catch((error) => {
        console.warn('加载供应商库失败:', error);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 20);
    return suppliers
      .filter((supplier) => {
        const primaryContact = getPrimaryContact(supplier);
        return (
          supplier.name.toLowerCase().includes(q) ||
          (supplier.shortName || '').toLowerCase().includes(q) ||
          (supplier.code || '').toLowerCase().includes(q) ||
          (primaryContact?.name || '').toLowerCase().includes(q) ||
          (primaryContact?.shortName || '').toLowerCase().includes(q)
        );
      })
      .slice(0, 20);
  }, [query, suppliers]);

  const selectSupplier = (supplier: SupplierProfile) => {
    const primaryContact = getPrimaryContact(supplier);
    setField('supplier.name', supplier.name);
    setField('supplier.attn', primaryContact?.name || '');
    setField('supplier.phone', primaryContact?.phone || '');
    setField('supplier.email', primaryContact?.email || '');
    setField('supplier.address', supplier.address || '');
    setQuery(supplier.shortName || supplier.name);
    setShowOptions(false);
  };
  
  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">
        供应商信息
      </h3>
      <div className="space-y-3">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            从供应商库选择
          </label>
          <Search className="pointer-events-none absolute left-3 top-[42px] h-4 w-4 text-gray-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowOptions(true);
            }}
            onFocus={() => setShowOptions(true)}
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pl-9 text-sm text-gray-900 transition-all duration-200 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            placeholder="搜索供应商全称、简称或联络人"
            autoComplete="off"
          />
          {showOptions && (
            <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
              {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier) => {
                const primaryContact = getPrimaryContact(supplier);
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectSupplier(supplier)}
                    className="block w-full border-b border-gray-100 px-3 py-2 text-left last:border-b-0 hover:bg-blue-50 dark:border-gray-700 dark:hover:bg-blue-950/30"
                  >
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {supplier.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {[supplier.shortName, primaryContact?.name, primaryContact?.phone].filter(Boolean).join(' · ') || '未设置联络人'}
                    </div>
                  </button>
                );
              }) : (
                <div className="px-3 py-2 text-sm text-gray-400">未找到匹配供应商</div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            供应商名称 Supplier Name
          </label>
          <input 
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('supplier.name')}
            placeholder="请输入供应商名称"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              联系人 Attn
            </label>
            <input 
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              {...field('supplier.attn')}
              placeholder="联系人姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              电话 Phone
            </label>
            <input 
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
              {...field('supplier.phone')}
              placeholder="联系电话"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            邮箱 Email
          </label>
          <input 
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
            {...field('supplier.email')}
            type="email"
            placeholder="邮箱地址"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            地址 Address
          </label>
          <textarea 
            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm resize-none"
            {...field('supplier.address')}
            rows={3}
            placeholder="供应商地址"
          />
        </div>
      </div>
    </div>
  );
}
