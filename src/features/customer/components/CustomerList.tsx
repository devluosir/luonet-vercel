import { Edit, Trash2, Users, Eye } from 'lucide-react';
import { Customer } from '../types';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetail?: (customer: Customer) => void;
}

export function CustomerList({ customers, onEdit, onDelete, onViewDetail }: CustomerListProps) {
  if (customers.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无客户数据
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          开始添加您的第一个客户，或者从历史记录中导入客户信息
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          提示：客户数据会从您的报价单、发票和装箱单历史记录中自动提取
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
              客户信息
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
          {customers.map((customer) => {
            const lines = customer.name.split('\n');
            const title = lines[0] || customer.name;
            const content = customer.name;
            
            return (
              <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => onViewDetail?.(customer)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-left"
                    >
                      {title}
                    </button>
                  </div>
                  {lines.length > 1 && (
                    <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {content}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                  {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {onViewDetail && (
                      <button
                        onClick={() => onViewDetail(customer)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                        title="查看详情"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(customer)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(customer)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                      title="删除"
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
