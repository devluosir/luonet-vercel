import React, { useRef, useState } from 'react';

interface IOSFileInputProps {
  onFileSelect: (content: string) => void;
  onCancel: () => void;
  accept?: string;
  buttonText?: string;
}

/**
 * 专门为iOS设备设计的文件输入组件
 * 使用固定的可见按钮，解决iOS上文件选择器无法触发的问题
 */
const IOSFileInput: React.FC<IOSFileInputProps> = ({
  onFileSelect,
  onCancel,
  accept = '.json',
  buttonText = '选择文件'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      // 在iOS上，需要设置一些特殊属性
      const input = fileInputRef.current;
      input.setAttribute('capture', 'filesystem');
      input.setAttribute('multiple', 'false');
      // 确保accept属性正确设置
      input.accept = '.json,application/json';
      
      // 直接触发点击
      input.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      onCancel();
      return;
    }

    const file = files[0];
    console.log('Selected file:', file.name, file.type);

    // 检查文件名和MIME类型
    const isJSON = file.name.toLowerCase().endsWith('.json') || 
                  file.type === 'application/json' ||
                  file.type === 'text/json';

    if (!isJSON) {
      setError(`请选择JSON格式的文件`);
      return;
    }

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();
    
    reader.onload = (e) => {
      setIsLoading(false);
      if (e.target && typeof e.target.result === 'string') {
        try {
          // 尝试解析JSON以验证格式
          JSON.parse(e.target.result);
          onFileSelect(e.target.result);
        } catch (error) {
          setError('文件内容不是有效的JSON格式');
        }
      } else {
        setError('读取文件失败');
      }
    };

    reader.onerror = () => {
      setIsLoading(false);
      setError('读取文件时出错');
      console.error('FileReader error:', reader.error);
    };

    // 使用readAsText而不是其他方法
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-md">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">导入文件</h3>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            请选择要导入的JSON文件
          </p>
          
          <input
            type="file"
            ref={fileInputRef}
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />
          
          <button
            onClick={handleButtonClick}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-medium"
            disabled={isLoading}
          >
            {isLoading ? '正在读取...' : buttonText}
          </button>
          
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            支持的文件格式：JSON (.json)
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg"
            disabled={isLoading}
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
};

export default IOSFileInput; 