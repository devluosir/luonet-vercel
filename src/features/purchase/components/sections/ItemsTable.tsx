'use client';
import React, { useCallback, memo, useMemo } from 'react';
import { usePurchaseStore } from '../../state/purchase.store';
import { usePurchaseForm } from '../../hooks/usePurchaseForm';
import { usePurchaseValidation } from '../../hooks/usePurchaseValidation';
import ErrorBadge from '../ErrorBadge';
import type { PurchaseItem } from '../../utils/types';

// 顶部：列枚举（描述=1、Qty=2、Unit=3、Price=4）
const COL = { DESC: 1, QTY: 2, UNIT: 3, PRICE: 4 };

// 工具：为每个单元格生成可定位的 id
const cellId = (row: number, col: number) => `po-cell-${row}-${col}`;
const focusCell = (row: number, col: number) => {
  const el = document.getElementById(cellId(row, col)) as HTMLInputElement | null;
  el?.focus(); el?.select?.();
};

function handleCellNav(
  e: React.KeyboardEvent,
  pos: { row: number; col: number }
) {
  const { key } = e;
  if (!['ArrowUp','ArrowDown','Enter'].includes(key)) return;
  e.preventDefault();

  if (key === 'Enter') {
    // 行内向右：DESC→QTY→UNIT→PRICE→下一行DESC
    const next = pos.col === COL.PRICE ? { row: pos.row + 1, col: COL.DESC } : { row: pos.row, col: pos.col + 1 };
    focusCell(next.row, next.col);
    return;
  }
  if (key === 'ArrowUp') focusCell(Math.max(0, pos.row - 1), pos.col);
  if (key === 'ArrowDown') focusCell(pos.row + 1, pos.col);
}

export default function ItemsTable() {
  const items = usePurchaseStore(s => s.draft.items);
  const addItem = usePurchaseStore(s => s.addItem);
  const { errors } = usePurchaseValidation();

  const handleAdd = useCallback(() => addItem({ qty: 1, price: 0 }), [addItem]);

  const total = useMemo(() => items.reduce((a, it) => a + it.qty * it.price, 0), [items]);

  const err = (path: string) => errors.find(e => e.path === path)?.message;

  return (
    <div className="bg-gray-50 dark:bg-[#3A3A3C] p-4 rounded-xl border border-gray-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">商品列表</h3>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          onClick={handleAdd}
        >
          添加商品
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-gray-500">
            <tr className="border-b border-gray-200 dark:border-gray-600">
              <th className="text-left py-2 pr-2 w-10">#</th>
              <th className="text-left py-2 pr-2 min-w-[220px]">商品描述</th>
              <th className="text-right py-2 px-2 w-28">数量</th>
              <th className="text-left py-2 px-2 w-24">单位</th>
              <th className="text-right py-2 px-2 w-32">单价</th>
              <th className="text-right py-2 pl-2 w-32">金额</th>
              <th className="py-2 pl-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => (
              <ItemRow key={it.id} index={idx} id={it.id} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-200 dark:border-gray-600">
              <td colSpan={5} className="py-2 text-right pr-2 text-gray-500">小计</td>
              <td className="py-2 text-right font-semibold text-gray-800 dark:text-[#F5F5F7]">{total.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

const ItemRow = memo(({ id, index }: { id: string; index: number }) => {
  const item = usePurchaseStore(s => s.draft.items.find(i => i.id === id));
  const updateItem = usePurchaseStore(s => s.updateItem);
  const removeItem = usePurchaseStore(s => s.removeItem);
  const { errors } = usePurchaseValidation();

  const onChange = useCallback((patch: Partial<PurchaseItem>) => {
    updateItem(id, patch);
  }, [id, updateItem]);

  if (!item) return null;

  const amount = (item.qty ?? 0) * (item.price ?? 0);
  const err = (path: string) => errors.find(e => e.path === path)?.message;

  return (
    <tr className="border-b border-gray-200 dark:border-gray-600">
      <td className="py-2 pr-2 text-gray-500">{index + 1}</td>
      <td className="py-2 pr-2">
        <input
          id={cellId(index, COL.DESC)}
          onKeyDown={(e) => handleCellNav(e, { row: index, col: COL.DESC })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
          value={item.name || ''}
          onChange={e => onChange({ name: e.target.value })}
          placeholder="商品描述"
        />
        <ErrorBadge text={err(`items.${index}.name`)} />
        {item.remark && (
          <div className="text-xs text-gray-500 mt-1">{item.remark}</div>
        )}
      </td>
      <td className="py-2 px-2 text-right">
        <input
          id={cellId(index, COL.QTY)}
          onKeyDown={(e) => handleCellNav(e, { row: index, col: COL.QTY })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm text-right"
          inputMode="decimal"
          value={String(item.qty ?? 0)}
          onChange={e => onChange({ qty: Number(e.target.value) || 0 })}
        />
        <ErrorBadge text={err(`items.${index}.qty`)} />
      </td>
      <td className="py-2 px-2">
        <input
          id={cellId(index, COL.UNIT)}
          onKeyDown={(e) => handleCellNav(e, { row: index, col: COL.UNIT })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm"
          value={item.unit || ''}
          onChange={e => onChange({ unit: e.target.value })}
          placeholder="pcs"
        />
      </td>
      <td className="py-2 px-2 text-right">
        <input
          id={cellId(index, COL.PRICE)}
          onKeyDown={(e) => handleCellNav(e, { row: index, col: COL.PRICE })}
          className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-sm text-right"
          inputMode="decimal"
          value={String(item.price ?? 0)}
          onChange={e => onChange({ price: Number(e.target.value) || 0 })}
        />
        <ErrorBadge text={err(`items.${index}.price`)} />
      </td>
      <td className="py-2 pl-2 text-right text-gray-800 dark:text-[#F5F5F7]">{amount.toFixed(2)}</td>
      <td className="py-2 pl-2">
        <button 
          className="w-6 h-6 rounded-full transition-colors flex items-center justify-center text-sm font-medium text-gray-400 hover:bg-red-100 hover:text-red-600"
          aria-label="删除"
          onClick={() => removeItem(id)}
        >
          ×
        </button>
      </td>
    </tr>
  );
});
ItemRow.displayName = 'ItemRow';
