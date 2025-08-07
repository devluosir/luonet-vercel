import { useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, LogOut, ArrowLeft } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Avatar } from '../Avatar';

interface AdminHeaderProps {
  username: string;
  email?: string | null;
  onLogout: () => void;
}

export function AdminHeader({ username, email, onLogout }: AdminHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  return (
    <header className="bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30">
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="ml-2">返回</span>
          </button>
        </div>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center space-x-2 focus:outline-none transition-colors"
          >
            <Avatar name={username} />
            <div className="text-left">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-200">
                {username}
              </div>
              {email && (
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
                  {email}
                </div>
              )}
            </div>
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform duration-200" 
                        style={{ transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-[#2c2c2e] ring-1 ring-black ring-opacity-5 dark:ring-white/10 z-50">
              <div className="py-2">
                {/* 用户信息 */}
                <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-3">
                    <Avatar name={username} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {username}
                      </div>
                      {email && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {email}
                        </div>
                      )}
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        管理员
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 菜单项 */}
                <div className="py-1">
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowDropdown(false);
                    }}
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/50 w-full transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    退出登录
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 