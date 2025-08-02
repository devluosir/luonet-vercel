'use client';

import { useState, useEffect, useCallback } from 'react';
import { Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Footer } from '@/components/Footer';
import { API_ENDPOINTS, apiRequestWithError } from '@/lib/api-config';
import { performanceMonitor, optimizePerformance } from '@/utils/performance';

export default function MailPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('mail');
  const [mailType, setMailType] = useState('formal');
  const [userInput, setUserInput] = useState({
    mail: '',
    language: 'both English and Chinese',
    replyTo: '',
    reply: '',
    replyLanguage: 'both English and Chinese',
    replyType: 'formal'
  });
  const [generatedContent, setGeneratedContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // 性能监控
  useEffect(() => {
    if (typeof window !== 'undefined') {
      performanceMonitor.startTimer('mail_page_load');
      
      // 延迟执行性能优化，避免阻塞页面渲染
      setTimeout(() => {
        optimizePerformance.optimizeFontLoading();
        optimizePerformance.cleanupUnusedResources();
      }, 100);
    }
  }, []);

  // 页面加载完成后的性能记录
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleLoad = () => {
        performanceMonitor.endTimer('mail_page_load');
        const metrics = performanceMonitor.getPageLoadMetrics();
        if (process.env.NODE_ENV === 'development') {
          console.log('📊 邮件助手页面加载性能:', metrics);
        }
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    try {
      setError('');
      setIsLoading(true);
      
      const requestData = {
        language: activeTab === 'mail' ? userInput.language : userInput.replyLanguage,
        type: activeTab === 'mail' ? mailType : userInput.replyType,
        content: activeTab === 'mail' ? userInput.mail : userInput.reply,
        originalMail: activeTab === 'mail' ? '' : userInput.replyTo,
        mode: activeTab
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 秒超时

      const data = await apiRequestWithError(API_ENDPOINTS.GENERATE, {
        method: 'POST',
        body: JSON.stringify(requestData),
        signal: controller.signal
      });
      if (!data.result) {
        throw new Error('返回数据格式错误');
      }
      
      setGeneratedContent(data.result);

    } catch (error: unknown) {
      console.error('Generate Error:', error);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('请求超时，请稍后重试');
        } else {
          setError(error.message);
        }
      } else {
        setError('生成失败，请稍后重试');
      }
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, userInput, mailType]);

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black flex flex-col">
      <main className="flex-1">
        <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
          <Link 
            href="/dashboard"
            className="inline-flex items-center text-gray-600 dark:text-[#98989D] hover:text-gray-900 dark:hover:text-[#F5F5F7]"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back
          </Link>
          <div className="flex flex-col md:flex-row gap-6">
            {/* 左侧编辑区 */}
            <div className="w-full md:w-1/2 order-1">
              <div className="flex justify-center gap-3 mb-6">
                <button 
                  onClick={() => setActiveTab('mail')}
                  className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'mail' 
                      ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Mail
                </button>
                <button 
                  onClick={() => setActiveTab('reply')}
                  className={`px-8 py-2.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === 'reply' 
                      ? 'bg-blue-600 dark:bg-blue-500 text-white' 
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50'
                  }`}
                >
                  Reply
                </button>
              </div>

              <div className="bg-white dark:bg-[#1c1c1e] shadow-sm border border-gray-200 dark:border-gray-800/80 rounded-xl p-6">
                {activeTab === 'mail' ? (
                  <div className="space-y-6">
                    {/* 邮件内容输入框 */}
                    <div className="space-y-2">
                      <label className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="text-red-500 dark:text-red-400 mr-1">*</span>
                        Write your email content
                      </label>
                      <textarea 
                        value={userInput.mail}
                        onChange={(e) => setUserInput({ ...userInput, mail: e.target.value })}
                        placeholder="请在这里输入邮件内容... / Type your email content here..."
                        className="w-full h-[200px] md:h-[300px] p-4 rounded-xl bg-gray-50/50 dark:bg-[#2c2c2e] border border-gray-200/50 dark:border-gray-700/50 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all resize-y text-sm text-gray-900 dark:text-gray-100 font-['.SFNSText-Regular', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', 'Arial', sans-serif] placeholder:text-gray-400/80 dark:placeholder:text-gray-500/80"
                      />
                    </div>

                    {/* 语言选择 */}
                    <div className="space-y-2">
                      <label htmlFor="language-select" className="text-sm text-gray-600 dark:text-gray-400">
                        Output language
                      </label>
                      <div className="relative">
                        <select
                          id="language-select"
                          value={userInput.language}
                          onChange={(e) => setUserInput({ ...userInput, language: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 dark:bg-[#2c2c2e] border border-gray-200/50 dark:border-gray-700/50 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none"
                        >
                          <option value="both English and Chinese">Both EN & CN</option>
                          <option value="English">English</option>
                          <option value="Chinese">Chinese</option>
                        </select>
                      </div>
                    </div>

                    {/* 风格选择 */}
                    <div className="space-y-2">
                      <label htmlFor="style-select" className="text-sm text-gray-600 dark:text-gray-400">
                        Reply Tone
                      </label>
                      <div className="relative">
                        <select
                          id="style-select"
                          value={mailType}
                          onChange={(e) => setMailType(e.target.value)}
                          className="w-full px-4 py-2.5 rounded-xl bg-gray-50/50 dark:bg-[#2c2c2e] border border-gray-200/50 dark:border-gray-700/50 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all text-sm font-medium text-gray-900 dark:text-gray-100 appearance-none"
                        >
                          <option value="formal">📝 Formal</option>
                          <option value="professional">💼 Professional</option>
                          <option value="friendly">👋 Friendly</option>
                          <option value="concise">⚡️ Concise</option>
                          <option value="detailed">📋 Detailed</option>
                          <option value="informal">😊 Informal</option>
                          <option value="inspirational">✨ Inspirational</option>
                        </select>
                      </div>
                    </div>

                    {/* 生成按钮 */}
                    <button 
                      onClick={handleGenerate}
                      disabled={isLoading || !userInput.mail?.trim()}
                      className="w-full py-3 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-500 shadow-sm"
                    >
                      {isLoading ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Generating...</span>
                        </span>
                      ) : (
                        'Generate Optimized Mail'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <textarea 
                      value={userInput.replyTo}
                      onChange={(e) => setUserInput({ ...userInput, replyTo: e.target.value })}
                      className="w-full h-[200px] p-4 rounded-xl bg-gray-50/50 dark:bg-[#2c2c2e] border border-gray-200/50 dark:border-gray-700/50 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all resize-y text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400/80 dark:placeholder:text-gray-500/80 font-['.SFNSText-Regular', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', 'Arial', sans-serif]"
                      placeholder="请粘贴需要回复的邮件内容... / Paste the email content you need to reply to..."
                    />
                    <textarea 
                      value={userInput.reply}
                      onChange={(e) => setUserInput({ ...userInput, reply: e.target.value })}
                      className="w-full h-[200px] p-4 rounded-xl bg-gray-50/50 dark:bg-[#2c2c2e] border border-gray-200/50 dark:border-gray-700/50 focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:outline-none transition-all resize-y text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400/80 dark:placeholder:text-gray-500/80 font-['.SFNSText-Regular', 'SF Pro Text', 'SF Pro Icons', 'Helvetica Neue', 'Arial', sans-serif]"
                      placeholder="请输入您的回复草稿... / Enter your reply draft..."
                    />
                    <button 
                      onClick={handleGenerate}
                      disabled={isLoading || !userInput.replyTo.trim() || !userInput.reply.trim()}
                      className="w-full py-3 rounded-xl bg-blue-600 dark:bg-blue-500 text-white text-sm font-medium hover:bg-blue-700 dark:hover:bg-blue-600 transition-all disabled:opacity-50 disabled:hover:bg-blue-600 dark:disabled:hover:bg-blue-500 shadow-sm"
                    >
                      {isLoading ? 'Generating...' : 'Generate Optimized Reply'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* 右侧预览区 */}
            <div className="w-full md:w-1/2 order-2">
              <div className={`bg-white dark:bg-[#1c1c1e] shadow-sm border border-gray-200 dark:border-gray-800/80 rounded-xl p-6 ${
                generatedContent 
                  ? 'md:min-h-[710px] h-auto' 
                  : 'md:h-[710px] min-h-[200px]'
              } overflow-y-auto`}>
                <div className="flex justify-end mb-4">
                  <button
                    aria-label="Copy content"
                    onClick={() => handleCopy(generatedContent)}
                    className="relative p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-md transition-colors"
                    disabled={!generatedContent || isLoading}
                  >
                    {copySuccess ? (
                      <span className="absolute -top-8 -left-2 bg-black/75 text-white text-xs py-1 px-2 rounded whitespace-nowrap">
                        Copied!
                      </span>
                    ) : null}
                    <Copy className={`w-4 h-4 ${
                      !generatedContent || isLoading 
                        ? 'text-gray-300 dark:text-gray-600' 
                        : 'text-[var(--foreground)]'
                    }`} />
                  </button>
                </div>
                <div 
                  className={`
                    h-[calc(100%-3rem)] 
                    overflow-y-auto 
                    font-['.SFNSText-Regular','SF Pro Text','Helvetica Neue','Arial',sans-serif]
                    text-[15px]
                    leading-7
                    tracking-[-0.003em]
                    text-gray-800 
                    dark:text-gray-200
                    selection:bg-blue-500/20
                    whitespace-pre-wrap
                    px-1
                  `}
                  style={{
                    WebkitFontSmoothing: 'antialiased',
                    MozOsxFontSmoothing: 'grayscale',
                  }}
                >
                  {!isLoading && generatedContent && (
                    <div className="space-y-4">
                      {generatedContent.split('\n\n').map((paragraph, index) => (
                        <div key={index} className={`
                          ${paragraph.startsWith('[Subject]') || paragraph.startsWith('[主题]') 
                            ? 'text-base font-medium text-gray-900 dark:text-white tracking-tight' 
                            : paragraph.startsWith('[English]') || paragraph.startsWith('[中文]')
                              ? 'text-sm font-medium text-blue-500 dark:text-blue-400 border-b border-gray-100 dark:border-gray-800'
                              : paragraph.trim().length === 0
                                ? 'hidden'
                                : 'text-[15px] leading-relaxed'
                          }
                          ${(paragraph.startsWith('[English]') || paragraph.startsWith('[中文]')) 
                            ? 'mt-4 first:mt-0' 
                            : ''
                          }
                          ${paragraph.includes('Dear') || paragraph.includes('尊敬的')
                            ? 'text-[15px] font-normal mt-2'
                            : ''
                          }
                        `}>
                          {paragraph.startsWith('[') && paragraph.endsWith(']') 
                            ? paragraph.slice(1, -1) // 移除方括号
                            : paragraph
                          }
                        </div>
                      ))}
                    </div>
                  )}
                  {isLoading && (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Generating content...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </main>
      <style jsx>{`
        .preview-box {
          height: 710px;
        }

        @media (max-width: 768px) {
          .preview-box {
            height: auto;
            min-height: 200px;
          }
        }
      `}</style>
      <Footer />
    </div>
  );
}