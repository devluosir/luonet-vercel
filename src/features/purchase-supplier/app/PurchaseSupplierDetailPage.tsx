'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PermissionDenied } from '@/components/PermissionDenied';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import { useAppUser } from '@/hooks/useAppUser';
import { PurchaseSupplierActivityFeed } from '../components/PurchaseSupplierActivityFeed';
import {
  PurchaseSupplierInfoCard,
  type PurchaseSupplierFieldChanges,
} from '../components/PurchaseSupplierInfoCard';
import { usePurchaseSupplierAccess } from '../hooks/usePurchaseSupplierAccess';
import {
  fetchPurchaseSupplierById,
  savePurchaseSupplier,
} from '../services/purchaseSupplierService';
import type { PurchaseSupplier, PurchaseSupplierInput } from '../types';

function toSupplierInput(
  supplier: PurchaseSupplier,
  changes: PurchaseSupplierFieldChanges
): PurchaseSupplierInput {
  return {
    id: supplier.id,
    name: changes.name ?? supplier.name,
    shortName: changes.shortName ?? supplier.shortName,
    code: changes.code ?? supplier.code,
    address: changes.address ?? supplier.address,
    contacts: changes.contacts ?? supplier.contacts,
    data: {
      ...supplier.data,
      ...changes.data,
    },
  };
}

interface PurchaseSupplierDetailPageProps {
  supplierId: string | null;
}

export function PurchaseSupplierDetailPage({ supplierId }: PurchaseSupplierDetailPageProps) {
  const { ready, canRead, canWrite, userId } = usePurchaseSupplierAccess();
  const { user, handleLogout } = useAppUser();
  const { showToast } = useToast();
  const [supplier, setSupplier] = useState<PurchaseSupplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const loadSupplier = useCallback(async () => {
    if (!ready || !canRead) return;
    if (!supplierId?.trim()) {
      setSupplier(null);
      setLoadError('未找到采购供应商：链接中缺少供应商 ID');
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError('');
    try {
      const nextSupplier = await fetchPurchaseSupplierById({
        id: supplierId,
        userId,
        canRead,
      });
      setSupplier(nextSupplier);
    } catch (error) {
      setSupplier(null);
      const message = error instanceof Error ? error.message : '采购供应商资料加载失败';
      setLoadError(message.includes('不存在') ? '未找到对应的采购供应商' : message);
    } finally {
      setLoading(false);
    }
  }, [canRead, ready, supplierId, userId]);

  useEffect(() => {
    void loadSupplier();
  }, [loadSupplier]);

  useEffect(() => {
    if (ready && canRead) useInquiryStore.getState().init();
  }, [canRead, ready]);

  const handleSaveField = async (changes: PurchaseSupplierFieldChanges): Promise<boolean> => {
    if (!supplier || !canWrite) return false;
    try {
      const saved = await savePurchaseSupplier(toSupplierInput(supplier, changes));
      setSupplier(saved);
      showToast('采购供应商资料已更新', 'success');
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : '此项资料保存失败', 'error');
      return false;
    }
  };

  if (!ready) return <FullScreenSpinner />;
  if (!canRead) return <PermissionDenied message="您没有采购供应商读取权限" />;

  const displayName = supplier?.shortName || supplier?.name || '采购供应商详情';

  return (
    <AppLayout
      breadcrumbs={[
        { label: '首页', path: '/dashboard' },
        { label: '采购供应商', path: '/purchase-supplier' },
        { label: displayName },
      ]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="min-h-full bg-gray-50 px-4 py-5 pb-20 dark:bg-gray-950 sm:px-5 lg:px-6">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">正在加载采购供应商资料…</span>
            </div>
          ) : supplier ? (
            <>
              <PurchaseSupplierInfoCard
                supplier={supplier}
                canWrite={canWrite}
                onSaveField={handleSaveField}
              />
              <PurchaseSupplierActivityFeed supplier={supplier} />
            </>
          ) : (
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <AlertCircle className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600" />
              <h1 className="mt-3 text-lg font-semibold text-gray-900 dark:text-white">未找到采购供应商</h1>
              <p className="mt-2 text-sm text-gray-500">{loadError || '该供应商不存在或已无法访问。'}</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button type="button" variant="secondary" onClick={() => void loadSupplier()}>
                  重新加载
                </Button>
                <Link
                  href="/purchase-supplier"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  <ArrowLeft className="h-4 w-4" />返回采购供应商
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
