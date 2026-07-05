/**
 * 功能开关管理组件
 * 仅在开发环境中显示，用于调试和功能控制
 */

import { useState, useEffect } from 'react';
import {
  getFeatureManager,
  isFeatureEnabled,
  setFeatureEnabled,
  FEATURE_FLAGS
} from '../config/featureFlags';
import { useToast } from '@/components/ui/Toast';

export function FeatureFlagManager() {
  const { showToast } = useToast();
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [flags, setFlags] = useState(FEATURE_FLAGS);

  // 确保组件在客户端渲染 - 必须在条件返回之前调用
  useEffect(() => {
    setMounted(true);
    // 加载当前功能开关状态
    setFlags(getFeatureManager().getAllFlags());
  }, []);

  // 获取统计信息 - 必须在条件返回之前调用
  const stats = getFeatureManager().getStats();

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  // 如果还没挂载，不渲染
  if (!mounted) {
    return null;
  }

  // 处理开关切换
  const handleToggleFlag = (flagName: keyof typeof FEATURE_FLAGS) => {
    const currentValue = isFeatureEnabled(flagName);
    const newValue = !currentValue;

    console.log(`切换功能开关: ${flagName}, 当前状态: ${currentValue}, 新状态: ${newValue}`);

    // 检查依赖关系
    const flag = flags[flagName];
    if (flag.dependencies && flag.dependencies.length > 0) {
      const missingDeps = flag.dependencies.filter(dep => !isFeatureEnabled(dep as keyof typeof FEATURE_FLAGS));
      if (missingDeps.length > 0 && newValue) {
        console.warn(`功能开关 ${flagName} 需要先启用依赖: ${missingDeps.join(', ')}`);
        showToast(`需要先启用依赖功能: ${missingDeps.join(', ')}`, 'warning');
        return;
      }
    }

    setFeatureEnabled(flagName, newValue);

    // 更新本地状态
    setFlags(prev => ({
      ...prev,
      [flagName]: {
        ...prev[flagName],
        enabled: newValue
      }
    }));

    // 强制重新获取最新状态
    setTimeout(() => {
      const updatedFlags = getFeatureManager().getAllFlags();
      setFlags(updatedFlags);
      console.log(`功能开关 ${flagName} 已${newValue ? '启用' : '禁用'}, 当前状态:`, updatedFlags[flagName]);
    }, 100);
  };

  // 全部关闭
  const handleDisableAll = () => {
    Object.keys(flags).forEach(flagName => {
      setFeatureEnabled(flagName as keyof typeof FEATURE_FLAGS, false);
    });

    setTimeout(() => {
      const updatedFlags = getFeatureManager().getAllFlags();
      setFlags(updatedFlags);
      console.log('所有功能开关已关闭');
    }, 100);
  };

  // 全部重置为默认值
  const handleResetAll = () => {
    getFeatureManager().resetToDefault();

    setTimeout(() => {
      const updatedFlags = getFeatureManager().getAllFlags();
      setFlags(updatedFlags);
      console.log('所有功能开关已重置为默认值');
    }, 100);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}>
      {/* 悬浮按钮 */}
      <button
        onClick={() => {
          console.log('Button clicked! Current isVisible:', isVisible);
          setIsVisible(!isVisible);
        }}
        style={{
          position: 'fixed',
          top: '100px',
          right: '24px',
          width: '48px',
          height: '48px',
          backgroundColor: '#ef4444',
          color: 'white',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)',
          cursor: 'pointer',
          pointerEvents: 'auto',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}
        title="功能开关管理 (开发环境)"
      >
        ⚙️
      </button>

      {/* 管理面板 */}
      {isVisible && (
        <div
          style={{
            position: 'fixed',
            top: '160px',
            right: '24px',
            width: '320px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
            border: '1px solid #e5e7eb',
            pointerEvents: 'auto',
            zIndex: 9999,
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb', backgroundColor: '#fef2f2' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                🔧 功能开关管理
              </h3>
              <button
                onClick={() => setIsVisible(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  color: '#6b7280'
                }}
              >
                ✕
              </button>
            </div>
          </div>

          <div style={{
            padding: '16px',
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#6b7280' }}>
              开发环境功能开关管理 - 用于测试新功能
            </p>

            {/* 统计信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              fontSize: '12px',
              flexShrink: 0
            }}>
              <div>
                <div style={{ color: '#6b7280' }}>总开关数</div>
                <div style={{ fontWeight: '600', color: '#111827' }}>{stats.total}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>已启用</div>
                <div style={{ fontWeight: '600', color: '#10b981' }}>{stats.enabled}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>已禁用</div>
                <div style={{ fontWeight: '600', color: '#ef4444' }}>{stats.disabled}</div>
              </div>
              <div>
                <div style={{ color: '#6b7280' }}>启用率</div>
                <div style={{ fontWeight: '600', color: '#3b82f6' }}>
                  {stats.total > 0 ? Math.round((stats.enabled / stats.total) * 100) : 0}%
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexShrink: 0
            }}>
              <button
                onClick={handleDisableAll}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                全部关闭
              </button>
              <button
                onClick={handleResetAll}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  fontWeight: '500'
                }}
              >
                重置默认
              </button>
            </div>

            {/* 功能开关列表 - 可滚动 */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              paddingRight: '4px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Object.entries(flags).map(([flagName, flag]) => {
                  const isEnabled = isFeatureEnabled(flagName as keyof typeof FEATURE_FLAGS);
                  const hasDependencies = flag.dependencies && flag.dependencies.length > 0;
                  const missingDeps = hasDependencies ?
                    flag.dependencies.filter((dep: string) => !isFeatureEnabled(dep as keyof typeof FEATURE_FLAGS)) : [];

                  return (
                    <div
                      key={flagName}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        opacity: missingDeps.length > 0 ? 0.6 : 1,
                        flexShrink: 0
                      }}
                      onClick={() => handleToggleFlag(flagName as keyof typeof FEATURE_FLAGS)}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {flag.name}
                          {hasDependencies && (
                            <span style={{ fontSize: '10px', color: '#6b7280', marginLeft: '8px' }}>
                              🔗
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{flag.description}</div>
                        {missingDeps.length > 0 && (
                          <div style={{ fontSize: '10px', color: '#ef4444', marginTop: '4px' }}>
                            需要先启用: {missingDeps.join(', ')}
                          </div>
                        )}
                      </div>
                      <div style={{
                        width: '40px',
                        height: '24px',
                        backgroundColor: isEnabled ? '#3b82f6' : '#d1d5db',
                        borderRadius: '12px',
                        position: 'relative',
                        transition: 'background-color 0.2s',
                        flexShrink: 0
                      }}>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: 'white',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '4px',
                          left: isEnabled ? '20px' : '4px',
                          transition: 'left 0.2s'
                        }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
