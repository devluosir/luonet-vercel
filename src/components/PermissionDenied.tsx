'use client';

import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface PermissionDeniedProps {
  message: string;
}

export function PermissionDenied({ message }: PermissionDeniedProps) {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
      <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
        <ShieldAlert className="mx-auto mb-4 h-14 w-14 text-red-600 dark:text-red-400" />
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <Button type="button" onClick={() => router.push('/dashboard')} size="lg">
          返回首页
        </Button>
      </div>
    </div>
  );
}
