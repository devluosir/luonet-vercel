'use client';

import { useEffect } from 'react';
import { AppLayout } from '@/components/layout';
import { PermissionDenied } from '@/components/PermissionDenied';
import { FullScreenSpinner } from '@/components/layout/FullScreenSpinner';
import { useAppUser } from '@/hooks/useAppUser';
import { useModulePermissionGuard } from '@/hooks/useModulePermissionGuard';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';
import { MailTabs } from '../components/MailTabs';
import { ChatInterface } from '../components/ChatInterface';
import { ErrorDisplay } from '../components/ErrorDisplay';
import { useActiveTab, useSetActiveTab } from '../state/mail.selectors';
import { useMailForm } from '../hooks/useMailForm';
import { useMailStore } from '../state/mail.store';
import { useState } from 'react';
// 调试组件已移除

export default function MailPage() {
  const activeTab = useActiveTab();
  const setActiveTab = useSetActiveTab();
  const { user, handleLogout } = useAppUser();
  const { ready: permissionReady, allowed: hasModuleAccess } = useModulePermissionGuard('ai-email');
  const [showSettings, setShowSettings] = useState(false);
  const { field } = useMailForm();
  const { mailType, setMailType } = useMailStore();

  // 性能监控
  useEffect(() => {
    if (typeof window !== 'undefined') {
      performanceMonitor.startTimer('mail_page_load');
      
      // 延迟执行性能优化，避免阻塞页面渲染
      setTimeout(() => {
        optimizePerformance.optimizeFontLoading();
        optimizePerformance.cleanupUnusedResources();
      }, 100);
    }
  }, []);

  // 页面加载完成后的性能记录
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLoad = () => {
        performanceMonitor.endTimer('mail_page_load');
        const metrics = performanceMonitor.getPageLoadMetrics();
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 邮件助手页面加载性能:', metrics);
        }
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  // 页面级权限守卫
  if (!permissionReady) {
    return <FullScreenSpinner />;
  }
  if (!hasModuleAccess) {
    return <PermissionDenied message="您没有 AI 邮件助手的访问权限" />;
  }

  return (
    <AppLayout
      breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: 'AI邮件助手' }]}
      user={user}
      onLogout={handleLogout}
    >
      <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="w-full max-w-4xl mx-auto relative">
          <MailTabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab} 
            showSettings={showSettings}
            onToggleSettings={() => setShowSettings(!showSettings)}
            field={field}
            mailType={mailType}
            setMailType={setMailType}
          />
          
          <ChatInterface showSettings={showSettings} onToggleSettings={() => setShowSettings(!showSettings)} />
        </div>
        <ErrorDisplay />
      </div>

      {/* 主题调试器 - 仅在开发环境显示 */}
      {/* 调试组件已移除 */}
    </AppLayout>
  );
}
