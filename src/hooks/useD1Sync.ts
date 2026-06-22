/**
 * 用户登录后执行一次 D1 → localStorage 同步。
 * 按用户 ID 同步，避免同一浏览器切换账号后复用上一个用户的本地历史。
 */
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { pullAllFromD1 } from '@/utils/d1Pull';
import { prepareD1DocumentSyncForUser } from '@/utils/d1Sync';

let syncedUserId: string | null = null;

export function useD1Sync(): void {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    const userId = session?.user?.id || session?.user?.username || session?.user?.name;
    if (!userId) return;
    if (syncedUserId === userId) return;
    syncedUserId = userId;

    const timer = setTimeout(() => {
      prepareD1DocumentSyncForUser(userId);
      pullAllFromD1().catch(() => {
        // 静默：D1 拉取失败不影响 localStorage 主流程。
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [session?.user?.id, session?.user?.name, session?.user?.username, status]);
}
