import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { DesktopSidebarHost } from '../DesktopSidebarHost';

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  usePathname: jest.fn(),
}));

jest.mock('@/hooks/useAppUser', () => ({
  useAppUser: () => ({
    user: { username: 'tester' },
    handleLogout: jest.fn(),
  }),
}));

jest.mock('@/contexts/SidebarCollapseContext', () => ({
  useSidebarCollapse: () => ({
    collapsed: false,
    toggleCollapse: jest.fn(),
  }),
}));

jest.mock('../AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="desktop-sidebar" />,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

function setSessionStatus(status: 'authenticated' | 'unauthenticated' | 'loading') {
  mockUseSession.mockReturnValue({ status } as ReturnType<typeof useSession>);
}

describe('DesktopSidebarHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('登录页即使已经认证也不渲染侧边栏', () => {
    setSessionStatus('authenticated');
    mockUsePathname.mockReturnValue('/');

    render(<DesktopSidebarHost />);

    expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
  });

  it('已认证用户进入业务路由时正常渲染侧边栏', () => {
    setSessionStatus('authenticated');
    mockUsePathname.mockReturnValue('/dashboard');

    render(<DesktopSidebarHost />);

    expect(screen.getByTestId('desktop-sidebar')).toBeInTheDocument();
  });

  it.each(['unauthenticated', 'loading'] as const)(
    '会话状态为 %s 时不渲染侧边栏',
    (status) => {
      setSessionStatus(status);
      mockUsePathname.mockReturnValue('/dashboard');

      render(<DesktopSidebarHost />);

      expect(screen.queryByTestId('desktop-sidebar')).not.toBeInTheDocument();
    },
  );
});
