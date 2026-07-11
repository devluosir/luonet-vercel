import { renderHook, waitFor } from '@testing-library/react';
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

  test('falls back to a full sync when the persisted baseline is older than one hour', async () => {
    const watermark = '2026-07-11T05:00:00.000Z';
    localStorage.setItem(FULL_WATERMARK_KEY, watermark);
    localStorage.setItem(FULL_SYNC_AT_KEY, String(Date.now() - 60 * 60_000 - 1));
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
