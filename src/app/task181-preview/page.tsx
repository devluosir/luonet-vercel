'use client';

import { UserDetailModal } from '@/features/admin/components/UserDetailModal';
import type { User } from '@/features/admin/types';

const previewUser: User = {
  id: 'task-181-preview',
  username: 'preview-user-with-a-long-name',
  email: 'preview@example.com',
  status: true,
  isAdmin: true,
  lastLoginAt: null,
  createdAt: '2026-07-17T00:00:00.000Z',
  permissions: [],
};

export default function Task181PreviewPage() {
  return (
    <UserDetailModal
      user={previewUser}
      isOpen
      onClose={() => undefined}
      onSave={async () => undefined}
      onDelete={async () => undefined}
      currentUserId="another-user"
    />
  );
}
