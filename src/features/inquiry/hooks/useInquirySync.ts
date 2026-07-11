'use client';

import { useEffect, useRef, useState } from 'react';
import { inquiryService } from '../services/inquiry.service';
import { useInquiryStore } from '../state/inquiry.store';
import type { InquirySyncStatus } from '../services/inquiry.service';

const POLL_INTERVAL_MS = 60_000;
// TASK-128：有了增量同步后，检测到变化时会立即增量拉取更新，这个定时整表同步
// 不再是防止漏更新的主力机制，只是兜底自愈（防御未知边界情况/时钟问题），
// 间隔可以从原来的 5 分钟大幅拉长。
const FORCE_FULL_SYNC_EVERY_MS = 60 * 60_000;

interface UseInquirySyncOptions {
  enabled: boolean;
  suspended?: boolean;
  pushLocal?: boolean;
  mergeLocal?: boolean;
}

function getMetaKey(meta: { count: number; maxUpdatedAt: string | null }): string {
  return `${meta.count}:${meta.maxUpdatedAt ?? ''}`;
}

export function useInquirySync({
  enabled,
  suspended = false,
  pushLocal = true,
  mergeLocal = true,
}: UseInquirySyncOptions) {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncStatus, setSyncStatus] = useState<InquirySyncStatus>(() =>
    inquiryService.getSyncStatus()
  );
  const suspendedRef = useRef(suspended);
  const lastMetaRef = useRef<string | null>(null);
  const lastFullSyncAtRef = useRef(0);
  const syncingRef = useRef(false);
  // TASK-128：增量同步水位——上次已知的服务端 meta.maxUpdatedAt（服务端时间，不用本地时钟，
  // 避免客户端/服务端时钟偏移导致漏拉或重复整表拉取）。为空代表还没同步过，下一次必须走全量。
  const syncWatermarkRef = useRef<string | null>(null);

  useEffect(() => {
    suspendedRef.current = suspended;
  }, [suspended]);

  useEffect(() => {
    const refresh = () => setSyncStatus(inquiryService.getSyncStatus());
    refresh();
    return inquiryService.subscribeSyncStatus(refresh);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const persistedWatermark = inquiryService.getSyncWatermark(mergeLocal);
    const persistedLastFullSyncAt = inquiryService.getLastFullSyncAt(mergeLocal);
    const hasFreshBaseline =
      Boolean(persistedWatermark) &&
      Date.now() - persistedLastFullSyncAt <= FORCE_FULL_SYNC_EVERY_MS;

    async function refreshMetaMemory() {
      const meta = await inquiryService.getMeta();
      if (!cancelled && meta.count >= 0) {
        lastMetaRef.current = getMetaKey(meta);
        // 用服务端 maxUpdatedAt 作为下一次增量同步的水位。
        if (meta.maxUpdatedAt) {
          syncWatermarkRef.current = meta.maxUpdatedAt;
          inquiryService.setSyncWatermark(mergeLocal, meta.maxUpdatedAt);
        }
      }
    }

    /** 整表同步：初次挂载 + 定时兜底自愈时使用，会做 pushLocalToD1 的整表对比。 */
    async function fullSync() {
      if (syncingRef.current || suspendedRef.current) return;
      syncingRef.current = true;

      try {
        await inquiryService.flushPendingSyncs();
        if (cancelled || suspendedRef.current) return;
        const d1Records = await inquiryService.pullFromD1();
        if (cancelled || suspendedRef.current) return;
        if (pushLocal) inquiryService.pushLocalToD1(d1Records);
        const nextRecords = mergeLocal
          ? inquiryService.mergeFromD1(d1Records)
          : inquiryService.mergeFieldsOnly(d1Records);
        if (!mergeLocal) inquiryService.save(nextRecords);
        useInquiryStore.setState({ records: nextRecords });
        lastFullSyncAtRef.current = Date.now();
        inquiryService.setLastFullSyncAt(mergeLocal, lastFullSyncAtRef.current);
        setLastSyncedAt(new Date());
        setSyncStatus(inquiryService.getSyncStatus());
        await refreshMetaMemory();
      } finally {
        syncingRef.current = false;
      }
    }

    /**
     * TASK-128：增量同步——meta 探测到变化、但还没到定时整表兜底的时间点时使用。
     * 只拉 syncWatermarkRef 之后变化过的记录，不做 pushLocalToD1（那是"拿完整 D1
     * 记录集对比本地哪些没同步"的逻辑，喂给它增量结果集会把每条本次没变化、没有
     * pending 操作的本地记录都误判成"D1 里找不到"，对着完全正常的记录刷警告；
     * 这个检测只在真正拿到全表的 fullSync 里才有意义）。mergeFromD1/mergeFieldsOnly
     * 都是以本地记录为底的 Map upsert，喂增量结果集是安全的。
     */
    async function incrementalSync() {
      if (syncingRef.current || suspendedRef.current) return;
      syncingRef.current = true;

      try {
        await inquiryService.flushPendingSyncs();
        if (cancelled || suspendedRef.current) return;
        const d1Records = await inquiryService.pullFromD1(syncWatermarkRef.current ?? undefined);
        if (cancelled || suspendedRef.current) return;
        const nextRecords = mergeLocal
          ? inquiryService.mergeFromD1(d1Records)
          : inquiryService.mergeFieldsOnly(d1Records);
        if (!mergeLocal) inquiryService.save(nextRecords);
        useInquiryStore.setState({ records: nextRecords });
        setLastSyncedAt(new Date());
        setSyncStatus(inquiryService.getSyncStatus());
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

      if (metaProbeFailed || forceFullSync) {
        if (!metaProbeFailed) lastMetaRef.current = metaKey;
        await fullSync();
      } else if (metaKey !== lastMetaRef.current) {
        lastMetaRef.current = metaKey;
        await incrementalSync();
      } else {
        setLastSyncedAt(new Date());
        setSyncStatus(inquiryService.getSyncStatus());
      }
    }

    async function initialSync() {
      if (hasFreshBaseline) {
        syncWatermarkRef.current = persistedWatermark;
        lastFullSyncAtRef.current = persistedLastFullSyncAt;
        await incrementalSync();
      } else {
        await fullSync();
      }
    }

    void initialSync();

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
  }, [enabled, mergeLocal, pushLocal]);

  return { lastSyncedAt, syncStatus };
}
