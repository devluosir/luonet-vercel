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

  // 构建CSS变量对象，包含错误处理
  const cssVariables = {
    '--bg-gradient': 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(59, 130, 246, 0.25))',
    '--text-color': '#171717',
    '--icon-color': '#2563eb',
    '--shadow': '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  };

  // 优化的发送图标组件
  const SendIcon = () => (
    <svg 
      className="send-icon w-5 h-5" 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* 邮件发送图标 - 更直观的发送含义 */}
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2.5} 
        d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
      {/* 添加发送箭头指示 */}
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2.5} 
        d="M12 12l3 3m0 0l-3 3m3-3H9"
        className="send-arrow"
      />
    </svg>
  );

  // 优化的加载动画组件
  const LoadingIcon = () => (
    <div className="loading-container relative w-5 h-5">
      {/* 外圈旋转动画 */}
      <svg className="loading-ring animate-spin w-5 h-5" viewBox="0 0 24 24">
        <circle 
          className="loading-ring-bg" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          fill="none" 
          opacity="0.2"
        />
        <path 
          className="loading-ring-progress" 
          fill="currentColor" 
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          opacity="0.8"
        />
      </svg>
      {/* 中心点 */}
      <div className="loading-center absolute inset-0 flex items-center justify-center">
        <div className="loading-dot w-1 h-1 bg-current rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  if (variant === 'compact') {
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className="mail-generate-button-compact flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 h-[44px] min-w-[44px] relative overflow-hidden group"
        style={cssVariables as React.CSSProperties}
        title={buttonText}
      >
        {/* 图标容器 */}
        <div className="icon-container relative w-5 h-5 flex items-center justify-center flex-shrink-0 z-10">
          {loading ? <LoadingIcon /> : <SendIcon />}
        </div>

        {/* 文字 */}
        <span className="text-sm font-semibold whitespace-nowrap z-10">
          {buttonText}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="mail-generate-button-optimized flex items-center justify-center space-x-3 h-[52px] min-w-[180px] px-8 py-3 rounded-2xl text-sm font-bold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
      style={cssVariables as React.CSSProperties}
    >
      {/* 主要图标 */}
      <div className="icon-container relative w-6 h-6 flex items-center justify-center flex-shrink-0 z-10">
        {loading ? <LoadingIcon /> : <SendIcon />}
      </div>

      {/* 文字内容 */}
      <span className="font-bold text-sm tracking-wide z-10">
        {buttonText}
      </span>
    </button>
  );
}
