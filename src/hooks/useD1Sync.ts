/**
 * 用户登录后执行一次 D1 → localStorage 同步。
 * 使用模块级 flag 确保同一浏览器会话只同步一次。
 */
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { pullAllFromD1 } from '@/utils/d1Pull';

let syncDone = false;

export function useD1Sync(): void {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (syncDone) return;
    syncDone = true;

    const timer = setTimeout(() => {
      pullAllFromD1().catch(() => {
        // 静默：D1 拉取失败不影响 localStorage 主流程。
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);
}
