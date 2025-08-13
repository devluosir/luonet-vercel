import { Edit, Trash2, Building } from 'lucide-react';
import { Supplier } from '../types';

interface SupplierListProps {
  suppliers: Supplier[];
  onEdit: (supplier: Supplier) => void;
  onDelete: (supplier: Supplier) => void;
}

export function SupplierList({ suppliers, onEdit, onDelete }: SupplierListProps) {
  if (suppliers.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Building className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无供应商数据
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          开始添加您的第一个供应商，或者从历史记录中导入供应商信息
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          提示：供应商数据会从您的采购单历史记录中自动提取
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50 dark:bg-gray-700">
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              供应商信息
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              创建时间
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider border-b border-gray-200 dark:border-gray-600">
              操作
            </th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((supplier) => {
            const lines = supplier.name.split('\n');
            const title = lines[0] || supplier.name;
            const content = supplier.name;
            
            return (
              <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {title}
                  </div>
                  {lines.length > 1 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {content}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(supplier)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(supplier)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
