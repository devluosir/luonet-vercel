import { useError } from '../state/mail.selectors';
import { useState, useEffect } from 'react';

export function ErrorDisplay() {
  const error = useError();
  const [showHealthCheck, setShowHealthCheck] = useState(false);
  const [healthStatus, setHealthStatus] = useState<any>(null);

  // 当出现错误时，自动检查健康状态
  useEffect(() => {
    if (error && (error.includes('API配置错误') || error.includes('DEEPSEEK_API_KEY'))) {
      checkHealthStatus();
    }
  }, [error]);

  const checkHealthStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealthStatus(data);
    } catch (err) {
      console.error('健康检查失败:', err);
    }
  };

  if (!error) return null;

  return (
    <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg text-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium">生成失败</p>
          <p className="mt-1">{error}</p>
          
          {/* 如果是配置错误，显示诊断信息 */}
          {(error.includes('API配置错误') || error.includes('DEEPSEEK_API_KEY')) && (
            <div className="mt-3">
              <button
                onClick={() => setShowHealthCheck(!showHealthCheck)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {showHealthCheck ? '隐藏' : '显示'}诊断信息
              </button>
              
              {showHealthCheck && (
                <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                  {healthStatus ? (
                    <div>
                      <p><strong>状态:</strong> {healthStatus.status}</p>
                      <p><strong>API密钥:</strong> {healthStatus.environment?.DEEPSEEK_API_KEY}</p>
                      {healthStatus.recommendations?.length > 0 && (
                        <div className="mt-2">
                          <p><strong>建议:</strong></p>
                          <ul className="list-disc list-inside">
                            {healthStatus.recommendations.map((rec: string, index: number) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p>正在检查系统状态...</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
