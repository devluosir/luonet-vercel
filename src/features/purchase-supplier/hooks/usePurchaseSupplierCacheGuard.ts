'use client';

import { useEffect } from 'react';
import { usePurchaseSupplierAccess } from './usePurchaseSupplierAccess';
import { clearPurchaseSupplierLocalState } from '../services/purchaseSupplierService';

export function usePurchaseSupplierCacheGuard() {
  const { ready, canRead, userId, sessionStatus } = usePurchaseSupplierAccess();

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      clearPurchaseSupplierLocalState();
      return;
    }
    if (!ready || !userId || canRead) return;
    clearPurchaseSupplierLocalState(userId);
  }, [canRead, ready, sessionStatus, userId]);
}
