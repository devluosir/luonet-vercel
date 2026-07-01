import { useMemo } from 'react';
import { Edit, Package, Search, Trash2 } from 'lucide-react';
import type { Customer, Supplier, Consignee } from '../types';
import { getPrimaryContact } from '../services/customerService';

const AVATAR_COLORS = [
  'bg-violet-500',
  'bg-purple-500',
  'bg-indigo-500',
  'bg-fuchsia-500',
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
      </div>
    </div>
  );
}

interface ConsigneeListProps {
  consignees: Consignee[];
  loading: boolean;
  searchQuery: string;
  onEdit: (consignee: Customer | Supplier | Consignee) => void;
  onDelete: (consignee: Customer | Supplier | Consignee) => void;
}

export function ConsigneeList({ consignees, loading, searchQuery, onEdit, onDelete }: ConsigneeListProps) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return consignees;
    const q = searchQuery.toLowerCase();
    return consignees.filter((c) => {
      const title = c.name.split('\n')[0] || c.name;
      const primaryContact = getPrimaryContact(c);
      return (
        title.toLowerCase().includes(q) ||
        (c.shortName || '').toLowerCase().includes(q) ||
        (primaryContact?.phone || '').toLowerCase().includes(q) ||
        (primaryContact?.email || '').toLowerCase().includes(q) ||
        (c.address || '').toLowerCase().includes(q)
      );
    });
  }, [consignees, searchQuery]);

  if (loading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (consignees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Package className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">暂无收货人</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">点击右上角&ldquo;新增收货人&rdquo;添加第一个收货人</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配的收货人</p>
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
        <div className="w-[60px] shrink-0" />
      </div>

      {/* 行列表 */}
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {filtered.map((consignee) => {
          const title = consignee.name.split('\n')[0] || consignee.name;
          const initial = title.charAt(0).toUpperCase() || '收';
          const primaryContact = getPrimaryContact(consignee);
          const contact = primaryContact?.phone || primaryContact?.email || consignee.address || '—';

          return (
            <div
              key={consignee.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              {/* 头像 */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(title)}`}>
                {initial}
              </div>

              {/* 名称 + 公司 */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                {consignee.shortName && (
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{consignee.shortName}</p>
                )}
              </div>

              {/* 联系方式 */}
              <div className="hidden w-40 shrink-0 truncate text-xs text-gray-400 dark:text-gray-500 sm:block">
                {contact}
              </div>

              {/* 创建时间 */}
              <div className="hidden w-24 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500 md:block">
                {fmtDate(consignee.createdAt)}
              </div>

              {/* 操作 */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(consignee)}
                  title="编辑"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(consignee)}
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
