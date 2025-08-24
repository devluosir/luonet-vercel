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
      color: 'blue'
    },
    {
      id: 'suppliers' as const,
      label: '供应商管理',
      icon: Building,
      color: 'green'
    },
    {
      id: 'consignees' as const,
      label: '收货人管理',
      icon: Package,
      color: 'purple'
    },
    {
      id: 'new_customers' as const,
      label: '新客户跟进',
      icon: UserPlus,
      color: 'orange'
    }
  ];

  const getTabColor = (color: string, isActive: boolean) => {
    const colors = {
      blue: isActive ? 'bg-blue-500 text-blue-600' : 'text-blue-600 bg-blue-50',
      green: isActive ? 'bg-green-500 text-green-600' : 'text-green-600 bg-green-50',
      purple: isActive ? 'bg-purple-500 text-purple-600' : 'text-purple-600 bg-purple-50',
      orange: isActive ? 'bg-orange-500 text-orange-600' : 'text-orange-600 bg-orange-50'
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50">
      <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md transition-all duration-200 ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
                  isActive 
                    ? getTabColor(tab.color, true)
                    : getTabColor(tab.color, false)
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <span className="font-medium text-sm">{tab.label}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
