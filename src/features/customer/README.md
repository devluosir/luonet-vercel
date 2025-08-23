# 客户管理模块 (Customer Management Feature)

## 概述

客户管理模块是一个完整的Feature模块，负责管理客户、供应商和收货人信息。该模块采用了清晰的分层架构，实现了高内聚、低耦合的设计原则。

## 新增功能

### 🕒 时间轴功能
- **自动时间轴生成**: 从报价单、销售确认、装箱单、财务发票历史记录中自动提取时间轴事件
- **自定义时间节点**: 支持手动添加自定义事件，如会议、联系记录等
- **事件筛选和搜索**: 支持按类型、状态、关键词筛选时间轴事件
- **实时同步**: 监听历史记录变化，自动更新时间轴

### 📋 跟进管理功能
- **跟进记录管理**: 完整的跟进任务创建、编辑、完成功能
- **优先级管理**: 支持高、中、低优先级设置
- **到期提醒**: 即将到期和过期跟进的高亮显示
- **状态跟踪**: 待处理、已完成、已过期状态管理

### 👥 新客户跟进功能
- **自动识别**: 从历史记录中自动识别新客户
- **跟进阶段管理**: 初次联系、需求分析、方案制定、商务谈判、已关闭
- **统计信息**: 新客户数量、活跃客户、已关闭客户等统计
- **自动跟进任务**: 为新客户自动创建初始跟进任务

## 模块结构

```
src/features/customer/
├── app/
│   ├── CustomerPage.tsx          # 主页面组件
│   └── CustomerDetailPage.tsx    # 客户详情页面
├── components/
│   ├── CustomerList.tsx          # 客户列表组件
│   ├── SupplierList.tsx          # 供应商列表组件
│   ├── ConsigneeList.tsx         # 收货人列表组件
│   ├── CustomerForm.tsx          # 表单组件
│   ├── CustomerToolbar.tsx       # 工具栏组件
│   ├── CustomerTabs.tsx          # Tab切换组件
│   ├── CustomerModal.tsx         # 模态框组件
│   ├── CustomerTimeline.tsx      # 时间轴组件
│   ├── FollowUpManager.tsx       # 跟进管理组件
│   ├── NewCustomerTracker.tsx    # 新客户跟进组件
│   ├── CustomEventForm.tsx       # 自定义事件表单
│   └── index.ts                  # 组件导出文件
├── hooks/
│   ├── useCustomerData.ts        # 数据管理Hook
│   ├── useCustomerActions.ts     # 操作管理Hook
│   ├── useCustomerForm.ts        # 表单管理Hook
│   ├── useCustomerTimeline.ts    # 时间轴Hook
│   ├── useCustomerFollowUp.ts    # 跟进管理Hook
│   ├── useAutoSync.ts            # 自动同步Hook
│   ├── usePerformanceOptimization.ts # 性能优化Hook
│   └── index.ts                  # Hooks导出文件
├── services/
│   ├── customerService.ts        # 客户数据服务
│   ├── supplierService.ts        # 供应商数据服务
│   ├── consigneeService.ts       # 收货人数据服务
│   ├── timelineService.ts        # 时间轴服务
│   ├── autoTimelineService.ts    # 自动时间轴生成服务
│   ├── newCustomerService.ts     # 新客户识别服务
│   └── index.ts                  # 服务导出文件
├── types/
│   └── index.ts                  # 类型定义
├── __tests__/                    # 测试文件
│   ├── timelineService.test.ts   # 时间轴服务测试
│   └── CustomerTimeline.test.tsx # 时间轴组件测试
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

### 2. 时间轴功能
- **自动提取**: 从各模块历史记录中自动提取时间轴事件
- **事件类型**: 支持报价单、销售确认、装箱单、财务发票、自定义事件
- **事件状态**: 进行中、已完成、已取消
- **筛选搜索**: 支持按类型、状态、关键词筛选
- **实时同步**: 监听历史记录变化，自动更新时间轴

### 3. 跟进管理功能
- **跟进记录**: 创建、编辑、完成跟进任务
- **优先级**: 高、中、低优先级设置
- **到期管理**: 到期日期设置和提醒
- **状态跟踪**: 待处理、已完成、已过期状态
- **批量操作**: 支持批量完成跟进任务

### 4. 新客户跟进功能
- **自动识别**: 从历史记录中自动识别新客户
- **跟进阶段**: 初次联系、需求分析、方案制定、商务谈判、已关闭
- **统计信息**: 新客户数量、活跃客户、已关闭客户等统计
- **自动任务**: 为新客户自动创建初始跟进任务

### 5. 用户界面
- **Tab切换**: 支持客户、供应商、收货人、新客户跟进四个模块的切换
- **列表展示**: 表格形式展示数据，支持编辑和删除操作
- **详情页面**: 客户详情页面，包含时间轴和跟进记录
- **表单操作**: 统一的添加/编辑表单，支持所有字段的输入
- **工具栏**: 搜索、筛选、刷新、导入、导出等功能
- **模态框**: 弹窗形式的表单操作界面

### 6. 性能优化
- **自动同步**: 监听历史记录变化，自动更新时间轴和新客户数据
- **数据缓存**: 支持数据缓存和TTL管理
- **虚拟滚动**: 支持大量数据的虚拟滚动
- **防抖节流**: 搜索和筛选操作的防抖节流优化

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

### 4. 性能优化
- **自动同步**: 后台自动同步历史记录
- **数据缓存**: 智能缓存机制减少重复请求
- **虚拟滚动**: 支持大量数据的流畅滚动
- **防抖节流**: 优化用户交互性能

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
import { TimelineService, NewCustomerService } from '@/features/customer';

// 获取客户时间轴事件
const events = TimelineService.getEventsByCustomer('customer-name');

// 自动识别新客户
const newCustomers = NewCustomerService.autoDetectNewCustomers();
```

### 4. 使用Hooks
```typescript
import { useCustomerTimeline, useCustomerFollowUp } from '@/features/customer';

function MyComponent() {
  const { events, syncHistory } = useCustomerTimeline('customer-id');
  const { followUps, addFollowUp } = useCustomerFollowUp('customer-id');
  
  // 使用时间轴和跟进功能
}
```

## 测试

### 运行测试
```bash
# 运行所有测试
npm test

# 运行客户管理模块测试
npm test -- src/features/customer

# 运行特定测试文件
npm test -- src/features/customer/__tests__/timelineService.test.ts
```

### 测试覆盖
- **服务层测试**: 时间轴服务、新客户服务等
- **组件测试**: 时间轴组件、跟进管理组件等
- **Hook测试**: 自定义Hooks的功能测试
- **集成测试**: 模块间的集成测试

## 更新日志

### v2.0.0 (2024-01-15)
- ✅ **时间轴功能**: 完整的客户时间轴管理
- ✅ **跟进管理**: 客户跟进记录管理
- ✅ **新客户识别**: 自动识别和跟进新客户
- ✅ **自动同步**: 实时同步历史记录变化
- ✅ **性能优化**: 数据缓存和虚拟滚动
- ✅ **测试覆盖**: 完整的单元测试和组件测试

### v1.0.0 (2024-01-01)
- ✅ **基础客户管理**: 客户、供应商、收货人的增删改查
- ✅ **数据提取**: 从历史记录自动提取客户信息
- ✅ **用户界面**: 完整的用户界面和交互
- ✅ **数据持久化**: localStorage数据存储

## 贡献指南

欢迎提交Issue和Pull Request来改进客户管理模块。

## 许可证

MIT License
