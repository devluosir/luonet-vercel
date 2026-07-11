import { act, renderHook, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePermissionRefresh } from '@/hooks/usePermissionRefresh';
import { usePermissionChangeWatcher } from '../usePermissionChangeWatcher';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('@/hooks/usePermissionRefresh', () => ({
  usePermissionRefresh: jest.fn(),
}));

const showToast = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast }),
}));

const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockedUsePermissionRefresh = usePermissionRefresh as jest.MockedFunction<
  typeof usePermissionRefresh
>;
const refresh = jest.fn<Promise<void>, [string]>();
const fetchMock = jest.fn();

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

function mockMeta(updatedAt: string) {
  fetchMock.mockResolvedValue({
    ok: true,
    json: async () => ({ updatedAt }),
  });
}

describe('usePermissionChangeWatcher', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    refresh.mockResolvedValue(undefined);
    global.fetch = fetchMock;
    mockedUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          username: 'alice',
          isAdmin: false,
          permissions: [],
        },
        expires: '2099-01-01T00:00:00.000Z',
      },
      status: 'authenticated',
      update: jest.fn(),
    });
    mockedUsePermissionRefresh.mockReturnValue({
      refresh,
      isRefreshing: false,
      refreshError: null,
      refreshSuccess: false,
    });
    setVisibility('visible');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stores the first updatedAt baseline without refreshing', async () => {
    mockMeta('2026-07-11T08:00:00.000Z');

    const hook = renderHook(() => usePermissionChangeWatcher());

    await waitFor(() => {
      expect(localStorage.getItem('permissions_last_known_updated_at'))
        .toBe('2026-07-11T08:00:00.000Z');
    });
    expect(refresh).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('refreshes the signed-in user when updatedAt changes', async () => {
    localStorage.setItem('permissions_last_known_username', 'alice');
    localStorage.setItem('permissions_last_known_updated_at', '2026-07-11T08:00:00.000Z');
    mockMeta('2026-07-11T09:00:00.000Z');

    const hook = renderHook(() => usePermissionChangeWatcher());

    await waitFor(() => expect(refresh).toHaveBeenCalledWith('alice'));
    expect(localStorage.getItem('permissions_last_known_updated_at'))
      .toBe('2026-07-11T09:00:00.000Z');
    hook.unmount();
  });

  it('establishes a new baseline instead of refreshing after an account switch', async () => {
    localStorage.setItem('permissions_last_known_username', 'previous-user');
    localStorage.setItem('permissions_last_known_updated_at', '2026-07-11T08:00:00.000Z');
    mockMeta('2026-07-11T09:00:00.000Z');

    const hook = renderHook(() => usePermissionChangeWatcher());

    await waitFor(() => {
      expect(localStorage.getItem('permissions_last_known_username')).toBe('alice');
      expect(localStorage.getItem('permissions_last_known_updated_at'))
        .toBe('2026-07-11T09:00:00.000Z');
    });
    expect(refresh).not.toHaveBeenCalled();
    hook.unmount();
  });

  it('does not poll while hidden and checks immediately when visible again', async () => {
    jest.useFakeTimers();
    mockMeta('2026-07-11T10:00:00.000Z');
    setVisibility('hidden');

    const hook = renderHook(() => usePermissionChangeWatcher());
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(180_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();

    act(() => setVisibility('visible'));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    hook.unmount();
  });

  it('polls every 90 seconds while visible', async () => {
    jest.useFakeTimers();
    mockMeta('2026-07-11T11:00:00.000Z');

    const hook = renderHook(() => usePermissionChangeWatcher());
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      jest.advanceTimersByTime(89_999);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    hook.unmount();
  });
});
