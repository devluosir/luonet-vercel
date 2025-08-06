import { signIn } from 'next-auth/react';

/**
 * 刷新用户权限和会话
 * @param username 用户名
 * @returns Promise<boolean> 是否成功
 */
export async function refreshPermissionsAndSession(username: string): Promise<boolean> {
  try {
    console.log('[权限刷新] 开始刷新权限:', username);
    
    // 1. 获取最新权限
    const res = await fetch('/api/auth/update-session-permissions', { 
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ username })
    });
    
    if (!res.ok) {
      console.error('[权限刷新] API请求失败:', res.status, res.statusText);
      return false;
    }
    
    const data = await res.json();
    
    if (!data.success) {
      console.error('[权限刷新] 获取权限失败:', data.error);
      return false;
    }
    
    console.log('[权限刷新] 获取到新权限:', data.permissions);
    
    console.log('[权限刷新] 权限数据已更新，准备刷新页面');
    
    // 3. 直接刷新页面以应用新权限
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
    console.log('[权限刷新] 权限刷新成功');
    
    return true;
  } catch (error) {
    console.error('[权限刷新] 刷新权限时发生错误:', error);
    return false;
  }
}

/**
 * 刷新权限按钮组件使用的简化版本
 * @param username 用户名
 * @returns Promise<void>
 */
export async function handlePermissionRefresh(username: string): Promise<void> {
  const success = await refreshPermissionsAndSession(username);
  
  if (success) {
    // 可以显示成功消息
    console.log('[权限刷新] 权限刷新成功');
  } else {
    // 可以显示错误消息
    console.error('[权限刷新] 权限刷新失败');
    throw new Error('权限刷新失败');
  }
} 