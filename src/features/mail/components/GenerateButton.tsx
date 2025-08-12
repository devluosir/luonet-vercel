import { BUTTON_TEXTS } from '../utils/constants';

interface GenerateButtonProps {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  isReply?: boolean;
  variant?: 'default' | 'compact';
}

export function GenerateButton({ 
  onClick, 
  loading, 
  disabled, 
  isReply = false,
  variant = 'default'
}: GenerateButtonProps) {
  const buttonText = loading
    ? BUTTON_TEXTS.generating
    : isReply
      ? BUTTON_TEXTS.generateReply
      : BUTTON_TEXTS.generateMail;

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        title={buttonText}
      >
        {/* 图标容器 */}
        <div className="icon-container w-4 h-4 flex items-center justify-center flex-shrink-0">
          {loading ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </div>

        {/* 文字 */}
        <span className="text-sm font-medium whitespace-nowrap">
          {buttonText}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="px-3 py-2.5 rounded-lg bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium hover:bg-blue-600 dark:hover:bg-blue-700 transition-all disabled:opacity-50 disabled:hover:bg-blue-500 dark:disabled:hover:bg-blue-600 shadow-sm flex items-center justify-center space-x-1.5 h-[44px] min-w-[44px]"
    >
      {loading ? (
        <>
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="hidden sm:inline">{buttonText}</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
          <span className="hidden sm:inline">{buttonText}</span>
        </>
      )}
    </button>
  );
}
