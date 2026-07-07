'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PermissionDenied } from '@/components/PermissionDenied';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import type { MonthTimeRange } from '@/components/MonthRangeNav';
import { getCustomersForDropdown } from '@/features/customer/services/customerService';
import { useInquirySync } from '@/features/inquiry/hooks/useInquirySync';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { getDateInputValueFromInquiryNo } from '@/features/inquiry/utils/inquiryUtils';
import type { InquiryRecord } from '@/features/inquiry/types';
import { PurchaseOrderFilterBar } from '../components/PurchaseOrderFilterBar';
import { PurchaseOrderTable } from '../components/PurchaseOrderTable';

/** 采购订单表只展示"已成单"的记录（orderNo 有值），与订单状态表的过滤条件一致 */
function hasOrder(record: InquiryRecord): boolean {
  return Boolean(record.orderNo?.trim());
}

/** 判断记录是否落在指定时间范围内（按询价编号日期，月维度比较，与询报价登记表/采购部登记表一致） */
function matchesTimeRange(record: InquiryRecord, range: MonthTimeRange, now: Date): boolean {
  if (range === 'all') return true;

  const dateStr = getDateInputValueFromInquiryNo(record.inquiryNo);
  const recordDate = new Date(dateStr);
  if (!Number.isFinite(recordDate.getTime())) return true;

  if (range === '3months') {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    return recordDate >= cutoff;
  }

  const monthStr = range.slice(6);
  const [yearStr, monStr] = monthStr.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monStr ?? '0', 10);
  return recordDate.getFullYear() === year && recordDate.getMonth() + 1 === month;
}

function matchesKeyword(record: InquiryRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.orderNo,
    record.inquiryNo,
    record.purchaseOrderNo,
    record.purchaseOrderSupplier,
    record.orderDeliveryStatus,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}

export function PurchaseOrderRegistrationPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const permissionUser = usePermissionStore((s) => s.user);
  const hasAccess = usePermissionStore((s) => s.hasPermission('purchaseOrderTable'));
  const canViewFinancials = usePermissionStore((s) => s.hasPermission('order.financials'));
  const records = useInquiryStore((s) => s.records);
  const patchRecordForView = useInquiryStore((s) => s.patchRecordForView);
  const { lastSyncedAt } = useInquirySync({
    enabled: status === 'authenticated' && hasAccess,
    pushLocal: false,
    mergeLocal: false,
  });

  const [keyword, setKeyword] = useState('');
  const [timeRange, setTimeRange] = useState<MonthTimeRange>('3months');
  const [consigneeOptions, setConsigneeOptions] = useState<string[]>([]);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    useInquiryStore.getState().init();
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
        console.warn('[PurchaseOrderRegistrationPage] 加载收货人选项失败', error);
        if (!cancelled) setConsigneeOptions([]);
      }
    }
    void loadConsigneeOptions();
    return () => { cancelled = true; };
  }, []);

  // 只展示"已成单"（orderNo 有值）的记录，与订单状态表过滤条件一致
  const orderRecords = useMemo(
    () => records.filter((record) => record.status !== 'deleted' && hasOrder(record)),
    [records]
  );

  const timeFiltered = useMemo(
    () => orderRecords.filter((record) => matchesTimeRange(record, timeRange, now)),
    [orderRecords, timeRange, now]
  );

  const filteredRecords = useMemo(
    () =>
      timeFiltered
        .filter((record) => matchesKeyword(record, keyword))
        .sort((a, b) => (b.orderNo ?? '').localeCompare(a.orderNo ?? '')),
    [timeFiltered, keyword]
  );

  const activeCount = [timeRange !== '3months', keyword.trim() !== ''].filter(Boolean).length;

  if (status === 'loading' || !user || !permissionUser) {
    return <FullScreenSpinner />;
  }

  if (!hasAccess) {
    return <PermissionDenied message="您没有采购订单表的访问权限" />;
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
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '采购订单表' }]}
      user={user}
      onLogout={handleLogout}
      topBarSlot={topBarSlot}
    >
      <div className="w-full px-3 py-3 sm:px-5 lg:px-6">
        <PurchaseOrderFilterBar
          keyword={keyword}
          timeRange={timeRange}
          filteredCount={filteredRecords.length}
          activeCount={activeCount}
          onKeywordChange={setKeyword}
          onTimeRangeChange={setTimeRange}
          onReset={() => {
            setKeyword('');
            setTimeRange('3months');
          }}
        />
        <PurchaseOrderTable
          records={filteredRecords}
          canViewFinancials={canViewFinancials}
          consigneeOptions={consigneeOptions}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
        />
      </div>
    </AppLayout>
  );
}
