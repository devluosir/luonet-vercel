'use client';
import { useState } from 'react';
import { ItemsTableEnhanced } from './ItemsTableEnhanced';
import { OtherFeesTable } from '../../../components/packinglist/OtherFeesTable';
import { ColumnToggle } from './ColumnToggle';
import { QuickImport } from './QuickImport';
import { ImportDataButton } from './ImportDataButton';
import { useTablePrefsHydrated } from '../state/useTablePrefs';
import { ItemsTableSectionProps } from '../types';

export const ItemsTableSection: React.FC<ItemsTableSectionProps & {
  editingUnitPriceIndex: number | null;
  editingUnitPrice: string;
  editingFeeIndex: number | null;
  editingFeeAmount: string;
  setEditingUnitPriceIndex: (index: number | null) => void;
  setEditingUnitPrice: (value: string) => void;
  setEditingFeeIndex: (index: number | null) => void;
  setEditingFeeAmount: (value: string) => void;
}> = ({ 
  data, 
  onDataChange, 
  totals,
  editingUnitPriceIndex,
  editingUnitPrice,
  editingFeeIndex,
  editingFeeAmount,
  setEditingUnitPriceIndex,
  setEditingUnitPrice,
  setEditingFeeIndex,
  setEditingFeeAmount
}) => {
  const { visibleCols, isHydrated } = useTablePrefsHydrated();
  const [importPreset, setImportPreset] = useState<{ raw: string; parsed: any } | null>(null);

  // 处理导入数据
  const handleImport = (newItems: any[]) => {
    const processed = newItems.map((item, index) => ({
      ...item,
      id: Date.now() + index,
      serialNo: (data.items.length + index + 1).toString(),
      totalPrice: item.quantity * item.unitPrice,
    }));
    
    onDataChange({ ...data, items: [...data.items, ...processed] });
  };

  // 处理插入导入数据
  const handleInsertImported = (rows: any[], replaceMode = false) => {
    const mapped = rows.map((r, index) => ({
      id: Date.now() + index,
      serialNo: replaceMode ? (index + 1).toString() : (data.items.length + index + 1).toString(),
      description: r.description || '',
      hsCode: r.hsCode || '',
      quantity: Number(r.quantity) || 0,
      unit: r.unit || 'pc',
      unitPrice: Number(r.unitPrice) || 0,
      totalPrice: (Number(r.quantity) || 0) * (Number(r.unitPrice) || 0),
      netWeight: Number(r.netWeight) || 0,
      grossWeight: Number(r.grossWeight) || 0,
      packageQty: Number(r.packageQty) || 0,
      dimensions: r.dimensions || '',
    }));
    
    const finalItems = replaceMode ? mapped : [...data.items, ...mapped];
    onDataChange({ ...data, items: finalItems });
  };

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/30 shadow-sm p-4">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-4">
          <ImportDataButton onImport={handleImport} />
          <div className="hidden md:block text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              提示：双击单元格可以切换红色高亮显示
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ColumnToggle />
          <QuickImport
            onInsert={handleInsertImported}
            presetRaw={importPreset?.raw}
            presetParsed={importPreset?.parsed}
            onClosePreset={() => setImportPreset(null)}
          />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7] mb-4">
        商品明细 Items Details
      </h3>
      
      {/* 商品表格 */}
      <ItemsTableEnhanced
        data={{
          items: data.items,
          otherFees: data.otherFees,
          showHsCode: data.showHsCode,
          showDimensions: data.showDimensions,
          showWeightAndPackage: data.showWeightAndPackage,
          showPrice: data.showPrice,
          dimensionUnit: data.dimensionUnit,
          currency: data.currency,
          customUnits: data.customUnits,
          isInGroupMode: data.isInGroupMode,
          currentGroupId: data.currentGroupId
        }}
        totals={totals}
        editingFeeIndex={editingFeeIndex}
        editingFeeAmount={editingFeeAmount}
        setEditingFeeIndex={setEditingFeeIndex}
        setEditingFeeAmount={setEditingFeeAmount}
        onItemChange={(index, field, value) => {
          const newItems = [...data.items];
          newItems[index] = { ...newItems[index], [field]: value };
          onDataChange({ ...data, items: newItems });
        }}
        onAddLine={() => {
          const newItem = {
            id: Date.now(),
            serialNo: '',
            description: '',
            hsCode: '',
            quantity: 0,
            unitPrice: 0,
            totalPrice: 0,
            netWeight: 0,
            grossWeight: 0,
            packageQty: 0,
            dimensions: '',
            unit: '',
            groupId: data.currentGroupId
          };
          onDataChange({ ...data, items: [...data.items, newItem] });
        }}
        onDeleteLine={(index) => {
          const newItems = data.items.filter((_, i) => i !== index);
          onDataChange({ ...data, items: newItems });
        }}
        onOtherFeeChange={(index, field, value) => {
          const newOtherFees = [...(data.otherFees || [])];
          newOtherFees[index] = { ...newOtherFees[index], [field]: value };
          onDataChange({ ...data, otherFees: newOtherFees });
        }}
        onOtherFeeDoubleClick={(index, field) => {
          if (field === 'amount') {
            setEditingFeeIndex(index);
            setEditingFeeAmount(String((data.otherFees || [])[index]?.amount || ''));
          }
        }}
        onDeleteOtherFee={(index) => {
          const newOtherFees = (data.otherFees || []).filter((_, i) => i !== index);
          onDataChange({ ...data, otherFees: newOtherFees });
        }}
        onEnterGroupMode={() => {
          onDataChange({ ...data, isInGroupMode: true, currentGroupId: `group_${Date.now()}` });
        }}
        onExitGroupMode={() => {
          onDataChange({ ...data, isInGroupMode: false, currentGroupId: undefined });
        }}
      />

      {/* 添加行按钮 */}
      <div className="mt-4 flex items-center gap-2">
        {/* 分组按钮 */}
        <button
          type="button"
          onClick={() => {
            if (data.isInGroupMode) {
              onDataChange({ ...data, isInGroupMode: false, currentGroupId: undefined });
            } else {
              onDataChange({ ...data, isInGroupMode: true, currentGroupId: `group_${Date.now()}` });
            }
          }}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
            data.isInGroupMode 
              ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/40'
              : 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40'
          }`}
        >
          {data.isInGroupMode ? '退出分组' : '添加分组'}
        </button>

        <button
          type="button"
          onClick={() => {
            const newItem = {
              id: Date.now(),
              serialNo: '',
              description: '',
              hsCode: '',
              quantity: 0,
              unitPrice: 0,
              totalPrice: 0,
              netWeight: 0,
              grossWeight: 0,
              packageQty: 0,
              dimensions: '',
              unit: '',
              groupId: data.currentGroupId
            };
            onDataChange({ ...data, items: [...data.items, newItem] });
          }}
          className="px-3 py-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 text-xs font-medium transition-all duration-200"
        >
          添加商品
        </button>

        {data.showPrice && (
          <button
            type="button"
            onClick={() => {
              const newOtherFee = {
                id: Date.now(),
                description: '',
                amount: 0
              };
              onDataChange({ 
                ...data, 
                otherFees: [...(data.otherFees || []), newOtherFee] 
              });
            }}
            className="px-3 py-1.5 rounded-lg bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/40 text-xs font-medium transition-all duration-200"
          >
            添加费用
          </button>
        )}
      </div>
    </section>
  );
};
