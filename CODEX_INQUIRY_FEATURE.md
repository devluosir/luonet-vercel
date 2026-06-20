# Codex 任务：新增"询报价登记表"功能

## 项目背景

这是一个 Next.js 14 App Router + TypeScript + Tailwind CSS + Zustand 的外贸业务系统。
请严格遵循现有 feature-based 架构，不要改变已有文件的命名风格和代码规范。

---

## 一、项目结构规范（必须遵守）

新功能必须按照以下结构创建，与其他 feature（如 `customer`、`purchase`）保持一致：

```
src/
├── app/
│   └── inquiry/
│       └── page.tsx                  # Next.js 页面入口（'use client'）
├── features/
│   └── inquiry/
│       ├── app/
│       │   └── InquiryPage.tsx       # 功能主页面组件
│       ├── components/
│       │   ├── InquiryTable.tsx      # 表格主体
│       │   ├── InquiryRow.tsx        # 单条记录行
│       │   ├── InquiryQuoteStatus.tsx # 询报价状态渲染组件
│       │   ├── SupplierStatusTag.tsx  # 单个供应商状态标签
│       │   ├── InquiryFormModal.tsx  # 新增/编辑询价弹窗
│       │   └── QuotedStatusList.tsx  # 已报价状态列表管理
│       ├── hooks/
│       │   └── useInquiryActions.ts  # CRUD 操作 hooks
│       ├── services/
│       │   └── inquiry.service.ts    # localStorage 存取逻辑
│       ├── state/
│       │   └── inquiry.store.ts      # Zustand store
│       ├── types/
│       │   └── index.ts              # TypeScript 类型定义
│       ├── utils/
│       │   └── inquiryUtils.ts       # 工具函数（日期格式化、编号生成等）
│       └── index.ts                  # 模块统一导出
```

---

## 二、TypeScript 类型定义

在 `src/features/inquiry/types/index.ts` 中定义以下类型，**禁止使用 `any`**：

```typescript
/** 供应商报价状态 */
export type SupplierStatus = 'pending' | 'quoted' | 'unavailable' | 'need_info';

export interface SupplierQuoteStatus {
  id: string;                    // nanoid 生成
  supplierShortName: string;
  quoteDate?: string;            // 格式 [m.D]，如 [6.20]；有值=已报价
  status?: SupplierStatus;       // pending(默认粉红), quoted(蓝), unavailable(灰), need_info(黄)
}

export interface CustomerQuoteStatus {
  id: string;                    // nanoid 生成
  quoteDate: string;             // 格式 [m.D]
  supplierShortName: string;
  version: string;               // 如 V1, V2
}

export interface InquiryRecord {
  id: string;                    // nanoid 生成
  inquiryDate: string;           // 格式 [m.D]
  inquiryNo: string;             // 格式 C[YYmmDD]F
  inquirer: string;              // 格式 公司简称-员工简称
  customerNo: string;
  description: string;
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;             // ISO 时间戳
  updatedAt: string;
}
```

---

## 三、工具函数

在 `src/features/inquiry/utils/inquiryUtils.ts` 中实现：

```typescript
import { nanoid } from 'nanoid';

/**
 * 将日期格式化为 [m.D]，如 [6.20]
 */
export function formatShortDate(date: Date): string {
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `[${m}.${d}]`;
}

/**
 * 生成询价编号，格式 C[YYmmDD]F
 * 例：2026年6月20日 → C260620F
 * @param date 日期
 * @param suffix 后缀字母序列（默认 'F'，已存在则递增）
 */
export function generateInquiryNo(date: Date, suffix: string = 'F'): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `C${yy}${mm}${dd}${suffix}`;
}

/**
 * 询价编号后缀序列（跳过 I、O 避免混淆）
 * F, G, H, J, K, L, M, N, P, Q, R, S, T, U, V, W, X, Y, Z,
 * ZA, ZB, ZC, ZD, ZE, ZF, ZG, ZH, ZJ, ZK, ZL, ZM, ZN, ZP, ...
 */
export const INQUIRY_SUFFIX_SEQUENCE: string[] = (() => {
  const base = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 跳过 I、O
  const single = base.split('').filter(c => c >= 'F'); // F 开始
  const double: string[] = [];
  for (const c of base) {
    for (const d of base) {
      double.push(`Z${c === 'A' ? '' : ''}${d}`);
      // 实际上 ZA, ZB... ZZ, ZZA...
    }
  }
  // 简化实现：单字母 F-Z（跳过 I、O），然后 ZA-ZZ（跳过 ZI、ZO），以此类推
  const result: string[] = [];
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // 跳过 I O
  const singleLetters = letters.split('').filter(c => c >= 'F');
  result.push(...singleLetters);
  for (const prefix of letters.split('')) {
    for (const l of letters.split('')) {
      result.push(`Z${prefix}${l}`);
    }
  }
  return result;
})();

/**
 * 获取指定后缀在序列中的下一个
 */
export function nextInquirySuffix(current: string): string {
  const idx = INQUIRY_SUFFIX_SEQUENCE.indexOf(current);
  if (idx === -1 || idx >= INQUIRY_SUFFIX_SEQUENCE.length - 1) return current;
  return INQUIRY_SUFFIX_SEQUENCE[idx + 1];
}

/**
 * 根据当天已有记录，生成当天下一个可用的询价编号
 */
export function generateNextInquiryNo(date: Date, existingNos: string[]): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const prefix = `C${yy}${mm}${dd}`;
  
  const todayNos = existingNos.filter(no => no.startsWith(prefix));
  
  for (const suffix of INQUIRY_SUFFIX_SEQUENCE) {
    const candidate = `${prefix}${suffix}`;
    if (!todayNos.includes(candidate)) return candidate;
  }
  return `${prefix}F`; // fallback
}

export function createId(): string {
  return nanoid();
}
```

---

## 四、localStorage 服务

在 `src/features/inquiry/services/inquiry.service.ts` 中实现，
使用项目现有的 `src/utils/safeLocalStorage.ts` 工具：

```typescript
import { getLocalStorageJSON, setLocalStorage } from '@/utils/safeLocalStorage';
import type { InquiryRecord } from '../types';

const STORAGE_KEY = 'inquiry_records';

export const inquiryService = {
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
    const records = this.getAll().map(r =>
      r.id === id ? { ...r, ...patch, updatedAt: new Date().toISOString() } : r
    );
    this.save(records);
    return records;
  },

  remove(id: string): InquiryRecord[] {
    const records = this.getAll().filter(r => r.id !== id);
    this.save(records);
    return records;
  },
};
```

---

## 五、Zustand Store

在 `src/features/inquiry/state/inquiry.store.ts` 中实现：

```typescript
import { create } from 'zustand';
import type { InquiryRecord, SupplierQuoteStatus, CustomerQuoteStatus } from '../types';
import { inquiryService } from '../services/inquiry.service';
import { createId, formatShortDate, generateNextInquiryNo } from '../utils/inquiryUtils';

interface InquiryStore {
  records: InquiryRecord[];
  // 初始化
  init: () => void;
  // 新增询价
  addRecord: (draft: Omit<InquiryRecord, 'id' | 'createdAt' | 'updatedAt'>) => void;
  // 编辑基本信息
  updateRecord: (id: string, patch: Partial<Pick<InquiryRecord, 'inquiryDate' | 'inquiryNo' | 'inquirer' | 'customerNo' | 'description'>>) => void;
  // 删除询价
  removeRecord: (id: string) => void;
  // 供应商操作
  addSupplier: (recordId: string, supplier: Omit<SupplierQuoteStatus, 'id'>) => void;
  updateSupplier: (recordId: string, supplierId: string, patch: Partial<SupplierQuoteStatus>) => void;
  removeSupplier: (recordId: string, supplierId: string) => void;
  // 已报价状态操作
  addQuotedStatus: (recordId: string, qs: Omit<CustomerQuoteStatus, 'id'>) => void;
  updateQuotedStatus: (recordId: string, qsId: string, patch: Partial<CustomerQuoteStatus>) => void;
  removeQuotedStatus: (recordId: string, qsId: string) => void;
}

export const useInquiryStore = create<InquiryStore>((set, get) => ({
  records: [],

  init: () => {
    const records = inquiryService.getAll();
    set({ records });
  },

  addRecord: (draft) => {
    const now = new Date().toISOString();
    const record: InquiryRecord = {
      ...draft,
      id: createId(),
      createdAt: now,
      updatedAt: now,
    };
    const updated = inquiryService.add(record);
    set({ records: updated });
  },

  updateRecord: (id, patch) => {
    const updated = inquiryService.update(id, patch);
    set({ records: updated });
  },

  removeRecord: (id) => {
    const updated = inquiryService.remove(id);
    set({ records: updated });
  },

  addSupplier: (recordId, supplier) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        supplierStatuses: [...r.supplierStatuses, { ...supplier, id: createId() }],
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },

  updateSupplier: (recordId, supplierId, patch) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        supplierStatuses: r.supplierStatuses.map(s =>
          s.id === supplierId ? { ...s, ...patch } : s
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },

  removeSupplier: (recordId, supplierId) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        supplierStatuses: r.supplierStatuses.filter(s => s.id !== supplierId),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },

  addQuotedStatus: (recordId, qs) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        quotedStatuses: [...r.quotedStatuses, { ...qs, id: createId() }],
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },

  updateQuotedStatus: (recordId, qsId, patch) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        quotedStatuses: r.quotedStatuses.map(qs =>
          qs.id === qsId ? { ...qs, ...patch } : qs
        ),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },

  removeQuotedStatus: (recordId, qsId) => {
    const records = get().records.map(r => {
      if (r.id !== recordId) return r;
      return {
        ...r,
        quotedStatuses: r.quotedStatuses.filter(qs => qs.id !== qsId),
        updatedAt: new Date().toISOString(),
      };
    });
    inquiryService.save(records);
    set({ records });
  },
}));
```

---

## 六、颜色规则说明（渲染逻辑核心）

实现一个工具函数 `getRecordColorState(record: InquiryRecord)` 用于判断当前记录整体状态：

| 条件 | 主信息字段颜色 |
|------|--------------|
| `quotedStatuses.length === 0` | `text-pink-500`（粉红） |
| `quotedStatuses.length > 0` | `text-blue-600`（蓝色） |

供应商颜色（独立判断，不受主信息影响）：

| 供应商状态 | 颜色 |
|-----------|------|
| 无 quoteDate，status 默认/pending | `text-pink-500` |
| 有 quoteDate | `text-blue-600` |
| status === 'unavailable' | `text-gray-400` |
| status === 'need_info' | `text-yellow-500` |

**主信息字段** 包括：日期、询价编号、询价人、客户编号、内容简述。
**已报价状态**字段颜色跟随主信息字段（蓝色）。

在 Tailwind 中使用以下 className（项目已有 Tailwind，直接用工具类即可）：
- 粉红：`text-pink-500`
- 蓝色：`text-blue-600`
- 灰色：`text-gray-400`
- 黄色：`text-yellow-500`

---

## 七、关键组件实现要求

### 7.1 SupplierStatusTag 组件

路径：`src/features/inquiry/components/SupplierStatusTag.tsx`

Props：
```typescript
interface Props {
  supplier: SupplierQuoteStatus;
  onEdit: (supplierId: string) => void;
  onDelete: (supplierId: string) => void;
}
```

渲染逻辑：
- 若有 `quoteDate`：显示 `<span class="text-blue-600">ABC[6.20]</span>`
- 若无 `quoteDate` 且 status==='unavailable'：`<span class="text-gray-400">ABC</span>`
- 若无 `quoteDate` 且 status==='need_info'：`<span class="text-yellow-500">ABC</span>`
- 其余无 `quoteDate`：`<span class="text-pink-500">ABC</span>`
- 点击可触发编辑

### 7.2 InquiryQuoteStatus 组件

路径：`src/features/inquiry/components/InquiryQuoteStatus.tsx`

负责渲染整个状态栏（供应商列表 + 已报价状态），需支持内联编辑操作按钮。

### 7.3 InquiryRow 组件

路径：`src/features/inquiry/components/InquiryRow.tsx`

渲染一行记录，包含：
- 主信息字段（按颜色规则显示）
- InquiryQuoteStatus 组件
- 行操作按钮（编辑基本信息、删除整行）

### 7.4 InquiryFormModal 组件

路径：`src/features/inquiry/components/InquiryFormModal.tsx`

用于新增/编辑询价基本信息的弹窗，字段：
- 日期（默认今天，格式 `[m.D]`）
- 询价编号（根据日期和现有记录自动生成，可手动覆盖）
- 询价人
- 客户编号
- 内容简述

---

## 八、导航集成

### 8.1 修改侧边栏

修改 `src/components/layout/AppSidebar.tsx`，在 `NAV_ITEMS` 数组中添加（放在 purchase 后面）：

```typescript
// 在现有 import 中添加 Search 图标
import { ..., Search } from 'lucide-react';

// 在 NAV_ITEMS 中 purchase 之后添加：
{
  id: 'inquiry',
  label: '询报价登记',
  path: '/inquiry',
  icon: Search,
  permissionKey: 'canCreatePurchase', // 暂时复用采购权限，如无权限系统则不加此字段
},
```

### 8.2 创建 Next.js 页面入口

`src/app/inquiry/page.tsx`：

```typescript
'use client';
import { InquiryPage } from '@/features/inquiry/app/InquiryPage';
export default function Page() {
  return <InquiryPage />;
}
```

---

## 九、数据初始化

在 `src/features/inquiry/app/InquiryPage.tsx` 中，组件挂载时调用 `useInquiryStore.getState().init()` 从 localStorage 加载数据。

---

## 十、验收标准（完成后自检）

请逐项确认：

1. [ ] `src/app/inquiry/page.tsx` 页面可正常访问
2. [ ] 点击"新增询价"弹窗正常，询价编号自动生成（格式 C260620F）
3. [ ] 新增后整行为粉红色
4. [ ] 为供应商填写报价日期后，该供应商变蓝色，其余供应商仍粉红
5. [ ] 添加已报价状态后，主信息字段全部变蓝
6. [ ] 已报价状态可以添加多个
7. [ ] 供应商可以继续追加
8. [ ] 刷新页面数据不丢失（localStorage 持久化）
9. [ ] 无 TypeScript `any` 类型
10. [ ] 侧边栏出现"询报价登记"导航项

---

## 十一、注意事项

- **不要**修改其他 feature（quotation、purchase 等）的任何逻辑
- **不要**引入新的重量级依赖，项目已有 `nanoid`、`zustand`、`lucide-react`、`tailwindcss`
- 样式**只用 Tailwind 工具类**，不写内联 style，除非极特殊情况
- 使用 `src/utils/safeLocalStorage.ts` 中的 `getLocalStorageJSON` / `setLocalStorage`，不要直接调用 `localStorage`
- 组件文件顶部加 `'use client';`（Next.js App Router 规范）
- 所有组件拆分清晰，`InquiryPage.tsx` 只做组合，不堆业务逻辑
