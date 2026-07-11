'use client';

import { useEffect, useState } from 'react';
import { X, RotateCcw, Save, Shield, Power, Trash2 } from 'lucide-react';
import { PERMISSION_MODULES, type ModuleCategory } from '@/constants/permissionModules';
import type { User as UserType, Permission } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import { PermissionToggle } from './PermissionToggle';
import { useConfirm } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';

interface UserDetailModalProps {
  user: UserType | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (userId: string, permissions: Permission[], isAdmin: boolean, isActive: boolean) => Promise<void>;
  onDelete: (user: UserType) => Promise<void>;
  currentUserId?: string;
}

/** 小型开关按钮 */
function Toggle({
  on, onChange, color = 'bg-blue-600', disabled = false, title,
}: { on: boolean; onChange: () => void; color?: string; disabled?: boolean; title?: string }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      title={title}
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

const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  document: '单据',
  registration: '登记表',
  management: '管理',
  tool: '工具',
};

const CATEGORY_ORDER: ModuleCategory[] = ['document', 'registration', 'management', 'tool'];

export function UserDetailModal({ user, isOpen, onClose, onSave, onDelete, currentUserId }: UserDetailModalProps) {
  const confirm = useConfirm();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const handleDelete = async () => {
    if (!user) return;

    const confirmed = await confirm({
      title: '删除用户',
      description: `确定要删除用户「${user.username}」吗？此操作无法撤销。`,
      confirmLabel: '删除',
      variant: 'danger',
    });
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await onDelete(user);
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败，请重试');
    } finally {
      setDeleting(false);
    }
  };

  const handleReset = () => {
    if (!user) return;
    resetPermissions();
    initializePermissions(user.permissions ?? [], user.isAdmin, user.status);
  };

  if (!isOpen || !user) return null;

  const initial = user.username.charAt(0).toUpperCase();
  const isCurrentUser = currentUserId === user.id;
  const isBusy = saving || deleting;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-[#1c1c1e]">

        {/* ── 用户信息头 ── */}
        <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-6 py-4 dark:border-gray-700">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white ${
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
            disabled={isBusy}
            className="shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── 可滚动内容区 ── */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">

          {/* 错误提示 */}
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-800/50 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </p>
          )}

          {/* ── 账户设置 ── */}
          <section>
            <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              账户设置
            </p>
            <div className="grid grid-cols-2 gap-3">
              {/* 管理员开关 */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-3 dark:border-gray-700">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Shield className="h-4 w-4 shrink-0 text-blue-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">管理员</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{isAdmin ? '是' : '否'}</p>
                  </div>
                </div>
                <Toggle
                  on={isAdmin}
                  onChange={toggleAdmin}
                  color="bg-blue-600"
                  disabled={isBusy || isCurrentUser}
                  title={isCurrentUser ? '不能修改自己的管理员身份，请让其他管理员操作' : undefined}
                />
              </div>

              {/* 账户状态开关 */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-3.5 py-3 dark:border-gray-700">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Power className="h-4 w-4 shrink-0 text-green-400" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">账户</p>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">{isActive ? '启用' : '禁用'}</p>
                  </div>
                </div>
                <Toggle on={isActive} onChange={toggleActive} color="bg-green-600" disabled={isBusy} />
              </div>
            </div>
          </section>

          {/* ── 模块权限 ── */}
          <section>
            <div className="mb-2.5 flex items-center justify-between">
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
            {isAdmin && (
              <p className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-300">
                管理员身份只控制后台管理入口，业务模块仍按以下开关授权
              </p>
            )}
            <div className="space-y-4">
              {CATEGORY_ORDER.map((category) => {
                const categoryModules = PERMISSION_MODULES.filter((module) => module.category === category);
                if (categoryModules.length === 0) return null;

                return (
                  <div
                    key={category}
                    className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 dark:border-gray-800 dark:bg-gray-900/30"
                  >
                    <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                      {CATEGORY_LABELS[category]}
                    </p>
                    {category === 'document' && (
                      <p className="mb-2 px-0.5 text-[10px] text-gray-400 dark:text-gray-500">
                        “单据历史”根据本组其它单据类权限自动开启/关闭，无需单独设置
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {categoryModules.map((module) => {
                        const perm = permissions.find((p) => p.moduleId === module.moduleId);
                        const parentEnabled = perm?.canAccess ?? false;
                        const hasAdvanced = !!module.advancedFeatures?.length;
                        const isAutoManagedHistory = module.moduleId === 'history';

                        return (
                          <div key={module.moduleId} className={hasAdvanced ? 'col-span-2 sm:col-span-3' : undefined}>
                            <PermissionToggle
                              moduleId={module.moduleId}
                              name={module.label}
                              icon={module.icon}
                              isEnabled={parentEnabled}
                              onToggle={togglePermission}
                              disabled={isBusy || isAutoManagedHistory}
                            />
                            {hasAdvanced && (
                              <div className="mt-1.5 grid grid-cols-1 gap-1.5 border-l-2 border-gray-200 pl-3 dark:border-gray-700 sm:grid-cols-2">
                                {module.advancedFeatures!.map((feature) => {
                                  const featurePerm = permissions.find((p) => p.moduleId === feature.moduleId);
                                  return (
                                    <PermissionToggle
                                      key={feature.moduleId}
                                      moduleId={feature.moduleId}
                                      name={feature.label}
                                      icon={feature.icon}
                                      isEnabled={featurePerm?.canAccess ?? false}
                                      onToggle={togglePermission}
                                      disabled={isBusy || !parentEnabled}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* ── 底部操作 ── */}
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-100 px-6 py-4 dark:border-gray-700">
          <button
            onClick={handleDelete}
            disabled={isBusy || isCurrentUser}
            title={isCurrentUser ? '不能删除当前登录用户' : '删除用户'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            {deleting ? (
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-red-300/40 border-t-red-600 dark:border-red-400/30 dark:border-t-red-400" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
            {deleting ? '删除中…' : '删除用户'}
          </button>
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              disabled={isBusy}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              取消
            </button>
            <Button
              onClick={handleSave}
              disabled={isBusy || !hasChanges}
              size="sm"
              className="gap-1.5"
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
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
