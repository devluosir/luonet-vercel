'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

// 懒加载PDF生成器
const PDFGenerator = dynamic(
  () => import('./PDFPreviewComponent'),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2 text-gray-600">加载PDF生成器...</span>
      </div>
    ),
    ssr: false, // 禁用服务端渲染，避免字体加载问题
  }
);

interface LazyPDFGeneratorProps {
  pdfUrl: string | null;
  onClose: () => void;
  title?: string;
  data?: any;
  itemType?: 'quotation' | 'confirmation' | 'invoice' | 'purchase' | 'packing';
  showDownloadButton?: boolean;
  showOpenInNewTab?: boolean;
  className?: string;
}

export default function LazyPDFGenerator({ 
  pdfUrl,
  onClose,
  title = 'PDF Preview',
  data,
  itemType,
  showDownloadButton = true,
  showOpenInNewTab = true,
  className = '' 
}: LazyPDFGeneratorProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);

  // 延迟显示PDF生成器，减少初始加载时间
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowGenerator(true);
    }, 100); // 100ms延迟

    return () => clearTimeout(timer);
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  if (!showGenerator) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-24"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <PDFGenerator
        pdfUrl={pdfUrl}
        onClose={onClose}
        title={title}
        data={data}
        itemType={itemType}
        showDownloadButton={showDownloadButton}
        showOpenInNewTab={showOpenInNewTab}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
            <p className="text-sm text-gray-600">准备PDF生成器...</p>
          </div>
        </div>
      )}
    </div>
  );
} 