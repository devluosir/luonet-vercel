import { Search } from 'lucide-react';

interface UserFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: 'all' | 'active' | 'inactive';
  onStatusFilterChange: (value: 'all' | 'active' | 'inactive') => void;
}

export function UserFilters({ 
  searchTerm, 
  onSearchChange, 
  statusFilter, 
  onStatusFilterChange 
}: UserFiltersProps) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-800 mb-4">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* 搜索框 */}
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索用户名或邮箱..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                       bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                       focus:ring-2 focus:ring-blue-500 focus:border-transparent
                       placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as 'all' | 'active' | 'inactive')}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有状态</option>
            <option value="active">活跃用户</option>
            <option value="inactive">非活跃用户</option>
          </select>

          {/* 角色筛选占位（保持UI不变，功能暂未开放） */}
          <select
            value="all"
            onChange={() => {}}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-[#2c2c2e] text-gray-900 dark:text-white 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">所有角色</option>
            <option value="admin">管理员</option>
            <option value="user">普通用户</option>
          </select>
        </div>
      </div>
    </div>
  );
}
