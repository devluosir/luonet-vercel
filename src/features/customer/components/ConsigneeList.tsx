import { Edit, Trash2, Users } from 'lucide-react';
import { Consignee } from '../types';

interface ConsigneeListProps {
  consignees: Consignee[];
  onEdit: (consignee: Consignee) => void;
  onDelete: (consignee: Consignee) => void;
}

export function ConsigneeList({ consignees, onEdit, onDelete }: ConsigneeListProps) {
  if (consignees.length === 0) {
    return (
      <div className="p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          暂无收货人数据
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          开始添加您的第一个收货人，或者从历史记录中导入收货人信息
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          提示：收货人数据会从您的装箱单历史记录中自动提取
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
              收货人信息
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
          {consignees.map((consignee) => {
            const lines = consignee.name.split('\n');
            const title = lines[0] || consignee.name;
            const content = consignee.name;
            
            return (
              <tr key={consignee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
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
                  {consignee.createdAt ? new Date(consignee.createdAt).toLocaleDateString() : '-'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEdit(consignee)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(consignee)}
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
