'use client';

import { useState, useEffect } from 'react';
import { Calendar, FileText, Package, Receipt, ShoppingCart, Plus, Filter, Search } from 'lucide-react';
import { TimelineService } from '../services/timelineService';
import type { CustomerTimelineEvent, TimelineEventType, TimelineEventStatus } from '../types/timeline';

interface CustomerTimelineProps {
  customerId: string;
  customerName: string;
}

// 事件类型图标映射
const eventTypeIcons = {
  quotation: FileText,
  confirmation: FileText,
  packing: Package,
  invoice: Receipt,
  custom: ShoppingCart
};

// 事件类型颜色映射
const eventTypeColors = {
  quotation: 'text-blue-600 bg-blue-100',
  confirmation: 'text-green-600 bg-green-100',
  packing: 'text-teal-600 bg-teal-100',
  invoice: 'text-purple-600 bg-purple-100',
  custom: 'text-orange-600 bg-orange-100'
};

// 状态颜色映射
const statusColors = {
  pending: 'text-yellow-600 bg-yellow-100',
  completed: 'text-green-600 bg-green-100',
  cancelled: 'text-red-600 bg-red-100'
};

export function CustomerTimeline({ customerId, customerName }: CustomerTimelineProps) {
  const [events, setEvents] = useState<CustomerTimelineEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CustomerTimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    eventTypes: [] as TimelineEventType[],
    status: [] as TimelineEventStatus[],
    searchText: ''
  });

  // 加载时间轴事件
  const loadEvents = () => {
    setLoading(true);
    try {
      const customerEvents = TimelineService.getEventsByCustomer(customerId);
      setEvents(customerEvents);
      setFilteredEvents(customerEvents);
    } catch (error) {
      console.error('加载时间轴事件失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 应用筛选
  const applyFilters = () => {
    let filtered = [...events];

    // 按事件类型筛选
    if (filters.eventTypes.length > 0) {
      filtered = filtered.filter(event => filters.eventTypes.includes(event.type));
    }

    // 按状态筛选
    if (filters.status.length > 0) {
      filtered = filtered.filter(event => filters.status.includes(event.status));
    }

    // 按搜索文本筛选
    if (filters.searchText) {
      const searchText = filters.searchText.toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(searchText) ||
        event.description?.toLowerCase().includes(searchText) ||
        event.documentNo?.toLowerCase().includes(searchText)
      );
    }

    setFilteredEvents(filtered);
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({
      eventTypes: [],
      status: [],
      searchText: ''
    });
    setFilteredEvents(events);
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 格式化金额
  const formatAmount = (amount?: number, currency?: string) => {
    if (!amount) return '';
    return `${currency || 'USD'} ${amount.toLocaleString()}`;
  };

  // 获取事件类型标签
  const getEventTypeLabel = (type: TimelineEventType) => {
    const labels = {
      quotation: '报价单',
      confirmation: '销售确认',
      packing: '装箱单',
      invoice: '财务发票',
      custom: '自定义'
    };
    return labels[type];
  };

  // 获取状态标签
  const getStatusLabel = (status: TimelineEventStatus) => {
    const labels = {
      pending: '进行中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labels[status];
  };

  useEffect(() => {
    loadEvents();
  }, [customerId]);

  useEffect(() => {
    applyFilters();
  }, [filters, events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {customerName} 的时间轴
          </h3>
          <span className="text-sm text-gray-500">
            ({filteredEvents.length} 个事件)
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            <Filter className="h-4 w-4" />
            <span>筛选</span>
          </button>
        </div>
      </div>

      {/* 筛选器 */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 搜索 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                搜索
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索事件..."
                  value={filters.searchText}
                  onChange={(e) => setFilters(prev => ({ ...prev, searchText: e.target.value }))}
                  className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>

            {/* 事件类型筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                事件类型
              </label>
              <select
                multiple
                value={filters.eventTypes}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value as TimelineEventType);
                  setFilters(prev => ({ ...prev, eventTypes: selected }));
                }}
                className="w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="quotation">报价单</option>
                <option value="confirmation">销售确认</option>
                <option value="packing">装箱单</option>
                <option value="invoice">财务发票</option>
                <option value="custom">自定义</option>
              </select>
            </div>

            {/* 状态筛选 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                状态
              </label>
              <select
                multiple
                value={filters.status}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value as TimelineEventStatus);
                  setFilters(prev => ({ ...prev, status: selected }));
                }}
                className="w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="pending">进行中</option>
                <option value="completed">已完成</option>
                <option value="cancelled">已取消</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={resetFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              重置
            </button>
          </div>
        </div>
      )}

      {/* 时间轴 */}
      <div className="space-y-4">
        {filteredEvents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无时间轴事件</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event, index) => {
              const IconComponent = eventTypeIcons[event.type];
              
              return (
                <div key={event.id} className="relative">
                  {/* 时间轴线 */}
                  {index < filteredEvents.length - 1 && (
                    <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200 dark:bg-gray-600"></div>
                  )}
                  
                  {/* 事件卡片 */}
                  <div className="flex items-start space-x-4">
                    {/* 图标 */}
                    <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${eventTypeColors[event.type]}`}>
                      <IconComponent className="h-6 w-6" />
                    </div>
                    
                    {/* 内容 */}
                    <div className="flex-1 min-w-0 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {event.title}
                          </h4>
                          {event.description && (
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                              {event.description}
                            </p>
                          )}
                          
                          <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            <span>{formatDate(event.date)}</span>
                            {event.documentNo && (
                              <span>文档号: {event.documentNo}</span>
                            )}
                            {event.amount && (
                              <span>金额: {formatAmount(event.amount, event.currency)}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* 状态标签 */}
                        <div className={`ml-4 px-2 py-1 rounded-full text-xs font-medium ${statusColors[event.status]}`}>
                          {getStatusLabel(event.status)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
