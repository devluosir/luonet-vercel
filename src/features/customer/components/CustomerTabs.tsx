import { Users, Building } from 'lucide-react';
import { TabType } from '../types';

interface CustomerTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function CustomerTabs({ activeTab, onTabChange }: CustomerTabsProps) {
  return (
    <div className="mb-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => onTabChange('customers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'customers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            客户管理
          </button>
          <button
            onClick={() => onTabChange('suppliers')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'suppliers'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Building className="w-4 h-4" />
            供应商管理
          </button>
          <button
            onClick={() => onTabChange('consignees')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'consignees'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            <Users className="w-4 h-4" />
            收货人管理
          </button>
        </nav>
      </div>
    </div>
  );
}
