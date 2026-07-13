import { InquirySyncCoordinator, isInquirySyncCoordinatorEnabled } from '../inquirySyncCoordinator';

describe('InquirySyncCoordinator (TASK-162)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    delete process.env.NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED;
  });

  afterEach(() => {
    jest.useRealTimers();
    delete process.env.NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED;
  });

  it('supports both global and per-browser kill switches', () => {
    process.env.NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED = 'false';
    expect(isInquirySyncCoordinatorEnabled()).toBe(false);
    delete process.env.NEXT_PUBLIC_INQUIRY_SYNC_COORDINATOR_ENABLED;

    localStorage.setItem('inquiry_sync_coordinator_disabled', '1');
    expect(isInquirySyncCoordinatorEnabled()).toBe(false);
  });

  it('falls back to independent leaders when coordination is disabled', () => {
    localStorage.setItem('inquiry_sync_coordinator_disabled', '1');
    const firstLeadership = jest.fn();
    const secondLeadership = jest.fn();
    const first = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: firstLeadership,
      onSyncComplete: jest.fn(),
    });
    const second = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: secondLeadership,
      onSyncComplete: jest.fn(),
    });

    first.setEligible(true);
    second.setEligible(true);
    expect(first.isLeader()).toBe(true);
    expect(second.isLeader()).toBe(true);

    first.dispose();
    second.dispose();
  });

  it('keeps full and restricted groups isolated', () => {
    const full = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: jest.fn(),
      onSyncComplete: jest.fn(),
    });
    const restricted = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'restricted',
      onLeadershipChange: jest.fn(),
      onSyncComplete: jest.fn(),
    });

    full.setEligible(true);
    restricted.setEligible(true);
    expect(full.isLeader()).toBe(true);
    expect(restricted.isLeader()).toBe(true);

    full.dispose();
    restricted.dispose();
  });

  it('allows only one same-scope lease leader and lets a follower take over', () => {
    const first = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: jest.fn(),
      onSyncComplete: jest.fn(),
    });
    const second = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: jest.fn(),
      onSyncComplete: jest.fn(),
    });

    first.setEligible(true);
    second.setEligible(true);
    expect(first.isLeader()).toBe(true);
    expect(second.isLeader()).toBe(false);

    first.setEligible(false);
    jest.advanceTimersByTime(5_000);
    expect(second.isLeader()).toBe(true);

    first.setEligible(true);
    jest.advanceTimersByTime(5_000);
    expect(first.isLeader()).toBe(false);
    expect(second.isLeader()).toBe(true);
    first.dispose();
    second.dispose();
  });

  it('shares a 30-second probe throttle only while coordinated', () => {
    const coordinator = new InquirySyncCoordinator({
      userKey: 'alice',
      viewGroup: 'full',
      onLeadershipChange: jest.fn(),
      onSyncComplete: jest.fn(),
    });
    const now = Date.now();

    expect(coordinator.claimProbe(now, 30_000)).toBe(true);
    expect(coordinator.claimProbe(now + 29_999, 30_000)).toBe(false);
    expect(coordinator.claimProbe(now + 30_000, 30_000)).toBe(true);
    coordinator.dispose();
  });
});
