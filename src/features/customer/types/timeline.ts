// 时间轴事件类型
export type TimelineEventType = 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'custom';
export type TimelineEventStatus = 'pending' | 'completed' | 'cancelled';
export type FollowUpType = 'new_customer' | 'follow_up' | 'reminder';
export type FollowUpStatus = 'pending' | 'completed' | 'overdue';
export type FollowUpPriority = 'low' | 'medium' | 'high';

// 时间轴事件接口
export interface CustomerTimelineEvent {
  id: string;
  customerId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string;
  status: TimelineEventStatus;
  documentId?: string; // 关联的文档ID
  documentNo?: string; // 文档编号
  amount?: number; // 金额
  currency?: string; // 货币
  customFields?: Record<string, any>; // 自定义字段
  createdAt: string;
  updatedAt: string;
}

// 客户跟进记录接口
export interface CustomerFollowUp {
  id: string;
  customerId: string;
  type: FollowUpType;
  title: string;
  description: string;
  dueDate: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  assignedTo?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// 新客户信息接口
export interface NewCustomerInfo {
  customerId: string;
  customerName: string;
  firstContactDate: string;
  source?: string; // 客户来源
  potentialValue?: number; // 潜在价值
  industry?: string; // 行业
  followUpStage: 'initial_contact' | 'needs_analysis' | 'proposal' | 'negotiation' | 'closed';
  nextFollowUpDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 时间轴筛选条件
export interface TimelineFilters {
  dateRange?: {
    start: string;
    end: string;
  };
  eventTypes?: TimelineEventType[];
  status?: TimelineEventStatus[];
  searchText?: string;
}

// 跟进筛选条件
export interface FollowUpFilters {
  status?: FollowUpStatus[];
  priority?: FollowUpPriority[];
  assignedTo?: string;
  dueDateRange?: {
    start: string;
    end: string;
  };
  searchText?: string;
}
