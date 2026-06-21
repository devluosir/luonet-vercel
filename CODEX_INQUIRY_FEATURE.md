# 询报价登记功能 — 实现参考文档

> 本文件记录已落地的实现现状，供后续迭代或 Codex 修改时快速定位。
> 原始任务指令已完成，不再作为执行规格使用。
> 最后更新：2026-06-20

---

## 文件结构

```
src/
├── app/inquiry/page.tsx                      # Next.js 页面入口
└── features/inquiry/
    ├── app/InquiryPage.tsx                   # 功能主页面（新增按钮 + 弹窗 + 表格）
    ├── components/
    │   ├── InquiryTable.tsx                  # 表格外壳 + 表头
    │   ├── InquiryRow.tsx                    # 单行记录（group hover）
    │   ├── InquiryQuoteStatus.tsx            # 供应商 + 已报价 inline 状态栏
    │   ├── SupplierStatusTag.tsx             # 单个供应商标签
    │   ├── QuotedStatusList.tsx              # 已报价 Fragment 列表
    │   └── InquiryFormModal.tsx             # 新增/编辑基本信息弹窗
    ├── hooks/useInquiryActions.ts            # CRUD 操作封装（默认供应商在此定义）
    ├── services/inquiry.service.ts           # localStorage 存取
    ├── state/inquiry.store.ts               # Zustand store
    ├── types/index.ts                        # TypeScript 类型
    └── utils/inquiryUtils.ts                # 工具函数（见下）
```

---

## 类型定义（types/index.ts）

```typescript
export type SupplierStatus = 'pending' | 'quoted' | 'unavailable' | 'need_info';

export interface SupplierQuoteStatus {
  id: string;
  supplierShortName: string;
  quoteDate?: string;       // 存储格式 [m.D]，如 [6.20]
  status?: SupplierStatus;
}

export interface CustomerQuoteStatus {
  id: string;
  quoteDate: string;        // 存储格式 [m.D]
  supplierShortName: string;
  version: string;          // 如 a, b, c...
}

export interface InquiryRecord {
  id: string;
  inquiryDate: string;      // [m.D]
  inquiryNo: string;        // C[YYmmDD][后缀]，如 C260620F
  inquirer: string;
  customerNo: string;
  description: string;
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
  updatedAt: string;
}
```

---

## 工具函数（utils/inquiryUtils.ts）

| 函数 | 说明 |
|------|------|
| `formatShortDate(date)` | `Date` → `[m.D]`（存储用） |
| `stripDateBrackets(date)` | `[6.20]` → `6.20`（日期列 / 已报价标签显示用） |
| `roundDateBrackets(date)` | `[6.20]` → `(6.20)`（供应商标签显示用） |
| `generateNextInquiryNo(date, existingNos)` | 当天下一个可用询价编号 |
| `INQUIRY_SUFFIX_SEQUENCE` | `F,G,H,J…Z,ZA…`（跳过 I、O） |
| `getSupplierStatusClass(supplier)` | 返回 Tailwind 颜色类（switch 判断，见下） |
| `getRecordColorState(record)` | 整行主色：有已报价→蓝，否则→粉红 |
| `getNextQuoteVersion(statuses)` | 返回下一个版本字母 `a,b,c…` |
| `createId()` | nanoid() |

### 供应商颜色规则（switch 优先于日期）

```typescript
switch (supplier.status) {
  case 'quoted':      return 'text-blue-600';
  case 'unavailable': return 'text-gray-400';
  case 'need_info':   return 'text-yellow-500';
  default:            return 'text-pink-500';  // pending / 未设置
}
```

---

## 核心交互规则

### 状态 / 日期联动

| 操作 | 效果 |
|------|------|
| 切换状态为 `pending` | 清空 quoteDate，输入框 disabled |
| 切换状态为非 pending 且日期为空 | 自动填入今天 `formatShortDate(new Date())` |
| 在 `pending` 状态下填入日期 | 自动切换状态为 `quoted` |

### hover 可见性

`<tr class="group">` → 子按钮加 `opacity-0 group-hover:opacity-100 transition-opacity`：

- 编辑按钮（询价编号后面的 ✏️）
- `+ 供应商` 按钮
- 供应商标签 × 删除按钮
- 已报价标签 🗑 删除按钮
- `+ 已报价` 按钮

### 删除确认

供应商删除和已报价删除均弹 `window.confirm`，提示文案包含名称。

### 已报价供应商过滤

已报价表单的供应商下拉，只显示 `status === 'quoted' && !!quoteDate` 的供应商：

```typescript
record.supplierStatuses
  .filter((s) => s.status === 'quoted' && !!s.quoteDate)
  .map((s) => s.supplierShortName)
```

### QuotedStatusList 返回 Fragment

`QuotedStatusList` 直接返回 `<Fragment>`，标签与供应商标签在同一 flex 容器内横排，不产生额外 div 层级。

---

## 新记录默认供应商

在 `hooks/useInquiryActions.ts` 的 `createRecord` 中：

```typescript
supplierStatuses: [
  { id: createId(), supplierShortName: '飞罗', status: 'pending' },
  { id: createId(), supplierShortName: '昆同', status: 'pending' },
],
```

store 的 `addRecord` 也对 `supplierStatuses` 做 `id: s.id || createId()` 兜底。

---

## Tailwind 配置注意

`tailwind.config.ts` 的 `content` 数组必须包含：

```ts
"./src/features/**/*.{js,ts,jsx,tsx,mdx}",
"./src/hooks/**/*.{js,ts,jsx,tsx,mdx}",
"./src/utils/**/*.{js,ts,jsx,tsx,mdx}",
```

`safelist` 需包含动态拼接的颜色类：`text-pink-500`、`text-yellow-500`。

---

## 询价人字段

**字段名**：`inquirer: string`（存储值为 `公司简称-联系人简称`，如 `LC-Roger`）

**UI 行为**：`InquiryFormModal` 中使用 HTML `<input list>` + `<datalist>` 实现自动补全。该字段不是强校验选择框，用户仍可自由输入不在列表中的值，以兼容临时询价人、旧数据和客户简称未维护完成的情况。

**选项来源**：`src/features/inquiry/utils/inquirerOptions.ts` 的 `getInquirerOptions()` 函数。该函数不依赖 React state，也不直接调用 `localStorage`，而是通过 `src/utils/safeLocalStorage.ts` 的 `getLocalStorageJSON` 实时读取 `customer_management`。读取后按以下规则生成选项：

- 客户必须配置 `companyShortName`（公司简称），否则跳过。
- 若配置 `contact1ShortName`，生成 `companyShortName-contact1ShortName`。
- 若配置 `contact2ShortName`，额外生成 `companyShortName-contact2ShortName`。
- 选项会 trim、去重并排序，避免重复简称造成下拉噪音。

**依赖关系**：依赖 `src/features/customer/types` 的 `Customer` 扩展字段：`companyShortName`、`contact1ShortName`、`contact2Name`、`contact2ShortName`、`contact2Phone`、`contact2Email`。其中 `contact2Name/Phone/Email` 用于客户资料完整性；询价人选项只读取 `companyShortName`、`contact1ShortName`、`contact2ShortName`。客户保存逻辑必须透传这些字段到 `customer_management`，否则询价模块无法读取。

**刷新时机**：`InquiryFormModal` 每次打开时在初始化字段的 `useEffect` 中调用 `getInquirerOptions()`。因此用户在客户管理新增或修改简称后，不需要刷新页面；重新打开新增/编辑询价弹窗即可看到最新选项。

**降级行为**：若当前是服务端环境、`customer_management` 为空、localStorage 解析失败，或没有任何客户同时配置公司简称与联系人简称，则 `getInquirerOptions()` 返回空数组；弹窗不渲染 `<datalist>`，输入框退化为普通自由文本输入，不阻塞新增和编辑询价。

---

## 数据存储

- localStorage key：`inquiry_records`
- 通过 `inquiryService`（`src/features/inquiry/services/inquiry.service.ts`）存取
- **未接入 D1 云端同步**，仅本地持久化
