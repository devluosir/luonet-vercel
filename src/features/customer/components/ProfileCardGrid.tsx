import { useMemo } from 'react';
import { Building2, CalendarDays, MapPin, Package, Search, Users } from 'lucide-react';
import { getConsigneeDisplayName, getPrimaryContact } from '../services/customerService';
import type { Consignee, Customer, Supplier, TabType } from '../types';
import { CategoryBadge, getProfileTitle, PrimaryContactSummary, ProfileShortName, RowActionMenu } from './ProfileListParts';

type ProfileCardItem = Customer | Supplier | Consignee;

const CONFIG: Record<TabType, {
  label: string;
  emptyTitle: string;
  emptyHint: string;
  emptySearch: string;
  icon: typeof Users;
  avatarColors: string[];
  fallbackInitial: string;
}> = {
  customers: {
    label: '客户',
    emptyTitle: '暂无客户',
    emptyHint: '点击右上角“新增客户”添加第一个客户',
    emptySearch: '未找到匹配的客户',
    icon: Users,
    avatarColors: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'],
    fallbackInitial: '客',
  },
  suppliers: {
    label: '供应商',
    emptyTitle: '暂无供应商',
    emptyHint: '点击右上角“新增供应商”添加第一个供应商',
    emptySearch: '未找到匹配的供应商',
    icon: Building2,
    avatarColors: ['bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-lime-500', 'bg-green-500'],
    fallbackInitial: '供',
  },
  consignees: {
    label: '收货人',
    emptyTitle: '暂无收货人',
    emptyHint: '点击右上角“新增收货人”添加第一个收货人',
    emptySearch: '未找到匹配的收货人',
    icon: Package,
    avatarColors: ['bg-violet-500', 'bg-purple-500', 'bg-indigo-500', 'bg-fuchsia-500', 'bg-pink-500'],
    fallbackInitial: '收',
  },
};

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function getAvatarColor(title: string, colors: string[]) {
  return colors[(title.charCodeAt(0) || 0) % colors.length];
}

function matchesSearch(item: ProfileCardItem, query: string) {
  if (!query.trim()) return true;

  const q = query.toLowerCase();
  const title = getProfileTitle(item);
  const primaryContact = getPrimaryContact(item);
  return (
    title.toLowerCase().includes(q) ||
    (item.shortName || '').toLowerCase().includes(q) ||
    (item.code || '').toLowerCase().includes(q) ||
    (item.address || '').toLowerCase().includes(q) ||
    (primaryContact?.name || '').toLowerCase().includes(q) ||
    (primaryContact?.shortName || '').toLowerCase().includes(q) ||
    (primaryContact?.phone || '').toLowerCase().includes(q) ||
    (primaryContact?.email || '').toLowerCase().includes(q)
  );
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-gray-100 p-4 dark:border-gray-800">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-40 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-3 w-28 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

interface ProfileCardGridProps {
  items: ProfileCardItem[];
  loading: boolean;
  searchQuery: string;
  type: TabType;
  orderCountsByConsignee?: ReadonlyMap<string, number>;
  onEdit: (item: ProfileCardItem) => void;
  onDelete: (item: ProfileCardItem) => void;
  onViewDetail: (item: ProfileCardItem) => void;
}

export function ProfileCardGrid({
  items,
  loading,
  searchQuery,
  type,
  orderCountsByConsignee,
  onEdit,
  onDelete,
  onViewDetail,
}: ProfileCardGridProps) {
  const config = CONFIG[type];
  const EmptyIcon = config.icon;
  const filtered = useMemo(
    () => items.filter((item) => matchesSearch(item, searchQuery)),
    [items, searchQuery]
  );

  if (loading) {
    return (
      <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <EmptyIcon className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{config.emptyTitle}</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{config.emptyHint}</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{config.emptySearch}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((item) => {
        const title = getProfileTitle(item);
        const initial = title.charAt(0).toUpperCase() || config.fallbackInitial;
        const hasAddress = Boolean(item.address?.trim());
        const orderCount = type === 'consignees'
          ? orderCountsByConsignee?.get(getConsigneeDisplayName(item)) ?? 0
          : 0;

        return (
          <div
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => onViewDetail(item)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onViewDetail(item);
              }
            }}
            className="group min-h-[164px] cursor-pointer rounded-lg border border-gray-100 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/30 dark:border-gray-800 dark:hover:border-blue-900/70 dark:hover:bg-blue-950/10"
          >
            <div className="mb-3 flex items-start gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${getAvatarColor(title, config.avatarColors)}`}>
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
                  <CategoryBadge category={item.category} note={item.categoryNote} />
                </div>
                <ProfileShortName value={item.shortName} />
              </div>
              <RowActionMenu item={item} onEdit={onEdit} onDelete={onDelete} />
            </div>

            <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
              <div>
                <p className="mb-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  {type === 'consignees' ? '收货订单' : '主联络人'}
                </p>
                {type === 'consignees' ? (
                  <span className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                    orderCount > 0
                      ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'
                  }`}>
                    {orderCount} 单
                  </span>
                ) : (
                  <PrimaryContactSummary item={item} />
                )}
              </div>
              {hasAddress && (
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                  <p className="line-clamp-2 whitespace-pre-line break-words">{item.address}</p>
                </div>
              )}
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 dark:border-gray-800">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {fmtDate(item.createdAt)}
                </span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-300">
                  {type === 'consignees' ? `${orderCount} 单` : `${item.contacts.length} 位联络人`}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
