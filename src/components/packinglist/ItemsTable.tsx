import React from 'react';

// 表格输入框样式
const tableInputClassName = `w-full px-3 py-2 rounded-xl
  bg-transparent backdrop-blur-sm
  border border-transparent
  focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 dark:focus:ring-[#0A84FF]/20
  text-[14px] leading-relaxed text-gray-800 dark:text-gray-100
  placeholder:text-gray-400/60 dark:placeholder:text-gray-500/60
  transition-all duration-300 ease-out
  hover:bg-[#007AFF]/5 dark:hover:bg-[#0A84FF]/5
  text-center whitespace-pre-wrap`;

const numberInputClassName = `${tableInputClassName}
  [appearance:textfield] 
  [&::-webkit-outer-spin-button]:appearance-none 
  [&::-webkit-inner-spin-button]:appearance-none
  text-center`;

interface PackingItem {
  id: number;
  serialNo: string;
  description: string;
  hsCode: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  netWeight: number;
  grossWeight: number;
  packageQty: number;
  dimensions: string;
  unit: string;
}

interface PackingData {
  items: PackingItem[];
  showHsCode: boolean;
  showDimensions: boolean;
  showWeightAndPackage: boolean;
  showPrice: boolean;
  dimensionUnit: string;
  currency: string;
}

interface ItemsTableProps {
  data: PackingData;
  onItemChange: (index: number, field: keyof PackingItem, value: string | number) => void;
  onAddLine: () => void;
  onDeleteLine: (index: number) => void;
  totals: {
    totalPrice: number;
    netWeight: number;
    grossWeight: number;
    packageQty: number;
  };
}

export const ItemsTable: React.FC<ItemsTableProps> = ({
  data,
  onItemChange,
  onAddLine,
  onDeleteLine,
  totals
}) => {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-full bg-white dark:bg-[#2C2C2E] rounded-xl border border-gray-200 dark:border-[#3A3A3C] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#1C1C1E] border-b border-gray-200 dark:border-[#3A3A3C]">
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider w-12">No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Description</th>
                {data.showHsCode && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">HS Code</th>
                )}
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Qty</th>
                {data.showPrice && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Unit Price</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Amount</th>
                  </>
                )}
                {data.showWeightAndPackage && (
                  <>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Net Weight (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Gross Weight (kg)</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Package Qty</th>
                  </>
                )}
                {data.showDimensions && (
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-[#98989D] uppercase tracking-wider">Dimensions ({data.dimensionUnit})</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-[#3A3A3C]">
              {data.items.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-[#1C1C1E]/50 transition-colors duration-200">
                  <td className="px-4 py-3 w-12 text-center">
                    <span 
                      className={`flex items-center justify-center w-6 h-6 rounded-full 
                        text-xs transition-all duration-200 ${
                        data.items.length > 1 
                          ? 'text-gray-500 dark:text-gray-400 hover:bg-red-100 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 cursor-pointer'
                          : 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      }`}
                      onClick={() => data.items.length > 1 && onDeleteLine(index)}
                      title={data.items.length > 1 ? "Click to delete" : "Cannot delete the last item"}
                    >
                      {index + 1}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => onItemChange(index, 'description', e.target.value)}
                      className={`${tableInputClassName} text-left`}
                      placeholder="Description"
                    />
                  </td>
                  {data.showHsCode && (
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.hsCode}
                        onChange={(e) => onItemChange(index, 'hsCode', e.target.value)}
                        className={`${tableInputClassName} text-left`}
                        placeholder="HS Code"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 w-24">
                    <input
                      type="number"
                      value={item.quantity || ''}
                      onChange={(e) => onItemChange(index, 'quantity', e.target.value)}
                      className={numberInputClassName}
                      placeholder="0"
                      min="0"
                      step="1"
                    />
                  </td>
                  {data.showPrice && (
                    <>
                      <td className="px-4 py-3 w-28">
                        <input
                          type="number"
                          value={item.unitPrice || ''}
                          onChange={(e) => onItemChange(index, 'unitPrice', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 w-28">
                        <div className="text-center py-2 text-sm font-medium text-gray-800 dark:text-gray-100">
                          {data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥'}
                          {item.totalPrice.toFixed(2)}
                        </div>
                      </td>
                    </>
                  )}
                  {data.showWeightAndPackage && (
                    <>
                      <td className="px-4 py-3 w-24">
                        <input
                          type="number"
                          value={item.netWeight || ''}
                          onChange={(e) => onItemChange(index, 'netWeight', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 w-24">
                        <input
                          type="number"
                          value={item.grossWeight || ''}
                          onChange={(e) => onItemChange(index, 'grossWeight', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-4 py-3 w-24">
                        <input
                          type="number"
                          value={item.packageQty || ''}
                          onChange={(e) => onItemChange(index, 'packageQty', e.target.value)}
                          className={numberInputClassName}
                          placeholder="0"
                          min="0"
                          step="1"
                        />
                      </td>
                    </>
                  )}
                  {data.showDimensions && (
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.dimensions}
                        onChange={(e) => onItemChange(index, 'dimensions', e.target.value)}
                        className={`${tableInputClassName} text-left`}
                        placeholder="L×W×H"
                      />
                    </td>
                  )}
                </tr>
              ))}
              
              {/* 总计行 */}
              <tr className="bg-gray-50 dark:bg-[#1C1C1E] font-semibold border-t-2 border-gray-300 dark:border-gray-600">
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={onAddLine}
                    className="flex items-center justify-center w-6 h-6 rounded-full
                      bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.08]
                      hover:bg-[#007AFF]/[0.12] dark:hover:bg-[#0A84FF]/[0.12]
                      text-[#007AFF] dark:text-[#0A84FF]
                      text-sm font-medium
                      transition-all duration-200"
                    title="Add new line"
                  >
                    +
                  </button>
                </td>
                <td colSpan={
                  2 + // 描述、数量
                  (data.showHsCode ? 1 : 0) + // HS Code列
                  (data.showPrice ? 1 : 0) // 单价列
                } className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                  Total:
                </td>
                {data.showPrice && (
                  <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                    {data.currency === 'USD' ? '$' : data.currency === 'EUR' ? '€' : '¥'}
                    {totals.totalPrice.toFixed(2)}
                  </td>
                )}
                {data.showWeightAndPackage && (
                  <>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.netWeight.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.grossWeight.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-900 dark:text-gray-100">
                      {totals.packageQty}
                    </td>
                  </>
                )}
                {data.showDimensions && (
                  <td className="px-4 py-3"></td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}; 