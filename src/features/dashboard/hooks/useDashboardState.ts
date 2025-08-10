import { useState, useEffect } from 'react';

export const useDashboardState = () => {
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // 监听权限变化事件
  useEffect(() => {
    const handlePermissionChange = (e: CustomEvent) => {
      if (showSuccessMessage) return;

      setSuccessMessage(e.detail?.message || '权限信息已更新');
      setShowSuccessMessage(true);
    };

    window.addEventListener('permissionChanged', handlePermissionChange as EventListener);

    return () => {
      window.removeEventListener('permissionChanged', handlePermissionChange as EventListener);
    };
  }, [showSuccessMessage]);

  // 监听权限更新事件
  useEffect(() => {
    const handlePermissionsUpdated = async (event: CustomEvent) => {
      console.log('收到权限更新事件:', event.detail);
      
      if (event.detail?.permissions) {
        try {
          setSuccessMessage('权限已更新，正在刷新页面...');
          
          setTimeout(() => {
            window.location.reload();
          }, 1000);
          
        } catch (updateError) {
          console.error('权限更新处理失败:', updateError);
          setSuccessMessage('权限更新失败，请重试');
          setTimeout(() => setShowSuccessMessage(false), 3000);
        }
      }
    };

    window.addEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    
    return () => {
      window.removeEventListener('permissionsUpdated', handlePermissionsUpdated as unknown as EventListener);
    };
  }, []);

  return {
    showSuccessMessage,
    setShowSuccessMessage,
    successMessage,
    setSuccessMessage
  };
};
