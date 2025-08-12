import React from 'react';
import { FormField } from '@/features/core';
import type { LineItem, OtherFee } from '../types';

interface ItemsTableSectionProps {
  items: LineItem[];
  otherFees: OtherFee[];
  onUpdate: (patch: any) => void;
  isReadOnly: boolean;
}

export function ItemsTableSection({ items, otherFees, onUpdate, isReadOnly }: ItemsTableSectionProps) {
  const addItem = () => {
    const newItem: LineItem = {
      id: Date.now().toString(),
      name: '',
      description: '',
      quantity: 1,
      unit: 'PCS',
      unitPrice: 0,
      totalPrice: 0,
    };
    onUpdate({ items: [...items, newItem] });
  };

  const updateItem = (index: number, field: keyof LineItem, value: any) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    
    // 自动计算总价
    if (field === 'quantity' || field === 'unitPrice') {
      const item = updatedItems[index];
      updatedItems[index] = {
        ...item,
        totalPrice: item.quantity * item.unitPrice,
      };
    }
    
    onUpdate({ items: updatedItems });
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onUpdate({ items: updatedItems });
  };

  return (
    <div className="space-y-4">
      {/* 商品列表 */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h4 className="text-md font-medium">商品列表</h4>
          {!isReadOnly && (
            <button
              onClick={addItem}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              添加商品
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 px-4 py-2 text-left">商品名称</th>
                <th className="border border-gray-300 px-4 py-2 text-left">描述</th>
                <th className="border border-gray-300 px-4 py-2 text-center">数量</th>
                <th className="border border-gray-300 px-4 py-2 text-center">单位</th>
                <th className="border border-gray-300 px-4 py-2 text-right">单价</th>
                <th className="border border-gray-300 px-4 py-2 text-right">总价</th>
                {!isReadOnly && (
                  <th className="border border-gray-300 px-4 py-2 text-center">操作</th>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(index, 'name', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.description || ''}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', Number(e.target.value))}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="text"
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-center"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, 'unitPrice', Number(e.target.value))}
                      disabled={isReadOnly}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-right"
                    />
                  </td>
                  <td className="border border-gray-300 px-4 py-2 text-right">
                    {(item.quantity * item.unitPrice).toFixed(2)}
                  </td>
                  {!isReadOnly && (
                    <td className="border border-gray-300 px-4 py-2 text-center">
                      <button
                        onClick={() => removeItem(index)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        删除
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 其他费用 */}
      <div>
        <h4 className="text-md font-medium mb-4">其他费用</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {otherFees.map((fee, index) => (
            <div key={fee.id} className="border border-gray-300 rounded p-4">
              <FormField label="费用名称">
                <input
                  type="text"
                  value={fee.name}
                  onChange={(e) => {
                    const updatedFees = [...otherFees];
                    updatedFees[index] = { ...fee, name: e.target.value };
                    onUpdate({ otherFees: updatedFees });
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </FormField>
              <FormField label="金额">
                <input
                  type="number"
                  value={fee.amount}
                  onChange={(e) => {
                    const updatedFees = [...otherFees];
                    updatedFees[index] = { ...fee, amount: Number(e.target.value) };
                    onUpdate({ otherFees: updatedFees });
                  }}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </FormField>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
