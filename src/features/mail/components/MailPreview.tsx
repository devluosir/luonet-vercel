import { useGeneratedContent, useIsLoading } from '../state/mail.selectors';
import { CopyButton } from './CopyButton';

export function MailPreview() {
  const generatedContent = useGeneratedContent();
  const isLoading = useIsLoading();

  const renderContent = () => {
    if (!generatedContent) return null;

    return (
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
    );
  };

  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400">
      <div className="mb-4">
        <svg className="animate-spin h-8 w-8 text-blue-500" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <p className="text-sm font-medium">正在生成邮件内容...</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">请稍候</p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#1c1c1e] shadow-sm border border-gray-200 dark:border-gray-800/80 rounded-xl p-6 lg:h-[710px] flex flex-col">
      <div className="flex justify-end mb-4">
        <CopyButton />
      </div>
      <div 
        className={`
          flex-1
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
          flex items-center justify-center
        `}
        style={{
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
        }}
      >
        {isLoading ? renderLoading() : (generatedContent ? renderContent() : (
          <div className="text-center text-gray-400 dark:text-gray-500">
            <div className="mb-6">
              <svg className="w-20 h-20 mx-auto text-gray-200 dark:text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-base font-medium mb-2">邮件预览区域</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">填写左侧表单并点击生成按钮</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">生成的内容将在这里显示</p>
          </div>
        ))}
      </div>
    </div>
  );
}
