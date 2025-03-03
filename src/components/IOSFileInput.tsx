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
  const [showTextInput, setShowTextInput] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      const input = fileInputRef.current;
      // 移除capture属性，只设置必要的属性
      input.removeAttribute('capture'); // 确保移除capture属性
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

    reader.readAsText(file);
  };

  // 处理JSON文本输入
  const handleTextSubmit = () => {
    try {
      // 验证JSON格式
      JSON.parse(jsonText);
      onFileSelect(jsonText);
    } catch (error) {
      setError('输入的内容不是有效的JSON格式');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-11/12 max-w-md">
        <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">导入JSON</h3>
        
        {error && (
          <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="mb-4">
          <div className="flex flex-col gap-4">
            {!showTextInput ? (
              <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  选择导入方式：
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
                  {isLoading ? '正在读取...' : '从文件导入'}
                </button>

                <button
                  onClick={() => setShowTextInput(true)}
                  className="w-full py-3 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-base font-medium"
                >
                  手动输入JSON
                </button>
                
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  支持的文件格式：JSON (.json)
                </p>
              </>
            ) : (
              <>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder="请输入或粘贴JSON内容..."
                  className="w-full h-40 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleTextSubmit}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    确认导入
                  </button>
                  <button
                    onClick={() => setShowTextInput(false)}
                    className="py-2 px-4 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg"
                  >
                    返回
                  </button>
                </div>
              </>
            )}
          </div>
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