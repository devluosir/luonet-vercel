'use client';

import { useEffect, useRef, useState } from 'react';
import { inquiryService } from '../services/inquiry.service';
import { useInquiryStore } from '../state/inquiry.store';

const POLL_INTERVAL_MS = 30_000;
const FORCE_FULL_SYNC_EVERY_MS = 5 * 60_000;

interface UseInquirySyncOptions {
  enabled: boolean;
  suspended?: boolean;
}

function getMetaKey(meta: { count: number; maxUpdatedAt: string | null }): string {
  return `${meta.count}:${meta.maxUpdatedAt ?? ''}`;
}

export function useInquirySync({ enabled, suspended = false }: UseInquirySyncOptions) {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const suspendedRef = useRef(suspended);
  const lastMetaRef = useRef<string | null>(null);
  const lastFullSyncAtRef = useRef(0);
  const syncingRef = useRef(false);

  useEffect(() => {
    suspendedRef.current = suspended;
  }, [suspended]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function refreshMetaMemory() {
      const meta = await inquiryService.getMeta();
      if (!cancelled && meta.count >= 0) lastMetaRef.current = getMetaKey(meta);
    }

    async function fullSync() {
      if (syncingRef.current || suspendedRef.current) return;
      syncingRef.current = true;

      try {
        const d1Records = await inquiryService.pullFromD1();
        if (cancelled || suspendedRef.current) return;
        inquiryService.pushLocalToD1(d1Records);
        const merged = inquiryService.mergeFromD1(d1Records);
        useInquiryStore.setState({ records: merged });
        lastFullSyncAtRef.current = Date.now();
        setLastSyncedAt(new Date());
        await refreshMetaMemory();
      } finally {
        syncingRef.current = false;
      }
    }

    async function checkAndMaybeSync() {
      if (syncingRef.current || suspendedRef.current) return;

      const meta = await inquiryService.getMeta();
      if (cancelled || suspendedRef.current) return;

      const metaKey = getMetaKey(meta);
      const metaProbeFailed = meta.count < 0;
      const forceFullSync = Date.now() - lastFullSyncAtRef.current > FORCE_FULL_SYNC_EVERY_MS;

      if (metaProbeFailed || metaKey !== lastMetaRef.current || forceFullSync) {
        if (!metaProbeFailed) lastMetaRef.current = metaKey;
        await fullSync();
      } else {
        setLastSyncedAt(new Date());
      }
    }

    void fullSync();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void checkAndMaybeSync();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkAndMaybeSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return { lastSyncedAt };
}
