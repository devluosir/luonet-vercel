'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { inquiryService } from '@/features/inquiry/services/inquiry.service';
import type { InquiryRecord, OrderSubStatus } from '@/features/inquiry/types';
import { OrderTable, type SortField } from '../components/OrderTable';

// ── 时间范围类型 ──────────────────────────────────────────────────────────────

type TimeRange = '3months' | 'all' | `month:${string}`;

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

type OrderStatusFilter = 'all' | 'normal' | OrderSubStatus;

function matchesOrderStatus(record: InquiryRecord, filter: OrderStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'normal')
    return record.orderSubStatus === undefined || record.orderSubStatus === 'suspended';
  return record.orderSubStatus === filter;
}

// ── 简单芯片组件 ──────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  active: boolean;
  activeColor?: string;
  badge?: number;
  onClick: () => void;
}

function Chip({ label, active, activeColor = 'bg-blue-600 text-white', badge, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold transition-colors ${
        active
          ? activeColor
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
      }`}
    >
      {label}
      {badge !== undefined && badge >= 0 && (
        <span className={`ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none ${
          active ? 'bg-white/30 text-white' : 'bg-gray-400/20 text-gray-500 dark:bg-gray-600 dark:text-gray-300'
        }`}>
          {badge}
        </span>
      )}
    </button>
  );
}

// ── 月份选择器 ────────────────────────────────────────────────────────────────

function MonthNav({
  range,
  onChange,
}: {
  range: TimeRange;
  onChange: (r: TimeRange) => void;
}) {
  const isMonthMode = range.startsWith('month:');
  const now = new Date();

  const currentMonthKey = (): `month:${string}` => {
    if (isMonthMode) return range as `month:${string}`;
    return `month:${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const stepMonth = (delta: number) => {
    const key = currentMonthKey().replace('month:', '');
    const [y, m] = key.split('-').map(Number) as [number, number];
    const d = new Date(y, m - 1 + delta, 1);
    onChange(`month:${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const monthLabel = () => {
    const key = currentMonthKey().replace('month:', '');
    const [y, m] = key.split('-').map(Number) as [number, number];
    return `${y}/${m}`;
  };

  if (!isMonthMode) {
    return (
      <button
        type="button"
        onClick={() => onChange(currentMonthKey())}
        className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
      >
        选月
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 rounded-full bg-blue-600 px-1 py-0.5 text-xs font-semibold text-white">
      <button
        type="button"
        onClick={() => stepMonth(-1)}
        className="rounded-full p-0.5 hover:bg-white/20"
        aria-label="上月"
      >
        <ChevronLeft className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={() => stepMonth(1)}
        className="rounded-full p-0.5 hover:bg-white/20"
        aria-label="下月"
      >
        <ChevronRight className="h-3 w-3" />
      </button>
      <span className="mx-0.5">{monthLabel()}</span>
    </span>
  );
}

// ── OrderPage ─────────────────────────────────────────────────────────────────

export function OrderPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();

  const records = useInquiryStore((s) => s.records);
  const updateRecord = useInquiryStore((s) => s.updateRecord);

  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('3months');
  const [orderStatusFilter, setOrderStatusFilter] = useState<OrderStatusFilter>('all');
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
    if (status !== 'authenticated') return;

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
  }, [status]);

  const now = useMemo(() => new Date(), []);

  // 所有有订单号的记录（未删除）
  const allOrderRecords = useMemo(
    () => records.filter((r) => r.status !== 'deleted' && Boolean(r.orderNo?.trim())),
    [records]
  );

  // 应用时间范围筛选
  const timeFiltered = useMemo(
    () => allOrderRecords.filter((r) => matchesTimeRange(r, timeRange, now)),
    [allOrderRecords, timeRange, now]
  );

  // 各订单状态数量（在时间范围内）
  const countByStatus = useMemo(
    () => ({
      all: timeFiltered.length,
      normal: timeFiltered.filter((r) => r.orderSubStatus === undefined || r.orderSubStatus === 'suspended').length,
      cancelled: timeFiltered.filter((r) => r.orderSubStatus === 'cancelled').length,
      suspended: timeFiltered.filter((r) => r.orderSubStatus === 'suspended').length,
      followup: timeFiltered.filter((r) => r.orderSubStatus === 'followup').length,
    }),
    [timeFiltered]
  );

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
      timeFiltered
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
    [timeFiltered, orderStatusFilter, sortField, sortDir]
  );

  if (status === 'loading' || !user) return null;

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
        <div className="mb-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-[#2C2C2E]">
          <div className="flex flex-col gap-2">
            {/* 时间行 */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip
                label="近3月"
                active={timeRange === '3months'}
                badge={timeRange === '3months' ? filteredRecords.length : undefined}
                onClick={() => setTimeRange('3months')}
              />
              <Chip
                label="全部"
                active={timeRange === 'all'}
                badge={timeRange === 'all' ? filteredRecords.length : undefined}
                onClick={() => setTimeRange('all')}
              />
              <MonthNav
                range={timeRange}
                onChange={(r) => setTimeRange(r)}
              />

              <span className="select-none text-gray-200 dark:text-gray-700">·</span>

              {/* 订单状态芯片 */}
              <Chip
                label="全部"
                active={orderStatusFilter === 'all'}
                badge={countByStatus.all}
                onClick={() => setOrderStatusFilter('all')}
              />
              <Chip
                label="正常"
                active={orderStatusFilter === 'normal'}
                badge={countByStatus.normal}
                onClick={() => setOrderStatusFilter('normal')}
              />
              <Chip
                label="辙销C"
                active={orderStatusFilter === 'cancelled'}
                activeColor="bg-red-500 text-white"
                badge={countByStatus.cancelled}
                onClick={() => setOrderStatusFilter('cancelled')}
              />
              <Chip
                label="悬挂P"
                active={orderStatusFilter === 'suspended'}
                activeColor="bg-orange-400 text-white"
                badge={countByStatus.suspended}
                onClick={() => setOrderStatusFilter('suspended')}
              />
              <Chip
                label="善后S"
                active={orderStatusFilter === 'followup'}
                activeColor="bg-orange-500 text-white"
                badge={countByStatus.followup}
                onClick={() => setOrderStatusFilter('followup')}
              />
            </div>
          </div>
        </div>

        {/* 表格 */}
        <OrderTable
          records={filteredRecords}
          isAdmin={user.isAdmin}
          sortField={sortField}
          sortDir={sortDir}
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
