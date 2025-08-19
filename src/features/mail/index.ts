// 主页面
export { default as MailPage } from './app/MailPage';

// 组件
export { MailTabs } from './components/MailTabs';
export { ChatInterface } from './components/ChatInterface';
export { MailForm } from './components/MailForm';
export { ReplyForm } from './components/ReplyForm';
export { MailPreview } from './components/MailPreview';
export { CopyButton } from './components/CopyButton';
export { BackButton } from './components/BackButton';
export { ErrorDisplay } from './components/ErrorDisplay';
export { TextAreaField } from './components/TextAreaField';
export { SelectField } from './components/SelectField';
export { GenerateButton } from './components/GenerateButton';

// Hooks
export { useMailForm } from './hooks/useMailForm';
export { useMailGeneration } from './hooks/useMailGeneration';
export { useMailCopy } from './hooks/useMailCopy';

// 服务
export { MailService } from './services/mail.service';

// 状态管理
export { useMailStore } from './state/mail.store';
export * from './state/mail.selectors';

// 类型
export * from './types';

// 工具
export * from './utils/constants';
export * from './utils/test-utils';
