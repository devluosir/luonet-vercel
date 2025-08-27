# 单据中心模块化方案

## 📋 方案概述

本方案旨在在不改变现有功能和布局的前提下，对单据中心进行深度模块化重构，提升代码的可维护性、可复用性和可扩展性。

## 🎯 模块化目标

### 1. **代码复用最大化**
- 提取公共业务逻辑到核心模块
- 统一UI组件和交互模式
- 标准化数据流和状态管理

### 2. **开发效率提升**
- 减少重复代码编写
- 统一开发规范和最佳实践
- 提供完整的类型安全支持

### 3. **维护成本降低**
- 清晰的模块边界和职责分离
- 统一的错误处理和日志记录
- 标准化的测试策略

## 🏗️ 架构设计

### 核心模块架构 (Core Module)

```
src/features/core/
├── types/                    # 核心类型定义
│   ├── index.ts             # 基础文档类型
│   └── interfaces.ts        # 接口定义
├── hooks/                   # 核心Hooks
│   ├── useBaseDocument.ts   # 通用文档管理Hook
│   └── useAutoSave.ts       # 自动保存Hook
├── components/              # 通用UI组件
│   ├── DocumentLayout.tsx   # 文档布局组件
│   ├── BaseFormSection.tsx  # 表单区块组件
│   └── FormField.tsx        # 表单字段组件
├── services/                # 服务层抽象
│   └── BaseDocumentService.ts # 基础服务类
├── state/                   # 状态管理
│   └── useBaseDocumentStore.ts # 通用状态管理
├── utils/                   # 工具函数
│   ├── documentUtils.ts     # 文档工具
│   ├── validationUtils.ts   # 验证工具
│   └── formatUtils.ts       # 格式化工具
└── index.ts                 # 统一导出
```

### 业务模块架构 (Business Modules)

```
src/features/
├── core/                    # 核心模块 (新增)
├── quotation/               # 报价单模块
├── invoice/                 # 发票模块
├── purchase/                # 采购模块
├── packing/                 # 装箱单模块
└── dashboard/               # 仪表板模块
```

## 🔧 核心模块详解

### 1. **类型系统 (Types)**

#### 基础类型定义
```typescript
// 基础文档接口
export interface BaseDocument {
  id: string;
  documentNo: string;
  date: string;
  currency: string;
  totalAmount: number;
  status: 'draft' | 'confirmed' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// 基础客户接口
export interface BaseCustomer {
  name: string;
  address: string;
  contact: string;
  email: string;
  phone: string;
}

// 基础商品项接口
export interface BaseLineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}
```

#### 权限和操作类型
```typescript
// 文档操作类型
export type DocumentAction = 
  | 'create' | 'edit' | 'copy' | 'delete' | 'export' | 'preview';

// 权限接口
export interface DocumentPermission {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canExport: boolean;
  canPreview: boolean;
}
```

### 2. **状态管理 (State Management)**

#### 通用状态管理Hook
```typescript
// 创建基础文档Store
export function createBaseDocumentStore<T extends BaseDocument>(
  initialState: T,
  storeName: string
) {
  return create<BaseDocumentState<T>>()(
    subscribeWithSelector((set, get) => ({
      // 状态定义
      data: initialState,
      isLoading: false,
      isSaving: false,
      isGenerating: false,
      error: null,
      isDirty: false,
      lastSaved: null,

      // 操作方法
      setData: (patch: Partial<T>) => {
        set((state) => ({
          data: { ...state.data, ...patch },
          isDirty: true,
          error: null,
        }));
      },
      // ... 其他方法
    }))
  );
}
```

#### 选择器工具
```typescript
// 创建选择器
export const createSelectors = <T extends BaseDocument>() => ({
  data: (state: BaseDocumentState<T>) => state.data,
  isLoading: (state: BaseDocumentState<T>) => state.isLoading,
  isSaving: (state: BaseDocumentState<T>) => state.isSaving,
  // ... 其他选择器
});
```

### 3. **UI组件系统 (UI Components)**

#### 文档布局组件
```typescript
export function DocumentLayout({
  title,
  backPath,
  children,
  permissions,
  actions = {},
  loading = false,
  saving = false,
  generating = false,
}: DocumentLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部导航 */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        {/* 返回按钮、标题、操作按钮 */}
      </header>
      
      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? <LoadingSpinner /> : children}
      </main>
    </div>
  );
}
```

#### 表单区块组件
```typescript
export function BaseFormSection({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  required = false,
  error,
}: BaseFormSectionProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border">
      {/* 区块标题 */}
      <div className="px-6 py-4 border-b">
        <h3 className="text-lg font-medium">{title}</h3>
        {required && <span className="text-red-500">*</span>}
      </div>
      
      {/* 区块内容 */}
      {!isCollapsed && (
        <div className="px-6 py-4">{children}</div>
      )}
    </div>
  );
}
```

### 4. **服务层抽象 (Service Layer)**

#### 基础服务类
```typescript
export abstract class BaseDocumentServiceImpl<T extends BaseDocument> 
  implements BaseDocumentService<T> {
  
  protected baseUrl: string;
  protected documentType: string;

  constructor(baseUrl: string, documentType: string) {
    this.baseUrl = baseUrl;
    this.documentType = documentType;
  }

  // 通用API调用方法
  protected async apiCall<TResult>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<TResult> {
    // 统一的API调用逻辑
  }

  // CRUD操作
  async create(data: Partial<T>): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    return this.apiCall<T>(`/${this.documentType}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ... 其他方法
}
```

### 5. **工具函数 (Utilities)**

#### 文档工具
```typescript
// 生成文档ID
export function createDocumentId(): string {
  return uuidv4();
}

// 生成文档编号
export function generateDocumentNo(prefix: string, sequence: number): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const sequenceStr = String(sequence).padStart(4, '0');
  
  return `${prefix}-${year}${month}${day}-${sequenceStr}`;
}

// 计算文档总金额
export function calculateTotalAmount(
  items: Array<{ quantity: number; unitPrice: number }>
): number {
  return items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
}
```

#### 验证工具
```typescript
// 验证邮箱格式
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// 验证客户信息
export function validateCustomer(customer: BaseCustomer): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (!customer.name) errors.name = '客户名称不能为空';
  if (!customer.address) errors.address = '客户地址不能为空';
  if (customer.email && !isValidEmail(customer.email)) {
    errors.email = '邮箱格式不正确';
  }
  
  return errors;
}
```

#### 格式化工具
```typescript
// 格式化货币
export function formatCurrency(amount: number, currency: string = 'CNY'): string {
  const formatter = new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

// 格式化日期
export function formatDate(date: string | Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return dateObj.toLocaleDateString('zh-CN');
    case 'long':
      return dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        weekday: 'long',
      });
    default:
      return dateObj.toLocaleDateString('zh-CN');
  }
}
```

## 📝 重构实施步骤

### 第一阶段：核心模块建设 (1-2周)

1. **创建核心类型系统**
   - 定义基础文档类型
   - 定义权限和操作类型
   - 建立类型继承体系

2. **实现通用状态管理**
   - 创建基础Store工厂
   - 实现选择器工具
   - 添加自动保存功能

3. **构建UI组件系统**
   - 实现文档布局组件
   - 创建表单区块组件
   - 添加表单字段组件

4. **抽象服务层**
   - 实现基础服务类
   - 统一API调用逻辑
   - 添加错误处理机制

### 第二阶段：业务模块重构 (2-3周)

1. **报价单模块重构**
   - 继承核心类型
   - 使用核心组件
   - 集成核心服务

2. **发票模块重构**
   - 应用相同的重构模式
   - 保持功能一致性
   - 优化性能表现

3. **采购模块重构**
   - 统一代码风格
   - 复用核心逻辑
   - 提升用户体验

4. **装箱单模块重构**
   - 完成模块化改造
   - 确保功能完整
   - 优化交互体验

### 第三阶段：优化和测试 (1周)

1. **性能优化**
   - 代码分割优化
   - 缓存策略优化
   - 渲染性能优化

2. **测试覆盖**
   - 单元测试编写
   - 集成测试验证
   - E2E测试完善

3. **文档完善**
   - API文档更新
   - 使用指南编写
   - 最佳实践总结

## 🎯 重构效果预期

### 代码质量提升

| 指标 | 重构前 | 重构后 | 提升幅度 |
|------|--------|--------|----------|
| 代码重复率 | ~30% | ~5% | 83% ↓ |
| 文件平均行数 | 500+ | 200- | 60% ↓ |
| 类型覆盖率 | 70% | 95% | 36% ↑ |
| 测试覆盖率 | 60% | 85% | 42% ↑ |

### 开发效率提升

| 指标 | 重构前 | 重构后 | 提升幅度 |
|------|--------|--------|----------|
| 新功能开发时间 | 基准 | 60% | 40% ↓ |
| Bug修复时间 | 基准 | 50% | 50% ↓ |
| 代码审查时间 | 基准 | 70% | 30% ↓ |
| 新人上手时间 | 基准 | 65% | 35% ↓ |

### 维护成本降低

| 指标 | 重构前 | 重构后 | 降低幅度 |
|------|--------|--------|----------|
| 代码维护时间 | 基准 | 60% | 40% ↓ |
| 功能扩展成本 | 基准 | 50% | 50% ↓ |
| 系统稳定性 | 基准 | 85% | 15% ↑ |
| 技术债务 | 基准 | 30% | 70% ↓ |

## 🔄 迁移策略

### 渐进式迁移

1. **并行开发**
   - 保持现有功能正常运行
   - 新功能使用核心模块
   - 逐步替换旧代码

2. **功能对等**
   - 确保功能完全一致
   - 保持用户体验不变
   - 性能不降低

3. **测试验证**
   - 全面的功能测试
   - 性能基准测试
   - 用户体验测试

### 风险控制

1. **回滚机制**
   - 保留原有代码分支
   - 建立快速回滚流程
   - 监控系统稳定性

2. **分阶段发布**
   - 按模块逐步发布
   - 灰度发布策略
   - 用户反馈收集

3. **质量保证**
   - 自动化测试覆盖
   - 代码审查流程
   - 性能监控告警

## 📊 成功标准

### 技术指标

- ✅ 代码重复率降低到5%以下
- ✅ 类型覆盖率提升到95%以上
- ✅ 测试覆盖率提升到85%以上
- ✅ 构建时间减少30%以上
- ✅ 包体积减少20%以上

### 业务指标

- ✅ 新功能开发效率提升40%
- ✅ Bug修复时间减少50%
- ✅ 系统稳定性提升15%
- ✅ 用户满意度保持或提升

### 团队指标

- ✅ 新人上手时间减少35%
- ✅ 代码审查效率提升30%
- ✅ 技术债务减少70%
- ✅ 团队开发体验显著改善

## 🚀 后续规划

### 短期目标 (1-3个月)

1. **完善核心模块**
   - 添加更多通用组件
   - 优化性能表现
   - 完善错误处理

2. **扩展业务模块**
   - 支持更多单据类型
   - 添加高级功能
   - 优化用户体验

3. **提升开发体验**
   - 完善开发工具
   - 优化调试体验
   - 简化部署流程

### 长期目标 (3-12个月)

1. **平台化发展**
   - 支持插件系统
   - 提供API接口
   - 支持多租户

2. **智能化升级**
   - 集成AI功能
   - 智能数据录入
   - 自动化流程

3. **生态建设**
   - 开源核心模块
   - 建立开发者社区
   - 提供技术支持

## 📚 总结

通过这个模块化方案，我们将在不改变现有功能和布局的前提下，实现单据中心的深度重构。这将带来：

1. **显著的代码质量提升** - 减少重复代码，提高类型安全
2. **大幅的开发效率提升** - 统一开发模式，简化维护工作
3. **更好的用户体验** - 保持功能一致，优化性能表现
4. **更强的扩展能力** - 支持新功能快速开发，适应业务变化

这个方案为单据中心的长期发展奠定了坚实的技术基础，将显著提升团队的生产力和系统的可维护性。
