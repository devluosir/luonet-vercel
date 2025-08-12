import React, { useEffect, useState } from 'react';
import { useHistoryActiveTab, useHistoryFilters } from '../state/history.selectors';
import { useHistoryStore, getAvailableTabs } from '../state/history.store';
import { useHistoryTabCount } from '../hooks/useHistoryTabCount';
import type { HistoryType } from '../types';

interface HistoryTabsProps {
  onTabChange: (tab: HistoryType) => void;
}

export function HistoryTabs({ onTabChange }: HistoryTabsProps) {
  const activeTab = useHistoryActiveTab();
  const filters = useHistoryFilters();
  const availableTabs = getAvailableTabs();
  const { getTabCount } = useHistoryTabCount();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // 根据tab类型设置对应的颜色
  const getActiveClasses = (tabId: HistoryType) => {
    switch (tabId) {
      case 'quotation':
        return 'bg-gradient-to-br from-blue-50 via-blue-75 to-blue-100 dark:from-blue-900/30 dark:via-blue-900/20 dark:to-blue-900/10 text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30';
      case 'confirmation':
        return 'bg-gradient-to-br from-green-50 via-emerald-75 to-emerald-100 dark:from-green-900/30 dark:via-emerald-900/20 dark:to-emerald-900/10 text-green-700 dark:text-green-300 shadow-lg shadow-green-200/50 dark:shadow-green-900/30';
      case 'packing':
        return 'bg-gradient-to-br from-teal-50 via-cyan-75 to-cyan-100 dark:from-teal-900/30 dark:via-cyan-900/20 dark:to-cyan-900/10 text-teal-700 dark:text-teal-300 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/30';
      case 'invoice':
        return 'bg-gradient-to-br from-purple-50 via-indigo-75 to-indigo-100 dark:from-purple-900/30 dark:via-indigo-900/20 dark:to-indigo-900/10 text-purple-700 dark:text-purple-300 shadow-lg shadow-purple-200/50 dark:shadow-purple-900/30';
      case 'purchase':
        return 'bg-gradient-to-br from-orange-50 via-red-75 to-red-100 dark:from-orange-900/30 dark:via-red-900/20 dark:to-red-900/10 text-orange-700 dark:text-orange-300 shadow-lg shadow-orange-200/50 dark:shadow-orange-900/30';
      default:
        return 'bg-gradient-to-br from-blue-50 via-blue-75 to-blue-100 dark:from-blue-900/30 dark:via-blue-900/20 dark:to-blue-900/10 text-blue-700 dark:text-blue-300 shadow-lg shadow-blue-200/50 dark:shadow-blue-900/30';
    }
  };

  // 获取非激活状态的样式
  const getInactiveClasses = (tabId: HistoryType) => {
    switch (tabId) {
      case 'quotation':
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-blue-50 hover:via-blue-75 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:via-blue-900/20 dark:hover:to-blue-900/10 hover:text-blue-700 dark:hover:text-blue-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-blue-200/40 dark:hover:shadow-blue-900/25';
      case 'confirmation':
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-green-50 hover:via-emerald-75 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:via-emerald-900/20 dark:hover:to-emerald-900/10 hover:text-green-700 dark:hover:text-green-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-green-200/40 dark:hover:shadow-green-900/25';
      case 'packing':
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-teal-50 hover:via-cyan-75 hover:to-cyan-100 dark:hover:from-teal-900/30 dark:hover:via-cyan-900/20 dark:hover:to-cyan-900/10 hover:text-teal-700 dark:hover:text-teal-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-teal-200/40 dark:hover:shadow-teal-900/25';
      case 'invoice':
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-purple-50 hover:via-indigo-75 hover:to-indigo-100 dark:hover:from-purple-900/30 dark:hover:via-indigo-900/20 dark:hover:to-indigo-900/10 hover:text-purple-700 dark:hover:text-purple-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-purple-200/40 dark:hover:shadow-purple-900/25';
      case 'purchase':
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-orange-50 hover:via-red-75 hover:to-red-100 dark:hover:from-orange-900/30 dark:hover:via-red-900/20 dark:hover:to-red-900/10 hover:text-orange-700 dark:hover:text-orange-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-orange-200/40 dark:hover:shadow-orange-900/25';
      default:
        return 'bg-gradient-to-br from-gray-50 via-gray-75 to-gray-100 dark:from-gray-700 dark:via-gray-750 dark:to-gray-800 text-gray-600 dark:text-gray-400 hover:from-blue-50 hover:via-blue-75 hover:to-blue-100 dark:hover:from-blue-900/30 dark:hover:via-blue-900/20 dark:hover:to-blue-900/10 hover:text-blue-700 dark:hover:text-blue-300 shadow-md shadow-gray-200/30 dark:shadow-gray-900/20 hover:shadow-lg hover:shadow-blue-200/40 dark:hover:shadow-blue-900/25';
    }
  };

  // 获取徽章样式
  const getBadgeStyle = (tabId: HistoryType, hasSearchResults: boolean) => {
    // 如果有搜索结果，使用红色样式
    if (hasSearchResults && filters.search.trim() !== '') {
      return 'text-red-700 bg-red-50 dark:text-red-300 dark:bg-red-900/50';
    }
    
    // 否则使用原来的颜色样式
    switch (tabId) {
      case 'quotation':
        return 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/50';
      case 'confirmation':
        return 'text-green-700 bg-green-50 dark:text-green-300 dark:bg-green-900/50';
      case 'packing':
        return 'text-teal-700 bg-teal-50 dark:text-teal-300 dark:bg-teal-900/50';
      case 'invoice':
        return 'text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/50';
      case 'purchase':
        return 'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/50';
      default:
        return 'text-gray-700 bg-gray-50 dark:text-gray-300 dark:bg-gray-900/50';
    }
  };

  // 获取图标颜色
  const getIconColor = (tabId: HistoryType, isActive: boolean) => {
    if (isActive) {
      switch (tabId) {
        case 'quotation':
          return 'text-blue-600 dark:text-blue-400';
        case 'confirmation':
          return 'text-green-600 dark:text-green-400';
        case 'packing':
          return 'text-teal-600 dark:text-teal-400';
        case 'invoice':
          return 'text-purple-600 dark:text-purple-400';
        case 'purchase':
          return 'text-orange-600 dark:text-orange-400';
        default:
          return 'text-blue-600 dark:text-blue-400';
      }
    } else {
      switch (tabId) {
        case 'quotation':
          return 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400';
        case 'confirmation':
          return 'text-gray-500 dark:text-gray-400 group-hover:text-green-600 dark:group-hover:text-green-400';
        case 'packing':
          return 'text-gray-500 dark:text-gray-400 group-hover:text-teal-600 dark:group-hover:text-teal-400';
        case 'invoice':
          return 'text-gray-500 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400';
        case 'purchase':
          return 'text-gray-500 dark:text-gray-400 group-hover:text-orange-600 dark:group-hover:text-orange-400';
        default:
          return 'text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400';
      }
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex justify-center space-x-1 sm:space-x-2 pt-4">
          {availableTabs.map((tab) => {
            const Icon = tab.icon;
            const count = isClient ? getTabCount(tab.id) : 0;
            const isActive = activeTab === tab.id;
            const hasSearchResults = filters.search.trim() !== '' && count > 0;
            const badgeStyle = getBadgeStyle(tab.id, hasSearchResults);
            
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`relative px-2 sm:px-4 md:px-6 py-2 sm:py-3 text-xs sm:text-sm font-medium transition-all duration-300 ease-in-out transform hover:scale-105 group border-0 ${
                  isActive
                    ? getActiveClasses(tab.id)
                    : getInactiveClasses(tab.id)
                } rounded-t-xl`}
              >
                <div className="flex items-center justify-center">
                  <span className="relative inline-block">
                    <Icon className={`h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 ${getIconColor(tab.id, isActive)}`} />
                    <span className={`absolute -top-1 -right-1 min-w-[14px] sm:min-w-[16px] h-3 sm:h-4 px-0.5 sm:px-1 ${badgeStyle} text-xs rounded-full flex items-center justify-center font-bold shadow-sm`}>
                      {count}
                    </span>
                  </span>
                  <span className="hidden sm:inline">{tab.name}</span>
                  <span className="sm:hidden">{tab.shortName}</span>
                </div>
                
                {/* 添加纸张质感效果 */}
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent dark:from-gray-800/30 rounded-t-xl pointer-events-none"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
