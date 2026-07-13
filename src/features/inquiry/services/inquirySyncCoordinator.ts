'use client';

import { CrossTabCoordinator } from '@/utils/crossTabCoordinator';

const DISABLED_STORAGE_KEY = 'inquiry_sync_coordinator_disabled';
const LAST_PROBE_PREFIX = 'inquiry_sync_last_probe';

export type InquirySyncViewGroup = 'full' | 'restricted';

export interface InquirySyncBroadcast {
  type: 'sync-complete';
  metaKey: string | null;
  watermark: string | null;
  syncedAt: number;
}

interface CreateInquirySyncCoordinatorOptions {
  userKey: string;
  viewGroup: InquirySyncViewGroup;
  onLeadershipChange: (isLeader: boolean) => void;
  onSyncComplete: (message: InquirySyncBroadcast) => void;
}

export function isInquirySyncCoordinatorEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED === 'false') return false;
  if (typeof window === 'undefined') return true;
  try {
    return localStorage.getItem(DISABLED_STORAGE_KEY) !== '1';
  } catch {
    return false;
  }
}

function normalizeScopePart(value: string): string {
  return value.trim().toLowerCase() || 'unknown';
}

export class InquirySyncCoordinator {
  private readonly coordinated: boolean;
  private readonly lastProbeKey: string;
  private readonly coordinator: CrossTabCoordinator<InquirySyncBroadcast>;

  constructor(options: CreateInquirySyncCoordinatorOptions) {
    const scope = `${normalizeScopePart(options.userKey)}:${options.viewGroup}`;
    this.coordinated = isInquirySyncCoordinatorEnabled();
    this.lastProbeKey = `${LAST_PROBE_PREFIX}:${scope}`;
    this.coordinator = new CrossTabCoordinator<InquirySyncBroadcast>({
      scope: `inquiry-sync:${scope}`,
      coordinationEnabled: this.coordinated,
      onLeadershipChange: options.onLeadershipChange,
      onMessage: options.onSyncComplete,
    });
  }

  isLeader(): boolean {
    return this.coordinator.isLeader();
  }

  setEligible(eligible: boolean): void {
    this.coordinator.setEligible(eligible);
  }

  claimProbe(now: number, minimumIntervalMs: number): boolean {
    if (!this.coordinated) return true;
    try {
      const previous = Number(localStorage.getItem(this.lastProbeKey) || 0);
      if (previous > 0 && now - previous < minimumIntervalMs) return false;
      localStorage.setItem(this.lastProbeKey, String(now));
      return true;
    } catch {
      return true;
    }
  }

  getRemainingProbeThrottle(now: number, minimumIntervalMs: number): number {
    if (!this.coordinated) return 0;
    try {
      const previous = Number(localStorage.getItem(this.lastProbeKey) || 0);
      return Math.max(0, minimumIntervalMs - (now - previous));
    } catch {
      return 0;
    }
  }

  publish(message: InquirySyncBroadcast): void {
    this.coordinator.publish(message);
  }

  dispose(): void {
    this.coordinator.dispose();
  }
}
