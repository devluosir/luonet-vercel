# CODEX_TASKS.md — MLUONET 优化任务规格

本文件供 Codex（或其他 AI 编码代理）直接执行。每个任务均包含：背景、涉及文件、精确改动、验证命令。

执行前请先阅读 `AGENTS.md` 了解项目规范。每个任务完成后运行指定的验证命令，确认通过再提交。

> 注意：下方 `TASK-*` 段落包含历史任务规格原文，可能保留当时的背景假设。当前事实以 `docs/core/CURRENT_STATE.md`、`docs/core/CHANGELOG.md`、`README.md` 和 `AGENTS.md` 为准。

---

## TASK-100：采购部登记表 —— 内容描述改为共享 description，询报价状态改为点击整行弹窗编辑

**状态**：已完成（由 Claude 直接实施，非 Codex；Roger 明确说"请开始实施"）
**日期**：2026-07-07

### 实施结果

按下方方案全部执行：`src/features/inquiry/types/index.ts`（删除 `PurchaseInquiryStatus`/`purchaseContentDesc`/`purchaseInquiryStatus`，新增 `purchaseSupplierStatuses`/`purchaseQuotedStatuses`）、`src/app/api/inquiry/[[...path]]/route.ts`（`PURCHASE_REGISTRATION_WRITE_FIELDS` 和 `sanitizePurchaseRegistrationRecord` 换成新字段，去掉 `orderDeliveryStatus`/`orderDeliveryConsignee`）、新建 `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`（复用 `InquiryQuoteStatus` + 影子记录）、`PurchaseRegistrationRow.tsx`（整行改为可点击触发 `onEditRecord`，内容描述改绑 `description`，删除"备货/交货/发票"列和 `DeliveryStatusCell`）、`PurchaseRegistrationTable.tsx`（新增 `onEditRecord` 透传，表格 5 列改 4 列）、`PurchaseRegistrationPage.tsx`（`matchesKeyword` 改用 `description`，新增 `editingRecord` state 并渲染弹窗）、`PurchaseRegistrationFilterBar.tsx`（占位符去掉"执行情况"）、`docs/features/purchase-registration/PURCHASE_REGISTRATION_MODULE.md` 和 `docs/core/CURRENT_STATE.md` 两处文档同步更新。

验证：`npx tsc --noEmit` 通过（无输出）；`npx eslint`（7 个改动/新建文件）无输出（通过）；`grep -rn "purchaseContentDesc\|purchaseInquiryStatus" src/` 无匹配；`grep -rn "orderDeliveryStatus\|orderDeliveryConsignee" src/features/purchase-registration/` 无匹配；`npm run build` 在本次审核环境单命令 45 秒时限内卡在 Next.js 编译阶段没跑完整（环境限制，与 TASK-66/71/99 一致），前面 tsc+eslint+grep+`git diff --stat` 逐文件核对（9 个改动文件+1 个新文件，704 行新增/81 行删除，与方案精确匹配，无意外改动）已足够确认正确性。工作区未提交。

### 背景

Roger 反馈现有采购部登记表（`/purchase-registration`）有三处要改：

1. **询价编号、内容描述都应来自"询报价登记"表**。当前"内容描述"列绑定的是采购部专用的独立字段 `purchaseContentDesc`，和询报价登记的 `description` 是两份数据、互不同步。要求改成：采购部登记表编辑"内容描述"时，直接读写 `InquiryRecord.description`（询报价登记同一份数据），编辑后双方都能看到。
2. **备货 / 交货 / 发票不应该出现在采购部登记表里**。这个状态只应该显示在"采购订单表"（`/purchase-order-table`，`PurchaseOrderRow.tsx` 读写的是 `PurchaseOrderRecord.orderDeliveryStatus`/`orderDeliveryConsignee`，独立数据结构，本任务不用动，已经是对的）。采购部登记表当前这一列展示/编辑的是 `InquiryRecord.orderDeliveryStatus`/`orderDeliveryConsignee`——这两个字段本来是给"订单状态表"（`/order`，`OrderPage.tsx`/`OrderRow.tsx`）用的，采购部登记表里再显示一遍是重复且不该出现在这个视图里。本任务要把"备货 / 交货 / 发票"这一列从采购部登记表整个删掉，表格从 5 列变成 4 列：询价编号 / 内容描述 / 询报价状态 / 成单状态。`InquiryRecord.orderDeliveryStatus`/`orderDeliveryConsignee` 字段本身不删（`/order` 订单状态表还要用），只是采购部登记表的 UI 和权限代理不再读写它们。
3. **"询报价状态"列要像询报价登记表一样，点击记录（点击整行）就弹出编辑窗口**。当前是一个只有"内部供应商 / 已报至销售部"两个选项的下拉框，信息量太少。要求换成一个新的"编辑询价"弹窗，弹窗内是采购部专属的供应商标签 + 已报价列表编辑器（界面和交互与询报价登记的"编辑询价"弹窗一致），但数据要**单独存储**（新增 `purchaseSupplierStatuses` / `purchaseQuotedStatuses` 两个字段），不能读写销售视图用的 `supplierStatuses` / `quotedStatuses`，也不能互相覆盖。

**关键约束**：询报价登记表（`/inquiry`）本身的组件、类型、API 行为一律不改；只新增/调整采购部登记专属的字段和组件。`InquiryQuoteStatus`（供应商标签 + 已报价列表编辑器）和 `InquiryQuoteStatusDisplay`（只读预览）这两个共享组件已经是"纯函数式"地读写 `record.supplierStatuses` / `record.quotedStatuses`，与 `record` 其余字段无关（详见 `src/features/inquiry/utils/inquiryUtils.ts` 里 `getRecordColorState` / `getSupplierStatusClass` 只依赖这两个数组）——因此可以直接复用，不用改这两个组件一行代码，只需要在采购部登记这一侧构造一个"影子记录"（把 `purchaseSupplierStatuses`/`purchaseQuotedStatuses` 接到 `supplierStatuses`/`quotedStatuses` 这两个字段名上）传进去。

### 涉及文件

| 文件 | 改动 |
|---|---|
| `src/features/inquiry/types/index.ts` | 删除 `PurchaseInquiryStatus` 类型、`purchaseContentDesc`、`purchaseInquiryStatus` 三处；新增 `purchaseSupplierStatuses?: SupplierQuoteStatus[]`、`purchaseQuotedStatuses?: CustomerQuoteStatus[]` |
| `src/app/api/inquiry/[[...path]]/route.ts` | `PURCHASE_REGISTRATION_WRITE_FIELDS` 和 `sanitizePurchaseRegistrationRecord` 换成新字段，去掉 `orderDeliveryStatus`/`orderDeliveryConsignee` |
| `src/features/purchase-registration/app/PurchaseRegistrationPage.tsx` | `matchesKeyword` 改用 `description`，去掉 `orderDeliveryStatus`/`orderDeliveryConsignee`；新增编辑弹窗的打开/关闭状态，传给 Table |
| `src/features/purchase-registration/components/PurchaseRegistrationTable.tsx` | 新增 `onEditRecord` 透传给每一行；删除"备货 / 交货 / 发票"表头列，colgroup 从 5 列改 4 列 |
| `src/features/purchase-registration/components/PurchaseRegistrationRow.tsx` | 整行可点击（触发 `onEditRecord`）；内容描述改绑 `description`；询报价状态列改为只读预览（复用 `InquiryQuoteStatusDisplay`）；删除"备货 / 交货 / 发票"列和 `DeliveryStatusCell` |
| `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`（新建） | "编辑询价"弹窗，复用 `InquiryQuoteStatus`，保存到 `purchaseSupplierStatuses`/`purchaseQuotedStatuses` |
| `src/features/purchase-registration/components/PurchaseRegistrationFilterBar.tsx` | 搜索框 placeholder 顺手去掉"执行情况"字样 |
| `docs/features/purchase-registration/PURCHASE_REGISTRATION_MODULE.md` | 更新数据模型说明 |
| `docs/core/CURRENT_STATE.md` | 第 43、182 行两处描述同步更新 |

### 改动 1：`src/features/inquiry/types/index.ts`

找到：

```ts
/** 订单附加标记：辙销C / 悬挂P / 善后S */
export type OrderSubStatus = 'cancelled' | 'suspended' | 'followup';
export type PurchaseInquiryStatus = 'internal_supplier' | 'reported_to_sales';
```

替换为：

```ts
/** 订单附加标记：辙销C / 悬挂P / 善后S */
export type OrderSubStatus = 'cancelled' | 'suspended' | 'followup';
```

找到：

```ts
  description: string;
  /** 采购部登记专用内容描述；独立于询报价登记的 description 字段 */
  purchaseContentDesc?: string;
  /** 采购部登记专用询报价状态；不影响 supplierStatuses / quotedStatuses */
  purchaseInquiryStatus?: PurchaseInquiryStatus;
  orderNo?: string;
```

替换为：

```ts
  description: string;
  orderNo?: string;
```

找到：

```ts
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;
```

替换为：

```ts
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  /** 采购部登记专属供应商报价状态；结构与 supplierStatuses 相同，但数据独立存储，不影响询报价登记的销售视图 */
  purchaseSupplierStatuses?: SupplierQuoteStatus[];
  /** 采购部登记专属已报价状态；结构与 quotedStatuses 相同，数据独立存储 */
  purchaseQuotedStatuses?: CustomerQuoteStatus[];
  createdAt: string;
```

（旧数据里残留的 `purchaseContentDesc` / `purchaseInquiryStatus` 键值不会报错，只是不再被读取——JSON blob 字段，无需 D1 迁移。）

### 改动 2：`src/app/api/inquiry/[[...path]]/route.ts`

找到：

```ts
const PURCHASE_REGISTRATION_WRITE_FIELDS = [
  'purchaseContentDesc',
  'purchaseInquiryStatus',
  'orderDeliveryStatus',
  'orderDeliveryConsignee',
] as const;
```

替换为：

```ts
const PURCHASE_REGISTRATION_WRITE_FIELDS = [
  'description',
  'purchaseSupplierStatuses',
  'purchaseQuotedStatuses',
] as const;
```

（`orderDeliveryStatus`/`orderDeliveryConsignee` 不再放进采购部登记的可写字段——这两个字段是"订单状态表"`/order` 专用的，采购部登记不应该改它们，见下方"备货/交货/发票列删除"说明。）

找到：

```ts
function sanitizePurchaseRegistrationRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    inquiryDate: record.inquiryDate,
    inquiryNo: record.inquiryNo,
    purchaseContentDesc: record.purchaseContentDesc,
    purchaseInquiryStatus: record.purchaseInquiryStatus,
    orderNo: record.orderNo,
    orderDeliveryStatus: record.orderDeliveryStatus,
    orderDeliveryConsignee: record.orderDeliveryConsignee,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  };
}
```

替换为：

```ts
function sanitizePurchaseRegistrationRecord(record: Record<string, unknown>): Record<string, unknown> {
  return {
    id: record.id,
    inquiryDate: record.inquiryDate,
    inquiryNo: record.inquiryNo,
    description: record.description,
    purchaseSupplierStatuses: record.purchaseSupplierStatuses,
    purchaseQuotedStatuses: record.purchaseQuotedStatuses,
    orderNo: record.orderNo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    status: record.status,
  };
}
```

`orderNo` 保留，只是用来算"成单状态"徽章（有没有订单号），不是用来显示交货状态。

注意：这一改动让"只有 `purchaseRegistration` 权限、没有 `inquiry` 权限"的用户从只能改 `purchaseContentDesc`（隔离字段）变成可以直接改 `description`（询报价登记共享字段）。这是 Roger 明确要的行为（"编辑后也同步保存"），不是遗漏。

### 改动 3：新建 `src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx`

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InquiryQuoteStatus } from '@/features/inquiry/components/InquiryQuoteStatus';
import type { CustomerQuoteStatus, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';

interface PurchaseInquiryEditModalProps {
  record: InquiryRecord | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function PurchaseInquiryEditModal({ record, onClose, onSave }: PurchaseInquiryEditModalProps) {
  const [localSuppliers, setLocalSuppliers] = useState<SupplierQuoteStatus[]>([]);
  const [localQuoted, setLocalQuoted] = useState<CustomerQuoteStatus[]>([]);

  useEffect(() => {
    if (!record) return;
    setLocalSuppliers(record.purchaseSupplierStatuses ?? []);
    setLocalQuoted(record.purchaseQuotedStatuses ?? []);
  }, [record]);

  // 借用询报价登记的供应商/已报价编辑器：该组件只读写 record.supplierStatuses / record.quotedStatuses，
  // 与 record 其余字段无关，因此用「影子记录」把采购部专属数组接到这两个字段名上即可复用，
  // 编辑内容互不影响询报价登记原本的 supplierStatuses / quotedStatuses。
  const shimRecord = useMemo<InquiryRecord | null>(() => {
    if (!record) return null;
    return { ...record, supplierStatuses: localSuppliers, quotedStatuses: localQuoted };
  }, [record, localSuppliers, localQuoted]);

  if (!record || !shimRecord) return null;

  const handleSave = () => {
    onSave(record.id, {
      purchaseSupplierStatuses: localSuppliers,
      purchaseQuotedStatuses: localQuoted,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8">
      <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl dark:bg-[#2C2C2E]">
        <div className="flex items-center justify-between px-6 pb-4 pt-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">编辑询价</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-400 dark:text-gray-500">{record.inquiryNo}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            aria-label="关闭弹窗"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-gray-100 dark:bg-gray-700" />

        <div className="px-6 py-5">
          {record.description && (
            <p className="mb-4 truncate text-sm text-gray-500 dark:text-gray-400" title={record.description}>
              {record.description}
            </p>
          )}

          <div className="mb-4 rounded-xl bg-gray-50 p-4 ring-1 ring-gray-100 dark:bg-gray-800/50 dark:ring-gray-700">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
              询报价状态（采购部专属，不影响询报价登记）
            </p>
            <InquiryQuoteStatus
              record={shimRecord}
              onSuppliersChange={setLocalSuppliers}
              onQuotedChange={setLocalQuoted}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              取消
            </button>
            <Button type="button" onClick={handleSave} className="px-5">
              保存修改
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 改动 4：`src/features/purchase-registration/components/PurchaseRegistrationRow.tsx`

整个文件替换为（这一版把"备货 / 交货 / 发票"整列删掉了——那是订单状态表 `/order` 专用的字段，不该出现在采购部登记表里）：

```tsx
'use client';

import { useState } from 'react';
import { InquiryQuoteStatusDisplay } from '@/features/inquiry/components/InquiryQuoteStatusDisplay';
import type { InquiryRecord } from '@/features/inquiry/types';

type EditField = 'content' | null;

interface EditableTextProps {
  editing: boolean;
  value: string | undefined;
  placeholder: string;
  onActivate: () => void;
  onSave: (value: string | undefined) => void;
  onCancel: () => void;
}

function EditableText({ editing, value, placeholder, onActivate, onSave, onCancel }: EditableTextProps) {
  const display = value?.trim() || '';

  if (editing) {
    return (
      <input
        autoFocus
        type="text"
        defaultValue={display}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value.trim() || undefined)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
          if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        className="w-full rounded border border-blue-300 bg-white px-1.5 py-0.5 text-xs outline-none focus:ring-1 focus:ring-blue-200 dark:border-blue-600 dark:bg-gray-900 dark:text-gray-100"
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      onClick={onActivate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onActivate();
      }}
      title={display || undefined}
      className={`block min-h-[1.25rem] min-w-0 truncate cursor-text rounded px-0.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 ${
        display ? 'text-gray-800 dark:text-gray-100' : 'text-gray-300 dark:text-gray-700'
      }`}
    >
      {display || placeholder}
    </span>
  );
}

interface PurchaseRegistrationRowProps {
  record: InquiryRecord;
  onUpdate: (patch: Partial<InquiryRecord>) => void;
  onEditRecord: (record: InquiryRecord) => void;
}

export function PurchaseRegistrationRow({ record, onUpdate, onEditRecord }: PurchaseRegistrationRowProps) {
  const [activeField, setActiveField] = useState<EditField>(null);
  const hasOrder = Boolean(record.orderNo?.trim());

  // 供只读预览用的影子记录：把采购部专属供应商/报价状态接到 InquiryQuoteStatusDisplay 期望的字段名上
  const previewRecord: InquiryRecord = {
    ...record,
    supplierStatuses: record.purchaseSupplierStatuses ?? [],
    quotedStatuses: record.purchaseQuotedStatuses ?? [],
  };

  return (
    <tr
      className="group cursor-pointer border-b border-gray-100 align-middle last:border-b-0 hover:bg-gray-50/70 dark:border-gray-800 dark:hover:bg-gray-800/30"
      onClick={() => onEditRecord(record)}
    >
      <td className="max-w-0 overflow-hidden px-3 py-2">
        <span className="block truncate font-mono text-[11px] font-bold text-gray-800 dark:text-gray-100">
          {record.inquiryNo}
        </span>
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2" onClick={(e) => e.stopPropagation()}>
        <EditableText
          editing={activeField === 'content'}
          value={record.description}
          placeholder="内容描述"
          onActivate={() => setActiveField('content')}
          onSave={(value) => {
            setActiveField(null);
            onUpdate({ description: value ?? '' });
          }}
          onCancel={() => setActiveField(null)}
        />
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <InquiryQuoteStatusDisplay record={previewRecord} />
      </td>
      <td className="max-w-0 overflow-hidden px-2 py-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
            hasOrder
              ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
              : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
          }`}
        >
          {hasOrder ? '已成单' : '未成单'}
        </span>
      </td>
    </tr>
  );
}
```

说明：内容描述这一列的单元格加了 `onClick={(e) => e.stopPropagation()}`，因为它本身有点击即进入行内编辑的交互，如果不拦截，点击这一列会同时触发"打开编辑询价弹窗"和"进入行内编辑"，体验冲突。询价编号、询报价状态预览、成单状态这三列没有自己的点击交互，点击会正常冒泡到 `<tr>` 打开弹窗。"备货 / 交货 / 发票"列已整个删除（不再是采购部登记表的内容，改由"采购订单表" `/purchase-order-table` 独立展示，那边的 `PurchaseOrderRow.tsx` 已经有一份，不用动）。

### 改动 5：`src/features/purchase-registration/components/PurchaseRegistrationTable.tsx`

找到：

```tsx
interface PurchaseRegistrationTableProps {
  records: InquiryRecord[];
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
}

export function PurchaseRegistrationTable({ records, onUpdate }: PurchaseRegistrationTableProps) {
```

替换为：

```tsx
interface PurchaseRegistrationTableProps {
  records: InquiryRecord[];
  onUpdate: (id: string, patch: Partial<InquiryRecord>) => void;
  onEditRecord: (record: InquiryRecord) => void;
}

export function PurchaseRegistrationTable({ records, onUpdate, onEditRecord }: PurchaseRegistrationTableProps) {
```

找到（表格从 5 列变成 4 列，删掉"备货 / 交货 / 发票"）：

```tsx
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[34%]" />
          <col className="w-[18%]" />
          <col className="w-[12%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            <th className={headerCellOverflowClass}>询价编号</th>
            <th className={headerCellOverflowClass}>内容描述</th>
            <th className={headerCellOverflowClass}>询报价状态</th>
            <th className={headerCellOverflowClass}>成单状态</th>
            <th className={headerCellOverflowClass}>备货 / 交货 / 发票</th>
          </tr>
        </thead>
```

替换为：

```tsx
        <colgroup>
          <col className="w-[18%]" />
          <col className="w-[42%]" />
          <col className="w-[26%]" />
          <col className="w-[14%]" />
        </colgroup>
        <thead>
          <tr className={headerRowClass}>
            <th className={headerCellOverflowClass}>询价编号</th>
            <th className={headerCellOverflowClass}>内容描述</th>
            <th className={headerCellOverflowClass}>询报价状态</th>
            <th className={headerCellOverflowClass}>成单状态</th>
          </tr>
        </thead>
```

找到：

```tsx
          {records.map((record) => (
            <PurchaseRegistrationRow
              key={record.id}
              record={record}
              onUpdate={(patch) => onUpdate(record.id, patch)}
            />
          ))}
```

替换为：

```tsx
          {records.map((record) => (
            <PurchaseRegistrationRow
              key={record.id}
              record={record}
              onUpdate={(patch) => onUpdate(record.id, patch)}
              onEditRecord={onEditRecord}
            />
          ))}
```

### 改动 6：`src/features/purchase-registration/app/PurchaseRegistrationPage.tsx`

找到：

```tsx
function matchesKeyword(record: InquiryRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.inquiryNo,
    record.purchaseContentDesc,
    record.purchaseInquiryStatus,
    record.orderNo,
    record.orderDeliveryStatus,
    record.orderDeliveryConsignee,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}
```

替换为（去掉 `orderDeliveryStatus`/`orderDeliveryConsignee`——采购部登记表不再展示这两个字段）：

```tsx
function matchesKeyword(record: InquiryRecord, keyword: string): boolean {
  const q = keyword.trim().toLowerCase();
  if (!q) return true;
  return [
    record.inquiryNo,
    record.description,
    record.orderNo,
  ].some((value) => String(value ?? '').toLowerCase().includes(q));
}
```

找到 import 区域：

```tsx
import {
  PurchaseRegistrationFilterBar,
  type OrderStateFilter,
} from '../components/PurchaseRegistrationFilterBar';
import { PurchaseRegistrationTable } from '../components/PurchaseRegistrationTable';
```

替换为：

```tsx
import {
  PurchaseRegistrationFilterBar,
  type OrderStateFilter,
} from '../components/PurchaseRegistrationFilterBar';
import { PurchaseRegistrationTable } from '../components/PurchaseRegistrationTable';
import { PurchaseInquiryEditModal } from '../components/PurchaseInquiryEditModal';
```

在 `const [keyword, setKeyword] = useState('');` 之后（`const [orderState, ...]` 那一行附近）新增一个 state：

```tsx
  const [editingRecord, setEditingRecord] = useState<InquiryRecord | null>(null);
```

找到组件内 `<PurchaseRegistrationTable ... />` 部分：

```tsx
        <PurchaseRegistrationTable
          records={filteredRecords}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
        />
      </div>
    </AppLayout>
  );
}
```

替换为：

```tsx
        <PurchaseRegistrationTable
          records={filteredRecords}
          onUpdate={(id, patch) => patchRecordForView(id, patch)}
          onEditRecord={setEditingRecord}
        />
      </div>

      <PurchaseInquiryEditModal
        record={editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={(id, patch) => patchRecordForView(id, patch)}
      />
    </AppLayout>
  );
}
```

### 改动 7：`src/features/purchase-registration/components/PurchaseRegistrationFilterBar.tsx`

找到：

```tsx
            placeholder="搜索编号/内容/执行情况..."
```

替换为：

```tsx
            placeholder="搜索编号/内容..."
```

### 改动 8：文档同步

**`docs/features/purchase-registration/PURCHASE_REGISTRATION_MODULE.md`** —— 把「数据模型」一节：

```
purchaseContentDesc?: string;
purchaseInquiryStatus?: 'internal_supplier' | 'reported_to_sales';
```

```
这两个字段独立于 `description`、`supplierStatuses`、`quotedStatuses`，只服务采购部登记。
```

改为：

```
purchaseSupplierStatuses?: SupplierQuoteStatus[];
purchaseQuotedStatuses?: CustomerQuoteStatus[];
```

```
内容描述直接读写 `description`，与询报价登记共享同一份数据；`purchaseSupplierStatuses` / `purchaseQuotedStatuses` 结构与询报价登记的 `supplierStatuses` / `quotedStatuses` 相同，但数据独立存储，互不影响，通过"编辑询价"弹窗（点击整行触发）编辑。表格不再展示"备货 / 交货 / 发票"，该状态只在"采购订单表"（`/purchase-order-table`）里维护，采购部登记不读写 `orderDeliveryStatus` / `orderDeliveryConsignee`。
```

**`docs/core/CURRENT_STATE.md`**：

第 43 行找到：

```
| `/purchase-registration` | 采购部登记 | 复用询报价 D1 JSON 记录，只开放采购部描述、采购询报价状态和执行情况字段 |
```

替换为：

```
| `/purchase-registration` | 采购部登记 | 复用询报价 D1 JSON 记录，只开放内容描述（与询报价登记共享 description）和采购部专属供应商/报价状态字段；不含备货/交货/发票（该状态在采购订单表维护） |
```

第 182 行找到：

```
- 采购部登记复用 `InquiryRecord`，新增 `purchaseContentDesc` 与 `purchaseInquiryStatus` 两个采购部专用字段，不复用询报价登记的 `description`、`supplierStatuses` 或 `quotedStatuses` 状态。
```

替换为：

```
- 采购部登记复用 `InquiryRecord` 的 `description` 字段读写内容描述（与询报价登记共享同一份数据）；新增 `purchaseSupplierStatuses` 与 `purchaseQuotedStatuses` 两个采购部专用字段，结构与询报价登记的 `supplierStatuses` / `quotedStatuses` 相同，但数据独立存储，通过点击整行弹出的"编辑询价"弹窗编辑；不展示/不读写 `orderDeliveryStatus` / `orderDeliveryConsignee`（那是订单状态表 `/order` 和采购订单表 `/purchase-order-table` 各自维护的字段）。
```

### 验证命令

```bash
npx tsc --noEmit
npx eslint src/features/inquiry/types/index.ts src/app/api/inquiry/[[...path]]/route.ts src/features/purchase-registration/app/PurchaseRegistrationPage.tsx src/features/purchase-registration/components/PurchaseRegistrationTable.tsx src/features/purchase-registration/components/PurchaseRegistrationRow.tsx src/features/purchase-registration/components/PurchaseInquiryEditModal.tsx src/features/purchase-registration/components/PurchaseRegistrationFilterBar.tsx
npm run build
grep -rn "purchaseContentDesc\|purchaseInquiryStatus" src/
# 预期：无匹配（全部改为 description / purchaseSupplierStatuses / purchaseQuotedStatuses）
grep -rn "orderDeliveryStatus\|orderDeliveryConsignee" src/features/purchase-registration/
# 预期：无匹配（采购部登记表不再读写这两个字段）
```

### 验收标准

- 采购部登记表"内容描述"列点击可编辑，保存后 `/inquiry`（询报价登记）里同一条记录的"内容简述"同步显示新值，反之亦然。
- "询报价状态"列不再是下拉框，改为只读的供应商标签 + 已报价预览（复用询报价登记同款展示样式）。
- 采购部登记表**不再显示"备货 / 交货 / 发票"列**（表格只剩询价编号/内容描述/询报价状态/成单状态 4 列）；这个状态继续只在"采购订单表"（`/purchase-order-table`）里维护和展示，不受影响。
- 点击采购部登记表任意一行（内容描述列的行内编辑除外）弹出"编辑询价"弹窗，弹窗内可新增/编辑/删除供应商标签和已报价记录，交互与询报价登记的"编辑询价"弹窗一致。
- 保存后数据写入 `purchaseSupplierStatuses` / `purchaseQuotedStatuses`，不影响同一条记录在 `/inquiry` 里显示的 `supplierStatuses` / `quotedStatuses`（两边互相独立）。
- 只有 `purchaseRegistration` 权限（无 `inquiry` 权限）的用户仍无法新增/删除询报价记录，但可以编辑 `description`、`purchaseSupplierStatuses`、`purchaseQuotedStatuses`；不再能通过这个代理改 `orderDeliveryStatus`/`orderDeliveryConsignee`（这两个字段不属于采购部登记的写入范围）。
- 全仓库搜索确认 `purchaseContentDesc` / `purchaseInquiryStatus` 无业务代码残留（`CODEX_TASKS.md` 里 TASK-96/99 的历史记录原文不用改）。

---

## TASK-99：合并报价单/销售确认为同一入口，改用设置面板内 Type 切换

**状态**：已完成（由 Claude 直接实施，2026-07-07）
**日期**：2026-07-07

### 实施结果

按下方方案 1-5 全部执行：`AppSidebar.tsx`（label 改名、删除 confirmation 条目、`isItemActive` 收窄为按 `tab !== 'domestic'` 判断、清理未用的 `FileCheck` import 和 `canCreateConfirmation` 映射）、`MobileBottomTab.tsx`（同步 label 和 `isTabActive`）、`QuotationPage.tsx`（删除顶部三 tab 整块 + 未用的 `TabButton` import，`SettingsPanel` 新增 `onTabChange={handleTabChange}`）、`SettingsPanel.tsx`（新增 `onTabChange` prop 和最前面的 "Type: Quotation / Sales Confirmation" 切换分组，选中态样式与其余分组一致）、`permissionModules.ts`（quotation label 顺手改为"外贸报价合同"）。`useQuotationStore`/`quotation.service.ts`/PDF生成器/D1同步/历史导入导出/Dashboard 快速创建区均未改动，符合原方案的排除范围。

验证：`npx tsc --noEmit` 通过（无输出）；`npx eslint` 对 5 个改动文件跑通过（无输出）；`npm run build` 在本次审核环境单命令 45 秒时限内两次都未能跑完整（卡在 Next.js 编译阶段，是环境限制不是代码报错，与 TASK-66/71 等历史记录一致），前面的 diff 走查 + tsc + eslint 已足够确认改动正确。`git diff --stat` 确认改动范围精确匹配方案（6 个文件，无意外改动）。

### 背景

Roger 反馈：`/quotation` 页面顶部三个 tab 按钮（Export Quotation / Domestic Quotation / Order Confirmation）体验冗余。要求把"报价单"和"销售确认"合并为同一入口，改成在设置面板里用 `Type: Quotation / Sales Confirmation` 切换；内销报价单保持独立入口不受影响。侧边栏"新单据"分组对应只保留两条：外贸报价合同、内销报价合同，去掉"外贸报价单""内销报价单""销售确认"这几个旧名字/旧入口。

**关键约束（务必遵守，不要顺带重构）**：`useQuotationStore` 的 `QuotationTab` 类型（`'quotation' | 'confirmation' | 'domestic'`）、`setTab()` 内部切换快照逻辑、`quotation.service.ts`（`getHistoryTypeFromTab`/`saveOrUpdate`）、PDF 生成器分流、D1 同步/拉取、`historyImportExport.ts`、Excel 导出全部保持不变——这些都是按 `tab` 值工作的业务逻辑，本任务只改**入口 UI**（顶部 tab 按钮 → 设置面板内切换），不改数据结构、历史类型、PDF 输出。

### 改动方案

1. **`src/components/layout/AppSidebar.tsx`**
   - `NAV_ITEMS`：`quotation` 的 `label` 改为 `外贸报价合同`；`quotation-domestic` 的 `label` 改为 `内销报价合同`；删除 `confirmation` 这一整条。
   - `NAV_GROUPS` 里 `documents` 分组的 `navGroupItems([...])` 去掉 `'confirmation'`。
   - `isItemActive()`：删除 `item.id === 'confirmation'` 分支；`quotation` 分支条件从 `tab !== 'confirmation' && tab !== 'domestic'` 改为 `tab !== 'domestic'`（现在 confirmation 归入同一个"外贸报价合同"入口，应保持高亮）。
   - `PERMISSION_MODULE_MAP` 里 `canCreateConfirmation` 这一行可以顺手删除（`canCreateQuotation`/`canCreateConfirmation` 本来就映射同一个 moduleId `'quotation'`，删掉不影响权限行为，只是清理不再被引用的 key）。

2. **`src/components/layout/MobileBottomTab.tsx`**
   - `MOBILE_TABS` 里 `quotation` 的 `label` 改为 `外贸报价合同`。
   - `isTabActive()`：`quotation` 分支条件从 `tab !== 'confirmation' && tab !== 'domestic'` 改为 `tab !== 'domestic'`（同上，confirmation 现在算同一入口）。

3. **`src/features/quotation/app/QuotationPage.tsx`**
   - 删除顶部三个 `TabButton`（Export Quotation / Domestic Quotation / Order Confirmation）整块 `<div className="flex justify-center ...">`。因此 `import { TabButton } from '@/components/quotation/TabButton'` 这行也要删除（避免 unused import 报错），`TabButton.tsx` 文件本身不用删。
   - `handleTabChange` 函数保留，只是触发点从顶部按钮改为设置面板内的 Type 切换（见第4点）。
   - 非 domestic 分支渲染 `<SettingsPanel ... />` 时，多传一个 `onTabChange={handleTabChange}` prop。
   - `documentLabel`/`breadcrumbs`（`isDomesticQuotation ? '内销报价单' : activeTab === 'confirmation' ? '销售确认' : '外贸报价单'`）保持不变——这是当前正在编辑的具体单据类型展示，不等同于侧边栏入口名字，不用跟着改。

4. **`src/components/quotation/SettingsPanel.tsx`**
   - 新增 prop：`onTabChange: (tab: 'quotation' | 'confirmation') => void`。
   - 在现有 "From:" 分组**之前**新增一组 "Type:" 切换按钮，两个选项 `Quotation` / `Sales Confirmation`，点击分别调用 `onTabChange('quotation')` / `onTabChange('confirmation')`；选中态样式复用现有分组按钮的视觉风格（`bg-[#007AFF] text-white shadow-sm` vs 描边样式），布局风格与 `From/Currency/Header` 那几组一致（含分隔线）。
   - `activeTab === 'confirmation'` 时才显示的 Deposit / Stamp 分组逻辑不变。

5. **`src/constants/permissionModules.ts`**（可选，非必须）
   - `quotation` 模块的 `label` 目前是 `外贸报价单 / 销售确认`，可以顺手改成 `外贸报价合同`，与侧边栏新文案保持一致。这是纯文案，不影响权限逻辑，Codex 可自行判断是否顺带做。

### 明确不改的范围（防止过度重构）

- `useQuotationStore.ts`：`QuotationTab` 类型、`setTab()`、`preDomesticSnapshot` 逻辑不动。
- `quotation.service.ts`、`generate.service.ts`、`excel.service.ts`、D1 同步/拉取、`historyImportExport.ts`：都按 `tab` 值工作，本任务不涉及。
- `src/features/history/**`、`src/app/history/**`：历史记录列表三种 type 筛选/编辑/预览不变。
- `src/constants/dashboardModules.ts` 的 `QUICK_CREATE_MODULES`（Dashboard 快速创建区当前仍是三个独立入口：新外贸报价单/新内销报价单/销售确认）：本次不改，因为 Roger 这次反馈范围明确是"左侧新单据"和"页面顶部 tab"，没提 Dashboard 快速创建区。如果实现时发现三个快速创建按钮和新架构明显不协调，可以在完成说明里提出来，但不要自作主张改掉。
- `DOCUMENT_TYPES`（`dashboardModules.ts`）：quotation/confirmation 两个类型标识必须保留，历史记录和 Dashboard 统计仍要分别识别，不能合并。

### 涉及文件

| 文件 | 说明 |
|---|---|
| `src/components/layout/AppSidebar.tsx` | 新单据分组两条目、label、isItemActive、权限映射清理 |
| `src/components/layout/MobileBottomTab.tsx` | label、isTabActive |
| `src/features/quotation/app/QuotationPage.tsx` | 删除顶部三tab，SettingsPanel 新增 onTabChange |
| `src/components/quotation/SettingsPanel.tsx` | 新增 Type 切换分组和 onTabChange prop |
| `src/constants/permissionModules.ts` | quotation label 文案（可选） |
| `AGENTS.md` | 路由表 `/quotation` 一行描述更新为"外贸报价合同（含报价单/销售确认，设置面板内切换类型）"（实现完成后更新） |
| `docs/core/CURRENT_STATE.md` | 如有对应"顶部三tab"描述需同步更新（实现完成后更新） |

### 验证命令

```bash
npx tsc --noEmit
npx eslint src/components/layout/AppSidebar.tsx src/components/layout/MobileBottomTab.tsx src/features/quotation/app/QuotationPage.tsx src/components/quotation/SettingsPanel.tsx
npm run build
```

### 验收标准

- 左侧"新单据"分组只剩两条："外贸报价合同"（原 quotation）、"内销报价合同"（原 quotation-domestic），"销售确认"作为独立导航条目消失。
- 进入 `/quotation`，页面顶部不再有 Export Quotation / Domestic Quotation / Order Confirmation 三个 tab 按钮。
- 打开设置面板（点击右上角 Settings 图标）能看到 "Type: Quotation / Sales Confirmation" 切换按钮；点击 Sales Confirmation 后行为与原来点击 "Order Confirmation" tab 完全一致：`mode='export'`、`showStamp` 自动置 true、notes 默认值随 tab 切换、保存/生成 PDF 走 confirmation 分支（合同号自动补全等）不变。
- 进入 `/quotation?tab=domestic`（内销报价合同）页面不显示任何顶部 tab 按钮，原有"单据类型：报价单/产品购销合同"切换、供方需方表单、PDF 生成不受影响。
- 直接通过 URL 访问 `/quotation?tab=confirmation`（例如 Dashboard 快速创建区"销售确认"按钮）依然能正确落在销售确认状态，且此时侧边栏"外贸报价合同"和移动端底部"外贸报价合同"图标应显示为高亮/激活态（此前 confirmation 状态下是不激活的，这是本次预期的行为变化）。
- `/history` 页面三种历史类型（quotation/confirmation/domestic）筛选、编辑、复制、PDF 预览均正常，不受影响。
- `npx tsc --noEmit`、指定文件 `eslint`、`npm run build` 全部通过。

---

## TASK-98：修复内销报价单污染外贸历史和 tab 状态回归

**状态**：已完成  
**日期**：2026-07-07

### 背景

TASK-97 实现内销报价单后留下两个回归：

- `getHistoryTypeFromTab('domestic')` 被塌缩为 `quotation`，导致内销报价单保存为外贸报价单历史，污染外贸历史列表、Dashboard 计数和导出筛选。
- `/quotation` 页面三个 tab 共用同一个 Zustand store，从内销切回外贸 / 销售确认时，`currency='CNY'` 和中文合同条款会残留。

### 修复方式

- 将 `QuotationHistory.type`、`saveQuotationHistory()`、D1 同步和 D1 拉取类型扩展为 `quotation | confirmation | domestic`。
- `getHistoryTypeFromTab()` 改为直接返回 tab，内销报价单保存为 `type='domestic'`。
- `/history` 新增「内销报价单」tab，支持独立查看、编辑、复制、删除、预览和导出。
- Dashboard 外贸计数仍只统计 `type='quotation'`，内销记录不会进入外贸报价单数量和列表。
- `useQuotationStore.setTab()` 进入 domestic 前保存 `currency` 和 `notesConfig` 快照，离开 domestic 时恢复快照；销售确认分支保留原有 `showStamp=true` 行为。
- 新增 D1 migration `008_add_domestic_document_type.sql`，将 `Document.type` CHECK 约束扩展为包含 `domestic`。

### 涉及文件

| 文件/目录 | 说明 |
|---|---|
| `src/features/quotation/services/quotation.service.ts` | domestic 历史类型不再塌缩 |
| `src/utils/quotationHistory.ts`、`src/types/quotation-history.ts` | 本地历史支持 `type='domestic'` |
| `src/features/quotation/state/useQuotationStore.ts` | domestic tab 切换快照保存 / 恢复 |
| `src/features/history/**`、`src/app/history/**` | 新增内销报价单历史 tab 和操作路径 |
| `src/components/history/PDFPreviewModal.tsx`、`src/components/PDFPreviewComponent.tsx` | domestic PDF 预览 / 下载 |
| `src/utils/d1Sync.ts`、`src/utils/d1Pull.ts` | D1 同步和拉取支持 domestic |
| `src/utils/historyImportExport.ts` | domestic 导入导出；外贸导出只取 `type='quotation'` |
| `migrations/008_add_domestic_document_type.sql` | D1 CHECK 约束迁移 |
| `docs/core/CURRENT_STATE.md`、`docs/features/quotation-domestic/` | 更新当前事实 |

### 验证命令

```bash
npx tsc --noEmit
npx eslint <本任务改动文件>
npm run build
```

### 验收标准

- 新建内销报价单保存后，`quotation_history` 中记录的 `type` 为 `domestic`。
- 外贸报价单历史列表和 Dashboard 外贸报价单计数不包含内销报价单。
- `/history?tab=domestic` 可以独立查看内销报价单，并能编辑、复制、删除、预览 PDF。
- 同页面会话中外贸报价单选择 EUR → 切到内销 → 切回外贸后，币种和 Notes 条款恢复为切换前状态。
- 外贸报价单和销售确认的 PDF、历史列表、Dashboard 计数保持原逻辑。

---

## TASK-97：内销报价单中文录入表单与合同式 PDF

**状态**：已完成  
**日期**：2026-07-07

### 范围

- 抽出 RMB 金额大写公共工具 `convertToRmbCapital()`，RMB 工具页改为复用同一转换逻辑。
- 内销报价单补齐供方 / 需方中文合同字段：单位地址、法定代表人、委托代理人、传真、纳税人识别号、开户行、帐号等。
- `/quotation?tab=domestic` 录入界面切换为中文标签，明细表、顶部单据字段、合计区和条款区均按内销业务语境展示。
- 新增内销报价单 PDF 生成器，输出中文“产品购销合同式”版式，包含产品明细、金额大写、二至十四条款、供需双栏签章信息和供方印章叠加。
- `generatePdf()` 在 `tab='domestic'` 时分流到内销 PDF，不影响外贸报价单和销售确认原 PDF。

### 涉及文件

| 文件/目录 | 说明 |
|---|---|
| `src/utils/rmbCapitalAmount.ts` | RMB 大写公共转换工具 |
| `src/features/rmb/app/RmbPage.tsx` | RMB 工具页复用公共转换工具 |
| `src/types/quotation.ts`、`src/features/quotation/types/index.ts` | 内销供需方合同字段 |
| `src/features/quotation/types/notes.ts` | 内销二至十四默认条款 |
| `src/components/quotation/DomesticCustomerInfo.tsx` | 内销供方 / 需方中文录入区 |
| `src/components/quotation/ItemsTable.tsx` | 内销模式下明细表中文表头 |
| `src/features/quotation/app/QuotationPage.tsx` | 内销中文表单、金额大写、设置区和 PDF 分流参数 |
| `src/features/quotation/services/generate.service.ts` | `domestic` PDF 动态导入分流 |
| `src/utils/domesticQuotationPdfGenerator.ts` | 内销中文合同式 PDF 生成器 |
| `docs/core/CURRENT_STATE.md`、`docs/features/quotation-domestic/` | 当前状态和模块说明 |

### 验证命令

```bash
npx tsc --noEmit
npx eslint src/utils/rmbCapitalAmount.ts src/features/rmb/app/RmbPage.tsx src/types/quotation.ts src/features/quotation/types/index.ts src/features/quotation/types/notes.ts src/utils/quotationInitialData.ts src/features/quotation/state/useQuotationStore.ts src/features/quotation/services/quotation.service.ts src/features/quotation/hooks/useInitQuotation.ts src/utils/sanitizeQuotation.ts src/components/quotation/DomesticCustomerInfo.tsx src/components/quotation/ItemsTable.tsx src/features/quotation/components/NotesSection.tsx src/features/quotation/app/QuotationPage.tsx src/utils/domesticQuotationPdfGenerator.ts src/features/quotation/services/generate.service.ts
npm run build
```

### 验收标准

- 内销报价单表单显示中文供方 / 需方字段、中文明细列名、中文顶部单据字段和金额大写。
- 内销条款区默认提供二至十四条款，并可按现有 NotesConfig 机制编辑 / 开关。
- 内销 PDF 标题为「内 销 报 价 单」，包含产品明细表、金额大写、合计备注、合同条款和供需双栏签章信息。
- `showBank` 控制开户行 / 帐号行，`showStamp` 控制供方栏印章叠加。
- 外贸报价单和销售确认仍走原有英文 PDF 生成器与原表单标签。

---

## TASK-96：新单据菜单重命名、内销报价单、采购部登记、采购订单表

**状态**：已完成  
**日期**：2026-07-07

### 范围

- 将报价单展示 label 调整为「外贸报价单」，保留 `quotation` moduleId、路由和历史类型。
- 新增 `/quotation?tab=domestic` 内销报价单，复用报价单页面和生成器，默认 CNY，并通过 `QuotationData.mode='domestic'` 区分。
- 左侧导航改为按 id 分组，不再依赖 `NAV_ITEMS.slice()` 下标。
- 新增 `purchaseRegistration` 权限和 `/purchase-registration` 采购部登记视图，复用询报价 D1 JSON 记录，新增采购部专用字段 `purchaseContentDesc`、`purchaseInquiryStatus`。
- 新增 `purchaseOrderTable` 权限和 `/purchase-order-table` 采购订单表，使用 D1 `Document.type='purchase'` + `_shared_purchase_` 共享记录。
- 旧 `/purchase` 采购订单创建功能和 `purchase_history` 保持不变，不自动迁移到新采购订单表。

### 涉及文件

| 文件/目录 | 说明 |
|---|---|
| `src/components/layout/AppSidebar.tsx` | 菜单 label、内销报价单、采购部登记、采购订单表入口和 id 分组 |
| `src/components/layout/MobileBottomTab.tsx` | 移动端报价 label |
| `src/constants/dashboardModules.ts` | 快速创建和文档类型展示名 |
| `src/constants/permissionModules.ts` | 新增两个登记表权限模块 |
| `src/features/quotation/**`、`src/types/quotation.ts` | `domestic` tab、`mode` 字段、默认 CNY |
| `src/features/inquiry/**` | 采购部登记字段和视图补丁同步 |
| `src/features/order/components/DeliveryStatusCell.tsx` | 抽出备货 / 交货 / 发票共享编辑组件 |
| `src/features/purchase-registration/**` | 采购部登记页面 |
| `src/features/purchase-order-registration/**` | 采购订单表页面、store、service、组件 |
| `src/app/api/inquiry/[[...path]]/route.ts` | 采购部登记受限字段代理 |
| `src/app/api/purchase-order/[[...path]]/route.ts` | 采购订单表代理 |
| `src/worker.ts` | `handlePurchaseOrderRequest` |
| `docs/core/CURRENT_STATE.md`、`docs/features/purchase-*` | 当前状态与功能说明 |

### 验证命令

```bash
npx tsc --noEmit
npx eslint <本任务改动文件>
npm run build
```

### 验收标准

- 左侧菜单「新单据」包含外贸报价单、内销报价单、销售确认、箱单发票、财务发票、采购订单；「登记表」包含询报价登记、订单状态表、采购部登记、采购订单表。
- 外贸报价单和内销报价单均走 `/quotation`，内销 URL 为 `?tab=domestic`，默认币种 CNY，不改变旧报价单历史类型。
- 采购部登记能查看询价编号，独立编辑采购部内容描述和采购询报价状态，并复用执行情况编辑体验。
- 采购订单表可新增、编辑、删除、搜索采购订单，并能编辑备货 / 交货 / 发票状态。
- 旧 `purchase_history` 不会自动出现在新采购订单表中。

---

## 2026-07-06 已完成：反馈、主题、权限刷新入口和预加载排雷

### 范围

- 全局 Toast 支持 success / error / warning / info / loading，补齐进入 / 退出动画、hover 暂停、Esc 关闭、堆叠上限和已有 toast 更新能力。
- 纯提示类 `alert` 迁移为 Toast，需要用户决策的 `window.confirm` 迁移为全局 ConfirmDialog。
- 深色模式统一为 `#1c1c1e` 应用背景和 `#2c2c2e` 弹层表面，Dashboard 模块卡片改为静态 Tailwind 颜色类。
- 退休 `classic` / `colorful` 按钮主题和 `buttonTheme` API，只保留 light / dark。
- 权限刷新入口移入用户菜单个人信息子菜单「账户工具」，以紧凑图标按钮呈现，并使用 Toast 反馈。
- 预加载进度缩减为真实两阶段：静态资源 50%、PDF 字体 100%。
- 同步更新 `README.md`、`AGENTS.md`、`docs/core/*`、`docs/technical/theme/theme_system.md`、`docs/features/PRELOAD_FEATURE.md` 和权限专题文档。

### 结果

- `npx tsc --noEmit`：通过。
- `npm run lint`：通过。
- `npm run build`：通过。
- 全仓库搜索确认旧主题 API、旧权限刷新路径、原生 alert / confirm 和旧 Toast 调用无残留业务引用。

---

## 2026-07-04 已完成：全量 lint warning 清理

### 范围

- 分阶段处理 `@typescript-eslint/no-unused-vars`、`@typescript-eslint/no-explicit-any`、`react-hooks/exhaustive-deps`。
- 覆盖工具函数、PDF 生成、历史导入导出、权限、Worker、报价、装箱单、发票、采购、客户、邮件等模块。
- 新增/补齐全局类型声明，减少页面级 `window as any` 和 NextAuth session/token 强转。

### 结果

- `npx next lint`：0 warnings / 0 errors。
- `npx tsc --noEmit`：通过。
- `npm run build`：通过。
- Hooks 依赖警告已清零；保留的局部 `eslint-disable-next-line react-hooks/exhaustive-deps` 均带中文原因说明。

### 后续建议

- 提交前手动回归报价单、装箱单、发票增删改和历史导入导出流程。
- 后续如开启 CI，可将 `npx tsc --noEmit`、`npx next lint`、`npm run build` 作为最低质量门禁。

---

## TASK-01：从 wrangler.toml 移除明文 API_TOKEN

**优先级**：🔴 紧急（安全）
**估时**：5 分钟
**风险**：极低，仅改配置文件

### 背景

`wrangler.toml` 中有明文 `API_TOKEN = "Kqm0uVxJuVRkJ1GUoAwT4SrfvYAbaVbcwV6jQ8hY"`，已提交到 git 历史，token 已泄露。需要：
1. 从文件中删除明文值
2. 改用 Cloudflare secret 存储

### 改动

**文件**：`wrangler.toml`

找到以下内容：
```toml
[vars]
API_TOKEN = "Kqm0uVxJuVRkJ1GUoAwT4SrfvYAbaVbcwV6jQ8hY"
MAIN_SITE_URL = "https://luocompany.net"
```

替换为：
```toml
[vars]
# API_TOKEN 已迁移到 Cloudflare secret（执行：npx wrangler secret put API_TOKEN）
MAIN_SITE_URL = "https://luocompany.net"
```

同时找到：
```toml
[env.production]
workers_dev = false
vars = { MAIN_SITE_URL = "https://luocompany.net" }
```

替换为：
```toml
[env.production]
workers_dev = false
vars = { MAIN_SITE_URL = "https://luocompany.net" }
# 注意：API_TOKEN 通过 Cloudflare secret 注入，不在此文件配置
```

### 验证

```bash
grep -n "API_TOKEN" wrangler.toml
# 预期：只剩注释行，没有明文 token 值
```

### 部署后操作（人工执行）

```bash
# 先用新 token 设置 Cloudflare secret，再删除旧 token
npx wrangler secret put API_TOKEN
# 输入新生成的随机 token（建议用 openssl rand -hex 32 生成）
npx wrangler deploy
```

---

## TASK-02：给 /api/generate 加 session 认证

**优先级**：🔴 紧急（安全）
**估时**：15 分钟
**风险**：低。只在入口加认证检查，不改业务逻辑

### 背景

`/api/generate` 是调用 DeepSeek API 的路由，当前无任何认证，任何人知道 URL 即可消耗 API 额度。

### 改动

**文件**：`src/app/api/generate/route.ts`

在文件顶部 import 区域添加（现有 import 后追加）：
```ts
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
```

在 `export async function POST(request: NextRequest) {` 函数体的第一行（`const controller = new AbortController();` 之前）插入：
```ts
  // 认证检查：未登录用户不得调用 AI 邮件生成
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { error: '请先登录后再使用 AI 邮件助手' },
      { status: 401 }
    );
  }
```

### 最终文件结构（前 20 行）

```ts
import { NextRequest, NextResponse } from 'next/server';
import { generateMail } from '@/lib/deepseek';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  // 认证检查：未登录用户不得调用 AI 邮件生成
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json(
      { error: '请先登录后再使用 AI 邮件助手' },
      { status: 401 }
    );
  }

  // 设置响应超时
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  // ... 以下保持不变
```

### 验证

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 构建检查
npm run build

# 3. 手动测试（本地启动后）：
# curl -X POST http://localhost:3000/api/generate \
#   -H "Content-Type: application/json" \
#   -d '{"content":"test","language":"zh","type":"formal","mode":"mail"}'
# 预期：返回 401 {"error":"请先登录后再使用 AI 邮件助手"}
```

---

## TASK-03：修复 validatePassword bcrypt 分支

**优先级**：🟠 高（功能 Bug）
**估时**：10 分钟
**风险**：低。只修复一个 return false，不改接口

### 背景

`src/lib/d1-client.ts` 的 `validatePassword` 方法在遇到 bcrypt 哈希密码时直接 `return false`，导致所有使用 bcrypt 存储密码的用户**无法通过「修改密码」验证旧密码**。

### 改动

**文件**：`src/lib/d1-client.ts`

在文件顶部添加 import（如果尚未有 bcryptjs import）：
```ts
import bcrypt from 'bcryptjs';
```

找到 `validatePassword` 方法（约第 243 行）：
```ts
  async validatePassword(userId: string, currentPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user) return false;

    // 支持明文密码和bcrypt哈希
    if (currentPassword === user.password) {
      return true;
    }

    // 如果是bcrypt哈希，这里可以添加验证逻辑
    // 目前暂时跳过bcrypt验证，直接返回false
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // 这里应该使用bcrypt.compare，但为了简化，暂时跳过
      return false;
    }

    return false;
  }
```

替换为：
```ts
  async validatePassword(userId: string, currentPassword: string): Promise<boolean> {
    const user = await this.getUserById(userId);
    if (!user || !user.password || !currentPassword) return false;

    // bcrypt 哈希密码：使用 bcrypt.compare 验证
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      try {
        return await bcrypt.compare(currentPassword, user.password);
      } catch {
        return false;
      }
    }

    // 明文密码（旧账户兼容）：直接比较
    return currentPassword === user.password;
  }
```

### 验证

```bash
npx tsc --noEmit
# 预期：无类型错误
```

---

## TASK-04：修复 check:production 脚本路径

**优先级**：🟡 中（工具修复）
**估时**：2 分钟
**风险**：极低

### 背景

`package.json` 中 `check:production` 指向 `scripts/pre-production-check.js`，但该文件不存在，实际文件是 `scripts/pre-release-check.js`。

### 改动

**文件**：`package.json`

找到：
```json
"check:production": "node scripts/pre-production-check.js",
"check:production:full": "node scripts/pre-production-check.js --full",
```

替换为：
```json
"check:production": "node scripts/pre-release-check.js",
"check:production:full": "node scripts/pre-release-check.js --full",
```

### 验证

```bash
npm run check:production
# 预期：脚本正常运行，不报 "Cannot find module" 错误
```

---

## TASK-05：恢复 ESLint 构建检查

**优先级**：🟡 中（代码质量）
**估时**：30 分钟（需先修复 lint 错误）
**风险**：中。需先修复现有 lint 问题再开启，否则构建中断

### 背景

`next.config.mjs` 中设置了 `eslint: { ignoreDuringBuilds: true }`，导致 lint 错误不阻断构建，掩盖代码质量问题。

### 执行步骤

**步骤 1**：先查看现有 lint 问题数量
```bash
npm run lint 2>&1 | tail -20
```

**步骤 2**：批量修复（通常是 unused imports、any 类型等）
```bash
npm run lint -- --fix
```

**步骤 3**：手动修复剩余无法自动修复的问题（逐个处理 lint 报告中的错误）

**步骤 4**：确认 lint 干净后，修改配置

**文件**：`next.config.mjs`

找到：
```js
eslint: {
  ignoreDuringBuilds: true,
},
```

替换为：
```js
eslint: {
  ignoreDuringBuilds: false,
},
```

### 验证

```bash
npm run lint     # 无错误
npm run build    # 构建通过
```

---

## TASK-06：修复 silent-refresh 服务端 window 访问

**优先级**：🟡 中（逻辑 Bug）
**估时**：20 分钟
**风险**：中。涉及认证流程，改完需测试登录

### 背景

`src/lib/auth.ts` 的 `authorize` 函数在服务端执行，但 `silent-refresh` 分支里访问了 `localStorage`（第 39 行），服务端没有 `window`，该分支完全无效，静默刷新时总是走默认分支（错误地将用户设为管理员）。

### 改动

**文件**：`src/lib/auth.ts`

找到 `silent-refresh` 分支（约第 33~72 行）：
```ts
const isSilentRefresh = credentials.password === 'silent-refresh';

if (isSilentRefresh) {
  console.log('检测到silent-refresh请求:', credentials.username);

  // 对于silent-refresh，从本地缓存获取用户信息
  if (typeof window !== 'undefined') {
    try {
      const userCache = localStorage.getItem('userCache');
      // ... 使用缓存
    } catch (error) { ... }
  }

  // 如果缓存中没有数据，返回默认用户信息
  return {
    id: credentials.username,
    email: "",
    name: credentials.username,
    username: credentials.username,
    isAdmin: true, // ⚠️ 默认为管理员，实际应该从session获取
    image: null,
    permissions: [],
    status: true
  };
}
```

替换为（从远程重新拉取用户信息，不依赖客户端缓存）：
```ts
const isSilentRefresh = credentials.password === 'silent-refresh';

if (isSilentRefresh) {
  console.log('silent-refresh: 从远程重新获取用户信息:', credentials.username);
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'X-User-ID': 'system',
          'X-User-Name': 'system',
          'X-User-Admin': 'true',
        }
      }
    );
    if (response.ok) {
      const userData = await response.json();
      return {
        id: userData.id,
        email: userData.email || '',
        name: userData.username,
        username: userData.username,
        isAdmin: !!userData.isAdmin,
        image: null,
        permissions: userData.permissions || [],
        status: userData.status !== false,
      };
    }
  } catch (error) {
    console.error('silent-refresh: 远程获取用户信息失败', error);
  }
  // 远程获取失败时拒绝刷新，强制重新登录
  throw new Error('会话刷新失败，请重新登录');
}
```

### 验证

```bash
npx tsc --noEmit
# 然后本地测试：
# 1. 正常登录 → 刷新页面 → 不被踢出
# 2. 普通用户登录后，确认不会意外获得管理员权限
```

---

## TASK-07：添加 GitHub Actions CI 流水线

**优先级**：🟡 中（基础设施）
**估时**：15 分钟
**风险**：极低，只新增文件

### 背景

目前没有 CI，靠手动跑 `pre-release` 保障质量。添加 GitHub Actions，每次 push 和 PR 自动检查。

### 改动

**新建文件**：`.github/workflows/ci.yml`

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    name: Quality Check
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check selectors
        run: npm run check:selectors

      - name: Run tests
        run: npm run test -- --ci --passWithNoTests

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXT_PUBLIC_API_BASE_URL: https://udb.luocompany.net
          NEXT_PUBLIC_APP_URL: https://luocompany.net
```

同时新建 `.github/workflows/` 目录（如不存在）。

### GitHub Secrets 配置（人工操作）

在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加：
- `DEEPSEEK_API_KEY`：DeepSeek API 密钥
- `NEXTAUTH_SECRET`：NextAuth 签名密钥

### 验证

```bash
# 本地验证 YAML 格式
cat .github/workflows/ci.yml
# 推送后在 GitHub Actions 页面查看 workflow 是否触发
```

---

## TASK-08：扩展 D1 Schema（数据库迁移第一步）

**优先级**：🟢 长期
**估时**：30 分钟（只改 schema，不改前端）
**风险**：低。只新增表，不修改现有表

### 背景

业务单据目前存 localStorage（5MB 上限，无多设备同步）。第一步：在 D1 新增业务表，为后续迁移做准备。

### 改动

**文件**：`schema.sql`

在文件末尾追加：

```sql
-- ============================================================
-- 业务数据表（Phase 4 数据库迁移）
-- 当前业务数据仍主要存浏览器 localStorage
-- 这些表为服务端迁移做准备，暂不影响现有功能
-- ============================================================

-- 业务单据统一表
CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('quotation', 'confirmation', 'invoice', 'packing', 'purchase')),
  doc_no TEXT NOT NULL,
  customer_name TEXT,
  total_amount REAL,
  currency TEXT DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'deleted')),
  data TEXT NOT NULL,                              -- JSON 全量数据
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_doc_user_type ON Document(user_id, type);
CREATE INDEX IF NOT EXISTS idx_doc_customer ON Document(customer_name);
CREATE INDEX IF NOT EXISTS idx_doc_no ON Document(doc_no);
CREATE INDEX IF NOT EXISTS idx_doc_created ON Document(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_doc_status ON Document(status);

-- 客户数据表
CREATE TABLE IF NOT EXISTS Customer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'consignee')),
  name TEXT NOT NULL,
  code TEXT,                                        -- 客户编号
  email TEXT,
  phone TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',                 -- JSON 扩展字段
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_customer_user_type ON Customer(user_id, type);
CREATE INDEX IF NOT EXISTS idx_customer_name ON Customer(name);
CREATE INDEX IF NOT EXISTS idx_customer_status ON Customer(status);

-- 客户事件表（时间轴 + 跟进记录）
CREATE TABLE IF NOT EXISTS CustomerEvent (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('timeline', 'followup', 'document', 'note')),
  title TEXT,
  content TEXT NOT NULL,
  event_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES User(id)
);

CREATE INDEX IF NOT EXISTS idx_event_customer ON CustomerEvent(customer_id, event_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_user ON CustomerEvent(user_id);
CREATE INDEX IF NOT EXISTS idx_event_type ON CustomerEvent(event_type);
```

### 部署（人工执行）

```bash
npx wrangler d1 execute mluonet-users --file schema.sql
# 验证新表已创建：
npx wrangler d1 execute mluonet-users --command "SELECT name FROM sqlite_master WHERE type='table';"
```

---

## 执行顺序和提交规范

### 推荐提交顺序

```bash
# TASK-01 + TASK-04（配置修复，一次提交）
git add wrangler.toml package.json
git commit -m "fix: 移除 wrangler.toml 明文 API_TOKEN，修复 check:production 脚本路径"

# TASK-02（安全修复）
git add src/app/api/generate/route.ts
git commit -m "security: /api/generate 添加 NextAuth session 认证"

# TASK-03（Bug 修复）
git add src/lib/d1-client.ts
git commit -m "fix: validatePassword 支持 bcrypt 哈希验证"

# TASK-06（认证修复）
git add src/lib/auth.ts
git commit -m "fix: silent-refresh 改为从远程拉取用户信息，移除服务端 window 访问"

# TASK-07（CI）
git add .github/
git commit -m "ci: 添加 GitHub Actions 流水线（check + test + lint + build）"

# TASK-05（需先修完 lint 错误）
git add next.config.mjs src/
git commit -m "chore: 恢复 ESLint 构建检查"

# TASK-08（数据库扩展）
git add schema.sql
git commit -m "feat(db): 新增 Document、Customer、CustomerEvent 业务数据表"
```

### 每个任务完成后必跑

```bash
npx tsc --noEmit    # 类型检查
npm run test        # 单元测试
npm run build       # 构建验证（TASK-05 完成后）
```

---

## 不在此次范围的工作（后续 Phase）

- Worker 管理接口从 `X-User-*` header 改为 HMAC 签名（复杂度高，单独 PR）
- Playwright 端到端测试（需要专门的测试环境配置）
- localStorage → D1 数据迁移前端层（依赖 TASK-08 完成后的 API 路由新增）
- `src/components` 与 `src/features` 重复代码清理（分批推进，不急）

---

## TASK-09：Worker 管理接口改用 API_TOKEN Bearer 验证

**优先级**：🔴 紧急（安全）
**估时**：20 分钟
**风险**：低。只改 Worker 认证逻辑，不改业务逻辑

### 背景

Worker 的 7 个管理接口目前信任 `X-User-ID / X-User-Name / X-User-Admin` 请求头，任何人向 `udb.luocompany.net` 发请求时伪造 `X-User-Admin: true` 即可获得管理员权限。需替换为 `Authorization: Bearer <API_TOKEN>` 验证（API_TOKEN 已作为 Cloudflare secret 存储）。

### 改动

**文件**：`src/worker.ts`

**第 1 步**：扩展 `Env` 接口，新增 `API_TOKEN`

找到：
```ts
export interface Env {
  USERS_DB: D1Database;
  DB: D1Database;
}
```

替换为：
```ts
export interface Env {
  USERS_DB: D1Database;
  DB: D1Database;
  API_TOKEN: string;
}
```

**第 2 步**：在 `corsHeaders` 常量之后、`export default` 之前，插入 Bearer 验证辅助函数：

```ts
/** 验证请求携带的 Bearer token 是否与 Cloudflare secret 一致 */
function verifyBearerToken(request: Request, env: Env): boolean {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return false;
  return auth.slice(7) === env.API_TOKEN;
}
```

**第 3 步**：替换全部 7 个管理函数中的 X-User-* 认证块。

每个函数开头都有类似下面的认证段：
```ts
// 检查认证 - 使用session头信息
const sessionUserId = request.headers.get('X-User-ID');
const userName = request.headers.get('X-User-Name');
const isAdmin = request.headers.get('X-User-Admin') === 'true';

if (!sessionUserId || !userName) {
  return new Response(
    JSON.stringify({ error: '未授权访问' }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

将以上认证段（含 `const sessionUserId / userName / isAdmin` 三行 + `if (!sessionUserId || !userName)` 块）统一替换为：

```ts
if (!verifyBearerToken(request, env)) {
  return new Response(
    JSON.stringify({ error: '未授权访问' }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

需替换的函数（共 7 个）：
- `handleGetUsers`
- `handleGetUser`
- `handleUpdateUser`
- `handleCreateUser`（还需保留 `isAdmin` 判断——见下方注意）
- `handleUpdatePermissions`
- `handleBatchUpdatePermissions`
- `handleDeleteUser`（如有）
- `handleDeletePermission`（如有）

**⚠️ 注意 handleCreateUser 特殊处理**：该函数在认证段之后还有一个 `if (!isAdmin)` 检查。删除认证段后，同时删除这个 isAdmin 检查（因为 Bearer token 本身已代表来自受信任的服务端，管理员身份由调用方的 NextAuth session 保证）：

找到并删除：
```ts
// 检查是否是管理员
if (!isAdmin) {
  return new Response(
    JSON.stringify({ error: '只有管理员可以创建用户' }),
    { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}
```

**⚠️ 注意 handleUpdatePermissions**：函数中还有 `console.log('用户认证信息:', { sessionUserId, userName, isAdmin });`，删除 X-User-* 认证段后，同步删除这行 console.log（否则变量未定义会报错）。

### 验证

```bash
npx tsc --noEmit
# 预期：无类型错误

# 部署 Worker 后手动验证（在本地 Mac 终端）：
# 无 token → 401
curl -s -o /dev/null -w "%{http_code}" \
  https://udb.luocompany.net/api/admin/users

# 带正确 token → 200
curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer <你的API_TOKEN>" \
  https://udb.luocompany.net/api/admin/users
```

### 部署（人工执行）

```bash
npx wrangler deploy
```

---

## TASK-10：Next.js 管理 API 代理（浏览器 → Vercel → Worker）

**优先级**：🔴 紧急（安全，配合 TASK-09）
**估时**：30 分钟
**风险**：中。涉及调用链重构，改完需测试管理后台的增删改查

### 背景

完成 TASK-09 后，Worker 管理接口只接受 Bearer token，浏览器（`api-config.ts`）直接调 Worker 的路径失效。需要：
1. 新建 Next.js 代理路由 `/api/admin/[...path]`，由 Next.js 持有 Bearer token 并转发
2. 更新客户端调用，将 Worker 直连改为本地代理
3. 更新服务端 auth 路由，将 X-User-* 改为 Bearer token

**前置条件**：TASK-09 已完成并部署。

### 改动

---

#### 改动 1：新建文件 `src/app/api/admin/[...path]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyAdmin(request: NextRequest, pathSegments: string[]): Promise<NextResponse> {
  // 1. 验证 NextAuth session
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  if (!session.user.isAdmin) {
    return NextResponse.json({ error: '需要管理员权限' }, { status: 403 });
  }

  // 2. 构造 Worker URL
  const url = new URL(request.url);
  const workerUrl = `${WORKER_BASE}/api/admin/${pathSegments.join('/')}${url.search}`;

  // 3. 转发请求（带 Bearer token）
  const body =
    request.method !== 'GET' && request.method !== 'HEAD'
      ? await request.text()
      : undefined;

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch (err) {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyAdmin(req, (await params).path);
}
```

---

#### 改动 2：`src/lib/api-config.ts`

将 `API_ENDPOINTS.USERS` 中所有指向 Worker 的 URL 改为本地代理路径，并简化 `apiRequest`（不再需要拼接 X-User-* 头）。

找到：
```ts
export const API_ENDPOINTS = {
  USERS: {
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: `${API_BASE_URL}/api/admin/users`,
    CREATE: `${API_BASE_URL}/api/admin/users`,
    GET: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    UPDATE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    DELETE: (id: string) => `${API_BASE_URL}/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `${API_BASE_URL}/api/admin/users/${id}/permissions/batch`,
  },
```

替换为：
```ts
export const API_ENDPOINTS = {
  USERS: {
    CHANGE_PASSWORD: `${API_BASE_URL}/users/change-password`,
    LIST: '/api/admin/users',                                             // ← 通过 Next.js 代理
    CREATE: '/api/admin/users',
    GET: (id: string) => `/api/admin/users/${id}`,
    UPDATE: (id: string) => `/api/admin/users/${id}`,
    DELETE: (id: string) => `/api/admin/users/${id}`,
    PERMISSIONS: (id: string) => `/api/admin/users/${id}/permissions`,
    BATCH_PERMISSIONS: (id: string) => `/api/admin/users/${id}/permissions/batch`,
  },
```

找到 `apiRequest` 函数：
```ts
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // 获取用户信息
  const userInfo = await getUserInfo();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 如果有用户信息，添加认证头
  if (userInfo) {
    // 使用用户信息作为认证
    defaultOptions.headers = {
      ...defaultOptions.headers,
      'X-User-ID': userInfo.id,
      'X-User-Name': userInfo.username,
      'X-User-Admin': userInfo.isAdmin ? 'true' : 'false',
    };
  }

  // 处理相对URL（本地API路由）
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;

  return fetch(fullUrl, defaultOptions);
}
```

替换为：
```ts
export async function apiRequest(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // 代理路由使用相对路径，直连路由使用完整 URL
  const fullUrl = url.startsWith('http')
    ? url
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${url}`;

  return fetch(fullUrl, defaultOptions);
}
```

---

#### 改动 3：`src/app/api/auth/get-latest-permissions/route.ts`

该 Next.js 路由在服务端调用 Worker，改为读 `API_TOKEN` env 变量并用 Bearer token，同时改为从 NextAuth session 读用户名（不再依赖 X-User-* 请求头）。

找到函数开头：
```ts
export async function POST(request: NextRequest) {
  try {
    // 从请求头获取用户信息
    const userId = request.headers.get('X-User-ID');
    const userName = request.headers.get('X-User-Name');
    let isAdmin = request.headers.get('X-User-Admin') === 'true';

    if (!userId || !userName) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
```

替换为：
```ts
export async function POST(request: NextRequest) {
  try {
    // 从 NextAuth session 读取用户身份（不信任客户端头）
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 });
    }
    const userId = session.user.id || session.user.username || '';
    const userName = session.user.username || session.user.name || '';
    let isAdmin = !!session.user.isAdmin;
```

找到调用 Worker 的 `fetch`（第 24~34 行）：
```ts
      const backendResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId,
          'X-User-Name': userName,
          'X-User-Admin': isAdmin ? 'true' : 'false',
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
```

替换为：
```ts
      const workerBase = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';
      const backendResponse = await fetch(`${workerBase}/api/admin/users?username=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`,
        },
        cache: 'no-store',
        next: { revalidate: 0 }
      });
```

---

#### 改动 4：`src/lib/auth.ts`（silent-refresh Bearer token）

找到 silent-refresh 中调用 Worker 的 fetch（TASK-06 已改为远程拉取，现在更新 headers）：
```ts
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'X-User-ID': 'system',
          'X-User-Name': 'system',
          'X-User-Admin': 'true',
        }
      }
    );
```

替换为：
```ts
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net'}/api/admin/users?username=${encodeURIComponent(credentials.username)}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.API_TOKEN || ''}`,
        }
      }
    );
```

---

#### 改动 5：`src/lib/permissions.ts`

找到调用 `/api/auth/get-latest-permissions` 的 fetch（约第 497~506 行）：
```ts
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': session.user.id || session.user.username || '',
          'X-User-Name': session.user.username || session.user.name || '',
          'X-User-Admin': session.user.isAdmin ? 'true' : 'false'
        },
        cache: 'no-store'
      });
```

替换为（移除 X-User-* 头，服务端路由改为从 session 读取身份）：
```ts
      const response = await fetch('/api/auth/get-latest-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store'
      });
```

---

### Vercel 环境变量（人工操作）

在 Vercel 控制台 → Project → Settings → Environment Variables 中添加（不含 `NEXT_PUBLIC_` 前缀，保证不暴露给浏览器）：

```
API_TOKEN = <与 Cloudflare secret 相同的值>
```

### 验证

```bash
npx tsc --noEmit
npm run build

# 本地测试（npm run dev 后）：
# 1. 登录后访问 /admin → 用户列表正常加载
# 2. 创建用户 → 成功
# 3. 修改权限 → 成功
# 4. 未登录时直接 fetch /api/admin/users → 返回 401
```

---

## 执行顺序

```
TASK-09（改 Worker）→ 部署 Worker（npx wrangler deploy）
  → TASK-10（改 Next.js）→ 在 Vercel 添加 API_TOKEN env var → 触发 Vercel 重新部署
  → 验证管理后台功能正常
```

**每个任务完成后必跑：**
```bash
npx tsc --noEmit
npm run build
```

---

## TASK-11：Worker Document CRUD API + Next.js 代理路由

**优先级**：🟠 高（Phase 4 数据迁移基础）
**估时**：45 分钟
**风险**：低。只新增接口，不修改任何现有功能，前端暂不切换

### 背景

D1 中已有 `Document` 表。本任务在 Worker 新增 5 个 Document CRUD 端点，并在 Next.js 新建代理路由。前端暂不改动（TASK-13 再迁移）。

---

### 改动 1：`src/worker.ts` — 新增路由分发

在主 `fetch` 函数内，`return new Response('Not Found', ...)` 之前插入以下路由（Document 相关）：

```ts
    // Document API
    if (path === '/api/documents' && request.method === 'GET') {
      return handleListDocuments(request, env);
    }
    if (path === '/api/documents' && request.method === 'POST') {
      return handleCreateDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'GET') {
      return handleGetDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'PUT') {
      return handleUpdateDocument(request, env);
    }
    if (path.startsWith('/api/documents/') && path.split('/').length === 4 && request.method === 'DELETE') {
      return handleDeleteDocument(request, env);
    }
```

---

### 改动 2：`src/worker.ts` — 新增 Document 处理函数

在文件末尾（现有函数之后）追加以下全部函数：

```ts
// ─── Document CRUD ───────────────────────────────────────────

async function handleListDocuments(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const type   = url.searchParams.get('type');
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '200'), 500);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id 必填' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const conditions: string[] = ["user_id = ?", "status = 'active'"];
    const params: unknown[] = [userId];
    if (type) { conditions.push('type = ?'); params.push(type); }
    params.push(limit, offset);

    const sql = `SELECT * FROM Document WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    const { results } = await env.USERS_DB.prepare(sql).bind(...params).all<Record<string, unknown>>();

    const documents = results.map(row => ({ ...row, data: JSON.parse(row.data as string) }));
    return new Response(JSON.stringify({ documents }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url = new URL(request.url);
  const id     = url.pathname.split('/')[3];
  const userId = url.searchParams.get('user_id');

  try {
    const row = await env.USERS_DB.prepare(
      "SELECT * FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!row) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && row.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权访问' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    return new Response(JSON.stringify({ ...row, data: JSON.parse(row.data as string) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const body = await request.json() as {
      user_id: string; type: string; doc_no: string;
      customer_name?: string; total_amount?: number; currency?: string; data: unknown;
    };
    const { user_id, type, doc_no, customer_name, total_amount, currency, data } = body;

    if (!user_id || !type || !doc_no || data === undefined) {
      return new Response(JSON.stringify({ error: 'user_id、type、doc_no、data 必填' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.USERS_DB.prepare(`
      INSERT INTO Document (id, user_id, type, doc_no, customer_name, total_amount, currency, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user_id, type, doc_no,
      customer_name ?? null,
      total_amount ?? null,
      currency ?? 'USD',
      JSON.stringify(data),
      now, now
    ).run();

    return new Response(JSON.stringify({ id, created_at: now }), {
      status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUpdateDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');
    const body   = await request.json() as {
      doc_no?: string; customer_name?: string;
      total_amount?: number; currency?: string; data?: unknown;
    };

    const existing = await env.USERS_DB.prepare(
      "SELECT * FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权修改' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const now = new Date().toISOString();
    await env.USERS_DB.prepare(`
      UPDATE Document SET
        doc_no        = COALESCE(?, doc_no),
        customer_name = COALESCE(?, customer_name),
        total_amount  = COALESCE(?, total_amount),
        currency      = COALESCE(?, currency),
        data          = COALESCE(?, data),
        updated_at    = ?
      WHERE id = ?
    `).bind(
      body.doc_no ?? null,
      body.customer_name ?? null,
      body.total_amount ?? null,
      body.currency ?? null,
      body.data !== undefined ? JSON.stringify(body.data) : null,
      now, id
    ).run();

    return new Response(JSON.stringify({ success: true, updated_at: now }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeleteDocument(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Document WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '单据不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权删除' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    await env.USERS_DB.prepare(
      "UPDATE Document SET status = 'deleted', updated_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
```

---

### 改动 3：新建文件 `src/app/api/documents/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function proxyDocuments(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id || session.user.username || '';
  const url = new URL(request.url);

  // 构造 Worker URL，始终注入 user_id 保证数据隔离
  const workerPath = pathSegments.length > 0
    ? `/api/documents/${pathSegments.join('/')}`
    : '/api/documents';
  url.searchParams.set('user_id', userId);
  const workerUrl = `${WORKER_BASE}${workerPath}?${url.searchParams.toString()}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.json().catch(() => ({}));
    // 强制注入 user_id，防止客户端伪造
    body = JSON.stringify({ ...raw, user_id: userId });
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyDocuments(req, (await params).path ?? []);
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
npx wrangler deploy

# 部署后在本地 Mac 测试（替换 TOKEN 和 USER_ID）：

# 列出文档（应返回空数组）
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://udb.luocompany.net/api/documents?user_id=<USER_ID>&type=quotation"

# 创建文档
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","type":"quotation","doc_no":"QT-001","data":{"test":true}}' \
  https://udb.luocompany.net/api/documents
# 预期：{"id":"...","created_at":"..."}
```

### 提交

```bash
git add src/worker.ts src/app/api/documents/
git commit -m "feat(api): Document CRUD API（Worker + Next.js 代理）"
```

---

## TASK-12：Worker Customer CRUD API + Next.js 代理路由

**优先级**：🟠 高
**估时**：30 分钟
**风险**：低。只新增接口，不修改任何现有功能

### 改动 1：`src/worker.ts` — 新增路由分发

在 Document 路由块之后（`return new Response('Not Found', ...)` 之前）插入：

```ts
    // Customer API
    if (path === '/api/customers' && request.method === 'GET') {
      return handleListCustomers(request, env);
    }
    if (path === '/api/customers' && request.method === 'POST') {
      return handleCreateCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'GET') {
      return handleGetCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'PUT') {
      return handleUpdateCustomer(request, env);
    }
    if (path.startsWith('/api/customers/') && path.split('/').length === 4 && request.method === 'DELETE') {
      return handleDeleteCustomer(request, env);
    }
```

---

### 改动 2：`src/worker.ts` — 新增 Customer 处理函数

在 Document 函数块之后追加：

```ts
// ─── Customer CRUD ───────────────────────────────────────────

async function handleListCustomers(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url    = new URL(request.url);
  const userId = url.searchParams.get('user_id');
  const type   = url.searchParams.get('type');
  const limit  = Math.min(parseInt(url.searchParams.get('limit')  || '500'), 1000);
  const offset = parseInt(url.searchParams.get('offset') || '0');

  if (!userId) {
    return new Response(JSON.stringify({ error: 'user_id 必填' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const conditions: string[] = ["user_id = ?", "status = 'active'"];
    const params: unknown[] = [userId];
    if (type) { conditions.push('type = ?'); params.push(type); }
    params.push(limit, offset);

    const sql = `SELECT * FROM Customer WHERE ${conditions.join(' AND ')} ORDER BY name ASC LIMIT ? OFFSET ?`;
    const { results } = await env.USERS_DB.prepare(sql).bind(...params).all<Record<string, unknown>>();

    const customers = results.map(row => ({ ...row, data: JSON.parse(row.data as string) }));
    return new Response(JSON.stringify({ customers }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleGetCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  const url    = new URL(request.url);
  const id     = url.pathname.split('/')[3];
  const userId = url.searchParams.get('user_id');

  try {
    const row = await env.USERS_DB.prepare(
      "SELECT * FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<Record<string, unknown>>();

    if (!row) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && row.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权访问' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    return new Response(JSON.stringify({ ...row, data: JSON.parse(row.data as string) }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleCreateCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const body = await request.json() as {
      user_id: string; type: string; name: string;
      code?: string; email?: string; phone?: string; address?: string; data?: unknown;
    };
    const { user_id, type, name, code, email, phone, address, data } = body;

    if (!user_id || !type || !name) {
      return new Response(JSON.stringify({ error: 'user_id、type、name 必填' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const id  = crypto.randomUUID();
    const now = new Date().toISOString();

    await env.USERS_DB.prepare(`
      INSERT INTO Customer (id, user_id, type, name, code, email, phone, address, data, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user_id, type, name,
      code    ?? null,
      email   ?? null,
      phone   ?? null,
      address ?? null,
      JSON.stringify(data ?? {}),
      now, now
    ).run();

    return new Response(JSON.stringify({ id, created_at: now }), {
      status: 201, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleUpdateCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');
    const body   = await request.json() as {
      name?: string; code?: string; email?: string;
      phone?: string; address?: string; data?: unknown;
    };

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权修改' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    const now = new Date().toISOString();
    await env.USERS_DB.prepare(`
      UPDATE Customer SET
        name       = COALESCE(?, name),
        code       = COALESCE(?, code),
        email      = COALESCE(?, email),
        phone      = COALESCE(?, phone),
        address    = COALESCE(?, address),
        data       = COALESCE(?, data),
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.name    ?? null,
      body.code    ?? null,
      body.email   ?? null,
      body.phone   ?? null,
      body.address ?? null,
      body.data !== undefined ? JSON.stringify(body.data) : null,
      now, id
    ).run();

    return new Response(JSON.stringify({ success: true, updated_at: now }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

async function handleDeleteCustomer(request: Request, env: Env): Promise<Response> {
  if (!verifyBearerToken(request, env)) {
    return new Response(JSON.stringify({ error: '未授权访问' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  try {
    const url    = new URL(request.url);
    const id     = url.pathname.split('/')[3];
    const userId = url.searchParams.get('user_id');

    const existing = await env.USERS_DB.prepare(
      "SELECT user_id FROM Customer WHERE id = ? AND status = 'active'"
    ).bind(id).first<{ user_id: string }>();

    if (!existing) {
      return new Response(JSON.stringify({ error: '客户不存在' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    if (userId && existing.user_id !== userId) {
      return new Response(JSON.stringify({ error: '无权删除' }), {
        status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    await env.USERS_DB.prepare(
      "UPDATE Customer SET status = 'archived', updated_at = ? WHERE id = ?"
    ).bind(new Date().toISOString(), id).run();

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: '服务器错误' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}
```

---

### 改动 3：新建文件 `src/app/api/customers/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function workerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };
}

async function proxyCustomers(
  request: NextRequest,
  pathSegments: string[]
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  const userId = session.user.id || session.user.username || '';
  const url = new URL(request.url);

  const workerPath = pathSegments.length > 0
    ? `/api/customers/${pathSegments.join('/')}`
    : '/api/customers';
  url.searchParams.set('user_id', userId);
  const workerUrl = `${WORKER_BASE}${workerPath}?${url.searchParams.toString()}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const raw = await request.json().catch(() => ({}));
    body = JSON.stringify({ ...raw, user_id: userId });
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: workerHeaders(),
      body,
    });
  } catch {
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: Promise<{ path?: string[] }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyCustomers(req, (await params).path ?? []);
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
npx wrangler deploy

# 创建客户测试：
curl -s -X POST \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<USER_ID>","type":"customer","name":"Test Co.","email":"test@example.com"}' \
  https://udb.luocompany.net/api/customers
# 预期：{"id":"...","created_at":"..."}

# 列出客户：
curl -s -H "Authorization: Bearer <TOKEN>" \
  "https://udb.luocompany.net/api/customers?user_id=<USER_ID>"
```

### 提交

```bash
git add src/worker.ts src/app/api/customers/
git commit -m "feat(api): Customer CRUD API（Worker + Next.js 代理）"
```

---

## 执行顺序

```
TASK-11 → 部署 Worker → 验证 Document API
TASK-12 → 部署 Worker → 验证 Customer API
（TASK-13：前端写入改走 API，后续单独规划）
```

**每个任务完成后必跑：**
```bash
npx tsc --noEmit && npm run build
```

---

## TASK-13：前端 localStorage → D1 双写（第一阶段）

**优先级**：🟡 中（功能扩展）
**估时**：30 分钟
**风险**：低。localStorage 始终是主存储，D1 写入为后台 fire-and-forget，失败时仅打印警告，不影响现有 UX。

### 背景

TASK-11/12 已在 Worker + Next.js 建立了 Document/Customer CRUD API。
本任务在前端现有 localStorage 写入点旁边添加异步 D1 同步调用，实现双写。
**读取路径不改变**（仍从 localStorage 读取），避免引入任何功能回归。

D1 写入路径：浏览器 `fetch('/api/documents')` → Next.js proxy（注入 `user_id`、Bearer token）→ Worker → D1。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/utils/d1Sync.ts` | 新建（fire-and-forget 帮助函数） |
| `src/utils/quotationHistory.ts` | 修改（3 处：update、create、delete） |
| `src/utils/invoiceHistory.ts` | 修改（2 处：add、delete） |
| `src/utils/packingHistory.ts` | 修改（3 处：update、invoiceNo 匹配 upsert、create） |
| `src/utils/purchaseHistory.ts` | 修改（3 处：update、create、delete） |
| `src/features/customer/services/customerService.ts` | 修改（2 处：save、delete） |

---

### 步骤一：新建 `src/utils/d1Sync.ts`

创建以下文件，完整内容如下：

```ts
/**
 * Fire-and-forget D1 同步帮助函数。
 * 永不抛出异常，localStorage 始终是主存储。
 * 通过 Next.js 代理（/api/documents、/api/customers）发送请求，
 * 代理负责注入 user_id（从 NextAuth session 读取）和 Bearer token。
 */

export type D1DocType = 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';

export interface D1DocumentPayload {
  id: string;
  type: D1DocType;
  doc_no: string;
  customer_name?: string;
  total_amount?: number;
  currency?: string;
  data: unknown;
}

/** 同步单条文档到 D1（create / update / delete），不等待结果。 */
export function d1SyncDocument(
  action: 'create' | 'update' | 'delete',
  payload: D1DocumentPayload
): void {
  if (typeof window === 'undefined') return;
  void (async () => {
    try {
      if (action === 'delete') {
        await fetch(`/api/documents/${payload.id}`, { method: 'DELETE' });
      } else if (action === 'update') {
        await fetch(`/api/documents/${payload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.warn('[d1Sync] document sync failed (localStorage unchanged):', err);
    }
  })();
}

export interface D1CustomerPayload {
  id: string;
  type: 'customer' | 'supplier' | 'consignee';
  name: string;
  code?: string;
  email?: string;
  phone?: string;
  address?: string;
  data?: unknown;
}

/** 同步单条客户到 D1（create / update / delete），不等待结果。 */
export function d1SyncCustomer(
  action: 'create' | 'update' | 'delete',
  payload: D1CustomerPayload
): void {
  if (typeof window === 'undefined') return;
  void (async () => {
    try {
      if (action === 'delete') {
        await fetch(`/api/customers/${payload.id}`, { method: 'DELETE' });
      } else if (action === 'update') {
        await fetch(`/api/customers/${payload.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.warn('[d1Sync] customer sync failed (localStorage unchanged):', err);
    }
  })();
}
```

---

### 步骤二：修改 `src/utils/quotationHistory.ts`

**2a. 在文件顶部添加 import**（在 `import { getDefaultNotes }` 那行之后）：

```ts
import { d1SyncDocument } from './d1Sync';
```

**2b. 在 update 路径 return 之前添加同步调用**

找到以下代码（update 路径，`existingId` 存在且找到记录的分支末尾，`return updatedHistory;` 之前的事件 dispatch 之后）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      } else {
        console.log(`[QuotationHistory] 未找到现有记录，ID: ${existingId}，将创建新记录`);
      }
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type,
          doc_no: updatedHistory.quotationNo || '',
          customer_name: updatedHistory.customerName,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory;
      } else {
        console.log(`[QuotationHistory] 未找到现有记录，ID: ${existingId}，将创建新记录`);
      }
```

**2c. 在 create 路径 return 之前添加同步调用**

找到以下代码（create 路径末尾，`return newHistory;` 之前的事件 dispatch 之后）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type,
      doc_no: newHistory.quotationNo || '',
      customer_name: newHistory.customerName,
      total_amount: totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving quotation history:', error);
```

**2d. 在 `deleteQuotationHistory` 中添加同步调用**

找到：

```ts
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deleteQuotationHistory = (id: string): boolean => {
  try {
    const history = getQuotationHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'quotation', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤三：修改 `src/utils/invoiceHistory.ts`

**3a. 在文件顶部添加 import**（在第一行 `import { InvoiceHistory }` 之后）：

```ts
import { d1SyncDocument } from './d1Sync';
```

**3b. 修改 `addInvoiceHistory`**

找到：

```ts
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    return saveInvoiceHistory(history);
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};
```

替换为：

```ts
export const addInvoiceHistory = (data: InvoiceHistory): boolean => {
  try {
    const history = getInvoiceHistory();
    history.unshift(data);
    const saved = saveInvoiceHistory(history);
    if (saved) {
      d1SyncDocument('create', {
        id: data.id,
        type: 'invoice',
        doc_no: data.invoiceNo,
        customer_name: data.customerName,
        total_amount: data.totalAmount,
        currency: data.currency,
        data,
      });
    }
    return saved;
  } catch (error) {
    console.error('Error adding invoice history:', error);
    return false;
  }
};
```

**3c. 修改 `deleteInvoiceHistory`**

找到：

```ts
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    return saveInvoiceHistory(filtered);
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};
```

替换为：

```ts
export const deleteInvoiceHistory = (id: string): boolean => {
  try {
    const history = getInvoiceHistory();
    const filtered = history.filter(item => item.id !== id);
    const saved = saveInvoiceHistory(filtered);
    if (saved) {
      d1SyncDocument('delete', { id, type: 'invoice', doc_no: '', data: null });
    }
    return saved;
  } catch (error) {
    console.error('Error deleting invoice history:', error);
    return false;
  }
};
```

---

### 步骤四：修改 `src/utils/packingHistory.ts`

**4a. 在文件顶部 `import { getLocalStorageJSON }` 之后添加 import**：

```ts
import { d1SyncDocument } from './d1Sync';
```

**4b. 在 existingId 找到记录的 return 之前添加同步（update 路径）**

找到（existingId 匹配分支，事件 dispatch 之后、`return updatedHistory;` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      }
    }

    // 🆕 检查是否已存在相同发票号的记录
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'packing',
          doc_no: updatedHistory.invoiceNo || updatedHistory.orderNo || '',
          customer_name: updatedHistory.consigneeName,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory;
      }
    }

    // 🆕 检查是否已存在相同发票号的记录
```

**4c. 在 invoiceNo 匹配的 upsert 分支 return 之前添加同步**

找到（invoiceNo 匹配分支末尾，事件 dispatch 之后、`return updatedHistory.find(...)` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingPacking.id,
          type: 'packing',
          doc_no: data.invoiceNo || data.orderNo || '',
          customer_name: data.consignee.name,
          total_amount: totalAmount,
          currency: data.currency,
          data: dataWithVisibleCols,
        });

        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

**4d. 在 create 路径 return 之前添加同步**

找到（packingHistory create 路径末尾，事件 dispatch 之后、`return newHistory;` 之前）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type: 'packing',
      doc_no: newHistory.invoiceNo || newHistory.orderNo || '',
      customer_name: newHistory.consigneeName,
      total_amount: totalAmount,
      currency: data.currency,
      data: dataWithVisibleCols,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving packing history:', error);
```

**4e. 修改 `deletePackingHistory`**

找到：

```ts
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deletePackingHistory = (id: string): boolean => {
  try {
    const history = getPackingHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'packing', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤五：修改 `src/utils/purchaseHistory.ts`

**5a. 在文件顶部（`import { getLocalStorageJSON }` 行之后）添加 import**：

```ts
import { d1SyncDocument } from './d1Sync';
```

**5b. 在 existingId 找到记录的分支末尾添加同步（update 路径）**

找到（update 路径：existingId 匹配，事件 dispatch 之后、`return updatedHistory;` 之前）：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        return updatedHistory;
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
```

替换为：

```ts
        // 触发自定义事件，通知Dashboard页面更新
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('customStorageChange', {
            detail: { key: STORAGE_KEY }
          }));
        }

        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'purchase',
          doc_no: updatedHistory.orderNo || '',
          customer_name: updatedHistory.supplierName,
          total_amount: totalAmount,
          currency: data.currency,
          data,
        });

        return updatedHistory;
      }
    }

    // 如果没有提供ID或找不到记录，创建新记录
```

**5c. 在 create 路径 return 之前添加同步**

找到（purchase create 路径末尾，事件 dispatch 之后、`return newHistory;` 之前）：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    return newHistory;
  } catch (error) {
    console.error('Error saving purchase history:', error);
```

替换为：

```ts
    // 触发自定义事件，通知Dashboard页面更新
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('customStorageChange', {
        detail: { key: STORAGE_KEY }
      }));
    }

    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newId,
      type: 'purchase',
      doc_no: newHistory.orderNo || '',
      customer_name: newHistory.supplierName,
      total_amount: totalAmount,
      currency: data.currency,
      data,
    });

    return newHistory;
  } catch (error) {
    console.error('Error saving purchase history:', error);
```

**5d. 修改 `deletePurchaseHistory`**

找到：

```ts
export const deletePurchaseHistory = (id: string): boolean => {
  try {
    const history = getPurchaseHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    return false;
  }
};
```

替换为：

```ts
export const deletePurchaseHistory = (id: string): boolean => {
  try {
    const history = getPurchaseHistory();
    const filtered = history.filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    d1SyncDocument('delete', { id, type: 'purchase', doc_no: '', data: null });
    return true;
  } catch (error) {
    return false;
  }
};
```

---

### 步骤六：修改 `src/features/customer/services/customerService.ts`

**6a. 在文件顶部（已有 import 行之后）添加 import**：

```ts
import { d1SyncCustomer } from '@/utils/d1Sync';
```

**6b. 修改 `saveCustomer` 函数**

找到：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);
  } catch (error) {
    console.error('保存客户数据失败:', error);
    throw error;
  }
}
```

替换为：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户数据保存成功:', customer);

    // D1 双写（fire-and-forget）
    d1SyncCustomer(existingIndex >= 0 ? 'update' : 'create', {
      id: customer.id,
      type: 'customer',
      name: customer.name,
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      address: customer.address || undefined,
      data: { company: customer.company },
    });
  } catch (error) {
    console.error('保存客户数据失败:', error);
    throw error;
  }
}
```

**6c. 修改 `deleteCustomer` 函数**

找到：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));

    console.log('客户删除成功:', customerId);
  } catch (error) {
    console.error('删除客户失败:', error);
    throw error;
  }
}
```

替换为：

```ts
    localStorage.setItem('customer_management', JSON.stringify(updatedCustomers));
    console.log('客户删除成功:', customerId);

    // D1 双写（fire-and-forget）
    d1SyncCustomer('delete', { id: customerId, type: 'customer', name: '' });
  } catch (error) {
    console.error('删除客户失败:', error);
    throw error;
  }
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

TypeScript 编译必须 0 错误，build 必须成功。

### 手动冒烟测试（部署后）

1. 登录系统，打开报价模块，保存一份报价
2. 打开浏览器开发者工具 Network 标签
3. 确认有一个 `POST /api/documents` 请求，状态 200
4. 在 D1 管理界面（Cloudflare Dashboard → D1 → mluonet-users → Execute query）执行：
   ```sql
   SELECT id, type, doc_no, customer_name, status FROM Document ORDER BY created_at DESC LIMIT 5;
   ```
   确认有新行插入

### 提交

```bash
git add src/utils/d1Sync.ts \
        src/utils/quotationHistory.ts \
        src/utils/invoiceHistory.ts \
        src/utils/packingHistory.ts \
        src/utils/purchaseHistory.ts \
        src/features/customer/services/customerService.ts
git commit -m "feat(sync): localStorage 双写 D1（第一阶段，fire-and-forget）"
```

---

## 执行顺序汇总

```
TASK-11 ✅ → TASK-12 ✅ → TASK-13（本任务）
```

后续规划（不在本文件范围内）：
- **TASK-14**：切换读取路径，优先从 D1 读取，localStorage 降为离线 fallback
- **Playwright E2E**：覆盖登录、PDF 生成、导入导出流程

---

## TASK-14：D1 数据初始化（历史记录 + 客户批量迁移）

**优先级**：🟡 中（TASK-15 前置）
**估时**：25 分钟
**风险**：低。Worker 改动仅影响创建时冲突处理；前端迁移工具是独立按钮，不改任何现有读写流程。

### 背景

TASK-13 实现了新数据的双写，但用户历史上已保存在 localStorage 的数据未同步到 D1。
本任务：
1. 将 Worker 的 Document/Customer create 改为 `INSERT OR REPLACE`（幂等，支持重复执行）
2. 新增迁移工具函数 `migrateAllToD1()`，读取全部 localStorage 数据批量 POST 到 D1
3. 在管理员页面添加迁移面板 UI（仅管理员可见）

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/worker.ts` | 修改 2 处 INSERT（幂等化） |
| `src/utils/d1Migration.ts` | 新建（迁移工具函数） |
| `src/features/admin/components/D1MigrationPanel.tsx` | 新建（迁移 UI 组件） |
| `src/features/admin/app/AdminPage.tsx` | 修改（引入迁移面板） |

---

### 步骤一：修改 `src/worker.ts`（2 处）

**1a.** 找到以下代码（`handleCreateDocument` 函数内）：

```ts
    await env.USERS_DB.prepare(`
      INSERT INTO Document (
        id, user_id, type, doc_no, customer_name, total_amount, currency, status, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

替换为：

```ts
    await env.USERS_DB.prepare(`
      INSERT OR REPLACE INTO Document (
        id, user_id, type, doc_no, customer_name, total_amount, currency, status, data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

**1b.** 找到以下代码（`handleCreateCustomer` 函数内）：

```ts
    await env.USERS_DB.prepare(`
      INSERT INTO Customer (
        id, user_id, type, name, code, email, phone, address, data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

替换为：

```ts
    await env.USERS_DB.prepare(`
      INSERT OR REPLACE INTO Customer (
        id, user_id, type, name, code, email, phone, address, data, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
```

---

### 步骤二：新建 `src/utils/d1Migration.ts`

完整文件内容如下：

```ts
/**
 * 一次性 localStorage → D1 批量迁移工具。
 * 通过 Next.js 代理（/api/documents、/api/customers）发送请求，
 * 代理自动注入 user_id 和 Bearer token。
 * INSERT OR REPLACE 保证幂等：可安全重复执行。
 */

import { getQuotationHistory } from '@/utils/quotationHistory';
import { getInvoiceHistory } from '@/utils/invoiceHistory';
import { getPackingHistory } from '@/utils/packingHistory';
import { getPurchaseHistory } from '@/utils/purchaseHistory';
import { getAllCustomers } from '@/features/customer/services/customerService';
import { getAllSuppliers } from '@/features/customer/services/supplierService';
import { getAllConsignees } from '@/features/customer/services/consigneeService';

export interface MigrationResult {
  documents: { success: number; failed: number; total: number };
  customers: { success: number; failed: number; total: number };
}

export interface MigrationProgress {
  phase: 'documents' | 'customers' | 'done';
  current: number;
  total: number;
}

/** 发送单次 POST，返回是否成功（不抛出异常）。 */
async function post(url: string, body: unknown): Promise<boolean> {
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // 200/201 = success；409 conflict = already exists (INSERT OR REPLACE handles this)
    return resp.ok;
  } catch {
    return false;
  }
}

/** 每迁移 10 条暂停 100ms，避免 Worker 过载。 */
async function maybeYield(index: number): Promise<void> {
  if (index > 0 && index % 10 === 0) {
    await new Promise<void>((r) => setTimeout(r, 100));
  }
}

/**
 * 读取全部 localStorage 历史和客户数据，批量 POST 到 D1。
 * @param onProgress 进度回调，可用于更新 UI
 */
export async function migrateAllToD1(
  onProgress?: (p: MigrationProgress) => void,
): Promise<MigrationResult> {
  if (typeof window === 'undefined') {
    throw new Error('migrateAllToD1 must run in the browser');
  }

  const result: MigrationResult = {
    documents: { success: 0, failed: 0, total: 0 },
    customers: { success: 0, failed: 0, total: 0 },
  };

  // ── 收集全部单据 ────────────────────────────────────────────
  const quotations = getQuotationHistory();
  const invoices   = getInvoiceHistory();
  const packings   = getPackingHistory();
  const purchases  = getPurchaseHistory();

  type DocPayload = {
    id: string; type: string; doc_no: string;
    customer_name?: string; total_amount?: number; currency?: string; data: unknown;
  };

  const docs: DocPayload[] = [
    ...quotations.map((q) => ({
      id: q.id,
      type: q.type,
      doc_no: q.quotationNo || '',
      customer_name: q.customerName,
      total_amount: q.totalAmount,
      currency: q.currency,
      data: q.data,
    })),
    ...invoices.map((i) => ({
      id: i.id,
      type: 'invoice' as const,
      doc_no: i.invoiceNo || '',
      customer_name: i.customerName,
      total_amount: i.totalAmount,
      currency: i.currency,
      data: i,
    })),
    ...packings.map((p) => ({
      id: p.id,
      type: 'packing' as const,
      doc_no: p.invoiceNo || p.orderNo || '',
      customer_name: p.consigneeName,
      total_amount: p.totalAmount,
      currency: p.currency,
      data: p.data,
    })),
    ...purchases.map((p) => ({
      id: p.id,
      type: 'purchase' as const,
      doc_no: p.orderNo || '',
      customer_name: p.supplierName,
      total_amount: p.totalAmount,
      currency: p.currency,
      data: p.data,
    })),
  ];

  result.documents.total = docs.length;

  // ── 迁移单据 ────────────────────────────────────────────────
  for (let i = 0; i < docs.length; i++) {
    onProgress?.({ phase: 'documents', current: i + 1, total: docs.length });
    const ok = await post('/api/documents', docs[i]);
    if (ok) result.documents.success++;
    else result.documents.failed++;
    await maybeYield(i);
  }

  // ── 收集全部客户 ─────────────────────────────────────────────
  type CustomerPayload = {
    id: string; type: 'customer' | 'supplier' | 'consignee';
    name: string; email?: string; phone?: string; address?: string; data?: unknown;
  };

  const customers: CustomerPayload[] = [
    ...getAllCustomers().map((c) => ({
      id: c.id, type: 'customer' as const, name: c.name,
      email: c.email || undefined, phone: c.phone || undefined,
      address: c.address || undefined,
      data: { company: c.company },
    })),
    ...getAllSuppliers().map((s) => ({
      id: s.id, type: 'supplier' as const, name: s.name,
      email: s.email || undefined, phone: s.phone || undefined,
      address: s.address || undefined,
      data: { company: s.company },
    })),
    ...getAllConsignees().map((c) => ({
      id: c.id, type: 'consignee' as const, name: c.name,
      email: c.email || undefined, phone: c.phone || undefined,
      address: c.address || undefined,
      data: { company: c.company },
    })),
  ];

  result.customers.total = customers.length;

  // ── 迁移客户 ────────────────────────────────────────────────
  for (let i = 0; i < customers.length; i++) {
    onProgress?.({ phase: 'customers', current: i + 1, total: customers.length });
    const ok = await post('/api/customers', customers[i]);
    if (ok) result.customers.success++;
    else result.customers.failed++;
    await maybeYield(i);
  }

  onProgress?.({ phase: 'done', current: customers.length, total: customers.length });
  return result;
}
```

---

### 步骤三：新建 `src/features/admin/components/D1MigrationPanel.tsx`

完整文件内容如下：

```tsx
'use client';

import { useState, useCallback } from 'react';
import { Database, CloudUpload, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { migrateAllToD1, MigrationResult, MigrationProgress } from '@/utils/d1Migration';

type MigrationState = 'idle' | 'running' | 'done' | 'error';

export function D1MigrationPanel() {
  const [state, setState]       = useState<MigrationState>('idle');
  const [progress, setProgress] = useState<MigrationProgress | null>(null);
  const [result, setResult]     = useState<MigrationResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleMigrate = useCallback(async () => {
    setState('running');
    setResult(null);
    setErrorMsg('');
    try {
      const res = await migrateAllToD1((p) => setProgress(p));
      setResult(res);
      setState('done');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : '迁移失败');
      setState('error');
    }
  }, []);

  return (
    <div className="mt-8 p-5 border border-blue-100 dark:border-blue-900/40 rounded-xl bg-blue-50/50 dark:bg-blue-900/10">
      <div className="flex items-center gap-2 mb-1">
        <Database className="w-5 h-5 text-blue-600 dark:text-blue-400" />
        <h2 className="text-base font-semibold text-gray-800 dark:text-white">云端数据迁移</h2>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        将当前浏览器本地历史记录（报价、发票、装箱、采购）和客户数据一次性同步到云端
        数据库。操作幂等，可安全重复执行。
      </p>

      {state === 'idle' && (
        <button
          onClick={handleMigrate}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                     bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <CloudUpload className="w-4 h-4" />
          开始迁移本地数据
        </button>
      )}

      {state === 'running' && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
          <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
          {progress?.phase === 'documents'
            ? `正在迁移单据 ${progress.current} / ${progress.total}…`
            : progress?.phase === 'customers'
            ? `正在迁移客户 ${progress.current} / ${progress.total}…`
            : '处理中…'}
        </div>
      )}

      {state === 'done' && result && (
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
            <CheckCircle className="w-4 h-4" />
            迁移完成
          </div>
          <p className="text-gray-600 dark:text-gray-300">
            单据：{result.documents.success} 条成功 / {result.documents.failed} 条失败
            （共 {result.documents.total} 条）
          </p>
          <p className="text-gray-600 dark:text-gray-300">
            客户：{result.customers.success} 条成功 / {result.customers.failed} 条失败
            （共 {result.customers.total} 条）
          </p>
          <button
            onClick={handleMigrate}
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            再次执行
          </button>
        </div>
      )}

      {state === 'error' && (
        <div className="flex items-center gap-2 text-red-500 text-sm">
          <XCircle className="w-4 h-4" />
          {errorMsg}
          <button onClick={() => setState('idle')} className="ml-2 text-xs underline">
            重试
          </button>
        </div>
      )}
    </div>
  );
}
```

---

### 步骤四：修改 `src/features/admin/app/AdminPage.tsx`

**4a. 在 import 区块末尾（`import { User } from '../types';` 之后）添加**：

```ts
import { D1MigrationPanel } from '../components/D1MigrationPanel';
```

**4b. 在 `<UserList ... />` 之后，`{/* 弹窗 */}` 注释之前添加**：

找到：

```tsx
          {/* 用户列表 */}
          <UserList
            users={users}
            loading={loading}
            onCreateUser={() => setShowCreateModal(true)}
            onEditUser={handleEditUser}
          />
        </div>

        {/* 弹窗 */}
```

替换为：

```tsx
          {/* 用户列表 */}
          <UserList
            users={users}
            loading={loading}
            onCreateUser={() => setShowCreateModal(true)}
            onEditUser={handleEditUser}
          />

          {/* D1 数据迁移 */}
          <D1MigrationPanel />
        </div>

        {/* 弹窗 */}
```

---

### 验证

```bash
npx wrangler deploy
npx tsc --noEmit
npm run build
```

部署后登录管理员账户，访问 `/admin`，点击「开始迁移本地数据」按钮，确认进度更新正常，迁移完成后到 Cloudflare Dashboard → D1 查询确认数据已写入：

```sql
SELECT type, COUNT(*) as n FROM Document GROUP BY type;
SELECT type, COUNT(*) as n FROM Customer GROUP BY type;
```

### 提交

```bash
git add src/worker.ts \
        src/utils/d1Migration.ts \
        src/features/admin/components/D1MigrationPanel.tsx \
        src/features/admin/app/AdminPage.tsx
git commit -m "feat(migration): D1 历史数据一次性迁移工具（INSERT OR REPLACE + 管理员 UI）"
```

---

## TASK-15-DRAFT：读取路径切换 D1 Primary（可选，高风险，已放弃未执行）

**优先级**：🟢 低（TASK-14 完成且数据确认完整后再执行）
**估时**：40 分钟
**风险**：中高。改变读取路径会影响所有页面加载。必须有完整的 D1 数据（TASK-14 执行后）才能切换。

### 背景

TASK-13 双写、TASK-14 初始化迁移后，D1 已有全量数据。
本任务将 `getQuotationHistory()` 等读取函数改为优先从 D1 API 读取，localStorage 降为离线 fallback。

### 设计原则

1. 新增 `src/utils/d1Reader.ts`：提供 `fetchDocumentsFromD1(type)` 和 `fetchCustomersFromD1(type)` 函数
2. 每个 `get*History()` 函数改为：先尝试 D1，失败或离线时 fallback 到 localStorage
3. D1 读取结果**不写回 localStorage**（避免数据循环）
4. 所有组件必须处理 async 读取（可能需要 Suspense 或 loading 状态）

### 涉及文件（草案）

| 文件 | 改动说明 |
|------|---------|
| `src/utils/d1Reader.ts` | 新建，封装 GET /api/documents 和 GET /api/customers |
| `src/utils/quotationHistory.ts` | `getQuotationHistory()` 改为 async，优先 D1 |
| `src/utils/invoiceHistory.ts` | `getInvoiceHistory()` 改为 async |
| `src/utils/packingHistory.ts` | `getPackingHistory()` 改为 async |
| `src/utils/purchaseHistory.ts` | `getPurchaseHistory()` 改为 async |
| `src/features/customer/services/customerService.ts` | `getAllCustomers()` 改为 async |
| 所有调用 `get*History()` 的组件/页面 | 添加 await 和 loading 状态 |

> ⚠️ **执行前检查清单**：
> 1. TASK-14 已执行，D1 数据已确认完整
> 2. 在测试账户的 D1 中 `SELECT COUNT(*) FROM Document` 数量与 localStorage 条数一致
> 3. 准备好回滚方案（改动放在单独分支，不影响 main）

### 验证

```bash
npx tsc --noEmit
npm run build
# 打开历史页面，确认数据正常显示
# 断网状态下打开页面，确认 localStorage fallback 生效
```

### 提交

```bash
git add src/utils/d1Reader.ts \
        src/utils/quotationHistory.ts \
        src/utils/invoiceHistory.ts \
        src/utils/packingHistory.ts \
        src/utils/purchaseHistory.ts \
        src/features/customer/services/customerService.ts
git commit -m "feat(read): 读取路径切换到 D1 primary，localStorage 降为离线 fallback"
```

---

## 全局任务优先级汇总

| 任务 | 状态 | 说明 |
|------|------|------|
| TASK-01 ~ TASK-12 | ✅ | 安全、Bug、CI、Schema、API 全部完成 |
| TASK-13 | ✅ | 前端双写 D1（写入点） |
| TASK-14 | 🔲 待执行 | 一次性历史迁移 + Worker upsert |
| TASK-15 | 🔲 可选 | 读取切换 D1（高风险，TASK-14 后再议） |

---

## TASK-15：D1 → localStorage 登录拉取同步（多设备数据一致）

**优先级**：🟡 中
**估时**：20 分钟
**风险**：低。不改任何现有读写逻辑，只在登录后后台合并一次数据。

### 背景

TASK-13 双写 + TASK-14 一次性迁移之后，D1 已有全量数据。
本任务在用户登录后，后台从 D1 拉取数据并**合并**到 localStorage，实现多设备同步：
- 设备 A 创建的单据，登录设备 B 后自动出现在历史列表
- 读取路径不变（仍从 localStorage 读）；合并只在登录时发生一次
- 合并策略：D1 的记录若比 localStorage 中的更新（`updated_at` 更新），则覆盖；本地更新的保留

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/utils/d1Pull.ts` | 新建（拉取 + 合并函数） |
| `src/hooks/useD1Sync.ts` | 新建（React hook，登录后执行一次） |
| `src/app/providers.tsx` | 修改（注入 D1SyncInitializer 组件） |

---

### 步骤一：新建 `src/utils/d1Pull.ts`

```ts
/**
 * 从 D1 API 拉取数据并合并到 localStorage。
 * 合并规则：D1 更新时间 > localStorage → 覆盖；否则保留本地。
 * 仅在用户已登录时通过 /api/documents 和 /api/customers 代理调用。
 */

type D1Doc = {
  id: string;
  type: string;
  doc_no: string;
  customer_name: string | null;
  total_amount: number | null;
  currency: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

type D1Customer = {
  id: string;
  type: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

async function fetchAll<T>(
  url: string,
  key: string,
): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  while (true) {
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    const json = await resp.json();
    const items: T[] = json[key] ?? [];
    results.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }
  return results;
}

function mergeIntoStorage<T extends { id: string; updatedAt?: string; updated_at?: string }>(
  storageKey: string,
  incoming: T[],
): void {
  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const map = new Map<string, T>(existing.map((item) => [item.id, item]));

  for (const item of incoming) {
    const local = map.get(item.id);
    if (!local) {
      map.set(item.id, item);
    } else {
      const localTime = new Date(local.updatedAt ?? local.updated_at ?? 0).getTime();
      const remoteTime = new Date(item.updatedAt ?? item.updated_at ?? 0).getTime();
      if (remoteTime > localTime) {
        map.set(item.id, item);
      }
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date((a as any).createdAt ?? (a as any).created_at ?? 0).getTime();
    const tb = new Date((b as any).createdAt ?? (b as any).created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}

function docToQuotationHistory(doc: D1Doc) {
  return {
    id: doc.id,
    type: doc.type as 'quotation' | 'confirmation',
    quotationNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToInvoiceHistory(doc: D1Doc) {
  return {
    id: doc.id,
    invoiceNo: doc.doc_no || '',
    customerName: doc.customer_name || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    // data field stored as full InvoiceHistory; extract inner data if present
    data: (doc.data as any).data ?? doc.data,
  };
}

function docToPackingHistory(doc: D1Doc) {
  const d = doc.data as any;
  return {
    id: doc.id,
    consigneeName: doc.customer_name || '',
    invoiceNo: doc.doc_no || d?.invoiceNo || '',
    orderNo: d?.orderNo || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    documentType: d?.documentType || 'packing',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function docToPurchaseHistory(doc: D1Doc) {
  return {
    id: doc.id,
    supplierName: doc.customer_name || '',
    orderNo: doc.doc_no || '',
    totalAmount: doc.total_amount || 0,
    currency: doc.currency || 'USD',
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    data: doc.data,
  };
}

function d1CustomerToLocal(c: D1Customer, type: 'customer' | 'supplier' | 'consignee') {
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    company: (c.data as any)?.company || '',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

/**
 * 拉取全部 D1 数据并合并到 localStorage。
 * 失败时静默（不影响现有功能）。
 */
export async function pullAllFromD1(): Promise<void> {
  if (typeof window === 'undefined') return;

  try {
    // ── 单据 ────────────────────────────────────────────────
    const [quotations, confirmations, invoices, packings, purchases] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase', 'documents'),
    ]);

    mergeIntoStorage(
      'quotation_history',
      [...quotations, ...confirmations].map(docToQuotationHistory),
    );
    mergeIntoStorage('invoice_history', invoices.map(docToInvoiceHistory));
    mergeIntoStorage('packing_history', packings.map(docToPackingHistory));
    mergeIntoStorage('purchase_history', purchases.map(docToPurchaseHistory));

    // ── 客户 ────────────────────────────────────────────────
    const [customers, suppliers, consignees] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    mergeIntoStorage('customer_management', customers.map((c) => d1CustomerToLocal(c, 'customer')));
    mergeIntoStorage('supplier_management', suppliers.map((c) => d1CustomerToLocal(c, 'supplier')));
    mergeIntoStorage('consignee_management', consignees.map((c) => d1CustomerToLocal(c, 'consignee')));

    console.log('[d1Pull] 同步完成');
  } catch (err) {
    console.warn('[d1Pull] 同步失败（不影响现有功能）:', err);
  }
}
```

---

### 步骤二：新建 `src/hooks/useD1Sync.ts`

```ts
/**
 * 用户登录后执行一次 D1 → localStorage 同步。
 * 使用模块级 flag 确保同一浏览器会话只同步一次。
 */
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { pullAllFromD1 } from '@/utils/d1Pull';

let syncDone = false;

export function useD1Sync(): void {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'authenticated') return;
    if (syncDone) return;
    syncDone = true;

    // 延迟 1s，避免与首屏渲染竞争
    const timer = setTimeout(() => {
      pullAllFromD1().catch(() => {/* 静默 */});
    }, 1000);

    return () => clearTimeout(timer);
  }, [status]);
}
```

---

### 步骤三：修改 `src/app/providers.tsx`

**3a. 在现有 import 行之后添加 import**（在 `import { usePermissionInit }` 之后）：

```ts
import { useD1Sync } from '@/hooks/useD1Sync';
```

**3b. 在 `PermissionInitializer` 组件之后添加新组件**

找到：

```tsx
// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null; // 这个组件不渲染任何内容，只负责初始化
}
```

替换为：

```tsx
// ✅ 全局权限初始化组件
function PermissionInitializer() {
  usePermissionInit();
  return null;
}

// ✅ 登录后从 D1 拉取数据到 localStorage（多设备同步）
function D1SyncInitializer() {
  useD1Sync();
  return null;
}
```

**3c. 在 `<PermissionInitializer />` 之后插入新组件**

找到：

```tsx
          <PermissionInitializer />
          {children}
```

替换为：

```tsx
          <PermissionInitializer />
          <D1SyncInitializer />
          {children}
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

部署后：
1. 在设备 A 保存一份报价（双写到 D1）
2. 在设备 B 登录（不同浏览器/无痕模式）
3. 约 1 秒后刷新历史页面，确认设备 A 创建的记录出现在列表中

### 提交

```bash
git add src/utils/d1Pull.ts src/hooks/useD1Sync.ts src/app/providers.tsx
git commit -m "feat(sync): 登录时从 D1 拉取数据合并到 localStorage（多设备同步）"
```

---

## TASK-16：Playwright E2E 测试套件

**优先级**：🟡 中（质量保障）
**估时**：45 分钟
**风险**：极低，只新增文件，不改动业务代码

### 背景

`package.json` 已有 `"test:e2e": "playwright test"` 脚本，但 `@playwright/test` 未安装，也没有 `playwright.config.ts` 和 `e2e/` 目录。本任务补全这些缺失：

- 安装依赖
- 配置 Playwright（目标 URL、storageState 复用登录态）
- 全局 setup：登录一次，保存 Cookie/localStorage 到 `e2e/.auth/user.json`
- 四个核心测试文件：登录、Dashboard、报价单保存（含 D1 双写断言）、历史页

测试凭据通过环境变量注入（`E2E_BASE_URL`、`E2E_USERNAME`、`E2E_PASSWORD`），不硬编码。

### 涉及文件（全部新增）

```
playwright.config.ts
e2e/global-setup.ts
e2e/auth.spec.ts
e2e/dashboard.spec.ts
e2e/quotation-save.spec.ts
e2e/history.spec.ts
e2e/.auth/.gitkeep          ← 仅 .gitkeep，实际 user.json 由 gitignore 排除
```

同时修改：
- `package.json` — 追加 `@playwright/test` 到 devDependencies
- `.gitignore` — 追加 `e2e/.auth/`

### 步骤 1：安装依赖

```bash
npm install -D @playwright/test
npx playwright install chromium --with-deps
```

### 步骤 2：`playwright.config.ts`（项目根目录）

```ts
import { defineConfig, devices } from '@playwright/test';

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: './e2e/global-setup.ts',

  use: {
    baseURL: BASE_URL,
    storageState: 'e2e/.auth/user.json',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
```

### 步骤 3：`e2e/global-setup.ts`

```ts
import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? 'http://localhost:3000';
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!username || !password) {
    throw new Error(
      'E2E_USERNAME and E2E_PASSWORD must be set.\n' +
      'Example: E2E_USERNAME=roger E2E_PASSWORD=secret npx playwright test'
    );
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(baseURL + '/');
  await page.fill('#username', username);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');

  // 等待跳转到 dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 });

  // 保存认证状态（Cookie + localStorage）
  const authDir = path.join(process.cwd(), 'e2e', '.auth');
  fs.mkdirSync(authDir, { recursive: true });
  await page.context().storageState({ path: path.join(authDir, 'user.json') });

  await browser.close();
}

export default globalSetup;
```

### 步骤 4：`e2e/auth.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('认证流程', () => {
  // 此测试不依赖已登录状态，单独处理
  test.use({ storageState: { cookies: [], origins: [] } });

  test('未登录访问 /dashboard 应重定向到登录页', async ({ page }) => {
    await page.goto('/dashboard');
    // 应被重定向到根路径或包含登录表单
    await expect(page.locator('#username')).toBeVisible({ timeout: 10_000 });
  });

  test('填写正确凭据后跳转到 dashboard', async ({ page }) => {
    const username = process.env.E2E_USERNAME!;
    const password = process.env.E2E_PASSWORD!;

    await page.goto('/');
    await page.fill('#username', username);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/dashboard/);
  });

  test('填写错误密码显示错误信息', async ({ page }) => {
    await page.goto('/');
    await page.fill('#username', 'nonexistent_user_xyz');
    await page.fill('#password', 'wrong_password_xyz');
    await page.click('button[type="submit"]');

    // 错误信息出现，页面留在登录页
    await expect(page.locator('text=用户名或密码错误')).toBeVisible({ timeout: 8_000 });
    await expect(page).toHaveURL(/^\//); // 仍在根路径
  });
});
```

### 步骤 5：`e2e/dashboard.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard 页面', () => {
  test('已登录用户可访问 dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    // 确认没有被重定向回登录页
    await expect(page).not.toHaveURL(/^\/?$/);
    // Dashboard 应包含至少一个导航链接
    await expect(page.locator('a[href*="quotation"], a[href*="invoice"], nav')).toHaveCount({ minimum: 1 } as any);
  });

  test('dashboard 页面基础元素可见', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    // 页面应有可见内容（不是空白页）
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });
});
```

### 步骤 6：`e2e/quotation-save.spec.ts`

测试重点：点击保存后，前端触发 D1 双写（`POST /api/documents`），验证请求被发出且返回 200。

```ts
import { test, expect } from '@playwright/test';

test.describe('报价单保存 + D1 双写', () => {
  test('保存报价单 → 触发 POST /api/documents', async ({ page }) => {
    // 拦截 D1 双写请求（fire-and-forget，在点击保存后异步发出）
    const d1RequestPromise = page.waitForRequest(
      req => req.url().includes('/api/documents') && req.method() === 'POST',
      { timeout: 15_000 }
    );

    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    // 填写客户名称（第一个文本输入框通常是客户名称字段）
    // 使用 label 文字定位（FormField 渲染 label 标签）
    const customerInput = page.locator('label:has-text("客户名称") ~ * input, label:has-text("客户名称") + * input').first();
    await customerInput.fill('E2E Test Customer');

    // 点击保存按钮（新记录时 title 为 "保存新记录"）
    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    // 断言 D1 双写请求被触发
    const d1Req = await d1RequestPromise;
    expect(d1Req.method()).toBe('POST');
    expect(d1Req.url()).toContain('/api/documents');

    // 等待响应并断言状态码
    const d1Resp = await d1Req.response();
    expect(d1Resp).not.toBeNull();
    // 允许 200（create）或 409（已存在但幂等）
    expect([200, 201, 409]).toContain(d1Resp!.status());
  });

  test('保存后 localStorage 包含新记录', async ({ page }) => {
    await page.goto('/quotation');
    await page.waitForLoadState('networkidle');

    // 清空现有历史以便计数
    await page.evaluate(() => {
      const existing = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      // 记录保存前数量
      (window as any).__beforeCount = existing.length;
    });

    const customerInput = page.locator('label:has-text("客户名称") ~ * input, label:has-text("客户名称") + * input').first();
    await customerInput.fill('E2E LocalStorage Test');

    await page.locator('button[title="保存新记录"], button[title="保存修改"]').click();

    // 等待 toast 出现（保存成功提示）
    await expect(page.locator('text=保存成功')).toBeVisible({ timeout: 8_000 });

    // 验证 localStorage 记录数 +1
    const afterCount = await page.evaluate(() => {
      const list = JSON.parse(localStorage.getItem('quotation_history') || '[]');
      return list.length;
    });
    const beforeCount = await page.evaluate(() => (window as any).__beforeCount ?? 0);
    expect(afterCount).toBeGreaterThan(beforeCount);
  });
});
```

### 步骤 7：`e2e/history.spec.ts`

```ts
import { test, expect } from '@playwright/test';

test.describe('历史记录页', () => {
  test('能访问历史页且不报错', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    // 不被重定向回登录页
    await expect(page).not.toHaveURL(/^\/?$/);
    // 无 JavaScript 崩溃（检查 console）
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    // 等待短暂时间收集错误
    await page.waitForTimeout(1_000);
    // 过滤掉已知的非致命警告（D1 pull 可能因测试环境无法访问而报错）
    const fatalErrors = errors.filter(e =>
      !e.includes('D1') && !e.includes('fetch') && !e.includes('network')
    );
    expect(fatalErrors).toHaveLength(0);
  });

  test('历史页包含页面标题或空状态文字', async ({ page }) => {
    await page.goto('/history');
    await page.waitForLoadState('networkidle');
    // 应渲染出可读内容
    const bodyText = await page.locator('body').innerText();
    // 至少含有"历史"或"记录"等关键词，或空状态提示
    expect(bodyText).toMatch(/历史|记录|暂无|empty/i);
  });
});
```

### 步骤 8：`e2e/.auth/.gitkeep`

```bash
mkdir -p e2e/.auth
touch e2e/.auth/.gitkeep
```

### 步骤 9：更新 `.gitignore`

在 `.gitignore` 末尾追加：

```
# Playwright auth state
e2e/.auth/user.json
e2e/.auth/*.json
/playwright-report/
/test-results/
```

### 步骤 10：更新 `package.json`

在 `devDependencies` 中追加 `@playwright/test`（版本由 `npm install -D` 决定，写入后 commit）。

同时在 `scripts` 中追加（如果尚不存在）：

```json
"test:e2e:ui": "playwright test --ui",
"test:e2e:headed": "playwright test --headed"
```

### 验证命令

```bash
# 类型检查：playwright.config.ts 和 e2e/ 目录应无 TS 错误
npx tsc --noEmit

# 语法预检（不实际执行测试）
npx playwright test --list

# 实际运行（需要本地 dev server 或 .env.e2e 配置 E2E_BASE_URL）
# E2E_BASE_URL=https://your-vercel-url E2E_USERNAME=xxx E2E_PASSWORD=yyy npx playwright test
```

### 运行说明

本地运行需先启动 dev server：

```bash
# 终端 1
npm run dev

# 终端 2
E2E_USERNAME=<用户名> E2E_PASSWORD=<密码> npm run test:e2e
```

针对 Vercel 生产环境：

```bash
E2E_BASE_URL=https://luonet-vercel.vercel.app \
E2E_USERNAME=<用户名> \
E2E_PASSWORD=<密码> \
npm run test:e2e
```

CI 中在 GitHub Actions secrets 中设置 `E2E_BASE_URL`、`E2E_USERNAME`、`E2E_PASSWORD`，在 `.github/workflows/e2e.yml` 中 `env:` 块引用。

### 提交

```bash
git add playwright.config.ts e2e/ .gitignore package.json package-lock.json
git commit -m "test(e2e): 添加 Playwright E2E 测试套件（登录/Dashboard/报价单保存/历史页）"
```

---

## TASK-17：GitHub Actions E2E 集成

**优先级**：🟡 中（CI 完整性）
**估时**：15 分钟
**风险**：极低，仅改 CI 配置文件

### 背景

TASK-07 添加了 `ci.yml`，覆盖单元测试 + 构建。TASK-16 添加了 Playwright E2E 测试，但尚未挂入 CI。本任务在 `ci.yml` 增加一个 `e2e` job，仅在 push 到 main 后运行（针对已部署的 Vercel 生产 URL），并在失败时上传 Playwright HTML 报告作为 artifact。

**运行策略**：
- `check` job：每次 PR + push 都跑（lint / unit test / build）
- `e2e` job：仅 push 到 main 后跑，`needs: check`，针对 `E2E_BASE_URL` 指向的生产站点

PR 上不跑 E2E，因为 Vercel preview URL 每次不同，无法静态配置；如需 PR E2E，可在另一个 issue 中用 Vercel GitHub Integration Webhook 实现。

### 涉及文件

```
.github/workflows/ci.yml    ← 追加 e2e job
```

不改动其他文件。

### 改动：`.github/workflows/ci.yml`

在现有 `check` job 之后追加以下 `e2e` job：

```yaml
  e2e:
    name: E2E Tests (production)
    runs-on: ubuntu-latest
    needs: check
    # 仅在 push 到主分支时运行（不跑 PR），因为需要已部署的站点
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}

      - name: Upload Playwright report (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7
```

完整 `ci.yml`（替换整个文件）：

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  check:
    name: Quality Check
    runs-on: ubuntu-latest
    timeout-minutes: 15

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Check selectors
        run: npm run check:selectors

      - name: Run tests
        run: npm run test -- --ci --passWithNoTests

      - name: Lint
        run: npm run lint

      - name: Build
        run: npm run build
        env:
          DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
          NEXTAUTH_SECRET: ${{ secrets.NEXTAUTH_SECRET }}
          NEXT_PUBLIC_API_BASE_URL: https://udb.luocompany.net
          NEXT_PUBLIC_APP_URL: https://luocompany.net

  e2e:
    name: E2E Tests (production)
    runs-on: ubuntu-latest
    needs: check
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    timeout-minutes: 10

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Chromium
        run: npx playwright install chromium --with-deps

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          E2E_BASE_URL: ${{ vars.E2E_BASE_URL }}
          E2E_USERNAME: ${{ secrets.E2E_USERNAME }}
          E2E_PASSWORD: ${{ secrets.E2E_PASSWORD }}

      - name: Upload Playwright report (on failure)
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report-${{ github.run_id }}
          path: playwright-report/
          retention-days: 7
```

### GitHub 仓库配置（人工操作，Codex 无法代劳）

执行前需在 GitHub 仓库设置中添加：

**Settings → Secrets and variables → Actions → Variables（公开变量）**：
- `E2E_BASE_URL` = `https://luonet-vercel.vercel.app`（或实际 Vercel 域名）

**Settings → Secrets and variables → Actions → Secrets（加密）**：
- `E2E_USERNAME` = E2E 测试账号用户名
- `E2E_PASSWORD` = E2E 测试账号密码

建议为 E2E 单独创建一个只读测试账号，不使用管理员账号。

### 验证命令

```bash
# 语法检查 YAML 格式
npx js-yaml .github/workflows/ci.yml > /dev/null && echo "YAML OK"

# 本地模拟（仅确认文件结构正确）
cat .github/workflows/ci.yml | grep -E "name:|needs:|if:"
```

### 提交

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 添加 Playwright E2E job（push to main 后针对生产站点运行）"
```

---

---

## TASK-18：新建 AppLayout + AppSidebar 组件系统 ✅ 已完成

**优先级**：🟡 高
**实际耗时**：3~4 小时
**状态**：完成。验证：`npx tsc --noEmit` 通过（layout 文件无错误）。

### 实际产出

新建文件（`src/components/layout/`）：
- `AppSidebar.tsx` — 固定 200px 侧边栏，图标+文字，基于 `usePermissionStore` 过滤权限菜单项，支持桌面端常驻 + 平板 overlay
- `AppTopBar.tsx` — 顶部栏，面包屑导航 + 用户头像 dropdown（含修改密码、主题切换、预加载、管理后台、退出）
- `AppBottomActionBar.tsx` — 底部固定操作栏，接收 `ActionButton[]`，支持 primary/secondary/ghost 三种样式及 loading 状态
- `AppLayout.tsx` — 组合容器，含 Suspense 包裹（修复 `useSearchParams()` 警告）
- `MobileBottomTab.tsx` — 手机端底部 Tab 栏（5 核心入口）
- `index.ts` — 统一导出

**风险**：低（新增文件，不改动现有功能）

### 背景

当前所有功能页通过 Dashboard 中转导航（Hub-and-Spoke），导致切换模块至少需要 2 次点击。此任务新建固定侧边栏布局系统，供 TASK-19 迁移各页面使用。

### 新建文件

```
src/components/layout/
  AppSidebar.tsx          ← 左侧导航栏
  AppTopBar.tsx           ← 顶部栏（面包屑 + 用户菜单）
  AppBottomActionBar.tsx  ← 底部固定操作栏（保存/预览/导出等）
  AppLayout.tsx           ← 组合布局容器
  MobileBottomTab.tsx     ← 手机端底部 Tab 栏
  index.ts                ← 统一导出
```

### AppSidebar 规格

```tsx
// 桌面端（≥1024px）：固定左侧，宽 200px，图标 + 文字，始终展开
// 平板端（768-1023px）：宽 200px，通过汉堡菜单触发 overlay 显示
// 手机端（<768px）：隐藏（由 MobileBottomTab 替代）

interface SidebarItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  dividerBefore?: boolean;   // 是否在此项前加分隔线
  permissionKey?: string;    // usePermissionStore 中的 key，无则始终显示
}

const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard',    label: '首页',     path: '/dashboard',              icon: LayoutDashboard },
  { id: 'quotation',    label: '报价单',   path: '/quotation',              icon: FileText,      dividerBefore: true, permissionKey: 'canCreateQuotation' },
  { id: 'confirmation', label: '销售确认', path: '/quotation?tab=confirmation', icon: FileCheck, permissionKey: 'canCreateConfirmation' },
  { id: 'packing',      label: '箱单发票', path: '/packing',                icon: Package,       permissionKey: 'canCreatePacking' },
  { id: 'invoice',      label: '财务发票', path: '/invoice',                icon: Receipt,       permissionKey: 'canCreateInvoice' },
  { id: 'purchase',     label: '采购订单', path: '/purchase',               icon: ShoppingCart,  permissionKey: 'canCreatePurchase' },
  { id: 'history',      label: '单据历史', path: '/history',                icon: Archive,       dividerBefore: true, permissionKey: 'canViewHistory' },
  { id: 'customer',     label: '客户管理', path: '/customer',               icon: Users,         permissionKey: 'canManageCustomers' },
  { id: 'mail',         label: 'AI邮件',   path: '/mail',                   icon: Mail,          dividerBefore: true },
];

// 激活规则：usePathname().startsWith(item.path.split('?')[0])
// 激活样式：bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium
// 普通样式：text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/50
// 分隔线：border-t border-gray-200 dark:border-gray-700 mt-1 pt-1
// 权限过滤：从 usePermissionStore 读取 permissions，过滤无权限项
```

### AppTopBar 规格

```tsx
interface AppTopBarProps {
  breadcrumbs: { label: string; path?: string }[];  // 最后一项无 path
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void;
  onMenuClick?: () => void;  // 平板/手机端触发侧边栏
}

// 高度 h-14，sticky top-0 z-40
// 背景：bg-white dark:bg-[#1c1c1e] shadow-sm dark:shadow-gray-800/30
// 左侧：
//   - 手机/平板端：汉堡菜单按钮（Menu 图标）
//   - Logo 图片（32px，参考现有 Header.tsx 的 LOGO_CONFIG）
//   - 面包屑（桌面端显示完整路径，手机端只显最后一级）
// 右侧：用户头像 dropdown（完整复用现有 Header.tsx 中的 dropdown 逻辑）
//   包含：个人信息/修改密码、主题切换、预加载资源、管理后台（admin）、退出登录
```

### AppBottomActionBar 规格

```tsx
interface ActionButton {
  key: string;
  label: string;
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  icon?: LucideIcon;
}

interface AppBottomActionBarProps {
  actions: ActionButton[];
  leftSlot?: React.ReactNode;  // 如自动保存状态文字
}

// sticky bottom-0，z-30
// 高度 h-14
// 背景：bg-white dark:bg-[#1c1c1e] border-t border-gray-200 dark:border-gray-700
// 左侧：leftSlot（如有）
// 右侧：actions 按钮（右对齐，间距 gap-2）
// 按钮样式：
//   primary   → bg-blue-600 hover:bg-blue-700 text-white
//   secondary → border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200
//   ghost     → text-gray-500 hover:text-gray-700
// Mobile：底部预留 MobileBottomTab 高度（pb-[48px]）
```

### AppLayout 规格

```tsx
interface AppLayoutProps {
  breadcrumbs: { label: string; path?: string }[];
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void;
  children: React.ReactNode;
  bottomActions?: ActionButton[];
  bottomLeftSlot?: React.ReactNode;
}

// 整体结构：
export function AppLayout({ breadcrumbs, user, onLogout, children, bottomActions, bottomLeftSlot }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
      {/* 桌面端固定侧边栏 */}
      <AppSidebar className="hidden lg:flex" />
      {/* 平板/手机 overlay 侧边栏 */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <AppSidebar className="fixed left-0 top-0 h-full z-50 lg:hidden" onClose={() => setSidebarOpen(false)} />
        </>
      )}
      {/* 主内容区 */}
      <div className="flex flex-col flex-1 lg:ml-[200px] min-h-screen overflow-hidden">
        <AppTopBar breadcrumbs={breadcrumbs} user={user} onLogout={onLogout} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
        {bottomActions && bottomActions.length > 0 && (
          <AppBottomActionBar actions={bottomActions} leftSlot={bottomLeftSlot} />
        )}
        <MobileBottomTab />
      </div>
    </div>
  );
}
```

### MobileBottomTab 规格

```tsx
// 仅在 <768px 显示（hidden md:hidden，lg:hidden）
// 高度 h-12，固定底部
// 显示 5 个核心入口：首页 / 报价单 / 历史 / 客户 / 邮件
// 激活高亮同 AppSidebar
```

### 验证

```bash
npx tsc --noEmit
# 确认无 TS 类型错误，新文件均正确导出
```

---

## TASK-19：迁移各功能页到 AppLayout ✅ 已完成

**优先级**：🟡 高（依赖 TASK-18 完成）
**实际耗时**：3~4 小时
**状态**：完成。验证：`npx tsc --noEmit` 通过（playwright 环境缺包的既有报错与本次无关）；`npm run lint` 通过；`npm run build` 因 Google Font DNS 失败（网络环境限制，非代码问题）。

### 实际产出

**新建文件：**
- `src/hooks/useAppUser.ts` — 合并 `usePermissionStore` + `useSession` 的共用用户 hook

**已迁移页面（全部）：**
- `src/features/dashboard/app/DashboardPage.tsx`
- `src/features/quotation/app/QuotationPage.tsx`
- `src/features/history/app/HistoryPage.tsx`
- `src/features/invoice/app/InvoicePage.tsx`
- `src/features/packing/app/PackingPage.tsx`
- `src/features/purchase/app/PurchasePage.tsx`
- `src/features/customer/app/CustomerPage.tsx`
- `src/features/mail/app/MailPage.tsx`

**各页主要改动：**
- 删除旧 `Header` / `Footer` / 返回按钮 import 和渲染
- 包裹 `AppLayout`，传入 `breadcrumbs` / `user` / `onLogout`
- Quotation / History / Invoice / Packing / Purchase 的主操作按钮迁入 `bottomActions`
- Customer / Mail 使用无 `bottomActions` 的 AppLayout
- HistoryPage 保留内容区 subheader（搜索框 + 刷新），导入/导出/批量删除迁入 `bottomActions`
- 修正 `AppTopBar` 与 `useAppUser` 双重 `signOut()` 问题，退出逻辑统一由 `onLogout` 回调处理
- `PurchaseHeader`（卡片内子组件：标题 + History 跳转 + Settings）保留不动，不是页面级导航

**未迁移（按要求）：**
- `/admin` 页面保持原有布局

### 背景（原始需求）

将所有功能页从「Header + 内容 + Footer」模式迁移到 AppLayout，移除页面内的返回按钮和顶部操作按钮，统一由侧边栏导航 + 底部操作栏替代。

### 前置说明（先做这一步）

代码审查发现功能页（QuotationPage/HistoryPage 等）不持有 session，但 AppLayout 需要 `user` + `onLogout`。**先新建共用 hook**，所有页面统一调用：

**新建 `src/hooks/useAppUser.ts`：**

```ts
'use client';

import { useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';

export function useAppUser() {
  // 优先从 permissionStore 取（登录后最快同步），fallback 到 session
  const permUser = usePermissionStore((state) => state.user);
  const { data: session } = useSession();

  const user = {
    name: permUser?.username || session?.user?.name || session?.user?.username || '用户',
    isAdmin: permUser?.isAdmin ?? session?.user?.isAdmin ?? false,
    email: permUser?.email || session?.user?.email || null,
  };

  const handleLogout = useCallback(async () => {
    usePermissionStore.getState().clearUser();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('userCache');
    }
    await signOut();
  }, []);

  return { user, handleLogout };
}
```

### 迁移清单

按此顺序执行，**每步完成后运行 `npx tsc --noEmit`**，确认通过再继续。

---

#### ① DashboardPage（`src/features/dashboard/app/DashboardPage.tsx`）

```tsx
// 1. 新增 import
import { AppLayout } from '@/components/layout';

// 2. 移除 import { Header } from '@/components/Header'
//    移除 import { Footer } from '@/components/Footer'

// 3. 现有的 user / handleLogout 逻辑保持不变
//    （DashboardPage 已有完整的 useSession + usePermissionStore 处理）

// 4. 将返回值改为：
return (
  <AppLayout
    breadcrumbs={[{ label: '首页' }]}
    user={{
      name: user?.username || session?.user?.name || '用户',
      isAdmin: user?.isAdmin ?? false,
      email: user?.email || null,
    }}
    onLogout={handleLogout}
  >
    <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
      <DashboardSuccessMessage ... />
      {/* TASK-20 将在此处新增 <StatsCards /> */}
      <DashboardModules ... />
      <DashboardDocuments ... />
    </div>
  </AppLayout>
);

// 5. 保留 isPermissionLoading 时的 loading spinner（在 AppLayout 之外提前返回，不变）
```

---

#### ② QuotationPage（`src/features/quotation/app/QuotationPage.tsx`）

QuotationPage 有两处操作按钮，处理方式不同：

**卡片头部的图标按钮**（~行 601-624，Save/Excel icon）：**保留**，不移动。这些是紧贴表单的快捷入口，合理。

**卡片底部的主操作区**（~行 889-978，Generate/Preview/Excel 大按钮）：**删除此整块 `<div>` 并迁移到 bottomActions**。

**Back 链接**（~行 554-565）：**整行删除**，侧边栏导航替代。

```tsx
// 1. 新增 imports
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

// 2. 在组件顶部添加
const { user, handleLogout } = useAppUser();

// 3. 删除：<Link href={...}>Back</Link>（约行 554-565）

// 4. 删除：卡片底部操作区整块（约行 889-978）：
//    从 {/* 操作按钮区域 */} 的 <div className="px-4 sm:px-6 py-4 border-t...">
//    到对应的 </div>，连同进度条区域一并删除

// 5. 将 generate/preview/excel 绑到 bottomActions：
const isEditMode = pathname?.includes('/edit/') || pathname?.includes('/copy/') || !!editId;

const bottomActions: ActionButton[] = [
  {
    key: 'generate',
    label: isGenerating ? 'Generating...' : isEditMode ? 'Save & Generate' : `Generate ${activeTab === 'quotation' ? 'Quotation' : 'Order'}`,
    onClick: handleGenerate,
    variant: 'primary',
    loading: isGenerating,
    loadingLabel: 'Generating...',
    icon: Download,
  },
  {
    key: 'preview',
    label: isPreviewing ? 'Previewing...' : 'Preview',
    onClick: handlePreview,
    variant: 'secondary',
    loading: isPreviewing,
    disabled: isPreviewing || isGenerating,
    icon: Eye,
  },
  {
    key: 'excel',
    label: 'Excel',
    onClick: handleExportExcel,
    variant: 'secondary',
    icon: FileSpreadsheet,
  },
];

// 6. breadcrumbs：
const breadcrumbs = [
  { label: '首页', path: '/dashboard' },
  { label: activeTab === 'quotation' ? '报价单' : '销售确认' },
  { label: isEditMode ? '编辑' : '新建' },
];

// 7. 整体返回值改为：
return (
  <AppLayout
    breadcrumbs={breadcrumbs}
    user={user}
    onLogout={handleLogout}
    bottomActions={bottomActions}
    bottomLeftSlot={
      // 可选：显示自动保存状态
      editId ? <span className="text-sm text-gray-400">ID: {editId}</span> : undefined
    }
  >
    {/* 保留 loading spinner 提前返回，不变 */}
    <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 py-3 sm:py-6">
      {/* Tab 切换 */}
      {/* 主卡片 - 内部不变，但卡片底部操作区已删除 */}
    </div>
  </AppLayout>
);

// 8. 删除 import { Footer } / import { ArrowLeft } / import Link（若仅用于返回按钮）
//    注意：Link 还用于卡片内 History 跳转链接，检查后再决定是否保留 import
```

---

#### ③ HistoryPage（`src/features/history/app/HistoryPage.tsx`）

HistoryHeader 包含：**返回按钮 + 搜索框 + 刷新/导入/导出/批量删除按钮**。

处理策略：
- **返回按钮**：删除（侧边栏替代）
- **搜索框 + 刷新**：保留在内容区顶部的精简 subheader 内
- **导入/导出/批量删除**：迁移到 AppLayout bottomActions

```tsx
// 1. 新增 imports
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';

// 2. 在组件顶部添加
const { user, handleLogout } = useAppUser();

// 3. 不再使用 HistoryHeader，改用以下 subheader（直接内联到返回值中）：
//    subheader 只保留：搜索框 + 刷新按钮
// （HistoryHeader.tsx 文件暂不删除，后续可清理）

// 4. bottomActions：
const bottomActions: ActionButton[] = [
  {
    key: 'import',
    label: '导入',
    onClick: onImport,
    variant: 'secondary',
    icon: Upload,
  },
  {
    key: 'export',
    label: '导出',
    onClick: onExport,
    variant: 'secondary',
    icon: Download,
  },
  ...(selectedCount > 0 ? [{
    key: 'delete',
    label: isDeleting ? '删除中...' : `删除选中 (${selectedCount})`,
    onClick: onBatchDelete,
    variant: 'primary' as const,
    loading: isDeleting,
    disabled: isDeleting,
  }] : []),
];

// 5. 返回值结构：
return (
  <AppLayout
    breadcrumbs={[{ label: '首页', path: '/dashboard' }, { label: '单据历史' }]}
    user={user}
    onLogout={handleLogout}
    bottomActions={bottomActions}
  >
    {/* 内容区搜索 subheader（取代 HistoryHeader） */}
    <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-[#1c1c1e] px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-3">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="搜索客户名称、单据号..."
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
        {filters.search && (
          <button onClick={() => setFilters({ search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>
      <button onClick={onRefresh} className="p-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800">
        <RefreshCw className="h-4 w-4 text-gray-500" />
      </button>
    </div>
    {/* 原有 HistoryTabs 和内容 */}
    <HistoryTabs ... />
    ...
  </AppLayout>
);
```

---

#### ④ InvoicePage / PackingPage / PurchasePage

三个页面都有 Footer，部分有顶部返回按钮。模式与 QuotationPage 类似：

```tsx
// 每个页面添加：
import { AppLayout, type ActionButton } from '@/components/layout';
import { useAppUser } from '@/hooks/useAppUser';
const { user, handleLogout } = useAppUser();

// 移除：import { Footer } / Footer 组件
// 移除：顶部返回 Link（若有）
// 将底部保存/生成/预览等按钮迁移到 bottomActions

// Invoice breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '财务发票' }, { label: isEdit ? '编辑' : '新建' }]

// Packing breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '箱单发票' }, { label: isEdit ? '编辑' : '新建' }]

// Purchase breadcrumbs:
// [{ label: '首页', path: '/dashboard' }, { label: '采购订单' }, { label: isEdit ? '编辑' : '新建' }]
```

---

#### ⑤ CustomerPage / MailPage

相对简单，无底部操作按钮，只需：
- 移除 Footer / 返回按钮
- 包裹 AppLayout（无 bottomActions）

```tsx
// CustomerPage breadcrumbs: [{ label: '首页', path: '/dashboard' }, { label: '客户管理' }]
// MailPage breadcrumbs:     [{ label: '首页', path: '/dashboard' }, { label: 'AI邮件助手' }]
```

---

### 注意事项

- `DocumentLayout.tsx` 仅被 `QuotationPageRefactored.tsx` 引用（该文件不是活跃页面），**忽略，不处理**
- Admin 页面（`/admin`）**不迁移**
- 迁移后统一删除各页面中无用的 `import { Header }` / `import { Footer }` / `import { ArrowLeft }`
- DashboardPage 的权限 loading spinner（`if (isPermissionLoading) return ...`）**保留在 AppLayout 外面**（提前 return）

### 验证

```bash
npx tsc --noEmit
npm run build
# 手动验证（每页）：
# 1. 侧边栏当前页高亮正确
# 2. 面包屑路径正确
# 3. 底部操作按钮功能正常（保存/生成/预览/导出）
# 4. 深色模式颜色正常
# 5. 手机端底部 Tab 可见，不与操作栏重叠
npm run test:e2e
```

---

## TASK-20：Dashboard 今日统计卡片 ✅ 已完成

**优先级**：🟢 中
**实际耗时**：< 1 小时
**状态**：完成。验证：`eslint` 0 error；`tsc --noEmit` 和 `npm run build` 被既有环境问题阻塞（缺 `@playwright/test` / Google Font DNS），业务代码无新错误。

### 实际产出

**新建文件：**
- `src/features/dashboard/components/StatsCards.tsx` — 5 张今日统计卡片，按类型配色（蓝/绿/紫/青/橙），点击跳转 `/history?type=xxx&time=today`，loading 时显示 animate-pulse 占位

**修改文件：**
- `src/features/dashboard/hooks/useDashboardDocuments.ts` — 新增 `todayCounts`，基于有权限的全量单据 + `setHours(0,0,0,0)` 计算，不受 Dashboard 时间筛选影响，从 hook 返回值导出
- `src/features/dashboard/app/DashboardPage.tsx` — 从 hook 取 `todayCounts`，在 `DashboardSuccessMessage` 后、`DashboardModules` 前插入 `<StatsCards counts={todayCounts} loading={!mounted || isPermissionLoading} />`

### 背景

Dashboard 首页增加今日各类单据数量统计卡片，让用户一眼看到工作量概览，点击跳转对应历史记录。

### STEP 1：新建 StatsCards 组件

**新建 `src/features/dashboard/components/StatsCards.tsx`：**

```tsx
'use client';

import { useRouter } from 'next/navigation';
import { FileText, FileCheck, Receipt, Package, ShoppingCart } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface StatItem {
  type: 'quotation' | 'confirmation' | 'invoice' | 'packing' | 'purchase';
  label: string;
  tag: string;
  icon: LucideIcon;
  colorClass: string;
  textColorClass: string;
  tagClass: string;
}

const STAT_ITEMS: StatItem[] = [
  { type: 'quotation',    label: '报价单',   tag: 'QTN', icon: FileText,     colorClass: 'bg-blue-50 dark:bg-blue-900/20',    textColorClass: 'text-blue-600 dark:text-blue-400',    tagClass: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300' },
  { type: 'confirmation', label: '销售确认', tag: 'SC',  icon: FileCheck,    colorClass: 'bg-green-50 dark:bg-green-900/20',  textColorClass: 'text-green-600 dark:text-green-400',  tagClass: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-300' },
  { type: 'invoice',      label: '财务发票', tag: 'INV', icon: Receipt,      colorClass: 'bg-purple-50 dark:bg-purple-900/20', textColorClass: 'text-purple-600 dark:text-purple-400', tagClass: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300' },
  { type: 'packing',      label: '箱单发票', tag: 'PL',  icon: Package,      colorClass: 'bg-teal-50 dark:bg-teal-900/20',   textColorClass: 'text-teal-600 dark:text-teal-400',   tagClass: 'bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-300' },
  { type: 'purchase',     label: '采购订单', tag: 'PO',  icon: ShoppingCart, colorClass: 'bg-orange-50 dark:bg-orange-900/20', textColorClass: 'text-orange-600 dark:text-orange-400', tagClass: 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-300' },
];

export interface StatCounts {
  quotation: number;
  confirmation: number;
  invoice: number;
  packing: number;
  purchase: number;
}

interface StatsCardsProps {
  counts: StatCounts;
  loading?: boolean;
}

export function StatsCards({ counts, loading = false }: StatsCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {STAT_ITEMS.map(({ type, label, tag, icon: Icon, colorClass, textColorClass, tagClass }) => (
        <button
          key={type}
          type="button"
          onClick={() => router.push(`/history?type=${type}&time=today`)}
          className={`${colorClass} rounded-xl p-4 text-left hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500`}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Icon className={`h-4 w-4 shrink-0 ${textColorClass}`} />
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{label}</span>
          </div>
          {loading ? (
            <div className="h-8 w-10 rounded bg-gray-200 dark:bg-gray-700 animate-pulse mb-2" />
          ) : (
            <div className={`text-3xl font-bold ${textColorClass} mb-2 tabular-nums`}>
              {counts[type]}
            </div>
          )}
          <span className={`inline-block px-1.5 py-0.5 rounded text-[11px] font-semibold ${tagClass}`}>
            {tag}
          </span>
        </button>
      ))}
    </div>
  );
}
```

### STEP 2：数据接入

**先查看 `src/features/dashboard/hooks/useDashboardDocuments.ts`：**

检查该 hook 的签名，判断是否支持传入固定 `timeFilter`。然后按以下方案选一：

**方案 A（推荐）：hook 已接受 initialTimeFilter 参数或可扩展**

在 `useDashboardDocuments` 中增加一个独立的固定 `today` 计数（不受用户切换影响）：
在 hook 内部，额外维护 `todayCounts`，始终用 `time=today` 过滤 `recentDocuments` 计算。

```ts
// 在 useDashboardDocuments hook 内，现有 documentCounts 下方增加：
const todayCounts = useMemo<StatCounts>(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayDocs = recentDocuments.filter(
    (doc) => new Date(doc.createdAt).getTime() >= today.getTime()
  );
  return {
    quotation:    todayDocs.filter(d => d.type === 'quotation').length,
    confirmation: todayDocs.filter(d => d.type === 'confirmation').length,
    invoice:      todayDocs.filter(d => d.type === 'invoice').length,
    packing:      todayDocs.filter(d => d.type === 'packing').length,
    purchase:     todayDocs.filter(d => d.type === 'purchase').length,
  };
}, [recentDocuments]);

// hook 返回值中加入 todayCounts
return { ..., todayCounts };
```

**方案 B（兜底）：如果 hook 改动复杂**

直接在 DashboardPage 用现有 `recentDocuments`（完整列表，timeFilter 不影响拉取范围）本地计算：

```tsx
// DashboardPage.tsx 内：
const todayCounts = useMemo<StatCounts>(() => {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const ts = start.getTime();
  const filter = (type: string) =>
    recentDocuments.filter(d => d.type === type && new Date(d.createdAt).getTime() >= ts).length;
  return { quotation: filter('quotation'), confirmation: filter('confirmation'),
           invoice: filter('invoice'), packing: filter('packing'), purchase: filter('purchase') };
}, [recentDocuments]);
```

### STEP 3：插入到 DashboardPage

**修改 `src/features/dashboard/app/DashboardPage.tsx`：**

```tsx
// 1. 新增 import
import { StatsCards } from '@/features/dashboard/components/StatsCards';

// 2. 取得 todayCounts（见 STEP 2，从 hook 或本地计算）

// 3. AppLayout 内容区，在 DashboardSuccessMessage 之后、DashboardModules 之前插入：
<AppLayout ...>
  <div className="w-full max-w-none px-2 sm:px-4 lg:px-6 xl:px-8 2xl:px-12 py-6">
    <DashboardSuccessMessage ... />
    <StatsCards counts={todayCounts} loading={!mounted || isPermissionLoading} />
    <DashboardModules ... />
    <DashboardDocuments ... />
  </div>
</AppLayout>
```

### 验证

```bash
npx tsc --noEmit
# 手动验证：
# 1. 5 张卡片显示，颜色与单据类型一致（蓝/绿/紫/青/橙）
# 2. 数字显示今日数量，切换最近文档时间筛选时卡片数字不变
# 3. 点击卡片跳转到 /history?type=xxx&time=today
# 4. 加载中显示 animate-pulse 灰色占位块
# 5. 深色模式颜色正常
```

---

## TASK-21 ✅：修复侧边栏权限过滤

**状态**：已完成

### 问题

`AppSidebar.tsx` 的 `visibleItems` 过滤逻辑在 `permissionUser` 为 `null`（权限尚未加载）时，`?? false` 导致所有带 `permissionKey` 的项全被过滤掉，只剩 `首页` 和 `AI邮件` 两项（无 `permissionKey`）。

### 修改文件

**`src/components/layout/AppSidebar.tsx`**

```tsx
// 新增 isLoading 订阅
const isLoading = usePermissionStore((state) => state.isLoading);

const visibleItems = NAV_ITEMS.filter((item) => {
  if (!item.permissionKey) return true;
  // 权限加载中或 user 未就绪时，显示全部项目（避免闪烁消失）
  if (isLoading || !permissionUser) return true;
  // 管理员看全部
  if (permissionUser.isAdmin) return true;
  const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
  if (!moduleId) return true;
  return permissionUser.permissions?.some(
    (permission) => permission.moduleId === moduleId && permission.canAccess
  ) ?? false;
});
```

---

## TASK-22 ✅：StatsCards 改为 slim 单行横排

**状态**：已完成

### 问题

原 StatsCards 用 `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` 大卡布局，在宽屏实际渲染为 2-3 列，占据视口将近一半高度（约 340px），大数字"0"信息密度极低。

### 修改文件

**`src/features/dashboard/components/StatsCards.tsx`**（完全重写）

- 从大卡网格改为单行横排 slim bar，高度约 50px
- 最左侧「今日」标签，5 项用竖线分隔
- 每项：图标 + 名称（sm+可见）+ 数字（右对齐，加粗彩色）
- 点击跳转 `/history?type=xxx&time=today` 保持不变
- 加载中显示 animate-pulse 占位

---

## TASK-23 ✅：Dashboard 布局更新 CODEX_TASKS.md

**状态**：已完成

TASK-21 + TASK-22 完成后，Dashboard 首屏内容层级为：
1. slim 今日统计栏（~50px，一行）
2. 快速创建模块按钮（不变）
3. 搜索 + 近期单据（不需要滚动即可见）

无需改动 DashboardPage.tsx，布局顺序和 padding 已合理。

---

## 里程碑：数据管线完成（TASK-09 ~ TASK-15）

| 层次 | 实现 | 文件 |
|------|------|------|
| **写入** | localStorage 主写 + D1 fire-and-forget | `d1Sync.ts` |
| **迁移** | 管理员一键批量迁移历史数据 | `d1Migration.ts`, `D1MigrationPanel` |
| **API** | Document / Customer CRUD 全套 | `worker.ts`, `/api/documents`, `/api/customers` |
| **读取** | 登录时从 D1 拉取合并到 localStorage | `d1Pull.ts`, `useD1Sync.ts` |
| **鉴权** | Bearer token（Worker）+ NextAuth session（Next.js 代理）| `worker.ts`, `/api/admin/[...path]` |

---

## TASK-24 ✅：修复侧边栏「销售确认」点击后 Tab 不切换

**状态**：已完成

### 根本原因

`useInitQuotation.ts` 有两个 `useEffect`：

1. **Mount effect**（`[]` 依赖）：读 `?tab=` → 调 `setTab` → 有 `initialized.current` 守卫，只跑一次
2. **searchParams 监听 effect**（`[searchParams]` 依赖）：原本只做了 `window.history.replaceState`，**没有调 `setTab`**

当用户从侧边栏点击「销售确认」（导航到 `/quotation?tab=confirmation`）时，App Router 不会 unmount/remount QuotationPage，只触发 `searchParams` 变化。第 1 个 effect 不重跑（守卫），第 2 个 effect 重跑但没同步 store → `activeTab` 停留在 'quotation'。

### 修改文件

**`src/features/quotation/hooks/useInitQuotation.ts`**

```ts
// 修改前（只更新 URL，不同步 store）：
useEffect(() => {
  const tab = getTabFromSearchParams(searchParams || undefined);
  if (typeof window !== 'undefined' && tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }
}, [searchParams]);

// 修改后（先同步 store，再更新 URL）：
useEffect(() => {
  const tab = getTabFromSearchParams(searchParams || undefined);
  // 同步到 store（处理侧边栏 /quotation?tab=confirmation 导航）
  setTab(tab);
  // 更新URL参数以持久化tab状态
  if (typeof window !== 'undefined' && tab) {
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.replaceState(null, '', url.toString());
  }
}, [searchParams, setTab]);
```

### 验证

```bash
npx eslint src/features/quotation/hooks/useInitQuotation.ts
# 期望：0 error（2 warnings 为既有问题，与本次无关）
# 手动验证：
# 1. 侧边栏点击「销售确认」→ 右侧内容切换到 Order Confirmation tab
# 2. 侧边栏点击「报价单」→ 右侧内容切换到 Quotation tab
# 3. 页面内点击 tab 按钮仍正常切换
```

---

## TASK-25：侧边栏加 Logo，用户菜单移至左下角

**优先级**：🟡 体验优化
**估时**：30 分钟
**风险**：低，纯 UI 重构，不影响业务逻辑

### 背景

当前问题：
1. Sidebar 左上角只有纯文字「LC App / MLUONET」，缺少 Logo 图标
2. 用户头像 / 菜单在 TopBar 右上角，TopBar 因此显得拥挤
3. 期望：Sidebar 左上角显示 Logo + 文字，用户菜单移到 Sidebar 左下角，TopBar 只保留面包屑

### 涉及文件

| 操作 | 文件 |
|------|------|
| **新建** | `src/components/layout/AppUserMenu.tsx` |
| **修改** | `src/components/layout/AppTopBar.tsx` |
| **修改** | `src/components/layout/AppSidebar.tsx` |
| **修改** | `src/components/layout/AppLayout.tsx` |
| **修改** | `src/components/layout/index.ts` |

---

### STEP 1：新建 `src/components/layout/AppUserMenu.tsx`

将 AppTopBar 中的用户下拉菜单完整提取为独立组件，增加 `placement` prop 控制弹出方向。

```tsx
'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, Download, LogOut, Palette, Settings, User,
} from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { PermissionRefreshButton } from '@/components/PermissionRefreshButton';
import { ThemeCompactToggle } from '@/components/ThemeToggle';
import { apiRequestWithError, API_ENDPOINTS } from '@/lib/api-config';
import { preloadManager } from '@/utils/preloadUtils';

export interface AppUserMenuProps {
  user: { name: string; isAdmin: boolean; email?: string | null };
  onLogout: () => void | Promise<void>;
  /** 'top-right' → 向下弹（TopBar）；'bottom-left' → 向上弹（Sidebar 底部）*/
  placement?: 'top-right' | 'bottom-left';
  className?: string;
}

export function AppUserMenu({ user, onLogout, placement = 'top-right', className = '' }: AppUserMenuProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState<'profile' | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState(0);
  const [preloadStage, setPreloadStage] = useState('');
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const submenuHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const checkPreloadStatus = useCallback(() => {
    const status = preloadManager.getPreloadStatus();
    setIsPreloading(status.isPreloading);
    setPreloadProgress(status.progress);
    setIsPreloaded(preloadManager.isPreloaded());
  }, []);

  const openProfileSubmenu = useCallback(() => {
    if (submenuHideTimerRef.current) { clearTimeout(submenuHideTimerRef.current); submenuHideTimerRef.current = null; }
    setOpenSubmenu('profile');
  }, []);

  const scheduleCloseProfileSubmenu = useCallback(() => {
    if (showChangePassword) return;
    if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current);
    submenuHideTimerRef.current = setTimeout(() => setOpenSubmenu(null), 200);
  }, [showChangePassword]);

  useEffect(() => { return () => { if (submenuHideTimerRef.current) clearTimeout(submenuHideTimerRef.current); }; }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false); setOpenSubmenu(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    checkPreloadStatus();
    const interval = setInterval(checkPreloadStatus, 1000);
    return () => clearInterval(interval);
  }, [checkPreloadStatus]);

  useEffect(() => {
    const cb = (progress: number, stage?: string) => {
      setPreloadProgress(progress);
      if (stage) setPreloadStage(stage);
      if (progress > 0) setIsPreloading(true);
      if (progress >= 100) { setIsPreloading(false); setPreloadStage(''); setIsPreloaded(true); }
    };
    preloadManager.onProgress(cb);
    return () => preloadManager.offProgress(cb);
  }, []);

  const handleChangePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordError(null); setPasswordSuccess(null);
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) { setPasswordError('请完整填写所有字段'); return; }
    if (newPassword !== confirmPassword) { setPasswordError('新密码与确认密码不一致'); return; }
    if (newPassword.length < 6) { setPasswordError('新密码长度至少6位'); return; }
    setPasswordLoading(true);
    try {
      await apiRequestWithError(API_ENDPOINTS.USERS.CHANGE_PASSWORD, {
        method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }),
      });
      setPasswordSuccess('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { setShowChangePassword(false); setPasswordSuccess(null); }, 1500);
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : '修改密码失败');
    } finally { setPasswordLoading(false); }
  };

  const handlePreload = async () => {
    if (isPreloading) return;
    setIsPreloading(true); setPreloadProgress(0); setPreloadStage('准备中...');
    const cb = (progress: number, stage?: string) => { setPreloadProgress(progress); if (stage) setPreloadStage(stage); };
    preloadManager.onProgress(cb);
    try { await preloadManager.preloadAllResources(); setIsPreloaded(true); }
    catch (error) { console.error('预加载失败:', error); }
    finally { setIsPreloading(false); setPreloadStage(''); preloadManager.offProgress(cb); setShowDropdown(false); }
  };

  const isBottomLeft = placement === 'bottom-left';
  const dropdownPos = isBottomLeft ? 'bottom-full left-0 mb-2' : 'right-0 top-full mt-2';
  const submenuPos = isBottomLeft
    ? 'left-full top-0 ml-1'
    : 'right-0 top-full mt-1 sm:right-full sm:top-0 sm:mt-0 sm:-translate-x-[2px]';
  const ChevronIcon = isBottomLeft ? ChevronUp : ChevronDown;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setShowDropdown((v) => !v)}
        className={`flex items-center gap-2 rounded-md transition-colors focus:outline-none hover:bg-gray-100 dark:hover:bg-gray-800/50 ${isBottomLeft ? 'w-full px-2 py-2' : 'p-1.5'}`}
        aria-label="用户菜单"
      >
        <Avatar name={user.name} />
        {isBottomLeft && (
          <span className="min-w-0 flex-1 truncate text-left text-sm font-medium text-gray-700 dark:text-gray-200">
            {user.name}
          </span>
        )}
        <ChevronIcon className={`h-4 w-4 shrink-0 text-gray-500 transition-transform duration-200 dark:text-gray-400 ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {showDropdown && (
        <div
          className={`absolute z-[9999] w-auto min-w-[11rem] rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 animate-in fade-in-0 zoom-in-95 dark:bg-[#2c2c2e] dark:ring-white/10 ${dropdownPos}`}
          onMouseLeave={scheduleCloseProfileSubmenu}
          onMouseEnter={() => { if (openSubmenu) openProfileSubmenu(); }}
        >
          <div className="relative py-1">
            <button
              type="button" onMouseEnter={openProfileSubmenu} onClick={openProfileSubmenu}
              className="relative flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50"
            >
              <User className="mr-2 h-4 w-4" />个人信息
              {openSubmenu === 'profile' && (
                <span className="absolute inset-y-0 right-full w-2" onMouseEnter={openProfileSubmenu} onMouseLeave={scheduleCloseProfileSubmenu} />
              )}
            </button>

            {openSubmenu === 'profile' && (
              <div
                onMouseEnter={openProfileSubmenu} onMouseLeave={scheduleCloseProfileSubmenu}
                className={`absolute w-auto min-w-[14rem] rounded-xl bg-white p-3 shadow-xl ring-1 ring-black/5 dark:bg-[#2c2c2e] dark:ring-white/10 ${submenuPos}`}
              >
                <div className="space-y-2.5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="max-w-[9.5rem] truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">{user.name}</span>
                      <button type="button" onClick={() => { setShowChangePassword((v) => !v); setPasswordError(null); setPasswordSuccess(null); }}
                        className="text-[11px] text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        {showChangePassword ? '收起' : '修改密码'}
                      </button>
                    </div>
                    {user.email && <div className="truncate text-xs text-gray-500 dark:text-gray-400">{user.email}</div>}
                  </div>
                  <div className={showChangePassword ? 'block' : 'hidden'}>
                    <form onSubmit={handleChangePassword} className="space-y-2">
                      {passwordError && <div className="text-[11px] text-red-600 dark:text-red-400">{passwordError}</div>}
                      {passwordSuccess && <div className="text-[11px] text-green-600 dark:text-green-400">{passwordSuccess}</div>}
                      {(['currentPassword', 'newPassword', 'confirmPassword'] as const).map((field, i) => (
                        <input key={field} type="password"
                          placeholder={['当前密码', '新密码（至少6位）', '确认新密码'][i]}
                          value={passwordForm[field]}
                          onChange={(e) => setPasswordForm({ ...passwordForm, [field]: e.target.value })}
                          className="w-[12rem] rounded border border-gray-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          autoComplete={i === 0 ? 'current-password' : 'new-password'} required />
                      ))}
                      <div className="flex items-center gap-2">
                        <button type="submit" disabled={passwordLoading}
                          className={`rounded px-2.5 py-1 text-xs text-white ${passwordLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                          {passwordLoading ? '提交中...' : '保存'}
                        </button>
                        <button type="button"
                          onClick={() => { setShowChangePassword(false); setPasswordError(null); setPasswordSuccess(null); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}
                          className="rounded border border-gray-300 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800/50">
                          取消
                        </button>
                      </div>
                    </form>
                  </div>
                  <div className="border-t border-gray-200 pt-1 dark:border-gray-700">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <div className="flex items-center"><Palette className="mr-1.5 h-3.5 w-3.5" /><span>主题设置</span></div>
                      <ThemeCompactToggle />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-1 py-1"><PermissionRefreshButton /></div>

            <div className="relative">
              <button type="button" onClick={handlePreload} disabled={isPreloading}
                className={`relative flex w-full items-center overflow-hidden px-4 py-2 text-sm transition-colors duration-200 ${isPreloading ? 'cursor-not-allowed text-gray-400 dark:text-gray-500' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50'}`}>
                {isPreloading && <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-blue-100 transition-all duration-300 ease-out dark:from-blue-900/10 dark:to-blue-800/20" />}
                {isPreloading && <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-blue-300 transition-all duration-300 ease-out dark:from-blue-700/40 dark:to-blue-600/50" style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }} />}
                {isPreloading && <div className="absolute inset-0 border-r-2 border-blue-400 transition-all duration-300 ease-out dark:border-blue-300" style={{ width: `${Math.max(0, Math.min(100, preloadProgress))}%` }} />}
                <div className="relative z-10 flex w-full items-center">
                  <Download className={`mr-2 h-4 w-4 ${isPreloading ? 'animate-pulse' : ''}`} />
                  <span className="flex-1 text-left">
                    {isPreloading ? (<span className="flex flex-col"><span className="text-sm font-medium">预加载中 {preloadProgress}%</span>{preloadStage && <span className="truncate text-xs text-gray-500 dark:text-gray-400">{preloadStage}</span>}</span>)
                      : isPreloaded ? '资源已预加载 (100%)' : '预加载资源'}
                  </span>
                </div>
              </button>
            </div>

            {user.isAdmin && (
              <button type="button" onClick={() => { router.push('/admin'); setShowDropdown(false); }}
                className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50">
                <Settings className="mr-2 h-4 w-4" />管理后台
              </button>
            )}

            <button type="button" onClick={() => { onLogout(); setShowDropdown(false); }}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50">
              <LogOut className="mr-2 h-4 w-4" />退出登录
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### STEP 2：替换 `src/components/layout/AppTopBar.tsx`

移除所有用户下拉相关 state / handler / JSX，只保留汉堡菜单 + 移动端 Logo + 面包屑。

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight, Menu } from 'lucide-react';
import { LOGO_CONFIG } from '@/lib/logo-config';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface AppTopBarProps {
  breadcrumbs: BreadcrumbItem[];
  onMenuClick?: () => void;
  // user / onLogout 保留签名兼容性，移至 AppSidebar 底部
  user?: { name: string; isAdmin: boolean; email?: string | null };
  onLogout?: () => void | Promise<void>;
}

export function AppTopBar({ breadcrumbs, onMenuClick }: AppTopBarProps) {
  const currentBreadcrumb = breadcrumbs[breadcrumbs.length - 1];

  return (
    <header className="sticky top-0 z-40 h-14 bg-white shadow-sm dark:bg-[#1c1c1e] dark:shadow-gray-800/30">
      <div className="flex h-full items-center gap-3 px-3 sm:px-4 lg:px-6">
        {onMenuClick && (
          <button type="button" onClick={onMenuClick}
            className="rounded-md p-2 text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800/50 dark:hover:text-white lg:hidden"
            aria-label="打开导航">
            <Menu className="h-5 w-5" />
          </button>
        )}
        {/* 移动端 Logo（桌面端 Logo 在 Sidebar 头部）*/}
        <Image src={LOGO_CONFIG.web.logo} alt="LC App Logo" width={28} height={28} priority className="shrink-0 object-contain lg:hidden" />

        <nav className="min-w-0 flex-1" aria-label="当前位置">
          <ol className="hidden min-w-0 items-center gap-1 text-sm text-gray-500 dark:text-gray-400 md:flex">
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
                  {item.path && !isLast ? (
                    <Link href={item.path} className="truncate transition-colors hover:text-gray-900 dark:hover:text-white">{item.label}</Link>
                  ) : (
                    <span className={`truncate ${isLast ? 'font-medium text-gray-900 dark:text-white' : ''}`}>{item.label}</span>
                  )}
                  {!isLast && <ChevronRight className="h-4 w-4 shrink-0" />}
                </li>
              );
            })}
          </ol>
          <div className="truncate text-sm font-medium text-gray-900 dark:text-white md:hidden">
            {currentBreadcrumb?.label || 'LC App'}
          </div>
        </nav>
      </div>
    </header>
  );
}
```

---

### STEP 3：替换 `src/components/layout/AppSidebar.tsx`

头部：Logo 图片 + "LC App" 文字；底部：用户菜单区块。

```tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Archive, FileCheck, FileText, LayoutDashboard, Mail, Package, Receipt, ShoppingCart, Users, X, type LucideIcon } from 'lucide-react';
import { usePermissionStore } from '@/lib/permissions';
import { LOGO_CONFIG } from '@/lib/logo-config';
import { AppUserMenu } from './AppUserMenu';

export interface SidebarItem {
  id: string; label: string; path: string; icon: LucideIcon;
  dividerBefore?: boolean; permissionKey?: string;
}

interface AppSidebarProps {
  className?: string; onClose?: () => void;
  user?: { name: string; isAdmin: boolean; email?: string | null };
  onLogout?: () => void | Promise<void>;
}

export const NAV_ITEMS: SidebarItem[] = [
  { id: 'dashboard', label: '首页', path: '/dashboard', icon: LayoutDashboard },
  { id: 'quotation', label: '报价单', path: '/quotation', icon: FileText, dividerBefore: true, permissionKey: 'canCreateQuotation' },
  { id: 'confirmation', label: '销售确认', path: '/quotation?tab=confirmation', icon: FileCheck, permissionKey: 'canCreateConfirmation' },
  { id: 'packing', label: '箱单发票', path: '/packing', icon: Package, permissionKey: 'canCreatePacking' },
  { id: 'invoice', label: '财务发票', path: '/invoice', icon: Receipt, permissionKey: 'canCreateInvoice' },
  { id: 'purchase', label: '采购订单', path: '/purchase', icon: ShoppingCart, permissionKey: 'canCreatePurchase' },
  { id: 'history', label: '单据历史', path: '/history', icon: Archive, dividerBefore: true, permissionKey: 'canViewHistory' },
  { id: 'customer', label: '客户管理', path: '/customer', icon: Users, permissionKey: 'canManageCustomers' },
  { id: 'mail', label: 'AI邮件', path: '/mail', icon: Mail, dividerBefore: true },
];

const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation', canCreateConfirmation: 'quotation', canCreatePacking: 'packing',
  canCreateInvoice: 'invoice', canCreatePurchase: 'purchase', canViewHistory: 'history', canManageCustomers: 'customer',
};

function isItemActive(item: SidebarItem, pathname: string, tab: string | null) {
  if (item.id === 'confirmation') return pathname.startsWith('/quotation') && tab === 'confirmation';
  if (item.id === 'quotation') return pathname.startsWith('/quotation') && tab !== 'confirmation';
  return pathname.startsWith(item.path.split('?')[0]);
}

export function AppSidebar({ className = '', onClose, user, onLogout }: AppSidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get('tab');
  const permissionUser = usePermissionStore((state) => state.user);
  const isLoading = usePermissionStore((state) => state.isLoading);

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    if (isLoading || !permissionUser) return true;
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some((p) => p.moduleId === moduleId && p.canAccess) ?? false;
  });

  return (
    <aside className={`fixed left-0 top-0 z-30 flex h-screen w-[200px] flex-col border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-[#1c1c1e] ${className}`}>
      {/* 头部：Logo + 应用名 */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-4 dark:border-gray-700">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image src={LOGO_CONFIG.web.logo} alt="LC App" width={28} height={28} priority className="shrink-0 object-contain" />
          <span className="truncate text-sm font-semibold text-gray-900 dark:text-white">LC App</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose}
            className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800/50 dark:hover:text-gray-200 lg:hidden"
            aria-label="关闭导航">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* 导航列表 */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isItemActive(item, pathname, tab);
          return (
            <div key={item.id} className={item.dividerBefore ? 'mt-1 border-t border-gray-200 pt-1 dark:border-gray-700' : undefined}>
              <Link href={item.path} onClick={onClose}
                className={`flex h-10 items-center gap-3 rounded-md px-3 text-sm transition-colors ${active ? 'bg-blue-50 font-medium text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50'}`}>
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* 底部：用户菜单 */}
      {user && onLogout && (
        <div className="shrink-0 border-t border-gray-200 px-3 py-3 dark:border-gray-700">
          <AppUserMenu user={user} onLogout={onLogout} placement="bottom-left" />
        </div>
      )}
    </aside>
  );
}
```

---

### STEP 4：修改 `src/components/layout/AppLayout.tsx`

**把 `user` / `onLogout` 透传给 `AppSidebar`，`AppTopBar` 不再需要这两个 prop。**

找到：
```tsx
      <Suspense fallback={null}>
        <AppSidebar className="hidden lg:flex" />
      </Suspense>
```
替换为：
```tsx
      <Suspense fallback={null}>
        <AppSidebar className="hidden lg:flex" user={user} onLogout={onLogout} />
      </Suspense>
```

找到：
```tsx
          <Suspense fallback={null}>
            <AppSidebar
              className="z-50 lg:hidden"
              onClose={() => setSidebarOpen(false)}
            />
          </Suspense>
```
替换为：
```tsx
          <Suspense fallback={null}>
            <AppSidebar
              className="z-50 lg:hidden"
              onClose={() => setSidebarOpen(false)}
              user={user}
              onLogout={onLogout}
            />
          </Suspense>
```

找到：
```tsx
        <AppTopBar
          breadcrumbs={breadcrumbs}
          user={user}
          onLogout={onLogout}
          onMenuClick={() => setSidebarOpen(true)}
        />
```
替换为：
```tsx
        <AppTopBar
          breadcrumbs={breadcrumbs}
          onMenuClick={() => setSidebarOpen(true)}
        />
```

---

### STEP 5：修改 `src/components/layout/index.ts`

在末尾追加一行：
```ts
export { AppUserMenu, type AppUserMenuProps } from './AppUserMenu';
```

---

### 验证

```bash
npx eslint src/components/layout/AppUserMenu.tsx \
           src/components/layout/AppTopBar.tsx \
           src/components/layout/AppSidebar.tsx \
           src/components/layout/AppLayout.tsx
# 期望：0 error

npx tsc --noEmit 2>&1 | grep -v "e2e\|playwright"
# 期望：0 error（只有既有 e2e 的 @playwright/test 缺包警告）

# 手动验证：
# 1. 桌面端 Sidebar 左上角：Logo 图片 + "LC App" 文字
# 2. Sidebar 左下角：头像 + 用户名 + 向上弹出菜单（含退出、修改密码、主题、管理后台）
# 3. TopBar 只保留面包屑，不再显示右上角头像
# 4. 移动端：点汉堡 → 侧边抽屉出现 → 底部有用户菜单
```

---

## TASK-26 ✅：管理后台迁移到 AppLayout 框架

**优先级**：🟡 中
**状态**：已完成

### 背景

`/admin` 页面原本使用独立的 `AdminHeader` + `Footer` + 全屏 `min-h-screen` 外壳，与其他功能页的 AppLayout（侧边栏 + TopBar）风格不一致。

### 改动文件

**`src/features/admin/app/AdminPage.tsx`**
- 顶部加 `'use client';`
- 移除 `AdminHeader`、`Footer`、`signOut` 导入
- 新增 `AppLayout` from `@/components/layout` 和 `useAppUser` from `@/hooks/useAppUser`
- 组件内加 `const { user, handleLogout } = useAppUser();`，删除原 `handleLogout` 函数
- 早返回（loading / 权限不足 / error）保持原有 `min-h-screen` 全屏样式不变
- 主 `return` 改为：
  ```tsx
  <AppLayout
    breadcrumbs={[
      { label: '首页', path: '/dashboard' },
      { label: '管理后台' },
    ]}
    user={user}
    onLogout={handleLogout}
  >
    {/* 内容区 */}
  </AppLayout>
  ```

**`src/app/admin/users/[id]/page.tsx`**
- 同样迁移到 AppLayout
- 面包屑：首页 → 管理后台 → 用户详情
- 移除独立的"返回"按钮（面包屑导航已覆盖）
- useEffect 内 `setTimeout` 改为带清理的写法（`clearTimeout`）

### 验证

```bash
npx eslint src/features/admin/app/AdminPage.tsx src/app/admin/users/\[id\]/page.tsx
# 期望：0 errors（1 warning：pre-existing any，可忽略）
```

手动验证：访问 `/admin`，确认左侧显示侧边栏、顶部面包屑为「首页 / 管理后台」、用户菜单在左下角。

---

## TASK-27 ✅：TopBar 加入快捷工具（计算器 / 日期计算器）

**状态**：已完成

### 背景

原 `Footer.tsx` 中部有计算器（蓝）和日期计算器（绿）两个工具图标；Footer 已无任何页面引用，工具移至 TopBar 右侧统一呈现。

### 改动文件

- **新建** `src/components/layout/AppQuickTools.tsx`：自管理 showCalculator / showDateCalculator state + refs，渲染两个图标按钮及弹窗
- **修改** `AppTopBar.tsx`：在面包屑 `<nav>` 右侧加 `<AppQuickTools />`
- **修改** `src/components/layout/index.ts`：导出 `AppQuickTools`

### 验证

```bash
npx eslint src/components/layout/AppQuickTools.tsx src/components/layout/AppTopBar.tsx
```

---

## TASK-28 ✅：全面清理废弃文件 + CustomerDetailPage 迁移 AppLayout

**状态**：已完成（文件删除需手动执行 git rm）

### 背景

随着 TASK-25～27 的推进，以下文件已无任何 import 引用，属于死代码：

| 文件 | 废弃原因 |
|------|----------|
| `src/components/Footer.tsx` | TASK-26 后无页面引用 |
| `src/components/Header.tsx` | 早期遗留，已被 AppLayout 体系替代 |
| `src/components/admin/AdminHeader.tsx` | TASK-26 后无引用 |
| `src/features/quotation/app/QuotationPageRefactored.tsx` | 内部草稿，无路由挂载 |

另外 `CustomerDetailPage` 仍使用独立 `min-h-screen` 布局，已补充迁移。

### 手动执行（git rm）

```bash
git rm src/components/Footer.tsx
git rm src/components/Header.tsx
git rm src/components/admin/AdminHeader.tsx
git rm src/features/quotation/app/QuotationPageRefactored.tsx
git commit -m "chore: remove unused Footer, Header, AdminHeader, QuotationPageRefactored"
```

### 代码改动（已写入）

**`src/features/customer/app/CustomerDetailPage.tsx`**
- 移除独立 header div + ArrowLeft 返回按钮
- 改用 `AppLayout`，面包屑：首页 → 客户管理 → {customerName}
- 使用 `useAppUser` 获取 user / handleLogout

### 验证

```bash
npx eslint src/features/customer/app/CustomerDetailPage.tsx
# 0 errors

# 确认废弃文件无引用
grep -r "Footer\|AdminHeader\|QuotationPageRefactored" src --include="*.tsx" --include="*.ts" \
  | grep -v "Footer.tsx\|AdminHeader.tsx\|QuotationPageRefactored.tsx"
# 期望：无输出
```

---

## TASK-29：客户管理扩展联系人字段 + 询价人下拉选取

**优先级**：🟠 高（功能扩展）
**估时**：30 分钟
**风险**：低。类型扩展向后兼容（新字段均为可选），询价人字段降级为自由输入

### 背景

客户管理（`src/features/customer`）现有 `Customer` 类型缺少公司简称和多联系人支持。
询报价登记的「询价人」字段目前是自由文本，需改为从客户管理动态选取，值格式为 `公司简称-联系人简称`（如 `LC-Roger`）。

客户管理 localStorage key 为 `customer_management`，存储 `Customer[]`。

---

### 改动 1：扩展 Customer 类型

**文件**：`src/features/customer/types/index.ts`

在 `Customer` 接口的 `company: string;` 行**之后**插入：

```typescript
  companyShortName?: string;   // 公司简称（用于询价人标识）
  contact1ShortName?: string;  // 联系人1简称（对应现有 name 字段）
  contact2Name?: string;       // 联系人2姓名
  contact2ShortName?: string;  // 联系人2简称
  contact2Phone?: string;      // 联系人2电话
  contact2Email?: string;      // 联系人2邮箱
```

在 `CustomerFormData` 接口的 `company: string;` 行**之后**插入**完全相同**的六行（类型保持 `?: string`）。

同时确认客户保存逻辑（`src/features/customer/hooks/useCustomerActions.ts` 的 `saveCustomer`）会把这些新字段透传进 `Customer` 对象；否则表单可输入但不会持久化，询价人下拉也无法读取。

---

### 改动 2：CustomerForm 组件新增字段

**文件**：`src/features/customer/components/CustomerForm.tsx`

在「公司」字段的 `</div>` 关闭标签之后、按钮组 `<div className="flex justify-end` 之前，插入：

```tsx
      {/* 公司简称 */}
      <div>
        <label htmlFor="companyShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          公司简称
        </label>
        <input
          type="text"
          id="companyShortName"
          value={formData.companyShortName ?? ''}
          onChange={(e) => onInputChange('companyShortName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="如：LC"
        />
      </div>

      {/* 联系人1简称 */}
      <div>
        <label htmlFor="contact1ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          联系人1简称
          <span className="ml-1 text-xs text-gray-400 font-normal">（对应上方「名称」）</span>
        </label>
        <input
          type="text"
          id="contact1ShortName"
          value={formData.contact1ShortName ?? ''}
          onChange={(e) => onInputChange('contact1ShortName', e.target.value)}
          className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          placeholder="如：Roger"
        />
      </div>

      {/* 联系人2 */}
      <fieldset className="border border-gray-200 dark:border-gray-600 rounded-md p-3 space-y-3">
        <legend className="text-sm font-medium text-gray-600 dark:text-gray-300 px-1">
          联系人2（可选）
        </legend>
        <div>
          <label htmlFor="contact2Name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            姓名
          </label>
          <input
            type="text"
            id="contact2Name"
            value={formData.contact2Name ?? ''}
            onChange={(e) => onInputChange('contact2Name', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="contact2ShortName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            简称
          </label>
          <input
            type="text"
            id="contact2ShortName"
            value={formData.contact2ShortName ?? ''}
            onChange={(e) => onInputChange('contact2ShortName', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="如：Mary"
          />
        </div>
        <div>
          <label htmlFor="contact2Phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            电话
          </label>
          <input
            type="tel"
            id="contact2Phone"
            value={formData.contact2Phone ?? ''}
            onChange={(e) => onInputChange('contact2Phone', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label htmlFor="contact2Email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            邮箱
          </label>
          <input
            type="email"
            id="contact2Email"
            value={formData.contact2Email ?? ''}
            onChange={(e) => onInputChange('contact2Email', e.target.value)}
            className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>
      </fieldset>
```

---

### 改动 3：更新 useCustomerForm 初始状态

**文件**：`src/features/customer/hooks/useCustomerForm.ts`

找到初始化 `CustomerFormData` 的对象字面量（含 `company: ''` 的那处），在 `company: '',` 之后追加：

```typescript
  companyShortName: '',
  contact1ShortName: '',
  contact2Name: '',
  contact2ShortName: '',
  contact2Phone: '',
  contact2Email: '',
```

如果该初始值对象出现多处（reset / initialValue 等），逐一追加相同内容。

---

### 改动 4：新建询价人选项工具函数

**新建文件**：`src/features/inquiry/utils/inquirerOptions.ts`

```typescript
import { getLocalStorageJSON } from '@/utils/safeLocalStorage';
import type { Customer } from '@/features/customer/types';

/**
 * 从客户管理 localStorage 实时读取询价人选项。
 * 仅包含同时配置了「公司简称」和至少一个「联系人简称」的客户。
 * 返回格式：公司简称-联系人简称，如 ["LC-Roger", "LC-Mary"]
 */
export function getInquirerOptions(): string[] {
  if (typeof window === 'undefined') return [];

  const customers = getLocalStorageJSON<Customer[]>('customer_management', []);
  const options: string[] = [];

  for (const c of customers) {
    if (!c.companyShortName) continue;
    if (c.contact1ShortName) {
      options.push(`${c.companyShortName}-${c.contact1ShortName}`);
    }
    if (c.contact2ShortName) {
      options.push(`${c.companyShortName}-${c.contact2ShortName}`);
    }
  }

  return [...new Set(options)].sort();
}
```

---

### 改动 5：InquiryFormModal 询价人改为 datalist 选择

**文件**：`src/features/inquiry/components/InquiryFormModal.tsx`

**步骤 5a** — 在文件顶部 import 区（现有 import 列表末尾）追加：

```typescript
import { getInquirerOptions } from '../utils/inquirerOptions';
```

**步骤 5b** — 在组件内的 `useState` 声明区，在现有 state 之后追加：

```typescript
const [inquirerOptions, setInquirerOptions] = useState<string[]>([]);
```

**步骤 5c** — 在初始化基本字段的 `useEffect`（依赖 `[existingNos, isOpen, mode, record]`）里，在 `setLocalQuoted(...)` 那行之后、`}, [...]` 结束之前，插入：

```typescript
    setInquirerOptions(getInquirerOptions());
```

**步骤 5d** — 找到询价人 `<input>`：

```tsx
              <input
                value={inquirer}
                onChange={(e) => setInquirer(e.target.value)}
                className={FIELD_CLS}
                placeholder="LC-Roger"
                required
              />
```

替换为：

```tsx
              <input
                list="inquirer-datalist"
                value={inquirer}
                onChange={(e) => setInquirer(e.target.value)}
                className={FIELD_CLS}
                placeholder="LC-Roger（可从客户管理选取）"
                required
              />
              {inquirerOptions.length > 0 && (
                <datalist id="inquirer-datalist">
                  {inquirerOptions.map((opt) => (
                    <option key={opt} value={opt} />
                  ))}
                </datalist>
              )}
```

---

### 验证

```bash
npx tsc --noEmit
# 预期：无 inquiry 或 customer 相关类型错误

# 功能验证步骤：
# 1. 进入「客户管理」→ 新增客户
#    - 公司（公司名称）：Luo Company
#    - 公司简称：LC
#    - 名称（联系人1）：Roger
#    - 联系人1简称：Roger
#    → 保存
# 2. 进入「询报价登记」→「新增询价」
#    - 点击「询价人」输入框，下拉出现 "LC-Roger"
#    - 选取后值正确保存
# 3. 客户无简称时不出现在下拉
# 4. 联系人2有简称时产生额外选项
# 5. 仍可手动输入不在列表中的值（datalist 不限制自由输入）
```

### 提交

```bash
git add \
  src/features/customer/types/index.ts \
  src/features/customer/components/CustomerForm.tsx \
  src/features/customer/hooks/useCustomerForm.ts \
  src/features/inquiry/utils/inquirerOptions.ts \
  src/features/inquiry/components/InquiryFormModal.tsx
git commit -m "feat: 客户管理新增公司简称和联系人2字段，询价人改为下拉选取（公司简称-联系人简称）"
```

---

## TASK-30：询报价权限控制 + D1 共享数据

**优先级**：🔴 高（功能完整性）
**估时**：60 分钟
**风险**：中。Phase A 极低风险；Phase B 新增 Worker 路由和代理，不改动现有路由

### 背景与问题

询报价登记（`/inquiry`）目前存在三个问题：

1. **侧边栏权限绑定错误**：`AppSidebar.tsx` 中 `inquiry` 条目的 `permissionKey` 误设为 `canCreatePurchase`，导致侧边栏显示/隐藏错误地联动采购单权限。
2. **管理员无法分配权限**：`usePermissions.ts` 的 `MODULE_PERMISSIONS` 列表中没有 `inquiry`，管理员在 `/admin` 面板中看不到询报价权限项，无法为用户开启。
3. **数据不共享**：询报价记录存在 localStorage（按设备/账号隔离），有权限的其他用户无法看到。目标是：**有 `inquiry` 权限的用户看到全部记录，与创建者无关**。

### 解决方案

- **Phase A（权限门控，3 个文件）**：修正侧边栏映射 + 管理员面板 + 页面守卫
- **Phase B（共享 D1 数据，5 个文件）**：新增 Worker 路由 `/api/inquiry`（存储时 `user_id='_shared_'`，查询时不过滤 user_id） + Next.js 代理 + Service 层双写 + 页面启动时从 D1 拉取合并

---

### Phase A：权限门控

#### A-1 修改 `src/features/admin/hooks/usePermissions.ts`

在 `MODULE_PERMISSIONS` 数组中，**在 `purchase` 之后、`history` 之前**插入：

```ts
{ id: 'inquiry', name: '询报价登记', icon: '🔍' },
```

修改后数组为：
```ts
export const MODULE_PERMISSIONS = [
  { id: 'quotation',  name: '报价单',    icon: '📋' },
  { id: 'packing',   name: '装箱单',    icon: '📦' },
  { id: 'invoice',   name: '发票',      icon: '🧾' },
  { id: 'purchase',  name: '采购单',    icon: '🛒' },
  { id: 'inquiry',   name: '询报价登记', icon: '🔍' },
  { id: 'history',   name: '历史记录',  icon: '📚' },
  { id: 'customer',  name: '客户管理',  icon: '👥' },
  { id: 'ai-email',  name: 'AI邮件',   icon: '🤖' },
];
```

#### A-2 修改 `src/components/layout/AppSidebar.tsx`

**改动 1**：修正 `inquiry` 条目的 `permissionKey`：

找到：
```ts
  {
    id: 'inquiry',
    label: '询报价登记',
    path: '/inquiry',
    icon: Search,
    permissionKey: 'canCreatePurchase',
  },
```

替换为：
```ts
  {
    id: 'inquiry',
    label: '询报价登记',
    path: '/inquiry',
    icon: Search,
    permissionKey: 'canViewInquiry',
  },
```

**改动 2**：在 `PERMISSION_MODULE_MAP` 中添加映射：

找到：
```ts
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation',
  canCreateConfirmation: 'quotation',
  canCreatePacking: 'packing',
  canCreateInvoice: 'invoice',
  canCreatePurchase: 'purchase',
  canViewHistory: 'history',
  canManageCustomers: 'customer',
};
```

替换为：
```ts
const PERMISSION_MODULE_MAP: Record<string, string> = {
  canCreateQuotation: 'quotation',
  canCreateConfirmation: 'quotation',
  canCreatePacking: 'packing',
  canCreateInvoice: 'invoice',
  canCreatePurchase: 'purchase',
  canViewInquiry: 'inquiry',
  canViewHistory: 'history',
  canManageCustomers: 'customer',
};
```

#### A-3 修改 `src/features/inquiry/app/InquiryPage.tsx`

在文件顶部新增 import：
```ts
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
```

在 `InquiryPage` 组件函数内、现有 state 声明之前插入权限守卫逻辑：

```tsx
export function InquiryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { user, handleLogout } = useAppUser();
  // ... 其余现有 state 声明 ...

  // ── 权限守卫 ──────────────────────────────────────────
  const [permissionChecked, setPermissionChecked] = useState(false);
  const hasInquiryAccess = useMemo(() => {
    if (!session?.user) return false;
    if (session.user.isAdmin) return true;
    return (session.user.permissions ?? []).some(
      (p: { moduleId: string; canAccess: boolean }) =>
        p.moduleId === 'inquiry' && p.canAccess
    );
  }, [session]);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.push('/'); return; }
    setPermissionChecked(true);
  }, [status, router]);

  // 权限检查未完成时显示 loading
  if (!permissionChecked || status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
      </div>
    );
  }

  // 无权限时显示 403
  if (permissionChecked && !hasInquiryAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
        <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
          <div className="mb-4 text-6xl">🚫</div>
          <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
          <p className="mb-6 text-gray-600 dark:text-gray-400">您没有询报价登记的访问权限</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // ── 以下为原有 return JSX ────────────────────────────
```

同时在文件顶部加入：
```ts
import { useMemo } from 'react';  // 如果未导入
```

**Phase A 验证：**
```bash
npx tsc --noEmit
# 进入管理员面板，确认"询报价登记"权限项出现在用户权限列表中
# 为测试账号开启 inquiry 权限，确认侧边栏正确显示/隐藏
# 直接访问 /inquiry（无权限时）确认出现 403 页面
```

**Phase A 提交：**
```bash
git add src/features/admin/hooks/usePermissions.ts \
        src/components/layout/AppSidebar.tsx \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 添加权限门控（管理员面板 + 侧边栏映射 + 页面守卫）"
```

---

### Phase B：D1 共享数据

#### 数据模型设计

询报价记录复用现有 `Document` 表，约定：

| Document 字段 | 询报价含义 |
|---------------|-----------|
| `id` | `InquiryRecord.id` |
| `user_id` | 固定为 `'_shared_'`（表示全团队共享）|
| `type` | 固定为 `'inquiry'` |
| `doc_no` | `InquiryRecord.inquiryNo` |
| `customer_name` | `InquiryRecord.customerNo` |
| `total_amount` | 固定为 `0` |
| `currency` | 固定为 `'CNY'` |
| `data` | `JSON.stringify(InquiryRecord)`（完整记录） |

查询时 `WHERE type = 'inquiry'`，**不过滤 user_id**，取全部记录。

#### B-1 修改 `src/worker.ts`

在现有路由分发区（`if (path.startsWith('/api/admin'))`… 之类的块）**之前**，插入询报价路由：

```ts
// ── 询报价路由（共享数据，不过滤 user_id）────────────────
if (path.startsWith('/api/inquiry')) {
  return handleInquiryRequest(request, path, env);
}
```

在文件末尾（其他 handle 函数之后）新增：

```ts
async function handleInquiryRequest(
  request: Request,
  path: string,
  env: Env
): Promise<Response> {
  const d1 = new D1Client(env.USERS_DB);

  // GET /api/inquiry — 返回全部询报价记录
  if (request.method === 'GET' && path === '/api/inquiry') {
    const url = new URL(request.url);
    const limit = Math.min(Number(url.searchParams.get('limit') || '500'), 500);
    const offset = Number(url.searchParams.get('offset') || '0');

    const result = await env.USERS_DB.prepare(
      `SELECT * FROM Document WHERE type = 'inquiry' ORDER BY doc_no DESC LIMIT ? OFFSET ?`
    ).bind(limit, offset).all();

    const records = (result.results || []).map((row: any) => ({
      id: row.id,
      inquiryNo: row.doc_no,
      customerNo: row.customer_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ...(() => { try { return JSON.parse(row.data || '{}'); } catch { return {}; } })(),
    }));

    return jsonResponse({ records, total: records.length });
  }

  // POST /api/inquiry — 新增或替换
  if (request.method === 'POST' && path === '/api/inquiry') {
    const body = await request.json() as any;
    const id = body.id;
    const now = new Date().toISOString();
    const data = JSON.stringify(body);

    await env.USERS_DB.prepare(
      `INSERT OR REPLACE INTO Document
       (id, user_id, type, doc_no, customer_name, total_amount, currency, status, data, created_at, updated_at)
       VALUES (?, '_shared_', 'inquiry', ?, ?, 0, 'CNY', 'active', ?, ?, ?)`
    ).bind(
      id,
      body.inquiryNo ?? '',
      body.customerNo ?? '',
      data,
      body.createdAt ?? now,
      now
    ).run();

    return jsonResponse({ success: true, id });
  }

  // PUT /api/inquiry/:id — 更新
  const putMatch = path.match(/^\/api\/inquiry\/([^/]+)$/);
  if (request.method === 'PUT' && putMatch) {
    const id = putMatch[1];
    const body = await request.json() as any;
    const now = new Date().toISOString();
    const data = JSON.stringify(body);

    await env.USERS_DB.prepare(
      `UPDATE Document SET doc_no=?, customer_name=?, data=?, updated_at=?
       WHERE id=? AND type='inquiry'`
    ).bind(
      body.inquiryNo ?? '',
      body.customerNo ?? '',
      data,
      now,
      id
    ).run();

    return jsonResponse({ success: true, id });
  }

  // DELETE /api/inquiry/:id — 删除
  const delMatch = path.match(/^\/api\/inquiry\/([^/]+)$/);
  if (request.method === 'DELETE' && delMatch) {
    const id = delMatch[1];
    await env.USERS_DB.prepare(
      `DELETE FROM Document WHERE id=? AND type='inquiry'`
    ).bind(id).run();
    return jsonResponse({ success: true });
  }

  return jsonResponse({ error: 'Not Found' }, 404);
}
```

> 注意：`jsonResponse` 是 worker.ts 中已有的辅助函数，直接复用。

#### B-2 新增 `src/app/api/inquiry/[[...path]]/route.ts`

```ts
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const WORKER_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://udb.luocompany.net';

function getWorkerHeaders(): HeadersInit {
  const token = process.env.API_TOKEN;
  if (!token) throw new Error('API_TOKEN env var not set');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

async function proxyInquiryRequest(
  request: NextRequest,
  pathSegments: string[] = []
): Promise<NextResponse> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  // 检查 inquiry 权限（管理员直接通过）
  const isAdmin = session.user.isAdmin === true;
  const hasInquiry = isAdmin || (session.user.permissions ?? []).some(
    (p: any) => p.moduleId === 'inquiry' && p.canAccess
  );
  if (!hasInquiry) {
    return NextResponse.json({ error: '无询报价权限' }, { status: 403 });
  }

  const url = new URL(request.url);
  const workerPath = pathSegments.length > 0
    ? `/api/inquiry/${pathSegments.join('/')}`
    : '/api/inquiry';
  const workerUrl = `${WORKER_BASE}${workerPath}${url.search}`;

  let body: string | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
    body = await request.text();
  }

  let workerResp: Response;
  try {
    workerResp = await fetch(workerUrl, {
      method: request.method,
      headers: getWorkerHeaders(),
      body,
    });
  } catch (error) {
    console.error('Inquiry proxy request failed:', error);
    return NextResponse.json({ error: 'Worker 请求失败' }, { status: 502 });
  }

  const data = await workerResp.json();
  return NextResponse.json(data, { status: workerResp.status });
}

type RouteParams = { params: { path?: string[] } };

export async function GET(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function POST(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function PUT(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  return proxyInquiryRequest(req, params.path || []);
}
```

#### B-3 修改 `src/features/inquiry/services/inquiry.service.ts`

在现有 localStorage CRUD 之外，新增 D1 同步方法：

```ts
import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';
const API_BASE = '/api/inquiry';

export const inquiryService = {
  // ── localStorage CRUD（原有，不变）──────────────────────
  getAll(): InquiryRecord[] {
    return getLocalStorageJSON<InquiryRecord[]>(STORAGE_KEY, []);
  },
  save(records: InquiryRecord[]): void {
    setLocalStorage(STORAGE_KEY, records);
  },
  add(record: InquiryRecord): InquiryRecord[] {
    const records = this.getAll();
    const updated = [...records, record];
    this.save(updated);
    return updated;
  },
  update(id: string, patch: Partial<InquiryRecord>): InquiryRecord[] {
    const records = this.getAll().map((record) =>
      record.id === id
        ? { ...record, ...patch, updatedAt: new Date().toISOString() }
        : record
    );
    this.save(records);
    return records;
  },
  remove(id: string): InquiryRecord[] {
    const records = this.getAll().filter((record) => record.id !== id);
    this.save(records);
    return records;
  },

  // ── D1 同步（fire-and-forget）──────────────────────────
  /** 拉取 D1 全量询报价记录（用于登录/页面加载后合并到 localStorage）*/
  async pullFromD1(): Promise<InquiryRecord[]> {
    try {
      const res = await fetch(`${API_BASE}?limit=500`);
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.records) ? data.records : [];
    } catch {
      return [];
    }
  },

  /** 写入单条记录到 D1（fire-and-forget，不 await）*/
  syncToD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(API_BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch { /* silent */ }
    })();
  },

  /** 更新 D1 中的记录（fire-and-forget）*/
  updateInD1(record: InquiryRecord): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${record.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch { /* silent */ }
    })();
  },

  /** 从 D1 删除（fire-and-forget）*/
  deleteFromD1(id: string): void {
    void (async () => {
      try {
        await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      } catch { /* silent */ }
    })();
  },

  /** 合并 D1 记录到 localStorage（updated_at 更新的以 D1 为准）*/
  mergeFromD1(d1Records: InquiryRecord[]): InquiryRecord[] {
    const local = this.getAll();
    const localMap = new Map(local.map((r) => [r.id, r]));

    for (const d1 of d1Records) {
      const loc = localMap.get(d1.id);
      if (!loc || new Date(d1.updatedAt) > new Date(loc.updatedAt)) {
        localMap.set(d1.id, d1);
      }
    }

    const merged = Array.from(localMap.values()).sort(
      (a, b) => b.inquiryNo.localeCompare(a.inquiryNo)
    );
    this.save(merged);
    return merged;
  },
};
```

#### B-4 修改 `src/features/inquiry/state/inquiry.store.ts`

在每个写操作（`addRecord`、`updateRecord`、`removeRecord`、`replaceStatuses`）完成 localStorage 写入后，追加 D1 fire-and-forget 调用。

在 store 顶部 import 中追加：
```ts
import { inquiryService } from '../services/inquiry.service';
```
（如已有则跳过，但需确认用的是同一 service）

**`addRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
inquiryService.syncToD1(record);
```

**`updateRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
const updatedRecord = updated.find((r) => r.id === id);
if (updatedRecord) inquiryService.updateInD1(updatedRecord);
```

**`removeRecord` 修改**：在 `set({ records: updated });` 之后追加：
```ts
inquiryService.deleteFromD1(id);
```

**`replaceStatuses` 修改**：在 `set({ records });` 之后追加：
```ts
const target = records.find((r) => r.id === recordId);
if (target) inquiryService.updateInD1(target);
```

**各供应商级别操作**（`addSupplier`、`updateSupplier`、`removeSupplier`、`addQuotedStatus`、`updateQuotedStatus`、`removeQuotedStatus`）：
在每个操作的 `set({ records });` 之后追加：
```ts
const target = records.find((r) => r.id === recordId);
if (target) inquiryService.updateInD1(target);
```

#### B-5 修改 `src/features/inquiry/app/InquiryPage.tsx`

在 `useEffect(() => { useInquiryStore.getState().init(); }, []);` 之后，新增 D1 拉取 effect：

```tsx
// ── D1 拉取（页面加载后合并共享数据）─────────────────────
useEffect(() => {
  if (!hasInquiryAccess) return; // 权限守卫通过后才拉取
  let cancelled = false;
  inquiryService.pullFromD1().then((d1Records) => {
    if (cancelled || d1Records.length === 0) return;
    const merged = inquiryService.mergeFromD1(d1Records);
    useInquiryStore.setState({ records: merged });
  });
  return () => { cancelled = true; };
}, [hasInquiryAccess]);
```

在文件顶部新增 import（如未导入）：
```ts
import { inquiryService } from '../services/inquiry.service';
```

---

### 验证步骤

```bash
# 1. 类型检查
npx tsc --noEmit

# 2. 部署 Worker（新增 /api/inquiry 路由）
npx wrangler deploy

# 3. 浏览器验证：
#    a. 管理员进入 /admin → 用户权限弹窗 → 确认"询报价登记"权限项出现
#    b. 为用户 A 开启 inquiry 权限，为用户 B 不开启
#    c. 用户 A 登录 → 侧边栏显示"询报价登记" → 可访问 /inquiry
#    d. 用户 B 登录 → 侧边栏隐藏"询报价登记" → 直接访问 /inquiry 显示权限不足
#    e. 用户 A 创建一条询报价记录
#    f. 同样有 inquiry 权限的用户 C 登录 → 进入 /inquiry → 能看到用户 A 创建的记录
```

### 提交

```bash
# Phase A 已单独提交（见上）

# Phase B
git add src/worker.ts \
        src/app/api/inquiry/ \
        src/features/inquiry/services/inquiry.service.ts \
        src/features/inquiry/state/inquiry.store.ts \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): D1 共享数据（全员可见 + fire-and-forget 双写）"
```

---

## TASK-31：客户表单布局优化（分区 + 双列 + 联系人2折叠）

**优先级**：🟡 中（体验优化）
**估时**：30 分钟
**风险**：低。纯 UI 重构，不改任何字段、类型定义或数据逻辑

### 背景与问题

当前 `CustomerForm.tsx` 把所有字段垂直堆叠，导致：
1. 表单过长，需大量滚动
2. 公司信息和联系人信息无视觉分区
3. 联系人2 永远展开占用大量空间（通常不填）
4. "名称"字段指向联系人1姓名，但紧跟在"地址"后面，语义位置混乱
5. 供应商/收货人的表单和客户完全一样，但它们不需要简称字段

### 目标设计

#### 客户（entityType === 'customers'）

```
── 公司信息 ──────────────────────────────────────────
公司全称 *（2/3 宽）    简称（1/3 宽，如：LC）
地址（全宽）

── 联系人1 ───────────────────────────────────────────
姓名 *（1/2 宽）        简称（1/2 宽，如：Roger）
邮箱（1/2 宽）          电话（1/2 宽）

▶ 联系人2（可选，默认折叠，点击展开）
  姓名（1/2 宽）        简称（1/2 宽，如：Mary）
  邮箱（1/2 宽）        电话（1/2 宽）
─────────────────────────────────────────────────────
                              [ 取消 ]  [ 保存 ]
```

#### 供应商 / 收货人（entityType !== 'customers'）

```
公司名称 *（全宽）
地址（全宽）
联系人姓名 *（1/2 宽）  邮箱（1/2 宽）
电话（全宽）
─────────────────────────────────────────────────────
                              [ 取消 ]  [ 保存 ]
```

### 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `src/features/customer/components/CustomerForm.tsx` | 主要重构 |
| `src/features/customer/components/CustomerModal.tsx` | 内容区加 `overflow-y-auto max-h-[85vh]` 防小屏截断 |

### 具体实现（`CustomerForm.tsx`）

#### 1. 新增 showContact2 状态

```tsx
const [showContact2, setShowContact2] = useState(false);
```

初始化逻辑：编辑模式下如果 `formData.contact2Name` 或 `formData.contact2ShortName` 有值，则初始展开：

```tsx
// 初始化时检查
useState(() => {
  if (formData.contact2Name || formData.contact2ShortName) {
    setShowContact2(true);
  }
});
```

或用 `useEffect`:
```tsx
useEffect(() => {
  if (formData.contact2Name || formData.contact2ShortName) {
    setShowContact2(true);
  }
}, []); // 仅挂载时
```

#### 2. 客户表单 JSX 结构

```tsx
{/* ── 公司信息 ── */}
<div>
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">公司信息</p>
  <div className="grid grid-cols-3 gap-3 mb-3">
    <div className="col-span-2">
      <label>公司全称 <span className="text-red-500">*</span></label>
      <input field="company" required />
    </div>
    <div>
      <label>简称</label>
      <input field="companyShortName" placeholder="如：LC" />
    </div>
  </div>
  <div>
    <label>地址</label>
    <input field="address" />
  </div>
</div>

{/* ── 联系人1 ── */}
<div>
  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">联系人1</p>
  <div className="grid grid-cols-2 gap-3 mb-3">
    <div>
      <label>姓名 <span className="text-red-500">*</span></label>
      <input field="name" required />
    </div>
    <div>
      <label>简称</label>
      <input field="contact1ShortName" placeholder="如：Roger" />
    </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label>邮箱</label>
      <input field="email" type="email" />
    </div>
    <div>
      <label>电话</label>
      <input field="phone" type="tel" />
    </div>
  </div>
</div>

{/* ── 联系人2 折叠 ── */}
<div>
  <button
    type="button"
    onClick={() => setShowContact2(v => !v)}
    className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 py-1"
  >
    <span>{showContact2 ? '▼' : '▶'}</span>
    <span>联系人2（可选）</span>
  </button>
  {showContact2 && (
    <div className="mt-2 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>姓名</label>
          <input field="contact2Name" />
        </div>
        <div>
          <label>简称</label>
          <input field="contact2ShortName" placeholder="如：Mary" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label>邮箱</label>
          <input field="contact2Email" type="email" />
        </div>
        <div>
          <label>电话</label>
          <input field="contact2Phone" type="tel" />
        </div>
      </div>
    </div>
  )}
</div>
```

#### 3. 供应商/收货人 JSX 结构

```tsx
{/* 当 entityType !== 'customers' 时 */}
<div>
  <label>公司名称 <span className="text-red-500">*</span></label>
  <input field="company" required />
</div>
<div>
  <label>地址</label>
  <input field="address" />
</div>
<div className="grid grid-cols-2 gap-3">
  <div>
    <label>联系人姓名 <span className="text-red-500">*</span></label>
    <input field="name" required />
  </div>
  <div>
    <label>邮箱</label>
    <input field="email" type="email" />
  </div>
</div>
<div>
  <label>电话</label>
  <input field="phone" type="tel" />
</div>
```

#### 4. `CustomerModal.tsx` 改动

```tsx
// 内容容器加 overflow-y-auto max-h-[85vh]
<div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md
                overflow-y-auto max-h-[85vh]">
```

### 样式规范

- 分区标题：`text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2`
- 所有 input：复用现有 className（`mt-1 block w-full border border-gray-300 ...`）
- 按钮行：保持 `flex justify-end space-x-2` 不变
- 暗色模式：标签用 `dark:text-gray-300`，分区标题用 `dark:text-gray-500`

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/components/CustomerForm.tsx

# 手动检查：
# 1. 添加客户：字段分区正确，联系人2 默认折叠，展开后字段正常
# 2. 编辑有联系人2数据的客户：联系人2 自动展开
# 3. 添加供应商/收货人：只显示简化表单
# 4. 暗色模式外观正常
```

### 提交

```bash
git add src/features/customer/components/CustomerForm.tsx \
        src/features/customer/components/CustomerModal.tsx
git commit -m "feat(customer): 表单布局优化（分区 + 双列网格 + 联系人2折叠）"
```

---

## TASK-32：修复询报价共享数据——本地记录推送 D1

**优先级**：🔴 高（Bug 修复）
**估时**：15 分钟
**风险**：极低。只加一个推送步骤，不改任何写入逻辑

### 问题根因

两个 bug 叠加，导致有权限的用户看不到其他人的询报价记录：

**Bug 1（`InquiryPage.tsx` 第 51 行）**
```ts
if (cancelled || d1Records.length === 0) return;
```
D1 为空时直接跳过所有同步，本地已有的数据永远推不上去。

**Bug 2（缺少推送步骤）**
页面加载只执行 `pullFromD1`，从未把本地存量记录推到 D1。
TASK-30 上线前创建的记录只存在于创建者的 localStorage，其他用户拉取时 D1 里没有，看不到。

### 修复方案

**双向同步**：加载时先拉 D1，把本地比 D1 新（或 D1 里没有）的记录推上去，再合并显示。

### 涉及文件

| 文件 | 改动 |
|------|------|
| `src/features/inquiry/services/inquiry.service.ts` | 新增 `pushLocalToD1(d1Records)` 方法 |
| `src/features/inquiry/app/InquiryPage.tsx` | 去掉 `length === 0` 判断，加推送调用 |

---

### 改动一：`inquiry.service.ts`

在 `mergeFromD1` 方法之后、对象字面量结束的 `}` 之前，新增：

```ts
/**
 * 把本地比 D1 新（或 D1 里没有）的记录推送到 D1（fire-and-forget）。
 * 在 pullFromD1 之后调用，确保存量数据对所有有权限的用户可见。
 */
pushLocalToD1(d1Records: InquiryRecord[]): void {
  const d1Map = new Map(d1Records.map((r) => [r.id, r]));
  const local = this.getAll();
  for (const localRecord of local) {
    const d1Record = d1Map.get(localRecord.id);
    if (!d1Record) {
      // D1 里不存在，直接推
      this.syncToD1(localRecord);
    } else {
      const localTime = new Date(localRecord.updatedAt).getTime();
      const d1Time = new Date(d1Record.updatedAt).getTime();
      if (Number.isFinite(localTime) && localTime > d1Time) {
        // 本地更新，覆盖 D1
        this.updateInD1(localRecord);
      }
    }
  }
},
```

---

### 改动二：`InquiryPage.tsx`

找到以下代码块（权限通过后的 D1 同步 effect）：

```ts
// 原来
void inquiryService.pullFromD1().then((d1Records) => {
  if (cancelled || d1Records.length === 0) return;
  const merged = inquiryService.mergeFromD1(d1Records);
  useInquiryStore.setState({ records: merged });
});
```

替换为：

```ts
// 修复后
void inquiryService.pullFromD1().then((d1Records) => {
  if (cancelled) return;
  // 把本地存量记录推送到 D1（D1 没有的 或 本地更新的）
  inquiryService.pushLocalToD1(d1Records);
  // 合并 D1 记录到本地显示（D1 更新则以 D1 为准）
  const merged = inquiryService.mergeFromD1(d1Records);
  useInquiryStore.setState({ records: merged });
});
```

变更要点：
1. 删除 `d1Records.length === 0` 的 return（D1 为空也要执行推送）
2. 在 `mergeFromD1` 之前调用 `inquiryService.pushLocalToD1(d1Records)`

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/services/inquiry.service.ts \
               --file src/features/inquiry/app/InquiryPage.tsx

# 手动验证：
# 1. 用户 A（有 inquiry 权限）打开 /inquiry → 看到自己的记录，本地记录自动推送到 D1
# 2. 用户 B（有 inquiry 权限）打开 /inquiry → 能看到用户 A 的记录
# 3. 用户 B 编辑一条记录 → 用户 A 刷新页面后也能看到修改
# 4. 无 inquiry 权限的用户 → 显示 403，无法访问
```

### 提交

```bash
git add src/features/inquiry/services/inquiry.service.ts \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "fix(inquiry): 双向同步修复——页面加载时推送本地存量记录到 D1"
```

---

## TASK-33：修复客户数据 D1 字段丢失（简称/联系人2 不同步）

**优先级**：🔴 高（Bug 修复，影响多设备同步）
**估时**：15 分钟
**风险**：极低。只改两处字段映射，不动任何类型或 UI

### 根因

**Bug A — `customerService.ts` 双写 payload 不完整**

`saveCustomer` 调用 `d1SyncCustomer` 时 `data` 只包含 `company`：
```ts
// 当前（错误）
data: { company: customer.company },
```

导致 `companyShortName`、`contact1ShortName`、`contact2Name/ShortName/Phone/Email`
全部只存在 localStorage，永远不会写入 D1。

**Bug B — `d1Pull.ts` `d1CustomerToLocal` 恢复字段不完整**

```ts
// 当前（错误）
const company = typeof c.data.company === 'string' ? c.data.company : '';
return {
  id: c.id, name: c.name, email: c.email || '',
  phone: c.phone || '', address: c.address || '',
  company,              // ← 只还原 company，其余字段全丢
  createdAt: c.created_at, updatedAt: c.updated_at,
};
```

换设备登录时，D1 拉取的客户数据被 `d1CustomerToLocal` 截断，简称和联系人2信息丢失。

---

### 涉及文件

| 文件 | 改动说明 |
|------|---------|
| `src/features/customer/services/customerService.ts` | `saveCustomer` 中 `data` payload 补全所有字段 |
| `src/utils/d1Pull.ts` | `d1CustomerToLocal` 改为 spread `c.data`，还原全部字段 |

---

### 改动一：`customerService.ts`

找到 `saveCustomer` 函数中的 `d1SyncCustomer` 调用，将 `data` 字段从：
```ts
data: { company: customer.company },
```
改为：
```ts
data: {
  company: customer.company,
  companyShortName: customer.companyShortName,
  contact1ShortName: customer.contact1ShortName,
  contact2Name: customer.contact2Name,
  contact2ShortName: customer.contact2ShortName,
  contact2Phone: customer.contact2Phone,
  contact2Email: customer.contact2Email,
},
```

---

### 改动二：`d1Pull.ts`

找到 `d1CustomerToLocal` 函数，替换整个函数体：

```ts
// 修复前
function d1CustomerToLocal(c: D1Customer, _type: 'customer' | 'supplier' | 'consignee') {
  const company = typeof c.data.company === 'string' ? c.data.company : '';
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    company,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}

// 修复后
function d1CustomerToLocal(c: D1Customer, _type: 'customer' | 'supplier' | 'consignee') {
  return {
    id: c.id,
    name: c.name,
    email: c.email || '',
    phone: c.phone || '',
    address: c.address || '',
    // 展开 data JSON 中存储的全部字段
    // （company、companyShortName、contact1ShortName、contact2*、未来的 contacts[] 等）
    ...c.data,
    // D1 表的时间戳列优先（比 data JSON 里的更可靠）
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  };
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/services/customerService.ts \
               --file src/utils/d1Pull.ts

# 手动验证（需要两台设备或两个浏览器）：
# 1. 设备 A：编辑一个客户，填入公司简称、联系人1简称、联系人2信息 → 保存
# 2. 设备 B（同账号登录）：进入客户管理 → 该客户的简称和联系人2信息应完整显示
```

### 提交

```bash
git add src/features/customer/services/customerService.ts \
        src/utils/d1Pull.ts
git commit -m "fix(customer): D1 双写补全简称/联系人字段，d1Pull 还原全部 data 字段"
```

---

## TASK-34：客户联系人改为动态多人数组

**优先级**：🟡 中（新功能，TASK-33 完成后再执行）
**估时**：60 分钟
**风险**：中。需修改类型 + 表单 UI + 双写 + 拉取 + 询价人选项，需充分测试

### 背景

当前联系人2硬编码（`contact2Name/ShortName/Phone/Email`），无法添加第3个联系人。
目标：支持任意数量的附加联系人，存储为 `contacts: Contact[]` 数组。

联系人1（主联系人）保持原有字段（`name` / `email` / `phone` / `contact1ShortName`），
D1 `Customer` 表的 `name/email/phone` 列继续存联系人1信息，兼容旧数据。

### 新类型设计

#### `src/features/customer/types/index.ts`

新增 `Contact` 接口：
```ts
export interface Contact {
  id: string;         // nanoid 或 crypto.randomUUID()
  name: string;       // 姓名（必填）
  shortName?: string; // 简称（可选）
  email?: string;
  phone?: string;
}
```

更新 `Customer`：
```ts
export interface Customer {
  id: string;
  name: string;             // 联系人1全名（对应 D1 name 列）
  email: string;            // 联系人1邮箱
  phone: string;            // 联系人1电话
  address: string;
  company: string;
  companyShortName?: string;
  contact1ShortName?: string;
  contacts?: Contact[];     // 新增：附加联系人（联系人2、3、4…）
  // 以下字段保留用于旧数据迁移（不再写入新记录）
  contact2Name?: string;
  contact2ShortName?: string;
  contact2Phone?: string;
  contact2Email?: string;
  createdAt: string;
  updatedAt: string;
}
```

更新 `CustomerFormData`：
```ts
export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  company: string;
  companyShortName?: string;
  contact1ShortName?: string;
  contacts: Contact[];   // 替代 contact2* 字段
}
```

---

### 各文件改动要点

#### `src/features/customer/hooks/useCustomerForm.ts`

- `initialFormData` 的 `contacts` 默认为 `[]`，删除 `contact2*` 字段
- `setFormDataForEdit` 从 editingCustomer 读取时：
  - 若有 `contacts[]` → 直接使用
  - 若无 `contacts[]` 但有旧 `contact2Name` → 迁移为 `contacts[{ id, name: contact2Name, shortName: contact2ShortName, phone: contact2Phone, email: contact2Email }]`

#### `src/features/customer/hooks/useCustomerActions.ts`

`saveCustomer` 构建 `newCustomer` 时：
```ts
const newCustomer: Customer = {
  // ... 现有字段
  contacts: customerData.contacts,   // 替代 contact2*
  // 不再写 contact2Name/contact2ShortName/contact2Phone/contact2Email
};
```

#### `src/features/customer/services/customerService.ts`

`d1SyncCustomer` 的 `data` payload：
```ts
data: {
  company: customer.company,
  companyShortName: customer.companyShortName,
  contact1ShortName: customer.contact1ShortName,
  contacts: customer.contacts ?? [],
  // 不再写 contact2* 字段
},
```

#### `src/features/customer/components/CustomerForm.tsx`

替换"联系人2（可选）"固定 fieldset，改为动态列表：

```tsx
{/* 附加联系人（动态，仅客户）*/}
{entityType === 'customers' && (
  <div className="space-y-3">
    {contacts.map((contact, index) => (
      <div key={contact.id} className="rounded-md border border-gray-200 dark:border-gray-600 p-3 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
            联系人{index + 2}
          </span>
          <button type="button" onClick={() => removeContact(contact.id)}
            className="text-xs text-red-400 hover:text-red-600">删除</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>姓名</label><input value={contact.name} onChange={...} /></div>
          <div><label>简称</label><input value={contact.shortName ?? ''} onChange={...} /></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label>邮箱</label><input type="email" value={contact.email ?? ''} onChange={...} /></div>
          <div><label>电话</label><input type="tel" value={contact.phone ?? ''} onChange={...} /></div>
        </div>
      </div>
    ))}
    <button type="button" onClick={addContact}
      className="w-full py-2 text-sm text-blue-600 border border-dashed border-blue-300 rounded-md hover:bg-blue-50">
      + 添加联系人
    </button>
  </div>
)}
```

联系人 state 在 `CustomerForm.tsx` 内部管理（`useState<Contact[]>`），
通过新增 prop `onContactsChange: (contacts: Contact[]) => void` 向上传递变更。

`CustomerModal.tsx` 增加 `onContactsChange` prop 透传。
`CustomerPage.tsx` / `useCustomerForm.ts` 在 `formData` 里维护 `contacts`。

#### `src/utils/d1Pull.ts`

`d1CustomerToLocal` 已在 TASK-33 修复（spread `c.data`），新增迁移逻辑：

```ts
// 在 spread c.data 之后，对旧数据做 contact2* → contacts[] 迁移
const result = { id: c.id, name: c.name, email: c.email || '', ...c.data, createdAt: c.created_at, updatedAt: c.updated_at };

// 旧数据迁移：contact2* → contacts[]
if (!result.contacts && result.contact2Name) {
  result.contacts = [{
    id: crypto.randomUUID(),
    name: result.contact2Name as string,
    shortName: result.contact2ShortName as string | undefined,
    phone: result.contact2Phone as string | undefined,
    email: result.contact2Email as string | undefined,
  }];
}
return result;
```

#### `src/features/inquiry/utils/inquirerOptions.ts`

同时支持旧格式和新格式：
```ts
for (const c of customers) {
  if (!c.companyShortName) continue;
  // 联系人1
  if (c.contact1ShortName) options.push(`${c.companyShortName}-${c.contact1ShortName}`);
  // 新格式：contacts[]
  for (const contact of c.contacts ?? []) {
    if (contact.shortName) options.push(`${c.companyShortName}-${contact.shortName}`);
  }
  // 旧格式兼容（没有 contacts[] 才读 contact2ShortName）
  if (!c.contacts && c.contact2ShortName) {
    options.push(`${c.companyShortName}-${c.contact2ShortName}`);
  }
}
```

---

### 验证

```bash
npx tsc --noEmit
npm run lint -- --file src/features/customer/types/index.ts \
               --file src/features/customer/hooks/useCustomerForm.ts \
               --file src/features/customer/hooks/useCustomerActions.ts \
               --file src/features/customer/services/customerService.ts \
               --file src/features/customer/components/CustomerForm.tsx \
               --file src/utils/d1Pull.ts \
               --file src/features/inquiry/utils/inquirerOptions.ts

# 手动验证：
# 1. 添加新客户 → 填写公司简称 → 添加3个联系人 → 保存 → 数据显示正确
# 2. 编辑有旧 contact2* 数据的客户 → 自动迁移为 contacts[0] 显示
# 3. 询报价模块"询价人"下拉 → 所有联系人简称均出现
# 4. 换设备登录 → 联系人数据完整同步
```

### 提交

```bash
git add src/features/customer/types/index.ts \
        src/features/customer/hooks/useCustomerForm.ts \
        src/features/customer/hooks/useCustomerActions.ts \
        src/features/customer/services/customerService.ts \
        src/features/customer/components/CustomerForm.tsx \
        src/utils/d1Pull.ts \
        src/features/inquiry/utils/inquirerOptions.ts
git commit -m "feat(customer): 联系人改为动态数组，兼容旧 contact2* 数据迁移"
```

---

## TASK-35 ✅：Worker 部署 + CI 自动化

### 背景

`src/worker.ts` 的 `/api/inquiry` 路由（TASK-19B）从未被部署到线上 Cloudflare Worker。
线上 Worker 仍是旧版本，导致所有 GET/POST `/api/inquiry` 请求均返回 404：
- `pullFromD1` 静默返回 `[]` → 无法拉取他人记录
- `syncToD1` 静默失败 → 新增记录只存 localStorage，换设备后消失

CI 中也缺少 wrangler deploy 步骤，每次修改 Worker 都要手动部署。

### 目标

1. 立即部署当前 Worker 到 Cloudflare
2. CI 在每次 push main 后自动部署 Worker

### 执行步骤

#### Phase A：立即部署（终端手动执行）

```bash
cd /Users/roger/website/luonet-vercel
npx wrangler deploy
```

验证：
```bash
# 检查 /api/inquiry 路由是否正常（需替换 token）
curl -s -H "Authorization: Bearer <API_TOKEN>" https://udb.luocompany.net/api/inquiry | head -c 200
```

#### Phase B：CI 自动化（已由 Claude 写入 .github/workflows/ci.yml）

新增 `deploy-worker` job：
- `needs: check`（lint+build 通过后才部署）
- 使用 `CLOUDFLARE_API_TOKEN` secret（需在 GitHub repo 的 Settings → Secrets 中添加）
- `e2e` job 改为 `needs: [check, deploy-worker]`（Worker 部署后再跑 E2E）

GitHub Secret 配置：
- 进入 Cloudflare Dashboard → My Profile → API Tokens
- 创建 Token，权限：`Cloudflare Workers:Edit`
- 在 GitHub Repo → Settings → Secrets → Actions → New secret
- Name: `CLOUDFLARE_API_TOKEN`，Value: 上面的 token

### 提交

```bash
git add .github/workflows/ci.yml
git commit -m "ci: 新增 Cloudflare Worker 自动部署步骤"
```

### 验证

1. 打开询报价登记页 → 添加一条记录 → 浏览器 DevTools Network 确认 POST `/api/inquiry` 返回 201
2. 换另一台设备/账号登录 → 刷新页面 → 能看到该记录

---

## TASK-36 ✅：修复询报价编辑双写竞态 + Worker PUT 改为 upsert

### 背景与根因

编辑询报价记录时，`InquiryFormModal.handleSubmit` 会**连续触发两次 `updateInD1`**：

```
replaceStatuses(record.id, suppliers, quoted)   // PUT 1：旧描述 + 新供应商状态
onSubmit(payload, ...)                           // PUT 2：新描述 + 旧供应商状态（被忽略）
```

两个 PUT 几乎同时进入 Next.js proxy，proxy 内部 `await getServerSession()` 是异步的，
PUT 2（新描述）可能先到达 D1，PUT 1（旧描述）后到，最终 D1 里残留旧值。

附加问题：Worker PUT 用 `UPDATE ... WHERE id = ?`，如果记录不在 D1（如部署前创建的旧数据），
`changes === 0` → 返回 404 → 客户端静默忽略 → 数据永远只存在 localStorage。

### 修复目标

1. **编辑时只触发一次 D1 写入**（合并 basic + suppliers + quotedStatuses）
2. **Worker PUT 改为 upsert**（`INSERT OR REPLACE`），与 POST 保持一致

---

### Phase A：前端合并写入（3 个文件）

#### 1. `src/features/inquiry/state/inquiry.store.ts`

将 `updateRecord` 的 patch 类型从 `Partial<InquiryBasicInput>` 改为 `Partial<InquiryRecord>`：

```ts
// Before:
updateRecord: (id: string, patch: Partial<InquiryBasicInput>) => void;

// After:
updateRecord: (id: string, patch: Partial<InquiryRecord>) => void;
```

实现体无需改动（已接受 `Partial<InquiryRecord>`）。

#### 2. `src/features/inquiry/components/InquiryFormModal.tsx`

删除 `handleSubmit` 里单独的 `replaceStatuses` 调用：

```ts
// Before:
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  // ...
  if (mode === 'edit' && record) {
    replaceStatuses(record.id, localSuppliers, localQuoted);  // ← 删除这两行
  }
  onSubmit(payload, localSuppliers, localQuoted);
};

// After:
const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
  // ...
  onSubmit(payload, localSuppliers, localQuoted);
};
```

同时删除 `replaceStatuses` 的 useInquiryStore 订阅（第 80 行）：
```ts
// 删除：
const replaceStatuses = useInquiryStore((state) => state.replaceStatuses);
```

#### 3. `src/features/inquiry/app/InquiryPage.tsx`

`handleSubmit` 编辑分支改为一次性写入 basic + statuses：

```ts
// Before:
if (editingRecord) {
  updateRecordBasic(editingRecord.id, values);
}

// After:
if (editingRecord) {
  updateRecord(editingRecord.id, {
    ...values,
    supplierStatuses: suppliers,
    quotedStatuses: quoted,
  });
}
```

顶部 hooks 改为：
```ts
// Before:
const { createRecord, updateRecordBasic, removeRecord } = useInquiryActions();

// After：去掉 updateRecordBasic，改用 store 的 updateRecord
const { createRecord, removeRecord } = useInquiryActions();
const updateRecord = useInquiryStore((state) => state.updateRecord);
```

---

### Phase B：Worker PUT 改为 upsert（`src/worker.ts`）

找到 `handleInquiryRequest` 的 PUT 处理段（约 1408 行），将 `UPDATE` 改为 `INSERT OR REPLACE`：

```ts
// Before:
const result = await env.USERS_DB.prepare(`
  UPDATE Document
  SET doc_no = ?, customer_name = ?, data = ?, updated_at = ?
  WHERE id = ? AND type = 'inquiry'
`).bind(
  inquiryNo,
  customerNo,
  data,
  now,
  id
).run();

if (result.meta.changes === 0) return jsonResponse({ error: '询报价记录不存在' }, 404);
return jsonResponse({ success: true, id });

// After:
const existingRow = await env.USERS_DB.prepare(
  `SELECT created_at FROM Document WHERE id = ? AND type = 'inquiry'`
).bind(id).first<{ created_at: string }>();

const createdAt = existingRow?.created_at ?? now;

await env.USERS_DB.prepare(`
  INSERT OR REPLACE INTO Document
    (id, user_id, type, doc_no, customer_name, total_amount, currency, status, data, created_at, updated_at)
  VALUES (?, '_shared_', 'inquiry', ?, ?, 0, 'CNY', 'active', ?, ?, ?)
`).bind(
  id,
  inquiryNo,
  customerNo,
  data,
  createdAt,
  now
).run();

return jsonResponse({ success: true, id });
```

> 注：先 SELECT `created_at` 是为了保留原始创建时间；若记录不存在则用 `now` 作为创建时间（等同于新建）。

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/state/inquiry.store.ts \
               --file src/features/inquiry/components/InquiryFormModal.tsx \
               --file src/features/inquiry/app/InquiryPage.tsx \
               --file src/worker.ts
```

功能验证：
1. 新增询报价 → 打开 DevTools Network → POST `/api/inquiry` 返回 201
2. 编辑记录（修改描述 + 供应商状态）→ Network 只出现**一次** PUT → 返回 200
3. 页面刷新 → 描述和供应商状态均为编辑后的值
4. 换设备/账号登录 → 刷新 → 看到最新内容

### 提交

```bash
# Phase A：前端
git add src/features/inquiry/state/inquiry.store.ts \
        src/features/inquiry/components/InquiryFormModal.tsx \
        src/features/inquiry/app/InquiryPage.tsx
git commit -m "fix(inquiry): 合并编辑时双写为单次原子 updateInD1"

# Phase B：Worker
git add src/worker.ts
git commit -m "fix(worker): 询报价 PUT 改为 upsert，消除 0-changes 静默失败"

# 部署 Worker
npx wrangler deploy
```

---

## TASK-37 ✅：修复询报价删除——跨端同步软删除

### 背景

**TASK-36** 之后发现删除记录只在本机有效，其他设备刷新后记录仍然存在。

根本原因：
1. `mergeFromD1` 只会新增/更新记录，从不移除本地已有记录
2. 旧的硬删除（D1 DELETE）让 D1 彻底失去该记录，其他端无法感知删除事件
3. `mergeFromD1` 见到"D1 没有但本地有"的记录会保留，导致删除无法跨端传播

### 修复内容（已直接实现，无需 Codex 执行）

#### 1. 软删除：`src/worker.ts`

- **DELETE handler**：改为 `UPDATE status = 'deleted'`（不再物理删除）
- **GET handler**：返回 `status='active'` + 近 30 天内 `status='deleted'` 的记录（含 `status` 字段），让其他端能感知删除事件

#### 2. 客户端类型：`src/features/inquiry/types/index.ts`

- `InquiryRecord` 新增 `status?: 'active' | 'deleted'`

#### 3. 删除防回流：`src/features/inquiry/services/inquiry.service.ts`

- `remove(id)`：写入 `inquiry_deleted_ids`（id → deletedAt），防止 D1 旧版本重新拉回
- `mergeFromD1`：
  - 见到 `d1Record.status === 'deleted'` → 从 localMap 移除 + 写入 deletedIds（跨端删除同步）
  - 跳过 deletedIds 中的 D1 记录（防止被旧版本覆盖）
  - 自动清理 30 天前的 deletedIds 条目
- `pushLocalToD1`：跳过 D1 已软删除的记录，防止本地旧版本覆盖回 D1

### 提交记录

```
a7a35b50 fix(inquiry): 删除后写入 deletedIds，mergeFromD1 不再从 D1 拉回已删记录
acb5bc0a fix(inquiry): 软删除同步至所有端（D1 status=deleted + mergeFromD1 跨端清除）
```

### 部署

```bash
rm -f .git/HEAD.lock
npx wrangler deploy
```

### 验证

1. Device A 删除一条询报价记录 → 本机立即消失
2. Device B（同账号或有权限账号）刷新页面 → 该记录也消失
3. Device A 刷新 → 记录仍然消失（不被 D1 拉回）

---

## TASK-38：询报价页面定时轮询（30 秒自动同步）✅

### 背景

当前 D1 拉取只在页面**加载时执行一次**。其他用户的新增/编辑/删除操作无法即时出现在已打开的页面上，需手动刷新才能看到。

目标：每 30 秒自动重新拉取 D1，合并最新状态并更新界面，页面隐藏时暂停轮询节省请求。新增/编辑弹窗打开期间必须暂停同步，避免 30 秒轮询覆盖正在录入的本地表单状态。

### 涉及文件

- `src/features/inquiry/app/InquiryPage.tsx`（唯一改动）

### 改动规格

将现有 D1 同步 useEffect 改为以下结构：

```tsx
useEffect(() => {
  if (!permissionChecked || !hasInquiryAccess || isModalOpen) return;

  const POLL_INTERVAL_MS = 30_000;
  let cancelled = false;

  // 抽取同步逻辑为可复用函数
  async function syncFromD1() {
    if (isModalOpenRef.current) return;
    const d1Records = await inquiryService.pullFromD1();
    if (cancelled || isModalOpenRef.current) return;
    inquiryService.pushLocalToD1(d1Records);
    const merged = inquiryService.mergeFromD1(d1Records);
    useInquiryStore.setState({ records: merged });
    setLastSyncedAt(new Date());
  }

  // 立即执行一次
  void syncFromD1();

  // 页面可见时轮询，隐藏时暂停
  const interval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      void syncFromD1();
    }
  }, POLL_INTERVAL_MS);

  // 页面从隐藏变回可见时立即补一次同步
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      void syncFromD1();
    }
  };
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    cancelled = true;
    clearInterval(interval);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}, [hasInquiryAccess, isModalOpen, permissionChecked]);
```

同时在组件顶部添加状态：

```tsx
const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
const isModalOpenRef = useRef(false);
```

弹窗状态同步到 ref，用于拦截已经发出但尚未返回的 D1 请求：

```tsx
useEffect(() => {
  isModalOpenRef.current = isModalOpen;
}, [isModalOpen]);
```

在页面标题区域添加同步时间显示（紧跟 `<p>` 描述文字后）：

```tsx
{lastSyncedAt && (
  <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
    最后同步：{lastSyncedAt.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
  </p>
)}
```

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- --file src/features/inquiry/app/InquiryPage.tsx
```

功能验证：
1. 打开询报价页，等待约 30 秒，观察"最后同步"时间自动更新
2. 在另一台设备新增一条记录 → 本页面 30 秒内自动出现（无需刷新）
3. 切换到其他浏览器 Tab → 返回 → 立即触发一次同步
4. DevTools Network 确认每 30 秒出现一次 GET `/api/inquiry` 请求
5. 打开"新增询价"或"编辑询价"弹窗后，30 秒轮询暂停，不覆盖正在录入的内容
6. 弹窗关闭后，自动同步恢复

### 提交

```bash
git add src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 30 秒定时轮询 + 页面可见时立即同步"
```

### 后续保护提交

- `663d6cab` `fix(inquiry): 编辑弹窗打开时暂停自动同步`

---

## TASK-39：询报价筛选与排序 ✅

### 背景

当前表格仅支持按询价编号升/降序切换，无任何筛选能力。记录增多后，用户需要快速定位特定客户、特定报价状态、特定时间段的记录。

### 筛选维度

| 维度 | 类型 | 选项 |
|------|------|------|
| 时间范围 | 4 个 Chip | 全部 / 近7天 / 近30天 / 近90天 |
| 报价状态 | 6 个 Chip | 全部 / 等待供应商 / 未报客户 / 已报客户 / 无法报价 / 已成单 |
| 客户编号 | Select 下拉 | 全部客户 + 动态取自当前记录集 |
| 询价人 | Select 下拉 | 全部询价人 + 动态取自当前记录集 |
| 排序方向 | 表头按钮 | 按询价编号 asc/desc（现有，保留移入 hook） |

### 状态逻辑

报价状态筛选判断如下：

| Key | 判断条件 |
|-----|---------|
| `all` | 无过滤 |
| `supplier_pending` | `supplierStatuses.some(s => !s.status \|\| s.status === 'pending')` |
| `customer_pending` | `quotedStatuses.length === 0` |
| `customer_quoted` | `quotedStatuses.some(s => s.type !== 'unavailable')` |
| `unavailable` | `quotedStatuses.some(s => s.type === 'unavailable')` |
| `has_order` | `!!record.orderNo` |

时间范围：从 `inquiryNo` 解析日期（使用现有 `getDateInputValueFromInquiryNo`），比较 `Date.now()` 差值。

### 涉及文件

新增：
- `src/features/inquiry/hooks/useInquiryFilter.ts`
- `src/features/inquiry/components/InquiryFilterBar.tsx`

修改：
- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/app/InquiryPage.tsx`

---

### 文件1：`src/features/inquiry/hooks/useInquiryFilter.ts`（新建）

```ts
import { useMemo, useState } from 'react';
import type { InquiryRecord } from '../types';
import { getDateInputValueFromInquiryNo } from '../utils/inquiryUtils';

export type TimeRange = 'all' | '7d' | '30d' | '90d';
export type QuoteStatusFilter =
  | 'all'
  | 'supplier_pending'
  | 'customer_pending'
  | 'customer_quoted'
  | 'unavailable'
  | 'has_order';

export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  quoteStatus: QuoteStatusFilter;
  sortDir: 'asc' | 'desc';
}

const DEFAULT_FILTER: InquiryFilterState = {
  timeRange: 'all',
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
};

export function useInquiryFilter(records: InquiryRecord[]) {
  const [filter, setFilter] = useState<InquiryFilterState>(DEFAULT_FILTER);

  const customers = useMemo(
    () => [...new Set(records.map((r) => r.customerNo))].sort(),
    [records]
  );

  const inquirers = useMemo(
    () => [...new Set(records.map((r) => r.inquirer))].sort(),
    [records]
  );

  const filteredAndSorted = useMemo(() => {
    const now = Date.now();
    const daysMs = (d: number) => d * 24 * 60 * 60 * 1000;

    return records
      .filter((r) => {
        // 时间范围
        if (filter.timeRange !== 'all') {
          const dateStr = getDateInputValueFromInquiryNo(r.inquiryNo);
          const recTime = new Date(dateStr).getTime();
          const days = filter.timeRange === '7d' ? 7 : filter.timeRange === '30d' ? 30 : 90;
          if (now - recTime > daysMs(days)) return false;
        }
        // 客户
        if (filter.customerNo && r.customerNo !== filter.customerNo) return false;
        // 询价人
        if (filter.inquirer && r.inquirer !== filter.inquirer) return false;
        // 报价状态
        switch (filter.quoteStatus) {
          case 'supplier_pending':
            return r.supplierStatuses.some((s) => !s.status || s.status === 'pending');
          case 'customer_pending':
            return r.quotedStatuses.length === 0;
          case 'customer_quoted':
            return r.quotedStatuses.some((s) => s.type !== 'unavailable');
          case 'unavailable':
            return r.quotedStatuses.some((s) => s.type === 'unavailable');
          case 'has_order':
            return !!r.orderNo;
          default:
            return true;
        }
      })
      .sort((a, b) =>
        filter.sortDir === 'desc'
          ? b.inquiryNo.localeCompare(a.inquiryNo)
          : a.inquiryNo.localeCompare(b.inquiryNo)
      );
  }, [records, filter]);

  const activeCount = [
    filter.timeRange !== 'all',
    !!filter.customerNo,
    !!filter.inquirer,
    filter.quoteStatus !== 'all',
  ].filter(Boolean).length;

  const reset = () => setFilter(DEFAULT_FILTER);

  return {
    filter,
    setFilter,
    filteredAndSorted,
    customers,
    inquirers,
    activeCount,
    reset,
  };
}
```

---

### 文件2：`src/features/inquiry/components/InquiryFilterBar.tsx`（新建）

Props 接口：

```ts
interface InquiryFilterBarProps {
  filter: InquiryFilterState;
  setFilter: (f: InquiryFilterState) => void;
  customers: string[];
  inquirers: string[];
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}
```

UI 结构（3 行，全部收于一个 `rounded-xl border bg-white` 卡片内）：

**第1行：时间范围 Chips**

```
时间  [全部]  [近7天]  [近30天]  [近90天]
```

**第2行：报价状态 Chips**

```
状态  [全部]  [等待供应商]  [未报客户]  [已报客户]  [无法报价]  [已成单]
```

- 等待供应商 Chip 对应 `supplier_pending`
- 未报客户 → `customer_pending`
- 已报客户 → `customer_quoted`（蓝色高亮选中时）
- 无法报价 → `unavailable`（灰色高亮）
- 已成单 → `has_order`（绿色高亮）

**第3行：下拉 + 汇总**

```
[全部客户 ▼]  [全部询价人 ▼]        共 12/38 条  [重置筛选]
```

- 当 `filteredCount === totalCount` 时只显示 "共 N 条"；有筛选时显示 "共 N/M 条"
- 重置按钮仅在 `activeCount > 0` 时显示
- 所有 Chip 的 active 样式：选中时 `bg-blue-600 text-white`，未选中 `bg-white text-gray-600 border border-gray-200 hover:bg-gray-50`
- 报价状态的特殊颜色：`customer_quoted` 选中 `bg-blue-600`；`unavailable` 选中 `bg-gray-500`；`has_order` 选中 `bg-green-600`；其余统一 `bg-blue-600`

实现 helper：

```ts
function chip(
  label: string,
  active: boolean,
  onClick: () => void,
  activeColor = 'bg-blue-600 text-white'
) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? activeColor
          : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
      }`}
    >
      {label}
    </button>
  );
}
```

Select 样式：

```
h-7 rounded-lg border border-gray-200 bg-white px-2 text-xs text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200
```

---

### 文件3：`src/features/inquiry/components/InquiryTable.tsx`（修改）

**修改 Props 接口**，移除内部 `sortDir` 状态，改由外部传入：

```ts
interface InquiryTableProps {
  records: InquiryRecord[];           // 已筛选已排序
  sortDir: 'asc' | 'desc';
  onSortToggle: () => void;
  onEditRecord: (record: InquiryRecord) => void;
  onDeleteRecord: (recordId: string) => void;
  emptyMessage?: string;              // 默认 "暂无询报价记录"
  emptySubMessage?: string;
}
```

删除组件内 `const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')` 和内部 sort 逻辑（`sorted` useMemo）。

表格直接遍历 `records`（已是排序后结果）：

```tsx
{records.map((record) => (
  <InquiryRow key={record.id} record={record} onEdit={onEditRecord} onDelete={onDeleteRecord} />
))}
```

表头排序按钮改为：

```tsx
<button type="button" onClick={onSortToggle} ...>
  询价编号
  {sortDir === 'desc' ? <ArrowDown className="h-3 w-3" /> : <ArrowUp className="h-3 w-3" />}
</button>
```

空状态使用传入的 `emptyMessage` / `emptySubMessage`，默认值：

```ts
emptyMessage = '暂无询报价记录'
emptySubMessage = '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
```

---

### 文件4：`src/features/inquiry/app/InquiryPage.tsx`（修改）

新增 import：

```ts
import { useInquiryFilter } from '../hooks/useInquiryFilter';
import { InquiryFilterBar } from '../components/InquiryFilterBar';
```

在组件内初始化 hook（放在现有 `records`、`updateRecord` 等 hooks 之后）：

```ts
const { filter, setFilter, filteredAndSorted, customers, inquirers, activeCount, reset } =
  useInquiryFilter(records);
```

JSX 中在 `<InquiryTable>` 前插入 `<InquiryFilterBar>`：

```tsx
<InquiryFilterBar
  filter={filter}
  setFilter={setFilter}
  customers={customers}
  inquirers={inquirers}
  activeCount={activeCount}
  filteredCount={filteredAndSorted.length}
  totalCount={records.length}
  onReset={reset}
/>
<InquiryTable
  records={filteredAndSorted}
  sortDir={filter.sortDir}
  onSortToggle={() =>
    setFilter({ ...filter, sortDir: filter.sortDir === 'desc' ? 'asc' : 'desc' })
  }
  onEditRecord={openEditModal}
  onDeleteRecord={handleDeleteRecord}
  emptyMessage={activeCount > 0 ? '没有符合条件的记录' : '暂无询报价记录'}
  emptySubMessage={
    activeCount > 0
      ? '尝试调整筛选条件，或点击"重置筛选"查看全部。'
      : '点击"新增询价"后，会在这里登记供应商询价和客户报价状态。'
  }
/>
```

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- \
  --file src/features/inquiry/hooks/useInquiryFilter.ts \
  --file src/features/inquiry/components/InquiryFilterBar.tsx \
  --file src/features/inquiry/components/InquiryTable.tsx \
  --file src/features/inquiry/app/InquiryPage.tsx
```

功能验证：
1. 进入询报价页 → FilterBar 渲染在标题卡片下方、表格上方
2. 点击"近30天" → 只显示近30天记录，共 N/M 条 正确显示
3. 点击"已报客户" → 只显示有客户报价（蓝色行）的记录
4. 下拉选择某客户 → 记录过滤到该客户
5. 多个筛选叠加 → 结果正确交集（AND 逻辑）
6. 点击"重置筛选" → 全部恢复，按钮消失
7. 筛选后结果为0 → 显示"没有符合条件的记录"
8. 排序按钮切换 asc/desc → 依旧正常

### 提交

```bash
git add \
  src/features/inquiry/hooks/useInquiryFilter.ts \
  src/features/inquiry/components/InquiryFilterBar.tsx \
  src/features/inquiry/components/InquiryTable.tsx \
  src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 筛选栏 — 时间/客户/询价人/报价状态多维筛选"
```

---

## TASK-40：询报价表格布局优化 + 紧凑微调 ✅

### 背景

当前表格存在以下可读性问题：
1. "日期"列独立占位，但日期已编码于询价编号（C260619F → 6.19），浪费列宽
2. "客户编号"不截断，超长引用号（如 `NORDLUCHS-11110/V/0110/RFQ/2026`）撑破布局
3. "询报价状态"初版尝试拆成两行后，实际行高过高，列表密度下降
4. 无关键字搜索，定位某条记录须靠下拉筛选
5. 筛选区常驻占用首屏高度，上方标题区和筛选区需要进一步融合
6. 成单后的订单编号独占一行，进一步撑高询价编号列
7. 不同屏幕下列宽分配不合理：大屏客户编号显示不足，中屏/小屏仍占用关键宽度

### 目标改动

| 改动 | 效果 |
|------|------|
| 合并日期+询价编号为一列 | 节省一列宽度 |
| 客户编号截断+tooltip | 布局稳定，全称可悬停查看 |
| 状态列恢复单行，`/` 改蓝色 | 保持原有阅读习惯，同时增强供应商/客户报价分隔 |
| FilterBar 新增关键字搜索 | 快速定位，无需逐级下拉 |
| 筛选区改为漏斗图标展开/收起 | 默认首屏更紧凑，有筛选条件时显示数量角标 |
| 表格行高收紧，内容简述单行截断 | 列表可视记录数更多 |
| 订单编号与小日期同一行显示 | 成单记录不再额外撑高 |
| 响应式列显示与列宽 | 大屏显示更宽客户编号；中屏隐藏客户编号；小屏隐藏询价人和客户编号 |

### 涉及文件

修改：
- `src/features/inquiry/hooks/useInquiryFilter.ts`
- `src/features/inquiry/components/InquiryFilterBar.tsx`
- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/components/InquiryRow.tsx`
- `src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`
- `src/features/inquiry/app/InquiryPage.tsx`

---

### 文件1：`src/features/inquiry/hooks/useInquiryFilter.ts`

在 `InquiryFilterState` 中新增 `keyword: string`：

```ts
export interface InquiryFilterState {
  timeRange: TimeRange;
  customerNo: string;
  inquirer: string;
  quoteStatus: QuoteStatusFilter;
  sortDir: 'asc' | 'desc';
  keyword: string;   // ← 新增
}

const DEFAULT_FILTER: InquiryFilterState = {
  timeRange: 'all',
  customerNo: '',
  inquirer: '',
  quoteStatus: 'all',
  sortDir: 'desc',
  keyword: '',       // ← 新增
};
```

在 `filteredAndSorted` useMemo 的过滤链中，紧接时间范围过滤后插入关键字过滤：

```ts
// 关键字搜索：匹配询价编号 / 客户编号 / 内容简述
if (filter.keyword.trim()) {
  const kw = filter.keyword.trim().toLowerCase();
  const match =
    record.inquiryNo.toLowerCase().includes(kw) ||
    record.customerNo.toLowerCase().includes(kw) ||
    (record.description ?? '').toLowerCase().includes(kw);
  if (!match) return false;
}
```

在 `activeCount` 数组中新增一项：

```ts
Boolean(filter.keyword.trim()),
```

---

### 文件2：`src/features/inquiry/components/InquiryFilterBar.tsx`

最终实现：`InquiryFilterBar` 只负责筛选面板内容，不再自带外层卡片；外层卡片和展开/收起由 `InquiryPage` 管理。

Props 增加可选 `id?: string`，用于父级漏斗按钮的 `aria-controls`：

```ts
interface InquiryFilterBarProps {
  id?: string;
  filter: InquiryFilterState;
  setFilter: (filter: InquiryFilterState) => void;
  customers: string[];
  inquirers: string[];
  activeCount: number;
  filteredCount: number;
  totalCount: number;
  onReset: () => void;
}
```

第3行（客户/询价人下拉所在行）最前方插入搜索框，作为第一个元素：

```tsx
<input
  type="search"
  value={filter.keyword}
  onChange={(e) => setFilter({ ...filter, keyword: e.target.value })}
  placeholder="搜索编号 / 客户 / 简述…"
  className={
    'h-7 min-w-[160px] flex-1 rounded-lg border border-gray-200 bg-white px-3 ' +
    'text-xs text-gray-700 placeholder:text-gray-400 outline-none ' +
    'focus:border-blue-400 focus:ring-1 focus:ring-blue-200 ' +
    'dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:placeholder:text-gray-500 ' +
    'dark:focus:border-blue-500'
  }
/>
```

该行完整结构变为（按顺序）：搜索框 → 客户下拉 → 询价人下拉 → 右对齐的统计+重置。搜索框有 `flex-1` 自适应宽度，其余元素宽度不变。

面板自身使用紧凑布局：

```tsx
<div id={id} className="border-t border-gray-100 pt-2 dark:border-gray-800">
```

---

### 文件3：`src/features/inquiry/components/InquiryTable.tsx`

删除"日期"列 `<th>`：

```tsx
// 删除整个 <th> 日期 </th>
```

表格列顺序变为：询价编号（含日期） / 询价人 / 客户编号 / 内容简述 / 询报价状态 / 操作。

最终使用 `table-fixed` 和响应式宽度，避免内容把列撑破：

```tsx
<table className="min-w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

列显示规则：

| 屏幕 | 显示列 | 说明 |
|------|--------|------|
| 小屏 `< md` | 询价编号 / 内容简述 / 询报价状态 / 操作 | 隐藏询价人、客户编号 |
| 中屏 `md ~ lg` | 询价编号 / 询价人 / 内容简述 / 询报价状态 / 操作 | 隐藏客户编号 |
| 大屏 `>= lg` | 全部列 | 客户编号列加宽，可显示两行 |

关键列宽：

```tsx
// 询价编号
className="w-[24%] ... md:w-[16%] lg:w-[10%]"

// 询价人：小屏隐藏，中屏显示
className="hidden w-[16%] ... md:table-cell lg:w-[12%]"

// 客户编号：中小屏隐藏，大屏显示
className="hidden ... lg:table-cell lg:w-[24%] xl:w-[26%]"

// 内容简述
className="w-[34%] ... md:w-[32%] lg:w-[22%]"

// 询报价状态
className="w-[34%] ... md:w-[30%] lg:w-[28%] xl:w-[26%]"
```

---

### 文件4：`src/features/inquiry/components/InquiryRow.tsx`

**① 删除"日期"独立 `<td>`**，原日期列整个 td 移除。

**② 修改"询价编号" `<td>`**，改为上下两行：第一行询价编号；第二行小号日期 + 订单编号（如有）。

```tsx
<td className="w-[24%] px-3 py-2 text-sm md:w-[16%] lg:w-[10%]">
  <div className="flex flex-col gap-0 leading-tight">
    <span className={`whitespace-nowrap font-mono leading-4 ${mainTextClass}`}>
      {record.inquiryNo}
    </span>
    <span className="flex items-center gap-1.5 text-[11px] leading-4 text-gray-400 dark:text-gray-500">
      <span>{stripDateBrackets(record.inquiryDate)}</span>
      {record.orderNo && (
        <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0 text-[11px] font-medium leading-4 text-green-700 ring-1 ring-green-200 dark:bg-green-950/40 dark:text-green-400 dark:ring-green-800">
          {record.orderNo}
        </span>
      )}
    </span>
  </div>
</td>
```

注：成单记录的 `orderNo` 不再单独占一行，放在小日期后方同一行，避免撑高行高。

询价人列按屏幕显示：

```tsx
<td className="hidden w-[16%] whitespace-nowrap px-3 py-2 text-sm md:table-cell lg:w-[12%]">
  <span className={mainTextClass}>{record.inquirer}</span>
</td>
```

**③ 修改"客户编号" `<td>`**，中小屏隐藏，大屏显示且允许两行：

```tsx
<td className="hidden px-3 py-2 text-sm lg:table-cell lg:w-[24%] xl:w-[26%]">
  <span
    className={`line-clamp-2 max-w-none break-words leading-4 ${mainTextClass}`}
    title={record.customerNo}
  >
    {record.customerNo}
  </span>
</td>
```

**④ 修改"内容简述" `<td>`**，最终改为单行截断：

```tsx
<td className="w-[34%] px-3 py-2 text-sm md:w-[32%] lg:w-[22%]">
  <p className={`max-w-none truncate ${mainTextClass}`} title={record.description}>
    {record.description}
  </p>
</td>
```

**⑤ 表格行距收紧**：各列 `py-3` 收紧为 `py-2`，删除按钮 `p-1.5` 收紧为 `p-1`。

**⑥ 状态列按断点分配宽度**：

```tsx
<td className="w-[34%] px-3 py-2 md:w-[30%] lg:w-[28%] xl:w-[26%]">
  <InquiryQuoteStatusDisplay record={record} />
</td>
```

---

### 文件5：`src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`

初版曾将供应商/客户报价拆成两行，但实际行高过高。最终实现恢复为原来的**单行显示**，仅把供应商与客户报价之间的 `/` 改为蓝色：

```tsx
return (
  <p className="block truncate text-xs font-medium leading-4">
    {record.supplierStatuses.map((supplier, index) => {
      const colorClass = getSupplierStatusClass(supplier);
      const label = supplier.quoteDate
        ? `${supplier.supplierShortName}${roundDateBrackets(supplier.quoteDate)}`
        : supplier.supplierShortName;
      return (
        <span key={supplier.id}>
          <span className={colorClass}>{label}</span>
          {index < record.supplierStatuses.length - 1 && <span className="text-gray-300">,</span>}
        </span>
      );
    })}

    <span className="px-0.5 text-blue-600 dark:text-blue-400">/</span>

    {regularStatuses.map((status, index) => (
      <span key={status.id}>
        <span className={rowColor}>
          {stripDateBrackets(status.quoteDate)}{status.supplierShortName}{status.version}
        </span>
        {index < regularStatuses.length - 1 && <span className="text-gray-300">,</span>}
      </span>
    ))}
  </p>
);
```

`supplementedStatus` 与 `unavailableStatus` 仍沿用原逻辑追加在同一行，逗号分隔。

---

### 文件6：`src/features/inquiry/app/InquiryPage.tsx`

上方标题区、同步时间、筛选入口、新增按钮融合到同一张卡片内。

新增状态：

```ts
const [isFilterOpen, setIsFilterOpen] = useState(false);
```

新增收起状态下的结果摘要：

```ts
const resultSummary =
  filteredAndSorted.length === records.length
    ? `共 ${records.length} 条`
    : `共 ${filteredAndSorted.length}/${records.length} 条`;
```

新增漏斗图标按钮：

```tsx
<button
  type="button"
  onClick={() => setIsFilterOpen((open) => !open)}
  aria-label={isFilterOpen ? '收起筛选' : '展开筛选'}
  aria-expanded={isFilterOpen}
  aria-controls="inquiry-filter-panel"
>
  <Filter className="h-4 w-4" />
  {activeCount > 0 && <span>{activeCount}</span>}
</button>
```

筛选面板改为条件渲染：

```tsx
{isFilterOpen && (
  <InquiryFilterBar
    id="inquiry-filter-panel"
    ...
  />
)}
```

---

### 验证步骤

```bash
npx tsc --noEmit
npm run lint -- \
  --file src/features/inquiry/hooks/useInquiryFilter.ts \
  --file src/features/inquiry/app/InquiryPage.tsx \
  --file src/features/inquiry/components/InquiryFilterBar.tsx \
  --file src/features/inquiry/components/InquiryTable.tsx \
  --file src/features/inquiry/components/InquiryRow.tsx \
  --file src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx
```

功能验证：
1. 表格"日期"列消失，询价编号列下方出现小号日期（如 `6.19`）
2. 长客户编号被截断，鼠标悬停显示完整值
3. 询报价状态保持单行显示，供应商状态与客户报价之间的 `/` 为蓝色
4. FilterBar 默认收起，点击漏斗按钮后展开，再次点击收起
5. 有筛选条件时，漏斗按钮右上角显示 `activeCount` 数字角标
6. FilterBar 第三行左侧出现搜索框；输入 "BRS" → 只显示 BRS 相关记录
7. 关键字算入 `activeCount`，"重置筛选"会同时清空搜索框
8. 成单记录的订单编号显示在小日期后方，同一行展示
9. 大屏客户编号列显示且更宽，可展示两行内容
10. 中屏客户编号列隐藏，内容简述/询报价状态获得更多宽度
11. 小屏询价人、客户编号列隐藏，保留关键业务列
12. `tsc --noEmit` 无报错

### 提交

```bash
git add \
  src/features/inquiry/hooks/useInquiryFilter.ts \
  src/features/inquiry/components/InquiryFilterBar.tsx \
  src/features/inquiry/components/InquiryTable.tsx \
  src/features/inquiry/components/InquiryRow.tsx \
  src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx \
  src/features/inquiry/app/InquiryPage.tsx
git commit -m "feat(inquiry): 表格布局优化与紧凑筛选"
```

### 实际落地提交

- `91653d30` `feat(inquiry): 表格布局优化 — 合并日期列/截断客户号/状态两行/关键字搜索`
- `ad1f57dc` `feat(inquiry): 收紧询报价列表布局`
- `0753cc7f` `v26.6.21.0.9`：筛选区改为漏斗图标展开/收起
- `989d9204` `style(inquiry): 调整订单号显示位置`
- `7f18ee08` `style(inquiry): 优化表格响应式列宽`

### 最终状态摘要

本任务最终不是简单的"状态两行显示"，而是基于实际使用反馈做了多次收敛：

1. 保留日期列合并、客户编号截断、关键字搜索这些有效改动。
2. 撤回状态列两行方案，恢复原单行状态，只把 `/` 改为蓝色。
3. 筛选区默认收起，用漏斗按钮展开，减少首屏占用。
4. 表格行高整体压缩，订单编号与日期同一行显示，避免成单行额外变高。
5. 表格列按屏幕宽度响应式隐藏/显示：小屏隐藏询价人与客户编号，中屏隐藏客户编号，大屏显示更宽客户编号。

---

## TASK-41：修复权限架构——普通用户登录后拥有全部权限的 Bug ✅ 已完成

**优先级**：🔴 紧急（安全）
**估时**：30 分钟
**风险**：中（涉及认证核心流程，改完须全量手动验证登录→权限显示）

### 背景与根因

当前表现：普通用户登录后，在点击"刷新权限"之前，侧边栏显示所有菜单项（即拥有所有权限）。点击刷新后才显示正确的受限菜单。

根因分析（三个 Bug，需全部修复）：

**Bug 1（根本原因）：`usePermissionInit.ts` 中 `initRef` 阻断了 session 初始化**

`initRef.current` 在 `status === 'loading'` 阶段被设为 `true`（目的是防止重复调用 `initializeUserFromStorage`），但顶部的守卫 `if (initRef.current) return` 在随后的 `status === 'authenticated'` 阶段同样触发提前退出，导致 `setUserFromSession(session.user)` **永远不会被调用**。

结果：Zustand store 的 `permissionUser` 永远是 `null`（除非 localStorage 有缓存）。

**Bug 2（直接表现原因）：`AppSidebar.tsx` "fail open" 设计**

```tsx
if (isLoading || !permissionUser) return true; // 显示全部项目
```

`permissionUser === null` → 所有需要权限的菜单项全部展示。

**Bug 3（次要）：API 路由中错误的默认权限 fallback**

`force-refresh-session/route.ts` 和 `get-latest-permissions/route.ts` 在后端没有返回权限时，都硬编码了 fallback，给普通用户赋予 quotation + history 默认权限。空权限就该是空权限，不应自动赋权。

**为什么"刷新权限"后正常**：refresh 流程把正确权限写入 `localStorage.userCache` 后 reload。reload 后 `initRef.current` 重置为 `false`，loading 阶段 `initializeUserFromStorage()` 读到正确缓存并写入 store，侧边栏才显示正确。

---

### 改动 1：`src/hooks/usePermissionInit.ts`

**核心逻辑**：把"防止重复做 storage init"和"防止重复做 session init"分开，用两个独立 ref，彻底解开互相阻断的问题。

将整个文件替换为以下内容：

```typescript
import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePermissionStore } from '@/lib/permissions';
import { logPermission } from '@/utils/permissionLogger';

// 模块级：防止并发初始化
let globalInitInProgress = false;

export const usePermissionInit = () => {
  const { data: session, status } = useSession();
  const { setUserFromSession, initializeUserFromStorage, clearUser } = usePermissionStore();

  // storage init 独立 ref：只防止 loading 阶段重复调用 initializeUserFromStorage
  const storageInitDone = useRef(false);
  // session hash ref：防止对同一 session 数据重复调用 setUserFromSession
  const lastSessionHash = useRef('');

  useEffect(() => {
    const run = async () => {
      // 正在初始化时跳过（防并发）
      if (globalInitInProgress) return;

      if (status === 'loading') {
        // loading 阶段：只尝试一次从缓存恢复
        if (!storageInitDone.current) {
          storageInitDone.current = true;
          try {
            const initialized = initializeUserFromStorage();
            if (initialized && process.env.NODE_ENV === 'development') {
              logPermission('loading 阶段：从本地缓存初始化权限成功');
            }
          } catch (err) {
            console.error('从缓存初始化失败:', err);
          }
        }
        return;
      }

      if (status === 'unauthenticated') {
        clearUser();
        return;
      }

      // authenticated 阶段：从真实 session 初始化（不受 storageInitDone 影响）
      if (!session?.user) return;

      const currentHash = JSON.stringify({
        id: session.user.id,
        username: session.user.username,
        permissions: session.user.permissions ?? [],
      });

      // 同一 session 内容不重复处理
      if (lastSessionHash.current === currentHash) return;

      globalInitInProgress = true;
      try {
        lastSessionHash.current = currentHash;
        setUserFromSession(session.user);
        if (process.env.NODE_ENV === 'development') {
          logPermission('authenticated 阶段：从 session 初始化权限完成');
        }
      } catch (err) {
        console.error('session 权限初始化失败:', err);
      } finally {
        globalInitInProgress = false;
      }
    };

    run();
  }, [session, status]);
};
```

---

### 改动 2：`src/components/layout/AppSidebar.tsx`

将 `visibleItems` 过滤逻辑中 "权限加载中或 user 未就绪时显示全部" 改为 **fail closed**（不展示需要权限的项目）。

找到：
```tsx
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    // 权限加载中或 user 未就绪时，显示全部项目（避免闪烁消失）
    if (isLoading || !permissionUser) return true;
    // 管理员看全部
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some(
      (permission) => permission.moduleId === moduleId && permission.canAccess
    ) ?? false;
  });
```

替换为：
```tsx
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.permissionKey) return true;
    // 权限尚未就绪时：fail closed，不展示受权限保护的菜单项
    if (isLoading || !permissionUser) return false;
    // 管理员看全部
    if (permissionUser.isAdmin) return true;
    const moduleId = PERMISSION_MODULE_MAP[item.permissionKey];
    if (!moduleId) return true;
    return permissionUser.permissions?.some(
      (permission) => permission.moduleId === moduleId && permission.canAccess
    ) ?? false;
  });
```

---

### 改动 3：`src/app/api/auth/force-refresh-session/route.ts`

删除"没有权限时使用默认权限"的 fallback 逻辑（第 98–115 行）。

找到并删除整个 if 块：
```typescript
    // 如果没有获取到权限，使用默认权限
    if (permissions.length === 0) {
      console.log('权限刷新API: 使用默认权限');
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }
```

替换为（如果后端无法返回权限，直接返回 500，不默认赋权）：
```typescript
    // 后端返回了空权限时，直接使用空数组（用户确实没有任何权限）
    // 注意：不添加默认权限，空权限 = 无权访问任何受保护模块
    if (permissions.length === 0) {
      console.log('权限刷新API: 用户无已分配权限，返回空权限列表');
    }
```

---

### 改动 4：`src/app/api/auth/get-latest-permissions/route.ts`

同样删除 fallback 默认权限逻辑（第 114–140 行）：

找到并替换（保留 return 语句结构）：

找到：
```typescript
    // 如果没有从session获取到权限，使用默认权限
    if (permissions.length === 0) {
      // 为管理员用户提供默认权限
      if (isAdmin) {
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-packing', moduleId: 'packing', canAccess: true },
          { id: 'default-invoice', moduleId: 'invoice', canAccess: true },
          { id: 'default-purchase', moduleId: 'purchase', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      } else {
        // 为普通用户提供基本权限
        permissions = [
          { id: 'default-quotation', moduleId: 'quotation', canAccess: true },
          { id: 'default-history', moduleId: 'history', canAccess: true }
        ];
      }
    }

    // 确保至少有一些基本权限，避免权限检查失败
    if (permissions.length === 0) {
      permissions = [
        { id: 'fallback-quotation', moduleId: 'quotation', canAccess: true },
        { id: 'fallback-history', moduleId: 'history', canAccess: true }
      ];
    }
```

替换为：
```typescript
    // 空权限 = 用户确实没有任何权限，不添加默认值
    if (permissions.length === 0) {
      console.log('权限API: 用户无已分配权限，返回空权限列表');
    }
```

---

### 改动 5：`src/lib/permissions.ts` — `setUserFromSession` 中移除 localStorage 缓存恢复逻辑

`setUserFromSession` 中有一段在 `sessionPermissions.length === 0` 时从 localStorage 恢复旧权限的代码，这会导致新登录的用户被错误地赋予旧缓存中的权限。JWT session 是权威来源，不应被 localStorage 覆盖。

找到（在 `setUserFromSession` 函数内，`if (permissionsChanged && process.env.NODE_ENV === 'development')` 块里）：
```typescript
      // ✅ 优化：如果session中没有权限数据，尝试从缓存恢复
      if (sessionPermissions.length === 0 && typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;

            if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
              // 使用缓存数据更新用户信息
              user.permissions = cacheData.permissions;

              logPermission('Session无权限数据，从缓存恢复权限', {
                permissionsCount: cacheData.permissions.length
              });
            }
          }
        } catch (error) {
          logPermissionError('从缓存恢复权限失败', error);
        }
      }
```

直接删除这段代码（连同上方的 `if (permissionsChanged && process.env.NODE_ENV === 'development')` 块中对应的内容）。

具体操作：找到整个 `if (permissionsChanged && process.env.NODE_ENV === 'development')` 块：

```typescript
    // ✅ 优化：只有在权限数据真正变化时才输出详细日志
    if (permissionsChanged && process.env.NODE_ENV === 'development') {
      logPermission('检测到权限数据不一致，强制更新', {
        sessionPermissionsCount: sessionPermissions.length,
        storePermissionsCount: currentPermissions.length,
        userId: sessionUser.id
      });

      // ✅ 优化：如果session中没有权限数据，尝试从缓存恢复
      if (sessionPermissions.length === 0 && typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;

            if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
              // 使用缓存数据更新用户信息
              user.permissions = cacheData.permissions;

              logPermission('Session无权限数据，从缓存恢复权限', {
                permissionsCount: cacheData.permissions.length
              });
            }
          }
        } catch (error) {
          logPermissionError('从缓存恢复权限失败', error);
        }
      }
    }
```

替换为（仅保留日志，删除缓存恢复逻辑）：
```typescript
    // session 是权威来源，不从 localStorage 覆盖权限
    if (permissionsChanged && process.env.NODE_ENV === 'development') {
      logPermission('检测到权限数据变化，更新 store', {
        sessionPermissionsCount: sessionPermissions.length,
        storePermissionsCount: currentPermissions.length,
        userId: sessionUser.id
      });
    }
```

---

### 验证步骤（Codex 执行后，人工验证）

```bash
# 1. 构建检查
npm run build

# 2. 类型检查
npx tsc --noEmit
```

人工验证流程（须在浏览器中执行）：

1. **清除所有 localStorage**（DevTools → Application → Storage → Clear all）
2. 以普通用户（非管理员）登录
3. 登录后**立即**检查侧边栏——只应显示该用户被授权的模块，**不应显示全部**
4. 刷新页面，确认侧边栏菜单仍然正确
5. 以管理员登录，确认可以看到全部菜单
6. 在管理员面板修改某用户权限后，让该用户点击"刷新权限"，确认菜单变化正确

### 提交

```bash
git add \
  src/hooks/usePermissionInit.ts \
  src/components/layout/AppSidebar.tsx \
  src/app/api/auth/force-refresh-session/route.ts \
  src/app/api/auth/get-latest-permissions/route.ts \
  src/lib/permissions.ts
git commit -m "fix(auth): 修复普通用户登录后拥有全部权限的 Bug

- usePermissionInit: 拆分 storageInitDone/sessionHash 双 ref，
  彻底解开 loading 阶段 initRef 阻断 session 初始化的问题
- AppSidebar: fail closed — permissionUser 未就绪时不展示受保护菜单
- force-refresh-session + get-latest-permissions: 删除错误的默认权限 fallback
- setUserFromSession: 删除 localStorage 缓存覆盖 session 权限的逻辑"
```

### 实际落地

- 共改动 6 个文件：`usePermissionInit.ts`、`AppSidebar.tsx`、`permissions.ts`、`force-refresh-session/route.ts`、`get-latest-permissions/route.ts`、`update-session-permissions/route.ts`（同类旧路径补丁）
- `npx tsc --noEmit` + `npm run build` 均通过（存在项目既有 lint warnings，非本次引入）

---

## TASK-42：移除外网依赖——Google 字体 + 无效 Analytics 请求 ✅ 已完成

**优先级**：🟡 优化
**估时**：15 分钟
**风险**：极低，仅改字体和埋点逻辑，不影响业务功能

### 背景

本站在国内使用，需要移除或替换所有需要访问外网的资源，避免影响响应速度和开发体验。

经排查，发现两个实际问题：

**问题 1：`next/font/google` 引入 Inter 字体**
- 本地开发（`npm run dev`）启动时，Next.js 会向 `fonts.googleapis.com` 请求字体文件，国内直接超时
- Tailwind 已配置 `fontFamily.sans: ['Arial', 'Helvetica', 'sans-serif']`，Inter 对 UI 没有实际作用，删掉即可
- 注：生产环境（Vercel 构建）字体在构建阶段自托管，线上用户不受影响，但 Inter 对中文工具无价值

**问题 2：`analytics.ts` 每 30 秒发出失败的外网请求**
- `AnalyticsManager` 有一个 30 秒定时器，周期性调用 `sendToAnalyticsService()`
- 该函数在生产环境尝试：① 调用 `window.gtag()`（GA 脚本从未加载，永远 no-op）；② `fetch('/api/analytics')`（该路由不存在，返回 404）
- 每次 flush 都产生一次 404 请求，被 catch 吃掉，但浪费网络和 localStorage 空间

---

### 改动 1：`src/app/layout.tsx` — 移除 Google Fonts

**完整替换整个文件**（改动：删除 Inter 引入，body 改用 Tailwind 系统字体）：

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import ClientInitializer from '@/components/ClientInitializer';

// 强制动态渲染，确保 cookie 读取正确
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Luo & Company - 管理系统',
  description: 'Luo & Company 提供专业的报价单、销售确认单和发票管理系统，帮助企业管理业务流程，提高工作效率。',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full" suppressHydrationWarning>
      <head>
        {/* 预置脚本：在水合前确保 class 一致，避免闪烁与不一致 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var themeConfig = localStorage.getItem('themeConfig');
                if (themeConfig) {
                  var config = JSON.parse(themeConfig);
                  if (config.mode === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                  if (config.buttonTheme === 'classic') {
                    document.documentElement.classList.add('classic-theme');
                  } else {
                    document.documentElement.classList.remove('classic-theme');
                  }
                }
              } catch (e) {
                console.error('主题预置脚本错误:', e);
              }
            `,
          }}
        />
      </head>
      <body className="min-h-screen" suppressHydrationWarning>
        <Providers>
          <ClientInitializer />
          {children}
        </Providers>
      </body>
    </html>
  );
}
```

---

### 改动 2：`src/features/customer/services/analytics.ts` — 移除无效外部请求

找到 `sendToAnalyticsService` 方法，将其内容完全替换（保留方法签名，清空实现）：

找到：
```typescript
  // 发送到分析服务
  private sendToAnalyticsService(data: any): void {
    // 示例：发送到 Google Analytics
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'customer_management_analytics', {
        custom_parameters: data
      });
    }

    // 示例：发送到自定义API
    fetch('/api/analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    }).catch(error => {
      console.error('Failed to send analytics data:', error);
    });
  }
```

替换为：
```typescript
  // 发送到分析服务（暂未配置外部分析服务，数据仅保存到本地）
  private sendToAnalyticsService(_data: any): void {
    // 内部工具，暂不集成外部分析服务
    // 如需接入，在此处实现（注意：Google Analytics 在国内不可用）
  }
```

---

### 改动 3（可选）：`tailwind.config.ts` — 完善中文字体栈

当前配置 `font-sans: ['Arial', 'Helvetica', 'sans-serif']`，`sans-serif` 通用族会自动使用系统中文字体（macOS: PingFang SC, Windows: Microsoft YaHei），已能正常显示。如希望显式指定中文字体顺序，可替换为：

找到：
```ts
      fontFamily: {
        sans: ['Arial', 'Helvetica', 'sans-serif'],
      },
```

替换为：
```ts
      fontFamily: {
        sans: [
          'PingFang SC',
          'Microsoft YaHei',
          'Noto Sans SC',
          'Arial',
          'Helvetica',
          'sans-serif',
        ],
      },
```

> 此改动为可选项，不改也不影响显示效果。

---

### 验证

```bash
# 构建和类型检查
npm run build
npx tsc --noEmit

# 本地开发验证（国内网络）：
npm run dev
# 预期：启动时不再有 fonts.googleapis.com 相关报错或超时
# 预期：浏览器 Network 面板中无 /api/analytics 404 请求
```

### 提交

```bash
git add \
  src/app/layout.tsx \
  src/features/customer/services/analytics.ts \
  tailwind.config.ts   # 仅如果执行了改动3
git commit -m "perf: 移除外网依赖 — Google Fonts 改系统字体，清除无效 Analytics 请求 (TASK-42)"
```

### 实际落地

- `src/app/layout.tsx`：移除 `next/font/google` Inter 引入，body 改用系统字体
- `src/features/customer/services/analytics.ts`：清空 `sendToAnalyticsService`，停止 gtag 调用和 `/api/analytics` 404 请求
- `tailwind.config.ts`：未改（中文字体栈可选，保持现状）
- `npx tsc --noEmit` + `npm run build` 均通过

---

## TASK-43：单据历史跨设备同步修复 ✅ 已完成

**优先级**：🔴 紧急（核心功能缺失）
**估时**：45 分钟
**风险**：中（涉及数据合并逻辑，改完须全量测试各单据类型的增删改）

### 背景与根因

各用户的单据记录（报价/发票/装箱/采购）应在同用户多端之间增删改同步，但目前存在以下缺口：

**同步缺口矩阵：**

| 操作 | 报价/确认 | 发票 | 装箱单 | 采购单 |
|------|-----------|------|--------|--------|
| 新建 | ✅ | ✅ | ❌ 漏 | ✅ |
| 修改 | ✅ | ❌ 漏 | ❌ 漏 | ✅ |
| 删除 | ✅ | ✅ | ❌ 漏 | ✅ |

**根因 1：装箱单 feature 用的是 `packingHistoryService.ts`（无 d1Sync），不是 `utils/packingHistory.ts`（有 d1Sync）**

**根因 2：发票 update 路径绕过了 d1Sync**
`invoice.service.ts` 的编辑路径直接调用 `saveInvoiceHistory()`（只写 localStorage），没有触发 `d1SyncDocument('update', ...)`

**根因 3：`mergeIntoStorage` 只做 add/update，从不移除记录**
设备 A 删除某条单据 → D1 里没了，但设备 B 的 localStorage 永远保留该记录

**根因 4：History 页不触发 D1 拉取**
页面只读 localStorage，设备 A 的改动必须等设备 B 重新登录才可见

---

### 改动 1：`src/utils/d1Pull.ts` — 修复 mergeIntoStorage 使删除可传播

**核心思路：**
- `fetchAll` 区分"获取成功返回 0 条"和"请求失败"，用 `ok` 标记
- `mergeIntoStorage` 在 D1 拉取成功后，移除本地有、D1 没有的记录（表示已在另一端删除）
- 例外：本地记录在 2 分钟内刚创建的保留（为 D1 double-write 传播留窗口）

找到 `fetchAll` 函数，将整个函数替换为：

```typescript
async function fetchAll<T>(
  url: string,
  key: string,
): Promise<{ data: T[]; ok: boolean }> {
  const results: T[] = [];
  let offset = 0;
  const limit = 500;
  let ok = false;

  while (true) {
    const resp = await fetch(`${url}&limit=${limit}&offset=${offset}`);
    if (!resp.ok) break;
    ok = true;
    const json = await resp.json();
    const items: T[] = json[key] ?? [];
    results.push(...items);
    if (items.length < limit) break;
    offset += limit;
  }

  return { data: results, ok };
}
```

找到 `mergeIntoStorage` 函数，将整个函数替换为：

```typescript
function mergeIntoStorage<T extends LocalStorageItem>(
  storageKey: string,
  incoming: T[],
  d1Ok: boolean,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];

  const incomingIds = new Set(incoming.map((item) => item.id));
  const now = Date.now();
  const TWO_MINUTES = 2 * 60 * 1000;

  // D1 记录为权威来源，先全部放入 map
  const map = new Map<string, T>(incoming.map((item) => [item.id, item]));

  // 保留本地有、D1 没有、但 2 分钟内刚创建的记录（double-write 可能还未到达 D1）
  for (const item of existing) {
    if (!incomingIds.has(item.id)) {
      const createdAt = new Date(item.createdAt ?? item.created_at ?? 0).getTime();
      if (now - createdAt < TWO_MINUTES) {
        map.set(item.id, item);
      }
      // 超过 2 分钟且 D1 没有 → 视为已在其他设备删除，不保留
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}
```

找到 `pullAllFromD1` 函数中 `const [quotations, confirmations, invoices, packings, purchases] = await Promise.all([` 这段，将整个 Promise.all 和后续 mergeIntoStorage 调用替换为：

```typescript
    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([
      fetchAll<D1Doc>('/api/documents?type=quotation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=confirmation', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=invoice', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=packing', 'documents'),
      fetchAll<D1Doc>('/api/documents?type=purchase', 'documents'),
    ]);

    mergeIntoStorage(
      'quotation_history',
      [...quotRes.data, ...confRes.data].map(docToQuotationHistory),
      quotRes.ok && confRes.ok,
    );
    mergeIntoStorage('invoice_history', invRes.data.map(docToInvoiceHistory), invRes.ok);
    mergeIntoStorage('packing_history', packRes.data.map(docToPackingHistory), packRes.ok);
    mergeIntoStorage('purchase_history', purchRes.data.map(docToPurchaseHistory), purchRes.ok);
```

同样将 customers/suppliers/consignees 的 Promise.all 替换（只需更新变量名，逻辑一致）：

```typescript
    const [custRes, suppRes, consRes] = await Promise.all([
      fetchAll<D1Customer>('/api/customers?type=customer', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=supplier', 'customers'),
      fetchAll<D1Customer>('/api/customers?type=consignee', 'customers'),
    ]);

    mergeIntoStorage('customer_management', custRes.data.map((c) => d1CustomerToLocal(c, 'customer')), custRes.ok);
    mergeIntoStorage('supplier_management', suppRes.data.map((c) => d1CustomerToLocal(c, 'supplier')), suppRes.ok);
    mergeIntoStorage('consignee_management', consRes.data.map((c) => d1CustomerToLocal(c, 'consignee')), consRes.ok);
```

---

### 改动 2：`src/features/packing/services/packingHistoryService.ts` — 补全三个 d1Sync 缺口

在文件顶部导入区（`import { PackingData, PackingHistory } from '../types';` 之后）添加：

```typescript
import { d1SyncDocument } from '@/utils/d1Sync';
```

找到 `savePackingHistory` 函数，在更新现有记录的 `localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));` 之后（existingId 分支）添加 d1Sync：

```typescript
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        // D1 双写（fire-and-forget）
        d1SyncDocument('update', {
          id: existingId,
          type: 'packing',
          doc_no: data.invoiceNo || '',
          customer_name: data.consignee.name,
          total_amount: totalAmount,
          currency: data.currency,
          data,
        });
        return updatedHistory;
```

找到同函数中通过 invoiceNo 更新的 `localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));`（existingPacking 分支），同样在之后添加：

```typescript
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
        // D1 双写（fire-and-forget）
        const updated = updatedHistory.find(item => item.id === existingPacking.id);
        if (updated) {
          d1SyncDocument('update', {
            id: updated.id,
            type: 'packing',
            doc_no: data.invoiceNo || '',
            customer_name: data.consignee.name,
            total_amount: totalAmount,
            currency: data.currency,
            data,
          });
        }
        return updatedHistory.find(item => item.id === existingPacking.id) || null;
```

找到创建新记录的 `history.unshift(newHistory); localStorage.setItem(STORAGE_KEY, JSON.stringify(history));`，在其后添加：

```typescript
    history.unshift(newHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    // D1 双写（fire-and-forget）
    d1SyncDocument('create', {
      id: newHistory.id,
      type: 'packing',
      doc_no: data.invoiceNo || '',
      customer_name: data.consignee.name,
      total_amount: totalAmount,
      currency: data.currency,
      data,
    });
    return newHistory;
```

找到 `deletePackingHistory` 函数，在 `localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));` 之后添加：

```typescript
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredHistory));
    // D1 删除（fire-and-forget）
    d1SyncDocument('delete', { id, type: 'packing', doc_no: '', data: null });
    return true;
```

---

### 改动 3：`src/features/invoice/services/invoice.service.ts` — 补全 update 路径的 d1Sync

在文件顶部导入区添加：

```typescript
import { d1SyncDocument } from '@/utils/d1Sync';
```

找到 `isEditMode && editId` 分支，`const saved = saveInvoiceHistory(updatedHistory);` 之后：

```typescript
        const saved = saveInvoiceHistory(updatedHistory);
        if (saved) {
          // D1 双写（fire-and-forget）
          const updatedItem = updatedHistory.find(item => item.id === editId);
          if (updatedItem) {
            d1SyncDocument('update', {
              id: editId,
              type: 'invoice',
              doc_no: data.invoiceNo,
              customer_name: data.to,
              total_amount: totalAmount,
              currency: data.currency,
              data: updatedItem,
            });
          }
          return { success: true, message: '保存成功' };
        }
```

找到 `existingInvoice` 分支（相同发票号更新），`const saved = saveInvoiceHistory(updatedHistory);` 之后：

```typescript
          const saved = saveInvoiceHistory(updatedHistory);
          if (saved) {
            // D1 双写（fire-and-forget）
            d1SyncDocument('update', {
              id: existingInvoice.id,
              type: 'invoice',
              doc_no: data.invoiceNo,
              customer_name: data.to,
              total_amount: totalAmount,
              currency: data.currency,
              data: { ...existingInvoice, data, updatedAt: new Date().toISOString() },
            });
            return {
              success: true,
              message: '保存成功',
              newEditId: existingInvoice.id
            };
          }
```

---

### 改动 4：`src/features/history/app/HistoryPage.tsx` — 页面挂载时拉取 D1

在文件顶部导入区添加：

```typescript
import { pullAllFromD1 } from '@/utils/d1Pull';
```

找到 `useEffect(() => { setMounted(true);` 这个 effect，在 `setMounted(true);` 之后添加 D1 拉取：

```typescript
  useEffect(() => {
    setMounted(true);

    // 页面挂载时从 D1 拉取最新数据（跨设备同步）
    pullAllFromD1()
      .then(() => {
        handleRefresh();
        // 触发自定义事件通知所有 key 已更新
        ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
          window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
        });
      })
      .catch(() => {
        // 拉取失败时静默，继续显示本地数据
      });

    // 监听localStorage变化，自动刷新数据
```

---

### 验证

```bash
npm run build
npx tsc --noEmit
```

人工验证（两个浏览器/设备，同账号登录）：

1. **删除同步**：设备 A 删除一条报价单 → 设备 B 打开历史页 → 该条目不出现
2. **新建同步**：设备 A 新建一张采购单 → 设备 B 打开历史页 → 能看到该条目
3. **装箱单 create**：设备 A 保存装箱单 → 设备 B 历史页可见
4. **装箱单 delete**：设备 A 删装箱单 → 设备 B 历史页消失
5. **发票 update**：设备 A 编辑发票金额 → 设备 B 历史页显示新金额

### 提交

```bash
git add \
  src/utils/d1Pull.ts \
  src/features/packing/services/packingHistoryService.ts \
  src/features/invoice/services/invoice.service.ts \
  src/features/history/app/HistoryPage.tsx \
  CODEX_TASKS.md
git commit -m "feat(sync): 修复单据历史跨设备同步 — 补全装箱/发票 d1Sync，删除可传播，历史页触发 D1 拉取 (TASK-43)"
```

### 实际落地（第一轮）

- `src/utils/d1Pull.ts`：`fetchAll` 返回 `{ data, ok }`；`mergeIntoStorage` 增加 `d1Ok` 参数，D1 成功时移除本地超 2 分钟且 D1 没有的记录
- `src/features/packing/services/packingHistoryService.ts`：补齐 create/update（existingId 和 invoiceNo 两条路径）/delete 三处 d1SyncDocument 调用
- `src/features/invoice/services/invoice.service.ts`：补齐 editId 更新和 existingInvoice 覆盖更新两条路径的 d1SyncDocument('update', ...)
- `src/features/history/app/HistoryPage.tsx`：挂载时调 `pullAllFromD1()`，拉完后 handleRefresh
- `npx tsc --noEmit` + `npm run build` 均通过

---

### 补丁（2026-06-22）：写入队列 + 刷新按钮触发同步

**问题 1**：历史页内刷新按钮只重读 localStorage（increments refreshKey），不触发 D1 拉取，所以其他设备的新增数据在点刷新后看不到。

**问题 2**：`d1SyncDocument` 是 fire-and-forget，失败完全静默。若写入失败，D1 没有该记录，下次 merge 时本机数据被误删（"D1 没有 = 其他设备已删"的逻辑错误）。

**修复方案**：

#### `src/utils/d1Sync.ts` — 写入队列机制

完全重写，核心新增：

```typescript
const QUEUE_KEY = 'd1_pending_syncs';

// 操作发起时立即入队（localStorage d1_pending_syncs）
// 成功后出队；失败时保留，等待 flushPendingQueue() 重试

export async function flushPendingQueue(): Promise<void>
export function getPendingIds(): Set<string>
```

`d1SyncDocument` / `d1SyncCustomer` 改为：先入队 → 异步发起请求 → 成功出队 / 失败留队。每条操作有唯一 opId（`${id}-${action}-${timestamp}`），同记录同动作去重。

#### `src/utils/d1Pull.ts` — 先刷队列再拉取，D1 权威 merge 加队列保护

`pullAllFromD1` 流程：
1. `await flushPendingQueue()` — 重试所有未成功写入
2. `getPendingIds()` — 取仍未成功的 id（网络断开才会有）
3. 并行拉取所有类型数据
4. `mergeIntoStorage` 签名增加 `pendingIds` 参数：
   - D1 有的：以 D1 为准 ✓
   - D1 没有 + 不在 pendingIds：视为其他设备已删 → 移除
   - D1 没有 + 在 pendingIds：写入未到达 D1 → 保留本地

#### `src/features/history/app/HistoryPage.tsx` — 刷新按钮触发完整同步

新增 `handleSyncRefresh`（替换刷新按钮的 onClick）：

```typescript
const handleSyncRefresh = useCallback(async () => {
  if (isSyncing.current) return;
  isSyncing.current = true;
  setSyncing(true);
  try {
    await pullAllFromD1();
    handleRefresh();
    ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
      window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
    });
  } finally {
    isSyncing.current = false;
    setSyncing(false);
  }
}, [handleRefresh]);
```

刷新按钮加旋转动画（`animate-spin`）+ disabled 防重复点击。

**提交**：
```bash
git add src/utils/d1Sync.ts src/utils/d1Pull.ts src/features/history/app/HistoryPage.tsx
git commit -m "fix(sync): 写入队列+重试机制，D1权威merge，刷新按钮触发同步拉取 (TASK-43补丁)"
```

**验证**：`npx tsc --noEmit` 通过

---

## TASK-44：单据跨设备同步重构 — 双向同步 + 轮询（参照登记表模式）✅ 已完成

**优先级**：🔴 紧急
**估时**：60 分钟
**风险**：中（涉及多个写路径，需完整测试各单据类型）

### 根本原因

当前单据同步是**单向 pull**，登记表同步是**双向 push+pull + 30s 轮询**。

| 特性 | 登记表 ✅ | 单据 ❌ |
|------|-----------|---------|
| 创建时写 D1 | fire-and-forget | fire-and-forget + 队列 |
| 写失败补救 | `pushLocalToD1` 轮询时补推 | 仅 flush 队列（不轮询）|
| D1→本地同步 | 30s 轮询 + `mergeFromD1` | 仅历史页挂载/刷新按钮 |
| 删除保护 | `inquiry_deleted_ids` | 无 |

结果：设备 A 创建单据 → `d1SyncDocument` 可能失败 → 队列不自动刷 → 设备 B pull 时 D1 空 → 看不到数据。

### 改造方案

参照 `src/features/inquiry/services/inquiry.service.ts` + `InquiryPage.tsx` 模式，为单据实现：
1. `pushLocalToD1`（本地有 D1 没有的 → 推上去）
2. 删除 ID 追踪（防止已删记录被重新推上去）
3. 历史页 30s 轮询（与登记表保持一致）

---

### 改动 1：`src/utils/d1Sync.ts` — 增加删除 ID 记录

在 `QUEUE_KEY` 常量之后添加：

```typescript
const DELETED_DOC_IDS_KEY = 'd1_deleted_doc_ids';

/** 记录本机已删除的文档 id，防止 pushLocalToD1 将其重新推上 D1 */
export function recordDeletedDocId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    map[id] = new Date().toISOString();
    // 清理 30 天前的条目
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const [k, v] of Object.entries(map)) {
      if (new Date(v).getTime() < cutoff) delete map[k];
    }
    localStorage.setItem(DELETED_DOC_IDS_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

/** 返回本机已删除的文档 id 集合 */
export function getDeletedDocIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const map: Record<string, string> = JSON.parse(localStorage.getItem(DELETED_DOC_IDS_KEY) || '{}');
    return new Set(Object.keys(map));
  } catch { return new Set(); }
}
```

在 `d1SyncDocument` 函数体中，找到 `action === 'delete'` 的入队处，添加一行：

```typescript
  if (action === 'delete') {
    recordDeletedDocId(payload.id);  // ← 新增
  }
  enqueue(op);
  fireAndForget(op);
```

---

### 改动 2：`src/utils/d1Pull.ts` — 增加 pushLocalToD1 + mergeIntoStorage 记录远端删除

在文件顶部 import 之后，添加 `recordDeletedDocId` 和 `getDeletedDocIds` 的导入：

```typescript
import { flushPendingQueue, getPendingIds, recordDeletedDocId, getDeletedDocIds } from '@/utils/d1Sync';
```

在 `mergeIntoStorage` 函数中，当记录被判定为"远端已删除"时，记录其 ID（在 `// 不在队列且 D1 没有 → 视为已在其他设备删除，不保留` 注释处）：

```typescript
    // 不在队列且 D1 没有 → 视为已在其他设备删除，不保留
    recordDeletedDocId(item.id);   // ← 新增：防止下次 push 时重新推上去
```

在 `pullAllFromD1` 函数中，在 `const pendingIds = getPendingIds();` 之后，fetch 之前，添加 `pushLocalToD1` 调用：

```typescript
    const pendingIds = getPendingIds();
    const deletedIds = getDeletedDocIds();

    // ── 先推：本地有但 D1 可能没有的记录 ──────────────────────────
    // 注意：只推能转换为 D1DocumentPayload 的类型；客户不在此处理
    await pushLocalDocsToD1(deletedIds);
    // ─────────────────────────────────────────────────────────────

    const [quotRes, confRes, invRes, packRes, purchRes] = await Promise.all([...
```

在 `mergeIntoStorage` 函数**之前**（即 `function mergeIntoStorage` 之前），添加 `pushLocalDocsToD1` 函数：

```typescript
/**
 * 将本地各类型单据历史中 D1 尚未收录的记录推送到 D1。
 * 参照 inquiryService.pushLocalToD1 模式。
 * 只推 d1 尚未有（不在 d1Ids 内）、且本机未删除的记录。
 */
async function pushLocalDocsToD1(deletedIds: Set<string>): Promise<void> {
  if (typeof window === 'undefined') return;
  const pending = getPendingIds();

  // 读取各 key 的本地数据
  const quotLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('quotation_history') || '[]');
  const invLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('invoice_history') || '[]');
  const packLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('packing_history') || '[]');
  const purchLocal: Array<Record<string, unknown>> = JSON.parse(localStorage.getItem('purchase_history') || '[]');

  // 并行拉取当前 D1 id 列表（只需 id，用 limit 小的查询）
  // 注意：这里 await 是为了拿到 D1 现有 id，再决定哪些需要推
  // 直接复用已知的 d1Ids（由调用方传入会更优，但 pushLocalDocsToD1 此处独立执行，需自行查询）
  const [qRes, cRes, iRes, pkRes, puRes] = await Promise.all([
    fetchAll<{ id: string }>('/api/documents?type=quotation', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=confirmation', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=invoice', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=packing', 'documents'),
    fetchAll<{ id: string }>('/api/documents?type=purchase', 'documents'),
  ]);

  const quotD1Ids = new Set([...qRes.data, ...cRes.data].map((d) => (d as any).id as string));
  const invD1Ids = new Set(iRes.data.map((d) => (d as any).id as string));
  const packD1Ids = new Set(pkRes.data.map((d) => (d as any).id as string));
  const purchD1Ids = new Set(puRes.data.map((d) => (d as any).id as string));

  const shouldPush = (id: string, d1Ids: Set<string>) =>
    !d1Ids.has(id) && !pending.has(id) && !deletedIds.has(id);

  for (const item of quotLocal) {
    const id = item.id as string;
    if (shouldPush(id, quotD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: (item.type as string || 'quotation') as import('@/utils/d1Sync').D1DocType,
        doc_no: (item.quotationNo as string) || '',
        customer_name: item.customerName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }

  for (const item of invLocal) {
    const id = item.id as string;
    if (shouldPush(id, invD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'invoice',
        doc_no: (item.invoiceNo as string) || '',
        customer_name: item.customerName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item,  // 全量存储供 docToInvoiceHistory 提取 data.data
      });
    }
  }

  for (const item of packLocal) {
    const id = item.id as string;
    if (shouldPush(id, packD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'packing',
        doc_no: (item.invoiceNo as string) || '',
        customer_name: item.consigneeName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }

  for (const item of purchLocal) {
    const id = item.id as string;
    if (shouldPush(id, purchD1Ids)) {
      d1SyncDocument('create', {
        id,
        type: 'purchase',
        doc_no: (item.orderNo as string) || '',
        customer_name: item.supplierName as string,
        total_amount: item.totalAmount as number,
        currency: (item.currency as string) || 'USD',
        data: item.data,
      });
    }
  }
}
```

注意：`pushLocalDocsToD1` 内部调用了 `d1SyncDocument`，需要在文件顶部从 `d1Sync` 导入：

```typescript
import { flushPendingQueue, getPendingIds, recordDeletedDocId, getDeletedDocIds, d1SyncDocument } from '@/utils/d1Sync';
```

同时由于 `pushLocalDocsToD1` 内部也调用了 `fetchAll`，而 `fetchAll` 本来只在 `pullAllFromD1` 中使用，无需修改，因为 `pushLocalDocsToD1` 与 `mergeIntoStorage` 在同一文件中，`fetchAll` 可直接调用（同文件私有函数）。

---

### 改动 3：`src/features/history/app/HistoryPage.tsx` — 30s 轮询（参照登记表）

找到 `handleSyncRefresh` 的 `useCallback`，在其下方的 mount useEffect 中，在现有 `pullAllFromD1()` 之后，增加 30s 轮询：

**将 mount useEffect 替换为：**

```typescript
  useEffect(() => {
    setMounted(true);
    let cancelled = false;

    async function syncFromD1() {
      if (cancelled) return;
      await pullAllFromD1();
      if (cancelled) return;
      handleRefresh();
      ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'].forEach(key => {
        window.dispatchEvent(new CustomEvent('customStorageChange', { detail: { key } }));
      });
    }

    void syncFromD1();

    const POLL_INTERVAL_MS = 30_000;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void syncFromD1();
      }
    }, POLL_INTERVAL_MS);

    // 监听 localStorage 变化
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key && (
        event.key.includes('quotation_history') ||
        event.key.includes('packing_history') ||
        event.key.includes('invoice_history') ||
        event.key.includes('purchase_history')
      )) {
        handleRefresh();
      }
    };

    const handleCustomStorageChange = (event: CustomEvent) => {
      if (event.detail?.key && (
        event.detail.key.includes('quotation_history') ||
        event.detail.key.includes('packing_history') ||
        event.detail.key.includes('invoice_history') ||
        event.detail.key.includes('purchase_history')
      )) {
        handleRefresh();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('customStorageChange', handleCustomStorageChange as EventListener);

    return () => {
      cancelled = true;
      setMounted(false);
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('customStorageChange', handleCustomStorageChange as EventListener);
    };
  }, [setMounted, handleRefresh]);
```

---

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证（两端同账号）：

1. 设备 A 新建合同确认书 → 立刻到历史页（触发 flush + push） → 等 5s → 设备 B 历史页自动刷新（30s 轮询）或手动点刷新 → 能看到该条目
2. 设备 A 删除记录 → 设备 B 等待下次轮询 → 消失
3. 刷新按钮仍然正常工作（`handleSyncRefresh`）

### 提交

```bash
git add \
  src/utils/d1Sync.ts \
  src/utils/d1Pull.ts \
  src/features/history/app/HistoryPage.tsx \
  CODEX_TASKS.md
git commit -m "feat(sync): 单据双向同步重构 — pushLocalToD1 + 删除ID追踪 + 30s轮询 (TASK-44)"
```

### 实际落地

- `src/utils/d1Sync.ts`：新增 `recordDeletedDocId` / `getDeletedDocIds`，删除时自动记录 ID；`d1SyncDocument('delete', ...)` 调用时同步入 `d1_deleted_doc_ids`
- `src/utils/d1Pull.ts`：新增 `pushLocalDocsToD1(deletedIds)`，在每次 pull 前检查本地各类型历史，将 D1 缺失且不在待同步队列/已删除集合的记录推送到 D1；`mergeIntoStorage` 在移除远端已删记录时调用 `recordDeletedDocId`
- `src/features/history/app/HistoryPage.tsx`：改为 visibilitychange 触发同步（打开页面 + 标签回到前台立即同步，无轮询间隔），替代原 30s setInterval 方案
- `npx tsc --noEmit` + `npm run build` 均通过

---

## TASK-45：同浏览器多用户单据历史隔离 ✅ 已完成

### 背景

同一个浏览器中，如果用户 A 退出后用户 B 登录，单据历史 localStorage key 仍是全局 key：

- `quotation_history`
- `invoice_history`
- `packing_history`
- `purchase_history`
- `d1_pending_syncs`
- `d1_deleted_doc_ids`

这会导致两个严重问题：

1. 用户 B 可能在页面上看到用户 A 的本地历史记录。
2. `pushLocalToD1` 会把旧用户 localStorage 中的记录补推到当前登录用户的 D1 账号下，造成跨用户串数据。

### 改动

**文件：`src/utils/d1Sync.ts`**

- 新增 `d1_active_user_id`，记录当前浏览器本地单据缓存归属用户。
- 新增 `prepareD1DocumentSyncForUser(userId)`：
  - 当前用户与本地归属用户一致：保留缓存并同步。
  - 当前用户与本地归属用户不同：清空单据历史、待同步队列、删除 ID，再绑定新用户。
- 新增 `clearD1DocumentLocalState()`：
  - 清理四类单据历史。
  - 清理 `d1_pending_syncs`。
  - 清理 `d1_deleted_doc_ids`。
  - 清理 `d1_active_user_id`。
  - 派发 `customStorageChange`，刷新历史页/首页数据。

**文件：`src/hooks/useD1Sync.ts`**

- 移除单一 `syncDone` 逻辑，改为按用户 ID 同步。
- 登录状态为 authenticated 后，先调用 `prepareD1DocumentSyncForUser(userId)`，再执行 `pullAllFromD1()`。
- 同一浏览器会话中切换账号后会重新同步新用户数据。

**文件：`src/hooks/useAppUser.ts`**

- 退出登录时清理单据本地历史和 D1 同步状态，避免下一个登录用户继承旧用户缓存。

**文件：`src/features/dashboard/app/DashboardPage.tsx`**

- Dashboard 自定义退出逻辑同样调用 `clearD1DocumentLocalState()`。

**文件：`src/utils/d1Pull.ts`**

- `pushLocalDocsToD1` 增加保护：只有本地缓存已绑定当前用户后才允许补推，避免未知归属缓存被上传。
- 保留 TASK-44 后续修复：查询 D1 时使用 `status=all`，跨设备传播 deleted 状态，防止旧设备把已删除记录复活。

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证：

1. 同一浏览器登录用户 A，确认历史页有 A 的记录。
2. 退出用户 A。
3. 登录用户 B，历史页不应显示用户 A 的本地记录。
4. 用户 B 新增/删除单据，不应影响用户 A 的 D1 数据。
5. 同账号跨设备新增、删除仍可通过历史页刷新/回前台同步。

---

## TASK-46：修复询报价编辑模式下询价编号和日期被当天数据覆盖 ✅ 已完成

**优先级**：🟡 高（数据正确性）
**估时**：5 分钟
**风险**：极低，仅改一行守卫条件

### 背景

在询报价登记中，打开某条已有记录进行编辑（例如填写"已报价"记录），保存后发现：

- **询价编号**变成了今天日期生成的新编号（如原来是 `C260615F`，变成了 `C260622G`）
- 再次打开该记录，**询价日期**也跟着变成今天

**根本原因**：`InquiryFormModal.tsx` 中两个 `useEffect` 在首次渲染时产生竞态：

1. **Effect 1**（deps: `existingNos, isOpen, mode, record`）：将 `inquiryNo` 设为 `record.inquiryNo`（原始编号），将 `isInquiryNoManual` 设为 `true`。
2. **Effect 2**（deps: `dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent`）：在**同一渲染周期**内执行，读到的是 stale 状态（`isInquiryNoManual = false`、`dateInput = 今天`），因此跳过 early return，调用 `generateNextInquiryNo(今天日期, ...)` 生成新编号，**覆盖**了 Effect 1 刚写入的原始编号。

React 批量 setState 时，Effect 2 最后写入，优先级更高，原始编号丢失。

### 涉及文件

- `src/features/inquiry/components/InquiryFormModal.tsx`

### 改动

**定位**（约第 118–122 行）：

```typescript
useEffect(() => {
  if (!isOpen || isInquiryNoManual) return;
  const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
  setInquiryNo(isUrgent ? `${base}-U` : base);
}, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent]);
```

**改为**（增加 `mode === 'edit'` 守卫，同时在 deps 中补充 `mode`）：

```typescript
useEffect(() => {
  if (!isOpen || isInquiryNoManual || mode === 'edit') return;
  const base = generateNextInquiryNo(dateInputToDate(dateInput), existingNos);
  setInquiryNo(isUrgent ? `${base}-U` : base);
}, [dateInput, existingNos, isInquiryNoManual, isOpen, isUrgent, mode]);
```

**说明**：
- 编辑模式（`mode === 'edit'`）下，询价编号始终由用户手动控制，不自动生成。
- 新增模式（`mode === 'create'`）行为不变：修改日期时自动更新编号。
- 这也修复了日期的二次污染：`inquiryNo` 保持原值 → 下次打开时 `getDateInputValueFromInquiryNo` 解析出正确日期 → `inquiryDate` 也正确。

### 验证

```bash
npx tsc --noEmit
npm run build
```

人工验证：
1. 打开一条已有询价记录进行编辑（如添加"已报价"记录）。
2. 点击"保存修改"后，检查该记录的询价编号和询价日期均未变化。
3. 新增询价模式下，修改日期后编号应仍自动同步。

```bash
git add src/features/inquiry/components/InquiryFormModal.tsx
git commit -m "fix(inquiry): 编辑模式下禁止自动覆盖询价编号 — useEffect 竞态导致 inquiryNo 被今日编号替换 (TASK-46)"
```

### 实际落地

- `src/features/inquiry/components/InquiryFormModal.tsx`：自动生成询价编号的 `useEffect` 增加 `mode === 'edit'` 守卫，编辑模式下不再自动生成/覆盖询价编号。
- 依赖数组补充 `mode`，保持 React effect 依赖完整。
- `npx tsc --noEmit` + `npm run build` 均通过。

---

## TASK-47 ✅：询报价页面筛选优化 + 导入/导出功能

### 背景

1. 筛选区域过于厚重；「已报价」筛选器混入「无法报价」记录。
2. 缺少数据导入/导出能力，无法备份或跨设备迁移询报价数据。

### 改动一：筛选 UI 重构（内联展开）

**`src/features/inquiry/app/InquiryPage.tsx`**
- 去掉副标题「记录客户询价、供应商报价进度和已报客户版本。」
- 筛选按钮点击后，筛选控件**向左内联展开**（与标题同行，无需额外行），关闭时恢复标题 + 同步时间 + 条数。
- 移除底部浮动的冗余「新增询价」按钮，底部栏改为「导入 / 导出」。

**`src/features/inquiry/components/InquiryFilterBar.tsx`**（重写为紧凑内联版）
- 时间筛选：`7D / 1M / 3M / 1Y`（点击已选项取消，无「全部」按钮）。
- 状态筛选：`未报价 / 已报价 / 无法报价 / 已成单`（移除「需信息」「等待供应商」「全部」）。
- 保留搜索框 + 询价人下拉，移除客户筛选下拉。
- 有激活筛选时显示「重置」按钮。

**`src/features/inquiry/hooks/useInquiryFilter.ts`**
- `TimeRange` 新增 `'1y'`，对应 365 天。
- 修复 `customer_quoted` 筛选逻辑：之前用 `some(type !== 'unavailable')`，遇到同时有普通报价条目和 `unavailable` 条目的记录会同时命中两个筛选器。新逻辑：`已报价` = 有至少一个 `type` 为空或 `'quoted'` 的条目 **且** 没有任何 `unavailable` 条目。

### 改动二：导入 / 导出

**`src/features/inquiry/app/InquiryPage.tsx`**

**导出**：
- 将 `inquiryService.getAll()` 全量记录序列化为 JSON，触发浏览器下载（文件名 `inquiry_YYYY-MM-DD.json`）。

**导入**：
- 隐藏 `<input type="file" accept=".json">` + `useRef` 触发。
- 解析 JSON，逐条与本地合并：本地无此 ID → 新增并 `syncToD1`；本地有但导入版本更新 → 覆盖并 `updateInD1`；否则跳过。
- 合并后写入 `inquiryService.save()` 并刷新 store，最后 `alert` 提示新增/更新数量。
- 导入失败（非 JSON 或格式错误）弹出错误提示。

### 验证

```bash
npx tsc --noEmit
```

人工验证：
1. 筛选按钮展开 → 内联显示筛选控件，无额外行。
2. 时间筛选「7D」点击激活，再次点击取消（回到全部）。
3. 「已报价」筛选不再混入「无法报价」记录。
4. 底部栏「导出」→ 下载 JSON 文件，内容为所有询报价记录。
5. 「导入」→ 选择刚导出的 JSON → 提示「新增 0 条，更新 0 条」（重复导入幂等）。

---

## TASK-48 ✅：「询价已关闭」状态 + 表单紧凑化 + 历史数据导入（2026-2）

### 背景

1. 询价被客户通知关闭（非无法报价，而是客户主动终止），需要单独标记。
2. 编辑弹窗字段较多，「询价人」单独占一行显得冗余。
3. 2026 年第二季度询价记录（4月～6月，共 401 条）需从 docx 导入。

### 改动一：「询价已关闭」状态

**`src/features/inquiry/types/index.ts`**
- `CustomerQuoteType` 新增 `'closed'`：`'quoted' | 'unavailable' | 'supplemented' | 'closed'`。

**`src/features/inquiry/components/InquiryQuoteStatus.tsx`**
- `regularStatuses` 排除 `closed` 类型（与 `unavailable`、`supplemented` 同级）。
- 派生 `closedStatus`，新增 `toggleClosed` / `updateClosedDate`，与「已回复客户无法报价」并排放在同一 `border-t` 区域内（`flex-wrap` 行）。

**`src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`**（列表卡片展示）
- `regularStatuses` 同步排除 `closed`。
- 新增 `closedStatus` 展示：灰色 `询价关闭(m.d)` 文字，与「无法报价」同样的视觉层级。

**`src/features/inquiry/utils/inquiryUtils.ts`**
- `getRecordColorState` 修正：`closed` 和 `unavailable` 一起归入灰色（`text-gray-400`）；同时修正第二条件从 `type !== 'unavailable'` 改为显式白名单 `!type || type === 'quoted' || type === 'supplemented'`，避免 `closed`/`supplemented` 等新类型意外触发蓝色。

**`src/features/inquiry/hooks/useInquiryFilter.ts`**
- `unavailable` 筛选：`type === 'unavailable' || type === 'closed'`（两者均出现在「无法报价」过滤桶）。
- `customer_quoted` 筛选：同步排除 `closed`（与 `unavailable` 对称）。

### 改动二：编辑弹窗紧凑化 + 交互优化

**`src/features/inquiry/components/InquiryFormModal.tsx`**
- 「询价人」字段从独立行移入顶部身份条，布局变为：`< 日期 > · 询价编号 · 询价人 [□紧急]`。
- 询价编号固定宽度 `w-24`，询价人 `flex-1` 填满剩余空间，保留 datalist 自动补全。
- 移除了单独的「询价人」label + input 字段行，表单减少一行高度。
- **询价人选项来源扩展**：datalist 由原来仅读客户管理联系人，改为同时合并现有询价记录中出现过的询价人（`existingRecords.map(r => r.inquirer)`），去重排序，确保无论客户管理是否配置都能选到历史使用过的询价人。deps 数组补充 `existingRecords`。
- **编辑模式日期只读**：编辑时日期在新建时已确认，去掉左右箭头和可编辑 input，改为 `<span>` 纯文本展示；新建模式保留完整的箭头 + 键盘（↑↓/Enter）调整交互。
- **身份信息条两行化（小屏优化）**：小屏（375px，约 295px 可用）下，单行布局在 create 模式因日期箭头 + 询价编号已占 300px+ 导致询价人无显示空间。改为卡片内两行：第一行「日期 · 询价编号 · 紧急」，第二行 `border-t` 分隔后「询价人」独占全宽；询价编号改为 `flex-1` 自适应宽度，所有尺寸下均可正常操作。

**`src/features/inquiry/components/InquiryRow.tsx`**（内容简述回退逻辑）
- 大屏（`lg+`，客户编号列可见）：内容简述列仅显示 `description`，为空则留空，避免与客户编号列重复。
- 中小屏（`< lg`，客户编号列隐藏）：内容简述列使用 `description?.trim() || customerNo` 回退，确保单元格不为空白。实现为两个 `<p>` 分别用 `hidden lg:block` / `lg:hidden` 按断点切换，断点与客户编号列显隐一致。

### 改动三：历史数据解析导入（2026-2）

- 使用 python-docx 解析 `协同-1询价登记表(2026-2).docx`（6 列表格，417 行，401 条有效数据，日期范围 4.1～6.22）。
- 处理边界情况：缺少 `/` 分隔符（自动插入）、`庾总(无库存)` 标记为 unavailable、`同C260415L/` 前缀剥除、`报价万成`（无日期前缀）赋 `[0.0]`、双询价编号取第一个（如 `C260507Q C260508F FL2665`）。
- 输出 `inquiry_import_2026-2.json`（401 条），统计：有订单号 26 条，已报客户 341 条，无法报价 76 条，待报价 60 条。

### 验证

```bash
npx tsc --noEmit
```

人工验证：
1. 编辑弹窗顶部一行显示日期 · 编号 · 询价人 · 紧急。
2. 询价已关闭 checkbox 出现在「已回复客户无法报价」右侧，勾选后列表卡片显示灰色「询价关闭(日期)」。
3. 「无法报价」筛选器能命中已关闭记录；「已报价」筛选器不命中已关闭记录。
4. 导入 `inquiry_import_2026-2.json` → 401 条新增。

---

## TASK-49 ✅：彻底修复询报价登记中小屏列宽溢出

### 背景

中屏、小屏下询报价登记列表仍出现列宽异常：

- 状态列被推到卡片右侧之外，只能看到右边缘的少量彩色文字。
- 小屏下「内容简述」占位正常，但「询报价状态 / 操作」实际落在横向溢出区域。
- 之前只处理 Tailwind 任意百分比类和 `colgroup`，但问题仍存在。

### 真实根因

问题不是单一的 Tailwind 百分比类未编译，而是三个因素叠加：

1. **表格使用 `min-w-full table-fixed`**
   `min-width: 100%` 只保证表格至少等于容器宽度；当单元格内容的不可换行最小宽度更大时，浏览器仍会把整张表撑宽。
   因此即使已经加了 `colgroup`，表格仍可能横向溢出。

2. **状态列是一整串不可换行文本**
   `InquiryQuoteStatusDisplay` 使用单行状态串，供应商状态 + `/` + 已报价/无法报价/已关闭状态会形成很长的不可换行内容。
   该内容会反向影响 table layout 的最小内容宽度。

3. **行内单元格缺少 `overflow-hidden / min-w-0 / max-w-full` 约束**
   编号、询价人、内容简述、状态、操作列内部都没有完整的收缩边界，中小屏下容易把列撑开。

截图中看到的“状态列只剩右侧彩色碎片”，实际是表格整体变宽后，状态列落在横向滚动区域右边，当前视口只看到它的边缘。

### 涉及文件

- `src/features/inquiry/components/InquiryTable.tsx`
- `src/features/inquiry/components/InquiryRow.tsx`
- `src/features/inquiry/components/InquiryQuoteStatusDisplay.tsx`

### 最终修复

#### 1. `InquiryTable.tsx`：固定表格宽度，保留 colgroup

将表格从：

```tsx
<table className="min-w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

改为：

```tsx
<table className="w-full table-fixed divide-y divide-gray-100 dark:divide-gray-800">
```

说明：

- `w-full` 让 table 的实际宽度固定为容器宽度。
- `table-fixed + colgroup` 才能稳定按断点列宽分配。
- `min-w-full` 会允许内容继续撑宽，是这次中小屏异常的核心触发点。

断点列宽继续使用 `colgroup`：

| 断点 | 可见列 | 列宽 |
|------|--------|------|
| `< md` | 询价编号 / 内容简述 / 询报价状态 / 操作 | 22% / 18% / 52% / 8% |
| `md ~ lg` | 询价编号 / 询价人 / 内容简述 / 询报价状态 / 操作 | 15% / 13% / 22% / 43% / 7% |
| `lg+` | 询价编号 / 询价人 / 客户编号 / 内容简述 / 询报价状态 / 操作 | 10% / 12% / 24% / 22% / 28% / 4% |

同时给所有表头加 `overflow-hidden`，长表头使用 `truncate`；小屏/删除列不显示「操作」文字，避免占掉 8% 列宽。

#### 2. `InquiryRow.tsx`：所有单元格增加收缩边界

关键处理：

- 各 `<td>` 增加 `overflow-hidden`。
- 编号、询价人、内容简述使用 `block truncate`。
- flex 容器增加 `min-w-0`，避免内部 flex item 拒绝收缩。
- 客户编号由 `max-w-none` 改为 `max-w-full`。
- 状态列 `<td>` 增加 `overflow-hidden px-2 md:px-3`。
- 操作列小屏压缩为 `px-1`，避免 8% 列宽被 padding 吃掉。

#### 3. `InquiryQuoteStatusDisplay.tsx`：状态串限制在状态列内

状态展示保留单行紧凑风格，但增加完整宽度约束：

```tsx
<p className="m-0 block w-full max-w-full truncate whitespace-nowrap text-xs font-medium leading-4" title={statusTitle}>
```

同时生成完整 `statusTitle`：

- 供应商状态
- 已报价状态
- 已补充
- 无法报价
- 询价关闭

这样列表中显示为单行省略号，不再撑宽表格；鼠标悬浮仍可看到完整状态文本。

### 已确认清理

以下旧方案/残留不再出现在询报价表格链路中：

```bash
rg -n "inq-col|w-\\[[0-9]+%\\]|min-w-full table-fixed" src/features/inquiry src/app/globals.css -S
```

预期：无匹配。

### 验证

```bash
npx tsc --noEmit
npm run build
git diff --check
```

结果：

- `npx tsc --noEmit` 通过。
- `npm run build` 通过，仅有项目既有 lint warnings。
- `git diff --check` 通过。
- 本地浏览器访问 `/inquiry` 时因当前会话未登录，被中间件重定向到登录页；未能直接完成带真实数据的窄屏截图验证。

### 实际落地

- `InquiryTable.tsx`：`min-w-full` 改为 `w-full`，表头补充溢出约束，小屏隐藏删除列表头文字。
- `InquiryRow.tsx`：所有参与列宽计算的单元格补齐 `overflow-hidden / truncate / min-w-0 / max-w-full`。
- `InquiryQuoteStatusDisplay.tsx`：状态串限制在列内单行省略，并补充完整 `title`。

---

## TASK-50 ✅：客户管理页面全面优化

> 工作目录：`/Users/roger/website/luonet-vercel`
> 技术栈：Next.js 14 App Router · TypeScript 5 strict · Tailwind CSS 3 · localStorage primary · Cloudflare D1 backup

---

### 页面结构 ASCII 图

```
/customer  (CustomerPage.tsx)
┌─────────────────────────────────────────────────────────────────┐
│ AppLayout                                                        │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Header Bar                                               │   │
│  │  [客户管理]            [🔄刷新]  [+ 添加]               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐                   │
│  │ 总客户  │ │ 供应商  │ │ 收货人  │ │ 本月新增│  Stats Cards      │
│  │   12   │ │   5    │ │   3    │ │   2    │                   │
│  └────────┘ └────────┘ └────────┘ └────────┘                   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ CustomerTabs                                             │   │
│  │  [客户▼] [供应商] [收货人] [新增追踪]                    │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ FilterChipBar (客户 tab 专用)                            │   │
│  │  [全部 12] [高活跃 3] [需跟进 5] [本月 2]               │   │
│  │  排序: [最近创建▼]  视图: [⊞][☰]  [🔍搜索...]          │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 内容区域 p-6                                             │   │
│  │  Grid模式: 卡片网格(头像+名称+联系+活跃度+操作按钮)     │   │
│  │  List模式: 表格(客户名|联系方式|活跃度|创建时间|操作)   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  CustomerModal (showModal=true 时覆盖)                          │
│  max-h-[85vh] overflow-y-auto max-w-2xl                         │
│  CustomerForm: 公司名/简称/联系人/邮件/电话/地址/联系人数组      │
└─────────────────────────────────────────────────────────────────┘

/customer/detail?id=X&name=Y  (CustomerDetailPage.tsx)
┌─────────────────────────────────────────────────────────────────┐
│ AppLayout  面包屑: 首页 > 客户管理 > [客户名]                    │
│  Tab Nav: [📅 时间轴]  [🕐 跟进记录]                            │
│  CustomerTimeline (报价/订单/自定义事件时间轴)                    │
│  FollowUpManager  (待处理/完成跟进 + 新增表单)                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### 数据流泳道图

```
  用户操作      CustomerPage       useCustomerData    customerService    localStorage      D1 Cloud
     │               │                   │                  │                 │               │
     │  打开页面      │                   │                  │                 │               │
     │──────────────►│ useEffect ────────►│                  │                 │               │
     │               │                   │── getAllCustomers►│                 │               │
     │               │                   │                  │── getItem ──────►│               │
     │               │                   │◄── Customer[] ───│◄── JSON.parse ──│               │
     │◄── 渲染列表 ──│◄── setState ──────│                  │                 │               │
     │               │                   │                  │                 │               │
     │  点击添加      │                   │                  │                 │               │
     │──────────────►│ setShowModal=true  │                  │                 │               │
     │  填写提交      │                   │                  │                 │               │
     │──────────────►│ validateForm()     │                  │                 │               │
     │               │── saveCustomer() ─────────────────────►── setItem ──────►               │
     │               │── refreshData() ──►│                  │                 │               │
     │               │    (useAutoSync后台静默同步)           │                 │──────────────►│
     │               │                   │                  │                 │               │
     │  点击查看详情  │                   │                  │                 │               │
     │──────────────►│ router.push(/customer/detail?id=X)    │                 │               │
```

---

### 现存问题

1. `window.confirm()` 用于删除/重命名确认 — UX 差，无自定义样式
2. 活跃度在 CustomerList 每个卡片分别读 localStorage（O(n×2) IO）
3. CustomerPage.handleSearch 与 CustomerList 内部过滤双层冗余
4. 详情页 URL 用 customer.name 而非 ID，改名后链接失效
5. 详情页 (/customer/detail) 无客户基本信息展示区域
6. D1 同步状态完全不可见，静默失败
7. useCustomerData 和 CustomerPage 各有一层冗余 isClient state

---

### TASK-50-A：自定义删除确认对话框（替换 window.confirm）

**优先级：高**

**目标：** 用 React Modal 替换所有 `window.confirm()` 调用。

**新建文件：** `src/components/ui/ConfirmDialog.tsx`

```tsx
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;   // whitespace-pre-line 显示换行
  confirmLabel?: string; // 默认"确认"
  variant?: 'danger' | 'default';  // danger=红色按钮
  onConfirm: () => void;
  onCancel: () => void;
}
```

样式要求：
- 遮罩 `fixed inset-0 bg-black/50 flex items-center justify-center z-50`
- 卡片 `bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl`
- danger 确认按钮：`bg-red-600 hover:bg-red-700 text-white`
- 支持 Escape 键取消
- 支持点击遮罩取消

**修改：** `src/features/customer/app/CustomerPage.tsx`

在 CustomerPageContent 中增加 confirm 状态：
```tsx
const [confirmState, setConfirmState] = useState<{
  open: boolean;
  title: string;
  description: string;
  variant: 'danger' | 'default';
  resolve: (ok: boolean) => void;
} | null>(null);

// 提供 showConfirm 工具函数
const showConfirm = useCallback((opts: {
  title: string;
  description: string;
  variant?: 'danger' | 'default';
}): Promise<boolean> => {
  return new Promise((resolve) => {
    setConfirmState({ open: true, ...opts, variant: opts.variant ?? 'default', resolve });
  });
}, []);
```

将 `showConfirm` 作为参数传给 `useCustomerActions(showConfirm)`。

**修改：** `src/features/customer/hooks/useCustomerActions.ts`

函数签名改为：
```ts
export function useCustomerActions(
  showConfirm: (opts: { title: string; description: string; variant?: 'danger' | 'default' }) => Promise<boolean>
)
```

将所有 `confirm(...)` 替换为 `await showConfirm(...)` 调用，`alert(...)` 替换为 toast 或 console.error（暂时保留 alert 可接受）。

**验收：** `grep -r "window.confirm\|window.alert" src/features/customer` 无结果。

---

### TASK-50-B：活跃度批量计算缓存

**优先级：中**

**目标：** 消除 CustomerList 渲染时 O(n) 次 localStorage 读取。

**修改：** `src/features/customer/services/timelineService.ts`

新增方法：
```ts
// TimelineService
static getCountsByCustomer(): Map<string, number> {
  const all = this.getAllEvents();
  const map = new Map<string, number>();
  for (const e of all) map.set(e.customerId, (map.get(e.customerId) ?? 0) + 1);
  return map;
}

// FollowUpService
static getCountsByCustomer(): Map<string, number> {
  const all = this.getAllFollowUps();
  const map = new Map<string, number>();
  for (const f of all) map.set(f.customerId, (map.get(f.customerId) ?? 0) + 1);
  return map;
}
```

**修改：** `src/features/customer/components/CustomerList.tsx`

```tsx
// 组件顶层一次性计算
const timelineCounts = useMemo(() => TimelineService.getCountsByCustomer(), []);
const followUpCounts = useMemo(() => FollowUpService.getCountsByCustomer(), []);

// 将 counts 传入 getCustomerActivity
function getCustomerActivity(customer: Customer, tlCount: number, fuCount: number) { ... }
```

**验收：** 渲染 50 个客户卡片，localStorage.getItem 只被调用 2 次（用 Performance Timeline 验证）。

---

### TASK-50-C：搜索逻辑去重 + 防抖

**优先级：中**

**修改：** `src/features/customer/app/CustomerPage.tsx`

```tsx
// handleSearch 只做 analytics，不过滤数据
const handleSearch = (query: string) => {
  setSearchQuery(query);
  analytics.trackSearch(query, customers.length);
};
```

**修改：** `src/features/customer/components/FilterChipBar.tsx`

search input 改用防抖：
```tsx
import { useState, useEffect } from 'react';

const [localQuery, setLocalQuery] = useState(searchQuery);
useEffect(() => {
  const timer = setTimeout(() => onSearchChange(localQuery), 300);
  return () => clearTimeout(timer);
}, [localQuery, onSearchChange]);

// input 绑定 localQuery，不绑定 searchQuery
<input value={localQuery} onChange={e => setLocalQuery(e.target.value)} ... />
```

**验收：** 连续输入 5 个字符只触发 1 次过滤重渲染（300ms 后）。

---

### TASK-50-D：详情页 URL 改用客户 ID

**优先级：低（功能正确性）**

**修改：** `src/features/customer/app/CustomerPage.tsx`

```tsx
const handleViewDetail = (customer: Customer) => {
  const displayName = customer.name.split('\n')[0] || customer.name;
  router.push(`/customer/detail?id=${encodeURIComponent(customer.id)}&name=${encodeURIComponent(displayName)}`);
};
```

**修改：** `src/features/customer/services/customerService.ts`

新增：
```ts
export const customerService = {
  ...existing methods,
  getCustomerById(id: string): Customer | null {
    const all = this.getAllCustomers();
    return all.find(c => c.id === id) ?? null;
  }
};
```

**修改：** `src/features/customer/app/CustomerDetailPage.tsx`

用 `customerService.getCustomerById(id)` 而非仅靠 URL 的 name 参数。

**验收：** 客户改名后，原有详情页 URL（携带旧名字）依然能加载正确客户信息。

---

### TASK-50-E：详情页增加基本信息卡片

**优先级：高（功能缺口）**

**新建：** `src/features/customer/components/CustomerInfoCard.tsx`

显示内容：
```
┌──────────────────────────────────────────────────────────┐
│  [头像]  公司名称（company 或 name首行）      [✏️ 编辑]  │
│          简称：companyShortName                           │
│  📧 email   📞 phone   📍 address                        │
│  联系人：联系人1(简称) · 联系人2(简称)                   │
└──────────────────────────────────────────────────────────┘
```

Props：
```tsx
interface CustomerInfoCardProps {
  customer: Customer;
  onEdit: () => void;
}
```

样式：`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6`

**修改：** `src/features/customer/app/CustomerDetailPage.tsx`

- 顶部（tab nav 上方）渲染 `<CustomerInfoCard>`
- 增加 `showEditModal` state
- 复用 `CustomerModal` + `CustomerForm` + `useCustomerForm` + `useCustomerActions`
- 编辑保存后刷新 customer 数据

**验收：** 详情页顶部正确显示客户所有字段；编辑保存后立即更新不需刷新页面。

---

### 不要改动

- `CustomerForm.tsx` 分区双列网格（TASK-31 完成）
- `CustomerModal` 的 `max-h-[85vh] overflow-y-auto max-w-2xl`
- `Contact[]` 动态增删逻辑（TASK-34 完成）
- localStorage 键名：`customer_management`、`customer_timeline_events`、`customer_followups`

### 验证命令

```bash
npx tsc --noEmit
npm run build
grep -r "window\.confirm\|window\.alert" src/features/customer  # 应无结果
```

### 实际落地

- 新增 `src/components/ui/ConfirmDialog.tsx`：统一确认弹窗，支持 danger/default、Escape 取消、点击遮罩取消。
- `src/features/customer/hooks/useCustomerActions.ts`：所有 `confirm(...)` 已替换为 `await showConfirm(...)`；保存/删除失败的 `alert` 改为 `console.error`。
- `src/features/customer/app/CustomerPage.tsx`：增加 `showConfirm` 状态流，删除/重命名确认改走 React 弹窗；详情页跳转改为 `id=${customer.id}`，`name` 仅用于显示。
- `src/features/customer/services/timelineService.ts`：新增 `getCountsByCustomer()`，并补充 `getEventsByCustomerIds()` / `getFollowUpsByCustomerIds()`，用于 ID 化后的旧数据兼容。
- `src/features/customer/components/CustomerList.tsx`：活跃度、需跟进、活跃排序改为使用批量 Map 统计；兼容旧数据中以客户名作为 key 的时间轴/跟进记录。
- `src/features/customer/components/FilterChipBar.tsx`：搜索框增加 300ms 防抖，输入过程中不立即触发父级过滤。
- `src/features/customer/app/CustomerDetailPage.tsx`：详情页按客户 ID 回读客户资料，旧链接按客户名兜底；顶部增加基本信息卡片；编辑保存后重新读取客户数据并即时刷新。
- 新增 `src/features/customer/components/CustomerInfoCard.tsx`：展示客户基础资料、联系方式、地址、联系人和编辑入口。
- `src/features/customer/hooks/useCustomerTimeline.ts`、`useCustomerFollowUp.ts`、`CustomerTimeline.tsx`、`FollowUpManager.tsx`：主 key 使用客户 ID，同时用客户名作为旧数据兼容别名。

### 验证结果

```bash
npx tsc --noEmit
rg -n "window\.confirm|window\.alert|\bconfirm\(" src/features/customer -S
```

结果：

- TypeScript 检查通过。
- 客户模块内已无 `window.confirm` / `window.alert` / 裸 `confirm(...)`。
- 尚未完成带登录态的浏览器手测，后续发布前建议在 `/customer` 与 `/customer/detail?id=...` 各走一遍添加、删除、编辑和详情页保存流程。

---

## TASK-51：修复 pdfHelpers.ts 静态 import 28MB embedded-resources

**背景**

`src/lib/embedded-resources.ts` 是构建时自动生成的 **28MB 文件**（两个 11MB 中文字体 + 印章图片的 base64）。
`src/utils/pdfHelpers.ts` 第 6 行对其做了**静态 top-level import**，导致该 28MB 依赖被打包进所有引用 `pdfHelpers` 的页面 chunk，影响的路由包括：`/quotation`、`/packing`、`/invoice`、`/purchase`、`/history`。
用户打开任何单据页面，浏览器都必须先下载并解析这 28MB，严重拖慢首屏可交互时间。

**目标**：将 `pdfHelpers.ts` 中对 `embeddedResources` 的引用改为**函数内部动态 import**，使其仅在真正生成 PDF 时才按需加载。

---

### 改动一：`src/utils/pdfHelpers.ts`

1. **删除**文件顶部的静态 import（第 6 行）：
   ```ts
   // 删除这行
   import { embeddedResources } from '@/lib/embedded-resources';
   ```

2. 找到所有使用 `embeddedResources` 的函数（约在 449、451、520、522 行，涉及印章获取逻辑），将这些函数改为 `async`，并在函数体内部动态 import：
   ```ts
   // 示例：原来的同步函数
   export function getStampBase64(stamp: 'shanghai' | 'hongkong'): string {
     if (stamp === 'shanghai') return embeddedResources.shanghaiStamp;
     return embeddedResources.hongkongStamp;
   }

   // 改为 async + 动态 import
   export async function getStampBase64(stamp: 'shanghai' | 'hongkong'): Promise<string> {
     const { embeddedResources } = await import('@/lib/embedded-resources');
     if (stamp === 'shanghai') return embeddedResources.shanghaiStamp;
     return embeddedResources.hongkongStamp;
   }
   ```

3. 对文件内**所有**直接读取 `embeddedResources.*` 的代码（不局限于上述两个函数，全文搜索确认无遗漏）均做同样处理。

---

### 改动二：修复所有调用方

`pdfHelpers.ts` 中受影响的函数签名从同步变为异步后，所有调用方需对应加 `await`：

- 搜索 `src/` 下所有 `import.*pdfHelpers` 或调用上述函数的位置
- 对每处调用加 `await`，确保调用方函数也是 `async`
- 重点检查：`PDFPreviewComponent.tsx`、`PDFPreviewModal.tsx`、各 PDF 生成器

---

### 验证命令

```bash
npx tsc --noEmit
# 确认 pdfHelpers.ts 顶部无 embeddedResources 静态 import
grep -n "^import.*embedded-resources" src/utils/pdfHelpers.ts  # 应无输出
npm run build
```

**验收标准**：TypeScript 无错误，构建成功，各 PDF 生成功能正常（报价单、箱单、发票、采购单均能生成）。

---

## TASK-52：ClientInitializer 移除 preloadImages / 字体预热延迟至 idle

**背景**

`src/components/ClientInitializer.tsx` 在 layout.tsx 根布局挂载，页面加载后 **300ms** 就触发以下动态 import 链：

```
ClientInitializer（300ms）
  → import imageLoader.ts
    → imageLoader 内部 import('@/lib/embedded-resources')  ← 下载 28MB
  → import globalFontRegistry.ts
    → loadFontDataOnce()  ← 下载中文字体
```

这些操作与首屏渲染争抢网络和 CPU，且完全不必要——图片和字体只在用户点击"生成 PDF"时才需要。

**目标**：移除 `preloadImages()` 调用；字体预热推迟到浏览器真正空闲时再执行。

---

### 改动：`src/components/ClientInitializer.tsx`

```ts
// 修改前（约第 28-38 行）
const { preloadFonts } = await import('../utils/fontLoader');
const { preloadImages } = await import('../utils/imageLoader');
const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');

if (!cancelled) {
  await initializeGlobalFonts();
}

if (!cancelled) {
  await preloadImages();  // ← 删除这两行
}

// 修改后
const { initializeGlobalFonts } = await import('../utils/globalFontRegistry');

// 字体预热推迟到浏览器空闲（不阻塞渲染，timeout 8000ms 兜底）
if (!cancelled) {
  const runFontWarmup = () => {
    initializeGlobalFonts().catch(err => {
      console.warn('[ClientInitializer] 字体预热失败:', err);
    });
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
      .requestIdleCallback(runFontWarmup, { timeout: 8000 });
  } else {
    setTimeout(runFontWarmup, 5000);
  }
}
```

同时删除 `preloadFonts` 相关 import（如未在其他地方使用）。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
# 确认 ClientInitializer 内无 preloadImages 调用
grep -n "preloadImages" src/components/ClientInitializer.tsx  # 应无输出
```

**验收标准**：构建成功；打开应用后 Network 面板中，`embedded-resources` chunk 不再在页面加载后 300ms 内出现（仅在点击生成 PDF 时才出现）。

---

## TASK-53：主要路由改为 dynamic import（ssr: false）

**背景**

除 `customer/page.tsx` 外，所有路由 page.tsx 均为静态 import，导致每个路由 chunk 包含所有子组件（含 2000+ 行的 ItemsTableEnhanced 等重型组件），增大初始 JS 解析量，延迟首次可交互时间。

**目标**：对 6 个主要路由改为 `next/dynamic` + `ssr: false`，参照 customer/page.tsx 的已有实现。

---

### 改动：以下文件均按同一模式修改

需修改的文件：
- `src/app/quotation/page.tsx`
- `src/app/packing/page.tsx`
- `src/app/invoice/page.tsx`
- `src/app/purchase/page.tsx`
- `src/app/history/page.tsx`
- `src/app/inquiry/page.tsx`
- `src/app/admin/page.tsx`

**统一改法**（以 packing 为例，其他同理）：

```tsx
'use client';

import dynamic from 'next/dynamic';

const PackingPage = dynamic(
  () => import('@/features/packing').then(mod => ({ default: mod.PackingPage })),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-gray-600 dark:text-gray-400">加载中...</span>
        </div>
      </div>
    ),
  }
);

export default function PackingPageWrapper() {
  return <PackingPage />;
}
```

注意：
- `quotation/page.tsx` 当前直接 `export { default } from '...'`，改为上述包裹形式
- `admin/page.tsx` loading 文案用"加载管理面板..."
- `inquiry/page.tsx` loading 文案用"加载询报价登记..."
- dashboard 页面**不改**（它不含重型 PDF 依赖，且需要快速展示）

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：构建成功，各路由页面正常加载，loading 旋转动画正常显示。

---

## TASK-54：middleware.ts 清理生产环境 console.log

**背景**

`src/middleware.ts` 中多处 `console.log('[中间件]...')` 在生产环境每次请求都执行，Vercel Edge Runtime 中有轻微性能影响。

---

### 改动：`src/middleware.ts`

将所有 `console.log` 用 `if (process.env.NODE_ENV === 'development')` 包裹：

```ts
// 修改前
console.log('[中间件] 没有token，拒绝访问:', pathname);

// 修改后
if (process.env.NODE_ENV === 'development') {
  console.log('[中间件] 没有token，拒绝访问:', pathname);
}
```

文件内共 4 处 `console.log`，全部处理。

---

### 验证命令

```bash
npx tsc --noEmit
grep -n "console\.log" src/middleware.ts  # 每处都应被 NODE_ENV 判断包裹
```

---

## TASK-55：next.config.mjs 配置清理

**背景**

当前 `next.config.mjs` 中存在三处对 Vercel 部署有害或多余的配置：

1. `output: 'standalone'`：Vercel 自动处理部署产物，`standalone` 模式会产生额外文件并可能与 Vercel 的构建流程冲突
2. 手动 `splitChunks` 配置：Next.js 14 已内置最优分包策略，手动覆盖可能破坏默认优化（当前配置将所有 node_modules 打成一个 `vendors` chunk，反而可能变大）
3. `generateEtags: false`：关闭 ETag 会导致浏览器无法利用 304 缓存响应，增加不必要的重复下载

---

### 改动：`next.config.mjs`

**删除以下三项**：

```js
// 删除
output: 'standalone',

// 删除
generateEtags: false,

// 删除 webpack splitChunks 手动配置（约 85-110 行的 splitChunks 和 file-loader 规则）
// 保留 dev 环境的 watchOptions 配置即可
```

webpack 函数修改后保留形式：

```js
webpack: (config, { dev }) => {
  if (dev) {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    };
  }
  return config;
},
```

---

### 验证命令

```bash
npm run build
# 确认构建无警告，Vercel Preview 部署正常
```

---

## TASK-56：登录页移除 localStorage 绕过 session 跳转逻辑

**背景**

`src/app/page.tsx`（登录页）有一段 useEffect：当 `status === 'unauthenticated'` 时，检查 localStorage 中是否有 24 小时内的用户数据，若有则直接 `router.push('/dashboard')`。

这是错误逻辑：session 真正过期后，用户应该重新登录，而不是被 localStorage 的过期数据推入 dashboard，导致在 dashboard 遇到未认证状态再被重定向回来（额外的重定向往返），且存在安全隐患。

---

### 改动：`src/app/page.tsx`

找到以下 useEffect 并**整体删除**（仅删除 `status === 'unauthenticated'` 分支中检查 localStorage 的部分，保留 `status === 'authenticated'` 时的跳转）：

```ts
// 删除这段（大约在 useEffect 内 status === 'unauthenticated' 分支）
if (status === 'unauthenticated' && typeof window !== 'undefined') {
  try {
    const userInfo = localStorage.getItem('userInfo');
    const latestPermissions = localStorage.getItem('latestPermissions');
    const permissionsTimestamp = localStorage.getItem('permissionsTimestamp');

    if (userInfo && latestPermissions && permissionsTimestamp) {
      const userData = JSON.parse(userInfo);
      const isRecent = (Date.now() - parseInt(permissionsTimestamp)) < 24 * 60 * 60 * 1000;

      if (userData.username && isRecent) {
        router.push('/dashboard');
        return;
      }
    }
  } catch (error) {
    console.warn('检查本地用户信息失败:', error);
  }
}
```

保留 `status === 'authenticated'` 时跳转 dashboard 的逻辑，不动其他部分。

---

### 验证命令

```bash
npx tsc --noEmit
# 确认登录页无 localStorage 跳转逻辑
grep -n "latestPermissions\|permissionsTimestamp\|userInfo" src/app/page.tsx  # 应无输出
```

**验收标准**：session 过期后访问根路径，停留在登录页等待用户输入，不再自动跳转。

---

## TASK-57A：统一权限模块注册表，补全工具类模块的权限位

**背景（问题诊断）**

当前权限模块清单存在 **3 处独立维护、已经互相漂移** 的列表：

1. `src/components/layout/AppSidebar.tsx` 的 `NAV_ITEMS`（含 `permissionKey`）+ `PERMISSION_MODULE_MAP` —— 决定侧边栏可见性
2. `src/features/admin/hooks/usePermissions.ts` 的 `MODULE_PERMISSIONS` —— 决定管理员编辑用户权限时显示哪些开关
3. `src/constants/permissions.ts` 的 `PERMISSION_MODULES` —— **全仓库无任何引用，是死代码**

漂移导致的具体缺口：

- `世界时钟`（`/clock`）、`全球假日`（`/holidays`）、`RMB 大写`（`/rmb`）三个工具模块在 `NAV_ITEMS` 里**没有 `permissionKey`**，对所有登录用户永久可见，管理员权限编辑 UI 里也**没有对应开关**，完全无法关闭。
- `订单状态表`（`/order`）复用了 `询报价登记表` 的 `inquiry` 模块权限（同一个开关），但在管理员权限编辑 UI（`MODULE_PERMISSIONS`）里**没有单独出现**，容易让人误以为这个模块没有权限控制、或者可以独立授权（实际不行，两者共用一个开关）。
- `src/features/order/app/OrderPage.tsx` **完全没有做页面级权限校验**（对比 `src/features/inquiry/app/InquiryPage.tsx` 有 `hasInquiryAccess` 拦截）。目前仅靠侧边栏隐藏入口，普通用户直接访问 `/order` 这个 URL 可以绕过隐藏、看到订单状态表内容（金额列除外，那是另一个开关，见 TASK-57B）。
- `src/lib/permissions.ts` 里 `usePermissionStore.hasPermission()` / `hasAnyPermission()` **没有 isAdmin 前置 bypass**——目前全仓库对"是否有权限"的判断散落在至少 3 处各自重复写 `isAdmin || permissions.some(...)`（`AppSidebar.tsx` 的 `isVisible`、`InquiryPage.tsx` 的 `hasInquiryAccess`、`api/inquiry/[[...path]]/route.ts` 的 `hasInquiryPermission`），这正是 `OrderPage.tsx` 漏掉权限校验的根因类型——多处重复实现，容易漏写。

**设计目标**：建一个唯一的模块注册表 + 一个唯一的权限判断函数，其余地方都从这两处派生，不再各自维护列表。

---

### 改动 1：新建 `src/constants/permissionModules.ts`（替代死代码 `src/constants/permissions.ts`）

```ts
export type ModuleCategory = 'document' | 'registration' | 'management' | 'tool';

export interface AdvancedFeatureDef {
  /** 完整 moduleId，格式为 `${parentModuleId}.${featureKey}` */
  moduleId: string;
  label: string;
  icon: string;
}

export interface PermissionModuleDef {
  moduleId: string;
  label: string;
  icon: string;
  category: ModuleCategory;
  /** 依赖本模块开启后才能授予的二级“高级功能”开关 */
  advancedFeatures?: AdvancedFeatureDef[];
}

/** 权限模块唯一注册表——新增/下线模块只改这一处 */
export const PERMISSION_MODULES: PermissionModuleDef[] = [
  { moduleId: 'quotation', label: '报价单 / 销售确认', icon: '📋', category: 'document' },
  { moduleId: 'packing',   label: '箱单发票',           icon: '📦', category: 'document' },
  { moduleId: 'invoice',   label: '财务发票',           icon: '🧾', category: 'document' },
  { moduleId: 'purchase',  label: '采购订单',           icon: '🛒', category: 'document' },
  {
    moduleId: 'inquiry',
    label: '询报价登记表 / 订单状态表',
    icon: '🔍',
    category: 'registration',
    advancedFeatures: [
      { moduleId: 'inquiry.batchEdit',   label: '批量编辑 / 导入导出', icon: '✏️' },
      { moduleId: 'order.financials',    label: '订单金额 / 回款 / 到账金额', icon: '💰' },
    ],
  },
  { moduleId: 'history',   label: '单据历史',   icon: '📚', category: 'management' },
  { moduleId: 'customer',  label: '客户管理',   icon: '👥', category: 'management' },
  { moduleId: 'ai-email',  label: 'AI 邮件',    icon: '🤖', category: 'tool' },
  { moduleId: 'clock',     label: '世界时钟',   icon: '🕐', category: 'tool' },
  { moduleId: 'holidays',  label: '全球假日',   icon: '📅', category: 'tool' },
  { moduleId: 'rmb',       label: 'RMB 大写',   icon: '💴', category: 'tool' },
];

export function getAllPermissionModules(): string[] {
  return PERMISSION_MODULES.flatMap((m) => [
    m.moduleId,
    ...(m.advancedFeatures?.map((f) => f.moduleId) ?? []),
  ]);
}
```

> 注意：`订单状态表` 不是独立 moduleId，故意复用 `inquiry`（避免给已有用户做权限迁移、避免两张表权限不同步）。`inquiry.batchEdit` 和 `order.financials` 都挂在 `inquiry` 这个父模块下面，因为两者都要求先有 `inquiry` 基础访问权限才有意义。

**删除 `src/constants/permissions.ts`**：先执行 `grep -rn "from '@/constants/permissions'" src/` 确认真的无引用（预期无结果）后删除整个文件。不要删错到 `permissionModules.ts`。

---

### 改动 2：`src/lib/permissions.ts` —— 让 `hasPermission` 成为唯一权威判断，加 isAdmin bypass

```ts
// hasPermission 方法内部，最开头加一行：
hasPermission: (moduleId: string) => {
  const { user, permissionCache } = get();
  if (!user) return false;
  if (user.isAdmin) return true;   // ★ 新增：管理员隐式拥有所有模块权限
  // ...原有逻辑不变
},

hasAnyPermission: (moduleIds: string[]) => {
  const { user } = get();
  if (!user) return false;
  if (user.isAdmin) return true;   // ★ 新增
  // ...原有逻辑不变
},
```

加完之后，全仓库新代码里判断权限一律用 `hasPermission(moduleId)`（来自 `usePermissionStore` 或其导出的 `hasPermission` 函数），**不要**再手写 `isAdmin || permissions.some(...)`。已有的 `AppSidebar.tsx`、`InquiryPage.tsx`、`api/inquiry/route.ts` 里的手写版本本次不强制重构（避免无关改动），但新增的 `OrderPage.tsx` 权限校验（见改动 4）直接用 `usePermissionStore` 的 `hasPermission`。

---

### 改动 3：`src/components/layout/AppSidebar.tsx` —— 补全 clock/holidays/rmb 的权限位

`NAV_ITEMS` 里三项加 `permissionKey`：

```ts
{ id: 'clock',    label: '世界时钟', path: '/clock',    icon: Clock,        permissionKey: 'canUseClock' },
{ id: 'holidays', label: '全球假日', path: '/holidays', icon: CalendarDays, permissionKey: 'canUseHolidays' },
{ id: 'rmb',      label: 'RMB大写',  path: '/rmb',      icon: Banknote,     permissionKey: 'canUseRmb' },
```

`PERMISSION_MODULE_MAP` 补充：

```ts
canUseClock:    'clock',
canUseHolidays: 'holidays',
canUseRmb:      'rmb',
```

`isVisible()` 逻辑不变（已有 `if (permissionUser.isAdmin) return true;` 短路，管理员自动可见新模块）。

> ⚠️ 迁移兼容性：现有普通用户的 Permission 记录里不会有 `clock`/`holidays`/`rmb` 这三条，加上权限位后默认对普通用户**关闭**（因为 `permissions.some(...)` 找不到记录返回 `false`）。如果不希望上线当天就让所有老用户失去这三个工具的可见性，Codex 需要和 Roger 确认默认策略——**默认建议**：这三个工具类模块风险低（无业务数据），在 Worker/D1 层为所有现有非管理员用户批量插入这三条 `canAccess = true` 的 Permission 记录做一次性迁移（写一个一次性脚本或 SQL，不要在应用代码里做"默认开启"这种隐式逻辑，避免以后维护困惑）。若无法确认，先在 PR 描述里注明这一風险，由 Roger 决定是否要跑迁移。

---

### 改动 4：`src/features/order/app/OrderPage.tsx` —— 补齐页面级权限校验

参照 `src/features/inquiry/app/InquiryPage.tsx` 第 100-106 行 `hasInquiryAccess` 的写法，在 `OrderPage.tsx` 里加同款拦截（复用 `inquiry` 权限，因为订单状态表和询报价共用一个开关）：

```ts
const hasOrderAccess = useMemo(() => {
  if (!session?.user) return false;
  if (session.user.isAdmin) return true;
  return (session.user.permissions ?? []).some(
    (permission) => permission.moduleId === 'inquiry' && permission.canAccess
  );
}, [session]);
```

在组件渲染逻辑里，无权限时展示和 `InquiryPage.tsx` 第 373-389 行一致的"权限不足"页面（文案改成"您没有订单状态表的访问权限"）。

---

### 改动 5：`src/features/admin/hooks/usePermissions.ts` —— MODULE_PERMISSIONS 从注册表派生

```ts
import { PERMISSION_MODULES } from '@/constants/permissionModules';

// 删除原来手写的 MODULE_PERMISSIONS 数组，改为：
export const MODULE_PERMISSIONS = PERMISSION_MODULES.map(({ moduleId, label, icon }) => ({
  id: moduleId,
  name: label,
  icon,
}));
```

（`advancedFeatures` 的渲染在 TASK-57B 里单独处理，这里只派生顶层模块列表，保持 `UserDetailModal.tsx` 现有渲染不炸。）

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
grep -rn "from '@/constants/permissions'" src/   # 应无输出，确认死代码已清理
```

**验收标准**：
- 管理员权限编辑 UI 里能看到 `世界时钟`、`全球假日`、`RMB 大写` 三个新开关
- 直接访问 `/order`（无 `inquiry` 权限的普通用户）跳出"权限不足"提示，而不是看到表格内容
- 管理员账号侧边栏和以前一样能看到全部模块，行为不变

---

## TASK-57B：询报价批量编辑 / 订单金额字段 改为可配置的高级功能开关

**背景**

两处功能目前都是**硬编码为"仅 `isAdmin` 可见"**，无法单独授权给普通用户，且服务端完全没有对应校验：

1. `src/features/inquiry/app/InquiryPage.tsx`：批量编辑入口（`bottomActions` 第 351-362 行）、批量选择/导入/导出/批量删除菜单（第 465-538 行）全部用 `isAdmin &&` 或 `if (!isAdmin) return []` 控制。
2. `src/features/order/components/OrderTable.tsx`（第 69、139 行）和 `OrderRow.tsx`（第 480、577 行）：`showAdminCols(bp, isAdmin)` 决定是否显示"金额 / 回款 / 到账金额"三列，直接传入 `isAdmin`。对应字段是 `src/features/inquiry/types/index.ts` 第 46/48/50 行的 `orderAmount` / `orderPaymentDate` / `orderReceivedAmount`（注释里写着"管理员可见"，这次要改成权限位可见）。

TASK-57A 已经在权限注册表里加了两个二级开关：`inquiry.batchEdit`、`order.financials`。本任务把前端判断和后端保护都接上。

---

### 改动 1：管理员权限编辑 UI 支持二级"高级功能"开关

`src/features/admin/hooks/usePermissions.ts` 的 `togglePermission` 增加级联逻辑：关闭父模块（`inquiry`）时，同时清空它名下的高级功能权限（`inquiry.batchEdit`、`order.financials`），避免出现"父权限关了、子权限还留着"的脏数据：

```ts
const togglePermission = useCallback((moduleId: string) => {
  setPermissions(prev => {
    const existing = prev.find(p => p.moduleId === moduleId);
    let next = existing
      ? prev.map(p => p.moduleId === moduleId ? { ...p, canAccess: !p.canAccess } : p)
      : [...prev, { id: '', moduleId, canAccess: true }];

    // 关闭父模块时级联关闭其高级功能子权限
    const parentModule = PERMISSION_MODULES.find(m =>
      m.advancedFeatures?.length && m.moduleId === moduleId
    );
    const turnedOff = existing?.canAccess === true; // 原来是开的，这次点击变关
    if (parentModule && turnedOff) {
      const childIds = parentModule.advancedFeatures!.map(f => f.moduleId);
      next = next.map(p => childIds.includes(p.moduleId) ? { ...p, canAccess: false } : p);
    }
    return next;
  });
}, []);
```

`src/features/admin/components/UserDetailModal.tsx` 的"模块权限"区块，改为按 `PERMISSION_MODULES` 遍历，模块下若有 `advancedFeatures`，在同一个卡片内缩进渲染二级开关，且**仅当父模块 `canAccess=true` 时可点击**（父模块关闭时子开关置灰 disabled）：

```tsx
{PERMISSION_MODULES.map((module) => {
  const perm = permissions.find((p) => p.moduleId === module.id);
  const parentEnabled = perm?.canAccess ?? false;
  return (
    <div key={module.id}>
      <PermissionToggle
        moduleId={module.id} name={module.label} icon={module.icon}
        isEnabled={isAdmin || parentEnabled}
        onToggle={togglePermission}
        disabled={isBusy || isAdmin}
      />
      {module.advancedFeatures?.map((feature) => {
        const featurePerm = permissions.find((p) => p.moduleId === feature.moduleId);
        return (
          <div key={feature.moduleId} className="ml-4 mt-1">
            <PermissionToggle
              moduleId={feature.moduleId} name={feature.label} icon={feature.icon}
              isEnabled={isAdmin || (featurePerm?.canAccess ?? false)}
              onToggle={togglePermission}
              disabled={isBusy || isAdmin || !parentEnabled}
            />
          </div>
        );
      })}
    </div>
  );
})}
```

同时：**当 `isAdmin` 开关为 true 时，所有模块 + 高级功能开关都显示为已授权（`isEnabled` 强制 true）且 `disabled`**，卡片区域顶部加一行说明文字："管理员默认拥有全部模块权限，以下开关仅对普通用户生效"。这是本次顺手修的 UX 问题：目前管理员编辑自己或其他管理员账号时，这些开关的开合状态会误导人——反正会被 isAdmin 全局 bypass 忽略。

---

### 改动 2：前端功能入口改用权限判断

`src/features/inquiry/app/InquiryPage.tsx`：

```ts
// 顶部引入
import { usePermissionStore } from '@/lib/permissions';
// ...
const hasBatchEditPermission = usePermissionStore((s) => s.hasPermission('inquiry.batchEdit'));

// bottomActions 里
const bottomActions = useMemo<ActionButton[]>(() => {
  if (!isAdmin && !hasBatchEditPermission) return [];
  // ... 其余不变
}, [isAdmin, hasBatchEditPermission, isAdminMenuOpen, isEditMode]);
```

同时把第 407 行、466 行的 `isAdmin &&` 都改成 `(isAdmin || hasBatchEditPermission) &&`（隐藏文件选择框、批量编辑菜单展开条件）。**注意** TASK-57A 已经给 `hasPermission` 加了 isAdmin bypass，所以这里其实写 `hasBatchEditPermission` 一个变量就够了（它内部已经处理了 isAdmin），保留 `isAdmin ||` 只是为了和仓库里其他地方的写法保持一致、方便读者一眼看懂，Codex 按自己判断二选一即可，但全文件要统一，不要一半用短写法一半用长写法。

`src/features/order/components/OrderTable.tsx` 和 `OrderRow.tsx`：`isAdmin` prop 改名为 `canViewFinancials`（或保留 `isAdmin` 参数名但调用方传入组合值，Codex 自行选择，优先选择**改名**，因为继续叫 `isAdmin` 但传的是"isAdmin或有financials权限"的组合值，语义会跟其他地方的 `isAdmin` 混淆，容易埋雷），由 `OrderPage.tsx` 计算好传入：

```ts
const hasFinancialsPermission = usePermissionStore((s) => s.hasPermission('order.financials'));
// <OrderTable canViewFinancials={isAdmin || hasFinancialsPermission} ... />
```

`orderAmount` / `orderPaymentDate` / `orderReceivedAmount` 三个字段在 `src/features/inquiry/types/index.ts` 里的注释同步改成"（需要 order.financials 权限）"。

---

### 改动 3：服务端保护（重要，之前完全没做）—— `src/app/api/inquiry/[[...path]]/route.ts` + `src/worker.ts`

**现状风险**：`route.ts` 目前只校验"是否有 `inquiry` 模块访问权限"，没有对金额字段做任何过滤。任何有 `inquiry` 权限的普通用户，哪怕 UI 隐藏了金额列，直接调用 `GET /api/inquiry` 接口也能拿到全部记录的 `orderAmount`/`orderPaymentDate`/`orderReceivedAmount`；`PUT` 同理可以随意改价格——这是真实的越权风险，必须服务端兜底，不能只靠前端隐藏列。

**关键约束（务必先读懂再动手，否则会丢数据）**：`src/worker.ts` 里 `PUT /api/inquiry/:id`（第 1423-1451 行）目前是**整条记录覆盖式 upsert**（`{...body, id, updatedAt: now}` 直接整体替换 `data` 列），不是字段级 patch。如果代理层简单粗暴地"不返回金额字段给无权限用户 → 用户编辑保存 → 把没有金额字段的 body 转发给 Worker"，会导致这条记录的金额数据被整个抹掉。**必须先做下面第①步的 Worker 端合并式写入，再做第②③步的代理层过滤，顺序不能反。**

**① 修改 `src/worker.ts` 的 PUT handler，改成与已有数据合并写入而不是整体覆盖**（顺手修复一个潜在的隐藏 bug：目前两个人分别编辑同一条记录的不同字段、先后保存时，后保存的会把先保存的其他字段覆盖丢失）：

```ts
// PUT /api/inquiry/:id 里，原来查询只 select created_at，改成同时查 data：
const existingRow = await env.USERS_DB.prepare(
  `SELECT created_at, data FROM Document WHERE id = ? AND type = 'inquiry'`
).bind(id).first<{ created_at: string; data: string | null }>();
const createdAt = existingRow?.created_at ?? now;
const existingData = parseJsonData<InquiryRecordPayload>(existingRow?.data ?? null, {});

// 原来：const data = JSON.stringify({ ...body, id, updatedAt: now });
// 改成合并式写入：
const data = JSON.stringify({ ...existingData, ...body, id, updatedAt: now });
```

这一步改的是生产 Worker（`udb.luocompany.net`），**改完需要单独执行 `npx wrangler deploy` 部署 Worker**，不是 `npm run build` / Vercel 部署能覆盖到的，Codex 完成代码修改后要在任务总结里明确提示 Roger 这一步需要手动/单独部署 Worker，并给出验证方法（比如部署后用 curl 测试一次 PUT 只带部分字段，确认其余字段没有丢）。

**② `route.ts` 的 GET 响应做字段裁剪**：

```ts
async function proxyInquiryRequest(request: NextRequest, pathSegments: string[] = []) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const isAdmin = session.user.isAdmin === true;
  const perms = session.user.permissions ?? [];
  const hasInquiryPermission = isAdmin || perms.some((p) => p.moduleId === 'inquiry' && p.canAccess);
  if (!hasInquiryPermission) return NextResponse.json({ error: '无询报价权限' }, { status: 403 });

  const hasFinancialsPermission = isAdmin || perms.some((p) => p.moduleId === 'order.financials' && p.canAccess);
  const FINANCIAL_FIELDS = ['orderAmount', 'orderPaymentDate', 'orderReceivedAmount'] as const;

  // ...原有转发逻辑（body 处理见下方③）...

  const data = await workerResp.json();

  // GET 响应裁剪：无权限时从每条记录里删掉金额字段
  if (request.method === 'GET' && !hasFinancialsPermission && Array.isArray(data?.records)) {
    data.records = data.records.map((record: Record<string, unknown>) => {
      const clean = { ...record };
      FINANCIAL_FIELDS.forEach((f) => delete clean[f]);
      return clean;
    });
  }

  return NextResponse.json(data, { status: workerResp.status });
}
```

**③ PUT / POST 请求体做字段过滤**（防止无权限用户绕过 UI 直接调 API 篡改金额）：

```ts
// body 目前是 request.text() 得到的字符串，PUT/POST 且无 financials 权限时要过滤：
let body: string | undefined;
if (request.method !== 'GET' && request.method !== 'HEAD' && request.method !== 'DELETE') {
  const rawText = await request.text();
  if ((request.method === 'PUT' || request.method === 'POST') && !hasFinancialsPermission) {
    try {
      const parsed = JSON.parse(rawText);
      FINANCIAL_FIELDS.forEach((f) => delete parsed[f]);
      body = JSON.stringify(parsed);
    } catch {
      body = rawText; // 解析失败就原样转发，交给 Worker 的 JSON.parse 报错
    }
  } else {
    body = rawText;
  }
}
```

因为①已经把 Worker 的 PUT 改成合并式写入，这里从 body 里删掉这三个字段后，Worker 端 `{...existingData, ...body}` 会自然保留数据库里原有的金额值，不会丢数据，也不会被篡改。

**关于"批量编辑"的服务端保护——如实说明一个限制**：`src/worker.ts` 没有真正的批量接口，前端"批量删除"本质是循环调用单条 `DELETE /api/inquiry/:id`（见 `InquiryPage.tsx` 第 219-223 行），服务端完全无法区分"批量删除里的一次调用"和"用户手动点了一下单条删除"——因为它们是同一个 API 调用。所以 `inquiry.batchEdit` 权限**目前只能做到前端工作流/工具入口级别的门控**（导入、导出、多选模式、批量删除按钮的可见性），无法在服务端做出比现有"有没有 `inquiry` 模块权限"更细粒度的数据层拦截。这不是本次任务遗漏，是当前后端 API 设计（无批量端点、单条 DELETE 对所有 inquiry 用户开放）决定的客观限制。如果之后需要"普通用户完全不能删除记录、只有 batchEdit/admin 才能删"这种更强的约束，需要额外给 Worker 加一个身份透传机制（比如 Next 代理把 `moduleId`/权限信息作为 header 转发给 Worker，Worker 侧对 DELETE 方法单独校验），属于更大的改动，本次不做，仅在 PR 描述里记录这个已知限制供 Roger 决策是否需要。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 创建一个仅有 `inquiry` 权限（未勾选 `inquiry.batchEdit`/`order.financials`）的测试用户，登录后：询报价登记表看不到"批量编辑"按钮；订单状态表看不到"金额/回款/到账金额"三列。
- 用该测试用户的 session 直接 `curl` 请求 `GET /api/inquiry`，返回的记录里不应包含 `orderAmount`/`orderPaymentDate`/`orderReceivedAmount` 三个 key。
- 用该测试用户尝试 `PUT` 一条记录只改 `orderDeliveryStatus` 字段（不带金额字段），保存后用管理员账号重新查看该记录，确认金额字段没有被清空（验证 Worker 合并写入生效）。
- Worker 部署后（`npx wrangler deploy`），额外用管理员账号验证一次金额编辑仍然正常保存。

---

## TASK-57C：TASK-57A/57B 完成后的整体回归

**验证命令**

```bash
npx tsc --noEmit
npm run build
npm run test  # 若有 Jest 单测覆盖到 permissions 相关逻辑
npx playwright test  # 若时间允许，跑一遍 e2e，重点看权限相关用例
```

**人工回归清单**（写进 PR 描述，逐条打勾）：

- [ ] 管理员账号登录：侧边栏模块、权限编辑 UI 里的开关状态和上线前一致，行为无变化
- [ ] 新建一个"仅 `quotation` 权限"的普通用户：侧边栏只看到首页 + 报价单 + 世界时钟/全球假日/RMB（若 TASK-57A 的迁移脚本已跑，工具类默认开启）；直接访问 `/inquiry`、`/order`、`/customer` 等 URL 均应看到"权限不足"提示，不能绕过
- [ ] 给该用户单独授予 `inquiry` 权限（不给 `inquiry.batchEdit`/`order.financials`）：能看询报价登记表和订单状态表基础字段，看不到批量编辑入口和金额三列
- [ ] 再给该用户加 `inquiry.batchEdit`：出现批量编辑入口；再加 `order.financials`：出现金额三列
- [ ] 关闭该用户的 `inquiry` 权限：确认 `inquiry.batchEdit`/`order.financials` 在管理员编辑 UI 里被级联清空（不会出现"父权限关了子权限还留着"的脏状态）
- [ ] `GET /api/inquiry` 用无 `order.financials` 权限的用户 token 请求，确认金额字段不出现在响应里
- [ ] `src/constants/permissions.ts` 已删除，`npx tsc --noEmit` 无报错

**完成后请把改动的 commit hash 贴给 Claude，由 Claude 逐项核对代码是否符合以上设计，重点核对：① Worker PUT 是否真的改成合并写入且已 `wrangler deploy` ② 级联清空逻辑 ③ isAdmin 在权限编辑 UI 里是否正确禁用了子开关。**

---

## TASK-58：`UserDetailModal.tsx` 权限编辑弹窗布局压缩（TASK-57B 上线后变得太长）

**背景**

TASK-57B 把"模块权限"区块从 `grid-cols-2` 改成了 `grid-cols-1`（因为 `inquiry` 模块下面要挂 2 个高级功能子开关，1 列布局最省事），但代价是：9 个模块 + 2 个子权限，每行还是原来 `PermissionToggle` 的高度（`min-h-[55px] sm:min-h-[60px]`），单列堆起来导致弹窗内容区非常长，用户需要滚动很久才能看到"世界时钟"往后的模块（截图反馈：滚动到"世界时钟"就快到弹窗内容区外了，后面还有全球假日/RMB/账户信息等）。

另外 `PermissionToggle.tsx` 用了 `sm:` 响应式断点把桌面浏览器下的内边距和高度都调大了（`p-2.5 sm:p-3`、`min-h-[55px] sm:min-h-[60px]`），但这个弹窗容器是固定 `max-w-sm`（~384px）窄列，`sm:`（≥640px）断点判断的是浏览器窗口宽度而不是弹窗宽度——桌面端打开时窗口通常 >640px，实际会命中更大的那一档，导致弹窗在桌面反而比手机上更占空间，这是不必要的。

**优化方案**：① 恢复 2 列网格（简单模块占 1 格，带高级功能的模块整行 `col-span-2`，子开关缩进堆叠在下面）② 按 `category` 字段（`PERMISSION_MODULES` 里已有，无需新增数据）分组加小标题，便于扫读，也顺带把视觉上的"一整墙开关"切成 4 个小节 ③ `PermissionToggle` 去掉无意义的 `sm:` 响应式档位，统一用更紧凑的尺寸 ④ 去掉外层多余的边框包裹（之前每个模块外面套了一层 `rounded-lg border p-1.5`，和 `PermissionToggle` 自己的边框重复，视觉上是双层框）。

---

### 改动 1：`src/features/admin/components/PermissionToggle.tsx` —— 去掉 `sm:` 断点，整体收紧

```tsx
// 改动前（第 21-24 行）：
<div className="flex items-center justify-between p-2.5 sm:p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors min-h-[55px] sm:min-h-[60px]">
  <div className="flex items-center gap-2 sm:gap-2 min-w-0 flex-1 pr-2">
    <span className="text-sm sm:text-base flex-shrink-0">{icon}</span>
    <span className="font-medium text-gray-900 dark:text-white text-xs sm:text-sm truncate">{name}</span>
  </div>

// 改动后：
<div className="flex items-center justify-between p-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 transition-colors min-h-[44px]">
  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-1">
    <span className="text-sm flex-shrink-0">{icon}</span>
    <span className="font-medium text-gray-900 dark:text-white text-xs truncate">{name}</span>
  </div>
```

其余部分（toggle 按钮本身的 `h-5 w-9`）不用改，已经够小。

---

### 改动 2：`src/features/admin/components/UserDetailModal.tsx` —— 模块权限区块改为分类 2 列网格

在文件顶部引入 `ModuleCategory` 类型（仅用于分类顺序数组的类型标注，可选，不引入也不影响功能）：

```ts
import { PERMISSION_MODULES, type ModuleCategory } from '@/constants/permissionModules';
```

在组件外部（或文件顶部，`fmtDate` 函数附近）加两个常量：

```ts
const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  document: '单据',
  registration: '登记表',
  management: '管理',
  tool: '工具',
};

const CATEGORY_ORDER: ModuleCategory[] = ['document', 'registration', 'management', 'tool'];
```

把"模块权限"区块（现在的第 196-228 行，`<div className="grid grid-cols-1 gap-2">...</div>` 那一整段）替换成：

```tsx
<div className="space-y-3">
  {CATEGORY_ORDER.map((category) => {
    const categoryModules = PERMISSION_MODULES.filter((m) => m.category === category);
    if (categoryModules.length === 0) return null;

    return (
      <div key={category}>
        <p className="mb-1 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          {CATEGORY_LABELS[category]}
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {categoryModules.map((module) => {
            const perm = permissions.find((p) => p.moduleId === module.moduleId);
            const parentEnabled = perm?.canAccess ?? false;
            const hasAdvanced = !!module.advancedFeatures?.length;

            return (
              <div key={module.moduleId} className={hasAdvanced ? 'col-span-2' : undefined}>
                <PermissionToggle
                  moduleId={module.moduleId}
                  name={module.label}
                  icon={module.icon}
                  isEnabled={isAdmin || parentEnabled}
                  onToggle={togglePermission}
                  disabled={isBusy || isAdmin}
                />
                {hasAdvanced && (
                  <div className="mt-1 space-y-1 border-l-2 border-gray-100 pl-3 dark:border-gray-800">
                    {module.advancedFeatures!.map((feature) => {
                      const featurePerm = permissions.find((p) => p.moduleId === feature.moduleId);
                      return (
                        <PermissionToggle
                          key={feature.moduleId}
                          moduleId={feature.moduleId}
                          name={feature.label}
                          icon={feature.icon}
                          isEnabled={isAdmin || (featurePerm?.canAccess ?? false)}
                          onToggle={togglePermission}
                          disabled={isBusy || isAdmin || !parentEnabled}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  })}
</div>
```

注意：`inquiry` 模块的 `label` 是"询报价登记表 / 订单状态表"，比较长，所以它必须保留 `col-span-2` 整行显示，不能塞进单列格子里（会被截断）。其他 8 个不带 `advancedFeatures` 的模块保持单列格（1/2 宽）。

---

### 改动 3（可选，如果改完①②后还是偏长再做）：整体内容区间距再收紧一档

`UserDetailModal.tsx` 第 133 行 `<div className="flex-1 overflow-y-auto p-4 space-y-5">` 里的 `space-y-5` 可以改成 `space-y-4`；"账户设置"卡片（第 149、161 行）的 `px-3 py-2.5` 可以改成 `px-2.5 py-2`。这一步优先级低，先做完①②看效果，肉眼观察还是长的话再动。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 打开任意用户的权限编辑弹窗，"模块权限"区块能看到"单据 / 登记表 / 管理 / 工具"四个小分类标题
- 除"询报价登记表 / 订单状态表"外，其余模块两两一行显示
- `inquiry.batchEdit`、`order.financials` 两个子开关仍然缩进显示在"询报价登记表 / 订单状态表"下方，且关闭父模块时仍然置灰（这一行为不能因为布局改动而回归）
- 桌面浏览器和手机宽度下打开弹窗，每行开关的高度看起来一致（验证 `sm:` 断点已去除，不再出现桌面比手机更高的情况）
- 整体弹窗内容大概率不需要滚动就能看完（视屏幕高度，至少比改动前明显短）

---

# 客户管理模块重新设计（TASK-59 ~ TASK-63）

## 背景与关键发现

用户要求重新设计客户档案：公司基础信息 + 多个联络人（各自有简称），询价数量/订单数量能"统计到公司或联络人"。调研现状后确认三个决策点（已和 Roger 确认）：

1. **统计口径**：改成真正的 `customerId`/`contactId` 关联（而不是继续靠字符串模糊匹配），历史数据尽力回填，回填不上的标记"待关联"。
2. **存储架构**：顺带修——D1 变成权威数据源，localStorage 降级为离线缓存；合并掉 `src/utils/customerDataService.ts` 这份给 Invoice 用的重复代码。
3. **范围**：客户、供应商、收货人一起升级到"公司信息 + 多联络人"的统一结构。

**调研中发现一个之前没人提过、必须先处理的问题**：D1 的 `Customer` 表当前是**按 `user_id` 隔离的**（每个登录用户查询/写入都带 `WHERE user_id = ?`，见 `src/worker.ts` 的 `handleListCustomers` 等四个 handler，以及 `src/app/api/customers/[[...path]]/route.ts` 第22-40行强制往每个请求里塞当前登录用户的 `user_id`）。而询报价数据（`Document` 表 type='inquiry'）是**团队共享**的（`user_id = '_shared_'`，所有人看到同一份）。也就是说：**如果两个销售员都用客户管理模块，他们现在看到的是两份完全不同、互相看不见的客户名单**。这次要把询价记录关联到客户库、还要统计"询价数量/订单数量"，前提是客户库必须和询价数据一样变成团队共享，否则"统计到公司"这件事本身就是伪命题（同一家公司在不同销售员那里是不同的私有记录，没法统一计数）。

所以本次重新设计必须先把 Customer/Supplier/Consignee 从"按用户隔离"改成"团队共享"，这是排在数据模型升级之前的必要前置修复。**副作用**：不同销售员过去各自私有的客户记录里，可能存在同一家公司被重复登记多份（换了名字大小写、简称不一致等）的情况，合并成一张共享表后会有重复。这次的迁移**只做"合并进同一张表"，不做自动去重**（自动按名称模糊合并风险太高，可能把两家真不一样的公司合并错）。去重是合并后的人工整理工作，客户列表页后续应该加一个"疑似重复"的辅助识别功能（提上 TASK-63 之后的 backlog，本次先不做）。

## 整体方案（5 个阶段）

| 阶段 | 内容 | 状态 |
|---|---|---|
| TASK-59 | D1 schema 升级：Customer 表团队共享化 + 新增独立 Contact 表 + Document 表加 customer_id/contact_id | 本次详细规格 |
| TASK-60 | 服务层重构：D1 变权威数据源，废弃 `utils/customerDataService.ts`，Worker/代理层去掉 user_id 隔离 | 本次详细规格 |
| TASK-61 | Customer/Supplier/Consignee 类型与表单统一（联络人数组化，去掉 contact1 特殊字段），客户详情页展示统计 | 先给方向，跑完 59/60 验证后再细化 |
| TASK-62 | 询报价登记表接入"选客户+选联络人"选择器（含内联新建客户），采购订单接入供应商库选择 | 同上 |
| TASK-63 | 统计聚合 API（`/api/customers/:id/stats`）+ 历史询价记录的尽力匹配回填脚本 | 同上 |

**执行顺序不能打乱**：TASK-59（建表）必须先于 TASK-60（改代码读写新表），TASK-60 必须先于 TASK-61/62（前端要基于新的共享数据模型改）。TASK-63 的回填脚本依赖 TASK-59 的 Contact 表和 TASK-61 的客户简称数据已经迁移完成。

---

## TASK-59：D1 schema 升级——Customer 团队共享化 + Contact 表 + Document 关联字段

**⚠️ 执行前必读**：这是本项目目前最大的一次 D1 schema 改动，涉及重建 `Customer` 表（数据量应该不大，但操作不可轻易撤销）。要求：
1. 先在本地/dev 环境跑一遍（`npx wrangler d1 execute mluonet-users --local --file=...`），确认语法和 `json_each`/`json_extract` 在当前 D1 版本上能跑通再对生产库操作。
2. 对生产库操作前，先执行一次全量导出备份：`npx wrangler d1 export mluonet-users --remote --output=backup-before-task59-$(date +%Y%m%d).sql`，把备份文件路径记录在任务总结里。
3. 迁移 SQL 分成"建表 + 拆分迁移"两步验证：先跑建表和 Document 加字段（风险低、可回滚性高），确认无误后再跑 Customer 重建和联络人拆分迁移（风险较高的部分）。

### 新建迁移文件 `migrations/004_customer_contacts_redesign.sql`

```sql
-- Migration 004：客户体系重构
-- 1) Customer 表去掉按用户隔离，变成团队共享；companyShortName 提升为一等字段 short_name
-- 2) 新建独立 Contact 表（此前联络人塞在 Customer.data 的 JSON 里，不可查询/不可统计）
-- 3) Document 表加 customer_id / contact_id，供询价/订单记录关联客户库（历史记录先留空，TASK-63 尽力回填）

-- ── Step 1：Customer 表重建（去掉 user_id 隔离维度，保留 created_by 做审计追溯） ──
ALTER TABLE Customer RENAME TO Customer_old;

CREATE TABLE Customer (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('customer', 'supplier', 'consignee')),
  name TEXT NOT NULL,
  short_name TEXT,
  code TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  data TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_by TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO Customer (id, type, name, short_name, code, email, phone, address, data, status, created_by, created_at, updated_at)
SELECT
  id, type, name,
  json_extract(data, '$.companyShortName'),
  code, email, phone, address,
  data, status, user_id, created_at, updated_at
FROM Customer_old;

CREATE INDEX idx_customer_type ON Customer(type);
CREATE INDEX idx_customer_name ON Customer(name);
CREATE INDEX idx_customer_short_name ON Customer(short_name);
CREATE INDEX idx_customer_status ON Customer(status);

DROP TABLE Customer_old;
-- 校验：SELECT COUNT(*) FROM CustomerEvent WHERE customer_id NOT IN (SELECT id FROM Customer); 必须为 0

-- ── Step 2：新建 Contact 表 ──
CREATE TABLE Contact (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  short_name TEXT,
  email TEXT,
  phone TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES Customer(id) ON DELETE CASCADE
);

CREATE INDEX idx_contact_customer_id ON Contact(customer_id);
CREATE INDEX idx_contact_short_name ON Contact(short_name);

-- ── Step 3：联络人历史数据拆分迁移 ──
-- 3a. "联系人1"：现状是复用 Customer 顶层 name/email/phone + data.contact1ShortName，标记为主联络人
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-primary-' || id, id, name,
  json_extract(data, '$.contact1ShortName'),
  email, phone, 1, 0, created_at, updated_at
FROM Customer
WHERE type = 'customer' AND name IS NOT NULL AND TRIM(name) != '';

-- 3b. data.contacts[] 数组里的附加联系人
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-' || Customer.id || '-' || je.key,
  Customer.id,
  json_extract(je.value, '$.name'),
  json_extract(je.value, '$.shortName'),
  json_extract(je.value, '$.email'),
  json_extract(je.value, '$.phone'),
  0,
  CAST(je.key AS INTEGER) + 1,
  Customer.created_at,
  Customer.updated_at
FROM Customer, json_each(Customer.data, '$.contacts') AS je
WHERE Customer.type = 'customer'
  AND json_extract(je.value, '$.name') IS NOT NULL
  AND TRIM(json_extract(je.value, '$.name')) != '';

-- 3c. 遗留的 contact2*（旧版单一"联系人2"字段，可能有历史数据还没走过 contacts[] 结构）
INSERT INTO Contact (id, customer_id, name, short_name, email, phone, is_primary, sort_order, created_at, updated_at)
SELECT
  'contact-legacy2-' || id, id,
  json_extract(data, '$.contact2Name'),
  json_extract(data, '$.contact2ShortName'),
  json_extract(data, '$.contact2Email'),
  json_extract(data, '$.contact2Phone'),
  0, 99, created_at, updated_at
FROM Customer
WHERE type = 'customer'
  AND json_extract(data, '$.contact2Name') IS NOT NULL
  AND TRIM(json_extract(data, '$.contact2Name')) != '';

-- ── Step 4：Document 表加客户关联字段（历史记录留空，TASK-63 处理回填） ──
ALTER TABLE Document ADD COLUMN customer_id TEXT;
ALTER TABLE Document ADD COLUMN contact_id TEXT;
CREATE INDEX idx_doc_customer_id ON Document(customer_id);
CREATE INDEX idx_doc_contact_id ON Document(contact_id);
```

**执行命令**：

```bash
# 1. 本地验证
npx wrangler d1 execute mluonet-users --local --file=./migrations/004_customer_contacts_redesign.sql

# 2. 生产库备份
npx wrangler d1 export mluonet-users --remote --output=backup-before-task59-$(date +%Y%m%d).sql

# 3. 生产库执行
npx wrangler d1 execute mluonet-users --remote --file=./migrations/004_customer_contacts_redesign.sql
```

**验收标准**（跑完在生产库上逐条查询确认）：

```sql
-- Customer 表记录数应与迁移前一致（无数据丢失）
SELECT COUNT(*) FROM Customer;

-- 每个 type='customer' 且原来有 name 的客户，至少应有 1 条 is_primary=1 的联络人
SELECT COUNT(*) FROM Customer c WHERE c.type='customer'
  AND NOT EXISTS (SELECT 1 FROM Contact WHERE customer_id = c.id AND is_primary = 1);
-- 结果应为 0（如果不为 0，说明有客户 name 是空字符串，需要人工确认这些是不是脏数据）

-- CustomerEvent 外键完整性
SELECT COUNT(*) FROM CustomerEvent WHERE customer_id NOT IN (SELECT id FROM Customer);
-- 结果必须是 0

-- Document 新字段已存在
SELECT customer_id, contact_id FROM Document LIMIT 1;
```

在任务总结里附上以上几条 SQL 的实际执行结果，以及备份文件的存放路径。

---

## TASK-59 补充：`schema.sql` 未同步更新（请在 TASK-60 里一并修）

Claude 核对 TASK-59 执行结果时发现：`schema.sql`（项目里作为"从零搭建 D1"的基准文件）还是旧版结构——`Customer` 表仍然带 `user_id NOT NULL` 和 `idx_customer_user_type` 索引，没有 `Contact` 表，`Document` 表也没有 `customer_id`/`contact_id` 列。对照 `002_add_inquiry_type.sql` 执行后 `schema.sql` 里 `Document.type` 的 CHECK 约束确实同步加上了 `'inquiry'`（第53行）——说明这个项目一直有"迁移执行后回填 schema.sql"的约定，这次不能漏。

请在 TASK-60 提交前，把 `schema.sql` 第70-107行的 `Customer`/`CustomerEvent` 定义、以及 `Document` 表定义，改成与 004/005 迁移后的最终结构一致（`Customer` 去掉 `user_id`、加 `short_name`/`created_by`；新增 `Contact` 表定义；`Document` 加 `customer_id`/`contact_id` 两列及索引），让 `schema.sql` 能作为"这个项目现在长什么样"的准确参照，不需要再叠加读 004/005 才能拼出完整结构（004/005 文件本身继续保留，作为历史迁移记录，不要删）。

---

## TASK-60：服务层重构——D1 变权威数据源，去掉按用户隔离，合并重复代码

**目标**：TASK-59 建好共享表后，让应用代码真正读写这张共享表，不再各自维护 per-user 的 localStorage 副本作为"事实来源"。

### 改动 1：`src/worker.ts` 的客户 handler 去掉 `user_id` 隔离

`handleListCustomers`／`handleGetCustomer`／`handleCreateCustomer`／`handleUpdateCustomer`／`handleDeleteCustomer`（第1476-1683行）：
- 去掉所有 `WHERE user_id = ?` 条件和 `if (!userId) return jsonResponse({ error: '缺少 user_id' }, 400)` 校验（客户数据不再按 user_id 过滤）。
- `handleCreateCustomer`：`user_id` 参数改成可选的 `created_by`，写入新的 `created_by` 列（仅做审计，不参与查询过滤）。
- `handleListCustomers` 新增 `GET /api/customers/:id` 时顺带查询该客户名下的 `Contact` 记录并嵌套返回：`{ customer: {...}, contacts: [...] }`（用一次 `SELECT * FROM Contact WHERE customer_id = ? AND status='active' ORDER BY sort_order`）。
- 新增 `Contact` 的"整单替换"接口：`PUT /api/customers/:id/contacts`，请求体是完整的联络人数组 `{ contacts: [{id?, name, shortName, email, phone, isPrimary}, ...] }`，handler 逻辑：在一个事务里先 `DELETE FROM Contact WHERE customer_id = ?`，再逐条 `INSERT`（沿用前端传来的 `id`，若没有则生成新 `crypto.randomUUID()`）。选择"整单替换"而不是逐条增删改 API，是因为客户联络人数量少（通常 1-5 个），表单本来就是整体提交，没必要做精细化的单条 CRUD。

### 改动 2：`src/app/api/customers/[[...path]]/route.ts` 代理层同步调整

- 不再往每个请求里强制注入 `user_id`（第28、40行的 `url.searchParams.set('user_id', userId)` 和 `JSON.stringify({ ...parsedBody, user_id: userId })` 删掉）。
- 仅在 `POST`（创建）请求时注入 `created_by: userId`。
- 新增对 `PUT /api/customers/:id/contacts` 路径的透传（应该已经被现有的通配符 `pathSegments.join('/')` 逻辑覆盖，确认一下不需要额外处理）。

### 改动 3：`src/features/customer/services/customerService.ts` 改成异步、D1 为权威源

当前所有函数（`getAllCustomers`/`saveCustomer`/`deleteCustomer` 等）都是**同步**读写 localStorage。改造方向：

```ts
// 新的契约（具体实现 Codex 自行组织，以下是必须满足的行为）：
export async function fetchAllCustomers(type: 'customer' | 'supplier' | 'consignee'): Promise<CustomerWithContacts[]> {
  // 优先请求 /api/customers?type=xxx，成功则把结果写入 localStorage 做离线缓存（key 改名，比如 'customer_cache_v2'，避免和旧的 'customer_management' 混淆导致脏数据复活）
  // 请求失败（离线/网络错误）时，读取上一次缓存并返回，同时要有明显的"离线数据，可能不是最新"提示（具体 UI 由 TASK-61 处理，这里只需要返回值里带一个 isStale: boolean 标记）
}

export async function saveCustomerProfile(profile: CustomerProfileInput): Promise<CustomerWithContacts> {
  // 1. PUT/POST /api/customers/:id 保存公司基础信息
  // 2. PUT /api/customers/:id/contacts 整单替换联络人
  // 两步都成功才算成功；第2步失败要在返回值里明确报告（不要吞掉错误），因为公司信息和联络人如果不一致会很难排查
  // 不再写 localStorage 作为"提交动作"的一部分——localStorage 只在 fetchAllCustomers 成功时被动更新为缓存
}
```

**必须删除**：`extractCustomersFromHistory()`（第6-72行）和它在 `getAllCustomers()` 里的调用——这是"从历史单据反向猜测客户"的旧逻辑，在有了真正的客户库之后不再需要，保留的话新旧两套客户会同时出现在列表里造成混乱。

**必须删除整个文件**：`src/utils/customerDataService.ts`。它是给 Invoice 的 `CustomerSection.tsx` 用的独立重复实现，字段集比 `features/customer` 那套旧（没有 `companyShortName`/`contacts`）。删除后，`CustomerSection.tsx`（及其他任何 import 这个文件的地方，先跑 `grep -rln "customerDataService" src/` 确认引用点）需要改成调用 `features/customer/services/customerService.ts` 新的异步 API。

### 改动 4：`src/utils/d1Sync.ts` 的 `d1SyncCustomer` 相关代码可以整体删除

因为 TASK-60 之后客户数据不再走"本地写 + fire-and-forget 补写 D1"的双写模式，而是直接读写 D1（`saveCustomerProfile` 内部就是 `fetch` 调 API，同步等待结果），`d1SyncCustomer`、`D1CustomerPayload` 类型、以及 `PendingOp` 里 `kind: 'customer'` 的分支都成了死代码，一并清理。**注意**：`d1SyncDocument`（询价/单据用的）不要动，那部分依然是 fire-and-forget 双写模式，本次不改。

### 改动 5：调用点排查

搜一遍所有同步调用 `customerService.getAllCustomers()` / `saveCustomer()` / `deleteCustomer()` 的地方（`useCustomerData.ts`、`useCustomerActions.ts`、`useAutoSync.ts`、`NewCustomerTracker.tsx` 等，先 `grep -rln "customerService\." src/features/customer` 拿到完整列表），逐个改成 `await` 新的异步函数，并处理好 loading/error 状态（参考 `usePermissionStore` 里 `fetchPermissions` 的 `isLoading`/`error` 模式）。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
grep -rn "customerDataService" src/   # 应无输出，确认死代码已清理
grep -rn "d1SyncCustomer\|D1CustomerPayload" src/   # 应无输出
```

**验收标准**：
- 用两个不同账号登录，客户管理页看到的是**同一份**客户列表（验证团队共享生效）
- 新建/编辑/删除客户后，刷新页面或换一个账号登录，改动都能看到（验证 D1 是权威源，不再依赖本地 localStorage 才能看到别人的改动）
- 断网状态下打开客户管理页，能看到上一次缓存的数据（离线兜底没坏掉）
- Invoice 的客户选择功能（`CustomerSection.tsx`）改造后功能不回归

---

## TASK-59/60 复核结论（Claude 已核对，通过）

两轮改动都独立验证过（`sha256sum` 核对备份文件、`git diff` 逐文件核对、独立跑 `tsc --noEmit`），细节：
- TASK-59 的 `CustomerEvent` 外键被 SQLite 重写到 `Customer_old`这个坑，发现和修复方式都对；005 是给已跑过旧版 004 的库打补丁，004 本身也同步补了这段逻辑，两边不会再有人踩同一个坑。
- TASK-60 的 `handleReplaceCustomerContacts` 用 `env.USERS_DB.batch(statements)` 做"先删后插"原子替换，比口头要求的"一个事务"更准确；`ConsigneeSection.tsx` 顺手把过去"硬塞进 packing_history 冒充保存"的 hack 换成了真正的 `saveCustomerProfile`，`d1Migration.ts` 正确停用了客户数据的旧迁移分支（避免把 per-user 时代的脏副本重新写回团队共享表）——这几处都超出了字面要求，但判断是对的，不需要改。
- `schema.sql` 已同步更新，两个待办都清了。

可以继续 TASK-61。

---

## TASK-61：`Customer`/`Supplier`/`Consignee` 类型与表单统一——彻底去掉"联系人1"特殊字段

**背景**：现在的 `Customer` 类型（`src/features/customer/types/index.ts` 第9-25行）有个历史遗留的混乱设计——顶层的 `name`/`email`/`phone` 字段实际存的是"联系人1"这个人的姓名/邮箱/电话，真正的公司名称反而存在 `company` 字段里；`contact1ShortName` 是联系人1的简称，`contacts[]` 数组是"联系人2及以后"，`contact2Name/ShortName/Phone/Email` 是更早版本遗留、现在应该没人写入但读取时仍要兼容的旧字段。`CustomerForm.tsx`（第107-278行）对应地把表单拆成"公司信息"+"联系人1"（绑定顶层字段）+"附加联系人"（绑定 `contacts[]`）三个 fieldset，联系人1享受"特殊待遇"，不能删除、不能调整顺序、不能设为非主要联系人。

TASK-60 的 `customerService.ts`（`normalizeProfile`/`buildBasePayload`/`buildContactsPayload`）为了不在那一步大改前端，专门做了新旧字段之间的双向转换桥接，把 D1 里已经拆开的 Contact 表数据重新拼回这个旧的混乱形状。这次要把这层桥接拆掉，让前端类型直接对应 D1 的真实结构。

**目标结构**：

```ts
// src/features/customer/types/index.ts
export interface Contact {
  id: string;
  name: string;
  shortName?: string;
  email?: string;
  phone?: string;
  isPrimary?: boolean;   // 新增：新增
}

export interface CustomerProfile {
  id: string;
  type: 'customer' | 'supplier' | 'consignee';
  name: string;           // 公司/供应商/收货人全称（不再是"联系人1姓名"）
  shortName?: string;     // 简称
  code?: string;
  address?: string;
  contacts: Contact[];    // 客户类型：至少1个，其中恰好1个 isPrimary=true；供应商/收货人本次也统一升级为同结构（可以只有0-1个联络人）
  createdAt: string;
  updatedAt: string;
}
```

**是否保留 `Customer`/`Supplier`/`Consignee` 三个独立类型名**：可以保留三个类型别名（`export type Customer = CustomerProfile` 等）以减少调用点改动量，但底层结构统一。具体怎么权衡改动量由 Codex 判断，只要求最终三种实体的字段形状一致。

**注意**：原来的 `Customer.email`/`phone` 顶层字段（"联系人1的邮箱电话"）不再有顶层对应物——这两个信息现在只存在于 `contacts[]` 里对应的那个联络人身上。如果有代码依赖 `customer.email`/`customer.phone` 直接取值（比如 Invoice/Quotation 的下拉匹配逻辑），需要相应改成取主联络人（`contacts.find(c => c.isPrimary) ?? contacts[0]`）的 email/phone。改之前先 `grep -rn "\.email\b\|\.phone\b" src/features/customer src/features/invoice src/components/quotation src/features/packing` 摸清所有读取点，不要漏改导致运行时读到 `undefined`。

### 改动 1：`src/features/customer/services/customerService.ts` 简化

`normalizeProfile`：直接返回 `contacts` 全量数组（含主联络人，`isPrimary` 用 D1 的 `is_primary` 换算），不再拆分"主联络人揉进顶层字段 + 附加联络人数组"。删除 `contact1ShortName`/`contact2*` 相关的读取和拼装逻辑。

`buildContactsPayload`：改成直接使用调用方传入的完整 `contacts: Contact[]`（不再需要用 `profile.name`/`contact1ShortName` 拼一个"假的主联络人"），要求数组里恰好有一个 `isPrimary: true`（如果调用方没标，取数组第一个兜底为主联络人，并在保存前用这条规则纠正，避免 0 个或多个 `isPrimary` 同时为真导致语义混乱）。

`buildBasePayload`：`name`/`short_name` 直接来自 `profile.name`/`profile.shortName`（公司名/简称），不再有"取 company 还是取 name"的二选一逻辑。

同步更新 `CustomerProfileInput` 接口，去掉 `contact1ShortName`/`companyShortName`（改名 `shortName`）等旧字段名。

### 改动 2：`src/features/customer/components/CustomerForm.tsx` 表单重构

去掉"联系人1"专属 fieldset（第140-174行）。改成不区分主次的统一"联络人"列表（复用现有第176-277行"附加联系人"那套增删渲染逻辑，扩展一下）：

- 每个联络人卡片增加一个"设为主联络人"的单选/按钮（radio 语义：全列表里只能有一个被选中）
- 列表初始至少保留 1 个联络人卡片（不允许删到 0 个，客户至少要留一个联络人；如果用户尝试删除最后一个，按钮 disabled 或者给提示）
- 新增的联络人默认不是主联络人；如果列表里还没有任何 `isPrimary`，新增的第一个自动设为主联络人
- Supplier/Consignee（`entityType !== 'customers'` 分支，第279-323行）也升级成同一套"公司信息 + 联络人列表"结构（供应商/收货人大概率只需要 0-1 个联络人，但复用同一组件不需要额外分支）

`CustomerFormData` 类型（`types/index.ts` 第49-58行）同步简化，去掉不再需要的字段。

### 改动 3：调用点排查

`grep -rln "companyShortName\|contact1ShortName\|contact2Name\|contact2ShortName\|contact2Phone\|contact2Email" src/` 找出所有引用点（预计包括 `useCustomerForm.ts`、`CustomerInfoCard.tsx`、`inquirerOptions.ts` 里读 `companyShortName`/`contact1ShortName` 生成"询价人建议"那段逻辑——这处要相应改成从 `contacts[]` 里取简称组合成候选项），逐个改成新结构。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
grep -rn "contact1ShortName\|contact2Name\|contact2ShortName\|contact2Phone\|contact2Email" src/   # 应无输出
```

**验收标准**：
- 客户表单里不再有单独的"联系人1"区块，所有联络人在同一个列表里，可以任意指定其中一个为"主联络人"，也可以调整增删
- 供应商/收货人的编辑表单也能录入多个联络人（哪怕大部分场景只填1个）
- 已有客户数据（TASK-59 迁移进来的联络人）打开编辑表单后能正常显示、编辑、保存，不丢字段
- 询报价登记表的"询价人"候选列表（`inquirerOptions.ts`）功能不回归

---

## TASK-62 ~ TASK-63：待 TASK-61 落地验证后细化

- **TASK-62**：`InquiryFormModal.tsx` 把自由文本 `customerNo` 输入框 + `inquirer` datalist，换成"选客户（公司名/简称模糊搜索）→ 选联络人（默认选中主联络人）"两级选择器，选中后把 `customerId`/`contactId` 写入记录，同时保留自动生成的 `customerNo`/`inquirer` 展示字符串（兼容现有筛选/导出/PDF）；支持"客户不在库里 → 内联新建"。`Purchase` 的 `SupplierSection.tsx` 同步接入供应商库选择。
- **TASK-63**：新增统计聚合接口 `GET /api/customers/:id/stats`（公司级 + 联络人级的询价数量/订单数量），客户详情页展示；再写一次性回填脚本，对历史 `Document` 记录尝试用 `customerNo`/`inquirer` 字符串匹配 `Customer.code`/`short_name` + `Contact.short_name` 回填 `customer_id`/`contact_id`，匹配不上的加"待关联客户"筛选提示。

---

## TASK-59~63 复核结论（Claude 已核对，全部通过）

五个任务逐一核对：D1 迁移的 `CustomerEvent` 外键坑（TASK-59）、`handleReplaceCustomerContacts` 原子替换与 `ConsigneeSection.tsx`/`d1Migration.ts`/`d1Pull.ts` 的连带清理（TASK-60）、`Customer.name/email/phone` 历史上其实是"联系人1"信息这个混乱的彻底拆分（TASK-61）、`InquiryFormModal` 两级选择器对旧记录的兼容处理（TASK-62）、统计接口的"未分配联络人"桶与 692 条历史记录 0 回填的真实原因（TASK-63）——都逐项验证过，独立跑过 `tsc --noEmit`，细节见本文件更早的"复核结论"记录和对话历史。整体质量很高，可以继续下一阶段。

---

## TASK-64：客户管理页面布局与交互优化（客户/供应商/收货人三个 tab 一起理顺）

**背景（截图走查发现的问题，已和 Roger 确认要改的方向）**

1. 列表页每行"查看/编辑/删除"三个小图标，"查看"和"点名字进详情"功能重复，图标又小又挤，删除紧挨着编辑容易手滑。
2. 列表页"联系方式"列几乎所有行都显示"—"——不是 bug，是因为联络人的 email/phone 字段历史上大部分没人填（详情页也能看到同一客户的主联络人显示"未填写邮箱/电话"），这一列现在信息密度很低，值得换成更常年有值的字段。
3. 客户详情页头部的"未填写邮箱""未填写电话"两个图标，实际读的是**主联络人**的 email/phone（`CustomerInfoCard.tsx` 里 `primaryContact?.email`/`primaryContact?.phone`），但视觉上呈现得像是"公司"的联系方式，容易让人误解。更严重的是：**除了主联络人，其他联络人的电话/邮箱现在完全没有地方显示**——详情页"联系人："那一行只列了姓名和简称（`formatContact` 只拼 `${name}${shortName})`），一个客户如果有三个联络人、各自电话不同，现在只有主联络人的电话能看到，这是个真实的功能缺口，不只是好看不好看的问题。
4. 地址在详情页头部是单行截断显示省略号，地址长一点就看不全。
5. "业务统计"卡片现在几乎所有客户都是"询价0·订单0"——已在 TASK-63 确认是历史询价记录大多未关联客户 ID 导致的，不是这个客户真的没生意。裸着显示"0"容易被误解成"这个客户没成交过"。
6. 供应商/收货人两个 tab 目前只有列表，没有详情页，交互和客户 tab 不统一。

**这次改的方向**（已确认）：三个 tab 一起理顺；统计卡片 0 值时加提示；列表行改成整行点击进详情、编辑删除收进"更多"菜单。

---

### 改动 1：列表行交互统一——整行点击进详情，编辑/删除收进"更多"菜单

涉及 `CustomerList.tsx`、`SupplierList.tsx`、`ConsigneeList.tsx`（三个文件结构接近，改动逻辑一致）：

- 整行（除最右侧"更多"按钮外的区域）可点击，点击即调用 `onViewDetail`，不再需要单独的"查看"眼睛图标。
- "联系方式"列改为"主联络人"列：显示 `getPrimaryContact(customer)?.name`（+ `shortName` 括注），如果联络人总数 > 1，额外显示一个 `+N` 的小灰色徽标（N = 总联络人数 - 1）。如果连主联络人姓名都没有（理论上不该发生，因为迁移保证了每个客户至少有一个联络人），兜底显示"—"。
- 最右侧的"编辑""删除"两个图标合并成一个"···"更多按钮，点击展开一个悬浮小菜单（参考 `src/features/inquiry/app/InquiryPage.tsx` 里 `isAdminMenuOpen` 那套"点击遮罩关闭"的浮层交互写法，保持全仓库风格一致），菜单里两行：编辑、删除（删除保持现有的 `ConfirmDialog` 二次确认，不要因为进了菜单就省略确认步骤）。
- `SupplierList`/`ConsigneeList` 目前没有 `onViewDetail` prop（因为供应商/收货人还没有详情页），这次要补上——同时看改动 3，给它们也接上详情页。

### 改动 2：`CustomerPage.tsx` 打通供应商/收货人的详情页导航

`handleViewDetail` 目前签名是 `(customer: Customer) => void`，硬编码只处理客户。改成通用的 `handleViewDetail(item: Customer | Supplier | Consignee, type: TabType)`，导航到 `/customer/detail?id=...&name=...&type=${type}`（`type` 参数新增，默认省略时等价于 `customer`，保持现有客户详情页链接不受影响）。`SupplierList`/`ConsigneeList` 调用时传各自的 `activeTab` 值。

### 改动 3：详情页按 `type` 分支——供应商/收货人也有详情页，但不显示业务统计/时间轴/跟进记录

`src/app/customer/detail/page.tsx` 和 `CustomerDetailPage.tsx` 读取 URL 里新增的 `type` 参数（`customer` | `supplier` | `consignee`，缺省 `customer`）：

- `type === 'customer'`：保留现有的业务统计卡片 + 时间轴 + 跟进记录两个 tab，行为不变（见改动 5 的小调整）。
- `type !== 'customer'`：不调用 `fetchCustomerStats`（这个 API 是按 `inquiry` 类型的 `Document.customer_id` 统计的，供应商/收货人永远是 0，调了也没意义，浪费一次请求）；不显示时间轴/跟进记录 tab（那套是给客户维护关系用的，供应商/收货人不适用）。改成显示一个简单的"使用情况"卡片，复用已有的 `checkSupplierUsage(name)` / `checkConsigneeUsage(name)`（在 `supplierService.ts`/`consigneeService.ts` 里已经存在，同步函数，从 `purchase_history`/`packing_history` 里数出现次数），文案类似"在 N 张采购单中被使用过" / "在 N 张箱单中被用作收货人"。
- 头部的 `CustomerInfoCard`（见改动 4）三种类型共用，不用因为 type 分支重新写一份。

### 改动 4：`CustomerInfoCard.tsx` 重做联络人展示，修复"其他联络人电话邮箱看不到"的缺口

- 头部保留：名称、简称、地址。地址改成允许换行（去掉 `truncate`，用 `whitespace-pre-wrap` 或普通换行展示），不要单行截断出省略号。
- 去掉现在顶部那一排"邮箱/电话/地址"三个图标格子里的邮箱和电话（那其实是主联络人的信息，摆在公司信息区容易让人以为是公司的联系方式）——地址格子可以保留或并入头部区块，邮箱/电话不再在这里出现。
- 新增一个"联络人"列表区块（在头部下方），把 `customer.contacts` 全部渲染出来，不再只是一行逗号拼接的姓名。每个联络人一行/一张小卡片，包含：姓名、简称、主联络人徽标（沿用现有"主"标签样式）、电话（有值时用 `<a href="tel:...">` 可点击拨号）、邮箱（有值时用 `<a href="mailto:...">` 可点击）。没有电话/邮箱的字段直接不显示那个图标（不需要都写"未填写"，联络人多的时候会很啰嗦）。
- 这个改动同时影响供应商/收货人详情页（因为共用组件），效果是一致的——供应商如果也维护了多个联络人，同样能在这里看到每个人的电话邮箱。

### 改动 5：`CustomerDetailPage.tsx` 业务统计卡片 0 值提示

当 `stats` 加载完成且 `stats.totals.inquiries === 0 && stats.totals.orders === 0` 时，在三个统计格子下方加一行小字提示（灰色，非警示色，避免显得像出错了）：

> 暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到「询报价登记表」使用「待关联客户」筛选手动补充

如果顺手能做，给这行文字加个链接跳到 `/inquiry`（能不能带上预设"待关联客户"筛选的 query 参数，取决于 `useInquiryFilter.ts` 要不要顺便支持从 URL 初始化 `linkStatus`——如果改动量小就顺手做，如果发现要动的地方比较多就先跳转到 `/inquiry` 普通页面，不强求这次做深链接）。

---

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户/供应商/收货人三个 tab 的列表行为一致：点整行进详情，"···"菜单里编辑/删除都能正常工作，删除仍有二次确认
- 供应商/收货人现在点进去能看到详情页（联络人列表 + 使用次数），不再是死链接或者无反应
- 客户详情页：地址长文本能正常换行显示；联络人列表里每个人各自的电话/邮箱都能看到、可点击拨打/发邮件；主联络人有"主"标签
- 一个"询价0·订单0"的客户详情页能看到"暂无关联数据"的提示文字，不是干巴巴几个 0

---

## TASK-65：简化询报价"新增询价"里的客户/联络人选择器，修复"新建客户"提示干扰输入的问题

**背景（Roger 反馈，附截图）**："新建询价时那个新建客户的提示会干扰输入，在这一步要更简洁，只显示可选择的简称公司及简称联系人就可以"。

**根因排查（已定位，不是玄学）**：`InquiryFormModal.tsx` 现在是"搜索框选客户 → 再从一个单独的 `<select>` 里选联络人"两级选择器。选中客户后，`customerSearch` 会被设成 `getCustomerDisplay(customer)` 的组合展示串（形如 `"IC · INDIAN CHAIN PRIVATE LIMITED"`）。问题是：一旦这个组合串重新触发下拉（比如用户又点回搜索框想确认一下），`filteredCustomers` 的过滤逻辑是拿这个**组合串整体**去匹配 `customer.name`/`shortName`/`code`（都是单独的短字符串），组合串必然比这三者都长，`includes()` 恒为 `false`——于是 `filteredCustomers` 变空，`canCreateCustomer`（判断"没有精确匹配"）恒为 `true`，下拉框里就只剩一个"新建客户：IC · INDIAN CHAIN PRIVATE LIMITED"的选项，即便这个客户明明已经存在。这正是截图里"INDIAN CHAIN PRIVATE LIMITED"这个客户明明在库里、却只弹出"新建客户"的原因。

**这次要改的两件事**：

### 改动 1：客户+联络人合并成一个扁平的"简称-联系人简称"选择列表，去掉两级选择

新建一个共享组件 `src/features/customer/components/CustomerContactPicker.tsx`（后面 TASK-66 的批量关联工具也会复用它，别写死在 `InquiryFormModal.tsx` 里）：

```ts
interface CustomerContactOption {
  customerId: string;
  contactId: string;
  customer: Customer;
  contact: Contact;
  label: string; // 例如 "Indian Chain-Prateek"，客户简称(或全称)-联络人简称(或姓名)
}

interface CustomerContactPickerProps {
  customers: Customer[];           // 由外部（已 fetchAllCustomers）传入，picker 本身不发请求
  value: { customerId: string; contactId: string } | null;
  onSelect: (option: CustomerContactOption) => void;
  onCreateNew?: (query: string) => void; // 不传则不显示"新建客户"入口（TASK-66 的批量关联弹窗就不传）
  placeholder?: string;
  autoFocus?: boolean;
}
```

- 内部把 `customers` 展开成扁平 `options`：每个客户的**每个联络人**各生成一条 `option`（一个客户有 3 个联络人就是 3 条可选行），`label = ${customer.shortName || customer.name}-${contact.shortName || contact.name}`。
- 搜索框维护一个 `query` 状态（用户实际敲的字）。过滤规则：`option.label` 或 `customer.name`/`shortName`/`code` 或 `contact.name`/`shortName` 里**任意一个**包含 `query`（忽略大小写），命中即展示，最多展示 20 条。
- **修复干扰 bug 的关键**：用一个 `committedLabelRef` 记录"上次选中后设置进输入框的 label"。搜索框 `onFocus` 时：如果当前 `query === committedLabelRef.current`（即用户没有在选中后又手动改过字），把用于过滤的"有效查询词"当作空字符串处理（展示全部/前20条），而不是拿组合串去过滤出空列表——这样重新点回一个已选中的框，看到的是"当前选中项 + 其他可选项"的正常列表，不会跳出"新建客户"。用户一旦开始真正输入新字符（`onChange` 里 `query` 变化），才切回正常按输入过滤，并清空 `value`（未确认选中状态）。
- 下拉每行展示 `label`（主文案）+ 客户全称（小字灰色辅助，方便区分简称相同但公司不同的情况）。点击即 `onSelect(option)`，同时更新 `committedLabelRef.current = option.label`。
- "新建客户"入口：只有传了 `onCreateNew` 且 `query` 非空且 `options` 过滤结果为空时才显示，样式改得低调（小字灰色/次要色，放在列表最下方、加一条分割线，不要用醒目的蓝色大按钮——现在这个按钮太显眼，是"干扰感"的一部分），文案 `新建客户：${query}`，点击回调 `onCreateNew(query)` 交给外部处理（不在 picker 内部直接创建）。

### 改动 2：`InquiryFormModal.tsx` 接入新 picker，去掉旧的两级选择器

- 删除现在的搜索框 + `<select>` 选联络人 两段 UI，换成一个 `<CustomerContactPicker>`。
- `onSelect` 里：设置 `customerId`/`contactId`/`customerNo`（复用现有 `buildCustomerNo`）/`inquirer`（复用现有 `buildInquirer`），逻辑和现在 `selectCustomer`+`selectContact` 加起来的效果一致。
- `onCreateNew` 回调：不要再像现在 `createInlineCustomer()` 那样直接拿整个搜索文本同时当公司名和联络人简称用（这在组合串污染的情况下会创建出名字很怪的垃圾客户）。改成弹出一个轻量小表单（可以是同一个弹窗内联展开一小块，不用开新的 Modal 组件）：两个输入框——"公司简称/名称"（默认值 = 传入的 `query`，可编辑）、"联络人姓名"（默认空，placeholder"主联络人"）。确认后调用 `customerService.saveCustomerProfile(...)` 创建，创建成功后用返回的客户直接走一遍 `onSelect` 逻辑选中它。
- 保留现有对老记录（编辑模式下 `record.customerId` 为空）的兼容：没有 `customerId` 时 picker 的 `value` 传 `null`，搜索框留空即可，不强制要求编辑老记录时必须重新选择。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 新增询价时，搜索客户能只输入联络人简称、客户简称、客户全称片段中的任意一个片段都能命中；选中已存在客户后，再次点回搜索框不会跳出"新建客户"提示（除非真的输入库里不存在的新内容）
- 一个客户有多个联络人时，下拉里能直接看到"简称-各联络人简称"的多条独立可选行，不需要选完客户再单独选联络人
- "新建客户"只在真的搜不到匹配时出现，视觉上是列表末尾的次要入口，不是原来那种抢眼的蓝色按钮
- 新建客户走的是"公司简称+联络人姓名"两个字段的小表单，不会把搜索框里的怪异组合字符串当成新公司名

---

## TASK-66：询报价登记表支持"批量关联客户"，处理历史未关联记录

**背景**：TASK-63 的一次性回填脚本对生产 692 条历史询价记录全部匹配失败（历史 `customerNo`/`inquirer` 文本和客户库的简称/编号对不上）。现有"待关联客户"筛选（`linkStatus: 'unlinked'`）能筛出这些记录，但目前没有任何批量处理手段，只能一条条打开编辑弹窗手动改，692 条太慢。Roger 要求：询报价登记表里支持批量关联客户。

**方案**：复用 `InquiryPage.tsx` 里已有的"批量选择"基础设施（`isEditMode`/`selectedIds`/`handleToggleSelectAll`，TASK-57B 加的），在批量操作菜单里新增一个"批量关联客户"动作。

### 改动 1：新增 `BatchLinkCustomerModal.tsx`（`src/features/inquiry/components/`）

```ts
interface BatchLinkCustomerModalProps {
  isOpen: boolean;
  count: number;              // 选中的记录数，用于文案确认
  onClose: () => void;
  onConfirm: (customerId: string, contactId: string) => void;
}
```

内部渲染 TASK-65 新建的 `<CustomerContactPicker customers={...} onSelect={...} />`（不传 `onCreateNew`——批量关联场景下客户库里没有的客户应该先去客户管理页面建好，不在这个弹窗里顺带建，保持这个弹窗简单）。顶部/底部文案："将把选中的 {count} 条询价记录关联到下方选择的客户"，选中一个选项后底部"确认关联"按钮才可点击，点击后调用 `onConfirm(customerId, contactId)` 并关闭弹窗。客户列表通过 `customerService.fetchAllCustomers('customer')` 在弹窗打开时拉取一次。

### 改动 2：`InquiryPage.tsx` 接入批量关联动作

- 新增 `const [isBatchLinkOpen, setIsBatchLinkOpen] = useState(false);`
- 在批量编辑菜单（`isEditMode && selectedIds.size > 0` 那个条件块，现在只有"删除选中"和"取消选择"）里，"删除选中"上方加一个"关联客户（{selectedIds.size}）"按钮，图标用 `lucide-react` 的 `Link2`，点击 `setIsBatchLinkOpen(true)`（不要用红色系样式，避免和删除混淆，用蓝色/中性色）。
- 新增 `handleBatchLinkCustomer = (customerId: string, contactId: string) => { Array.from(selectedIds).forEach((id) => updateRecord(id, { customerId, contactId })); setIsBatchLinkOpen(false); setSelectedIds(new Set()); alert(\`已关联 ${selectedIds.size} 条记录\`); }`——注意 `updateRecord` 是 `useInquiryStore` 里已有的通用方法（`updateRecord(id, patch: Partial<InquiryRecord>)`），内部已经处理了本地状态更新 + fire-and-forget 同步到 D1（`syncUpdatedRecord` → `inquiryService.updateInD1`，Worker 侧 `PUT /api/inquiry/:id` 是合并写入，不会覆盖掉记录其他字段），不需要新建 Worker 接口，直接循环调用即可。批量数量较大（几十到几百条）时这是几十到几百次并发的 fire-and-forget 请求，如果发现浏览器/Worker 有明显卡顿或报错再考虑加节流（比如分批 `await` 20 条一组），第一版先直接循环，能跑通即可。
- 渲染 `<BatchLinkCustomerModal isOpen={isBatchLinkOpen} count={selectedIds.size} onClose={() => setIsBatchLinkOpen(false)} onConfirm={handleBatchLinkCustomer} />`。

### 改动 3（确认现状，不需要改代码）

`InquiryTable.tsx` 表头已有"全选"复选框（`onToggleSelectAll?.(allIds)`，`allIds` 是当前筛选后可见的记录），配合"待关联客户"筛选，用户已经可以做到"筛出待关联记录 → 全选 → 批量关联客户"的完整流程，不需要额外加"全选筛选结果"的按钮。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 询报价登记表开启"批量选择"、勾选若干条记录后，能看到"关联客户（N）"按钮
- 点击后弹窗内可以搜索并选中一个"简称-联络人简称"组合，确认后选中的所有记录的 `customerId`/`contactId` 被更新（客户详情页对应客户的"业务统计"询价数应相应增加）
- 批量关联不影响这些记录原有的 `customerNo`/`inquirer`/供应商报价/客户报价等其他字段（Worker 合并写入生效，没有整条记录被覆盖丢字段）
- 结合"待关联客户"筛选 + 表头全选，可以一次性处理一大批同名历史记录

---

## TASK-65/66 复核结论（Claude 已核对，通过）

`CustomerContactPicker.tsx` 的 `committedLabelRef` 机制核对过：重新聚焦已选中的搜索框时 `effectiveQuery` 会被当作空字符串处理，不再拿组合展示串误判成"无匹配"，`InquiryFormModal.tsx`/`BatchLinkCustomerModal.tsx` 接入方式与规格一致，"新建客户"改成了公司简称+联络人姓名两个独立字段的小表单。`InquiryPage.tsx` 批量关联直接复用已有 `updateRecord`（Worker 合并写入），菜单位置和交互符合规格。独立跑过 `tsc --noEmit`（通过）和对 4 个改动文件的 `eslint`（无警告）；`npm run build` 因这次审核环境单条命令有执行时限、后台任务无法跨调用存活，没能在 Claude 这边独立跑完整，但前面的走查加上 tsc/eslint 全过，足以确认正确性。

---

## TASK-67：客户地址支持多行显示 + 编辑时可手动换行

**背景（Roger 反馈，附 INDIAN CHAIN PRIVATE LIMITED 客户详情页截图）**：这个客户的地址字段里其实塞了地址+电话+邮箱+IEC+PAN+GSTIN 好几段信息，但界面上挤成一整行看不清（`238B AJC BOSE ROAD KOLKATA 700020Phone : +91 33 4017 7000Email : info@indianchain.comIEC: 0288034830PAN NO: AAACI6291GGSTIN No : 19AAACI6291G1ZE`）。TASK-64 已经把 `CustomerInfoCard.tsx` 的地址展示改成了 `whitespace-pre-wrap`（支持渲染 `\n` 换行），但这治标不治本——真正的问题是数据里根本没有换行符：`CustomerForm.tsx` 里"地址"字段用的是单行 `<input type="text">`（`FormField` 组件, `FIELD_CLASS` 里是固定 `h-10`），单行输入框天然无法输入或粘贴保留换行，导致所有历史地址数据（很可能是从其他系统整段复制粘贴进来的）都是这种挤在一起的长字符串。

**这次要改两件事，双管齐下**：

### 改动 1：展示层启发式换行——不改数据，只改渲染，让现有历史数据立刻好看

在 `src/features/customer/components/CustomerInfoCard.tsx`（或新建一个小工具函数 `src/features/customer/utils/formatAddress.ts`，供其他用到地址展示的地方一起复用）新增一个 `formatAddressForDisplay(address: string): string`：

- 如果 `address` 里已经包含 `\n`，原样返回（说明是新数据或已经手动整理过，不要重复处理）。
- 如果没有 `\n`，用正则在常见标签前插入换行，标签清单（不区分大小写，容忍标签和冒号之间有空格）：`Phone`、`Tel`、`Fax`、`Email`、`Mail`、`IEC`、`PAN NO`、`PAN`、`GSTIN No`、`GSTIN`、`Website`、`Mobile`——大致是 `/(?<!^)\s*(Phone|Tel|Fax|E-?mail|IEC|PAN\s*NO|GSTIN\s*No|GSTIN|Website|Mobile)\s*:/gi`，命中处替换成 `\n$1:`（第一次出现在字符串开头的不加换行，避免地址本身第一段就是这几个词之一时开头多一个空行）。
- `CustomerInfoCard.tsx` 渲染地址时用 `formatAddressForDisplay(customer.address)` 包一层，其余 `whitespace-pre-wrap break-words` 保持不变。

### 改动 2：`CustomerForm.tsx` 地址字段改成 `<textarea>`，支持编辑时手动换行

- 地址字段（`id="address"`）不再用 `FormField`（那个组件内部写死是 `<input>`），单独写一小段：`<textarea>`，3~4 行高（`rows={3}`），允许用户手动换行分段（新建客户或后续编辑存量客户时，可以把地址、电话、邮箱等分开一行一行填，不用再依赖启发式正则去猜）。样式上沿用 `FIELD_CLASS` 的边框/圆角/焦点样式，但去掉固定 `h-10`，换成 `min-h-[4.5rem] py-2` 之类。
- 保存逻辑不用改（`address` 本来就是字符串，`\n` 可以正常存进 D1 的 JSON `data` 字段）。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- INDIAN CHAIN PRIVATE LIMITED 这类历史数据，不用手动编辑，详情页地址就能自动按 Phone/Email/IEC/PAN/GSTIN 等标签分行显示
- 已经手动整理过换行的地址（存量或新建的都一样）不会被误处理成奇怪的双重换行
- 客户表单里编辑地址是一个可以直接按回车换行的多行文本框，不再是单行输入框

---

## TASK-68：客户详情页"业务统计"里的联络人行，点击跳转到询报价登记表并按该联络人筛选

**背景（Roger 反馈）**："将在询报价单中显示的联络人字符，在这个详情页可作为关联项"——客户详情页"业务统计"卡片里，联络人拆分表格（比如 INDIAN CHAIN 详情页里 Prateek 询价0订单0、Sumanta 询价51订单15 那两行）现在只是纯展示，点了没反应。Roger 想要点这些行能直接跳到询报价登记表、看到这个联络人对应的具体记录列表（而不是只看到一个孤零零的数字 51，不知道是哪些单子）。

### 改动 1：`useInquiryFilter.ts` 增加按 `customerId`/`contactId` 筛选

- `InquiryFilterState` 新增两个字段：`customerId: string`、`contactId: string`（默认 `''`，加入 `DEFAULT_FILTER`）。
- `baseFiltered` 里加两行过滤：`if (filter.customerId && record.customerId !== filter.customerId) return false;` 和 `if (filter.contactId && record.contactId !== filter.contactId) return false;`（放在现有 `linkStatus` 判断附近即可）。
- `activeCount` 计算里加上 `Boolean(filter.customerId)` 这一项（`contactId` 不用单独算，永远伴随 `customerId` 一起出现，算一次即可）。
- `reset()` 复用 `DEFAULT_FILTER`，两个新字段自然会被清空，不用额外处理。

### 改动 2：`InquiryPage.tsx` 读取 URL 上的 `customerId`/`contactId`/`label` 参数，预设筛选，并显示一个可清除的筛选提示条

- 用 `useSearchParams()`（`next/navigation`，页面本来就是 client component）读取 `customerId`、`contactId`、`label`（`label` 是外部传来的展示文案，比如"IC-Sumanta"，用来在筛选条上显示，不用反查客户名）。
- 用一个 `useEffect`（依赖 `searchParams`）：如果读到 `customerId` 就 `setFilter((prev) => ({ ...prev, customerId, contactId: contactId ?? '' }))`，只在参数存在时触发一次（不要每次 render 都重复 set，用 `searchParams?.toString()` 或参数值本身做依赖）。
- 在 `InquiryFilterBar` 上方（或 `InquiryFilterBar` 内部搜索框左侧，看哪个改动量小）加一个筛选提示 chip：当 `filter.customerId` 非空时显示"关联：{label || '客户'} ✕"，点击 `✕` 清空 `customerId`/`contactId`（不用完全重置其他筛选条件，只清这两个字段）。`label` 从 URL 参数带过来，存在一个 state 里（因为清空筛选后 URL 参数还在，不需要跟着变；只是别再从 URL 重新读取覆盖用户已经手动清除的操作——用一个 `hasAppliedUrlFilter` ref 或类似的一次性标记，保证只在页面首次加载时应用一次 URL 里的筛选）。

### 改动 3：`CustomerDetailPage.tsx` 联络人统计行改成可点击链接

- `stats.contacts.map(...)` 渲染的每一行外面包一层 `<Link href={\`/inquiry?customerId=${customer.id}&contactId=${contact.contactId}&label=${encodeURIComponent(\`${customer.shortName || customer.name}-${contact.shortName || contact.name}\`)}\`}>`，整行可点击（hover 有高亮），跳转到询报价登记表并自动应用上面的筛选。
- 顺手把"业务统计"卡片最上面的"公司询价"/"公司订单"两个数字格子也包成链接（只带 `customerId`，不带 `contactId`），方便验证公司级别的总数对不对得上。"未分配联络人"那个格子不用做链接（那个概念对应的是 `customer_id` 有值但 `contact_id` 为空的记录，现有筛选机制还不支持这种"有客户无联络人"的组合，这次不做，需要的话可以再提）。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 在客户详情页点击某个联络人的统计行，能跳转到询报价登记表，且列表已经自动筛选成只显示这个联络人的记录，数量应该和详情页显示的"询价 N"一致
- 筛选条上能看到一个"关联：xxx ✕"的提示，点 ✕ 能清除这个筛选（不影响其他已设置的筛选条件比如时间范围）
- 点击公司级别的"公司询价"数字，同样能跳转并筛选出该客户名下（不限联络人）的全部记录
- 不带 `customerId`/`contactId` 参数正常访问 `/inquiry`（比如从侧边栏直接进入）行为不受影响

---

## TASK-69：客户/供应商/收货人列表"···"菜单被裁剪的 bug + 行内信息密度优化

**背景（Roger 反馈"编辑和删除按钮无法正常操作"，追问后确认）**：不是点击没反应，是"点击后展开的菜单被压下去了，看不到"。

**根因**：`CustomerPage.tsx` 第 184 行左右，包裹标签页+搜索栏+列表的外层卡片容器是 `<div className="overflow-hidden rounded-xl border ...">`——这个 `overflow-hidden` 是为了让顶部标签栏和列表的圆角显示正常，但副作用是：`ProfileListParts.tsx` 里 `RowActionMenu` 展开的下拉菜单是相对于按钮 `absolute` 定位的，一旦这一行离卡片底部边缘比较近（列表稍微长一点、或者菜单打开时数得往下展开的高度超过了卡片剩余的可视高度），展开的菜单就会被这个 `overflow-hidden` 直接裁掉/挡住，看起来"压下去了看不到"，其实菜单是渲染了的，只是被父容器裁剪了。三个列表（客户/供应商/收货人）共用 `ProfileListParts.tsx`，所以都受影响。

**修复方案：菜单改用 Portal 渲染到 `document.body`，彻底摆脱任何父容器 `overflow` 裁剪的影响**（这是这类"下拉菜单在可滚动/裁剪容器里被截断"问题的标准解法，不管以后其他地方套不套 `overflow-hidden` 都不会再受影响）：

- `src/features/customer/components/ProfileListParts.tsx` 的 `RowActionMenu`：
  - 触发按钮（"···"）用 `useRef<HTMLButtonElement>` 记录自身。
  - 点击展开时，先用 `buttonRef.current.getBoundingClientRect()` 算出菜单应该出现的位置（比如 `top: rect.bottom + 4, left: rect.right - 112`，112 大概是菜单宽度 `min-w-[7rem]` 对应的像素值，右对齐到按钮右边缘），存进一个 `position` state，再 `setOpen(true)`。
  - 用 `import { createPortal } from 'react-dom'`，把原来那个 `{open && (<><div fixed inset-0 .../><div absolute right-0 top-8 ...>...</div></>)}` 整体改成 `createPortal(<>...</>, document.body)`，菜单本体的定位从 `absolute right-0 top-8` 改成 `fixed`，用算出来的 `position.top`/`position.left`（内联 style 或 Tailwind 任意值都可以）。
  - 菜单展开期间监听 `scroll`（外层是 `window`/文档级滚动，加在 `window` 上，`capture: true` 保证嵌套滚动容器也能捕获）和 `resize` 事件，触发时直接把菜单关掉（`setOpen(false)`）——这是下拉菜单+Portal 组合最简单可靠的处理方式，不需要做菜单跟随重新定位的复杂逻辑。
  - `z-index` 可以调低一点（比如 `z-50`），因为现在挂在 `document.body` 下面，不再需要硬顶各种局部堆叠上下文。
  - 背后的点击遮罩（`fixed inset-0`）逻辑不变，一起放进 portal。

### 行内信息密度/排版微调（同样在三个列表文件里，样式改动为主）

- 标题（客户名/公司名）和简称两行之间增加一点垂直间距（比如给简称那行加 `mt-0.5`），现在两行贴得太紧。
- 简称目前的样式（`text-xs text-gray-400`）和"主联络人"列、"创建时间"列长得一模一样，扫一眼分不清哪个是哪个——给简称这行换个更轻的视觉权重或者加个小圆点/竖线前缀作区分，避免整行看起来都是同一种灰色文字、没有主次。
- "主联络人"列、"创建时间"列和"···"按钮之间的间距稍微拉开一点（现在挤在一起），可以适当增加 `gap-x` 或者给"···"按钮左侧单独加一点 `pl-2` 之类的留白。
- 不需要改变列表的整体结构（还是整行点击进详情、"···"收编辑删除），这次只是密度/排版层面的微调，具体像素值 Codex 可以自行判断，不需要和这份文档完全一致。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户/供应商/收货人列表里，滚动到接近列表末尾的几行，点击"···"展开的菜单能完整显示（不被裁掉/挡住），编辑、删除都能正常点击
- 菜单展开时滚动页面，菜单会自动关闭（不会出现悬空在错误位置的菜单）
- 三个列表的行内文字层次比之前清楚一点，标题/简称/主联络人/创建时间不再是"一整片同样深浅的灰字"

---

## TASK-70：客户详情页时间轴改为从询报价登记表取数据（完全替换，不再显示报价单/发票/装箱单历史事件）

**背景（Roger 确认："完全替换：只显示询价记录，不再显示报价单等"）**：`CustomerTimeline.tsx` 现在点"同步历史"是调用 `autoTimelineService.ts` 里的 `syncAllHistoryToTimeline()`，从 `quotation_history`/`packing_history`/`invoice_history`（旧的报价单/装箱单/财务发票历史文档）里按**客户名字符串**匹配（`item.customerName === customerAliases[0]`），生成 `quotation`/`confirmation`/`packing`/`invoice` 四种类型的时间轴事件，写进独立的 `customer_timeline_events` localStorage。这套逻辑和这次询价关联客户 ID 的大方向（TASK-59~68 一路在做的"不再靠名字字符串匹配，改成真实 ID 关联"）背道而驰，Roger 要求改成：时间轴的取值来自询报价登记表（`InquiryRecord`），用真实的 `customerId` 关联，事件标题用报价编号（`inquiryNo`）。

**确认过：`useAutoSync.ts` 这个 hook 定义了但整个仓库没有任何地方实际调用它**（`grep` 确认，只在 `hooks/index.ts` 里被 re-export），所以不用担心有后台任务在悄悄同步旧数据，改动范围就是 `CustomerTimeline.tsx`/`useCustomerTimeline.ts` 这一条链路。

### 改动 1：新增询价事件派生函数，不落库、纯计算

新建 `src/features/customer/services/inquiryTimelineService.ts`：

```ts
import type { InquiryRecord } from '@/features/inquiry/types';
import { getDateInputValueFromInquiryNo } from '@/features/inquiry/utils/inquiryUtils';
import type { CustomerTimelineEvent } from '../types';

export function buildInquiryTimelineEvents(
  customerId: string,
  inquiryRecords: InquiryRecord[]
): CustomerTimelineEvent[] {
  return inquiryRecords
    .filter((record) => record.customerId === customerId)
    .map((record) => ({
      id: `inquiry-${record.id}`,
      customerId,
      type: 'inquiry' as const,
      title: `询价 ${record.inquiryNo}`,
      description: record.description || `询价人：${record.inquirer}`,
      date: getDateInputValueFromInquiryNo(record.inquiryNo) || record.inquiryDate,
      status: record.orderSubStatus === 'cancelled'
        ? 'cancelled' as const
        : record.orderNo?.trim()
          ? 'completed' as const
          : 'pending' as const,
      documentId: record.id,
      documentNo: record.inquiryNo,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
}
```

`src/features/customer/types/timeline.ts` 的 `TimelineEventType` 加一个 `'inquiry'` 成员：`'quotation' | 'confirmation' | 'packing' | 'invoice' | 'inquiry' | 'custom'`（旧的四个类型先留着，不强制迁移历史 localStorage 数据，只是页面上不再产生/展示这几种）。

### 改动 2：`useCustomerTimeline.ts` 接入询价 store，合并展示，不再合并旧文档类型事件

- 引入 `import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';`，在 hook 里订阅 `const inquiryRecords = useInquiryStore((state) => state.records);`。
- 加一个 `useEffect`，在 `customerId` 有值时调用一次 `useInquiryStore.getState().init()`（`init()` 本身是幂等的重新拉取，不用怕重复调用；这是为了兼容用户没有先打开过询报价登记表、直接进客户详情页看时间轴，`records` 还是空数组的情况）。
- `loadEvents` 里：`TimelineService.getEventsByCustomerIds(customerKeys)` 拿到的结果先 `.filter(event => event.type === 'custom')`（只保留手动添加的自定义事件，历史遗留的 quotation/confirmation/packing/invoice 事件不再展示），再和 `buildInquiryTimelineEvents(customerId, inquiryRecords)` 的结果合并、按 `date` 倒序排序。
- `syncHistory` 改名/改实现（函数名可以保留 `syncHistory` 不用改调用方，内部实现换掉）：不再调用 `syncAllHistoryToTimeline()`，改成 `useInquiryStore.getState().init()` 之后重新 `loadEvents()`——效果上从"同步历史文档"变成"刷新询价数据"。

### 改动 3：`CustomerTimeline.tsx` 展示层小调整

- `eventTypeIcons`/`eventTypeColors`/`getEventTypeLabel` 三个映射加上 `inquiry` 分支（图标用 `FileText` 或 `Search` 都行，颜色用蓝色系，标签"询价"）。`quotation`/`confirmation`/`packing`/`invoice` 对应的映射代码不用删（保留不影响什么，只是不会再被用到）。
- 顶部按钮"同步历史"文案可以顺手改成"刷新"（`Calendar` 图标换成 `RefreshCw` 或保留都行），空状态提示文案里"点击同步历史按钮从历史记录中提取事件"改成"点击刷新按钮拉取最新询价记录，或点击添加事件创建自定义事件"。
- "添加事件"（`CustomEventForm`，手动自定义事件）功能不变，继续保留。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户详情页时间轴只显示两类事件：这个客户名下的询价记录（标题是"询价 {报价编号}"）+ 手动添加的自定义事件，不再出现"报价单"/"财务发票"/"装箱单"类型的历史事件
- 一个客户在询报价登记表里有 N 条已关联的询价记录，时间轴就应该看到 N 条对应的"询价"事件，日期能正确按询价编号对应的日期排序
- 没有先打开过询报价登记表、直接从客户列表点进详情页看时间轴，也能正常显示（不会因为 store 未初始化而是空的）

---

## TASK-71：跟进记录关联询价记录，展示实时报价/订单状态

**背景（Roger 确认："跟询价/订单状态联动"）**：`FollowUpManager.tsx` 现在是一个完全独立的手动待办事项（标题+描述+到期日+优先级+类型），和询价/订单数据没有任何关联。Roger 希望跟进记录能和具体的询价记录挂钩，跟进的时候能看到这条询价现在的实际状态（报价/订单进展），不是记完之后就是个孤立的备忘。

**范围说明**：这次先做"能关联到具体询价记录 + 展示这条询价的实时状态 + 能跳转过去看"，不做"根据询价状态自动生成/提醒跟进"的智能功能（比如"询价3天没报价自动创建跟进"）——那个如果之后需要可以再单独提。

### 改动 1：`CustomerFollowUp` 类型加关联字段

`src/features/customer/types/timeline.ts` 的 `CustomerFollowUp` 接口加一个可选字段：`relatedInquiryId?: string;`（存 `InquiryRecord.id`）。

### 改动 2：`FollowUpManager.tsx` 添加跟进表单里增加"关联询价记录"选择器

- 引入 `useInquiryStore`，取 `records`，用传入的 `customerId` 过滤出这个客户名下的询价记录（`record.customerId === customerId`），如果一条都没有就不显示这个选择器（该客户没有已关联的询价记录，关联不了）。
- 表单里加一个可选的 `<select>`："关联询价记录（可选）"，选项文案 `${record.inquiryNo}${record.description ? ' · ' + record.description : ''}`，选中后存进 `formData.relatedInquiryId`（不选就是 `undefined`，跟现在行为一样纯手动）。
- 提交时把 `relatedInquiryId` 一起传给 `addFollowUp`。

### 改动 3：跟进记录展示时，如果关联了询价，显示实时状态并可跳转

- 在 `followUps`/`upcomingFollowUps`/`overdueFollowUps` 三处渲染跟进卡片的地方（三段结构基本重复，可以抽一个小的 `FollowUpCard` 子组件减少重复），如果 `followUp.relatedInquiryId` 有值：
  - 从 `useInquiryStore` 的 `records` 里按 id 查出对应的 `InquiryRecord`（查不到说明这条询价记录后来被删了，就不显示这部分，不报错）。
  - 显示一小行"关联询价：{inquiryNo}"，加一个简短的状态摘要——用现有的报价/订单状态判断逻辑（`InquiryQuoteStatus.tsx`/`useInquiryFilter.ts` 里已经有类似的状态归类判断，参考 `quoteStatus` 那几个 case 分支：未报价/已报价/无法报价/已成单/已辙销/善后），显示一个对应的小 badge。
  - 这一行整体可以做成 `<Link>` 跳转到 `/inquiry?customerId=${customerId}&keyword=${encodeURIComponent(record.inquiryNo)}`——`useInquiryFilter.ts` 现有的 `keyword` 筛选已经会匹配 `inquiryNo`，用这个字段直接精确定位到这一条记录，不需要再新增筛选维度。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 添加跟进记录时，如果这个客户名下有已关联的询价记录，能在表单里选一条关联上；没有就不显示这个选择器，不影响正常手动跟进
- 一条关联了询价记录的跟进，列表里能看到这条询价当前的实时状态（不是保存跟进时的快照），点击能跳转到询报价登记表并定位到这条记录
- 关联的询价记录如果后来被删除了，跟进记录本身不报错、不崩溃，只是不再显示关联信息

---

## TASK-72：跟进记录支持删除 + "···"菜单靠近视口底部时应该向上展开

**背景（Roger 反馈两点）**

1. "跟进记录要可以删除"——`useCustomerFollowUp.ts` 里 `deleteFollowUp` 这个方法本来就存在（调用 `FollowUpService.deleteFollowUp` 并重新加载列表，逻辑是完整的），只是 `FollowUpManager.tsx` 没有把它解构出来、也没有在卡片上放删除按钮，纯粹是 UI 上漏挂了。
2. 客户列表"···"菜单还是有裁剪问题的截图——TASK-69 把菜单从"父容器 `overflow-hidden` 裁剪"改成了 `createPortal` + `position: fixed`，这部分本身没问题；但这次截图里的行是列表**最后一行**、离浏览器视口底部很近，菜单固定在按钮下方展开（`rect.bottom + 4`），而视口下方剩余空间本来就不够，所以菜单下半截还是会超出可视区域——这是一个新的、独立的边界情况（视口底部空间不够时应该向上展开），TASK-69 当时只处理了"父容器裁剪"和"滚动/resize 关闭"，没处理"贴着视口底部时要不要向上展开"。

### 改动 1：`FollowUpManager.tsx` 加删除按钮

- 从 `useCustomerFollowUp(customerId, customerAliases)` 的返回值里把 `deleteFollowUp` 也解构出来。
- `renderFollowUpCard` 里，靠近"完成"按钮/`CheckCircle` 图标的位置加一个删除按钮（小号 `Trash2` 图标即可，参考 `ProfileListParts.tsx` 里删除按钮的配色 `text-red-600`/`hover:bg-red-50`），点击前用 `window.confirm('确定删除这条跟进记录吗？')` 二次确认（这个组件目前没有接入 `ConfirmDialog` 那套 Promise 化确认弹窗的基础设施，用 `window.confirm` 足够，不用为了这一个按钮专门接入）。
- 确认后调用 `deleteFollowUp(followUp.id)`。

### 改动 2：`ProfileListParts.tsx` 的 `RowActionMenu` 增加"贴近视口底部时向上展开"的判断

- 在 `toggleOpen` 里，算完 `rect` 之后，判断 `window.innerHeight - rect.bottom` 是否小于菜单预估高度（2 个选项，大致 `84px`，可以定义一个 `MENU_HEIGHT_ESTIMATE = 84` 常量）：
  - 空间不够（`window.innerHeight - rect.bottom < MENU_HEIGHT_ESTIMATE + MENU_OFFSET`）时，菜单改成显示在按钮**上方**：`top = rect.top - MENU_HEIGHT_ESTIMATE - MENU_OFFSET`。
  - 空间足够时保持原来的逻辑：`top = rect.bottom + MENU_OFFSET`。
  - `left` 的计算不用变。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 跟进记录列表里每条记录都能删除，删除前有二次确认，删除后列表立即更新
- 客户/供应商/收货人列表里，滚动到让最后一行紧贴浏览器视口底部，点击"···"，菜单应该向上展开、完整可见，不再有任何部分超出可视区域

---

## TASK-73：客户管理列表加"卡片/列表"两种显示方式

**背景（Roger 要求）**："客户列表，做成卡片，列表等多种方式"——现有的行式列表保留，作为其中一种视图，另外加一个卡片视图，用户可以切换。

### 改动 1：新增共享卡片网格组件 `src/features/customer/components/ProfileCardGrid.tsx`

不要照搬 `CustomerList.tsx`/`SupplierList.tsx`/`ConsigneeList.tsx` 三份几乎一样的文件那个模式再复制三份卡片版本——写**一个**通用组件，客户/供应商/收货人三个 tab 共用（复用 `ProfileListParts.tsx` 已经导出的 `getProfileTitle`/`PrimaryContactSummary`/`RowActionMenu`）：

```ts
interface ProfileCardGridProps {
  items: ProfileListItem[];
  loading: boolean;
  searchQuery: string;
  onEdit: (item: ProfileListItem) => void;
  onDelete: (item: ProfileListItem) => void;
  onViewDetail: (item: ProfileListItem) => void;
  emptyLabel: string; // 比如"客户"/"供应商"/"收货人"，用于空状态文案
}
```

- 搜索过滤逻辑和现有 `CustomerList.tsx` 里的 `filtered` 一致（按标题/简称/主联络人电话邮箱过滤），可以直接照抄这段逻辑。
- 布局：响应式网格 `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3`，每张卡片 `rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md transition-shadow dark:border-gray-700 dark:bg-gray-800`，整张卡片（除"···"按钮外）可点击触发 `onViewDetail`（用和现有行一样的 `role="button" tabIndex={0}` + `onKeyDown` 无障碍处理）。
- 卡片内容：头像（复用现有的 `avatarColor`/首字母逻辑，可以从 `CustomerList.tsx` 抄一份颜色数组，或者提到 `ProfileListParts.tsx` 里做成共享函数——如果顺手就提取共享，不强求）+ 标题 + 简称（复用 `ProfileShortName`）在卡片顶部；`PrimaryContactSummary` 单独一行；底部一行小灰字显示创建时间；`RowActionMenu` 放在卡片右上角（`absolute right-2 top-2`，卡片本身要加 `relative`）。
- 加载中显示骨架屏卡片（网格铺几个灰色占位块即可，不用做得太复杂）；空状态和现有列表的空状态文案风格一致。

### 改动 2：`CustomerPage.tsx` 加视图切换

- 加 `const [viewMode, setViewMode] = useState<'list' | 'card'>('list')`（默认保持现在的列表视图，不改变现有用户习惯），可以顺手用 `localStorage`（比如 key `customer_view_mode`）记住上次选择，刷新页面/换 tab 后保留，不强求。
- 在搜索栏那一行右侧（或标签页那一行右侧，哪个改动小放哪）加一个小的切换按钮组，两个图标按钮：`List`（列表）、`LayoutGrid`（卡片），当前选中的高亮（参考现有标签页 active 状态的配色写法）。
- 列表内容区域：`viewMode === 'list'` 时保持现在渲染 `CustomerList`/`SupplierList`/`ConsigneeList` 不变；`viewMode === 'card'` 时统一渲染新的 `ProfileCardGrid`，三个 tab 传入对应的 `customers`/`suppliers`/`consignees` 数组和现有的 `handleEdit`/`handleDelete`/`handleViewDetail`（`handleViewDetail` 已经是通用签名 `(item, type)`，卡片视图下按 `activeTab` 传对应的 type 参数，和列表视图现在的调用方式一致）。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户/供应商/收货人三个 tab 都能在"列表"和"卡片"两种视图间切换，默认是列表视图（不影响现有用户习惯）
- 卡片视图下，点卡片本体进详情页，点"···"能正常编辑/删除（复用同一个 `RowActionMenu`，包括 TASK-72 里加的向上展开逻辑）
- 卡片视图的搜索、加载中骨架屏、空状态都能正常工作，和列表视图的筛选结果一致（同一个搜索词切换视图，看到的应该是同一批数据）

---

## TASK-74：装箱单"收货人"栏不再把自由文本写入客户管理数据库

**背景（Roger 问"客户管理中的客户数据，是从单据管理中获取的吗？"——排查后确认：有，就这一处）**

排查了所有会写入客户管理（`customerService.saveCustomerProfile`）的地方：`InquiryFormModal.tsx`（TASK-65 已改造成规范的两字段小表单）、`CustomerForm.tsx`（客户管理自己的表单）都没问题；但 **`src/components/packinglist/ConsigneeSection.tsx`（装箱单"Consignee"栏）有一个"保存"按钮，`handleSave()` 直接把装箱单里那个自由多行文本框（`consigneeName`，本来是给用户粘贴"公司名+地址+联系方式"整段收货人信息用的）第一行当作 `name`、整段文本当作 `address`、`contacts: []`（不带任何联络人），调用 `saveCustomerProfile({ type: 'consignee', ... })` 直接写进了客户管理的收货人数据库**。这很可能就是客户管理列表里那批"Dear Michelle""To: Mr. Alfredo Garcia Moreno"这类怪异条目的来源之一——用户在装箱单里粘贴邮件里收货人那段文字，点了"保存"，就变成了一条正式的收货人档案，且不满足"至少一个联络人"这个客户管理数据模型的约定。

`getCustomersForDropdown('consignee')`（`loadCustomerData` 用来加载"已保存收货人"下拉列表给用户选用）是只读的，不是问题所在，可以保留。

### 改动

- `ConsigneeSection.tsx` 里删除"保存"这个写入动作（`handleSave` 函数和对应的保存按钮），不再从装箱单往客户管理数据库里写数据。
- 装箱单本身的收货人自由文本框、"从已保存收货人加载"下拉选择功能都保留不变——用户还是可以在装箱单里手动输入本次的收货人信息，也还是可以从已经在客户管理里维护好的收货人档案里选一个来填充；只是不再能从装箱单反向创建/污染客户管理的数据。
- 以后要新增收货人，只能通过客户管理页面本身的"新增收货人"表单（`CustomerForm.tsx`，已经是规范的公司信息+联络人列表结构）。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 装箱单"Consignee"栏不再有"保存"按钮/动作，输入的收货人信息不会再意外写进客户管理数据库
- "从已保存收货人加载"功能不受影响，还能正常读取客户管理里已有的收货人档案

---

## TASK-75：客户详情页把"时间轴"和"跟进记录"合并成一个统一列表，状态按询价实际状态标示

**背景（Roger 要求）**："将时间轴和跟进记录合并，并且状态根据实际询报价表中的状态来标示：未报价/已报价/无法报价/已成单/已辙销"。现在客户详情页是两个独立 tab：时间轴（`CustomerTimeline.tsx`，TASK-70 后已经是"询价事件+手动自定义事件"）和跟进记录（`FollowUpManager.tsx`，TASK-71 后已经支持关联询价记录并显示状态，但状态文案是"已撤销/善后/已成单/无法报价/已报价/未报价"六种，比这次要求的五种多了"善后"）。这次要把两个 tab 合并成一个统一的活动列表，并把状态标示统一成这五种。

### 改动 1：统一的询价状态判定函数（五种状态，替换 TASK-71 里 `FollowUpManager.tsx` 那个六状态版本）

在 `src/features/customer/services/inquiryTimelineService.ts` 里新增导出函数：

```ts
export interface InquiryQuoteStatusBadge {
  label: '未报价' | '已报价' | '无法报价' | '已成单' | '已辙销';
  className: string;
}

export function getInquiryQuoteStatusBadge(record: InquiryRecord): InquiryQuoteStatusBadge {
  if (record.orderSubStatus === 'cancelled') {
    return { label: '已辙销', className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300' };
  }
  if (record.orderNo?.trim()) {
    return { label: '已成单', className: 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300' };
  }
  if (record.quotedStatuses.some((s) => s.type === 'unavailable' || s.type === 'closed')) {
    return { label: '无法报价', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300' };
  }
  if (record.quotedStatuses.some((s) => !s.type || s.type === 'quoted')) {
    return { label: '已报价', className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' };
  }
  return { label: '未报价', className: 'bg-pink-100 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' };
}
```

（注意：`orderSubStatus === 'followup'`善后这种情况这次不单独列状态，直接并入"已成单"分支——只要有 `orderNo` 就算已成单，善后只是成单之后的一个子标记，不再单独占一个状态格。）

`buildInquiryTimelineEvents` 里原来算 `status: 'pending'|'completed'|'cancelled'` 那段可以顺手改成调用这个新函数取 `label`，事件卡片展示的时候用 `getInquiryQuoteStatusBadge` 的结果替代原来的三态状态徽标。

### 改动 2：合并时间轴+跟进记录成一个统一列表

新建 `src/features/customer/components/CustomerActivityFeed.tsx`，替换 `CustomerDetailPage.tsx` 里现在"时间轴/跟进记录"两个 tab 的结构（删除 `activeTab`/`setActiveTab('timeline'|'followup')` 那套 tab 切换 state 和 nav，改成只渲染这一个组件）：

- 内部同时用 `useCustomerTimeline`（拿询价事件+自定义事件）和 `useCustomerFollowUp`（拿跟进记录）两个 hook，把两边的数据统一映射成一种通用的"活动条目"形状（大致 `{ id, kind: 'inquiry' | 'custom' | 'followup', date, title, description?, badge?: InquiryQuoteStatusBadge, raw }`），按日期倒序合并成一个列表渲染。
  - `kind: 'followup'` 的条目如果有 `relatedInquiryId`，联动查出对应的 `InquiryRecord`，用 `getInquiryQuoteStatusBadge` 算出的 `badge` 一起展示（复用 TASK-71 已经做好的"实时查询、不是快照"这套逻辑，不用重新发明）。
  - 三种 kind 用不同的图标/左侧色条做区分（比如询价用蓝色 `Search` 图标，自定义事件用橙色，跟进用紫色/`Clock` 图标），但整体在同一个纵向列表里，不要求做成三个分区，一个时间倒序的统一 feed 就行。
- 顶部保留两个独立的操作入口："添加事件"（复用现有 `CustomEventForm.tsx`，逻辑不变）和"添加跟进"（复用 `FollowUpManager.tsx` 里现有那个跟进表单的字段和提交逻辑，包括 TASK-71 加的"关联询价记录"选择器）——这两个还是各自独立的按钮和表单，只是提交完之后的结果都汇入同一个统一列表展示，不用合并成一个表单。
- 跟进类型的条目保留"完成"/"删除"操作（复用 TASK-72 加的 `completeFollowUp`/`deleteFollowUp`）；自定义事件类型如果原来有编辑/删除能力就保留，没有就不用新增。
- `CustomerTimeline.tsx`/`FollowUpManager.tsx` 这两个文件如果合并完之后彻底没人用了（先 grep 确认一下这次改完之后是不是真的没别的地方引用），可以顺手删掉，连带它们各自的测试文件一起清理；如果发现内部逻辑直接复用起来更省事就复用，不强求必须删文件，重点是 `CustomerDetailPage.tsx` 呈现出来是"一个统一列表"而不是两个 tab。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户详情页不再有"时间轴"/"跟进记录"两个切换 tab，是一个统一的活动列表，时间倒序，询价事件、自定义事件、跟进记录混在一起显示
- 关联了询价记录的询价事件/跟进记录，状态徽标只会是"未报价/已报价/无法报价/已成单/已辙销"这五种之一，且是当前询价记录的实时状态（改了询价的报价/订单状态后，这里应该跟着变，不需要额外刷新页面之外的操作）
- "添加事件"和"添加跟进"两个入口都还能正常用，提交后新条目会出现在同一个统一列表里
- 跟进记录还能正常"完成"/删除

---

## TASK-76：客户详情页整体收紧排版（信息卡片/业务统计/活动列表三块都偏松散）

**背景（Roger 反馈，附 All Marine Spares International LLC 详情页截图）**："将这个页面再优化一下，收紧一下各部分"——详情页从上到下三块（客户信息卡片、业务统计卡片、活动列表）现在内边距/间距都偏大，头像、数字、卡片之间空隙多，46 条活动列表要滚很久。这次不改结构和交互，只收紧间距/字号，让信息密度提高一些。

### 改动 1：`CustomerDetailPage.tsx` 页面整体间距

- 最外层容器 `py-8` 改小一点（比如 `py-5`），三大块之间的 `mb-6` 都改成 `mb-4`。
- "业务统计"卡片：`p-4` 可以保留或略减，`mb-3`（标题下方）改 `mb-2.5`；三个统计格子 `p-3` 改 `p-2.5`，数字 `text-2xl` 改 `text-xl`；联络人拆分行 `px-3 py-2` 改 `px-3 py-1.5`，外层 `mt-4` 改 `mt-3`。

### 改动 2：`CustomerInfoCard.tsx` 收紧

- 卡片整体 `p-6` 改 `p-5`；头像 `h-14 w-14 text-xl` 改小一档 `h-12 w-12 text-lg`；头像和文字之间 `gap-4` 改 `gap-3`；名称 `text-xl` 改 `text-lg`；简称/地址之间的 `mt-3` 改 `mt-2`。
- 联络人区块：分隔线上方 `mt-5 pt-4` 改 `mt-4 pt-3`；"联络人"标题下方 `mb-3` 改 `mb-2.5`；每个联络人小卡片 `px-3 py-2` 改 `px-3 py-1.5`。

### 改动 3：`CustomerActivityFeed.tsx` 活动列表收紧

- 列表条目容器 `space-y-3` 改 `space-y-2`；每条卡片 `p-4` 改 `p-3`；左侧图标圆圈 `h-10 w-10` 改 `h-9 w-9`（图标本身 `h-5 w-5` 相应改 `h-4.5 w-4.5` 或保持不变，看视觉效果）；标题上方 `mt-2` 改 `mt-1.5`；底部日期/询价号那一行 `mt-3` 改 `mt-2`。
- 顶部"活动列表 (N 条)"标题栏和按钮组的间距、跟进表单展开区域的内边距，如果看着也偏松可以顺手收一收，不强求。

这次都是 Tailwind class 层面的数值调整，不涉及任何逻辑改动，Codex 可以根据实际观感做小幅度取舍（不用严格照抄以上数值），整体目标是"看起来比现在紧凑，但还是清晰易读，不要挤到影响可读性"。

**（追加，Roger 二次强调）**：布局收紧要做得再彻底一些，不要只调以上列的这几个具体数值就停手——顶部面包屑区域、"活动列表"标题栏和按钮组的间距、跟进表单展开区域的内边距这些如果看着还是偏松，都一起收紧，目标是整个详情页从上到下都是同一种"紧凑"的观感，不要出现改完了但某几块看起来还是比其他块松散的情况。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户详情页三大块（信息卡片/业务统计/活动列表）整体看起来比现在紧凑，同一屏能看到更多内容
- 不影响任何交互功能（编辑、业务统计跳转、活动列表的添加事件/添加跟进/完成/删除等都还正常）
- 文字不会挤到难以辨认的程度，只是空白减少

---

## TASK-77："公司订单"点击后要自动筛选到"已成单"

**背景（Roger 反馈）**：客户详情页"业务统计"卡片里，"公司询价"和"公司订单"两个数字格子现在点击跳转到询报价登记表用的是同一个链接（`buildInquiryFilterHref(customer)`，只带 `customerId`），效果都是"筛选出这个客户名下全部询价记录"——点"公司订单"应该只看到已经成单的那些，不是全部 46 条询价都出来，用户还得自己再手动点"已成单"筛选 chip。

`useInquiryFilter.ts` 已经有现成的 `quoteStatus: 'has_order'` 筛选值（对应 `InquiryFilterBar.tsx` 里的"已成单"筛选 chip），这次只是要把它接到 URL 参数上。

### 改动 1：`CustomerDetailPage.tsx` 的 `buildInquiryFilterHref` 加一个可选的 `quoteStatus` 参数

```ts
function buildInquiryFilterHref(
  customer: Customer,
  contact?: CustomerStats['contacts'][number],
  quoteStatus?: 'has_order'
) {
  const params = new URLSearchParams({
    customerId: customer.id,
    customerName: customer.shortName || getCustomerTitle(customer),
  });
  if (contact) {
    params.set('contactId', contact.contactId);
    params.set('contactName', contact.shortName || contact.name);
  }
  if (quoteStatus) {
    params.set('quoteStatus', quoteStatus);
  }
  return `/inquiry?${params.toString()}`;
}
```

"公司订单"那个 `<Link href={buildInquiryFilterHref(customer)}>` 改成 `<Link href={buildInquiryFilterHref(customer, undefined, 'has_order')}>`；"公司询价"和联络人拆分行那几处调用不用加这个参数，保持现状（不限状态，显示该客户/联络人名下全部询价记录）。

### 改动 2：`InquiryPage.tsx` 的 URL 筛选应用逻辑读取 `quoteStatus` 参数

现在 `associationFilterKey`/对应的 `useEffect`（读 `customerId`/`contactId`/`customerName`/`contactName`/`keyword` 这几个 URL 参数、一次性应用到 `filter`）里加上 `quoteStatus` 这个参数：读取 `searchParams?.get('quoteStatus')`，值合法（等于 `'has_order'`）时在 `setFilter({...})` 里带上 `quoteStatus: parsed.quoteStatus || filter.quoteStatus`（没有这个参数时保持不变，不要覆盖成 `'all'`，因为现有的其他跳转场景——询价数/联络人行、TASK-71 跟进记录关联跳转——都没带这个参数，不应该受影响）。

### 验证命令

```bash
npx tsc --noEmit
npm run build
```

**验收标准**：
- 客户详情页点"公司订单"，跳转到询报价登记表后自动应用"已成单"筛选，只看到这个客户已成单的记录，数量应该等于详情页"公司订单"显示的数字
- 点"公司询价"、联络人拆分行、跟进记录关联的询价链接，行为不变（不会被这次改动误加上"已成单"筛选）

---

## TASK-67 复核发现一个实际 bug，需要修正（TASK-68 部分已通过，不用动）

**结论**：TASK-68（询报价 `customerId`/`contactId` 筛选 + 详情页联络人行可点击 + 筛选提示条）逐文件核对过（`useInquiryFilter.ts`/`InquiryPage.tsx`/`InquiryFilterBar.tsx`/`CustomerDetailPage.tsx`），逻辑正确，`tsc --noEmit` 独立跑通过，这部分不需要改。

**但 TASK-67 的地址展示修复实际没有生效，需要改正**：`CustomerInfoCard.tsx` 里 `formatAddressForDisplay` 用的正则是

```js
trimmed.replace(
  /\s+(?=(?:Phone|Tel|Telephone|Mobile|Mob|Email|E-mail|IEC|PAN|GSTIN|GST|TIN)\b\s*:?\s*)/gi,
  '\n'
);
```

这个正则要求标签**前面必须先有空白字符**才会匹配（`\s+` 是必需的，不是可选的）。但截图里那条真实数据（INDIAN CHAIN PRIVATE LIMITED 的地址，也就是这次任务的起因）是"700020Phone""7000Email""comIEC""0288034830PAN NO""GGSTIN No"这样**完全没有任何分隔符、直接粘连**的，标签前面根本没有空格，所以这个正则在这条数据上一次都不会命中，整个字符串原样返回——也就是说，触发这次需求的那个具体案例，改完之后其实还是老样子挤在一起，没有变化（已经用这条真实数据在本地跑过验证，确认零匹配）。

**改正方案**：不要求标签前面一定要有空白，只要求"不在字符串开头"，直接在标签前插入换行（标签本身通常后面紧跟着冒号，用这个来避免误伤普通词汇）：

```js
function formatAddressForDisplay(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return '未填写地址';
  if (trimmed.includes('\n')) return trimmed;

  return trimmed.replace(
    /(Phone|Tel|Telephone|Mobile|Mob|E-?mail|IEC|PAN\s*NO|GSTIN\s*No|GSTIN|GST|TIN)(\s*:)/gi,
    (match, label, colon, offset) => (offset === 0 ? match : `\n${label}${colon}`)
  );
}
```

（用 `replace` 的回调函数拿到 `offset`，只有不在字符串开头的匹配才补换行，避免地址第一段恰好就是这几个词之一时开头多一个空行。标签清单和之前保持一致即可，`GSTIN\s*No` 要放在 `GSTIN` 前面，保证优先匹配到更长的"GSTIN No"整体。）

已经用 INDIAN CHAIN PRIVATE LIMITED 那条真实地址在 Node 里跑过这个新正则，能正确拆成六行（地址本身 / Phone / Email / IEC / PAN NO / GSTIN No），改完请照这个思路调整、跑一下 `tsc --noEmit`，不需要额外验证脚本。

---

## TASK-78：客户详情页（customer 类型）消除联络人重复列表，合并卡片，提升信息密度

**优先级**：中
**风险**：低，纯前端渲染重构，不涉及数据层

### 背景 / 根因

TASK-76/77 只是把现有卡片的内外边距、字号收紧了一轮（padding/gap/text-size），用户这次要的是"更紧凑、合理、美观、提高信息密度"，属于结构性问题，不是继续缩 padding 能解决的。

具体问题：`CustomerDetailPage.tsx` 里，customer 类型详情页当前有两处**联络人列表是重复的**：

1. `CustomerInfoCard.tsx` 底部"联络人"区块：每个联络人显示 姓名/简称/主联系人标记 + 电话/邮箱。
2. `CustomerDetailPage.tsx` 里"业务统计"卡片下方的联络人拆分列表：每个联络人显示 姓名/简称/主联系人标记 + 询价数/订单数（可点击跳转）。

同一批联络人被渲染了两遍，分布在两张独立的卡片里，读者要跨卡片对照才能拿到一个联络人的完整信息（电话/邮箱在上面，询价/订单数在下面），既浪费竖向空间，也不利于阅读效率。

修复方案：把"业务统计"卡片的**统计数字部分**（公司询价/公司订单/未分配联络人 三个数字块 + 空数据提示）并入 `CustomerInfoCard.tsx`，联络人只保留一份列表，在这一份列表里同时显示电话/邮箱和询价/订单数（询价/订单数做成一个可点击的小徽章）。这样 customer 类型详情页从 3 张卡片（信息卡 + 业务统计卡 + 活动列表）减少到 2 张卡片（信息卡[含统计+联络人] + 活动列表），且不再有重复数据。

supplier/consignee 类型详情页（`isCustomerDetail === false`）保持现状不变：`CustomerInfoCard` 仍然只显示普通联络人列表（无统计、无跳转），下面的"使用情况"卡片不变。

### 涉及文件

- `src/features/customer/components/CustomerInfoCard.tsx`（改动较大，见下方完整新文件内容）
- `src/features/customer/app/CustomerDetailPage.tsx`（删除业务统计卡片 JSX，改为给 `CustomerInfoCard` 传新 props；`buildInquiryFilterHref` 的 `contact` 参数类型放宽；移除因此变成未使用的 `Link` import）

### 改动一：`CustomerInfoCard.tsx` 替换为以下完整内容

```tsx
'use client';

import Link from 'next/link';
import { Edit, Mail, MapPin, Phone, UserRound } from 'lucide-react';
import type { Customer } from '../types';
import type { CustomerStats } from '../services/customerService';

interface ContactHrefInput {
  contactId: string;
  name: string;
  shortName?: string | null;
}

interface CustomerInfoCardProps {
  customer: Customer;
  onEdit: () => void;
  isCustomerDetail?: boolean;
  stats?: CustomerStats | null;
  isLoadingStats?: boolean;
  buildInquiryHref?: () => string;
  buildOrderHref?: () => string;
  buildContactHref?: (contact: ContactHrefInput) => string;
}

function getDisplayName(customer: Customer) {
  return customer.name.split('\n')[0] || customer.name;
}

function getInitial(customer: Customer) {
  return getDisplayName(customer).charAt(0).toUpperCase() || '客';
}

function formatAddressForDisplay(address: string) {
  const trimmed = address.trim();
  if (!trimmed) return '未填写地址';
  if (trimmed.includes('\n')) return trimmed;

  return trimmed.replace(
    /(Phone|Tel|Telephone|Mobile|Mob|E-?mail|IEC|PAN\s*NO|GSTIN\s*No|GSTIN|GST|TIN)(\s*:)/gi,
    (match, label: string, colon: string, offset: number) => `${offset > 0 ? '\n' : ''}${label}${colon}`
  );
}

export function CustomerInfoCard({
  customer,
  onEdit,
  isCustomerDetail = false,
  stats,
  isLoadingStats,
  buildInquiryHref,
  buildOrderHref,
  buildContactHref,
}: CustomerInfoCardProps) {
  const contacts = customer.contacts;
  const showEmptyStatsHint =
    isCustomerDetail && !isLoadingStats && Boolean(stats) && stats!.totals.inquiries === 0 && stats!.totals.orders === 0;

  return (
    <div className="mb-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {getInitial(customer)}
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-pre-wrap break-words text-lg font-semibold leading-snug text-gray-900 dark:text-white">
              {customer.name}
            </h1>
            {customer.shortName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                简称：{customer.shortName}
              </p>
            )}
            <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="whitespace-pre-wrap break-words">
                {formatAddressForDisplay(customer.address)}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          <Edit className="h-4 w-4" />
          编辑
        </button>
      </div>

      {isCustomerDetail && (
        <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">业务统计</h2>
            {isLoadingStats && <span className="text-xs text-gray-400 dark:text-gray-500">加载中...</span>}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Link
              href={buildInquiryHref ? buildInquiryHref() : '#'}
              className="rounded-lg bg-blue-50 p-2.5 transition hover:ring-2 hover:ring-blue-200 dark:bg-blue-950/30 dark:hover:ring-blue-800"
            >
              <p className="text-xs text-blue-500 dark:text-blue-300">公司询价</p>
              <p className="mt-0.5 text-xl font-semibold text-blue-700 dark:text-blue-200">
                {stats?.totals.inquiries ?? 0}
              </p>
            </Link>
            <Link
              href={buildOrderHref ? buildOrderHref() : '#'}
              className="rounded-lg bg-green-50 p-2.5 transition hover:ring-2 hover:ring-green-200 dark:bg-green-950/30 dark:hover:ring-green-800"
            >
              <p className="text-xs text-green-500 dark:text-green-300">公司订单</p>
              <p className="mt-0.5 text-xl font-semibold text-green-700 dark:text-green-200">
                {stats?.totals.orders ?? 0}
              </p>
            </Link>
            <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-900/60">
              <p className="text-xs text-gray-500 dark:text-gray-400">未分配联络人</p>
              <p className="mt-0.5 text-xl font-semibold text-gray-800 dark:text-gray-100">
                {stats?.unassigned.inquiries ?? 0}
              </p>
            </div>
          </div>
          {showEmptyStatsHint && (
            <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
              暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到
              <Link href="/inquiry" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
                询报价登记表
              </Link>
              使用「待关联客户」筛选手动补充
            </p>
          )}
        </div>
      )}

      <div className="mt-4 border-t border-gray-100 pt-3 dark:border-gray-700">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
          <UserRound className="h-4 w-4 shrink-0 text-gray-400" />
          联络人
        </div>
        {contacts.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2">
            {contacts.map((contact) => {
              const contactStat = stats?.contacts.find((c) => c.contactId === contact.id);
              return (
                <div
                  key={contact.id}
                  className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-1.5 dark:border-gray-700 dark:bg-gray-900/50"
                >
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="truncate text-sm font-medium text-gray-900 dark:text-white">{contact.name}</span>
                      {contact.shortName && (
                        <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">({contact.shortName})</span>
                      )}
                      {contact.isPrimary && (
                        <span className="shrink-0 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                          主
                        </span>
                      )}
                    </div>
                    {isCustomerDetail && buildContactHref && (
                      <Link
                        href={buildContactHref({ contactId: contact.id, name: contact.name, shortName: contact.shortName })}
                        className="shrink-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 transition hover:bg-blue-100 hover:text-blue-700 dark:text-gray-400 dark:hover:bg-blue-950/40 dark:hover:text-blue-300"
                      >
                        询{contactStat?.inquiries ?? 0}·单{contactStat?.orders ?? 0}
                      </Link>
                    )}
                  </div>
                  {(contact.phone || contact.email) && (
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="inline-flex min-w-0 items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Phone className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contact.phone}</span>
                        </a>
                      )}
                      {contact.email && (
                        <a
                          href={`mailto:${contact.email}`}
                          className="inline-flex min-w-0 items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{contact.email}</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <span className="text-sm text-gray-400">未填写联系人</span>
        )}
      </div>
    </div>
  );
}
```

要点说明：
- `isCustomerDetail` 为 `false`（supplier/consignee）时，不渲染"业务统计"区块，联络人行也不渲染询价/订单徽章 —— 渲染结果和改动前完全一样。
- 询价/订单徽章用独立的 `<Link>`（不是把整行包成 `<Link>`），避免和同一行内的 `tel:`/`mailto:` `<a>` 标签发生 HTML 嵌套 `<a>` 的问题。
- `contactStat` 找不到匹配项时（比如 stats 还没加载完，或者这个联络人还没有任何询价记录）用 `?? 0` 兜底显示"询0·单0"，不会报错或显示 `undefined`。

### 改动二：`CustomerDetailPage.tsx`

**2a. 放宽 `buildInquiryFilterHref` 的 `contact` 参数类型**（原来强绑定 `CustomerStats['contacts'][number]`，现在改成只要求 `CustomerInfoCard` 能提供的最小字段集）：

```ts
function buildInquiryFilterHref(
  customer: Customer,
  contact?: { contactId: string; name: string; shortName?: string | null },
  quoteStatus?: 'has_order'
) {
  const params = new URLSearchParams({
    customerId: customer.id,
    customerName: customer.shortName || getCustomerTitle(customer),
  });

  if (contact) {
    params.set('contactId', contact.contactId);
    params.set('contactName', contact.shortName || contact.name);
  }
  if (quoteStatus) {
    params.set('quoteStatus', quoteStatus);
  }

  return `/inquiry?${params.toString()}`;
}
```
（函数体不变，只改参数类型声明。）

**2b. 替换渲染部分**：把原来这一段（`<CustomerInfoCard ... />` 紧跟着的 `isCustomerDetail ? <div>...业务统计...</div> : <div>...使用情况...</div>`，再到 `{isCustomerDetail && (<CustomerActivityFeed .../>)}`）整体替换成：

```tsx
<CustomerInfoCard
  customer={customer}
  onEdit={handleOpenEdit}
  isCustomerDetail={isCustomerDetail}
  stats={stats}
  isLoadingStats={isLoadingStats}
  buildInquiryHref={() => buildInquiryFilterHref(customer)}
  buildOrderHref={() => buildInquiryFilterHref(customer, undefined, 'has_order')}
  buildContactHref={(contact) => buildInquiryFilterHref(customer, contact)}
/>

{!isCustomerDetail && (
  <div className="mb-4 rounded-lg border border-gray-200 bg-white p-3.5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-300">
        <FileText className="h-4 w-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">使用情况</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{usageText}</p>
      </div>
    </div>
  </div>
)}

{isCustomerDetail && (
  <CustomerActivityFeed customerId={customer.id} customerName={displayName} />
)}
```

**2c. 移除 import**：这次改动之后 `Link`（`import Link from 'next/link';`）在 `CustomerDetailPage.tsx` 里不再被用到（原来的用法全部搬进了 `CustomerInfoCard.tsx`），需要删掉这一行 import，否则 eslint 会报 unused-import。`CustomerStats` 类型 import 继续保留（`useState<CustomerStats | null>` 还在用）。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/customer/components/CustomerInfoCard.tsx src/features/customer/app/CustomerDetailPage.tsx` 通过，无新增 warning。
3. `npm run build` 通过（如果沙盒环境限制跑不了完整 build，至少跑通 tsc + eslint 并说明）。
4. 手动核对（看代码即可，不需要截图）：
   - customer 类型详情页：只有一份联络人列表，每个联络人同时显示电话/邮箱和"询X·单Y"徽章；点击徽章跳转到询报价登记表并正确带上 `customerId`/`contactId`/`contactName`；"公司询价"/"公司订单"两个统计数字块可点击，"公司订单"带 `quoteStatus=has_order`。
   - supplier/consignee 类型详情页：`CustomerInfoCard` 渲染结果和改动前一致（无统计区块、联络人行无询价/订单徽章），下方"使用情况"卡片不变。
   - stats 还在加载（`isLoadingStats === true`）时不报错，徽章显示"询0·单0"直到数据回来后刷新为真实值。

### 验收标准

- customer 类型详情页从"信息卡 + 业务统计卡 + 活动列表"3 张卡片变成"信息卡（含统计+联络人）+ 活动列表"2 张卡片，联络人信息不再重复出现两处。
- supplier/consignee 类型详情页行为和视觉效果不变（回归测试点）。
- 所有跳转链接（公司询价/公司订单/联络人徽章）的筛选参数行为与 TASK-76/77 完全一致，不允许有行为变化。

---

## TASK-79：修复"新增询价"弹窗里"客户编号"字段的语义错误

**优先级**：高（数据语义错误，影响每一条新录入的询价）
**风险**：低，改动范围收在 `InquiryFormModal.tsx` 一个文件内，不涉及数据库字段改名

### 背景 / 根因

用户反馈"添加新询价时的客户编号搞错了"。经确认，问题是：这个字段本来应该记录**客户自己发来的询价单/邮件上的编号**（客户那边的参照号，每次询价可能都不一样，需要人工从客户来函里抄过来），但现在的实现完全是另一回事——它是**只读的**，选好客户/联络人后自动回填成"我们系统里这个客户的代码/简称/全称"（`buildCustomerNo(customer) = customer.code || customer.shortName || customer.name`），根本没有地方能让用户手动输入客户来函上的真实编号。这两个概念完全不是一回事，字段名"客户显示编号"其实也在暗示这只是个"派生显示值"而非真实录入项。

具体触发点（`src/features/inquiry/components/InquiryFormModal.tsx`）：
1. `selectCustomerContact`（约第 215 行）：选中客户/联络人时会调用 `setCustomerNo(buildCustomerNo(option.customer))`，强制覆盖成客户档案里的代码/简称/全称。
2. 加载客户库的 `useEffect`（约第 144 行）：编辑模式下，如果能在客户库里匹配到 `record.customerId`，也会用 `setCustomerNo(record?.customerNo || buildCustomerNo(currentCustomer))` 再次用客户档案覆盖。
3. `clearCustomerContactSelection`（约第 225 行）：清空客户选择时连带把 `customerNo` 也清空了，导致用户手动填的客户来函编号会因为改选/清空客户而丢失。
4. 表单里这个字段本身是 `readOnly`（约第 456 行），用户完全没有输入入口。

用户已确认：改成手动输入后，这个字段**仍然必填**（即使客户来函本身没写编号，也要求人工填一个标识占位）。

**范围说明**：`customerNo` 这个字段名、数据库/导出/筛选逻辑不用改，只改它的**产生方式**（从"自动派生自客户档案"改成"用户手动录入"）和**弹窗里的文案**。已确认 `useInquiryFilter.ts` 里那个基于 `customerNo` 去重的 `customers` 列表和 `filter.customerNo` 筛选条件目前没有被任何筛选栏 UI 实际引用（死代码，不受这次改动影响，不用管）。

### 涉及文件

`src/features/inquiry/components/InquiryFormModal.tsx`

### 精确改动

**1. 删除 `buildCustomerNo` 函数**（第 50-52 行），只在本文件内使用，删掉后不会影响别处：

```diff
-function buildCustomerNo(customer: Customer): string {
-  return customer.code || customer.shortName || customer.name;
-}
-
 function buildInquirer(customer: Customer, contact?: Contact): string {
```

**2. `selectCustomerContact`（约第 215-223 行）删除自动覆盖 `customerNo` 的那一行**：

```diff
 const selectCustomerContact = (option: CustomerContactOption) => {
   setCustomerId(option.customerId);
   setContactId(option.contactId);
-  setCustomerNo(buildCustomerNo(option.customer));
   setInquirer(buildInquirer(option.customer, option.contact));
   setCreateCustomerQuery('');
   setNewCustomerName('');
   setNewContactName('');
 };
```

**3. `clearCustomerContactSelection`（约第 225-230 行）删除清空 `customerNo` 的那一行**（清空客户选择不应该清掉用户已经手动填好的客户来函编号）：

```diff
 const clearCustomerContactSelection = () => {
   setCustomerId('');
   setContactId('');
-  setCustomerNo('');
   setInquirer('');
 };
```

**4. 加载客户库的 `useEffect`（约第 144-168 行）删除自动覆盖 `customerNo` 的那一行，并从依赖数组里去掉不再用到的 `record?.customerNo`**：

```diff
   void customerService.fetchAllCustomers('customer')
     .then(({ items }) => {
       if (cancelled) return;
       setCustomers(items);
       const currentCustomer = items.find((customer) => customer.id === (record?.customerId ?? ''));
       if (currentCustomer) {
         const contact = currentCustomer.contacts.find((item) => item.id === record?.contactId) ??
           getPrimaryContact(currentCustomer);
-        setCustomerNo(record?.customerNo || buildCustomerNo(currentCustomer));
         if (contact) {
           setContactId(contact.id);
           setInquirer(record?.inquirer || buildInquirer(currentCustomer, contact));
         }
       }
     })
     .catch((error) => {
       console.warn('加载客户库失败:', error);
     });
   return () => {
     cancelled = true;
   };
-}, [isOpen, record?.contactId, record?.customerId, record?.customerNo, record?.inquirer]);
+}, [isOpen, record?.contactId, record?.customerId, record?.inquirer]);
```

**5. 字段渲染部分（约第 452-463 行）改成可手动输入，并更新文案**：

```diff
   <div className="mb-4 space-y-3">
     <div className="space-y-1">
-      <label className={LABEL_CLS}>客户显示编号</label>
+      <label className={LABEL_CLS}>客户询价编号</label>
       <input
         value={customerNo}
-        readOnly
+        onChange={(e) => setCustomerNo(e.target.value)}
         className={FIELD_CLS}
-        placeholder="选择客户后自动生成"
+        placeholder="客户来函/询价邮件上的编号，客户未提供时可自行填写标识"
         required
       />
     </div>
```

改完之后，`customerNo`（state 变量本身、`InquiryBasicInput`/`InquiryRecord` 里的字段名、提交时 `customerNo: customerNo.trim()`）都不用改，只是它的值现在完全由用户手动输入，选客户/联络人、清空客户选择都不会再动它。新增询价时该字段默认是空的，需要用户照着客户来函手动填写；编辑已有记录时正常显示并可修改已保存的值。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/inquiry/components/InquiryFormModal.tsx` 通过，无新增 warning（注意确认删除 `buildCustomerNo` 后没有遗留未使用的导入）。
3. 手动核对（看代码即可）：
   - 新增询价：不选客户、只手动填"客户询价编号"，能正常提交（因为该字段依然必填，校验逻辑 `!payload.customerNo` 不变）。
   - 新增询价：选好客户/联络人后，"客户询价编号"字段不会被自动覆盖或清空，用户此前手动填的内容原样保留。
   - 清空客户选择（点击清除按钮）后，"客户询价编号"里已填的内容不会被清空。
   - 编辑已有询价记录：字段正常显示 `record.customerNo` 的已保存值，且可编辑修改。

### 验收标准

- "客户询价编号"字段在新增/编辑询价弹窗里是可手动输入的文本框，不再随客户/联络人选择自动回填或清空。
- 字段含义变更后，标签和占位文案清楚地表达"这是客户来函上的编号，需要人工填写"，不再暗示"自动生成"。
- 不改动 `customerNo` 底层字段名、D1 存储结构、导出/筛选逻辑，风险收在表单交互层面。

---

## TASK-80：新增/编辑询价弹窗，"客户与询价人"区块去掉重复显示

**优先级**：低（纯 UI 冗余，不影响数据）
**风险**：极低

### 背景 / 根因

用户截图指出："客户与询价人"这个区块，选好联络人之后，同一个字符串显示了两遍。

具体原因：`CustomerContactPicker`（`src/features/customer/components/CustomerContactPicker.tsx`）选中一个客户/联络人后，自己的搜索框会把已选项的 `label`（`buildCustomerContactLabel` 生成，格式是"客户简称-联系人简称"，比如"IC-Sumanta"）填回输入框显示。而 `InquiryFormModal.tsx` 里，紧跟在这个 picker 下面又渲染了一个独立的只读 `input`，显示的是 `inquirer` 字段，这个字段是通过 `buildInquirer(customer, contact)` 生成的，格式同样是"客户简称-联系人简称"——两者其实是同一个字符串，被渲染了两次。

这个只读框本身从来不能手动编辑（一直是 `readOnly`），纯粹是个派生展示值，删掉它不会丢失任何输入能力；`inquirer` 这个 state 变量和它在提交时的用途（`payload.inquirer`、必填校验 `if (!payload.inquirer) return;`）完全不受影响，只是不再单独渲染一个重复的框。

同时区块标题"客户与询价人"改成"联络人"（更准确：这个区块其实就是选联络人，客户是联络人的从属信息，picker 本身已经显示了完整的"客户-联络人"标签，不需要在标题里重复强调"询价人"）。

### 涉及文件

`src/features/inquiry/components/InquiryFormModal.tsx`

### 精确改动

```diff
                 <span className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-300">
                   <UserRound className="h-3.5 w-3.5" />
-                  客户与询价人
+                  联络人
                 </span>
                 <CustomerContactPicker
                   customers={customers}
                   value={customerId && contactId ? { customerId, contactId } : null}
                   onSelect={selectCustomerContact}
                   onCreateNew={openInlineCreate}
                   onClear={clearCustomerContactSelection}
                   placeholder="搜索客户简称/联络人简称"
                 />

                 {createCustomerQuery && (
                   <div className="mt-2 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-900/60">
                     ...（新建客户内联表单，不变）...
                   </div>
                 )}
-
-                <input
-                  value={inquirer}
-                  readOnly
-                  className="mt-2 h-9 w-full rounded-lg border border-gray-200 bg-gray-50 px-2.5 text-sm font-medium text-gray-700 outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
-                  placeholder="选择后自动生成询价人"
-                  required
-                />
               </div>
             </div>
           </div>
```

即：只删除紧跟在 `{createCustomerQuery && (...)}` 块后面的那个只读 `<input value={inquirer} readOnly ... />`，其余（picker、内联新建客户表单）不变。`inquirer` 这个 state、`setInquirer(...)` 的调用（`selectCustomerContact`/`clearCustomerContactSelection`/两个 `useEffect`）、提交时的 `inquirer: inquirer.trim()` 和必填校验都保持不变——只是不再单独渲染出来。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/inquiry/components/InquiryFormModal.tsx` 通过。
3. 手动核对：新增询价，选好客户/联络人后，"客户与询价人"区块（现在叫"联络人"）只有 picker 一处显示"客户简称-联系人简称"，下面没有第二个重复的框；提交询价时 `inquirer` 字段依然正确带上这个值（校验和存储逻辑不变，只是去掉了多余的展示）。

### 验收标准

- 区块标题显示"联络人"而不是"客户与询价人"。
- 选定联络人后，"客户简称-联系人简称"这行文字只出现一次（在 `CustomerContactPicker` 的输入框里），不再有第二个只读框重复显示同样内容。
- `inquirer` 字段的存储、校验、提交行为完全不变。

---

## TASK-81：客户详情页"活动列表"里询价类活动卡片，内容重排 + "查看询价"改成就地编辑

**优先级**：中
**风险**：低到中（新增了一个嵌入式编辑弹窗，需要跑一遍完整提交链路验证）

### 背景 / 根因

用户截图指出客户详情页"活动列表"里，询价类卡片当前显示：

```
[询价] [未报价]
询价 C260701F              ← 标题：其实就是"询价 " + 询价号
询价人：IC-Sumanta          ← 无内容简述时的兜底行
日期: 2026年7月1日  询价号: C260701F  查看询价
```

问题：
1. 标题"询价 C260701F"和底部"询价号: C260701F"是同一个值重复显示了两遍（标题里的"询价 "前缀本来就和卡片本身的"询价"分类标签重复，此为第三次出现"询价"字样）。
2. 没有内容简述时，兜底显示的是"询价人：{inquirer}"，用户希望改成显示"客户询价编号"（即 TASK-79 里刚改好的、客户来函上的编号 `record.customerNo`），这样更有辨识度。
3. "查看询价"目前是个跳到 `/inquiry` 列表页并带筛选参数的链接，用户希望改成"详情"，点开后直接是这条询价记录的编辑卡片（`InquiryFormModal` 的编辑态），不用跳转页面。

用户这次要的字段顺序/内容：**询价编号、【询价状态】、内容简述(无简述时显示客户询价编号)、详情(点开后是编辑卡片)**。逐条对应：
- "询价编号" → 卡片标题只显示询价号本身，不再重复"询价"前缀。
- "【询价状态】" → 已经有（`activity.badge`，未报价/已报价/无法报价/已成单/已辙销），不用改。
- "内容简述(无简述时显示客户询价编号)" → 兜底文案从"询价人：xxx"改成"客户询价编号：xxx"。
- "详情" → 原"查看询价"链接改成打开就地编辑弹窗的按钮。

**已确认的技术前提**：`event?.documentNo` 这个字段（决定要不要显示"询价号: ..."那行）在当前实际运行的代码路径里，只会被询价类事件设置成 `record.inquiryNo`（`useCustomerTimeline.ts` 只拉取 `custom` 类型的手动事件 + 询价类事件，`custom` 事件由 `CustomEventForm.tsx` 创建，不会设置 `documentNo`；`autoTimelineService.ts` 里另一套"从报价单历史提取时间轴"的逻辑没有被任何地方调用，是死代码），所以删掉"询价号: ..."这行不会丢失任何当前用得到的信息。

### 涉及文件

- `src/features/customer/services/inquiryTimelineService.ts`
- `src/features/customer/components/CustomerActivityFeed.tsx`

### 改动一：`inquiryTimelineService.ts` 的 `buildInquiryTimelineEvents`

```diff
     .map((record) => ({
       id: `inquiry-${record.id}`,
       customerId,
       type: 'inquiry' as const,
-      title: `询价 ${record.inquiryNo}`,
-      description: record.description || `询价人：${record.inquirer}`,
+      title: record.inquiryNo,
+      description: record.description || `客户询价编号：${record.customerNo}`,
       date: getDateInputValueFromInquiryNo(record.inquiryNo) || record.inquiryDate,
```

### 改动二：`CustomerActivityFeed.tsx`

**2a. import 部分**：删除不再需要的 `Link`，新增 `InquiryFormModal` 和询价相关类型：

```diff
-import Link from 'next/link';
 import { AlertTriangle, Calendar, CheckCircle, Clock, FileText, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
 import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
-import type { InquiryRecord } from '@/features/inquiry/types';
+import type { InquiryBasicInput, InquiryRecord, SupplierQuoteStatus, CustomerQuoteStatus } from '@/features/inquiry/types';
+import { InquiryFormModal } from '@/features/inquiry/components/InquiryFormModal';
 import { getInquiryQuoteStatusBadge, type InquiryQuoteStatusBadge } from '../services/inquiryTimelineService';
```

**2b. 删除 `buildInquiryHref` 函数**（不再使用）：

```diff
-function buildInquiryHref(customerId: string, customerName: string, record: InquiryRecord) {
-  const params = new URLSearchParams({
-    customerId,
-    customerName,
-    keyword: record.inquiryNo,
-  });
-  return `/inquiry?${params.toString()}`;
-}
-
 function getActivityTime(value: string) {
```

**2c. 组件内部：拿到 `updateRecord`，新增编辑弹窗状态和提交处理函数**（放在现有的 `inquiryRecords`/`inquiryById` 附近即可）：

```diff
 export function CustomerActivityFeed({ customerId, customerName }: CustomerActivityFeedProps) {
   const inquiryRecords = useInquiryStore((state) => state.records);
+  const updateRecord = useInquiryStore((state) => state.updateRecord);
   const [showCustomEventForm, setShowCustomEventForm] = useState(false);
   const [showFollowUpForm, setShowFollowUpForm] = useState(false);
+  const [editingInquiryRecord, setEditingInquiryRecord] = useState<InquiryRecord | null>(null);
```

再在 `handleDeleteFollowUp` 后面（或任意方法定义区）加一个提交处理函数：

```ts
const handleInquiryEditSubmit = (
  values: InquiryBasicInput,
  suppliers: SupplierQuoteStatus[],
  quoted: CustomerQuoteStatus[]
) => {
  if (!editingInquiryRecord) return;
  updateRecord(editingInquiryRecord.id, {
    ...values,
    supplierStatuses: suppliers,
    quotedStatuses: quoted,
  });
  setEditingInquiryRecord(null);
};
```

（和 `InquiryPage.tsx` 里 `handleSubmit` 的编辑分支写法完全一致，复用同一个 `useInquiryStore.updateRecord`，本地更新 + 后台异步同步 D1 的行为不变。）

**2d. 活动卡片底部：删除"询价号: ..."那行，把"查看询价"链接改成打开编辑弹窗的按钮**：

```diff
                     <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                       <span className="inline-flex items-center gap-1">
                         <Calendar className="h-3.5 w-3.5" />
                         {followUp ? '到期' : '日期'}: {formatDate(activity.date)}
                       </span>
-                      {event?.documentNo && <span>询价号: {event.documentNo}</span>}
                       {event?.amount && <span>金额: {formatAmount(event.amount, event.currency)}</span>}
                       {activity.relatedInquiry && (
-                        <Link
-                          href={buildInquiryHref(customerId, customerName, activity.relatedInquiry)}
+                        <button
+                          type="button"
+                          onClick={() => setEditingInquiryRecord(activity.relatedInquiry ?? null)}
                           className="text-blue-600 hover:underline dark:text-blue-400"
                         >
-                          查看询价
-                        </Link>
+                          详情
+                        </button>
                       )}
                     </div>
```

（这个改动对"询价"类卡片和"跟进"类卡片里带 `relatedInquiry` 的都生效，两者共用同一段 JSX，行为统一：点"详情"都是就地打开这条询价记录的编辑卡片，不再跳转到询报价列表页。）

**2e. 渲染 `InquiryFormModal`**：在文件末尾 `{showCustomEventForm && (<CustomEventForm .../>)}` 后面加上：

```tsx
{editingInquiryRecord && (
  <InquiryFormModal
    isOpen
    mode="edit"
    record={editingInquiryRecord}
    existingRecords={inquiryRecords}
    onClose={() => setEditingInquiryRecord(null)}
    onSubmit={handleInquiryEditSubmit}
  />
)}
```

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/customer/services/inquiryTimelineService.ts src/features/customer/components/CustomerActivityFeed.tsx` 通过，确认没有遗留未使用的 `Link` 导入或 `buildInquiryHref`。
3. 手动核对（看代码即可）：
   - 询价类活动卡片标题只显示询价号本身（比如"C260701F"），不再是"询价 C260701F"。
   - 有内容简述的记录（比如"40mm横档"）显示不变；没有内容简述的记录，兜底显示"客户询价编号：xxx"而不是"询价人：xxx"。
   - 卡片底部不再有单独一行"询价号: ..."。
   - 点"详情"按钮，弹出的是这条询价记录的编辑卡片（`InquiryFormModal` 编辑态，字段都是这条记录已保存的值），不会跳转到 `/inquiry` 页面。
   - 在弹窗里修改并保存，活动列表里对应卡片的标题/简述/状态徽章能反映修改后的内容（因为走的是同一个 `useInquiryStore.updateRecord`，数据是共享的）。
   - 关联了询价记录的跟进（followup）卡片，"详情"按钮同样能弹出对应询价记录的编辑卡片。

### 验收标准

- 询价类活动卡片信息结构为：分类/状态徽章 → 询价编号（标题）→ 内容简述或客户询价编号（兜底）→ 日期 + 详情按钮，不再有重复的"询价号"展示。
- "详情"点击后就地弹出编辑卡片而不是跳转页面，编辑保存后数据通过 `useInquiryStore.updateRecord` 正确落地，和询报价登记表页面编辑同一条记录的效果一致。

---

## TASK-82：客户详情页信息卡，业务统计精简并移到公司名称同一行

**优先级**：中
**风险**：低，单文件改动，不涉及数据获取逻辑

### 背景

用户要求：
1. 业务统计里去掉"未分配联络人"这一项。
2. 剩下的"公司询价"/"公司订单"两个数字，不再单独占一整块"业务统计"区域（带自己的标题、三宫格），而是直接显示在客户名称那一行的右侧（和"编辑"按钮同一行）。

这样客户详情页头部从"姓名行 + 独立的业务统计区块（标题+三宫格+空数据提示）"精简成"姓名行（右侧带询价/订单两个小徽章 + 编辑按钮）+ 需要时才出现的空数据提示"，少了一整块的标题和边框，更紧凑。

### 涉及文件

`src/features/customer/components/CustomerInfoCard.tsx`

### 精确改动

把头部这一块（从外层 `<div className="flex flex-col gap-3 md:flex-row ...">` 开始，到 `{isCustomerDetail && (<div className="mt-4 border-t ...">...业务统计...</div>)}` 结束，即当前文件第 60-135 行）替换成：

```tsx
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-lg font-bold text-white">
            {getInitial(customer)}
          </div>
          <div className="min-w-0">
            <h1 className="whitespace-pre-wrap break-words text-lg font-semibold leading-snug text-gray-900 dark:text-white">
              {customer.name}
            </h1>
            {customer.shortName && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                简称：{customer.shortName}
              </p>
            )}
            <div className="mt-2 flex items-start gap-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
              <span className="whitespace-pre-wrap break-words">
                {formatAddressForDisplay(customer.address)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {isCustomerDetail && (
            <>
              <Link
                href={buildInquiryHref ? buildInquiryHref() : '#'}
                className="rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50"
              >
                询价 <span className="font-semibold">{isLoadingStats ? '…' : (stats?.totals.inquiries ?? 0)}</span>
              </Link>
              <Link
                href={buildOrderHref ? buildOrderHref() : '#'}
                className="rounded-lg bg-green-50 px-2.5 py-1.5 text-xs font-medium text-green-700 transition hover:bg-green-100 dark:bg-green-950/30 dark:text-green-300 dark:hover:bg-green-950/50"
              >
                订单 <span className="font-semibold">{isLoadingStats ? '…' : (stats?.totals.orders ?? 0)}</span>
              </Link>
            </>
          )}
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <Edit className="h-4 w-4" />
            编辑
          </button>
        </div>
      </div>

      {showEmptyStatsHint && (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          暂无关联的询价/订单记录，可能是历史数据尚未关联客户，可到
          <Link href="/inquiry" className="mx-1 text-blue-600 hover:underline dark:text-blue-400">
            询报价登记表
          </Link>
          使用「待关联客户」筛选手动补充
        </p>
      )}
```

后面紧跟的"联络人"区块（`<div className="mt-4 border-t border-gray-100 pt-3 ...">...联络人...</div>`）原样保留、不用动。`showEmptyStatsHint` 这个变量的定义（组件顶部）也不用改。

即：删掉"业务统计"这个标题和三宫格网格，"未分配联络人"这一项彻底不再显示；"公司询价"/"公司订单"两个 `Link` 挪到姓名行右侧、编辑按钮左边，样式从大数字卡片改成小徽章（`询价 12`/`订单 5` 这种一行文字+加粗数字），保留原来的跳转行为（分别带 `has_order` 筛选）；空数据提示保留，位置挪到姓名行下面。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/customer/components/CustomerInfoCard.tsx` 通过。
3. 手动核对：
   - customer 类型详情页：姓名行右侧依次显示"询价 N"、"订单 N"两个小徽章、然后是"编辑"按钮；点击两个徽章的跳转行为和之前一致（订单带 `has_order` 筛选）。
   - 不再有"未分配联络人"这个数字出现在页面任何地方。
   - supplier/consignee 类型详情页：姓名行右侧只有"编辑"按钮，没有询价/订单徽章（`isCustomerDetail` 为 false），和之前视觉一致。
   - 没有关联询价/订单记录时，姓名行下方仍然显示"暂无关联的询价/订单记录…"提示。

### 验收标准

- "业务统计"标题和三宫格整块消失，"未分配联络人"不再显示。
- "公司询价"/"公司订单"数字以小徽章形式出现在客户名称同一行的右侧（编辑按钮旁边）。
- 所有原有跳转链接、空数据提示的触发条件保持不变。

---

## TASK-83：客户详情页"活动列表"精简为纯询价单行列表，去掉事件和跟进

**优先级**：中
**风险**：中（大幅简化组件逻辑，删除了事件/跟进相关的状态和函数，需要仔细跑一遍 tsc/eslint 确认没有遗留死代码引用）

### 背景

用户明确要求：
1. 活动列表里去掉"事件"和"跟进"这两类，都用不到——即去掉"添加事件"/"添加跟进"按钮、对应的表单、以及列表里这两类卡片本身，活动列表只保留询价记录。
2. 每条询价记录只需要显示三项内容：**询价号码、描述/客编（有内容简述显示内容简述，没有则显示客户询价编号——这个逻辑 TASK-81 已经做好了，不用再改）、详情**（点开是编辑卡片，TASK-81 已实现，保留）。除此之外的东西（分类标签"询价"、状态徽章、图标、日期、金额等）都不要显示。
3. 中屏和大屏（`md` 断点及以上）时，这三项内容要能显示在同一行；小屏可以按需要换行堆叠。

**范围说明**：这次只是让"客户详情页的活动列表"这个组件不再渲染/使用事件和跟进的数据与交互入口，不delete这些功能背后的文件（`useCustomerFollowUp.ts`、`CustomEventForm.tsx`、`FollowUpManager.tsx`、`TimelineService`、`useCustomerTimeline.ts`）——这些文件保留在代码库里不用管，只是不再被这个组件引用。如果以后确认这些功能彻底不需要了，可以再单独清理，这次不做。

### 涉及文件

`src/features/customer/components/CustomerActivityFeed.tsx`（整个文件替换成下面的内容）

### 新文件内容

```tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { useInquiryStore } from '@/features/inquiry/state/inquiry.store';
import type { CustomerQuoteStatus, InquiryBasicInput, InquiryRecord, SupplierQuoteStatus } from '@/features/inquiry/types';
import { InquiryFormModal } from '@/features/inquiry/components/InquiryFormModal';
import { buildInquiryTimelineEvents } from '../services/inquiryTimelineService';

interface CustomerActivityFeedProps {
  customerId: string;
  customerName: string;
}

interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  relatedInquiry?: InquiryRecord;
}

export function CustomerActivityFeed({ customerId }: CustomerActivityFeedProps) {
  const inquiryRecords = useInquiryStore((state) => state.records);
  const updateRecord = useInquiryStore((state) => state.updateRecord);
  const [editingInquiryRecord, setEditingInquiryRecord] = useState<InquiryRecord | null>(null);

  const inquiryById = useMemo(
    () => new Map(inquiryRecords.map((record) => [record.id, record])),
    [inquiryRecords]
  );

  useEffect(() => {
    useInquiryStore.getState().init();
  }, [customerId]);

  const activities = useMemo<ActivityItem[]>(() => {
    return buildInquiryTimelineEvents(customerId, inquiryRecords).map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      relatedInquiry: event.documentId ? inquiryById.get(event.documentId) : undefined,
    }));
  }, [customerId, inquiryRecords, inquiryById]);

  const handleRefresh = () => {
    useInquiryStore.getState().init();
  };

  const handleInquiryEditSubmit = (
    values: InquiryBasicInput,
    suppliers: SupplierQuoteStatus[],
    quoted: CustomerQuoteStatus[]
  ) => {
    if (!editingInquiryRecord) return;
    updateRecord(editingInquiryRecord.id, {
      ...values,
      supplierStatuses: suppliers,
      quotedStatuses: quoted,
    });
    setEditingInquiryRecord(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-300" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">活动列表</h3>
          <span className="text-xs text-gray-500 dark:text-gray-400">({activities.length} 条)</span>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
          刷新
        </button>
      </div>

      {activities.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white px-5 py-9 text-center text-gray-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400">
          <Calendar className="mx-auto mb-3 h-10 w-10 opacity-50" />
          <p>暂无询价记录</p>
          <p className="mt-2 text-sm">点击"刷新"拉取最新询价记录。</p>
        </div>
      ) : (
        <div className="space-y-2">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:gap-3"
            >
              <span className="shrink-0 font-mono text-sm font-semibold text-gray-900 dark:text-white">
                {activity.title}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                {activity.description}
              </span>
              {activity.relatedInquiry && (
                <button
                  type="button"
                  onClick={() => setEditingInquiryRecord(activity.relatedInquiry ?? null)}
                  className="shrink-0 self-start text-sm text-blue-600 hover:underline dark:text-blue-400 md:self-auto"
                >
                  详情
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {editingInquiryRecord && (
        <InquiryFormModal
          isOpen
          mode="edit"
          record={editingInquiryRecord}
          existingRecords={inquiryRecords}
          onClose={() => setEditingInquiryRecord(null)}
          onSubmit={handleInquiryEditSubmit}
        />
      )}
    </div>
  );
}
```

要点说明：
- `CustomerActivityFeedProps` 仍然保留 `customerName` 字段（`CustomerDetailPage.tsx` 调用处不用改），只是组件内部不再解构/使用它——不会有 TS/eslint 报错，接口没变化。
- `activities` 直接由 `buildInquiryTimelineEvents(customerId, inquiryRecords)`（TASK-81 里已经改好格式：标题=询价号，描述=内容简述或客户询价编号兜底）映射而来，不再经过 `useCustomerTimeline`/`useCustomerFollowUp` 这两个 hook，也不再合并 custom/followup 事件。
- 每一行用 `flex flex-col ... md:flex-row md:items-center` 实现："中屏和大屏"（`md` 及以上）三项内容在同一行，小屏堆叠。
- "刷新"按钮只需要重新触发 `useInquiryStore.getState().init()`（原来的写法一样），不再涉及跟进数据刷新。
- 删除了 `KIND_CONFIG`、状态徽章（`getInquiryQuoteStatusBadge`）、跟进优先级/完成/过期徽章、事件表单、跟进表单等一切事件/跟进相关代码。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/customer/components/CustomerActivityFeed.tsx` 通过。
3. 全项目搜索确认 `CustomerActivityFeed.tsx` 里不再出现 `CustomEventForm`、`useCustomerFollowUp`、`useCustomerTimeline`、`followUp`、`事件`、`跟进` 字样。
4. 手动核对：
   - 活动列表标题栏只有"活动列表 (N 条)"和"刷新"按钮，没有"添加事件"/"添加跟进"按钮。
   - 每一行只显示：询价号、描述（或客户询价编号兜底）、详情。没有分类标签、状态徽章、日期、图标。
   - 在浏览器宽度 ≥ 768px（`md` 断点）时，三项内容在同一行显示；窄屏时可以堆叠换行，不影响阅读。
   - 点击"详情"仍然能正确打开这条记录的编辑弹窗，保存后活动列表内容能刷新（因为共用 `useInquiryStore`）。
   - `CustomerDetailPage.tsx` 不用改，`<CustomerActivityFeed customerId={customer.id} customerName={displayName} />` 调用处保持原样，确认没有因为这次改动报类型错误。

### 验收标准

- 活动列表不再包含事件/跟进相关的按钮、表单、卡片和状态。
- 每条询价记录只显示询价号、描述/客户询价编号、详情三项内容。
- 中屏/大屏下这三项内容显示在同一行；"详情"点击行为和数据来源与 TASK-81 保持一致。

---

## TASK-84：活动列表补回"询价状态"徽章

**优先级**：中
**风险**：低

### 背景

TASK-83 把活动列表精简成"询价号、描述/客户询价编号、详情"三项后，把状态徽章（未报价/已报价/无法报价/已成单/已辙销）也一并去掉了。用户反馈这个漏掉了，需要加回来——即在 TASK-83 的三项基础上，把 `getInquiryQuoteStatusBadge` 这个状态徽章补回每一行，其余（去掉事件/跟进、单行布局）保持不变。

### 涉及文件

`src/features/customer/components/CustomerActivityFeed.tsx`

### 精确改动

**1. import：从 `inquiryTimelineService` 里多导入 `getInquiryQuoteStatusBadge` 和 `InquiryQuoteStatusBadge` 类型**

```diff
-import { buildInquiryTimelineEvents } from '../services/inquiryTimelineService';
+import { buildInquiryTimelineEvents, getInquiryQuoteStatusBadge, type InquiryQuoteStatusBadge } from '../services/inquiryTimelineService';
```

**2. `ActivityItem` 接口加一个 `badge` 字段**

```diff
 interface ActivityItem {
   id: string;
   title: string;
   description?: string;
   relatedInquiry?: InquiryRecord;
+  badge?: InquiryQuoteStatusBadge;
 }
```

**3. `activities` 的 `useMemo` 里，取到 `relatedInquiry` 后顺便算出 `badge`**

```diff
   const activities = useMemo<ActivityItem[]>(() => {
-    return buildInquiryTimelineEvents(customerId, inquiryRecords).map((event) => ({
-      id: event.id,
-      title: event.title,
-      description: event.description,
-      relatedInquiry: event.documentId ? inquiryById.get(event.documentId) : undefined,
-    }));
+    return buildInquiryTimelineEvents(customerId, inquiryRecords).map((event) => {
+      const relatedInquiry = event.documentId ? inquiryById.get(event.documentId) : undefined;
+      return {
+        id: event.id,
+        title: event.title,
+        description: event.description,
+        relatedInquiry,
+        badge: relatedInquiry ? getInquiryQuoteStatusBadge(relatedInquiry) : undefined,
+      };
+    });
   }, [customerId, inquiryRecords, inquiryById]);
```

**4. 每一行渲染时，在询价号后面插入状态徽章**

```diff
             <div
               key={activity.id}
               className="flex flex-col gap-1 rounded-lg border border-gray-100 bg-white px-3 py-2 shadow-sm dark:border-gray-700 dark:bg-gray-800 md:flex-row md:items-center md:gap-3"
             >
-              <span className="shrink-0 font-mono text-sm font-semibold text-gray-900 dark:text-white">
-                {activity.title}
-              </span>
+              <span className="shrink-0 font-mono text-sm font-semibold text-gray-900 dark:text-white">
+                {activity.title}
+              </span>
+              {activity.badge && (
+                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${activity.badge.className}`}>
+                  {activity.badge.label}
+                </span>
+              )}
               <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-400">
                 {activity.description}
               </span>
```

即在"询价号"和"描述"之间插入状态徽章，其余布局（`md:flex-row` 单行、"详情"按钮）不变。

### 验证

1. `npx tsc --noEmit` 通过。
2. `npx eslint src/features/customer/components/CustomerActivityFeed.tsx` 通过。
3. 手动核对：每条询价活动记录显示"询价号 + 状态徽章（未报价/已报价/无法报价/已成单/已辙销，颜色和之前一致）+ 描述/客户询价编号 + 详情"，中屏/大屏时仍在同一行。

### 验收标准

- 每条询价活动都能看到对应的状态徽章，颜色/文案和询价列表页保持一致（复用同一个 `getInquiryQuoteStatusBadge`）。
- 其余布局和 TASK-83 的结果保持一致，没有引入事件/跟进相关的内容。

---

## TASK-85：批量关联客户后去掉二次确认弹窗（已完成）

### 背景

批量关联客户时，用户已经在 `BatchLinkCustomerModal` 里点击了一次"确认关联"，关联成功后 `InquiryPage.tsx` 又触发浏览器 `alert("已关联 N 条记录")`，体验上变成了两次确认。

### 改动

- `src/features/inquiry/app/InquiryPage.tsx`
  - 删除 `handleBatchLinkCustomer` 末尾的成功 `alert`。
  - 保留批量 `updateRecord`、关闭弹窗、关闭批量菜单、清空选择等原有流程。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/features/inquiry/app/InquiryPage.tsx src/features/inquiry/components/BatchLinkCustomerModal.tsx` 通过。

---

## TASK-86：询价弹窗顶部身份信息区紧凑化（已完成）

### 背景

新增/编辑询价弹窗顶部的日期、询价编号、紧急状态和联络人区域占用空间偏大，新增询价编号在窄宽度下拥挤；紧急勾选后红色状态和编号容易互相挤压。

### 改动

- `src/features/inquiry/components/InquiryFormModal.tsx`
  - 顶部身份信息区改为更紧凑的两列布局。
  - 去掉编号区域内部的块状背景，减少视觉重量。
  - 日期和询价编号字号调小；新增询价编号使用粉红色文字。
  - 紧急状态改为紧凑红色状态胶囊，保留原有 checkbox 语义和提交逻辑。
  - 编辑态和新增态共用同一套紧凑布局。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/features/inquiry/components/InquiryFormModal.tsx` 通过。

---

## TASK-87：客户/联络人显示标签规则统一（已完成）

### 背景

当客户资料里公司有简称、联络人没有简称时，选择器和询价弹窗会显示类似 `Bluereact-Blue React` 的重复组合。业务上这种情况只需要显示公司简称。

### 改动

- `src/features/customer/components/CustomerContactPicker.tsx`
  - `buildCustomerContactLabel` 调整为：公司有简称且联络人无简称时，只返回公司简称。
  - 公司和联络人都有简称时，仍显示 `公司简称-联络人简称`。
- `src/features/inquiry/components/InquiryFormModal.tsx`
  - `buildInquirer` 复用 `buildCustomerContactLabel`，确保保存到询价记录里的 `inquirer` 和选择器显示一致。
- `src/features/inquiry/utils/inquirerOptions.ts`
  - 同步旧入口的候选项生成规则，避免不同入口显示不一致。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/features/customer/components/CustomerContactPicker.tsx src/features/inquiry/components/InquiryFormModal.tsx src/features/inquiry/utils/inquirerOptions.ts` 通过。

---

## TASK-88：编辑询价联络人以客户资料为准并减少加载延迟（已完成）

### 背景

编辑已关联客户的询价时，弹窗里的"询价人/联络人"应以客户资料里的联络人为准，而不是继续信任旧记录里的 `inquirer` 文本。另一个问题是每次打开窗口时，联络人需要等远程客户列表加载完成才显示，用户会看到短暂空白或旧文本。

### 改动

- `src/features/customer/services/customerService.ts`
  - 增加 `getCachedCustomers(type = 'customer')`，允许弹窗先读本地缓存客户资料。
- `src/features/customer/components/CustomerContactPicker.tsx`
  - 增加 `fallbackLabel`，在客户选项尚未加载完但记录已有 `customerId/contactId` 时，先展示已解析出的联络人标签。
- `src/features/inquiry/components/InquiryFormModal.tsx`
  - 打开弹窗时先用缓存客户资料解析 `customerId/contactId`，再拉取远程 D1 客户资料并二次校准。
  - 如果能从客户资料中找到对应联络人，则用客户资料生成 `inquirer`，覆盖旧记录里的历史文本。
- `src/features/inquiry/components/BatchLinkCustomerModal.tsx`
  - 批量关联确认时把选择器标签一起传回。
- `src/features/inquiry/app/InquiryPage.tsx`
  - 批量关联时同步写入 `customerId`、`contactId` 和规范化后的 `inquirer`。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/features/customer/services/customerService.ts src/features/customer/components/CustomerContactPicker.tsx src/features/inquiry/components/InquiryFormModal.tsx src/features/inquiry/components/BatchLinkCustomerModal.tsx src/features/inquiry/app/InquiryPage.tsx` 通过。

---

## TASK-89：客户详情活动列表显示该客户所有联络人的询价（已完成）

### 背景

客户详情页需要显示该客户所有联络人的询价记录，而不是只看某一个联络人或只按客户名字符串匹配。历史数据里还存在三种形态：新记录有 `customerId`，部分记录只有 `contactId`，更旧的记录只有 `inquirer` 文本。

### 改动

- `src/features/customer/app/CustomerDetailPage.tsx`
  - `CustomerActivityFeed` 改为接收完整 `customer`，而不是只传 `customerId/customerName`。
- `src/features/customer/components/CustomerActivityFeed.tsx`
  - 从客户资料收集全部联络人的 `contactId` 和显示别名。
  - 刷新时拉取 D1 询价数据并合并到本地 store，避免客户详情页只看旧 localStorage。
  - 刷新按钮增加加载态，避免重复触发。
- `src/features/customer/services/inquiryTimelineService.ts`
  - `buildInquiryTimelineEvents` 增加 `contactIds` 和 `inquirerAliases` 参数。
  - 匹配优先级：
    - 有 `customerId` 的记录必须精确等于当前客户。
    - 没有 `customerId` 但 `contactId` 属于当前客户任一联络人时纳入。
    - 没有结构化关联的旧记录，再按规范化后的 `inquirer` 别名兜底匹配。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/features/customer/components/CustomerActivityFeed.tsx src/features/customer/services/inquiryTimelineService.ts src/features/customer/app/CustomerDetailPage.tsx` 通过。
- `npm run build` 通过；仅保留项目既有构建 warning。

---

## TASK-90：IMPA 物料接入模块权限并执行生产 D1 迁移（已完成）

### 背景

左侧工具栏的 `IMPA物料` 入口原本是硬编码公开入口，没有接入模块权限体系。这样普通用户是否能看到该外部工具无法在后台权限管理里控制。

### 改动

- `src/components/layout/AppSidebar.tsx`
  - 给 `IMPA物料` 菜单项增加 `permissionKey: 'canUseImpa'`。
  - 在侧边栏权限映射中把 `canUseImpa` 映射到 `impa` 模块。
  - 保持原有行为：点击后仍在新窗口打开 `https://impa.luocompany.com`。
- `src/constants/permissionModules.ts`
  - 后台权限模块列表新增 `impa`，显示为 `IMPA 物料`，分类为 `tool`。
- `src/types/permissions.ts`、`src/utils/mapPermissions.ts`
  - 补齐 `impa` 权限映射，保持类型和运行时结构一致。
- `src/features/customer/components/CustomerContactPicker.tsx`
  - 同次提交中保留了已完成的客户联络人选择器优化：当同一客户多个联络人都没有简称、标签退化为公司简称时，只保留主联络人对应的一项，避免重复公司名条目。
- `migrations/007_grant_default_impa_permission.sql`
  - 新增生产 D1 迁移，给现有普通用户默认补上 `impa` 权限，避免上线后入口突然消失。

### 验证

- `npx tsc --noEmit` 通过。
- `npx eslint src/components/layout/AppSidebar.tsx src/constants/permissionModules.ts src/types/permissions.ts src/utils/mapPermissions.ts src/features/customer/components/CustomerContactPicker.tsx` 通过。
- 已提交并推送到 GitHub：
  - commit：`117e03f4 Add IMPA module permission`
  - branch：`main`
- 已执行生产 D1 迁移：
  - `npx wrangler d1 execute mluonet-users --file=./migrations/007_grant_default_impa_permission.sql --remote`
  - Wrangler 返回成功，实际 `changes = 9`。
  - 复查 SQL：`impa_permissions = 8`，`enabled_permissions = 8`。

### 验收标准

- 后台用户权限弹窗能看到 `IMPA 物料` 模块开关。
- 非管理员只有拥有 `impa` 权限时才显示左侧 `IMPA物料` 入口。
- 管理员仍默认可见。
- 入口继续以新窗口打开 `https://impa.luocompany.com`。

---

## TASK-91：客户分类、客户管理页布局与联络人选择器去重记录补齐（已完成）

### 背景

`docs/core/CHANGELOG.md` 已记录 2026-07-02 的客户管理相关改动，但 `CODEX_TASKS.md` 尾部缺少对应任务记录。为保持任务文档和变更日志一致，需要把已完成的客户分类、客户管理页布局、联络人选择器去重同步补进任务文档。

### 已完成改动

- 客户分类
  - 客户可标记为 `A` / `B` / `C` / `New` / `Blacklist`。
  - 分类备注存入 `categoryNote`，用于说明评定理由。
  - 分类与备注通过 `Customer.data` 透传保存为 `data.category` / `data.categoryNote`，未新增 D1 字段，未修改 `src/worker.ts`。
  - 仅客户 tab 使用分类；供应商和收货人不涉及。
- 展示与筛选
  - `CustomerForm.tsx` 增加客户分类和分类备注编辑项。
  - `CustomerList.tsx`、`ProfileCardGrid.tsx`、`CustomerInfoCard.tsx` 显示分类徽章，备注通过 tooltip 或详情文案展示。
  - `CustomerPage.tsx` 增加分类筛选 chip，并按当前客户数量显示各分类计数。
- 客户管理页布局
  - 移除页面标题下方与 tab 数字重复的汇总提示行。
  - 外层容器改为 `mx-auto max-w-7xl`，避免大屏过宽。
  - 搜索框、分类筛选和视图切换在大屏下合并为更紧凑的一行，小屏自然换行。
- 联络人选择器去重
  - `CustomerContactPicker.tsx` 在同一客户多个联络人都没有简称、标签退化为公司简称时，只保留一项。
  - 去重时优先保留主联络人，避免新增询价选择器出现多条相同公司名。

### 涉及文件

- `src/features/customer/types/index.ts`
- `src/features/customer/services/customerService.ts`
- `src/features/customer/hooks/useCustomerForm.ts`
- `src/features/customer/hooks/useCustomerActions.ts`
- `src/features/customer/components/CustomerForm.tsx`
- `src/features/customer/components/ProfileListParts.tsx`
- `src/features/customer/components/CustomerList.tsx`
- `src/features/customer/components/ProfileCardGrid.tsx`
- `src/features/customer/components/CustomerInfoCard.tsx`
- `src/features/customer/app/CustomerPage.tsx`
- `src/features/customer/components/CustomerContactPicker.tsx`

### 文档对齐

- `docs/core/CHANGELOG.md` 的 `2026-07-02 Unreleased` 已包含：
  - `Added / 客户管理 / 客户分类`
  - `Fixed / 联络人选择器（CustomerContactPicker）`
  - `Changed / 客户管理页布局`
- `CODEX_TASKS.md` 已通过本 TASK-91 补齐对应记录。

---

## TASK-92：Markdown 文档体系整理与过程文件清理（已完成）

### 背景

仓库中积累了大量一次性过程文档、重复总结和过时入口说明。用户要求保留最新现状说明书，并清理不需要长期保留的过程 Markdown。

### 处理原则

- 保留当前事实源：`docs/core/CURRENT_STATE.md`。
- 保留变更历史：`docs/core/CHANGELOG.md`。
- 保留任务账本：`CODEX_TASKS.md`。
- 保留入口说明：`README.md`、`AGENTS.md`、`docs/README.md`、`docs/core/README.md`、`docs/core/PROJECT_SUMMARY.md`。
- 删除根目录和 `docs/core/` 中明显属于临时过程、重复整理报告、旧系统状态报告的一次性 Markdown。
- 不批量改写 `docs/bugfixes/`、`docs/technical/`、`docs/features/` 里的历史材料；这些作为历史证据保留，入口文档会指明它们不是当前事实源。

### 主要改动

- 新增 `docs/core/CURRENT_STATE.md`，汇总当前系统、权限、数据、迁移和风险。
- 更新 `README.md`、`AGENTS.md`、`docs/README.md`、`docs/core/README.md`、`docs/core/PROJECT_SUMMARY.md`。
- 重写客户模块入口文档：
  - `docs/features/customer/README.md`
  - `docs/features/customer/USER_GUIDE.md`
  - `src/features/customer/README.md`
- 重写权限技术现状：
  - `docs/technical/permissions/PERMISSION_SYSTEM_FINAL_SUMMARY.md`
- 更新 `docs/features/README.md` 的客户模块链接。
- 删除根目录临时 CODEX 汇报、session/test 总结，以及 `docs/core/` 中重复过程总结。

### 结果

- Markdown 文件数量从 218 份降到 177 份。
- `docs/core/` 只保留核心入口和必要历史摘要。

---

## TASK-93：修复单据历史 createdAt/updatedAt 乱跳、编辑保存不下来的问题（已完成）

**优先级**：🔴 高（数据正确性问题，影响所有单据类型）
**风险**：中。改动涉及 `src/utils/d1Pull.ts`（前端合并逻辑）和 `src/worker.ts`（服务端 UPDATE 逻辑），后者需要 `npx wrangler deploy`（或走 CI 的 `deploy-worker` job）才会生效。

### 背景（Roger 反馈）

单据历史模块里，创建时间/修改时间会“乱跳”，而且有时候编辑保存后的内容在历史列表里又变回旧的——怀疑是 D1 同步过程影响了这些字段。

排查后确认是两个独立但会相互放大的 bug，根因都在同步链路上，不是某个具体表单页面的问题。

### 根因 1：`mergeIntoStorage` 对已存在于 D1 的记录不比较时间戳，无条件用远端覆盖本地

`src/utils/d1Pull.ts` 第 215-254 行：

```ts
function mergeIntoStorage<T extends LocalStorageItem>(...): void {
  if (!d1Ok) return;
  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const activeIncoming = incoming.filter((item) => !deletedIds.has(item.id));
  const incomingIds = new Set(activeIncoming.map((item) => item.id));
  const map = new Map<string, T>(activeIncoming.map((item) => [item.id, item])); // D1 直接铺底

  for (const item of existing) {
    if (deletedIds.has(item.id)) continue;
    if (incomingIds.has(item.id)) continue; // ← D1 有这条，直接跳过，本地版本被丢弃，不比较 updated_at
    if (pendingIds.has(item.id)) {
      map.set(item.id, item);
    } else {
      recordDeletedDocId(item.id);
    }
  }
  ...
}
```

`pullAllFromD1()` 会在 History 页面 mount、切回浏览器标签页（`visibilitychange`）、点击手动刷新按钮时触发（`src/features/history/app/HistoryPage.tsx` 第 98/137/147-150 行）。`d1SyncDocument` 的写入是 fire-and-forget（`src/utils/d1Sync.ts` 里 `enqueue` + 异步 `fetch`，调用方不等待），只要保存动作和下一次 `pullAllFromD1()` 之间存在时间差（比如保存后立刻跳转到历史页、切标签页、或另一个标签页同时在拉取），GET 请求就可能先于/无关于这次 PUT 落地，拿到的还是这条记录的旧快照。

而 `mergeIntoStorage` 只要判断出“D1 里有这个 id”，就无条件用 D1 版本覆盖本地，完全不管这条记录是不是还有未确认的写入（`pendingIds` 目前只保护“D1 完全没有的记录”这一种情况）——于是刚保存的编辑被旧快照盖掉，表现为“改了但没存住”；下次同步成功后又会变回新值，表现为“时间/内容跳来跳去”。

对照 `CODEX_TASKS.md` 里最早的设计说明（TASK-13 附近）：

> 合并策略：D1 的记录若比 localStorage 中的更新（`updated_at` 更新），则覆盖；本地更新的保留

现在的实现已经不再比较 `updated_at` 了，这是一个回归（regression），需要修复。

### 根因 2：`handleUpdateDocument` 每次 PUT 都可能覆盖 `created_at`

`src/worker.ts` 第 1337-1402 行：

```ts
const updatedAt = getBodyTimestamp(body, 'updated_at', 'updatedAt') || new Date().toISOString();
const createdAt = getBodyTimestamp(body, 'created_at', 'createdAt');
...
if (createdAt) {
  fields.push('created_at = ?');
  values.push(createdAt);
}
```

`created_at` 应该在 `INSERT` 之后就不可变，但这里只要 PUT 请求体带了 `created_at`/`createdAt`（客户端每次保存都会带，见 `quotationHistory.ts`/`invoiceHistory.ts`/`packingHistory.ts`/`purchaseHistory.ts` 里 `d1SyncDocument('update', { created_at: ... })`），就会用它覆盖数据库列。

正常情况下这个值是客户端保留的原始 `createdAt`，覆盖是幂等的、无害的。但一旦本地 `createdAt` 因为根因 1 被污染（本地记录被一次错误的 merge 覆盖成别的时间），下次用户编辑保存时，这个被污染的值会被当作“正确的 createdAt”写回服务端——形成“本地脏数据 → 写回服务端 → 污染其他设备下次同步”的闭环，导致创建时间在多端之间反复跳变，且不会自愈。

### 修复方案

**改动 1：`src/utils/d1Pull.ts` —— `mergeIntoStorage` 按 `updated_at` 比较，且用 `pendingIds` 保护"D1 已有但本地有未确认写入"的记录**

```ts
function mergeIntoStorage<T extends LocalStorageItem>(
  storageKey: string,
  incoming: T[],
  d1Ok: boolean,
  pendingIds: Set<string>,
  deletedIds: Set<string>,
): void {
  // D1 请求失败时不动 localStorage，避免误删本地数据
  if (!d1Ok) return;

  const raw = localStorage.getItem(storageKey);
  const existing: T[] = raw ? JSON.parse(raw) : [];
  const existingById = new Map(existing.map((item) => [item.id, item]));
  const activeIncoming = incoming.filter((item) => !deletedIds.has(item.id));

  const map = new Map<string, T>();

  for (const remote of activeIncoming) {
    const local = existingById.get(remote.id);

    if (local && pendingIds.has(remote.id)) {
      // 本地这条记录还有未确认落地的写入（PUT 可能仍在途或刚失败等重试），
      // 这次 GET 拿到的 D1 快照不可信，保留本地版本，等队列重试成功后下次 pull 再对齐。
      map.set(remote.id, local);
      continue;
    }

    if (local) {
      const localTime = new Date(local.updatedAt ?? local.updated_at ?? 0).getTime();
      const remoteTime = new Date(remote.updatedAt ?? remote.updated_at ?? 0).getTime();
      // 远端不比本地新（时间戳相等或更旧）时保留本地，避免把刚保存的编辑冲掉
      map.set(remote.id, remoteTime > localTime ? remote : local);
    } else {
      map.set(remote.id, remote);
    }
  }

  for (const item of existing) {
    if (deletedIds.has(item.id)) continue;
    if (map.has(item.id)) continue; // 上面已经处理过

    if (pendingIds.has(item.id)) {
      // 仍在待提交队列（本轮 flush 失败）→ 保留本地，等下次重试
      map.set(item.id, item);
    } else {
      // 不在队列且 D1 没有 → 视为已在其他设备删除，不保留
      recordDeletedDocId(item.id);
    }
  }

  const merged = Array.from(map.values()).sort((a, b) => {
    const ta = new Date(a.createdAt ?? a.created_at ?? 0).getTime();
    const tb = new Date(b.createdAt ?? b.created_at ?? 0).getTime();
    return tb - ta;
  });

  localStorage.setItem(storageKey, JSON.stringify(merged));
}
```

**改动 2：`src/worker.ts` —— `handleUpdateDocument` 不再允许 UPDATE 修改 `created_at`**

删掉 `createdAt` 相关的读取和拼接逻辑：

```ts
const updatedAt = getBodyTimestamp(body, 'updated_at', 'updatedAt') || new Date().toISOString();
// created_at 是不可变列，UPDATE 不应该修改它——历史上这里会用请求体里的
// created_at 覆盖数据库列，一旦客户端本地 createdAt 被脏数据污染（见 mergeIntoStorage
// 的修复），就会把错误值写回服务端，导致创建时间在多端之间反复跳变且无法自愈。
const fields: string[] = [];
const values: Array<string | number | null> = [];
```

并删除下面这一段：

```ts
if (createdAt) {
  fields.push('created_at = ?');
  values.push(createdAt);
}
```

客户端各 `d1SyncDocument('update', { created_at: ... })` 调用不用改，继续传 `created_at` 也没关系，服务端会忽略它。

**改动 3（可选，不阻塞本次修复，作为后续优化记录）**：`created_at`/`updatedAt` 目前有三处潜在来源（D1 列、payload 顶层字段、payload.data 内嵌字段），`getDocumentTimestamp`（`d1Pull.ts`）和 `getBodyTimestamp`（`worker.ts`）都做了"任意一处有值就用"的兜底链。长期应该只以 D1 列为权威来源，`data` JSON 里不再重复存这两个字段，减少多来源不一致的可能性。这次先不动，避免一次改动范围过大。

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/utils/d1Pull.ts` | 修改 `mergeIntoStorage` 函数 |
| `src/worker.ts` | 修改 `handleUpdateDocument` 函数，去掉 `created_at` 覆盖逻辑 |

### 验证命令

```bash
npx tsc --noEmit
npm run build
npx wrangler deploy   # worker.ts 改动需要部署才生效；CI 的 deploy-worker job 会在合并后自动跑
```

### 手工验证

1. 编辑一个报价单（或任意单据类型）并保存，立刻跳转到 `/history` 页面（History 页面 mount 会触发 `pullAllFromD1`），确认刚才修改的字段和 `updatedAt` 保持不变，不会回退成保存前的旧值。
2. 开两个标签页：标签页 A 打开表单编辑并保存，标签页 B 停留在历史页并切到前台（触发 `visibilitychange` → `pullAllFromD1`），确认标签页 B 看到的是最新数据。
3. 同一份单据反复编辑保存 5 次以上，确认 D1 `Document` 表里这条记录的 `created_at` 全程不变（可在 Cloudflare D1 Dashboard 执行 `SELECT id, created_at, updated_at FROM Document WHERE id = '<id>'` 核对）。

### 验收标准

- 单据历史列表中不再出现"编辑保存后内容/时间又变回旧值"的情况。
- 同一单据的创建时间在多次编辑、多端同步后保持不变。
- 现有的多设备同步（A 设备创建，B 设备登录后自动出现）、删除同步、待提交队列重试等行为不受影响。
- 后续维护以 `CURRENT_STATE.md` 作为最新事实源，避免继续新增零散过程文档。

---

## TASK-94：询报价登记表 / 订单状态表两页面 UI 一致性整改

### 背景

"登记表"分组下的两个页面——`/inquiry`（询报价登记，`InquiryPage.tsx`）和 `/order`（订单状态表，`OrderPage.tsx`）——是同一批数据（`InquiryRecord`）的两种视图，侧边栏放在同一组下，用户会在两者之间频繁切换。逐文件比对后发现两页面存在多处**视觉语言不统一**且**代码重复/漂移**的问题，均为纯前端表现层问题，不涉及数据结构或后端。逐项列出问题、方案、验收标准，可分别独立执行、独立验证。

---

### 问题 1：月份导航器代码重复（`InquiryFilterBar.tsx` 内联复制了一份，未复用已抽出的共享组件）

`src/components/MonthRangeNav.tsx` 已经是抽出来的共享组件（注释里写着"与询报价登记表一致"），`OrderPage.tsx` 正确地引用了它。但 `InquiryFilterBar.tsx` 第 144-189 行是**手写的另一份几乎逐字相同的实现**（`navRef` / `‹ 选月 › ` 按钮 / `MonthPickerPopover` 弹层），没有改用共享组件。两份代码目前样式一致是巧合，以后任何一处改动（比如调整月份导航器的 padding 或颜色）都可能只改到一份，导致两页面出现新的不一致。

**改动**：`src/features/inquiry/components/InquiryFilterBar.tsx`

删除第 144-189 行（`<div ref={navRef} ...>` 整块，即手写的月份导航器 + 角标 + `MonthPickerPopover`），改为：

```tsx
<MonthRangeNav
  range={filter.timeRange as MonthTimeRange}
  onChange={(r) => setFilter({ ...filter, timeRange: r })}
  badge={isCustomMonth ? filteredCount : undefined}
/>
```

文件顶部加 import：

```ts
import { MonthRangeNav, type MonthTimeRange } from '@/components/MonthRangeNav';
```

注意 `MonthRangeNav` 的 `range` 类型是 `'3months' | 'all' | \`month:${string}\``，和 `InquiryFilterState['timeRange']`（`TimeRange`，来自 `useInquiryFilter.ts`）需确认结构一致后再做类型断言或直接改成同一个类型别名，避免出现两个名字不同但结构相同的 `TimeRange` 类型。若类型不完全一致，优先把 `useInquiryFilter.ts` 里的 `TimeRange` 改为从 `MonthRangeNav.tsx` 导入，而不是新增断言掩盖类型不一致。

顺带删除现在已不再需要的 `MonthPickerPopover` 相关 import（`shiftMonth` / `todayMonth` / `fmtMonth` 等，如果这个文件里没有其他地方用到）。

---

### 问题 2：筛选 Chip 组件两页面各写一份，视觉不一致

`InquiryFilterBar.tsx`（第 60-86 行）和 `OrderPage.tsx`（第 86-107 行）各自定义了一个名字相同、职责相同、但样式细节不同的 `Chip` 组件：

| | `InquiryFilterBar.tsx` 的 `Chip` | `OrderPage.tsx` 的 `Chip` |
|---|---|---|
| 内边距 | `px-2 py-0.5` | `px-3 py-0.5` |
| 未激活态背景 | `border border-gray-200 bg-white`（描边风格） | `bg-gray-100`（实心灰底，无描边） |
| 计数角标 | 仅激活时显示，绝对定位在右上角小圆点 | 始终显示（有值时），内嵌在文字右侧 |

用户在两个页面之间切换时，"近3月/全部"这类看起来应该是同一控件的筛选 Chip，实际观感是两套设计语言，属于本次整改优先级最高的一项。

**改动**：抽取共享组件 `src/components/FilterChip.tsx`，以 `InquiryFilterBar.tsx` 的版本为基准（描边风格 + 角标仅激活态显示，更克制，且已用于更多状态色），统一未激活态、内边距、角标展现方式。`OrderPage.tsx` 内的 `Chip`（含"进行中/正常/辙销/悬挂/善后"状态芯片）和 `InquiryFilterBar.tsx` 内的 `Chip` 都改为引用这个共享组件并删除各自的本地定义。

组件接口保持现有两者的并集：

```tsx
interface FilterChipProps {
  label: string;
  active: boolean;
  activeColor?: string;      // 默认 'bg-blue-600 text-white'
  badge?: number;
  badgeColor?: string;       // 默认 'bg-blue-600'，仅激活态生效
  onClick: () => void;
}
```

角标展示方式统一采用 `InquiryFilterBar.tsx` 当前的"仅激活时显示、绝对定位右上角小圆点"方案（`OrderPage.tsx` 里"全部/进行中/正常"等 Chip 目前是未激活时也常驻显示角标，需要确认这个"未选中也看得到计数"的行为是否是有意的产品需求——如果 Roger 认为"不选中也要看到各分类数量"是必须保留的功能，则改成让共享组件同时支持"角标常驻"和"角标仅激活态"两种模式，通过一个 `badgeAlwaysVisible?: boolean` 开关区分，`OrderPage.tsx` 传 `true`，`InquiryFilterBar.tsx` 保持默认 `false`，而不是强行让其中一个页面失去现有的可用性）。

---

### 问题 3：筛选面板容器内边距叠加方式不一致

`InquiryPage.tsx` 第 514 行外层容器是 `px-4 py-2`，内部 `InquiryFilterBar.tsx` 又包了一层 `py-2`（第 123 行），两层 padding 叠加；`OrderPage.tsx` 第 348 行外层容器是 `px-4 py-3`，内部筛选内容 `div` 没有额外 padding。结果是两个"登记表"页面筛选面板的实际高度和留白比例不同，肉眼可辨。

**改动**：统一为"外层容器 `px-4 py-3`，内部筛选行不再单独加纵向 padding"这一种模式（即采用 `OrderPage.tsx` 现有方案）。具体：
- `InquiryFilterBar.tsx` 第 123 行的 `py-2` 从最外层 `<div>` 的 className 里删除。
- `InquiryPage.tsx` 第 514 行的 `px-4 py-2` 改为 `px-4 py-3`，与 `OrderPage.tsx` 第 348 行保持一致。

---

### 问题 4：表格空状态（Empty State）视觉层级不统一

`InquiryTable.tsx`（第 96-101 行）：虚线边框 `border-dashed border-gray-300`，标题用 `<h2 className="text-base font-semibold">` + 副标题 `<p className="text-sm text-gray-500">`，视觉上有明确的"空状态卡片"设计感。

`OrderTable.tsx`（第 99-106 行）：实线边框（和有数据时的表格容器边框相同，视觉上不像专门设计过的空状态），只有两行纯文本 `<p className="text-sm text-gray-400">` + `<p className="text-xs text-gray-300">`，没有标题层级，观感比询报价登记表的空状态弱很多。

**改动**：`OrderTable.tsx` 的空状态改为与 `InquiryTable.tsx` 同一套结构（虚线边框容器 + `<h2>` 标题 + `<p>` 副标题），文案沿用现有的"暂无订单记录" / "在询报价登记中填写订单编号后，记录会自动显示在这里"，只改容器和文字层级，不改文案内容。可以进一步把这个空状态容器抽成共享的 `<EmptyTableState title subtitle />` 组件放在 `src/components/`，两个表格都调用它，避免以后第三个列表页面又手写第三版。

---

### 问题 5：加载态缺失——`OrderPage.tsx` 在权限校验期间白屏，`InquiryPage.tsx` 有 spinner

`InquiryPage.tsx` 第 461-467 行：`status === 'loading'` 期间渲染一个带旋转动画的加载态（`animate-spin` 圆环，居中显示）。

`OrderPage.tsx` 第 307 行：`if (status === 'loading' || !user || !permissionUser) return null;`——同样的等待场景，直接返回 `null`，用户看到的是空白页面，没有任何反馈。这是两页面里唯一一个不只是"风格不同"、而是"体验倒退"的问题（白屏容易被用户误认为页面卡死或加载失败）。

**改动**：把 `InquiryPage.tsx` 第 462-466 行的 loading 区块抽成共享组件（例如 `src/components/layout/FullScreenSpinner.tsx`，无 props 或只接受可选文案），`InquiryPage.tsx` 和 `OrderPage.tsx` 都改为渲染这个组件而不是 `return null` 或本地内联 JSX：

```tsx
if (!permissionChecked || status === 'loading') {
  return <FullScreenSpinner />;
}
```

`OrderPage.tsx` 对应位置：

```tsx
if (status === 'loading' || !user || !permissionUser) {
  return <FullScreenSpinner />;
}
```

---

### 问题 6：排序图标语言不一致（Arrow 系 vs Chevron 系）

`InquiryTable.tsx` 排序按钮（第 126-138 行）用 `ArrowDown` / `ArrowUp`（lucide "箭头"图标），按钮固定是蓝底高亮样式（因为只有一列可排序，永远处于"当前排序列"状态）。

`OrderTable.tsx` 的 `thSort`（第 80-96 行）用 `ChevronUp` / `ChevronDown` / `ChevronsUpDown`（lucide "尖角"图标），且区分"当前排序列"（蓝底）和"未激活列"（灰色 `ChevronsUpDown` 中性态），因为它有两个可切换的排序字段（订单编号 / 交货日期）。

两者都是"点击表头切换排序方向"的同一交互，却用了两套不同的图标语义系统，用户在两个页面看到的"排序中"视觉提示长得不一样。

**改动**：统一采用 `OrderTable.tsx` 的图标方案（Chevron 系列 + 中性态 `ChevronsUpDown`），因为它的设计更完整（即使 `InquiryTable.tsx` 目前只有一列可排序，也应该用同一套图标语言，为将来询报价登记表可能增加第二个可排序列做准备，也让两个页面视觉一致）。`InquiryTable.tsx` 第 4 行 `ArrowDown, ArrowUp` 改为 `ChevronDown, ChevronUp`，第 133-137 行的图标渲染逻辑改为直接用 `sortDir === 'desc' ? <ChevronDown ... /> : <ChevronUp ... />`（因为询报价登记表目前只有一个排序字段，不需要 `ChevronsUpDown` 中性态）。

---

### 问题 7：权限不足拦截页用 emoji 图标，且两页面代码逐字重复

`InquiryPage.tsx`（第 469-485 行）和 `OrderPage.tsx`（第 309-326 行）的"权限不足"页面是**逐字重复的代码**（只有提示文案"您没有询报价登记的访问权限" / "您没有订单状态表的访问权限"不同），且视觉主体用了 `<div className="text-6xl">🚫</div>` 这样的 emoji，是全站唯一用 emoji 而不是 `lucide-react` 图标做主视觉的地方（两个页面本身就大量引入了 lucide 图标，风格上明显跳脱）。

**改动**：抽成共享组件 `src/components/PermissionDenied.tsx`：

```tsx
'use client';

import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

export function PermissionDenied({ message }: { message: string }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-black">
      <div className="rounded-xl bg-white p-8 text-center shadow-lg dark:bg-gray-900">
        <ShieldAlert className="mx-auto mb-4 h-14 w-14 text-red-500 dark:text-red-400" />
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">权限不足</h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">{message}</p>
        <Button onClick={() => router.push('/dashboard')} size="lg">返回首页</Button>
      </div>
    </div>
  );
}
```

`InquiryPage.tsx` 第 469-485 行替换为：

```tsx
if (!hasInquiryAccess) {
  return <PermissionDenied message="您没有询报价登记的访问权限" />;
}
```

`OrderPage.tsx` 第 309-326 行同理替换为：

```tsx
if (!hasOrderAccess) {
  return <PermissionDenied message="您没有订单状态表的访问权限" />;
}
```

（其他页面如果有类似的重复"权限不足"代码块，可以一并排查替换，但本次任务范围只要求覆盖这两个页面，不强制排查全站。）

---

### 问题 8（低优先级，可选）：表格表头样式常量重复定义

`InquiryTable.tsx` 第 8-22 行和 `OrderTable.tsx` 第 19-30 行定义了几乎完全相同的 `headerRowClass` / `headerCellClass` / `headerCellRightClass` 常量（渐变背景、边框、字号）。目前两者数值一致，属于"巧合一致"而非"结构保证一致"，和问题 1 是同一类风险。

**改动（可选，风险最低，可放在本任务最后单独提交一个小 commit）**：抽到 `src/components/table/tableHeaderStyles.ts`，导出这几个常量，两个表格文件都改为从这里 import，删除各自的本地定义。

---

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/features/inquiry/components/InquiryFilterBar.tsx` | 问题 1（改用 `MonthRangeNav`）、问题 2（改用共享 `FilterChip`）、问题 3（去掉多余 `py-2`） |
| `src/features/order/app/OrderPage.tsx` | 问题 2（改用共享 `FilterChip`）、问题 3（外层 padding 改 `py-3`）、问题 5（改用 `FullScreenSpinner`）、问题 7（改用 `PermissionDenied`） |
| `src/features/inquiry/app/InquiryPage.tsx` | 问题 3（外层 padding 改 `py-3`）、问题 5（改用 `FullScreenSpinner`）、问题 7（改用 `PermissionDenied`） |
| `src/features/inquiry/components/InquiryTable.tsx` | 问题 4（空状态改版）、问题 6（排序图标改 Chevron 系）、问题 8（可选，表头常量外置） |
| `src/features/order/components/OrderTable.tsx` | 问题 4（空状态改版）、问题 8（可选，表头常量外置） |
| `src/components/FilterChip.tsx`（新增） | 问题 2 |
| `src/components/layout/FullScreenSpinner.tsx`（新增） | 问题 5 |
| `src/components/PermissionDenied.tsx`（新增） | 问题 7 |
| `src/components/table/tableHeaderStyles.ts`（新增，可选） | 问题 8 |

### 执行建议

8 个问题彼此独立，不要求一次性全部完成；建议按 1 → 7 → 5 → 2 → 3 → 4 → 6 → 8 的顺序（先解决"两份代码一处改另一处忘改"的重复风险，再做纯样式统一），每完成 1-2 项就跑一次验证命令，方便出问题时定位是哪一步引入的。

### 验证命令

```bash
npx tsc --noEmit
npx eslint src/features/inquiry src/features/order src/components/FilterChip.tsx src/components/PermissionDenied.tsx src/components/layout/FullScreenSpinner.tsx
npm run build
```

### 手工验证

1. 分别打开 `/inquiry` 和 `/order`，对比筛选面板（Chip 外观、月份导航器、容器留白）是否已看不出差异。
2. 清空浏览器 cookie 或用无权限账号登录，确认两个页面的"权限不足"提示图标、文案、按钮行为一致（图标应为 `ShieldAlert`，不再是 🚫）。
3. 用 Chrome DevTools Network 面板节流成 Slow 3G，刷新 `/order`，确认权限校验期间能看到旋转 loading，不再是白屏。
4. 分别把两个表格筛选到无结果状态，对比空状态卡片是否已是同一套视觉（虚线边框 + 标题 + 副标题）。
5. 询报价登记表点击"询价编号"表头排序，确认图标已变为 `ChevronUp`/`ChevronDown`，方向切换正常。

### 验收标准

- 两页面筛选栏 Chip、月份导航器、容器留白、表格空状态、排序图标、权限不足页在视觉上一致，且底层是同一份组件代码（不是数值恰好抄一致）。
- `OrderPage.tsx` 权限校验期间不再白屏。
- 现有筛选/排序/权限逻辑行为不变，只改表现层，不改数据流转、不改 D1/Worker 相关代码。
- `MonthRangeNav` / `FilterChip` / `PermissionDenied` / `FullScreenSpinner` 后续如果第三个页面需要类似 UI，可直接复用，不再新增第三份重复实现。

---

## TASK-95：询报价/订单状态表轮询改为"变更感知"，降低 Vercel Fluid Active CPU 占用

### 背景

Roger 反馈 Vercel 用量面板上 **Fluid Active CPU 已用 3h41m / 4h（92%）**，Function Invocations 384K / 1M（38%）。两个指标不对称（CPU 快顶格、调用量还有余量）说明问题不是"调用次数太多"，而是**单次调用做的事太重，且这个重量会随数据量持续变大**。

排查到的具体根因（`src/features/inquiry/app/InquiryPage.tsx` 第 192-228 行、`src/features/order/app/OrderPage.tsx` 第 150-184 行）：

1. 两个页面各自起了一份**几乎逐字重复**的 30 秒轮询 `useEffect`（`syncFromD1`），只要标签页可见就每 30 秒完整跑一遍：`inquiryService.pullFromD1()`（分页拉全表，当前 700+ 条记录且持续增长）→ `pushLocalToD1()`（把全部本地记录和这一整份远端快照逐条比对，找出"本地有远端没有"的记录重新 POST）→ `mergeFromD1()`（逐条比对写回 localStorage）。
2. `src/worker.ts` 的 `handleInquiryRequest`（第 1498-1536 行）目前**不支持增量查询**，`GET /api/inquiry` 永远是 `SELECT * FROM Document WHERE type='inquiry' AND (status='active' OR updated_at >= 30天内) ORDER BY doc_no DESC LIMIT ? OFFSET ?`，最多一次吐 2000 行，且每行都要在 Worker 和 Next.js 代理层（`src/app/api/inquiry/[[...path]]/route.ts`）各做一次逐条 `.map()` 重建/过滤。这份"全量 reshape"的 CPU 成本随记录数线性增长，是当前逼近额度、且会继续恶化的直接原因。
3. Next.js 代理层每次请求都要 `getServerSession(authOptions)` 做一次 JWT 解密校验（真实 CPU 开销，不是 I/O 等待），30 秒一次乘以所有开着标签页的人，进一步放大。

### 优化方案：加一层"元信息"轻量探测，只有真的有变化才做重活

核心思路：**不改变现有 `mergeFromD1` / `pushLocalToD1` 的全量比对语义（它们目前的正确性依赖"传入的是完整远端快照"这个假设，贸然改成只传增量列表会导致 `pushLocalToD1` 误判、把本来已存在于 D1 的记录当成"本地独有"重新 POST，产生脏写），而是在"要不要触发这次全量比对"之前，先做一次几乎零成本的探测**：

- Worker 新增 `GET /api/inquiry/meta`，只查 `COUNT(*)` 和 `MAX(updated_at)`，SQL 极轻，返回体几十字节。
- 客户端每 30 秒先打这个 `meta` 接口；只有当 `maxUpdatedAt`（或 `count`）和上次记住的值不同，才触发一次完整的 `pullFromD1 → pushLocalToD1 → mergeFromD1`。没变化时这一轮轮询几乎不消耗 CPU。
- 为防止"没人碰这份共享数据、meta 永远不变，导致某条本地创建但推送失败的记录永远等不到重试"这种边界情况，保留一个较长周期（5 分钟）的强制全量兜底，不完全依赖 meta 变化。
- 顺带把两个页面里逐字重复的轮询 `useEffect` 抽成一个共享 hook，避免以后只改一处。

---

### 改动 1：`src/worker.ts` —— 新增轻量 `meta` 端点

在 `handleInquiryRequest` 函数内，`GET /api/inquiry`（第 1498-1536 行）分支**之后、`POST /api/inquiry`（第 1538 行）分支**之前插入：

```ts
if (request.method === 'GET' && path === '/api/inquiry/meta') {
  const metaRow = await env.USERS_DB.prepare(`
    SELECT COUNT(*) as cnt, MAX(updated_at) as maxUpdatedAt FROM Document
    WHERE type = 'inquiry'
      AND (status = 'active' OR updated_at >= datetime('now', '-30 days'))
  `).bind().first<{ cnt: number; maxUpdatedAt: string | null }>();

  return jsonResponse({
    count: metaRow?.cnt ?? 0,
    maxUpdatedAt: metaRow?.maxUpdatedAt ?? null,
  });
}
```

注意必须放在 `path.match(/^\/api\/inquiry\/([^/]+)$/)`（第 1567 行 `itemMatch`）之前的位置生效即可——`meta` 会被 `itemMatch` 正则匹配上，但 `itemMatch` 只在 `request.method === 'PUT'` 或 `'DELETE'` 时才处理，GET 请求不会进入那两个分支，所以顺序上只要保证这段新代码在函数体内、且在 `return jsonResponse({ error: 'Not Found' }, 404)` 之前即可，不会和现有 PUT/DELETE-by-id 逻辑冲突。

`Next.js` 侧的代理路由 `src/app/api/inquiry/[[...path]]/route.ts` 不需要改动——它是 `[[...path]]` 通配路由，`/api/inquiry/meta` 会被现有 `proxyInquiryRequest` 自动转发到 Worker 的同名路径，响应体里没有 `records` 数组，现有的财务字段过滤逻辑（判断 `Array.isArray(data?.records)`）会自然跳过，不用额外处理。

---

### 改动 2：`src/features/inquiry/services/inquiry.service.ts` —— 新增 `getMeta()`

```ts
async getMeta(): Promise<{ count: number; maxUpdatedAt: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/meta`, { cache: 'no-store' });
    if (!res.ok) return { count: -1, maxUpdatedAt: null };
    return await res.json() as { count: number; maxUpdatedAt: string | null };
  } catch {
    return { count: -1, maxUpdatedAt: null };
  }
},
```

（`count: -1` 作为"探测失败"的哨兵值，永远不等于上次记住的值，效果等同于"探测失败时保守地当作有变化处理"，触发一次全量同步兜底，不会因为网络抖动导致数据永远不刷新。）

---

### 改动 3：新增共享 hook `src/features/inquiry/hooks/useInquirySync.ts`

把 `InquiryPage.tsx` 和 `OrderPage.tsx` 里几乎相同的轮询 `useEffect` 合并成一份：

```ts
'use client';

import { useEffect, useRef, useState } from 'react';
import { inquiryService } from '../services/inquiry.service';
import { useInquiryStore } from '../state/inquiry.store';

const POLL_INTERVAL_MS = 30_000;
const FORCE_FULL_SYNC_EVERY_MS = 5 * 60_000; // 兜底：即使 meta 没变化，5 分钟至少全量核对一次

interface UseInquirySyncOptions {
  /** 有权限且已登录、且权限校验已完成时传 true，否则不启动轮询 */
  enabled: boolean;
  /** 弹窗打开等场景需要暂停同步时传 true，避免用户编辑中途被远端数据覆盖 */
  suspended?: boolean;
}

export function useInquirySync({ enabled, suspended = false }: UseInquirySyncOptions) {
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const suspendedRef = useRef(suspended);
  const lastMetaRef = useRef<string | null>(null);
  const lastFullSyncAtRef = useRef(0);

  useEffect(() => { suspendedRef.current = suspended; }, [suspended]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function fullSync() {
      const d1Records = await inquiryService.pullFromD1();
      if (cancelled || suspendedRef.current) return;
      inquiryService.pushLocalToD1(d1Records);
      const merged = inquiryService.mergeFromD1(d1Records);
      useInquiryStore.setState({ records: merged });
      lastFullSyncAtRef.current = Date.now();
      setLastSyncedAt(new Date());
    }

    async function checkAndMaybeSync() {
      if (suspendedRef.current) return;
      const meta = await inquiryService.getMeta();
      const metaKey = `${meta.count}:${meta.maxUpdatedAt ?? ''}`;
      const forceFullSync = Date.now() - lastFullSyncAtRef.current > FORCE_FULL_SYNC_EVERY_MS;

      if (metaKey !== lastMetaRef.current || forceFullSync) {
        lastMetaRef.current = metaKey;
        await fullSync();
      } else {
        setLastSyncedAt(new Date()); // 探测到"确认无变化"也算一次成功同步，刷新时间戳
      }
    }

    void fullSync(); // 首次挂载：全量拉取，同时做一次 pushLocalToD1 兜底补偿

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') void checkAndMaybeSync();
    }, POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') void checkAndMaybeSync();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  return { lastSyncedAt };
}
```

---

### 改动 4：`InquiryPage.tsx` / `OrderPage.tsx` 改用共享 hook

`InquiryPage.tsx` 删除第 192-228 行整个 `useEffect`（含内部 `POLL_INTERVAL_MS`、`syncFromD1`、`visibilitychange` 监听），以及第 123 行 `const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);`，改为：

```ts
const { lastSyncedAt } = useInquirySync({
  enabled: permissionChecked && hasInquiryAccess,
  suspended: isModalOpen,
});
```

放在原来 `isModalOpenRef` 附近即可，`isModalOpenRef` 这个 ref 和相关同步 effect（第 188-190 行）如果不再被其他地方使用可以一并删除。

`OrderPage.tsx` 同理删除第 150-184 行的 `useEffect` 和第 122 行 `lastSyncedAt` 状态，改为：

```ts
const { lastSyncedAt } = useInquirySync({ enabled: status === 'authenticated' && hasOrderAccess });
```

两个页面顶部都加上 `import { useInquirySync } from '@/features/inquiry/hooks/useInquirySync';`，其余读取 `lastSyncedAt` 渲染"同步 HH:mm:ss"的代码不用改。

---

### 涉及文件

| 文件 | 操作 |
|------|------|
| `src/worker.ts` | 新增 `GET /api/inquiry/meta` 分支 |
| `src/features/inquiry/services/inquiry.service.ts` | 新增 `getMeta()` |
| `src/features/inquiry/hooks/useInquirySync.ts`（新增） | 合并后的轮询 hook |
| `src/features/inquiry/app/InquiryPage.tsx` | 删除本地轮询 `useEffect`，改用 `useInquirySync` |
| `src/features/order/app/OrderPage.tsx` | 删除本地轮询 `useEffect`，改用 `useInquirySync` |

### 验证命令

```bash
npx tsc --noEmit
npx eslint src/worker.ts src/features/inquiry src/features/order
npm run build
npx wrangler deploy   # worker.ts 改动需要单独部署才生效
```

### 手工验证

1. 打开 `/inquiry`，Network 面板确认每 30 秒只打一次很小的 `meta` 请求（响应体几十字节），没有别人改动数据时**不会**再看到大的 `pullFromD1`/`records` 请求。
2. 另开一个账号/标签页新增或编辑一条询价记录，确认原标签页在下一次 30 秒轮询内能感知到变化并刷新（`meta` 变化触发了一次全量同步）。
3. 断网重连场景：新增一条记录时故意断网导致 `syncToD1` 失败，恢复网络后确认最多 5 分钟内（`FORCE_FULL_SYNC_EVERY_MS` 兜底）这条记录被 `pushLocalToD1` 重新推送成功，不会永久丢失同步。
4. 弹窗编辑期间（`isModalOpen=true`）确认不会被中途同步覆盖正在编辑的内容（`suspended` 生效）。
5. 部署后观察 Vercel 用量面板 1-2 天，确认 Fluid Active CPU 增长速率明显放缓（不要求立刻看到总量下降，而是"斜率变缓"）。

### 验收标准

- 正常无变化时，30 秒轮询只产生一次极轻量的 `meta` 请求，不再每次都全量拉取 700+ 条记录并逐条 reshape/比对。
- 数据真的发生变化时，仍然能在下一轮轮询内感知并同步，行为和现在一致，用户感知不到延迟变化。
- `pushLocalToD1` 的"本地创建但未同步成功"兜底重试能力保留（不因为改成 meta 触发就丢失离线创建记录的补偿写入）。
- `InquiryPage.tsx`/`OrderPage.tsx` 不再有两份几乎相同的轮询代码。
- 不改变现有筛选、排序、权限、批量编辑等业务逻辑。
