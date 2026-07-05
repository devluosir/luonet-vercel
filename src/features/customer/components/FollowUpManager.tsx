'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Clock, Plus, AlertTriangle, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { useToast } from '@/components/ui/Toast';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import type { InquiryRecord } from '@/features/inquiry/types';
import { getInquiryQuoteStatusBadge } from '../services/inquiryTimelineService';
import { useCustomerFollowUp } from '../hooks/useCustomerFollowUp';
import type { CustomerFollowUp, FollowUpType, FollowUpPriority } from '../types';

interface FollowUpManagerProps {
  customerId: string;
  customerName: string;
}

type FollowUpCardTone = 'default' | 'upcoming' | 'overdue';

function buildInquiryHref(customerId: string, customerName: string, record: InquiryRecord) {
  const params = new URLSearchParams({
    customerId,
    customerName,
    keyword: record.inquiryNo,
  });
  return `/inquiry?${params.toString()}`;
}

export function FollowUpManager({ customerId, customerName }: FollowUpManagerProps) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const inquiryRecords = useInquiryStore((state) => state.records);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as FollowUpPriority,
    type: 'follow_up' as FollowUpType,
    relatedInquiryId: ''
  });
  const customerAliases = useMemo(() => [customerName], [customerName]);
  const customerInquiryRecords = useMemo(
    () => inquiryRecords.filter((record) => record.customerId === customerId),
    [customerId, inquiryRecords]
  );
  const inquiryById = useMemo(
    () => new Map(inquiryRecords.map((record) => [record.id, record])),
    [inquiryRecords]
  );

  const {
    followUps,
    upcomingFollowUps,
    overdueFollowUps,
    loading,
    addFollowUp,
    deleteFollowUp,
    completeFollowUp
  } = useCustomerFollowUp(customerId, customerAliases);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, [customerId]);

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

  const handleDeleteFollowUp = async (followUp: CustomerFollowUp) => {
    const confirmed = await confirm({
      title: '删除跟进',
      description: `确定删除跟进「${followUp.title}」吗？`,
      confirmLabel: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    const success = await deleteFollowUp(followUp.id);
    if (!success) {
      showToast('删除跟进失败', 'error');
    }
  };

  const renderFollowUpCard = (
    followUp: CustomerFollowUp,
    tone: FollowUpCardTone = 'default'
  ) => {
    const relatedInquiry = followUp.relatedInquiryId
      ? inquiryById.get(followUp.relatedInquiryId)
      : undefined;
    const status = relatedInquiry ? getInquiryQuoteStatusBadge(relatedInquiry) : null;
    const isDefault = tone === 'default';
    const titleClass = tone === 'overdue'
      ? 'text-red-900'
      : tone === 'upcoming'
        ? 'text-yellow-900'
        : 'text-gray-900 dark:text-white';
    const descriptionClass = tone === 'overdue'
      ? 'text-red-700'
      : tone === 'upcoming'
        ? 'text-yellow-700'
        : 'text-gray-600 dark:text-gray-400';
    const dueClass = tone === 'overdue'
      ? 'text-red-600'
      : tone === 'upcoming'
        ? 'text-yellow-600'
        : 'text-gray-500 dark:text-gray-400';
    const containerClass = tone === 'overdue'
      ? 'p-3 bg-white border border-red-200 rounded-md'
      : tone === 'upcoming'
        ? 'p-3 bg-white border border-yellow-200 rounded-md'
        : 'p-4';
    const completeButtonClass = tone === 'overdue'
      ? 'px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700'
      : tone === 'upcoming'
        ? 'px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700'
        : 'px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700';

    return (
      <div key={followUp.id} className={containerClass}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h5 className={`text-sm font-medium ${titleClass}`}>{followUp.title}</h5>
            <p className={`mt-1 text-xs ${descriptionClass}`}>{followUp.description}</p>
            {relatedInquiry && status && (
              <Link
                href={buildInquiryHref(customerId, customerName, relatedInquiry)}
                className="mt-2 inline-flex max-w-full items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:border-blue-200 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                <span className="truncate">关联询价：{relatedInquiry.inquiryNo}</span>
                <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${status.className}`}>
                  {status.label}
                </span>
              </Link>
            )}
            <div className={`mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs ${dueClass}`}>
              <span className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>到期: {formatDate(followUp.dueDate)}</span>
              </span>
              {isDefault && (
                <span>
                  状态: {followUp.status === 'pending' ? '待处理' : followUp.status === 'completed' ? '已完成' : '已过期'}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center space-x-2">
            <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(followUp.priority)}`}>
              {getPriorityLabel(followUp.priority)}
            </span>
            {followUp.status === 'pending' && (
              <button
                onClick={() => completeFollowUp(followUp.id)}
                className={completeButtonClass}
              >
                完成
              </button>
            )}
            {followUp.status === 'completed' && isDefault && (
              <CheckCircle className="h-4 w-4 text-green-600" />
            )}
            <button
              type="button"
              onClick={() => handleDeleteFollowUp(followUp)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400"
              title="删除跟进"
              aria-label={`删除跟进 ${followUp.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 处理添加跟进
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.description || !formData.dueDate) {
      showToast('请填写完整信息', 'warning');
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
        status: 'pending',
        relatedInquiryId: formData.relatedInquiryId || undefined,
      });

      // 重置表单
      setFormData({
        title: '',
        description: '',
        dueDate: '',
        priority: 'medium',
        type: 'follow_up',
        relatedInquiryId: ''
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('添加跟进失败:', error);
      showToast('添加跟进失败', 'error');
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

            {customerInquiryRecords.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  关联询价记录（可选）
                </label>
                <select
                  value={formData.relatedInquiryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, relatedInquiryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">不关联询价记录</option>
                  {customerInquiryRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.inquiryNo}{record.description ? ` · ${record.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
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
            {upcomingFollowUps.map((followUp) => renderFollowUpCard(followUp, 'upcoming'))}
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
            {overdueFollowUps.map((followUp) => renderFollowUpCard(followUp, 'overdue'))}
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
            {followUps.map((followUp) => renderFollowUpCard(followUp))}
          </div>
        )}
      </div>
    </div>
  );
}
