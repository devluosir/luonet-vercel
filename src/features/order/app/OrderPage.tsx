'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { FilterChip } from '@/components/FilterChip';
import { MonthRangeNav, type MonthTimeRange } from '@/components/MonthRangeNav';
import { PermissionDenied } from '@/components/PermissionDenied';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import { getCustomersForDropdown } from '@/features/customer/services/customerService';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { inquiryService } from '@/features/inquiry/services/inquiry.service';
import type { InquiryRecord, OrderSubStatus } from '@/features/inquiry/types';
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

function isInProgressOrder(record: InquiryRecord): boolean {
  if (record.orderSubStatus === 'cancelled') return false;
  if (record.orderSubStatus === 'suspended' || record.orderSubStatus === 'followup') return true;
  const deliveryStatus = record.orderDeliveryStatus?.trim() ?? '';
  return !deliveryStatus || deliveryStatus.startsWith('备货') || deliveryStatus.startsWith('交货');
}

function matchesOrderStatus(record: InquiryRecord, filter: OrderStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'inProgress') return isInProgressOrder(record);
  if (filter === 'normal')
    return record.orderSubStatus === undefined || record.orderSubStatus === 'suspended';
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

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('3months');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [customerFilter, setCustomerFilter] = useState('');
  const [consigneeOptions, setConsigneeOptions] = useState<string[]>([]);
  // 默认按交货日期降序排列
  const [sortField, setSortField] = useState<SortField>('deliveryDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const isModalOpenRef = useRef(false);

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
        r.customerNo.includes('RFQ') &&
        !r.orderCustomerNo
      ) {
        store.updateRecord(r.id, {
          orderCustomerNo: r.customerNo.replace(/RFQ/g, 'PO'),
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

  useEffect(() => {
    if (status !== 'authenticated' || !hasOrderAccess) return;

    const POLL_INTERVAL_MS = 30_000;
    let cancelled = false;

    async function syncFromD1() {
      if (isModalOpenRef.current) return;
      const d1Records = await inquiryService.pullFromD1();
      if (cancelled) return;
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
      setLastSyncedAt(new Date());
    }

    void syncFromD1();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void syncFromD1();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void syncFromD1();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, hasOrderAccess]);

  const now = useMemo(() => new Date(), []);

  // 所有有订单号的记录（未删除）
  const allOrderRecords = useMemo(
    () => records.filter((r) => r.status !== 'deleted' && Boolean(r.orderNo?.trim())),
    [records]
  );

  const customerOptions = useMemo(
    () =>
      Array.from(new Set(allOrderRecords.map((r) => r.inquirer.trim()).filter(Boolean)))
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
        (!customerFilter || r.inquirer.trim() === customerFilter)
      ),
    [timeFiltered, keyword, customerFilter]
  );

  // 各订单状态数量（在时间、关键词、客户筛选后）
  const countByStatus = useMemo(
    () => ({
      all: baseFiltered.length,
      inProgress: baseFiltered.filter(isInProgressOrder).length,
      normal: baseFiltered.filter((r) => r.orderSubStatus === undefined || r.orderSubStatus === 'suspended').length,
      cancelled: baseFiltered.filter((r) => r.orderSubStatus === 'cancelled').length,
      suspended: baseFiltered.filter((r) => r.orderSubStatus === 'suspended').length,
      followup: baseFiltered.filter((r) => r.orderSubStatus === 'followup').length,
    }),
    [baseFiltered]
  );

  const activeCount = [
    timeRange !== '3months',
    keyword.trim() !== '',
    customerFilter !== '',
    orderStatusFilter !== 'all',
  ].filter(Boolean).length;

  const resetFilters = () => {
    setTimeRange('3months');
    setOrderStatusFilter('all');
    setKeyword('');
    setCustomerFilter('');
  };

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

  const topBarSlot = lastSyncedAt ? (
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
        />
      </div>
    </AppLayout>
  );
}
