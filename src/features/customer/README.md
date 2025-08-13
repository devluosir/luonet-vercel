# 客户管理模块 (Customer Management Feature)

## 概述

客户管理模块是一个完整的Feature模块，负责管理客户、供应商和收货人信息。该模块采用了清晰的分层架构，实现了高内聚、低耦合的设计原则。

## 模块结构

```
src/features/customer/
├── app/
│   └── CustomerPage.tsx          # 主页面组件
├── components/
│   ├── CustomerList.tsx          # 客户列表组件
│   ├── SupplierList.tsx          # 供应商列表组件
│   ├── ConsigneeList.tsx         # 收货人列表组件
│   ├── CustomerForm.tsx          # 表单组件
│   ├── CustomerToolbar.tsx       # 工具栏组件
│   ├── CustomerTabs.tsx          # Tab切换组件
│   ├── CustomerModal.tsx         # 模态框组件
│   └── index.ts                  # 组件导出文件
├── hooks/
│   ├── useCustomerData.ts        # 数据管理Hook
│   ├── useCustomerActions.ts     # 操作管理Hook
│   ├── useCustomerForm.ts        # 表单管理Hook
│   └── index.ts                  # Hooks导出文件
├── services/
│   ├── customerService.ts        # 客户数据服务
│   ├── supplierService.ts        # 供应商数据服务
│   ├── consigneeService.ts       # 收货人数据服务
│   └── index.ts                  # 服务导出文件
├── types/
│   └── index.ts                  # 类型定义
├── index.ts                      # 模块主导出文件
└── README.md                     # 本文档
```

## 核心功能

### 1. 数据管理
- **客户管理**: 从报价单、发票、装箱单历史记录中自动提取客户信息
- **供应商管理**: 从采购单历史记录中自动提取供应商信息
- **收货人管理**: 从装箱单历史记录中自动提取收货人信息
- **数据持久化**: 使用localStorage进行数据存储
- **数据合并**: 自动合并历史记录和手动保存的数据，避免重复

### 2. 用户界面
- **Tab切换**: 支持客户、供应商、收货人三个模块的切换
- **列表展示**: 表格形式展示数据，支持编辑和删除操作
- **表单操作**: 统一的添加/编辑表单，支持所有字段的输入
- **工具栏**: 搜索、筛选、刷新、导入、导出等功能
- **模态框**: 弹窗形式的表单操作界面

### 3. 业务逻辑
- **历史记录保护**: 编辑时检查是否影响历史记录，提供警告提示
- **数据验证**: 表单验证和业务规则检查
- **错误处理**: 完善的错误处理和用户提示
- **状态管理**: 使用React Hooks进行状态管理

## 技术特点

### 1. 模块化设计
- **Feature-based架构**: 按功能模块组织代码
- **组件化**: 每个UI元素都是独立的组件
- **服务层**: 数据操作逻辑封装在服务层
- **Hooks**: 业务逻辑封装在自定义Hooks中

### 2. 类型安全
- **TypeScript**: 完整的类型定义
- **接口定义**: 清晰的数据结构定义
- **类型导出**: 统一的类型导出管理

### 3. 可维护性
- **单一职责**: 每个文件只负责一个功能
- **依赖注入**: 通过props传递依赖
- **可测试性**: 组件和服务都可以独立测试
- **可扩展性**: 易于添加新功能和修改现有功能

## 使用方法

### 1. 导入模块
```typescript
import { CustomerPage } from '@/features/customer';
```

### 2. 使用组件
```typescript
// 在页面中使用
export default function MyPage() {
  return <CustomerPage />;
}
```

### 3. 使用服务
```typescript
import { customerService } from '@/features/customer';

// 获取所有客户
const customers = customerService.getAllCustomers();

// 保存客户
customerService.saveCustomer(customerData);
```

### 4. 使用Hooks
```typescript
import { useCustomerData } from '@/features/customer';

function MyComponent() {
  const { customers, isLoading, refreshData } = useCustomerData();
  
  return (
    <div>
      {isLoading ? '加载中...' : `${customers.length} 个客户`}
    </div>
  );
}
```

## 数据流

```
用户操作 → 组件 → Hooks → 服务 → localStorage
    ↑                                    ↓
    ←────────── 状态更新 ←───────────────┘
```

## 扩展指南

### 1. 添加新字段
1. 在 `types/index.ts` 中更新接口定义
2. 在 `components/CustomerForm.tsx` 中添加表单字段
3. 在服务层更新数据处理逻辑

### 2. 添加新功能
1. 在 `components/` 中创建新组件
2. 在 `hooks/` 中添加相关逻辑
3. 在 `services/` 中添加数据处理
4. 更新导出文件

### 3. 修改UI样式
1. 直接修改组件的className
2. 或创建新的样式组件
3. 保持组件的可复用性

## 最佳实践

1. **保持组件纯函数**: 组件只负责渲染，业务逻辑放在Hooks中
2. **使用TypeScript**: 充分利用类型系统，提高代码质量
3. **错误处理**: 所有异步操作都要有错误处理
4. **性能优化**: 使用React.memo、useMemo等优化性能
5. **代码复用**: 提取公共逻辑到Hooks或服务中

## 注意事项

1. **数据一致性**: 确保历史记录和当前数据的一致性
2. **用户体验**: 提供清晰的反馈和确认对话框
3. **数据安全**: 敏感操作需要用户确认
4. **性能考虑**: 大量数据时考虑分页或虚拟滚动
