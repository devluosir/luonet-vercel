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
      <div className="p-3 sm:p-4">
        {/* 用户头像、基本信息和编辑按钮 */}
        <div className="flex items-center mb-2 sm:mb-3">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm relative ${
            user.isAdmin 
              ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
              : 'bg-gradient-to-br from-gray-500 to-gray-600'
          }`}>
            {user.username.charAt(0).toUpperCase()}
            <div className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-2 h-2 sm:w-3 sm:h-3 rounded-full border-2 border-white dark:border-gray-900 ${
              user.status ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
          </div>
          <div className="ml-2 sm:ml-3 flex-1 min-w-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user.username}
              </h3>
              {user.isAdmin && (
                <span className="px-1 py-0.5 sm:px-1.5 sm:py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-full flex-shrink-0">
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
            className="ml-1 sm:ml-2 p-1 sm:p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 
                     hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
            title="编辑用户"
          >
            <Edit className="w-3 h-3 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* 注册时间和最后登录时间在同一行 */}
        <div className="flex flex-col gap-1 sm:gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-2 sm:mb-3">
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
      </div>
    </div>
  );
}
