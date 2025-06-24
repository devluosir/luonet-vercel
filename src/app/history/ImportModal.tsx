import { useRef, useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, XCircle, X } from 'lucide-react';
import { handleFileImport } from '@/utils/historyImportExport';
import type { HistoryType } from '@/utils/historyImportExport';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: HistoryType;
  onImportSuccess?: () => void;
}

export default function ImportModal({
  isOpen,
  onClose,
  activeTab,
  onImportSuccess
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; content: string } | null>(null);

  if (!isOpen) return null;

  // 显示消息
  const showMessage = (type: 'success' | 'error' | 'info', content: string) => {
    setMessage({ type, content });
    if (type === 'success') {
      // 成功消息3秒后自动关闭
      setTimeout(() => {
        setMessage(null);
        onImportSuccess?.();
        onClose();
      }, 3000);
    }
  };

  // 清除消息
  const clearMessage = () => {
    setMessage(null);
  };

  // 导入文件
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    clearMessage();
    
    console.log('ImportModal: 开始处理文件导入');
    console.log('文件信息:', { 
      name: file.name, 
      size: file.size, 
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString()
    });
    
    // 检查文件大小（限制为10MB）
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showMessage('error', '文件过大，请选择小于10MB的文件');
      setIsLoading(false);
      return;
    }
    
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.json')) {
      showMessage('error', '请选择JSON格式的文件');
      setIsLoading(false);
      return;
    }
    
    try {
      // 先测试文件读取
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 文件读取成功');
            console.log('ImportModal: 内容长度:', result.length);
            console.log('ImportModal: 内容类型:', typeof result);
            console.log('ImportModal: 前200字符:', result.substring(0, 200));
            console.log('ImportModal: 后200字符:', result.substring(result.length - 200));
            // 检查是否有BOM标记
            if (result.charCodeAt(0) === 0xFEFF) {
              console.log('ImportModal: 检测到BOM标记，已自动移除');
            }
            // 检查是否包含特殊字符
            const specialChars = result.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g);
            if (specialChars) {
              console.log('ImportModal: 检测到特殊字符:', specialChars);
            }
          }
          resolve(result);
        };
        reader.onerror = (error) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('ImportModal: 文件读取失败:', error);
            console.error('ImportModal: 错误详情:', {
              error,
              readyState: reader.readyState,
              result: reader.result
            });
          }
          reject(new Error('文件读取失败'));
        };
        reader.onabort = () => {
          if (process.env.NODE_ENV === 'development') {
            console.error('ImportModal: 文件读取被中断');
          }
          reject(new Error('文件读取被中断'));
        };
        reader.onloadstart = () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 开始读取文件');
          }
        };
        reader.onloadend = () => {
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 文件读取完成');
          }
        };
        reader.onprogress = (e) => {
          if (process.env.NODE_ENV === 'development' && e.lengthComputable) {
            console.log('ImportModal: 读取进度:', Math.round((e.loaded / e.total) * 100) + '%');
          }
        };
        try {
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 尝试UTF-8编码读取');
          }
          reader.readAsText(file, 'UTF-8');
        } catch (encodingError) {
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: UTF-8读取失败，尝试默认编码');
          }
          reader.readAsText(file);
        }
      });
      // 测试JSON解析
      let parsedData;
      try {
        parsedData = JSON.parse(content);
        if (process.env.NODE_ENV === 'development') {
          console.log('ImportModal: JSON解析成功，数据类型:', typeof parsedData);
          if (Array.isArray(parsedData)) {
            console.log('ImportModal: 数据是数组，长度:', parsedData.length);
          } else if (typeof parsedData === 'object') {
            console.log('ImportModal: 数据是对象，键:', Object.keys(parsedData));
          }
        }
      } catch (parseError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('ImportModal: JSON解析失败:', parseError);
          console.error('ImportModal: 解析错误详情:', {
            message: parseError instanceof Error ? parseError.message : String(parseError),
            stack: parseError instanceof Error ? parseError.stack : undefined
          });
          console.log('ImportModal: 尝试修复JSON格式...');
        }
        let fixedContent = content;
        if (fixedContent.charCodeAt(0) === 0xFEFF) {
          fixedContent = fixedContent.slice(1);
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 移除BOM标记');
          }
        }
        fixedContent = fixedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        if (process.env.NODE_ENV === 'development') {
          console.log('ImportModal: 移除控制字符');
        }
        try {
          parsedData = JSON.parse(fixedContent);
          if (process.env.NODE_ENV === 'development') {
            console.log('ImportModal: 修复后JSON解析成功');
          }
        } catch (secondError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('ImportModal: 修复后仍然解析失败:', secondError);
          }
          showMessage('error', '文件格式错误：不是有效的JSON文件，请检查文件内容');
          setIsLoading(false);
          return;
        }
      }
      // 调用导入函数
      if (process.env.NODE_ENV === 'development') {
        console.log('ImportModal: 开始调用handleFileImport...');
      }
      const result = await handleFileImport(file, activeTab);
      if (process.env.NODE_ENV === 'development') {
        console.log('ImportModal: 导入结果:', result);
      }
      if (result.success) {
        const details = result.details || [];
        const message = `导入成功！\n${details.join('\n')}`;
        if (process.env.NODE_ENV === 'development') {
          console.log('ImportModal: 显示成功消息:', message);
        }
        showMessage('success', message);
      } else {
        const errorMessage = `导入失败：${result.error || '未知错误'}`;
        if (process.env.NODE_ENV === 'development') {
          console.error('ImportModal: 导入失败:', errorMessage);
        }
        showMessage('error', errorMessage);
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('ImportModal: 导入异常:', error);
        console.error('ImportModal: 异常详情:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
      }
      let errorMessage = '导入失败：文件读取错误，请检查文件格式';
      if (error instanceof Error && error.message.includes('文件读取失败')) {
        errorMessage = '导入失败：无法读取文件，请检查文件是否损坏或过大';
      } else if (error instanceof Error && error.message.includes('JSON')) {
        errorMessage = '导入失败：文件格式错误，请确保是有效的JSON文件';
      } else if (error instanceof Error && error.message.includes('超时')) {
        errorMessage = '导入失败：文件读取超时，请尝试较小的文件';
      }
      showMessage('error', errorMessage);
    } finally {
      setIsLoading(false);
    }
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute top-4 right-4 p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="关闭对话框"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-6">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Upload className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              导入历史记录
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              支持JSON格式的历史数据文件
            </p>
          </div>
        </div>
        
        {/* 消息显示 */}
        {message && (
          <div className={`mb-4 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : message.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
          }`}>
            <div className="flex items-start space-x-3">
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              ) : message.type === 'error' ? (
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div className={`text-sm font-medium ${
                  message.type === 'success' 
                    ? 'text-green-800 dark:text-green-200' 
                    : message.type === 'error'
                    ? 'text-red-800 dark:text-red-200'
                    : 'text-blue-800 dark:text-blue-200'
                }`}>
                  {message.type === 'success' ? '导入成功' : message.type === 'error' ? '导入失败' : '提示'}
                </div>
                <div className={`text-sm mt-1 whitespace-pre-line ${
                  message.type === 'success' 
                    ? 'text-green-700 dark:text-green-300' 
                    : message.type === 'error'
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {message.content}
                </div>
              </div>
              {message.type !== 'success' && (
                <button
                  onClick={clearMessage}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <div className="font-medium mb-1">导入说明：</div>
                <ul className="space-y-1 text-xs">
                  <li>• 支持综合数据文件（包含所有类型）</li>
                  <li>• 支持筛选数据文件（包含筛选结果）</li>
                  <li>• 支持单个类型文件（报价单、发票等）</li>
                  <li>• 自动识别数据类型并导入到对应选项卡</li>
                  <li>• 重复数据将被覆盖</li>
                  <li>• 导入后会自动刷新页面数据</li>
                </ul>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-green-600 dark:border-green-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
                )}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  {isLoading ? '正在导入...' : '选择JSON文件'}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {isLoading ? '请稍候，正在处理文件' : '点击选择要导入的历史数据文件'}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
              disabled={isLoading}
            />
          </button>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
} 