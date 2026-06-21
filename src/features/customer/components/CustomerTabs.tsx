import { Users, Building, UserPlus, Package } from 'lucide-react';
import { TabType } from '../types';

interface CustomerTabsProps {
  activeTab: TabType | 'new_customers';
  onTabChange: (tab: TabType | 'new_customers') => void;
}

export function CustomerTabs({ activeTab, onTabChange }: CustomerTabsProps) {
  const tabs = [
    {
      id: 'customers' as const,
      label: '客户管理',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      id: 'suppliers' as const,
      label: '供应商管理',
      icon: Building,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      id: 'consignees' as const,
      label: '收货人管理',
      icon: Package,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      id: 'new_customers' as const,
      label: '新客户跟进',
      icon: UserPlus,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="border-b border-gray-200 bg-white px-4 pt-4 dark:border-gray-700 dark:bg-gray-800 sm:px-6">
      <div className="flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-900 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-white'
              }`}
            >
              <IconComponent className={`h-4 w-4 ${isActive ? '' : tab.color}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
