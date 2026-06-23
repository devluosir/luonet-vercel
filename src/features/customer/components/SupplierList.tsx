import { useMemo } from 'react';
import { Building2, Edit, Search, Trash2 } from 'lucide-react';
import type { Customer, Supplier, Consignee } from '../types';

const AVATAR_COLORS = [
  'bg-emerald-500',
  'bg-teal-500',
  'bg-cyan-500',
  'bg-lime-500',
  'bg-green-500',
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

interface SupplierListProps {
  suppliers: Supplier[];
  loading: boolean;
  searchQuery: string;
  onEdit: (supplier: Customer | Supplier | Consignee) => void;
  onDelete: (supplier: Customer | Supplier | Consignee) => void;
}

export function SupplierList({ suppliers, loading, searchQuery, onEdit, onDelete }: SupplierListProps) {
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const q = searchQuery.toLowerCase();
    return suppliers.filter((s) => {
      const title = s.name.split('\n')[0] || s.name;
      return (
        title.toLowerCase().includes(q) ||
        (s.company || '').toLowerCase().includes(q) ||
        (s.phone || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
      );
    });
  }, [suppliers, searchQuery]);

  if (loading) {
    return (
      <div className="divide-y divide-gray-100 dark:divide-gray-800">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
      </div>
    );
  }

  if (suppliers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
          <Building2 className="h-7 w-7 text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">暂无供应商</p>
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">点击右上角&ldquo;新增供应商&rdquo;添加第一个供应商</p>
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Search className="mb-2 h-8 w-8 text-gray-300 dark:text-gray-600" />
        <p className="text-sm text-gray-500 dark:text-gray-400">未找到匹配的供应商</p>
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
        {filtered.map((supplier) => {
          const title = supplier.name.split('\n')[0] || supplier.name;
          const initial = title.charAt(0).toUpperCase() || '供';
          const contact = supplier.phone || supplier.email || '—';

          return (
            <div
              key={supplier.id}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
            >
              {/* 头像 */}
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarColor(title)}`}>
                {initial}
              </div>

              {/* 名称 + 公司 */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{title}</p>
                {supplier.company && (
                  <p className="truncate text-xs text-gray-400 dark:text-gray-500">{supplier.company}</p>
                )}
              </div>

              {/* 联系方式 */}
              <div className="hidden w-40 shrink-0 truncate text-xs text-gray-400 dark:text-gray-500 sm:block">
                {contact}
              </div>

              {/* 创建时间 */}
              <div className="hidden w-24 shrink-0 text-right text-xs text-gray-400 dark:text-gray-500 md:block">
                {fmtDate(supplier.createdAt)}
              </div>

              {/* 操作 */}
              <div className="flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(supplier)}
                  title="编辑"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-700 dark:hover:text-gray-200"
                >
                  <Edit className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(supplier)}
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
