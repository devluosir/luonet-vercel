'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout, type ActionButton } from '@/components/layout';
import { FilterChip } from '@/components/FilterChip';
import { MonthRangeNav, type MonthTimeRange } from '@/components/MonthRangeNav';
import { PermissionDenied } from '@/components/PermissionDenied';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { useAppUser } from '@/hooks/useAppUser';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { usePermissionStore } from '@/lib/permissions';
import { getCustomersForDropdown } from '@/features/customer/services/customerService';
import { useInquirySync } from '@/features/inquiry/hooks/useInquirySync';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord, OrderSubStatus } from '@/features/inquiry/types';
import { isNormalOrder } from '@/features/inquiry/utils/orderStatus';
import { OrderTable, type SortField } from '../components/OrderTable';

// ── 时间范围类型 ──────────────────────────────────────────────────────────────

type TimeRange = MonthTimeRange;

/** 判断记录是否在指定时间范围内（按询价编号的日期） */
function matchesTimeRange(record: InquiryRecord, range: TimeRange, now: Date): boolean {
  if (range === 'all') return true;
  // 询价编号格式：C260620F → 年=26, 月=06, 日=20
  const no = record.inquiryNo;
  const match = /^C(\d{2})(\d{2})(\d{2})/.exec(no);
  if (!match) return true;
  const [, yy, mm, dd] = match;
  const recDate = new Date(2000 + parseInt(yy, 10), parseInt(mm, 10) - 1, parseInt(dd, 10));

  if (range === '3months') {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return recDate >= cutoff;
  }
  // month:YYYY-MM
  const monthStr = range.replace('month:', '');
  const [yearStr, monStr] = monthStr.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monStr ?? '0', 10);
  return recDate.getFullYear() === year && recDate.getMonth() + 1 === month;
}

// ── 订单状态筛选类型 ──────────────────────────────────────────────────────────

type OrderStatusFilter = 'all' | 'inProgress' | 'normal' | OrderSubStatus;

// 执行情况是自由文本（见 DeliveryStatusCell），不是只能三选一的枚举。
// 因此这里不能反过来"白名单"匹配 备货/交货 前缀——任何用户手写的说明文字
// （比如"合同确认中"）只要不是明确的"发票"（代表已开票/基本完成），都应继续算"进行中"。
function isInProgressOrder(record: InquiryRecord): boolean {
  if (record.orderSubStatus === 'cancelled') return false;
  if (record.orderSubStatus === 'suspended' || record.orderSubStatus === 'followup') return true;
  const deliveryStatus = record.orderDeliveryStatus?.trim() ?? '';
  return !deliveryStatus.startsWith('发票');
}

function matchesOrderStatus(record: InquiryRecord, filter: OrderStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'inProgress') return isInProgressOrder(record);
  if (filter === 'normal') return isNormalOrder(record);
  return record.orderSubStatus === filter;
}

function matchesKeyword(record: InquiryRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.orderNo,
    record.inquiryNo,
    record.inquirer,
    record.description,
    record.orderCustomerNo,
    record.customerNo,
    record.orderDeliveryStatus,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}

// ── OrderPage ─────────────────────────────────────────────────────────────────

export function OrderPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const permissionUser = usePermissionStore((s) => s.user);
  const hasOrderAccess = usePermissionStore((s) => s.hasPermission('inquiry'));
  const hasFinancialsPermission = usePermissionStore((s) => s.hasPermission('order.financials'));

  const records = useInquiryStore((s) => s.records);
  const updateRecord = useInquiryStore((s) => s.updateRecord);
  const removeRecord = useInquiryStore((s) => s.removeRecord);
  const confirm = useConfirm();
  const hasBatchEditPermission = usePermissionStore((s) => s.hasPermission('inquiry.batchEdit'));

  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 默认进入时选中"进行中"：进行中订单通常跨越较长周期，时间范围和排序一并采用
  // 与手动点击"进行中"筛选芯片相同的组合（见下方 FilterChip onClick），保持行为一致
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('inProgress');
  const [keyword, setKeyword] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [consigneeOptions, setConsigneeOptions] = useState<string[]>([]);
  const [sortField, setSortField] = useState<SortField>('orderNo');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { lastSyncedAt, syncStatus } = useInquirySync({
    enabled: status === 'authenticated' && hasOrderAccess,
  });

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    const store = useInquiryStore.getState();
    store.init();
    // 自动迁移：customerNo 含 RFQ 且未设置 orderCustomerNo 的订单记录，自动将 RFQ→PO 存为 orderCustomerNo
    store.records.forEach((r) => {
      if (
        r.status !== 'deleted' &&
        r.orderNo?.trim() &&
        (r.customerNo ?? '').includes('RFQ') &&
        !r.orderCustomerNo
      ) {
        store.updateRecord(r.id, {
          orderCustomerNo: (r.customerNo ?? '').replace(/RFQ/g, 'PO'),
        });
      }
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadConsigneeOptions() {
      try {
        const consignees = await getCustomersForDropdown('consignee');
        if (cancelled) return;
        const options = Array.from(
          new Set(consignees.map((consignee) => consignee.name.trim()).filter(Boolean))
        ).sort((a, b) => a.localeCompare(b, 'zh-CN'));
        setConsigneeOptions(options);
      } catch (error) {
        console.warn('[OrderPage] 加载收货人选项失败', error);
        if (!cancelled) setConsigneeOptions([]);
      }
    }

    void loadConsigneeOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  const now = useMemo(() => new Date(), []);

  // 所有有订单号的记录（未删除）
  const allOrderRecords = useMemo(
    () => records.filter((r) => r.status !== 'deleted' && Boolean(r.orderNo?.trim())),
    [records]
  );

  const customerOptions = useMemo(
    () =>
      // 防御性兜底：受限视图/异常数据可能缺失 inquirer 字段
      Array.from(new Set(allOrderRecords.map((r) => (r.inquirer ?? '').trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b, 'zh-CN')),
    [allOrderRecords]
  );

  // 应用时间范围筛选
  const timeFiltered = useMemo(
    () => allOrderRecords.filter((r) => matchesTimeRange(r, timeRange, now)),
    [allOrderRecords, timeRange, now]
  );

  // 应用关键词 + 客户筛选，状态角标基于该集合计算
  const baseFiltered = useMemo(
    () =>
      timeFiltered.filter((r) =>
        matchesKeyword(r, keyword) &&
        (!customerFilter || (r.inquirer ?? '').trim() === customerFilter)
      ),
    [timeFiltered, keyword, customerFilter]
  );

  // 各订单状态数量（在时间、关键词、客户筛选后）
  const countByStatus = useMemo(
    () => ({
      all: baseFiltered.length,
      inProgress: baseFiltered.filter(isInProgressOrder).length,
      normal: baseFiltered.filter(isNormalOrder).length,
      cancelled: baseFiltered.filter((r) => r.orderSubStatus === 'cancelled').length,
      suspended: baseFiltered.filter((r) => r.orderSubStatus === 'suspended').length,
      followup: baseFiltered.filter((r) => r.orderSubStatus === 'followup').length,
    }),
    [baseFiltered]
  );

  // 与默认进入态（timeRange='all' + orderStatusFilter='inProgress'）对比，判断是否有筛选被用户改动过
  const activeCount = [
    timeRange !== 'all',
    keyword.trim() !== '',
    customerFilter !== '',
    orderStatusFilter !== 'inProgress',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setTimeRange('all');
    setOrderStatusFilter('inProgress');
    setSortField('orderNo');
    setSortDir('desc');
    setKeyword('');
    setCustomerFilter('');
  };

  // 筛选条件变化时清空选中
  useEffect(() => {
    setSelectedIds(new Set());
  }, [timeRange, orderStatusFilter, keyword, customerFilter]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleSelectAll = useCallback((allIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, []);

  const handleBatchDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await confirm({
      title: '删除订单记录',
      description: `确定删除选中的 ${selectedIds.size} 条记录吗？此操作不可撤销，且会同时从询报价登记表中删除这条记录。`,
      confirmLabel: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;
    Array.from(selectedIds).forEach((id) => removeRecord(id));
    setSelectedIds(new Set());
  }, [selectedIds, removeRecord, confirm]);

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      if (prev) setSelectedIds(new Set());
      return !prev;
    });
  }, []);

  const bottomActions = useMemo<ActionButton[]>(() => {
    if (!hasBatchEditPermission) return [];
    return [
      {
        key: 'admin-menu',
        label: '批量编辑',
        onClick: () => setIsAdminMenuOpen((prev) => !prev),
        variant: isAdminMenuOpen || isEditMode ? 'primary' : 'secondary',
        icon: Pencil,
      },
    ];
  }, [hasBatchEditPermission, isAdminMenuOpen, isEditMode]);

  /** "m.D" 或 "[m.D]" → 数字排序键，无值返回 0（排末尾） */
  const parseDeliveryDate = (s: string | undefined): number => {
    if (!s) return 0;
    const clean = s.replace(/[\[\]]/g, '');
    const [mStr, dStr] = clean.split('.');
    const m = parseInt(mStr ?? '0');
    const d = parseInt(dStr ?? '0');
    return m ? m * 100 + (d || 0) : 0;
  };

  // 最终展示记录
  const filteredRecords = useMemo(
    () =>
      baseFiltered
        .filter((r) => matchesOrderStatus(r, orderStatusFilter))
        .sort((a, b) => {
          if (sortField === 'deliveryDate') {
            const aD = parseDeliveryDate(a.orderDeliveryDate);
            const bD = parseDeliveryDate(b.orderDeliveryDate);
            // 无交货日期的排最后
            if (aD === 0 && bD === 0) return 0;
            if (aD === 0) return 1;
            if (bD === 0) return -1;
            return sortDir === 'desc' ? bD - aD : aD - bD;
          }
          // orderNo
          const cmp = (a.orderNo ?? '').localeCompare(b.orderNo ?? '');
          return sortDir === 'desc' ? -cmp : cmp;
        }),
    [baseFiltered, orderStatusFilter, sortField, sortDir]
  );

  if (status === 'loading' || !user || !permissionUser) {
    return <FullScreenSpinner />;
  }

  if (!hasOrderAccess) {
    return <PermissionDenied message="您没有订单状态表的访问权限" />;
  }

  const topBarSlot = syncStatus.pendingCount > 0 ? (
    <span
      className="text-amber-600 dark:text-amber-400"
      title={syncStatus.lastError ? `最近同步失败：${syncStatus.lastError}` : undefined}
    >
      待同步 {syncStatus.pendingCount} 条
    </span>
  ) : lastSyncedAt ? (
    <span>
      同步{' '}
      {lastSyncedAt.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })}
    </span>
  ) : undefined;

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '订单状态表' }]}
      user={user}
      onLogout={handleLogout}
      topBarSlot={topBarSlot}
      bottomActions={bottomActions}
    >
      <div className="w-full px-3 py-3 sm:px-5 lg:px-6">
        {/* 筛选面板 */}
        <div className="mb-3 overflow-visible rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <div className="flex flex-col gap-2.5 overflow-visible xl:flex-row xl:items-center xl:justify-between xl:gap-4">
            {/* 时间范围 + 订单状态筛选 */}
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 overflow-visible">
              <FilterChip
                label="近3月"
                active={timeRange === '3months'}
                badge={timeRange === '3months' ? filteredRecords.length : undefined}
                onClick={() => setTimeRange('3months')}
              />
              <FilterChip
                label="全部"
                active={timeRange === 'all'}
                badge={timeRange === 'all' ? filteredRecords.length : undefined}
                onClick={() => setTimeRange('all')}
              />
              <MonthRangeNav
                range={timeRange}
                onChange={(r) => setTimeRange(r)}
                badge={timeRange.startsWith('month:') ? filteredRecords.length : undefined}
              />

              <span className="select-none text-gray-200 dark:text-gray-700">·</span>

              {/* 订单状态芯片 */}
              <FilterChip
                label="全部"
                active={orderStatusFilter === 'all'}
                badge={countByStatus.all}
                badgeColor="bg-blue-600"
                onClick={() => setOrderStatusFilter('all')}
              />
              <FilterChip
                label="进行中"
                active={orderStatusFilter === 'inProgress'}
                activeColor="bg-blue-600 text-white"
                badge={countByStatus.inProgress}
                badgeColor="bg-blue-600"
                onClick={() => {
                  setTimeRange('all');
                  setOrderStatusFilter('inProgress');
                  setSortField('orderNo');
                  setSortDir('desc');
                }}
              />
              <FilterChip
                label="正常"
                active={orderStatusFilter === 'normal'}
                badge={countByStatus.normal}
                badgeColor="bg-blue-600"
                onClick={() => setOrderStatusFilter('normal')}
              />
              <FilterChip
                label="辙销C"
                active={orderStatusFilter === 'cancelled'}
                activeColor="bg-red-500 text-white"
                badge={countByStatus.cancelled}
                badgeColor="bg-red-500"
                onClick={() => setOrderStatusFilter('cancelled')}
              />
              <FilterChip
                label="悬挂P"
                active={orderStatusFilter === 'suspended'}
                activeColor="bg-orange-400 text-white"
                badge={countByStatus.suspended}
                badgeColor="bg-orange-400"
                onClick={() => setOrderStatusFilter('suspended')}
              />
              <FilterChip
                label="善后S"
                active={orderStatusFilter === 'followup'}
                activeColor="bg-orange-500 text-white"
                badge={countByStatus.followup}
                badgeColor="bg-orange-500"
                onClick={() => setOrderStatusFilter('followup')}
              />
            </div>

            {/* 搜索 + 客户 + 重置 */}
            <div className="flex w-full items-center gap-1.5 sm:ml-auto sm:max-w-md xl:ml-0 xl:w-auto xl:shrink-0 xl:border-l xl:border-gray-100 xl:pl-4 dark:xl:border-gray-700">
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="搜索订单/客户/内容..."
                className={
                  'h-7 min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 ' +
                  'text-xs text-gray-700 outline-none placeholder:text-gray-400 ' +
                  'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
                  'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
                  'dark:focus:border-blue-500 sm:w-44 sm:flex-none lg:w-52 xl:w-56'
                }
              />
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-7 min-w-0 shrink-0 rounded-lg border border-gray-200 bg-white px-1.5 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option value="">客户</option>
                {customerOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="h-7 shrink-0 rounded-lg border border-gray-200 px-2.5 text-xs font-medium text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  重置
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 表格 */}
        <OrderTable
          records={filteredRecords}
          canViewFinancials={hasFinancialsPermission}
          sortField={sortField}
          sortDir={sortDir}
          consigneeOptions={consigneeOptions}
          onSortToggle={(field) => {
            if (field === sortField) {
              setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
            } else {
              setSortField(field);
              setSortDir('desc');
            }
          }}
          onUpdate={(id, patch) => updateRecord(id, patch)}
          canBatchEdit={hasBatchEditPermission && isEditMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onToggleSelectAll={handleToggleSelectAll}
        />
      </div>

      {/* ── 批量编辑菜单 ── */}
      {hasBatchEditPermission && isAdminMenuOpen && (
        <>
          {/* 点击遮罩关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsAdminMenuOpen(false)}
          />
          {/* 菜单面板，悬浮在底部 bar 上方 */}
          <div className="fixed bottom-20 right-4 z-50 min-w-[10rem] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#2C2C2E]">

            {/* 批量选择 开关 */}
            <button
              type="button"
              onClick={toggleEditMode}
              className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                isEditMode
                  ? 'font-medium text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <Pencil className="h-4 w-4 shrink-0 text-gray-400" />
              {isEditMode ? '退出批量选择' : '批量选择'}
            </button>

            {/* 删除选中（有选中时才显示） */}
            {isEditMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => { handleBatchDelete(); setIsAdminMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4 shrink-0" />
                删除选中（{selectedIds.size}）
              </button>
            )}

            {/* 取消选择（编辑模式且有选中时显示） */}
            {isEditMode && selectedIds.size > 0 && (
              <button
                type="button"
                onClick={() => { setSelectedIds(new Set()); setIsAdminMenuOpen(false); }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-700/50"
              >
                <X className="h-4 w-4 shrink-0 text-gray-400" />
                取消选择
              </button>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
}
