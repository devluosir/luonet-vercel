'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Save, Shield, Power } from 'lucide-react';
import type { User as UserType, Permission } from '../types';
import { usePermissions, MODULE_PERMISSIONS } from '../hooks/usePermissions';
import { PermissionToggle } from './PermissionToggle';

interface UserDetailModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: Permission[], isAdmin: boolean, isActive: boolean) => Promise<void>;
}

/** 小型开关按钮 */
function Toggle({
  on, onChange, color = 'bg-blue-600', disabled = false,
}: { on: boolean; onChange: () => void; color?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${
        on ? color : 'bg-gray-200 dark:bg-gray-700'
      }`}
    >
      <span className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform ${
        on ? 'translate-x-5' : 'translate-x-1'
      }`} />
    </button>
  );
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });
}

export function UserDetailModal({ user, isOpen, onClose, onSave }: UserDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    permissions, isAdmin, isActive,
    initializePermissions, togglePermission, toggleAdmin, toggleActive,
    hasChanges, resetPermissions,
  } = usePermissions();

  useEffect(() => {
    if (user && isOpen) {
      initializePermissions(user.permissions ?? [], user.isAdmin, user.status);
      setError(null);
    }
  }, [user, isOpen, initializePermissions]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(user.id, permissions, isAdmin, isActive);
      onClose();
    } catch {
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!user) return;
    resetPermissions();
    initializePermissions(user.permissions ?? [], user.isAdmin, user.status);
  };

  if (!isOpen || !user) return null;

  const initial = user.username.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] w-full max-w-sm flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1c1c1e]">

        {/* ── 用户信息头 ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-700">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white ${
            user.isAdmin ? 'bg-blue-500' : 'bg-gray-400 dark:bg-gray-500'
          }`}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{user.username}</p>
            <p className="truncate text-xs text-gray-400 dark:text-gray-500">
              {user.email || '未设置邮箱'} · 注册于 {fmtDate(user.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 可滚动内容区 ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* 错误提示 */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {/* ── 账户设置 ── */}
          <section>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              账户设置
            </p>
            <div className="grid grid-cols-2 gap-2">
              {/* 管理员开关 */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700">
                <div className="flex min-w-0 items-center gap-2">
                  <Shield className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">管理员</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{isAdmin ? '是' : '否'}</p>
                  </div>
                </div>
                <Toggle on={isAdmin} onChange={toggleAdmin} color="bg-blue-600" disabled={saving} />
              </div>

              {/* 账户状态开关 */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-700">
                <div className="flex min-w-0 items-center gap-2">
                  <Power className="h-3.5 w-3.5 shrink-0 text-green-400" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">账户</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{isActive ? '启用' : '禁用'}</p>
                  </div>
                </div>
                <Toggle on={isActive} onChange={toggleActive} color="bg-green-600" disabled={saving} />
              </div>
            </div>
          </section>

          {/* ── 模块权限 ── */}
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                模块权限
              </p>
              {hasChanges && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <RotateCcw className="h-3 w-3" />
                  重置
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {MODULE_PERMISSIONS.map((module) => {
                const perm = permissions.find((p) => p.moduleId === module.id);
                return (
                  <PermissionToggle
                    key={module.id}
                    moduleId={module.id}
                    name={module.name}
                    icon={module.icon}
                    isEnabled={perm?.canAccess ?? false}
                    onToggle={togglePermission}
                  />
                );
              })}
            </div>
          </section>
        </div>

        {/* ── 底部操作 ── */}
        <div className="flex shrink-0 justify-end gap-2 border-t border-gray-100 px-4 py-3 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                保存中…
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                保存
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
