import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Save, Download, Eye, Settings } from 'lucide-react';
import type { DocumentAction, DocumentPermission } from '../types';

interface DocumentLayoutProps {
  title: string;
  backPath: string;
  children: React.ReactNode;
  permissions: DocumentPermission;
  actions?: {
    onSave?: () => void;
    onExport?: () => void;
    onPreview?: () => void;
    onSettings?: () => void;
  };
  loading?: boolean;
  saving?: boolean;
  generating?: boolean;
}

export function DocumentLayout({
  title,
  backPath,
  children,
  permissions,
  actions = {},
  loading = false,
  saving = false,
  generating = false,
}: DocumentLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 左侧：返回按钮和标题 */}
            <div className="flex items-center space-x-4">
              <Link
                href={backPath}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                返回
              </Link>
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h1>
            </div>

            {/* 右侧：操作按钮 */}
            <div className="flex items-center space-x-2">
              {permissions.canEdit && actions.onSave && (
                <button
                  onClick={actions.onSave}
                  disabled={loading || saving}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? '保存中...' : '保存'}
                </button>
              )}

              {permissions.canPreview && actions.onPreview && (
                <button
                  onClick={actions.onPreview}
                  disabled={loading || generating}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {generating ? '生成中...' : '预览'}
                </button>
              )}

              {permissions.canExport && actions.onExport && (
                <button
                  onClick={actions.onExport}
                  disabled={loading || generating}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {generating ? '导出中...' : '导出'}
                </button>
              )}

              {actions.onSettings && (
                <button
                  onClick={actions.onSettings}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
