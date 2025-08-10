# 采购页模块化分析报告

## 1. 当前采购页整体架构

### 1.1 文件结构概览
```
src/
├── app/purchase/
│   ├── page.tsx                    # 主页面组件 (615行)
│   ├── edit/[id]/page.tsx          # 编辑页面 (75行)
│   └── copy/[id]/page.tsx          # 复制页面 (82行)
├── components/purchase/
│   ├── SettingsPanel.tsx           # 设置面板组件 (74行)
│   ├── BankInfoSection.tsx         # 银行信息组件 (22行)
│   └── SupplierInfoSection.tsx     # 供应商信息组件 (319行)
├── types/purchase.ts               # 类型定义 (38行)
├── utils/
│   ├── purchaseHistory.ts          # 历史记录管理 (175行)
│   └── purchasePdfGenerator.ts     # PDF生成器 (457行)
└── hooks/usePdfGenerator.ts        # PDF生成Hook (35行)
```

### 1.2 核心功能模块

#### 1.2.1 主页面组件 (`src/app/purchase/page.tsx`)
**功能职责：**
- 采购订单数据的完整管理
- 表单渲染和用户交互
- PDF生成和预览
- 自动保存功能
- 编辑/新建模式切换

**主要状态管理：**
```typescript
const [data, setData] = useState<PurchaseOrderData>(defaultData);
const [isGenerating, setIsGenerating] = useState(false);
const [showSettings, setShowSettings] = useState(false);
const [editId, setEditId] = useState<string | undefined>(undefined);
const [showPreview, setShowPreview] = useState(false);
const [isEditMode, setIsEditMode] = useState(false);
```

**核心功能：**
- 数据初始化（从全局变量、草稿、默认数据）
- 用户信息自动填充
- 表单字段自动调整高度
- PDF生成进度显示
- 货币切换和银行信息切换

#### 1.2.2 供应商信息组件 (`src/components/purchase/SupplierInfoSection.tsx`)
**功能职责：**
- 供应商信息输入和管理
- 历史供应商自动补全
- 供应商数据智能筛选

**核心特性：**
- 从采购历史中提取供应商信息
- 实时搜索和筛选
- 点击外部区域关闭弹窗
- 供应商名称标准化处理

#### 1.2.3 设置面板组件 (`src/components/purchase/SettingsPanel.tsx`)
**功能职责：**
- 采购员选择（From字段）
- 印章类型选择
- 响应式布局设计

#### 1.2.4 银行信息组件 (`src/components/purchase/BankInfoSection.tsx`)
**功能职责：**
- 条件性显示银行开票信息
- 固定的公司银行信息展示

### 1.3 数据流架构

#### 1.3.1 数据类型定义 (`src/types/purchase.ts`)
```typescript
export interface PurchaseOrderData {
  // 基本信息
  attn: string;                    // 供应商信息
  ourRef: string;                  // 询价号码
  yourRef: string;                 // 报价号码
  orderNo: string;                 // 订单号
  date: string;                    // 采购订单日期
  supplierQuoteDate: string;       // 供应商报价日期
  
  // 供货范围和成交价格
  contractAmount: string;          // 合同金额
  projectSpecification: string;    // 项目规格描述
  
  // 付款条件
  paymentTerms: string;            // 付款条件
  
  // 发票要求
  invoiceRequirements: string;     // 发票要求
  
  // 交货信息
  deliveryInfo: string;            // 收货人信息
  orderNumbers: string;            // 客户订单号码
  
  // 其他设置
  showStamp: boolean;              // 是否显示印章
  showBank: boolean;               // 是否显示银行信息
  currency: 'USD' | 'EUR' | 'CNY'; // 货币类型
  stampType: 'none' | 'shanghai' | 'hongkong'; // 印章类型
  from: string;                    // 采购员
}
```

#### 1.3.2 历史记录管理 (`src/utils/purchaseHistory.ts`)
**核心功能：**
- 保存采购历史记录
- 获取和筛选历史记录
- 删除和更新记录
- 导入导出功能

**数据结构：**
```typescript
export interface PurchaseHistory {
  id: string;
  createdAt: string;
  updatedAt: string;
  supplierName: string;
  orderNo: string;
  totalAmount: number;
  currency: string;
  data: PurchaseOrderData;
}
```

### 1.4 PDF生成系统

#### 1.4.1 PDF生成器 (`src/utils/purchasePdfGenerator.ts`)
**功能特性：**
- 中文字体支持
- 印章图片嵌入
- 表头图片嵌入
- 自动分页处理
- 多货币支持

**生成内容：**
1. 表头和标题
2. 基本信息（左右两列布局）
3. 供货范围和成交价格
4. 付款条件
5. 发票要求（含银行信息）
6. 交货信息
7. 客户订单号码
8. 结尾确认语和印章

#### 1.4.2 PDF生成Hook (`src/hooks/usePdfGenerator.ts`)
**功能：**
- 动态导入PDF生成函数
- 统一的PDF生成接口

## 2. 当前架构问题分析

### 2.1 代码组织问题

#### 2.1.1 主页面组件过于庞大
- **问题：** `page.tsx` 文件615行，承担了过多职责
- **影响：** 维护困难，代码复用性差
- **具体表现：**
  - 状态管理、事件处理、UI渲染混在一起
  - 表单验证逻辑分散
  - 业务逻辑和UI逻辑耦合

#### 2.1.2 组件职责不清晰
- **问题：** 组件间依赖关系复杂
- **影响：** 组件复用性差，测试困难
- **具体表现：**
  - `SupplierInfoSection` 直接依赖历史记录工具
  - 主页面组件直接处理PDF生成逻辑
  - 设置面板组件与主数据状态耦合

### 2.2 状态管理问题

#### 2.2.1 状态分散
- **问题：** 状态管理分散在多个组件中
- **影响：** 状态同步困难，数据流不清晰
- **具体表现：**
  - 主页面管理核心数据状态
  - 子组件管理自己的局部状态
  - 全局变量用于编辑模式数据传递

#### 2.2.2 数据传递复杂
- **问题：** 通过props和全局变量混合传递数据
- **影响：** 数据流不透明，调试困难
- **具体表现：**
  - 编辑模式通过window全局变量传递数据
  - 组件间通过回调函数传递数据更新
  - 历史记录数据在多个地方重复处理

### 2.3 业务逻辑问题

#### 2.3.1 业务逻辑分散
- **问题：** 业务逻辑分散在UI组件中
- **影响：** 业务规则变更困难，测试覆盖不足
- **具体表现：**
  - 供应商信息处理逻辑在组件中
  - PDF生成逻辑在主页面中
  - 数据验证逻辑分散

#### 2.3.2 重复代码
- **问题：** 相似功能在不同地方重复实现
- **影响：** 维护成本高，一致性差
- **具体表现：**
  - 供应商信息处理在多个组件中重复
  - 历史记录操作逻辑重复
  - 表单验证逻辑重复

### 2.4 性能问题

#### 2.4.1 不必要的重渲染
- **问题：** 组件重渲染频繁
- **影响：** 用户体验差，性能下降
- **具体表现：**
  - 主页面状态变化导致整个表单重渲染
  - 供应商信息组件频繁重新计算
  - 设置面板组件不必要的更新

#### 2.4.2 内存泄漏风险
- **问题：** 事件监听器和定时器管理不当
- **影响：** 内存占用持续增长
- **具体表现：**
  - 自动保存定时器可能未正确清理
  - 事件监听器在组件卸载时未清理
  - 全局变量未及时清理

## 3. 模块化重构方案

### 3.1 架构设计原则

#### 3.1.1 分层架构
```
┌─────────────────────────────────────┐
│           Presentation Layer        │  ← UI组件层
├─────────────────────────────────────┤
│           Business Logic Layer      │  ← 业务逻辑层
├─────────────────────────────────────┤
│           Data Access Layer         │  ← 数据访问层
┌─────────────────────────────────────┐
```

#### 3.1.2 组件设计原则
- **单一职责原则：** 每个组件只负责一个功能
- **开闭原则：** 对扩展开放，对修改关闭
- **依赖倒置原则：** 依赖抽象而非具体实现

### 3.2 模块划分方案

#### 3.2.1 核心模块
```
src/features/purchase/
├── app/
│   └── PurchasePage.tsx              # 主页面容器
├── components/
│   ├── PurchaseForm.tsx              # 表单组件
│   ├── PurchaseHeader.tsx            # 页面头部
│   ├── PurchaseActions.tsx           # 操作按钮组
│   ├── sections/
│   │   ├── BasicInfoSection.tsx      # 基本信息区域
│   │   ├── ContractSection.tsx       # 合同信息区域
│   │   ├── PaymentSection.tsx        # 付款信息区域
│   │   ├── DeliverySection.tsx       # 交货信息区域
│   │   └── OrderNumbersSection.tsx   # 订单号码区域
│   └── settings/
│       ├── SettingsPanel.tsx         # 设置面板
│       ├── FromSelector.tsx          # 采购员选择器
│       └── StampSelector.tsx         # 印章选择器
├── hooks/
│   ├── usePurchaseForm.ts            # 表单状态管理
│   ├── usePurchaseValidation.ts      # 表单验证
│   ├── usePurchaseHistory.ts         # 历史记录管理
│   └── usePurchasePdf.ts             # PDF生成管理
├── services/
│   ├── purchase.service.ts           # 采购业务服务
│   ├── supplier.service.ts           # 供应商服务
│   └── pdf.service.ts                # PDF生成服务
├── state/
│   ├── purchase.store.ts             # 状态管理
│   ├── purchase.selectors.ts         # 状态选择器
│   └── purchase.actions.ts           # 状态操作
├── types/
│   └── index.ts                      # 类型定义
└── utils/
    ├── purchase.utils.ts             # 工具函数
    ├── validation.utils.ts           # 验证工具
    └── formatters.utils.ts           # 格式化工具
```

#### 3.2.2 共享模块
```
src/shared/
├── components/
│   ├── FormField.tsx                 # 通用表单字段
│   ├── CurrencySelector.tsx          # 货币选择器
│   └── BankInfoDisplay.tsx           # 银行信息显示
├── hooks/
│   ├── useAutoSave.ts                # 自动保存Hook
│   ├── useAutoResize.ts              # 自动调整大小Hook
│   └── useLocalStorage.ts            # 本地存储Hook
├── services/
│   ├── history.service.ts            # 历史记录服务
│   └── pdf.service.ts                # PDF服务
└── utils/
    ├── constants.ts                  # 常量定义
    ├── formatters.ts                 # 格式化工具
    └── validators.ts                 # 验证工具
```

### 3.3 状态管理方案

#### 3.3.1 状态结构设计
```typescript
interface PurchaseState {
  // 表单数据
  form: {
    data: PurchaseOrderData;
    isDirty: boolean;
    isValid: boolean;
    errors: Record<string, string>;
  };
  
  // UI状态
  ui: {
    isGenerating: boolean;
    showSettings: boolean;
    showPreview: boolean;
    generatingProgress: number;
  };
  
  // 业务状态
  business: {
    isEditMode: boolean;
    editId?: string;
    hasUnsavedChanges: boolean;
  };
  
  // 历史记录
  history: {
    items: PurchaseHistory[];
    loading: boolean;
    error?: string;
  };
}
```

#### 3.3.2 状态管理工具
- **推荐：** Zustand（轻量级状态管理）
- **备选：** Redux Toolkit（复杂状态管理）
- **优势：** 
  - 类型安全
  - 开发工具支持
  - 性能优化
  - 易于测试

### 3.4 业务逻辑分离

#### 3.4.1 服务层设计
```typescript
// 采购业务服务
class PurchaseService {
  // 数据操作
  async save(data: PurchaseOrderData, id?: string): Promise<PurchaseHistory>;
  async load(id: string): Promise<PurchaseOrderData>;
  async delete(id: string): Promise<boolean>;
  
  // 业务逻辑
  validate(data: PurchaseOrderData): ValidationResult;
  calculateAmount(data: PurchaseOrderData): number;
  generateOrderNumber(): string;
}

// 供应商服务
class SupplierService {
  async getSuppliers(): Promise<Supplier[]>;
  async searchSuppliers(query: string): Promise<Supplier[]>;
  async saveSupplier(supplier: Supplier): Promise<void>;
}

// PDF服务
class PdfService {
  async generate(data: PurchaseOrderData, options?: PdfOptions): Promise<Blob>;
  async preview(data: PurchaseOrderData): Promise<Blob>;
}
```

#### 3.4.2 Hook层设计
```typescript
// 表单状态管理Hook
export function usePurchaseForm() {
  // 表单数据管理
  // 验证逻辑
  // 自动保存
  // 数据同步
}

// 历史记录管理Hook
export function usePurchaseHistory() {
  // 历史记录加载
  // 搜索和筛选
  // 导入导出
}

// PDF生成管理Hook
export function usePurchasePdf() {
  // PDF生成
  // 预览功能
  // 进度管理
}
```

### 3.5 组件重构方案

#### 3.5.1 主页面组件重构
```typescript
// 重构前：615行，职责混乱
export default function PurchaseOrderPage() {
  // 状态管理、事件处理、UI渲染混在一起
}

// 重构后：职责清晰，代码简洁
export default function PurchasePage() {
  const { data, actions } = usePurchaseForm();
  const { isGenerating, generatePdf } = usePurchasePdf();
  
  return (
    <div className="purchase-page">
      <PurchaseHeader />
      <PurchaseForm data={data} onChange={actions.updateData} />
      <PurchaseActions 
        onGenerate={generatePdf}
        isGenerating={isGenerating}
      />
    </div>
  );
}
```

#### 3.5.2 表单组件重构
```typescript
// 将表单拆分为多个区域组件
export function PurchaseForm({ data, onChange }) {
  return (
    <form className="purchase-form">
      <BasicInfoSection data={data} onChange={onChange} />
      <ContractSection data={data} onChange={onChange} />
      <PaymentSection data={data} onChange={onChange} />
      <DeliverySection data={data} onChange={onChange} />
      <OrderNumbersSection data={data} onChange={onChange} />
    </form>
  );
}
```

### 3.6 性能优化方案

#### 3.6.1 组件优化
- **React.memo：** 避免不必要的重渲染
- **useMemo/useCallback：** 缓存计算结果和函数
- **虚拟滚动：** 历史记录列表优化
- **懒加载：** 非关键组件延迟加载

#### 3.6.2 状态优化
- **状态分片：** 将大状态拆分为小状态
- **选择器优化：** 精确订阅状态变化
- **批量更新：** 减少状态更新频率

#### 3.6.3 资源优化
- **代码分割：** 按路由和功能分割代码
- **资源预加载：** 关键资源提前加载
- **缓存策略：** 合理使用缓存

## 4. 实施计划

### 4.1 阶段划分

#### 阶段一：基础架构搭建（1-2周）
- [ ] 创建新的目录结构
- [ ] 设置状态管理工具
- [ ] 创建基础类型定义
- [ ] 搭建服务层框架

#### 阶段二：核心功能迁移（2-3周）
- [ ] 迁移表单组件
- [ ] 迁移业务逻辑
- [ ] 迁移PDF生成功能
- [ ] 迁移历史记录功能

#### 阶段三：组件优化（1-2周）
- [ ] 组件拆分和重构
- [ ] 性能优化
- [ ] 代码清理
- [ ] 测试覆盖

#### 阶段四：集成测试（1周）
- [ ] 功能测试
- [ ] 性能测试
- [ ] 兼容性测试
- [ ] 文档更新

### 4.2 风险控制

#### 4.2.1 技术风险
- **风险：** 重构过程中功能丢失
- **控制：** 逐步迁移，保持原有功能可用
- **措施：** 单元测试覆盖，功能回归测试

#### 4.2.2 时间风险
- **风险：** 重构时间超出预期
- **控制：** 分阶段实施，优先级排序
- **措施：** 里程碑检查，及时调整计划

#### 4.2.3 质量风险
- **风险：** 代码质量下降
- **控制：** 代码审查，自动化测试
- **措施：** 持续集成，质量门禁

### 4.3 成功标准

#### 4.3.1 功能标准
- [ ] 所有原有功能正常工作
- [ ] 新增功能按需求实现
- [ ] 用户体验无明显下降

#### 4.3.2 技术标准
- [ ] 代码行数减少30%以上
- [ ] 组件复用性提高50%以上
- [ ] 测试覆盖率达到80%以上
- [ ] 性能指标无明显下降

#### 4.3.3 维护标准
- [ ] 代码结构清晰，易于理解
- [ ] 文档完整，便于维护
- [ ] 扩展性好，便于功能添加

## 5. 总结

当前采购页存在代码组织混乱、职责不清、性能问题等架构问题。通过模块化重构，可以显著提升代码质量、可维护性和可扩展性。

重构方案采用分层架构设计，将业务逻辑、UI组件、数据访问分离，使用现代化的状态管理工具，实现组件的高内聚、低耦合。

实施计划分四个阶段，确保重构过程可控、风险最小化。通过重构，预期能够提升开发效率、降低维护成本、提高系统稳定性。
