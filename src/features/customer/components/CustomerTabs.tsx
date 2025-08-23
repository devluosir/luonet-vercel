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
      description: '管理客户信息和关系'
    },
    {
      id: 'suppliers' as const,
      label: '供应商管理',
      icon: Building,
      description: '管理供应商合作伙伴'
    },
    {
      id: 'consignees' as const,
      label: '收货人管理',
      icon: Package,
      description: '管理物流收货信息'
    },
    {
      id: 'new_customers' as const,
      label: '新客户跟进',
      icon: UserPlus,
      description: '跟踪新客户开发进度'
    }
  ];

  return (
    <div className="px-6 py-4">
      <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-gray-600/50'
              }`}
            >
              <div className="flex items-center space-x-2">
                <IconComponent className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
      
      {/* 标签页描述 */}
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {tabs.find(tab => tab.id === activeTab)?.description}
        </p>
      </div>
    </div>
  );
}
