import { act, renderHook } from '@testing-library/react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useLogoutTransitionStore } from '@/hooks/useLogoutTransition';
import { LOGOUT_TIMEOUT_MS, useAppUser } from '@/hooks/useAppUser';

jest.mock('next-auth/react', () => ({
  signOut: jest.fn(),
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/utils/d1Sync', () => ({
  clearD1DocumentLocalState: jest.fn(),
}));

const showToast = jest.fn();
jest.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ showToast }),
}));

const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockedUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockedUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const push = jest.fn();

describe('useAppUser logout safeguards', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(window, 'setTimeout');
    jest.spyOn(window, 'clearTimeout');
    jest.clearAllMocks();
    localStorage.clear();
    useLogoutTransitionStore.getState().setLoggingOut(false);
    mockedUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: jest.fn(),
    });
    mockedUseRouter.mockReturnValue({ push } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    useLogoutTransitionStore.getState().setLoggingOut(false);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('ignores duplicate logout calls while the first request is pending', async () => {
    let resolveSignOut: ((value: { url: string }) => void) | undefined;
    mockedSignOut.mockReturnValue(new Promise((resolve) => {
      resolveSignOut = resolve;
    }));
    const { result } = renderHook(() => useAppUser());
    let firstLogout: Promise<void> | undefined;

    await act(async () => {
      firstLogout = result.current.handleLogout();
      await Promise.resolve();
    });
    await act(async () => {
      await result.current.handleLogout();
    });

    expect(mockedSignOut).toHaveBeenCalledTimes(1);
    expect(jest.getTimerCount()).toBe(1);

    await act(async () => {
      resolveSignOut?.({ url: '/' });
      await firstLogout;
    });

    expect(push).toHaveBeenCalledWith('/');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('schedules an eight-second hard redirect fallback and cancels it on success', async () => {
    mockedSignOut.mockResolvedValue({ url: '/' });
    const { result } = renderHook(() => useAppUser());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(window.setTimeout).toHaveBeenCalledWith(expect.any(Function), LOGOUT_TIMEOUT_MS);
    expect(window.clearTimeout).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/');
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cancels the fallback and restores the page when sign out fails', async () => {
    mockedSignOut.mockRejectedValue(new Error('network failed'));
    const { result } = renderHook(() => useAppUser());

    await act(async () => {
      await result.current.handleLogout();
    });

    expect(window.clearTimeout).toHaveBeenCalled();
    expect(useLogoutTransitionStore.getState().isLoggingOut).toBe(false);
    expect(showToast).toHaveBeenCalledWith('network failed', 'error');
    expect(push).not.toHaveBeenCalled();
    expect(jest.getTimerCount()).toBe(0);
  });
});
