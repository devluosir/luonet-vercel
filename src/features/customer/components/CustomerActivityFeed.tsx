'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Calendar, CheckCircle, Clock, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import { getInquiryQuoteStatusBadge, type InquiryQuoteStatusBadge } from '../services/inquiryTimelineService';
import { useCustomerFollowUp } from '../hooks/useCustomerFollowUp';
import { useCustomerTimeline } from '../hooks/useCustomerTimeline';
import type { CustomerFollowUp, CustomerTimelineEvent, FollowUpPriority, FollowUpType } from '../types';
import { CustomEventForm } from './CustomEventForm';

interface CustomerActivityFeedProps {
  customerId: string;
  customerName: string;
}

type ActivityKind = 'inquiry' | 'custom' | 'followup';

interface ActivityItem {
  id: string;
  kind: ActivityKind;
  date: string;
  title: string;
  description?: string;
  badge?: InquiryQuoteStatusBadge;
  relatedInquiry?: InquiryRecord;
  timelineEvent?: CustomerTimelineEvent;
  followUp?: CustomerFollowUp;
}

const KIND_CONFIG: Record<ActivityKind, {
  label: string;
  icon: typeof Search;
  iconClassName: string;
  borderClassName: string;
}> = {
  inquiry: {
    label: '询价',
    icon: Search,
    iconClassName: 'bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300',
    borderClassName: 'border-l-blue-400',
  },
  custom: {
    label: '事件',
    icon: FileText,
    iconClassName: 'bg-orange-100 text-orange-600 dark:bg-orange-950/50 dark:text-orange-300',
    borderClassName: 'border-l-orange-400',
  },
  followup: {
    label: '跟进',
    icon: Clock,
    iconClassName: 'bg-purple-100 text-purple-600 dark:bg-purple-950/50 dark:text-purple-300',
    borderClassName: 'border-l-purple-400',
  },
};

const followUpPriorityLabel: Record<FollowUpPriority, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const followUpPriorityClassName: Record<FollowUpPriority, string> = {
  low: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
  high: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatAmount(amount?: number, currency?: string) {
  if (!amount) return '';
  return `${currency || 'USD'} ${amount.toLocaleString()}`;
}

function buildInquiryHref(customerId: string, customerName: string, record: InquiryRecord) {
  const params = new URLSearchParams({
    customerId,
    customerName,
    keyword: record.inquiryNo,
  });
  return `/inquiry?${params.toString()}`;
}

function getActivityTime(value: string) {
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

export function CustomerActivityFeed({ customerId, customerName }: CustomerActivityFeedProps) {
  const inquiryRecords = useInquiryStore((state) => state.records);
  const [showCustomEventForm, setShowCustomEventForm] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);
  const [followUpForm, setFollowUpForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as FollowUpPriority,
    type: 'follow_up' as FollowUpType,
    relatedInquiryId: '',
  });
  const customerAliases = useMemo(() => [customerName], [customerName]);
  const {
    events,
    loading: timelineLoading,
    syncHistory,
    addCustomEvent,
  } = useCustomerTimeline(customerId, customerAliases);
  const {
    followUps,
    loading: followUpLoading,
    addFollowUp,
    completeFollowUp,
    deleteFollowUp,
    loadFollowUps,
  } = useCustomerFollowUp(customerId, customerAliases);
  const inquiryById = useMemo(
    () => new Map(inquiryRecords.map((record) => [record.id, record])),
    [inquiryRecords]
  );
  const customerInquiryRecords = useMemo(
    () => inquiryRecords.filter((record) => record.customerId === customerId),
    [customerId, inquiryRecords]
  );
  const loading = timelineLoading || followUpLoading;

  useEffect(() => {
    useInquiryStore.getState().init();
  }, [customerId]);

  const activities = useMemo<ActivityItem[]>(() => {
    const timelineActivities: ActivityItem[] = events.map((event) => {
      const relatedInquiry = event.type === 'inquiry' && event.documentId
        ? inquiryById.get(event.documentId)
        : undefined;

      return {
        id: `timeline-${event.id}`,
        kind: event.type === 'inquiry' ? 'inquiry' : 'custom',
        date: event.date,
        title: event.title,
        description: event.description,
        badge: relatedInquiry ? getInquiryQuoteStatusBadge(relatedInquiry) : undefined,
        relatedInquiry,
        timelineEvent: event,
      };
    });
    const followUpActivities: ActivityItem[] = followUps.map((followUp) => {
      const relatedInquiry = followUp.relatedInquiryId
        ? inquiryById.get(followUp.relatedInquiryId)
        : undefined;

      return {
        id: `followup-${followUp.id}`,
        kind: 'followup',
        date: followUp.dueDate,
        title: followUp.title,
        description: followUp.description,
        badge: relatedInquiry ? getInquiryQuoteStatusBadge(relatedInquiry) : undefined,
        relatedInquiry,
        followUp,
      };
    });

    return [...timelineActivities, ...followUpActivities].sort(
      (a, b) => getActivityTime(b.date) - getActivityTime(a.date)
    );
  }, [events, followUps, inquiryById]);

  const handleRefresh = async () => {
    await syncHistory();
    await loadFollowUps();
  };

  const handleAddCustomEvent = async (
    eventData: Omit<CustomerTimelineEvent, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const result = await addCustomEvent(eventData);
    if (!result) {
      alert('添加自定义事件失败');
      return;
    }
    setShowCustomEventForm(false);
  };

  const resetFollowUpForm = () => {
    setFollowUpForm({
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      type: 'follow_up',
      relatedInquiryId: '',
    });
  };

  const handleAddFollowUp = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!followUpForm.title.trim() || !followUpForm.description.trim() || !followUpForm.dueDate) {
      alert('请填写完整信息');
      return;
    }

    const result = await addFollowUp({
      customerId,
      type: followUpForm.type,
      title: followUpForm.title,
      description: followUpForm.description,
      dueDate: followUpForm.dueDate,
      priority: followUpForm.priority,
      status: 'pending',
      relatedInquiryId: followUpForm.relatedInquiryId || undefined,
    });
    if (!result) {
      alert('添加跟进失败');
      return;
    }

    resetFollowUpForm();
    setShowFollowUpForm(false);
  };

  const handleDeleteFollowUp = async (followUp: CustomerFollowUp) => {
    if (!window.confirm(`确定删除跟进「${followUp.title}」吗？`)) return;
    const success = await deleteFollowUp(followUp.id);
    if (!success) alert('删除跟进失败');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">活动列表</h3>
          <span className="text-sm text-gray-500 dark:text-gray-400">({activities.length} 条)</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCustomEventForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            添加事件
          </button>
          <button
            type="button"
            onClick={() => setShowFollowUpForm(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            添加跟进
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
            刷新
          </button>
        </div>
      </div>

      {showFollowUpForm && (
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h4 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">添加跟进记录</h4>
          <form onSubmit={handleAddFollowUp} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">标题 *</label>
                <input
                  type="text"
                  value={followUpForm.title}
                  onChange={(event) => setFollowUpForm((prev) => ({ ...prev, title: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="跟进标题"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">到期日期 *</label>
                <input
                  type="date"
                  value={followUpForm.dueDate}
                  onChange={(event) => setFollowUpForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">描述 *</label>
              <textarea
                value={followUpForm.description}
                onChange={(event) => setFollowUpForm((prev) => ({ ...prev, description: event.target.value }))}
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="跟进描述"
              />
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">优先级</label>
                <select
                  value={followUpForm.priority}
                  onChange={(event) => setFollowUpForm((prev) => ({ ...prev, priority: event.target.value as FollowUpPriority }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">类型</label>
                <select
                  value={followUpForm.type}
                  onChange={(event) => setFollowUpForm((prev) => ({ ...prev, type: event.target.value as FollowUpType }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="follow_up">跟进</option>
                  <option value="reminder">提醒</option>
                  <option value="new_customer">新客户</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">关联询价记录</label>
                <select
                  value={followUpForm.relatedInquiryId}
                  onChange={(event) => setFollowUpForm((prev) => ({ ...prev, relatedInquiryId: event.target.value }))}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">不关联询价记录</option>
                  {customerInquiryRecords.map((record) => (
                    <option key={record.id} value={record.id}>
                      {record.inquiryNo}{record.description ? ` · ${record.description}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  resetFollowUpForm();
                  setShowFollowUpForm(false);
                }}
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              >
                取消
              </button>
              <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                添加跟进
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div role="status" className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-6 py-12 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Calendar className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>暂无活动记录</p>
          <p className="mt-2 text-sm">点击“刷新”拉取最新询价记录，或添加自定义事件/跟进记录。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => {
            const config = KIND_CONFIG[activity.kind];
            const Icon = config.icon;
            const event = activity.timelineEvent;
            const followUp = activity.followUp;

            return (
              <div
                key={activity.id}
                className={`rounded-lg border border-l-4 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 ${config.borderClassName}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.iconClassName}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                        {config.label}
                      </span>
                      {activity.badge && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${activity.badge.className}`}>
                          {activity.badge.label}
                        </span>
                      )}
                      {followUp && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${followUpPriorityClassName[followUp.priority]}`}>
                          优先级 {followUpPriorityLabel[followUp.priority]}
                        </span>
                      )}
                      {followUp?.status === 'completed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-950/40 dark:text-green-300">
                          <CheckCircle className="h-3 w-3" />
                          已完成
                        </span>
                      )}
                      {followUp?.status === 'pending' && getActivityTime(followUp.dueDate) < Date.now() && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
                          <AlertTriangle className="h-3 w-3" />
                          已过期
                        </span>
                      )}
                    </div>
                    <h4 className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{activity.title}</h4>
                    {activity.description && (
                      <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-400">{activity.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {followUp ? '到期' : '日期'}: {formatDate(activity.date)}
                      </span>
                      {event?.documentNo && <span>询价号: {event.documentNo}</span>}
                      {event?.amount && <span>金额: {formatAmount(event.amount, event.currency)}</span>}
                      {activity.relatedInquiry && (
                        <Link
                          href={buildInquiryHref(customerId, customerName, activity.relatedInquiry)}
                          className="text-blue-600 hover:underline dark:text-blue-400"
                        >
                          查看询价
                        </Link>
                      )}
                    </div>
                  </div>
                  {followUp && (
                    <div className="flex shrink-0 items-center gap-2">
                      {followUp.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => completeFollowUp(followUp.id)}
                          className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                        >
                          完成
                        </button>
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
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCustomEventForm && (
        <CustomEventForm
          customerId={customerId}
          customerName={customerName}
          onSubmit={handleAddCustomEvent}
          onCancel={() => setShowCustomEventForm(false)}
        />
      )}
    </div>
  );
}
