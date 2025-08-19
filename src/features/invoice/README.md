# 发票模块 (Invoice Feature)

## 模块化状态：✅ 完全模块化

发票模块已经完全模块化，所有相关功能都集中在 `src/features/invoice` 目录下。

## 目录结构

```
src/features/invoice/
├── app/
│   └── InvoicePage.tsx          # 主页面组件
├── components/
│   ├── CustomerSection.tsx      # 客户信息组件
│   ├── InvoiceActions.tsx       # 操作按钮组件
│   ├── InvoiceInfoCompact.tsx   # 发票信息紧凑组件
│   ├── ItemsTable.tsx           # 商品表格组件
│   ├── PaymentTermsSection.tsx  # 付款条款组件
│   ├── SettingsPanel.tsx        # 设置面板组件
│   ├── QuickImport.tsx          # 快速导入组件
│   ├── ImportDataButton.tsx     # 导入数据按钮
│   └── ColumnToggle.tsx         # 列切换组件
├── hooks/
│   ├── useInvoiceForm.ts        # 表单逻辑Hook
│   └── usePasteImport.ts        # 粘贴导入Hook
├── state/
│   └── invoice.store.ts         # Zustand状态管理
├── services/
│   ├── invoice.service.ts       # 发票服务
│   ├── pdf.service.ts           # PDF生成服务
│   └── excel.service.ts         # Excel导出服务
├── types/
│   └── index.ts                 # 类型定义
├── utils/
│   ├── calculations.ts          # 计算工具函数
│   ├── importUtils.ts           # 导入工具函数
│   └── keyboardNavigation.ts    # 键盘导航工具
├── constants/
│   └── settings.ts              # 常量定义
├── index.ts                     # 模块入口文件
└── README.md                    # 模块文档
```

## 主要功能

### 1. 发票创建和编辑
- 完整的发票表单
- 客户信息管理
- 商品行项目管理
- 其他费用管理

### 2. 数据导入
- 粘贴导入功能
- 快速导入预设
- 客户数据自动匹配

### 3. 导出功能
- PDF生成
- Excel导出
- 预览功能

### 4. 设置和配置
- 发票模板配置
- 显示选项设置
- 自定义单位管理

## 模块入口

主页面通过 `src/app/invoice/page.tsx` 访问，该文件只是一个简单的包装器：

```tsx
'use client';

import { InvoicePage } from '@/features/invoice';

export default function InvoicePageWrapper() {
  return <InvoicePage />;
}
```

## 状态管理

使用 Zustand 进行状态管理，主要状态包括：
- 发票数据
- 编辑模式
- 设置面板状态
- 预览状态
- 焦点单元格

## 类型定义

所有类型定义都在 `src/features/invoice/types/index.ts` 中，包括：
- `InvoiceData` - 发票数据结构
- `LineItem` - 商品行项目
- `OtherFee` - 其他费用
- `InvoiceTemplateConfig` - 模板配置

## 服务层

- **InvoiceService**: 发票数据的CRUD操作
- **PDFService**: PDF生成和预览
- **ExcelService**: Excel导出功能

## 工具函数

- **calculations.ts**: 金额计算、单位处理等
- **importUtils.ts**: 数据导入和解析
- **keyboardNavigation.ts**: 表格键盘导航

## 使用方式

```tsx
import { 
  InvoicePage, 
  useInvoiceStore, 
  InvoiceData 
} from '@/features/invoice';

// 使用状态
const { data, updateData } = useInvoiceStore();

// 使用类型
const invoiceData: InvoiceData = { ... };
```

## 模块化优势

1. **高内聚**: 所有发票相关功能集中在一个模块中
2. **低耦合**: 与其他模块的依赖最小化
3. **可维护性**: 清晰的目录结构和职责分离
4. **可扩展性**: 易于添加新功能
5. **可测试性**: 模块化的组件和服务便于单元测试

## 迁移完成

✅ 已删除重复的组件文件：
- `src/components/invoice/CustomerSection.tsx`
- `src/components/invoice/ItemsTable.tsx`
- `src/components/invoice/SettingsPanel.tsx`

✅ 已删除重复的类型定义：
- `src/types/invoice.ts`

✅ 已更新所有导入路径：
- 所有组件现在从 `@/features/invoice` 导入
- 所有类型现在从 `@/features/invoice` 导入

发票模块现在是一个完全自包含的功能模块，符合现代前端架构的最佳实践。
