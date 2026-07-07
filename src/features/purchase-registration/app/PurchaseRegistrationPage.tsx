'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PermissionDenied } from '@/components/PermissionDenied';
import { useAppUser } from '@/hooks/useAppUser';
import { usePermissionStore } from '@/lib/permissions';
import { useInquirySync } from '@/features/inquiry/hooks/useInquirySync';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { InquiryRecord } from '@/features/inquiry/types';
import {
  PurchaseRegistrationFilterBar,
  type OrderStateFilter,
} from '../components/PurchaseRegistrationFilterBar';
import { PurchaseRegistrationTable } from '../components/PurchaseRegistrationTable';

function hasOrder(record: InquiryRecord): boolean {
  return Boolean(record.orderNo?.trim());
}

function matchesKeyword(record: InquiryRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.inquiryNo,
    record.purchaseContentDesc,
    record.purchaseInquiryStatus,
    record.orderNo,
    record.orderDeliveryStatus,
    record.orderDeliveryConsignee,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}

function matchesOrderState(record: InquiryRecord, state: OrderStateFilter): boolean {
  if (state === 'all') return true;
  if (state === 'has_order') return hasOrder(record);
  return !hasOrder(record);
}

export function PurchaseRegistrationPage() {
  const { status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  const permissionUser = usePermissionStore((s) => s.user);
  const hasAccess = usePermissionStore((s) => s.hasPermission('purchaseRegistration'));
  const records = useInquiryStore((s) => s.records);
  const patchRecordForView = useInquiryStore((s) => s.patchRecordForView);
  const { lastSyncedAt } = useInquirySync({
    enabled: status === 'authenticated' && hasAccess,
    pushLocal: false,
    mergeLocal: false,
  });

  const [keyword, setKeyword] = useState('');
  const [orderState, setOrderState] = useState<OrderStateFilter>('all');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    useInquiryStore.getState().init();
  }, []);

  const activeRecords = useMemo(
    () => records.filter((record) => record.status !== 'deleted'),
    [records]
  );

  const keywordFiltered = useMemo(
    () => activeRecords.filter((record) => matchesKeyword(record, keyword)),
    [activeRecords, keyword]
  );

  const counts = useMemo(
    () => ({
      all: keywordFiltered.length,
      has_order: keywordFiltered.filter(hasOrder).length,
      no_order: keywordFiltered.filter((record) => !hasOrder(record)).length,
    }),
    [keywordFiltered]
  );

  const filteredRecords = useMemo(
    () =>
      keywordFiltered
        .filter((record) => matchesOrderState(record, orderState))
        .sort((a, b) => b.inquiryNo.localeCompare(a.inquiryNo)),
    [keywordFiltered, orderState]
  );

  const activeCount = [keyword.trim() !== '', orderState !== 'all'].filter(Boolean).length;

  if (status === 'loading' || !user || !permissionUser) {
    return <FullScreenSpinner />;
  }

  if (!hasAccess) {
    return <PermissionDenied message="您没有采购部登记的访问权限" />;
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
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '采购部登记' }]}
      user={user}
      onLogout={handleLogout}
      topBarSlot={topBarSlot}
    >
      <div className="w-full px-3 py-3 sm:px-5 lg:px-6">
        <PurchaseRegistrationFilterBar
          keyword={keyword}
          orderState={orderState}
          counts={counts}
          activeCount={activeCount}
          onKeywordChange={setKeyword}
          onOrderStateChange={setOrderState}
          onReset={() => {
            setKeyword('');
            setOrderState('all');
          }}
        />
        <PurchaseRegistrationTable
          records={filteredRecords}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
        />
      </div>
    </AppLayout>
  );
}
