import { User, Edit, UserCheck, UserX, Shield, User as UserIcon, Clock } from 'lucide-react';
import { User as UserType } from '../types';

interface UserCardProps {
  user: UserType;
  onEdit: (user: UserType) => void;
}

export function UserCard({ user, onEdit }: UserCardProps) {
  return (
    <div className="bg-white dark:bg-[#1c1c1e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 
                     hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-4">
        {/* 用户头像、基本信息和编辑按钮 */}
        <div className="flex items-center mb-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm relative ${
            user.isAdmin 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            {user.username.charAt(0).toUpperCase()}
            <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
              user.status ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.username}
              </h3>
              {user.isAdmin && (
                <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex-shrink-0">
                  管理员
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user.email || '未设置邮箱'}
            </p>
          </div>
          {/* 编辑按钮放在右侧 */}
          <button
            onClick={() => onEdit(user)}
            className="ml-2 p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                     hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
            title="编辑用户"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>

        {/* 注册时间和最后登录时间在同一行 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 mb-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">注册:</span>
            <span className="text-xs text-gray-900 dark:text-white">
              {new Date(user.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">登录:</span>
            <span className="text-xs text-gray-900 dark:text-white">
              {user.lastLoginAt ? (
                <div className="flex items-center">
                  <Clock className="w-3 h-3 mr-1 text-gray-400" />
                  {new Date(user.lastLoginAt).toLocaleDateString()}
                </div>
              ) : (
                <span className="italic text-gray-400">未登录</span>
              )}
            </span>
          </div>
        </div>

        {/* 权限概览 */}
        <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">权限概览:</div>
          <div className="flex flex-wrap gap-1">
            {user.permissions?.filter(p => p.canAccess).slice(0, 3).map(perm => (
              <span key={perm.moduleId} className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-full">
                {perm.moduleId}
              </span>
            ))}
            {user.permissions?.filter(p => p.canAccess).length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400 rounded-full">
                +{user.permissions.filter(p => p.canAccess).length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
