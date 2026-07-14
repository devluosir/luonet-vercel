'use client';

import { useSearchParams } from 'next/navigation';
import { PurchaseSupplierDetailPage } from '@/features/purchase-supplier/app/PurchaseSupplierDetailPage';

export default function PurchaseSupplierDetailRoute() {
  const searchParams = useSearchParams();
  return <PurchaseSupplierDetailPage supplierId={searchParams.get('id')} />;
}
