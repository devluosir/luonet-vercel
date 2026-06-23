import { useMemo } from 'react';
import { Edit, Eye, Search, Trash2, Users } from 'lucide-react';
import type { Customer, Supplier, Consignee } from '../types';

const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
];

function avatarColor(title: string) {
  return AVATAR_COLORS[(title.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

function fmtDate(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="h-9 w-9 shrink-0 rounded-full bg-gray-200 dark:bg-gray-700" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3.5 w-32 rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-3 w-20 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
      <div className="hidden h-3 w-32 rounded bg-gray-100 dark:bg-gray-800 sm:block" />
      <div className="hidden h-3 w-20 rounded bg-gray-100 dark:bg-gray-800 md:block" />
      <div className="flex gap-0.5">
        <div className="h-7 w-7 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-7 rounded bg-gray-100 dark:bg-gray-800" />
        <div className="h-7 w-7 rounded bg-gray-100 dark:bg-gray-800" />
      </div>
    </div>
  );
}

interface CustomerListProps {
  customers: Customer[];
  loading: boolean;
  searchQuery: string;
  onEdit: (customer: Customer | Supplier | Consignee) => void;
  onDelete: (customer: Customer | Supplier | Consignee) => void;
  onViewDetail: (customer: Customer) => void;
}

export function CustomerList({
  customers,
  loading,
  searchQuery,
  onEdit,
  onDelete,
  onViewDetail,
}: CustomerListProps) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c) => {
      const title = c.name.split('\n')[0] || c.name;
      return (
        title.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q)
      );
    });
  }, [customers, searchQuery]);

  if (loading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Users className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">暂无客户</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">点击右上角&ldquo;新增客户&rdquo;添加第一个客户</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配的客户</p>
      </div>
    );
  }

  return (
    <div>
      {/* 列标题 */}
      <div className="hidden items-center gap-3 border-b border-gray-100 bg-gray-50/80 px-4 py-2 dark:border-gray-800 dark:bg-gray-900/40 sm:flex">
        <div className="w-9 shrink-0" />
        <span className="flex-1 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">名称</span>
        <span className="hidden w-40 shrink-0 text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 sm:block">联系方式</span>
        <span className="hidden w-24 shrink-0 text-right text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500 md:block">创建时间</span>
        <div className="w-[88px] shrink-0" />
      </div>

      {/* 行列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.map((customer) => {
          const title = customer.name.split('\n')[0] || customer.name;
          const initial = title.charAt(0).toUpperCase() || '客';
          const contact = customer.phone || customer.email || '—';

          return (
            <div
              key={customer.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              {/* 头像 */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(title)}`}>
                {initial}
              </div>

              {/* 名称 + 公司 */}
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => onViewDetail(customer)}
                  className="block w-full truncate text-left text-sm font-medium text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
                >
                  {title}
                </button>
                {customer.company && (
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{customer.company}</p>
                )}
              </div>

              {/* 联系方式 */}
              <div className="hidden w-40 shrink-0 truncate text-xs text-gray-400 dark:text-gray-500 sm:block">
                {contact}
              </div>

              {/* 创建时间 */}
              <div className="hidden w-24 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500 md:block">
                {fmtDate(customer.createdAt)}
              </div>

              {/* 操作 */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onViewDetail(customer)}
                  title="查看详情"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                >
                  <Eye className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onEdit(customer)}
                  title="编辑"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(customer)}
                  title="删除"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
