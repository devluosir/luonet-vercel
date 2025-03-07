import React, { useRef, useState } from 'react';

interface IOSFileInputProps {
  onFileSelect: (content: string) => void;
  onCancel: () => void;
  _accept?: string;
  _buttonText?: string;
}

/**
 * 专门为iOS设备设计的文件输入组件
 * 使用固定的可见按钮，解决iOS上文件选择器无法触发的问题
 */
const IOSFileInput: React.FC<IOSFileInputProps> = ({
  onFileSelect,
  onCancel,
  _accept = '.json',
  _buttonText = '选择文件'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [jsonText, setJsonText] = useState('');

  const handleButtonClick = () => {
    if (fileInputRef.current) {
      const input = fileInputRef.current;
      // iOS Safari文件选择配置
      input.removeAttribute('capture');
      input.removeAttribute('multiple');
      input.setAttribute('webkitdirectory', '');
      input.setAttribute('directory', '');
      input.accept = '*/*'; // 允许所有文件，我们会在handleFileChange中过滤
      
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

    // 检查文件名（不再检查MIME类型，因为iOS可能返回不准确的MIME类型）
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError(`请选择.json格式的文件`);
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
          const content = e.target.result;
          // 处理可能的BOM
          const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
          JSON.parse(cleanContent);
          onFileSelect(cleanContent);
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

  // 处理从剪贴板粘贴
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setJsonText(text);
      setError(null);
    } catch (error) {
      setError('无法访问剪贴板，请手动粘贴');
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
                  手动输入/粘贴JSON
                </button>
                
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  支持的文件格式：JSON (.json)
                </p>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    请将JSON内容复制到其他应用（如备忘录），然后点击下方按钮从剪贴板导入：
                  </p>
                  <button
                    onClick={handlePaste}
                    className="w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg"
                  >
                    从剪贴板导入
                  </button>
                </div>
                
                <div className="relative">
                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder="或者在此处直接输入JSON内容..."
                    className="w-full h-40 p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
                  />
                  {jsonText && (
                    <button
                      onClick={() => setJsonText('')}
                      className="absolute right-2 top-2 p-1 text-gray-500 hover:text-gray-700"
                    >
                      清除
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleTextSubmit}
                    className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    disabled={!jsonText.trim()}
                  >
                    确认导入
                  </button>
                  <button
                    onClick={() => {
                      setShowTextInput(false);
                      setJsonText('');
                      setError(null);
                    }}
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