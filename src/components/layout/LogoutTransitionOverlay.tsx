'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import { useLogoutTransitionStore } from '@/hooks/useLogoutTransition';
import { LOGO_CONFIG } from '@/lib/logo-config';

export function LogoutTransitionOverlay() {
  const isLoggingOut = useLogoutTransitionStore((state) => state.isLoggingOut);
  const setLoggingOut = useLogoutTransitionStore((state) => state.setLoggingOut);
  const pathname = usePathname();
  const { status } = useSession();

  useEffect(() => {
    if (isLoggingOut && pathname === '/' && status === 'unauthenticated') {
      setLoggingOut(false);
    }
  }, [isLoggingOut, pathname, status, setLoggingOut]);

  if (!isLoggingOut) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex min-h-screen flex-col items-center justify-center bg-[var(--bg-primary)]">
      <Image
        src={LOGO_CONFIG.web.logo}
        alt="LC APP"
        width={96}
        height={96}
        className="object-contain animate-pulse"
        priority
      />
    </div>
  );
}
