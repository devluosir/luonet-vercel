import { Users, Building, UserPlus, Package, TrendingUp, AlertTriangle } from 'lucide-react';
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
      description: '管理客户信息和关系',
      color: 'blue',
      badge: null
    },
    {
      id: 'suppliers' as const,
      label: '供应商管理',
      icon: Building,
      description: '管理供应商合作伙伴',
      color: 'green',
      badge: null
    },
    {
      id: 'consignees' as const,
      label: '收货人管理',
      icon: Package,
      description: '管理物流收货信息',
      color: 'purple',
      badge: null
    },
    {
      id: 'new_customers' as const,
      label: '新客户跟进',
      icon: UserPlus,
      description: '跟踪新客户开发进度',
      color: 'orange',
      badge: 'new'
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
      {/* 标签页导航 */}
      <div className="flex space-x-1 bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-md transition-all duration-200 relative ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm border border-gray-200 dark:border-gray-600'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  isActive 
                    ? getTabColor(tab.color, true)
                    : getTabColor(tab.color, false)
                }`}>
                  <IconComponent className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm">{tab.label}</span>
                    {tab.badge && (
                      <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
                    {tab.description}
                  </div>
                </div>
              </div>
              
              {/* 激活指示器 */}
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-t-full"></div>
              )}
            </button>
          );
        })}
      </div>
      
      {/* 当前标签页信息 */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {(() => {
              const activeTabData = tabs.find(tab => tab.id === activeTab);
              const IconComponent = activeTabData?.icon || Users;
              return (
                <>
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${getTabColor(activeTabData?.color || 'blue', true)}`}>
                    <IconComponent className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {activeTabData?.label}
                  </span>
                </>
              );
            })()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {tabs.find(tab => tab.id === activeTab)?.description}
          </div>
        </div>
        
        {/* 快速操作提示 */}
        <div className="text-xs text-gray-400 dark:text-gray-500">
          💡 使用顶部搜索框快速查找，或点击浮动按钮添加新项目
        </div>
      </div>
    </div>
  );
}
