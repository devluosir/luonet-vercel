'use client';

import { useState, useEffect } from 'react';
import { Users, AlertTriangle, CheckCircle, Calendar, RefreshCw } from 'lucide-react';
import { NewCustomerService } from '../services/newCustomerService';

interface NewCustomerTrackerProps {
  onRefresh?: () => void;
}

export function NewCustomerTracker({ onRefresh }: NewCustomerTrackerProps) {
  const [newCustomers, setNewCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载新客户数据
  const loadNewCustomers = () => {
    setLoading(true);
    try {
      const customers = NewCustomerService.getAllNewCustomers();
      setNewCustomers(customers);
    } catch (error) {
      console.error('加载新客户数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 自动识别新客户
  const autoDetectNewCustomers = () => {
    setLoading(true);
    try {
      const detectedCustomers = NewCustomerService.autoDetectNewCustomers();
      loadNewCustomers();
      if (detectedCustomers.length > 0) {
        alert(`成功识别 ${detectedCustomers.length} 个新客户`);
      } else {
        alert('未发现新的客户');
      }
    } catch (error) {
      console.error('自动识别新客户失败:', error);
      alert('自动识别新客户失败');
    } finally {
      setLoading(false);
    }
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

  // 获取阶段标签
  const getStageLabel = (stage: string) => {
    const labels = {
      initial_contact: '初次联系',
      needs_analysis: '需求分析',
      proposal: '方案制定',
      negotiation: '商务谈判',
      closed: '已关闭'
    };
    return labels[stage as keyof typeof labels] || stage;
  };

  // 获取阶段颜色
  const getStageColor = (stage: string) => {
    const colors = {
      initial_contact: 'bg-blue-100 text-blue-800',
      needs_analysis: 'bg-yellow-100 text-yellow-800',
      proposal: 'bg-purple-100 text-purple-800',
      negotiation: 'bg-orange-100 text-orange-800',
      closed: 'bg-gray-100 text-gray-800'
    };
    return colors[stage as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // 获取统计信息
  const getStats = () => {
    return NewCustomerService.getNewCustomerStats();
  };

  useEffect(() => {
    loadNewCustomers();
  }, []);

  const stats = getStats();

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
          <Users className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            新客户跟进
          </h3>
          <span className="text-sm text-gray-500">
            ({newCustomers.length} 个新客户)
          </span>
        </div>
        
        <button
          onClick={autoDetectNewCustomers}
          className="flex items-center space-x-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          <span>自动识别</span>
        </button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">总客户数</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">活跃客户</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.active}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">已关闭</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.closed}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-red-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">已过期</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 新客户列表 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            新客户列表
          </h4>
        </div>
        
        {newCustomers.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>暂无新客户记录</p>
            <p className="text-sm mt-2">点击"自动识别"开始管理</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {newCustomers.map((customer) => (
              <div key={customer.customerId} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-white">{customer.customerName}</h5>
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>首次联系: {formatDate(customer.firstContactDate)}</span>
                      {customer.source && <span>来源: {customer.source}</span>}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStageColor(customer.followUpStage)}`}>
                      {getStageLabel(customer.followUpStage)}
                    </span>
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
