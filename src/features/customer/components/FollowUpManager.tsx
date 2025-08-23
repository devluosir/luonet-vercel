'use client';

import { useState } from 'react';
import { Clock, Plus, AlertTriangle, CheckCircle, Calendar } from 'lucide-react';
import { useCustomerFollowUp } from '../hooks/useCustomerFollowUp';
import type { CustomerFollowUp, FollowUpType, FollowUpStatus, FollowUpPriority } from '../types';

interface FollowUpManagerProps {
  customerId: string;
  customerName: string;
}

export function FollowUpManager({ customerId, customerName }: FollowUpManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as FollowUpPriority,
    type: 'follow_up' as FollowUpType
  });

  const {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
    loading,
    addFollowUp,
    updateFollowUp,
    deleteFollowUp,
    completeFollowUp
  } = useCustomerFollowUp(customerId);

  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 获取优先级标签
  const getPriorityLabel = (priority: FollowUpPriority) => {
    const labels = {
      low: '低',
      medium: '中',
      high: '高'
    };
    return labels[priority];
  };

  // 获取优先级颜色
  const getPriorityColor = (priority: FollowUpPriority) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-red-100 text-red-800'
    };
    return colors[priority];
  };

  // 处理添加跟进
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate) {
      alert('请填写完整信息');
      return;
    }

    try {
      await addFollowUp({
        customerId,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        dueDate: formData.dueDate,
        priority: formData.priority,
        status: 'pending'
      });

      // 重置表单
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        type: 'follow_up'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('添加跟进失败:', error);
      alert('添加跟进失败');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Clock className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            跟进记录
          </h3>
          <span className="text-sm text-gray-500">
            ({followUps.length} 个跟进)
          </span>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>添加跟进</span>
        </button>
      </div>

      {/* 添加跟进表单 */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            添加跟进记录
          </h4>
          
          <form onSubmit={handleAddFollowUp} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  标题 *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="跟进标题"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  到期日期 *
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                描述 *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="跟进描述"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  优先级
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as FollowUpPriority }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as FollowUpType }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="follow_up">跟进</option>
                  <option value="reminder">提醒</option>
                  <option value="new_customer">新客户</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                添加跟进
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 即将到期的跟进 */}
      {upcomingFollowUps.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            <h4 className="text-sm font-medium text-yellow-800">
              即将到期 ({upcomingFollowUps.length})
            </h4>
          </div>
          <div className="space-y-2">
            {upcomingFollowUps.map(followUp => (
              <div key={followUp.id} className="p-3 bg-white border border-yellow-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-yellow-900">{followUp.title}</h5>
                    <p className="text-xs text-yellow-700 mt-1">{followUp.description}</p>
                    <p className="text-xs text-yellow-600 mt-1">到期: {formatDate(followUp.dueDate)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(followUp.priority)}`}>
                      {getPriorityLabel(followUp.priority)}
                    </span>
                    <button
                      onClick={() => completeFollowUp(followUp.id)}
                      className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      完成
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 过期的跟进 */}
      {overdueFollowUps.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="text-sm font-medium text-red-800">
              已过期 ({overdueFollowUps.length})
            </h4>
          </div>
          <div className="space-y-2">
            {overdueFollowUps.map(followUp => (
              <div key={followUp.id} className="p-3 bg-white border border-red-200 rounded-md">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-medium text-red-900">{followUp.title}</h5>
                    <p className="text-xs text-red-700 mt-1">{followUp.description}</p>
                    <p className="text-xs text-red-600 mt-1">到期: {formatDate(followUp.dueDate)}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(followUp.priority)}`}>
                      {getPriorityLabel(followUp.priority)}
                    </span>
                    <button
                      onClick={() => completeFollowUp(followUp.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      完成
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 所有跟进记录 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            所有跟进记录
          </h4>
        </div>
        
        {followUps.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无跟进记录</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {followUps.map(followUp => (
              <div key={followUp.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">{followUp.title}</h5>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{followUp.description}</p>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>到期: {formatDate(followUp.dueDate)}</span>
                      </span>
                      <span>状态: {followUp.status === 'pending' ? '待处理' : followUp.status === 'completed' ? '已完成' : '已过期'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(followUp.priority)}`}>
                      {getPriorityLabel(followUp.priority)}
                    </span>
                    {followUp.status === 'pending' && (
                      <button
                        onClick={() => completeFollowUp(followUp.id)}
                        className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        完成
                      </button>
                    )}
                    {followUp.status === 'completed' && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
