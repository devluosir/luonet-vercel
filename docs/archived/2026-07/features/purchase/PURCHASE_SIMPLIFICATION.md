# Purchase 模块简化

## 简化目标

根据用户需求，将 Purchase 模块从复杂的功能界面简化为基础的简洁界面。

## 移除的复杂功能

### 1. 页面级功能
- ❌ 自动保存功能 (`usePurchaseAutosave`)
- ❌ 表单验证和错误提示
- ❌ 历史记录抽屉 (`HistoryDrawer`)
- ❌ 快捷操作面板 (`QuickActions`)
- ❌ 预览PDF按钮
- ❌ 用户会话集成
- ❌ 自动初始化日期和采购员信息

### 2. 选择器简化
- ❌ `useCanGeneratePdf` - 复杂的PDF生成条件检查
- ❌ `useValidationState` - 表单验证状态
- ✅ 保留 `useTotals` - 基础合计计算
- ✅ 保留 `usePdfPayload` - PDF数据准备

### 3. 界面元素
- ❌ 历史记录按钮
- ❌ 设置按钮
- ❌ 验证错误提示区域
- ❌ 预览PDF按钮
- ✅ 保留基础的生成PDF按钮

## 简化后的功能

### 核心功能
1. **供应商信息** - 基础供应商信息录入
2. **商品明细** - 添加、编辑、删除商品
3. **设置面板** - 基础设置（PO号、货币、日期等）
4. **银行信息** - 银行账户信息
5. **备注** - 订单备注
6. **订单汇总** - 显示商品数量和总金额
7. **生成PDF** - 基础PDF生成功能

### 界面布局
- 左侧：供应商信息、商品明细、备注
- 右侧：设置、银行信息、订单汇总
- 底部：生成PDF按钮

## 代码变更

### 主要文件修改
1. `src/features/purchase/app/PurchasePage.tsx` - 大幅简化
2. `src/features/purchase/state/purchase.selectors.ts` - 移除复杂选择器

### 移除的导入
```tsx
// 移除的复杂功能
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { History, Settings, Eye } from 'lucide-react';
import QuickActions from '../components/QuickActions';
import HistoryDrawer from '../components/HistoryDrawer';
import { useCanGeneratePdf, useValidationState } from '../state/purchase.selectors';
import { usePurchaseAutosave } from '../hooks/usePurchaseAutosave';
```

### 保留的核心功能
```tsx
// 保留的基础功能
import { useTotals } from '../state/purchase.selectors';
import { usePurchaseStore } from '../state/purchase.store';
import { usePurchasePdf } from '../hooks/usePurchasePdf';
```

## 用户体验改进

### 简化前
- 复杂的验证提示
- 多个操作按钮
- 历史记录管理
- 自动保存功能
- 快捷键支持

### 简化后
- 清晰的表单布局
- 单一的主要操作（生成PDF）
- 直观的数据展示
- 快速的数据录入

## 技术优势

1. **性能提升** - 减少了不必要的状态订阅和计算
2. **代码简化** - 移除了复杂的验证逻辑
3. **维护性** - 更少的代码意味着更少的bug
4. **用户体验** - 更直接的交互流程

## 保留的核心架构

- ✅ Zustand 状态管理
- ✅ 组件化架构
- ✅ PDF 生成功能
- ✅ 响应式设计
- ✅ 深色模式支持

简化完成时间：2025-01-08
