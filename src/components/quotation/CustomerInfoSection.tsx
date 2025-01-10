import type { QuotationData } from '@/types/quotation';
import { getDefaultNotes } from '@/utils/getDefaultNotes';
import { useState, useEffect } from 'react';

interface CustomerInfoSectionProps {
  data: QuotationData;
  onChange: (data: QuotationData) => void;
  type: 'quotation' | 'confirmation';
}

const inputClassName = `w-full px-4 py-2.5 rounded-xl
  bg-white/90 dark:bg-[#1c1c1e]/90 backdrop-blur-lg
  border border-gray-200/30 dark:border-[#2c2c2e]/50
  focus:outline-none focus:ring-2 
  focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
  hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
  text-[15px] leading-relaxed
  text-gray-800 dark:text-gray-200
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/40
  transition-all duration-300`;

const labelClassName = `block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1.5`;

interface SavedCustomer {
  name: string;
  to: string;
  inquiryNo: string;
}

export function CustomerInfoSection({ data, onChange, type }: CustomerInfoSectionProps) {
  const [savedCustomers, setSavedCustomers] = useState<SavedCustomer[]>([]);
  const [showSavedCustomers, setShowSavedCustomers] = useState(false);
  const [showImportExport, setShowImportExport] = useState(false);

  // 加载保存的客户信息
  useEffect(() => {
    const saved = localStorage.getItem('savedCustomers');
    if (saved) {
      setSavedCustomers(JSON.parse(saved));
    }
  }, []);

  // 保存客户信息
  const handleSave = () => {
    if (!data.to.trim()) return;

    const customerName = data.to.split('\n')[0].trim(); // 使用第一行作为客户名称
    const newCustomer: SavedCustomer = {
      name: customerName,
      to: data.to,
      inquiryNo: data.inquiryNo
    };

    const newSavedCustomers = [...savedCustomers];
    const existingIndex = newSavedCustomers.findIndex(c => c.name === customerName);
    
    if (existingIndex >= 0) {
      newSavedCustomers[existingIndex] = newCustomer;
    } else {
      newSavedCustomers.push(newCustomer);
    }

    setSavedCustomers(newSavedCustomers);
    localStorage.setItem('savedCustomers', JSON.stringify(newSavedCustomers));
    setShowSavedCustomers(false);
  };

  // 删除保存的客户信息
  const handleDelete = (customerName: string) => {
    const newSavedCustomers = savedCustomers.filter(c => c.name !== customerName);
    setSavedCustomers(newSavedCustomers);
    localStorage.setItem('savedCustomers', JSON.stringify(newSavedCustomers));
  };

  // 加载客户信息
  const handleLoad = (customer: SavedCustomer) => {
    onChange({
      ...data,
      to: customer.to,
      inquiryNo: customer.inquiryNo
    });
    setShowSavedCustomers(false);
  };

  // 导出客户数据
  const handleExport = () => {
    const dataStr = JSON.stringify(savedCustomers, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'customer_data.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowImportExport(false);
  };

  // 导入客户数据
  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedData = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedData)) {
          // 合并现有数据和导入的数据
          const mergedData = [...savedCustomers];
          importedData.forEach(customer => {
            const existingIndex = mergedData.findIndex(c => c.name === customer.name);
            if (existingIndex >= 0) {
              mergedData[existingIndex] = customer;
            } else {
              mergedData.push(customer);
            }
          });
          setSavedCustomers(mergedData);
          localStorage.setItem('savedCustomers', JSON.stringify(mergedData));
        }
      } catch (error) {
        console.error('Error importing data:', error);
        alert('Invalid file format');
      }
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset input
    setShowImportExport(false);
  };

  return (
    <div className="space-y-4">
      {/* 第一行：报价单号和报价人 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <input
            type="text"
            value={data.quotationNo}
            onChange={e => onChange({ ...data, quotationNo: e.target.value })}
            placeholder={type === 'quotation' ? "Quotation No. *" : "Quotation No."}
            className={`w-full px-4 py-2.5 rounded-xl backdrop-blur-lg
              ${type === 'quotation' 
                ? `bg-[#007AFF]/[0.03] dark:bg-[#0A84FF]/[0.03]
                   border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                   focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
                   hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                   text-[#007AFF] dark:text-[#0A84FF]
                   placeholder:text-[#007AFF]/60 dark:placeholder:text-[#0A84FF]/60
                   font-medium`
                : `bg-white/90 dark:bg-[#1c1c1e]/90
                   border border-gray-200/30 dark:border-[#2c2c2e]/50
                   focus:ring-[#007AFF]/40 dark:focus:ring-[#0A84FF]/40
                   hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                   text-gray-800 dark:text-gray-200
                   placeholder:text-gray-400/60 dark:placeholder:text-gray-500/40`
              }
              focus:outline-none focus:ring-2 
              text-[15px] leading-relaxed
              transition-all duration-300`}
            required={type === 'quotation'}
          />
        </div>
        <div className="w-[110px] sm:w-[200px]">
          <select
            value={data.from}
            onChange={e => {
              const newValue = e.target.value;
              onChange({
                ...data,
                from: newValue,
                notes: getDefaultNotes(newValue, type)
              });
            }}
            className={`${inputClassName} appearance-none 
              bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3e%3cpolyline points="6 9 12 15 18 9"%3e%3c/polyline%3e%3c/svg%3e')] 
              bg-[length:1em_1em] 
              bg-[right_0.5rem_center] 
              bg-no-repeat
              pr-8`}
          >
            <option value="Roger">Roger</option>
            <option value="Sharon">Sharon</option>
            <option value="Emily">Emily</option>
            <option value="Summer">Summer</option>
            <option value="Nina">Nina</option>
          </select>
        </div>
      </div>

      {/* 第二行：客户信息 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <textarea
              value={data.to}
              onChange={e => onChange({ ...data, to: e.target.value })}
              placeholder="Enter customer name and address"
              rows={3}
              className={inputClassName}
            />
            <div className="absolute right-2 bottom-2 flex gap-2">
              <button
                type="button"
                onClick={() => setShowImportExport(true)}
                className="px-3 py-1 rounded-lg text-xs font-medium
                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                  hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                  text-[#007AFF] dark:text-[#0A84FF]
                  transition-all duration-200"
              >
                Import/Export
              </button>
              <button
                type="button"
                onClick={() => setShowSavedCustomers(true)}
                className="px-3 py-1 rounded-lg text-xs font-medium
                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                  hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                  text-[#007AFF] dark:text-[#0A84FF]
                  transition-all duration-200"
              >
                Load
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1 rounded-lg text-xs font-medium
                  bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                  hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                  text-[#007AFF] dark:text-[#0A84FF]
                  transition-all duration-200"
              >
                Save
              </button>
            </div>

            {/* 导入/导出弹窗 */}
            {showImportExport && (
              <div className="absolute z-10 right-0 top-full mt-1 w-[200px]
                bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                border border-gray-200/50 dark:border-gray-700/50
                p-2"
              >
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleExport}
                    className="w-full px-3 py-2 text-left text-sm
                      hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg
                      text-gray-700 dark:text-gray-300"
                  >
                    Export Customers
                  </button>
                  <label className="block">
                    <span className="w-full px-3 py-2 text-left text-sm
                      hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg
                      text-gray-700 dark:text-gray-300
                      cursor-pointer block"
                    >
                      Import Customers
                    </span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImport}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* 保存的客户列表弹窗 */}
            {showSavedCustomers && savedCustomers.length > 0 && (
              <div className="absolute z-10 right-0 top-full mt-1 w-full max-w-md
                bg-white dark:bg-[#2C2C2E] rounded-xl shadow-lg
                border border-gray-200/50 dark:border-gray-700/50
                p-2"
              >
                <div className="max-h-[200px] overflow-y-auto">
                  {savedCustomers.map((customer, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-[#3A3A3C] rounded-lg"
                    >
                      <button
                        type="button"
                        onClick={() => handleLoad(customer)}
                        className="flex-1 text-left px-2 py-1 text-sm text-gray-700 dark:text-gray-300"
                      >
                        {customer.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(customer.name)}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-600
                          hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 第三行：询价单号和合同号 */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelClassName}>
            Inquiry No.
          </label>
          <input
            type="text"
            value={data.inquiryNo}
            onChange={e => onChange({ ...data, inquiryNo: e.target.value })}
            placeholder="Inquiry No."
            className={inputClassName}
          />
        </div>
        {type === 'confirmation' && (
          <div className="flex-1">
            <label className="flex items-center gap-2 text-sm font-medium mb-1.5">
              <span className="text-[#1D1D1F] dark:text-[#F5F5F7]">Contract No.</span>
            </label>
            <input
              type="text"
              value={data.contractNo}
              onChange={e => onChange({ ...data, contractNo: e.target.value })}
              placeholder="Contract No."
              className={`w-full px-4 py-2.5 rounded-xl
                bg-[#007AFF]/[0.03] dark:bg-[#0A84FF]/[0.03] backdrop-blur-lg
                border border-[#007AFF]/20 dark:border-[#0A84FF]/20
                focus:outline-none focus:ring-2 
                focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
                hover:border-[#007AFF]/30 dark:hover:border-[#0A84FF]/30
                text-[15px] leading-relaxed font-medium
                text-[#007AFF] dark:text-[#0A84FF]
                placeholder:text-[#007AFF]/40 dark:placeholder:text-[#0A84FF]/40
                transition-all duration-300`}
              required
            />
          </div>
        )}
      </div>
    </div>
  );
} 