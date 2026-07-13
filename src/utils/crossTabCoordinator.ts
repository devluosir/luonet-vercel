'use client';

const DEFAULT_HEARTBEAT_MS = 5_000;
const DEFAULT_LEASE_TTL_MS = 15_000;
const DEFAULT_RETRY_MS = 5_000;

interface LeaseRecord {
  ownerId: string;
  expiresAt: number;
}

interface CoordinatorMessage<T> {
  ownerId: string;
  sentAt: number;
  payload: T;
}

interface CrossTabCoordinatorOptions<T> {
  scope: string;
  coordinationEnabled?: boolean;
  onLeadershipChange: (isLeader: boolean) => void;
  onMessage?: (payload: T) => void;
  heartbeatMs?: number;
  leaseTtlMs?: number;
  retryMs?: number;
}

function createOwnerId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function safeParseLease(raw: string | null): LeaseRecord | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<LeaseRecord>;
    if (typeof value.ownerId !== 'string' || typeof value.expiresAt !== 'number') return null;
    return { ownerId: value.ownerId, expiresAt: value.expiresAt };
  } catch {
    return null;
  }
}

/**
 * A small browser-only leader election helper.
 *
 * Web Locks is the primary path. Browsers without it fall back to a localStorage
 * lease with heartbeat/TTL, so a crashed tab cannot leave followers blocked.
 */
export class CrossTabCoordinator<T = unknown> {
  private readonly ownerId = createOwnerId();
  private readonly lockName: string;
  private readonly leaseKey: string;
  private readonly messageKey: string;
  private readonly channelName: string;
  private readonly coordinationEnabled: boolean;
  private readonly heartbeatMs: number;
  private readonly leaseTtlMs: number;
  private readonly retryMs: number;
  private readonly onLeadershipChange: (isLeader: boolean) => void;
  private readonly onMessage?: (payload: T) => void;

  private eligible = false;
  private disposed = false;
  private leader = false;
  private webLockPending = false;
  private usingLeaseFallback = false;
  private releaseWebLock: (() => void) | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private channel: BroadcastChannel | null = null;

  constructor(options: CrossTabCoordinatorOptions<T>) {
    const encodedScope = encodeURIComponent(options.scope);
    this.lockName = `mluonet-cross-tab:${encodedScope}`;
    this.leaseKey = `cross_tab_lease:${encodedScope}`;
    this.messageKey = `cross_tab_message:${encodedScope}`;
    this.channelName = `mluonet-cross-tab:${encodedScope}`;
    this.coordinationEnabled = options.coordinationEnabled !== false;
    this.heartbeatMs = options.heartbeatMs ?? DEFAULT_HEARTBEAT_MS;
    this.leaseTtlMs = options.leaseTtlMs ?? DEFAULT_LEASE_TTL_MS;
    this.retryMs = options.retryMs ?? DEFAULT_RETRY_MS;
    this.onLeadershipChange = options.onLeadershipChange;
    this.onMessage = options.onMessage;

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.handleStorage);
      if (typeof BroadcastChannel !== 'undefined') {
        this.channel = new BroadcastChannel(this.channelName);
        this.channel.addEventListener('message', this.handleChannelMessage);
      }
    }
  }

  isLeader(): boolean {
    return this.leader;
  }

  setEligible(eligible: boolean): void {
    if (this.disposed || this.eligible === eligible) return;
    this.eligible = eligible;

    if (!eligible) {
      this.stopRetry();
      this.releaseLeadership();
      return;
    }

    if (!this.coordinationEnabled) {
      this.setLeader(true);
      return;
    }

    this.tryElectLeader();
  }

  publish(payload: T): void {
    if (this.disposed || typeof window === 'undefined') return;
    const message: CoordinatorMessage<T> = {
      ownerId: this.ownerId,
      sentAt: Date.now(),
      payload,
    };

    if (this.channel) {
      this.channel.postMessage(message);
      return;
    }
    try {
      localStorage.setItem(this.messageKey, JSON.stringify(message));
    } catch {
      // Broadcast is best effort. The syncing tab has already persisted data.
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.eligible = false;
    this.stopRetry();
    this.releaseLeadership();
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorage);
    }
    if (this.channel) {
      this.channel.removeEventListener('message', this.handleChannelMessage);
      this.channel.close();
      this.channel = null;
    }
  }

  private setLeader(next: boolean): void {
    if (this.leader === next) return;
    this.leader = next;
    this.onLeadershipChange(next);
  }

  private tryElectLeader(): void {
    if (this.disposed || !this.eligible || this.leader || this.webLockPending) return;
    const lockManager = (navigator as unknown as { locks?: LockManager }).locks;
    if (lockManager?.request) {
      this.tryWebLock(lockManager);
    } else {
      this.usingLeaseFallback = true;
      this.tryLease();
    }
  }

  private tryWebLock(lockManager: LockManager): void {
    this.webLockPending = true;
    void lockManager.request(this.lockName, { ifAvailable: true }, async (lock) => {
      this.webLockPending = false;
      if (!lock || this.disposed || !this.eligible) {
        this.scheduleRetry();
        return;
      }

      this.setLeader(true);
      await new Promise<void>((resolve) => {
        this.releaseWebLock = resolve;
      });
      this.releaseWebLock = null;
      this.setLeader(false);
      if (this.eligible && !this.disposed) this.scheduleRetry(0);
    }).catch(() => {
      this.webLockPending = false;
      this.usingLeaseFallback = true;
      this.tryLease();
    });
  }

  private tryLease(): void {
    if (this.disposed || !this.eligible || this.leader || typeof window === 'undefined') return;
    const now = Date.now();
    try {
      const current = safeParseLease(localStorage.getItem(this.leaseKey));
      if (current && current.ownerId !== this.ownerId && current.expiresAt > now) {
        this.scheduleRetry();
        return;
      }

      const lease: LeaseRecord = { ownerId: this.ownerId, expiresAt: now + this.leaseTtlMs };
      localStorage.setItem(this.leaseKey, JSON.stringify(lease));
      const confirmed = safeParseLease(localStorage.getItem(this.leaseKey));
      if (confirmed?.ownerId !== this.ownerId) {
        this.scheduleRetry();
        return;
      }
    } catch {
      // Storage unavailable: preserve functionality by falling back to this tab.
      this.setLeader(true);
      return;
    }

    this.setLeader(true);
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.disposed || !this.eligible || !this.leader) {
        this.releaseLeadership();
        return;
      }

      try {
        const current = safeParseLease(localStorage.getItem(this.leaseKey));
        if (current && current.ownerId !== this.ownerId && current.expiresAt > Date.now()) {
          this.stopHeartbeat();
          this.setLeader(false);
          this.scheduleRetry();
          return;
        }

        const lease: LeaseRecord = {
          ownerId: this.ownerId,
          expiresAt: Date.now() + this.leaseTtlMs,
        };
        localStorage.setItem(this.leaseKey, JSON.stringify(lease));
      } catch {
        // Storage became unavailable. Keep this tab functional as the local leader.
      }
    }, this.heartbeatMs);
  }

  private releaseLeadership(): void {
    if (this.releaseWebLock) {
      this.releaseWebLock();
      this.releaseWebLock = null;
    }

    if (this.usingLeaseFallback && typeof window !== 'undefined') {
      this.stopHeartbeat();
      try {
        const current = safeParseLease(localStorage.getItem(this.leaseKey));
        if (current?.ownerId === this.ownerId) {
          localStorage.removeItem(this.leaseKey);
        }
      } catch {
        // Storage may be unavailable during browser shutdown/private-mode changes.
      }
    }
    this.setLeader(false);
  }

  private scheduleRetry(delay = this.retryMs): void {
    if (this.disposed || !this.eligible || this.retryTimer !== null) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.tryElectLeader();
    }, delay);
  }

  private stopRetry(): void {
    if (this.retryTimer !== null) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer !== null) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private handleStorage = (event: StorageEvent): void => {
    if (event.key === this.messageKey && event.newValue) {
      this.consumeMessage(event.newValue);
      return;
    }
    if (!this.usingLeaseFallback || event.key !== this.leaseKey || !this.eligible) return;

    const lease = safeParseLease(event.newValue);
    if (this.leader && lease && lease.ownerId !== this.ownerId && lease.expiresAt > Date.now()) {
      this.stopHeartbeat();
      this.setLeader(false);
      this.scheduleRetry();
    } else if (!this.leader && (!lease || lease.expiresAt <= Date.now())) {
      this.scheduleRetry(0);
    }
  };

  private handleChannelMessage = (event: MessageEvent<CoordinatorMessage<T>>): void => {
    const message = event.data;
    if (!message || message.ownerId === this.ownerId) return;
    this.onMessage?.(message.payload);
  };

  private consumeMessage(raw: string): void {
    try {
      const message = JSON.parse(raw) as CoordinatorMessage<T>;
      if (!message || message.ownerId === this.ownerId) return;
      this.onMessage?.(message.payload);
    } catch {
      // Ignore malformed cross-tab messages.
    }
  }
}
