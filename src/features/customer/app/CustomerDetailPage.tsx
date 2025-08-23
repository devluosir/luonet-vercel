'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Plus, Filter, Search, RefreshCw } from 'lucide-react';
import { useCustomerTimeline } from '../hooks/useCustomerTimeline';
import { useCustomerFollowUp } from '../hooks/useCustomerFollowUp';
import { syncAllHistoryToTimeline } from '../services/autoTimelineService';
import type { CustomerTimelineEvent, TimelineEventType, TimelineEventStatus } from '../types';

export default function CustomerDetailPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get('id');
  const customerName = searchParams.get('name');

  const [activeTab, setActiveTab] = useState<'timeline' | 'followup'>('timeline');
  const [showFilters, setShowFilters] = useState(false);

  // 使用时间轴Hook
  const {
    events,
    loading: timelineLoading,
    filters: timelineFilters,
    setFilters: setTimelineFilters,
    syncHistory,
    addCustomEvent,
    updateEvent,
    deleteEvent
  } = useCustomerTimeline(customerId || undefined);

  // 使用跟进Hook
  const {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
    loading: followUpLoading,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    completeFollowUp
  } = useCustomerFollowUp(customerId || undefined);

  // 事件类型图标映射
  const eventTypeIcons = {
    quotation: '📄',
    confirmation: '📋',
    packing: '📦',
    invoice: '🧾',
    custom: '📝'
  };

  // 事件类型颜色映射
  const eventTypeColors = {
    quotation: 'bg-blue-100 text-blue-800',
    confirmation: 'bg-green-100 text-green-800',
    packing: 'bg-teal-100 text-teal-800',
    invoice: 'bg-purple-100 text-purple-800',
    custom: 'bg-orange-100 text-orange-800'
  };

  // 状态颜色映射
  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
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

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            请先登录
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            您需要登录后才能访问客户详情页面
          </p>
        </div>
      </div>
    );
  }

  if (!customerId || !customerName) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            客户信息不完整
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            无法显示客户详情，请返回客户列表重新选择
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>返回</span>
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {customerName}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={syncHistory}
                disabled={timelineLoading}
                className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${timelineLoading ? 'animate-spin' : ''}`} />
                <span>同步历史</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 标签页 */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Calendar className="h-4 w-4 inline mr-2" />
                时间轴
              </button>
              <button
                onClick={() => setActiveTab('followup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'followup'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Clock className="h-4 w-4 inline mr-2" />
                跟进记录
              </button>
            </nav>
          </div>
        </div>

        {/* 时间轴内容 */}
        {activeTab === 'timeline' && (
          <div className="space-y-6">
            {/* 筛选器 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  时间轴事件 ({events.length})
                </h3>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  <Filter className="h-4 w-4" />
                  <span>筛选</span>
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      搜索
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="搜索事件..."
                        value={timelineFilters.searchText}
                        onChange={(e) => setTimelineFilters(prev => ({ ...prev, searchText: e.target.value }))}
                        className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 时间轴列表 */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
              {timelineLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>暂无时间轴事件</p>
                  <p className="text-sm mt-2">点击"同步历史"按钮从历史记录中提取事件</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {events.map((event, index) => (
                    <div key={event.id} className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* 图标 */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg ${eventTypeColors[event.type]}`}>
                          {eventTypeIcons[event.type]}
                        </div>
                        
                        {/* 内容 */}
                        <div className="flex-1 min-w-0">
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 跟进记录内容 */}
        {activeTab === 'followup' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  跟进记录
                </h3>
                <button className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  <Plus className="h-4 w-4" />
                  <span>添加跟进</span>
                </button>
              </div>

              {followUpLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 即将到期的跟进 */}
                  {upcomingFollowUps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 mb-2">即将到期 ({upcomingFollowUps.length})</h4>
                      <div className="space-y-2">
                        {upcomingFollowUps.map(followUp => (
                          <div key={followUp.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-medium text-yellow-900">{followUp.title}</h5>
                                <p className="text-xs text-yellow-700 mt-1">{followUp.description}</p>
                                <p className="text-xs text-yellow-600 mt-1">到期: {formatDate(followUp.dueDate)}</p>
                              </div>
                              <button
                                onClick={() => completeFollowUp(followUp.id)}
                                className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                              >
                                完成
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 过期的跟进 */}
                  {overdueFollowUps.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-red-800 mb-2">已过期 ({overdueFollowUps.length})</h4>
                      <div className="space-y-2">
                        {overdueFollowUps.map(followUp => (
                          <div key={followUp.id} className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <div className="flex items-center justify-between">
                              <div>
                                <h5 className="text-sm font-medium text-red-900">{followUp.title}</h5>
                                <p className="text-xs text-red-700 mt-1">{followUp.description}</p>
                                <p className="text-xs text-red-600 mt-1">到期: {formatDate(followUp.dueDate)}</p>
                              </div>
                              <button
                                onClick={() => completeFollowUp(followUp.id)}
                                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                              >
                                完成
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 所有跟进记录 */}
                  {followUps.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>暂无跟进记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {followUps.map(followUp => (
                        <div key={followUp.id} className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                          <div className="flex items-center justify-between">
                            <div>
                              <h5 className="text-sm font-medium text-gray-900 dark:text-white">{followUp.title}</h5>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{followUp.description}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">到期: {formatDate(followUp.dueDate)}</p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                followUp.priority === 'high' ? 'bg-red-100 text-red-800' :
                                followUp.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {followUp.priority === 'high' ? '高' : followUp.priority === 'medium' ? '中' : '低'}
                              </span>
                              {followUp.status === 'pending' && (
                                <button
                                  onClick={() => completeFollowUp(followUp.id)}
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  完成
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
