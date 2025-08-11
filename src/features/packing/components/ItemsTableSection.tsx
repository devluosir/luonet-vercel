'use client';

import { ItemsTable } from '@/components/packinglist/ItemsTable';
import { OtherFeesTable } from '@/components/packinglist/OtherFeesTable';
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
  return (
    <div className="bg-white dark:bg-[#2C2C2E] rounded-3xl p-6 mb-6 shadow-sm border border-gray-100 dark:border-[#3A3A3C]">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-[#F5F5F7] mb-6">
        商品明细
      </h2>
      
      {/* 商品表格 */}
      <ItemsTable
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



      {/* 总计信息 */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-[#3A3A3C] rounded-2xl">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {data.showPrice && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">总金额:</span>
              <div className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">
                {data.currency} {totals.totalPrice.toFixed(2)}
              </div>
            </div>
          )}
          {data.showWeightAndPackage && (
            <>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">净重:</span>
                <div className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">
                  {totals.netWeight.toFixed(2)} kg
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">毛重:</span>
                <div className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">
                  {totals.grossWeight.toFixed(2)} kg
                </div>
              </div>
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">包装数:</span>
                <div className="text-lg font-semibold text-gray-800 dark:text-[#F5F5F7]">
                  {totals.packageQty}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
