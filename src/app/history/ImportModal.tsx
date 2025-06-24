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
    console.log('文件信息:', { name: file.name, size: file.size, type: file.type });
    
    try {
      // 先测试文件读取
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          console.log('ImportModal: 文件读取成功，内容长度:', result.length);
          console.log('ImportModal: 文件内容前200字符:', result.substring(0, 200));
          resolve(result);
        };
        reader.onerror = (error) => {
          console.error('ImportModal: 文件读取失败:', error);
          reject(new Error('文件读取失败'));
        };
        reader.readAsText(file);
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
        alert('文件格式错误：不是有效的JSON文件');
        return;
      }
      
      // 调用导入函数
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
      alert('导入失败：文件读取错误，请检查文件格式');
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
                  <li>• 支持单个类型或综合数据文件</li>
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
              className="w-full mt-2 p-2 text-sm bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-900/30 transition-colors"
            >
              下载测试文件（开发环境）
            </button>
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