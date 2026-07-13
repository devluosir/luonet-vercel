import { act, renderHook, waitFor } from '@testing-library/react';
import { inquiryService } from '../../services/inquiry.service';
import { useInquirySync } from '../useInquirySync';

jest.mock('../../state/inquiry.store', () => ({
  useInquiryStore: { setState: jest.fn() },
}));

const FULL_WATERMARK_KEY = 'inquiry_sync_watermark_full';
const RESTRICTED_WATERMARK_KEY = 'inquiry_sync_watermark_restricted';
const FULL_SYNC_AT_KEY = 'inquiry_last_full_sync_at_full';
const RESTRICTED_SYNC_AT_KEY = 'inquiry_last_full_sync_at_restricted';

function mockInquirySyncService(watermark: string) {
  jest.spyOn(inquiryService, 'getSyncStatus').mockReturnValue({
    pendingCount: 0,
    lastError: null,
    lastFailedAt: null,
  });
  jest.spyOn(inquiryService, 'subscribeSyncStatus').mockReturnValue(() => undefined);
  jest.spyOn(inquiryService, 'flushPendingSyncs').mockResolvedValue(undefined);
  const pullFromD1 = jest.spyOn(inquiryService, 'pullFromD1').mockResolvedValue([]);
  jest.spyOn(inquiryService, 'getMeta').mockResolvedValue({ count: 0, maxUpdatedAt: watermark });
  jest.spyOn(inquiryService, 'pushLocalToD1').mockImplementation(() => undefined);
  jest.spyOn(inquiryService, 'mergeFromD1').mockReturnValue([]);
  jest.spyOn(inquiryService, 'mergeFieldsOnly').mockReturnValue([]);
  jest.spyOn(inquiryService, 'save').mockImplementation(() => undefined);
  return pullFromD1;
}

describe('useInquirySync persisted baselines (TASK-139)', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('inquiry_sync_coordinator_disabled', '1');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    { mergeLocal: true, label: 'full view' },
    { mergeLocal: false, label: 'restricted view' },
  ])('shares a fresh watermark within the $label group', async ({ mergeLocal }) => {
    const watermark = mergeLocal
      ? '2026-07-11T01:00:00.000Z'
      : '2026-07-11T02:00:00.000Z';
    const pullFromD1 = mockInquirySyncService(watermark);

    const first = renderHook(() => useInquirySync({
      enabled: true,
      pushLocal: mergeLocal,
      mergeLocal,
    }));
    await waitFor(() => expect(pullFromD1).toHaveBeenCalledWith());
    await waitFor(() => expect(inquiryService.getSyncWatermark(mergeLocal)).toBe(watermark));
    first.unmount();

    pullFromD1.mockClear();
    const second = renderHook(() => useInquirySync({
      enabled: true,
      pushLocal: mergeLocal,
      mergeLocal,
    }));
    await waitFor(() => expect(pullFromD1).toHaveBeenCalledWith(watermark));
    second.unmount();
  });

  test.each([
    { sourceFullView: false, targetFullView: true, label: 'restricted to full' },
    { sourceFullView: true, targetFullView: false, label: 'full to restricted' },
  ])('does not share a watermark across groups: $label', async ({
    sourceFullView,
    targetFullView,
  }) => {
    const watermark = sourceFullView
      ? '2026-07-11T03:00:00.000Z'
      : '2026-07-11T04:00:00.000Z';
    const pullFromD1 = mockInquirySyncService(watermark);

    const source = renderHook(() => useInquirySync({
      enabled: true,
      pushLocal: sourceFullView,
      mergeLocal: sourceFullView,
    }));
    await waitFor(() => expect(inquiryService.getSyncWatermark(sourceFullView)).toBe(watermark));
    source.unmount();

    pullFromD1.mockClear();
    expect(inquiryService.getSyncWatermark(targetFullView)).toBeNull();
    const target = renderHook(() => useInquirySync({
      enabled: true,
      pushLocal: targetFullView,
      mergeLocal: targetFullView,
    }));
    await waitFor(() => expect(pullFromD1).toHaveBeenCalledWith());
    target.unmount();
  });

  test('falls back to a full sync when the persisted baseline is older than six hours', async () => {
    const watermark = '2026-07-11T05:00:00.000Z';
    localStorage.setItem(FULL_WATERMARK_KEY, watermark);
    localStorage.setItem(FULL_SYNC_AT_KEY, String(Date.now() - 6 * 60 * 60_000 - 1));
    const pullFromD1 = mockInquirySyncService(watermark);

    const hook = renderHook(() => useInquirySync({ enabled: true }));

    await waitFor(() => expect(pullFromD1).toHaveBeenCalledWith());
    hook.unmount();
  });

  test('keeps the persisted keys for the two groups distinct', () => {
    inquiryService.setSyncWatermark(true, 'full');
    inquiryService.setSyncWatermark(false, 'restricted');
    inquiryService.setLastFullSyncAt(true, 100);
    inquiryService.setLastFullSyncAt(false, 200);

    expect(localStorage.getItem(FULL_WATERMARK_KEY)).toBe('full');
    expect(localStorage.getItem(RESTRICTED_WATERMARK_KEY)).toBe('restricted');
    expect(localStorage.getItem(FULL_SYNC_AT_KEY)).toBe('100');
    expect(localStorage.getItem(RESTRICTED_SYNC_AT_KEY)).toBe('200');
  });
});

describe('useInquirySync adaptive scheduling (TASK-162)', () => {
  const watermark = '2026-07-13T08:00:00.000Z';

  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    localStorage.setItem('inquiry_sync_coordinator_disabled', '1');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function prepareFreshBaseline(
    meta: { count: number; maxUpdatedAt: string | null } = { count: 0, maxUpdatedAt: watermark }
  ) {
    localStorage.setItem(FULL_WATERMARK_KEY, watermark);
    localStorage.setItem(FULL_SYNC_AT_KEY, String(Date.now()));
    jest.spyOn(inquiryService, 'getSyncStatus').mockReturnValue({
      pendingCount: 0,
      lastError: null,
      lastFailedAt: null,
    });
    jest.spyOn(inquiryService, 'subscribeSyncStatus').mockReturnValue(() => undefined);
    jest.spyOn(inquiryService, 'flushPendingSyncs').mockResolvedValue(undefined);
    jest.spyOn(inquiryService, 'pullFromD1').mockResolvedValue([]);
    jest.spyOn(inquiryService, 'getMeta').mockResolvedValue(meta);
    jest.spyOn(inquiryService, 'pushLocalToD1').mockImplementation(() => undefined);
    jest.spyOn(inquiryService, 'mergeFromD1').mockReturnValue([]);
    jest.spyOn(inquiryService, 'mergeFieldsOnly').mockReturnValue([]);
    jest.spyOn(inquiryService, 'save').mockImplementation(() => undefined);
    jest.spyOn(inquiryService, 'getAll').mockReturnValue([]);
  }

  async function flushTimers(ms = 0) {
    await act(async () => {
      await jest.advanceTimersByTimeAsync(ms);
    });
  }

  it('polls every two minutes while active', async () => {
    prepareFreshBaseline();
    const getMeta = jest.spyOn(inquiryService, 'getMeta');
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers();
    expect(getMeta).toHaveBeenCalledTimes(1);

    await flushTimers(119_999);
    expect(getMeta).toHaveBeenCalledTimes(1);
    await flushTimers(1);
    expect(getMeta).toHaveBeenCalledTimes(2);
    hook.unmount();
  });

  it('switches to a ten-minute interval after five minutes without activity', async () => {
    prepareFreshBaseline();
    const getMeta = jest.spyOn(inquiryService, 'getMeta');
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers();
    await flushTimers(6 * 60_000);
    expect(getMeta).toHaveBeenCalledTimes(4); // mount, 2m, 4m, 6m

    await flushTimers(9 * 60_000 + 59_999);
    expect(getMeta).toHaveBeenCalledTimes(4);
    await flushTimers(1);
    expect(getMeta).toHaveBeenCalledTimes(5);
    hook.unmount();
  });

  it('waits for a visible and focused page before the first sync', async () => {
    prepareFreshBaseline();
    const getMeta = jest.spyOn(inquiryService, 'getMeta');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => false });
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers(30 * 60_000);
    expect(getMeta).not.toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    await flushTimers();
    expect(getMeta).not.toHaveBeenCalled();

    Object.defineProperty(document, 'hasFocus', { configurable: true, value: () => true });
    window.dispatchEvent(new Event('focus'));
    await flushTimers();
    expect(getMeta).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('backs off meta failures without falling into repeated full syncs', async () => {
    prepareFreshBaseline({ count: -1, maxUpdatedAt: null });
    const getMeta = jest.spyOn(inquiryService, 'getMeta');
    const pullFromD1 = jest.spyOn(inquiryService, 'pullFromD1');
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers();
    expect(getMeta).toHaveBeenCalledTimes(1);
    expect(pullFromD1).not.toHaveBeenCalled();

    await flushTimers(60_000);
    expect(getMeta).toHaveBeenCalledTimes(2);
    await flushTimers(2 * 60_000);
    expect(getMeta).toHaveBeenCalledTimes(3);
    expect(pullFromD1).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('does not repeat a full sync when its follow-up meta request fails', async () => {
    prepareFreshBaseline({ count: -1, maxUpdatedAt: null });
    localStorage.removeItem(FULL_WATERMARK_KEY);
    localStorage.removeItem(FULL_SYNC_AT_KEY);
    const pullFromD1 = jest.spyOn(inquiryService, 'pullFromD1');
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers();
    expect(pullFromD1).toHaveBeenCalledTimes(1);
    await flushTimers(60_000);
    expect(pullFromD1).toHaveBeenCalledTimes(1);
    hook.unmount();
  });

  it('ignores continuous pointer movement and wakes on the first discrete event after idle', async () => {
    prepareFreshBaseline();
    const getMeta = jest.spyOn(inquiryService, 'getMeta');
    const hook = renderHook(() => useInquirySync({ enabled: true, userKey: 'alice' }));

    await flushTimers();
    await flushTimers(7 * 60_000);
    const beforeMovement = getMeta.mock.calls.length;
    window.dispatchEvent(new Event('pointermove'));
    await flushTimers();
    expect(getMeta).toHaveBeenCalledTimes(beforeMovement);

    window.dispatchEvent(new Event('pointerdown'));
    await flushTimers();
    expect(getMeta).toHaveBeenCalledTimes(beforeMovement + 1);
    hook.unmount();
  });
});
