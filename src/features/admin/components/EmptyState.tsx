import { Users, UserPlus } from 'lucide-react';

interface EmptyStateProps {
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  onCreateUser: () => void;
}

export function EmptyState({ searchTerm, statusFilter, onCreateUser }: EmptyStateProps) {
  const hasFilters = searchTerm || statusFilter !== 'all';
  
  return (
    <div className="text-center py-12 bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
      <div className="text-xl font-medium text-gray-900 dark:text-white mb-2">
        {hasFilters ? '没有找到匹配的用户' : '暂无用户'}
      </div>
      <div className="text-gray-500 dark:text-gray-400 mb-6">
        {hasFilters 
          ? '请尝试调整搜索条件或筛选器' 
          : '点击添加用户按钮创建第一个用户'
        }
      </div>
      <button
        onClick={onCreateUser}
        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        添加用户
      </button>
    </div>
  );
}
