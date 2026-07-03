import { useMailForm } from '../hooks/useMailForm';
import { useMailGeneration } from '../hooks/useMailGeneration';
import { useMailStore } from '../state/mail.store';
import { useCanGenerateMail, useGeneratedContent, useIsLoading } from '../state/mail.selectors';
import { TextAreaField } from './TextAreaField';
import { GenerateButton } from './GenerateButton';
import { CopyButton } from './CopyButton';
import { FORM_LABELS, PLACEHOLDERS } from '../utils/constants';

interface ChatInterfaceProps {
  showSettings: boolean;
  onToggleSettings: () => void;
}

export function ChatInterface({ showSettings: _showSettings, onToggleSettings: _onToggleSettings }: ChatInterfaceProps) {
  const { field } = useMailForm();
  const { generateMail, isLoading } = useMailGeneration();
  const { mailType: _mailType, setMailType: _setMailType, activeTab } = useMailStore();
  const canGenerate = useCanGenerateMail();
  const generatedContent = useGeneratedContent();
  const isGenerating = useIsLoading();

  const renderMessage = (content: string, isUser: boolean = false) => {
    if (!content) return null;

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`max-w-[80%] rounded-3xl p-6 ${
          isUser
            ? 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white shadow-xl'
            : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 text-gray-900 dark:text-gray-100 shadow-lg border border-gray-200 dark:border-gray-600'
        }`}>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {content.split('\n\n').map((paragraph, index) => (
              <div key={index} className={`
                ${paragraph.startsWith('[Subject]') || paragraph.startsWith('[主题]')
                  ? 'text-base font-bold tracking-tight mb-3'
                  : paragraph.startsWith('[English]') || paragraph.startsWith('[中文]')
                    ? 'text-sm font-semibold border-b border-gray-300 dark:border-gray-600 pb-2 mb-3'
                    : paragraph.trim().length === 0
                      ? 'hidden'
                      : 'text-sm leading-relaxed'
                }
                ${(paragraph.startsWith('[English]') || paragraph.startsWith('[中文]'))
                  ? 'mt-3 first:mt-0'
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
          {!isUser && (
            <div className="mt-4 flex justify-end">
              <CopyButton />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[800px] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-xl backdrop-blur-sm">
      {/* 聊天消息区域 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* 欢迎消息 */}
        <div className="flex justify-start mb-6">
          <div className="max-w-[80%] rounded-3xl p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-800 dark:via-gray-700 dark:to-gray-600 border border-blue-200 dark:border-gray-600 shadow-lg">
            <div className="text-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-xl">👋</span>
                </div>
                <div>
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-base">欢迎使用AI邮件助手</p>
                  <p className="text-blue-600 dark:text-blue-400 text-xs">AI-powered Email Assistant</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {activeTab === 'mail'
                  ? '请告诉我您想要写什么邮件，我会帮您生成专业的邮件内容。'
                  : '请粘贴需要回复的邮件内容，我会帮您生成合适的回复。'
                }
              </p>
            </div>
          </div>
        </div>



        {/* AI生成的消息 */}
        {generatedContent && renderMessage(generatedContent, false)}

        {/* 加载状态 */}
        {isGenerating && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[85%] rounded-2xl p-4 bg-gray-50 dark:bg-gray-800 shadow-sm">
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm text-gray-600 dark:text-gray-400">正在生成邮件内容...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-6 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-700">
        {/* 回复模式下的原始邮件输入 */}
        {activeTab === 'reply' && (
          <div className="mb-4">
            <TextAreaField
              {...field('replyTo')}
              label={FORM_LABELS.replyTo}
              placeholder={PLACEHOLDERS.replyTo}
              required
              rows={2}
            />
          </div>
        )}

        {/* 主输入区域 - 重新设计布局 */}
        <div className="space-y-4">
          {/* 邮件内容输入 */}
          <div>
            <TextAreaField
              {...field(activeTab === 'mail' ? 'mail' : 'reply')}
              label={activeTab === 'mail' ? FORM_LABELS.mail : FORM_LABELS.reply}
              placeholder={activeTab === 'mail' ? PLACEHOLDERS.mail : PLACEHOLDERS.reply}
              required
              rows={4}
            />
          </div>

          {/* 操作按钮区域 - 放在输入框下方，右对齐 */}
          <div className="flex justify-end items-center gap-3">
            {/* 生成按钮 - 主要操作按钮 */}
            <GenerateButton
              onClick={generateMail}
              loading={isLoading}
              disabled={!canGenerate}
              isReply={activeTab === 'reply'}
              variant="default"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
