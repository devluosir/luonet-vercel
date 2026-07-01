export interface Contact {
  id: string;
  name: string;
  shortName?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;
}

export interface CustomerProfile {
  id: string;
  type: 'customer' | 'supplier' | 'consignee';
  name: string;
  shortName?: string;
  code?: string;
  address: string;
  contacts: Contact[];
  createdAt: string;
  updatedAt: string;
}

export type Customer = CustomerProfile;
export type Supplier = CustomerProfile;
export type Consignee = CustomerProfile;

export interface CustomerFormData {
  name: string;
  shortName?: string;
  code?: string;
  address: string;
  contacts: Contact[];
}

export type TabType = 'customers' | 'suppliers' | 'consignees';

// 历史记录文档的通用类型
export interface HistoryDocument {
  id?: string;
  date?: string;
  createdAt?: string;
  updatedAt?: string;
  type?: string;
  [key: string]: unknown;
}

// 时间轴相关类型
export type TimelineEventType = 'quotation' | 'confirmation' | 'packing' | 'invoice' | 'inquiry' | 'custom';
export type TimelineEventStatus = 'pending' | 'completed' | 'cancelled';

export interface CustomerTimelineEvent {
  id: string;
  customerId: string;
  type: TimelineEventType;
  title: string;
  description?: string;
  date: string;
  status: TimelineEventStatus;
  documentId?: string;
  documentNo?: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

// 跟进相关类型
export type FollowUpType = 'new_customer' | 'follow_up' | 'reminder';
export type FollowUpStatus = 'pending' | 'completed' | 'overdue';
export type FollowUpPriority = 'low' | 'medium' | 'high';

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  relatedInquiryId?: string;
  type: FollowUpType;
  title: string;
  description: string;
  dueDate: string;
  status: FollowUpStatus;
  priority: FollowUpPriority;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}
