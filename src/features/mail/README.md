# 邮件模块 (Mail Module)

## 概述

邮件模块是一个完整的AI邮件助手功能，支持邮件编写和回复功能。该模块采用模块化设计，包含状态管理、服务层、组件层和工具层。

## 功能特性

- ✅ **ChatGPT风格界面**: 现代化的聊天界面，节省空间
- ✅ **紧凑布局**: 发送按钮紧贴输入框，设置选项可折叠
- ✅ **邮件编写**: 支持多种语言和风格的邮件生成
- ✅ **邮件回复**: 基于原始邮件和回复草稿生成优化回复
- ✅ **多语言支持**: 支持英文、中文和双语模式
- ✅ **多种风格**: 正式、专业、友好、简洁、详细、非正式、激励等风格
- ✅ **实时对话**: 用户输入和AI回复以对话形式显示
- ✅ **一键复制**: 支持生成内容一键复制到剪贴板
- ✅ **错误处理**: 完善的错误处理和用户提示
- ✅ **响应式设计**: 支持桌面和移动端

## 目录结构

```
src/features/mail/
├── app/
│   └── MailPage.tsx                    # 主页面容器
├── components/
│   ├── MailTabs.tsx                   # 标签切换组件
│   ├── ChatInterface.tsx              # ChatGPT风格聊天界面
│   ├── MailForm.tsx                   # 邮件表单组件（传统布局）
│   ├── ReplyForm.tsx                  # 回复表单组件（传统布局）
│   ├── MailPreview.tsx                # 预览组件（传统布局）
│   ├── CopyButton.tsx                 # 复制按钮组件
│   ├── BackButton.tsx                 # 返回按钮组件
│   ├── ErrorDisplay.tsx               # 错误显示组件
│   ├── TextAreaField.tsx              # 文本域字段组件
│   ├── SelectField.tsx                # 选择字段组件
│   └── GenerateButton.tsx             # 生成按钮组件
├── hooks/
│   ├── useMailForm.ts                 # 表单状态管理Hook
│   ├── useMailGeneration.ts           # 邮件生成Hook
│   └── useMailCopy.ts                 # 复制功能Hook
├── services/
│   └── mail.service.ts                # 邮件生成服务
├── state/
│   ├── mail.store.ts                  # Zustand状态管理
│   └── mail.selectors.ts              # 状态选择器
├── types/
│   └── index.ts                       # 类型定义
├── utils/
│   ├── constants.ts                   # 常量定义
│   └── test-utils.ts                  # 测试工具
└── index.ts                           # 模块导出文件
```

## 快速开始

### 1. 基本使用

```typescript
import { MailPage } from '@/features/mail';

// 直接使用模块化页面
export default function MailPageWrapper() {
  return <MailPage />;
}
```

### 2. 组件复用

```typescript
import { MailForm, useMailForm } from '@/features/mail';

// 在其他页面复用组件
export function CustomMailForm() {
  const { field, validate } = useMailForm();
  
  return (
    <MailForm />
  );
}
```

### 3. 服务调用

```typescript
import { MailService } from '@/features/mail';

// 直接调用服务
const content = await MailService.generateMail({
  language: 'English',
  type: 'formal',
  content: 'Hello world',
  originalMail: '',
  mode: 'mail'
});
```

## API 参考

### 类型定义

#### MailFormData
```typescript
interface MailFormData {
  mail: string;                    // 邮件内容
  language: string;                // 输出语言
  replyTo: string;                 // 原始邮件内容
  reply: string;                   // 回复草稿
  replyLanguage: string;           // 回复语言
  replyType: string;               // 回复风格
}
```

#### GenerateMailParams
```typescript
interface GenerateMailParams {
  language: string;                // 输出语言
  type: string;                    // 邮件风格
  content: string;                 // 邮件内容
  originalMail: string;            // 原始邮件
  mode: 'mail' | 'reply';         // 模式
}
```

### Hooks

#### useMailForm
表单状态管理Hook，提供表单字段绑定、验证和重置功能。

```typescript
const { field, validate, reset, formData } = useMailForm();

// 字段绑定
const mailField = field('mail');

// 表单验证
const isValid = validate();

// 表单重置
reset();
```

#### useMailGeneration
邮件生成Hook，处理邮件生成逻辑和状态管理。

```typescript
const { generateMail, isLoading, error } = useMailGeneration();

// 生成邮件
await generateMail();
```

#### useMailCopy
复制功能Hook，处理内容复制和成功提示。

```typescript
const { copyContent, copySuccess, hasContent } = useMailCopy();

// 复制内容
await copyContent();
```

### 服务

#### MailService
邮件生成服务，封装API调用和业务逻辑。

```typescript
// 生成邮件
const content = await MailService.generateMail(params);

// 验证表单
const result = MailService.validateFormData(data, activeTab);

// 格式化内容
const formatted = MailService.formatMailContent(content);

// 复制到剪贴板
const success = await MailService.copyToClipboard(content);
```

### 状态管理

#### useMailStore
Zustand状态管理，提供全局状态和操作。

```typescript
const { 
  formData, 
  activeTab, 
  isLoading, 
  generatedContent,
  setActiveTab,
  updateFormData,
  setGeneratedContent,
  setLoading,
  setError,
  resetForm
} = useMailStore();
```

#### 选择器
提供精确的状态订阅，优化性能。

```typescript
const formData = useFormData();
const activeTab = useActiveTab();
const isLoading = useIsLoading();
const canGenerate = useCanGenerateMail();
const isFormValid = useIsFormValid();
const hasContent = useHasGeneratedContent();
```

## 配置选项

### 语言选项
- `'both English and Chinese'` - 双语模式
- `'English'` - 英文模式
- `'Chinese'` - 中文模式

### 邮件风格
- `'formal'` - 正式 📝
- `'professional'` - 专业 💼
- `'friendly'` - 友好 👋
- `'concise'` - 简洁 ⚡️
- `'detailed'` - 详细 📋
- `'informal'` - 非正式 😊
- `'inspirational'` - 激励 ✨

## 测试

### 测试工具
```typescript
import { 
  createTestFormData, 
  createTestGenerateParams, 
  validateMailContent,
  mockApiResponse 
} from '@/features/mail';

// 创建测试数据
const testData = createTestFormData();
const testParams = createTestGenerateParams();

// 验证邮件内容
const isValid = validateMailContent(content);

// 模拟API响应
const mockResponse = mockApiResponse(true);
```

## 错误处理

模块提供完善的错误处理机制：

1. **API错误**: 网络请求失败、超时等
2. **验证错误**: 表单数据验证失败
3. **用户错误**: 用户操作错误
4. **系统错误**: 系统内部错误

所有错误都会显示友好的错误信息给用户。

## 性能优化

1. **状态选择器**: 精确的状态订阅，减少重渲染
2. **组件拆分**: 小组件设计，提高渲染效率
3. **懒加载**: 按需加载组件和功能
4. **缓存**: 状态持久化，避免重复请求

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 贡献指南

1. 遵循现有的代码风格和架构
2. 添加适当的类型定义
3. 编写测试用例
4. 更新文档

## 许可证

MIT License
