import { useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
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

  if (!isOpen) return null;

  // 导入文件
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
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
      alert('文件过大，请选择小于10MB的文件');
      return;
    }
    
    // 检查文件类型
    if (!file.name.toLowerCase().endsWith('.json')) {
      alert('请选择JSON格式的文件');
      return;
    }
    
    try {
      // 先测试文件读取
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
          const result = e.target?.result as string;
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
          
          resolve(result);
        };
        
        reader.onerror = (error) => {
          console.error('ImportModal: 文件读取失败:', error);
          console.error('ImportModal: 错误详情:', {
            error: error,
            readyState: reader.readyState,
            result: reader.result
          });
          reject(new Error('文件读取失败'));
        };
        
        reader.onabort = () => {
          console.error('ImportModal: 文件读取被中断');
          reject(new Error('文件读取被中断'));
        };
        
        reader.onloadstart = () => {
          console.log('ImportModal: 开始读取文件');
        };
        
        reader.onloadend = () => {
          console.log('ImportModal: 文件读取完成');
        };
        
        reader.onprogress = (e) => {
          if (e.lengthComputable) {
            console.log('ImportModal: 读取进度:', Math.round((e.loaded / e.total) * 100) + '%');
          }
        };
        
        // 尝试不同的编码方式
        try {
          console.log('ImportModal: 尝试UTF-8编码读取');
          reader.readAsText(file, 'UTF-8');
        } catch (encodingError) {
          console.log('ImportModal: UTF-8读取失败，尝试默认编码');
          reader.readAsText(file);
        }
      });
      
      // 测试JSON解析
      let parsedData;
      try {
        parsedData = JSON.parse(content);
        console.log('ImportModal: JSON解析成功，数据类型:', typeof parsedData);
        if (Array.isArray(parsedData)) {
          console.log('ImportModal: 数据是数组，长度:', parsedData.length);
        } else if (typeof parsedData === 'object') {
          console.log('ImportModal: 数据是对象，键:', Object.keys(parsedData));
        }
      } catch (parseError) {
        console.error('ImportModal: JSON解析失败:', parseError);
        console.error('ImportModal: 解析错误详情:', {
          message: parseError.message,
          stack: parseError.stack
        });
        
        // 尝试修复常见的JSON问题
        console.log('ImportModal: 尝试修复JSON格式...');
        let fixedContent = content;
        
        // 移除BOM
        if (fixedContent.charCodeAt(0) === 0xFEFF) {
          fixedContent = fixedContent.slice(1);
          console.log('ImportModal: 移除BOM标记');
        }
        
        // 移除控制字符
        fixedContent = fixedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        console.log('ImportModal: 移除控制字符');
        
        // 尝试解析修复后的内容
        try {
          parsedData = JSON.parse(fixedContent);
          console.log('ImportModal: 修复后JSON解析成功');
        } catch (secondError) {
          console.error('ImportModal: 修复后仍然解析失败:', secondError);
          alert('文件格式错误：不是有效的JSON文件，请检查文件内容');
          return;
        }
      }
      
      // 调用导入函数
      console.log('ImportModal: 开始调用handleFileImport...');
      const result = await handleFileImport(file, activeTab);
      console.log('ImportModal: 导入结果:', result);
      
      if (result.success) {
        const details = result.details || [];
        const message = `导入成功！\n${details.join('\n')}`;
        console.log('ImportModal: 显示成功消息:', message);
        alert(message);
        onImportSuccess?.();
        onClose();
      } else {
        const errorMessage = `导入失败：${result.error || '未知错误'}`;
        console.error('ImportModal: 导入失败:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      console.error('ImportModal: 导入异常:', error);
      console.error('ImportModal: 异常详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // 提供更具体的错误信息
      let errorMessage = '导入失败：文件读取错误，请检查文件格式';
      
      if (error.message.includes('文件读取失败')) {
        errorMessage = '导入失败：无法读取文件，请检查文件是否损坏或过大';
      } else if (error.message.includes('JSON')) {
        errorMessage = '导入失败：文件格式错误，请确保是有效的JSON文件';
      } else if (error.message.includes('超时')) {
        errorMessage = '导入失败：文件读取超时，请尝试较小的文件';
      }
      
      alert(errorMessage);
    }
    
    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
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
            className="w-full p-4 text-left bg-gradient-to-r from-green-50 to-emerald-50 dark:from-gray-700 dark:to-gray-800 rounded-lg border border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-gray-600 dark:hover:to-gray-700 transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <FileText className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">
                  选择JSON文件
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  点击选择要导入的历史数据文件
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImport}
            />
          </button>
          
          {/* 开发环境测试按钮 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="space-y-2">
              <button
                onClick={() => {
                  // 创建一个测试数据
                  const testData = {
                    metadata: {
                      exportDate: new Date().toISOString(),
                      totalRecords: 1
                    },
                    quotation: [{
                      id: 'test-' + Date.now(),
                      type: 'quotation',
                      customerName: '测试客户',
                      quotationNo: 'TEST-001',
                      totalAmount: 1000,
                      currency: 'USD',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      data: {
                        to: '测试客户',
                        inquiryNo: 'INQ-001',
                        quotationNo: 'TEST-001',
                        date: new Date().toISOString().split('T')[0],
                        from: 'Roger',
                        currency: 'USD',
                        items: [{
                          id: 1,
                          partName: '测试产品',
                          description: '测试描述',
                          quantity: 1,
                          unit: 'PCS',
                          unitPrice: 1000,
                          amount: 1000,
                          remarks: '',
                          highlight: {}
                        }],
                        notes: '测试备注',
                        amountInWords: 'One Thousand USD Only',
                        showDescription: true,
                        showRemarks: false,
                        showBank: false,
                        showStamp: false,
                        contractNo: 'TEST-001',
                        otherFees: [],
                        customUnits: [],
                        showPaymentTerms: false,
                        showInvoiceReminder: false,
                        additionalPaymentTerms: ''
                      }
                    }]
                  };
                  
                  const blob = new Blob([JSON.stringify(testData, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'test_import_data.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  
                  alert('测试文件已下载，请尝试导入此文件');
                }}
                className="w-full p-2 text-sm bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
              >
                下载测试文件（开发环境）
              </button>
              
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        const content = e.target?.result as string;
                        console.log('文件内容预览:', content);
                        alert(`文件内容预览（前500字符）：\n\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}`);
                      };
                      reader.readAsText(file);
                    }
                  };
                  input.click();
                }}
                className="w-full p-2 text-sm bg-purple-100 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg text-purple-800 dark:text-purple-200 hover:bg-purple-200 dark:hover:bg-purple-900/30 transition-colors"
              >
                预览文件内容（开发环境）
              </button>
              
              <button
                onClick={async () => {
                  try {
                    console.log('测试导入函数...');
                    const { importQuotationHistory } = await import('@/utils/quotationHistory');
                    
                    const testData = [{
                      id: 'test-' + Date.now(),
                      type: 'quotation',
                      customerName: '测试客户',
                      quotationNo: 'TEST-002',
                      totalAmount: 2000,
                      currency: 'USD',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                      data: {
                        to: '测试客户',
                        inquiryNo: 'INQ-002',
                        quotationNo: 'TEST-002',
                        date: new Date().toISOString().split('T')[0],
                        from: 'Roger',
                        currency: 'USD',
                        items: [{
                          id: 1,
                          partName: '测试产品2',
                          description: '测试描述2',
                          quantity: 2,
                          unit: 'PCS',
                          unitPrice: 1000,
                          amount: 2000,
                          remarks: '',
                          highlight: {}
                        }],
                        notes: '测试备注2',
                        amountInWords: 'Two Thousand USD Only',
                        showDescription: true,
                        showRemarks: false,
                        showBank: false,
                        showStamp: false,
                        contractNo: 'TEST-002',
                        otherFees: [],
                        customUnits: [],
                        showPaymentTerms: false,
                        showInvoiceReminder: false,
                        additionalPaymentTerms: ''
                      }
                    }];
                    
                    const result = importQuotationHistory(JSON.stringify(testData));
                    console.log('importQuotationHistory测试结果:', result);
                    
                    if (result) {
                      alert('importQuotationHistory函数测试成功！');
                    } else {
                      alert('importQuotationHistory函数测试失败');
                    }
                  } catch (error) {
                    console.error('importQuotationHistory测试失败:', error);
                    alert('importQuotationHistory函数测试失败：' + error.message);
                  }
                }}
                className="w-full p-2 text-sm bg-blue-100 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200 hover:bg-blue-200 dark:hover:bg-blue-900/30 transition-colors"
              >
                测试importQuotationHistory函数（开发环境）
              </button>
              
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.json';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) {
                      console.log('直接文件读取测试开始...');
                      console.log('文件信息:', {
                        name: file.name,
                        size: file.size,
                        type: file.type,
                        lastModified: new Date(file.lastModified).toISOString()
                      });
                      
                      try {
                        // 测试不同的读取方式
                        const content1 = await new Promise<string>((resolve, reject) => {
                          const reader = new FileReader();
                          reader.onload = (e) => resolve(e.target?.result as string);
                          reader.onerror = reject;
                          reader.readAsText(file, 'UTF-8');
                        });
                        
                        console.log('UTF-8读取成功，长度:', content1.length);
                        console.log('前100字符:', content1.substring(0, 100));
                        
                        // 测试JSON解析
                        try {
                          const parsed = JSON.parse(content1);
                          console.log('JSON解析成功，类型:', typeof parsed);
                          if (Array.isArray(parsed)) {
                            console.log('数组长度:', parsed.length);
                          } else if (typeof parsed === 'object') {
                            console.log('对象键:', Object.keys(parsed));
                          }
                          alert('文件读取和JSON解析测试成功！');
                        } catch (parseError) {
                          console.error('JSON解析失败:', parseError);
                          alert('JSON解析失败：' + parseError.message);
                        }
                        
                      } catch (readError) {
                        console.error('文件读取失败:', readError);
                        alert('文件读取失败：' + readError.message);
                      }
                    }
                  };
                  input.click();
                }}
                className="w-full p-2 text-sm bg-red-100 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-900/30 transition-colors"
              >
                直接文件读取测试（开发环境）
              </button>
            </div>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            取消
          </button>
        </div>
      </div>
    </div>
  );
} 