import {
  AlertCircle,
  Calendar,
  Clock,
  Edit,
  Eye,
  Mail,
  MapPin,
  Phone,
  Search,
  Trash2,
  Users,
} from 'lucide-react';
import { Customer } from '../types';
import { TimelineService, FollowUpService } from '../services/timelineService';
import type {
  CustomerFilterType,
  CustomerSortType,
  CustomerViewMode,
} from './FilterChipBar';

type ActivityLevel = 'high' | 'medium' | 'low';

interface CustomerListProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onViewDetail?: (customer: Customer) => void;
  searchQuery?: string;
  viewMode?: CustomerViewMode;
  activeFilter?: CustomerFilterType;
  sortBy?: CustomerSortType;
}

interface CustomerInfo {
  title: string;
  contactInfo: {
    phone: string;
    email: string;
    address: string;
  };
}

const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
];

const activityOrder: Record<ActivityLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function getTimelineCount(customerName: string) {
  try {
    const events = TimelineService.getEventsByCustomer(customerName);
    return events.length;
  } catch {
    return 0;
  }
}

function getFollowUpCount(customerName: string) {
  try {
    const followUps = FollowUpService.getFollowUpsByCustomer(customerName);
    return followUps.length;
  } catch {
    return 0;
  }
}

function formatDate(dateString?: string) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

function getCustomerInfo(customer: Customer): CustomerInfo {
  const lines = customer.name.split('\n');
  const title = lines[0] || customer.name;
  const contactInfo = {
    phone: customer.phone || '',
    email: customer.email || '',
    address: customer.address || '',
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!contactInfo.email && trimmed.includes('@')) {
      contactInfo.email = trimmed;
    } else if (!contactInfo.phone && (trimmed.includes('+') || /\d{3,}/.test(trimmed))) {
      contactInfo.phone = trimmed;
    } else if (!contactInfo.address && trimmed && trimmed !== title) {
      contactInfo.address = trimmed;
    }
  });

  return { title, contactInfo };
}

function getCustomerActivity(customer: Customer) {
  const timelineCount = getTimelineCount(customer.name);
  const followUpCount = getFollowUpCount(customer.name);
  const totalActivity = timelineCount + followUpCount;

  if (totalActivity >= 10) {
    return {
      level: 'high' as const,
      label: '高活跃',
      color: 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
      borderColor: 'border-l-green-500',
    };
  }
  if (totalActivity >= 5) {
    return {
      level: 'medium' as const,
      label: '中活跃',
      color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300',
      borderColor: 'border-l-yellow-400',
    };
  }
  return {
    level: 'low' as const,
    label: '低活跃',
    color: 'bg-gray-50 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    borderColor: 'border-l-gray-300 dark:border-l-gray-600',
  };
}

function needsFollowUp(customer: Customer) {
  const followUpCount = getFollowUpCount(customer.name);
  const timelineCount = getTimelineCount(customer.name);
  return timelineCount > 0 && followUpCount === 0;
}

function isThisMonth(customer: Customer) {
  const lastMonth = new Date();
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
  return Boolean(createdAt && createdAt >= lastMonth);
}

function getAvatarColor(title: string) {
  const charCode = title.charCodeAt(0) || 0;
  return avatarColors[charCode % avatarColors.length];
}

function CustomerAvatar({ title }: { title: string }) {
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white ${getAvatarColor(title)}`}
    >
      {title.charAt(0).toUpperCase() || '客'}
    </div>
  );
}

function ActionButton({
  label,
  color,
  onClick,
  icon: Icon,
}: {
  label: string;
  color: 'blue' | 'gray' | 'red';
  onClick: () => void;
  icon: typeof Eye;
}) {
  const colorClassName = {
    blue: 'text-blue-600 hover:bg-blue-50 hover:text-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/40',
    gray: 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-300 dark:hover:bg-gray-700',
    red: 'text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/40',
  }[color];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${colorClassName}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function CustomerList({
  customers,
  onEdit,
  onDelete,
  onViewDetail,
  searchQuery = '',
  viewMode = 'grid',
  activeFilter = 'all',
  sortBy = 'date_desc',
}: CustomerListProps) {
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;

    const { title, contactInfo } = getCustomerInfo(customer);
    const searchLower = searchQuery.toLowerCase();

    return (
      title.toLowerCase().includes(searchLower) ||
      (customer.company || '').toLowerCase().includes(searchLower) ||
      contactInfo.phone.toLowerCase().includes(searchLower) ||
      contactInfo.email.toLowerCase().includes(searchLower) ||
      contactInfo.address.toLowerCase().includes(searchLower)
    );
  });

  const displayCustomers = filteredCustomers.filter((customer) => {
    if (activeFilter === 'all') return true;
    const activity = getCustomerActivity(customer);
    if (activeFilter === 'high') return activity.level === 'high';
    if (activeFilter === 'needs_followup') return needsFollowUp(customer);
    if (activeFilter === 'this_month') return isThisMonth(customer);
    return true;
  });

  const sortedCustomers = [...displayCustomers].sort((a, b) => {
    if (sortBy === 'name') {
      return getCustomerInfo(a).title.localeCompare(getCustomerInfo(b).title, 'zh-CN');
    }
    if (sortBy === 'activity') {
      return (
        activityOrder[getCustomerActivity(a).level] -
        activityOrder[getCustomerActivity(b).level]
      );
    }
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (customers.length === 0) {
    return (
      <div className="py-14 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">暂无客户数据</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">开始添加您的第一个客户</p>
      </div>
    );
  }

  if (sortedCustomers.length === 0) {
    return (
      <div className="py-10 text-center">
        <Search className="mx-auto mb-2 h-8 w-8 text-gray-400" />
        <p className="text-sm text-gray-600 dark:text-gray-400">未找到匹配的客户</p>
      </div>
    );
  }

  if (viewMode === 'list') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400">
              <th className="pb-3 pr-4 font-semibold">客户名称</th>
              <th className="pb-3 pr-4 font-semibold">联系方式</th>
              <th className="pb-3 pr-4 font-semibold">活跃度</th>
              <th className="pb-3 pr-4 font-semibold">创建时间</th>
              <th className="pb-3 font-semibold">操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedCustomers.map((customer) => {
              const { title, contactInfo } = getCustomerInfo(customer);
              const activity = getCustomerActivity(customer);

              return (
                <tr
                  key={customer.id}
                  className="border-b border-gray-100 hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-900/40"
                >
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <CustomerAvatar title={title} />
                      <button
                        type="button"
                        onClick={() => onViewDetail?.(customer)}
                        className="max-w-[220px] truncate text-left font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                      >
                        {title}
                      </button>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-gray-600 dark:text-gray-300">
                    <div className="space-y-1">
                      {contactInfo.phone ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-gray-400" />
                          <span>{contactInfo.phone}</span>
                        </div>
                      ) : contactInfo.email ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-gray-400" />
                          <span>{contactInfo.email}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${activity.color}`}>
                      {activity.label}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-500 dark:text-gray-400">
                    {formatDate(customer.createdAt)}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-1">
                      {onViewDetail && (
                        <ActionButton
                          icon={Eye}
                          label="查看"
                          onClick={() => onViewDetail(customer)}
                          color="blue"
                        />
                      )}
                      <ActionButton icon={Edit} label="编辑" onClick={() => onEdit(customer)} color="gray" />
                      <ActionButton icon={Trash2} label="删除" onClick={() => onDelete(customer)} color="red" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">客户列表</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            共 {sortedCustomers.length} 个客户
            {searchQuery && `（搜索：${searchQuery}）`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedCustomers.map((customer) => {
          const { title, contactInfo } = getCustomerInfo(customer);
          const timelineCount = getTimelineCount(customer.name);
          const followUpCount = getFollowUpCount(customer.name);
          const activity = getCustomerActivity(customer);
          const needsFollowUpFlag = needsFollowUp(customer);

          return (
            <div
              key={customer.id}
              className={`overflow-hidden rounded-lg border border-l-4 border-gray-200 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${activity.borderColor}`}
            >
              <div className="p-4">
                <div className="mb-3 flex items-start gap-3">
                  <CustomerAvatar title={title} />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => onViewDetail?.(customer)}
                      className="block max-w-full truncate text-left text-base font-semibold text-gray-900 transition-colors hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                    >
                      {title}
                    </button>
                    {customer.company && (
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {customer.company}
                      </p>
                    )}
                  </div>
                  {needsFollowUpFlag && (
                    <AlertCircle className="mt-1 h-4 w-4 shrink-0 text-red-500" />
                  )}
                </div>

                <div className="mb-3 min-h-[48px] space-y-1">
                  {contactInfo.phone && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                      <Phone className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{contactInfo.phone}</span>
                    </div>
                  )}
                  {contactInfo.email && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                      <Mail className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{contactInfo.email}</span>
                    </div>
                  )}
                  {contactInfo.address && (
                    <div className="flex items-center text-xs text-gray-600 dark:text-gray-300">
                      <MapPin className="mr-1.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                      <span className="truncate">{contactInfo.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="mr-1 h-3.5 w-3.5 text-gray-400" />
                      <span>{timelineCount}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1 h-3.5 w-3.5 text-gray-400" />
                      <span>{followUpCount}</span>
                    </div>
                  </div>

                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${activity.color}`}>
                    {activity.label}
                  </span>
                </div>

                <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    创建于 {formatDate(customer.createdAt)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/40">
                {onViewDetail && (
                  <ActionButton
                    icon={Eye}
                    label="查看"
                    onClick={() => onViewDetail(customer)}
                    color="blue"
                  />
                )}
                <ActionButton icon={Edit} label="编辑" onClick={() => onEdit(customer)} color="gray" />
                <ActionButton icon={Trash2} label="删除" onClick={() => onDelete(customer)} color="red" />
              </div>
            </div>
          );
        })}
      </div>

      {searchQuery && sortedCustomers.length > 0 && (
        <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/30">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            显示 {sortedCustomers.length} 个匹配 “<strong>{searchQuery}</strong>” 的客户
          </p>
        </div>
      )}
    </div>
  );
}
