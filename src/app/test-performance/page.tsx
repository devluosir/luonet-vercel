'use client';

import { useState } from 'react';
import { generateQuotationPDF } from '@/utils/quotationPdfGenerator';
import { warmupFontRegistration } from '@/utils/pdfFontRegistry';
import { getFontCacheStatus, clearFontCache } from '@/utils/fontCache';
import { getImageCacheStatus, clearImageCache } from '@/utils/imageCache';
import { printReport } from '@/utils/performanceMonitor';

export default function PerformanceTestPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [cacheStatus, setCacheStatus] = useState<any>(null);

  const testData = {
    quotationNo: 'QT-2024-001',
    date: '2024-01-15',
    from: 'Test Company',
    to: 'Customer Company\nAddress Line 1\nAddress Line 2',
    currency: 'USD',
    inquiryNo: 'INQ-2024-001',
    items: [
      {
        partName: 'Test Part 1',
        description: 'This is a very long description that should test the table width handling and text wrapping capabilities of the PDF generator',
        quantity: 10,
        unit: 'pcs',
        unitPrice: 25.50,
        amount: 255.00
      },
      {
        partName: 'Test Part 2',
        description: 'Another test part with description',
        quantity: 5,
        unit: 'sets',
        unitPrice: 100.00,
        amount: 500.00
      }
    ],
    otherFees: [
      {
        description: 'Shipping Fee',
        amount: 50.00
      }
    ],
    notes: [
      'Payment terms: 30 days after invoice date',
      'Delivery: Within 2 weeks after order confirmation',
      'Warranty: 1 year from delivery date'
    ],
    templateConfig: {
      headerType: 'bilingual'
    }
  };

  const runPerformanceTest = async () => {
    setIsLoading(true);
    setResults(null);

    try {
      console.log('=== 开始性能测试 ===');
      
      // 1. 检查缓存状态
      const [fontStatus, imageStatus] = await Promise.all([
        getFontCacheStatus(),
        getImageCacheStatus()
      ]);
      setCacheStatus({ font: fontStatus, image: imageStatus });

      // 2. 字体预热测试
      console.log('--- 字体预热测试 ---');
      const warmupStart = performance.now();
      await warmupFontRegistration();
      const warmupEnd = performance.now();
      const warmupTime = warmupEnd - warmupStart;

      // 3. PDF生成测试
      console.log('--- PDF生成测试 ---');
      const generationStart = performance.now();
      const pdfBlob = await generateQuotationPDF(testData);
      const generationEnd = performance.now();
      const generationTime = generationEnd - generationStart;

      // 4. 打印性能报告
      printReport();

      setResults({
        warmupTime: warmupTime.toFixed(2),
        generationTime: generationTime.toFixed(2),
        totalTime: (warmupTime + generationTime).toFixed(2),
        pdfSize: `${(pdfBlob.size / 1024).toFixed(2)} KB`
      });

      console.log('=== 性能测试完成 ===');
    } catch (error) {
      console.error('性能测试失败:', error);
      setResults({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const clearAllCaches = async () => {
    try {
      await Promise.all([
        clearFontCache(),
        clearImageCache()
      ]);
      
      const [fontStatus, imageStatus] = await Promise.all([
        getFontCacheStatus(),
        getImageCacheStatus()
      ]);
      setCacheStatus({ font: fontStatus, image: imageStatus });
      
      alert('缓存已清除');
    } catch (error) {
      console.error('清除缓存失败:', error);
      alert('清除缓存失败');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">PDF性能测试</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 控制面板 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">测试控制</h2>
          
          <div className="space-y-4">
            <button
              onClick={runPerformanceTest}
              disabled={isLoading}
              className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              {isLoading ? '测试中...' : '运行性能测试'}
            </button>
            
            <button
              onClick={clearAllCaches}
              className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              清除所有缓存
            </button>
          </div>
        </div>

        {/* 缓存状态 */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">缓存状态</h2>
          
          {cacheStatus && (
            <div className="space-y-3">
              <div>
                <h3 className="font-medium">字体缓存:</h3>
                <div className="text-sm text-gray-600">
                  <div>Regular: {cacheStatus.font.regular ? '✅' : '❌'}</div>
                  <div>Bold: {cacheStatus.font.bold ? '✅' : '❌'}</div>
                  <div>版本: {cacheStatus.font.version}</div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium">图片缓存:</h3>
                <div className="text-sm text-gray-600">
                  <div>Bilingual: {cacheStatus.image.headerBilingual ? '✅' : '❌'}</div>
                  <div>English: {cacheStatus.image.headerEnglish ? '✅' : '❌'}</div>
                  <div>版本: {cacheStatus.image.version}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 测试结果 */}
      {results && (
        <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">测试结果</h2>
          
          {results.error ? (
            <div className="text-red-600">
              测试失败: {results.error}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{results.warmupTime}ms</div>
                <div className="text-sm text-gray-600">字体预热</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{results.generationTime}ms</div>
                <div className="text-sm text-gray-600">PDF生成</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{results.totalTime}ms</div>
                <div className="text-sm text-gray-600">总耗时</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{results.pdfSize}</div>
                <div className="text-sm text-gray-600">PDF大小</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 性能指标说明 */}
      <div className="mt-6 bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">性能指标说明</h2>
        
        <div className="space-y-3 text-sm">
          <div>
            <strong>字体预热:</strong> 首次加载字体文件并注册到jsPDF的时间
          </div>
          <div>
            <strong>PDF生成:</strong> 创建PDF文档并生成Blob的时间
          </div>
          <div>
            <strong>缓存命中:</strong> ✅ 表示从IndexedDB读取，❌ 表示需要重新加载
          </div>
          <div>
            <strong>性能阈值:</strong> 字体预热 &lt; 200ms，PDF生成 &lt; 300ms
          </div>
        </div>
      </div>
    </div>
  );
}
