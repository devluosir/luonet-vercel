import { UserCard } from './UserCard';
import { EmptyState } from './EmptyState';
import { User } from '../types';

interface UserListProps {
  users: User[];
  filteredUsers: User[];
  loading: boolean;
  searchTerm: string;
  statusFilter: 'all' | 'active' | 'inactive';
  onCreateUser: () => void;
  onEditUser: (user: User) => void;
}

export function UserList({ 
  users, 
  filteredUsers, 
  loading, 
  searchTerm, 
  statusFilter, 
  onCreateUser, 
  onEditUser 
}: UserListProps) {
  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-3"></div>
        <div className="text-sm text-gray-600 dark:text-gray-400">加载用户数据中...</div>
      </div>
    );
  }

  if (filteredUsers.length === 0) {
    return (
      <EmptyState
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onCreateUser={onCreateUser}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
      {filteredUsers.map((user) => (
        <UserCard
          key={user.id}
          user={user}
          onEdit={onEditUser}
        />
      ))}
    </div>
  );
}
