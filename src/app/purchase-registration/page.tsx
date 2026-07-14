'use client';

import { Suspense } from 'react';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { PurchaseRegistrationPage } from '@/features/purchase-registration';

export default function Page() {
  return (
    <Suspense fallback={<FullScreenSpinner />}>
      <PurchaseRegistrationPage />
    </Suspense>
  );
}
