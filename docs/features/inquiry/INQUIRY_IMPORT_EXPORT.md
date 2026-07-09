# 询报价登记 — 导入/导出格式参考

> 最后更新：2026-06-23

---

## 一、导入支持的格式

询报价登记页面的「导入」按钮接受两种文件格式：

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| JSON | `.json` | **纯数组**，每个元素为一条 `InquiryRecord` |
| Excel | `.xlsx` / `.xls` | 固定列名表格，含 `_供应商JSON` / `_报价JSON` 两个结构化隐藏列 |

导入采用**合并策略**：以 `id` 为主键；本地不存在则新增，存在则比较 `updatedAt`，云端较新才覆盖。

---

## 二、JSON 格式（首选）

### 顶层结构

```json
[
  { ...InquiryRecord },
  { ...InquiryRecord }
]
```

**必须是纯数组**，不能包裹在对象中。若顶层不是数组，应用会弹出「格式错误：JSON 文件应为记录数组」。

### 完整字段说明

```typescript
interface InquiryRecord {
  id: string;                         // nanoid / UUID，全局唯一
  inquiryDate: string;                // 日期，格式 [m.D]，如 [1.3]、[6.20]
  inquiryNo: string;                  // 询价编号，格式见下
  inquirer: string;                   // 客户简称（或 公司简称-联系人简称）
  customerNo: string;                 // 客户自己的询价号/参考号
  description: string;               // 备件描述
  orderNo?: string;                  // 成单后的订单编号（可选），如 FL2608
  supplierStatuses: SupplierQuoteStatus[];
  quotedStatuses: CustomerQuoteStatus[];
  createdAt: string;                  // ISO 8601，如 2026-01-03T08:00:00.000Z
  updatedAt: string;                  // ISO 8601
  status?: 'active' | 'deleted';     // 软删除标记，导入时省略即为 active
}

interface SupplierQuoteStatus {
  id: string;                         // nanoid / UUID
  supplierShortName: string;          // 供应商简称，如 飞罗、昆同
  quoteDate?: string;                 // 供应商回复日期，格式 [m.D]（pending 时省略）
  status?: 'pending' | 'quoted' | 'unavailable' | 'need_info';
}

interface CustomerQuoteStatus {
  id: string;                         // nanoid / UUID
  quoteDate: string;                  // 向客户报价/回复的日期，格式 [m.D]
  supplierShortName: string;          // 来源供应商简称
  version: string;                    // 版本字母，从 a 开始，如 a、b、c
  type?: 'quoted' | 'unavailable' | 'supplemented' | 'closed';
                                      // 省略或 'quoted' = 正常报价
}
```

### 日期格式规则

所有日期字段（`inquiryDate`、`quoteDate`）统一使用 **`[m.D]`** 格式：

| 原始日期 | 存储值 |
|----------|--------|
| 1月3日 | `[1.3]` |
| 1月14日 | `[1.14]` |
| 6月20日 | `[6.20]` |

不加前导零。`normalizeShortDateInput()` 可接受 `1.3`（自动补方括号）或 `2026-01-03`（自动转换）。

### 询价编号格式

```
C[YY][MM][DD][后缀]
```

- `YY` = 年份后两位，`MM` = 月份两位，`DD` = 日期两位
- 后缀序列：`F G H J K L M N P Q R S T U V W X Y Z ZA ZB …`（跳过 I 和 O）
- 同一天多条询价按序递增后缀
- 示例：`C260103F`（2026-01-03 第1条）、`C260103G`（第2条）
- `-U` 后缀表示「催促」（urgent），如 `C260107G-U`

### JSON 示例

```json
[
  {
    "id": "abc123",
    "inquiryDate": "[1.5]",
    "inquiryNo": "C260105G",
    "inquirer": "Nord-Oliver",
    "customerNo": "NORDMOSEL-11215/V/0001/RFQ/2026",
    "description": "气泵备件1项",
    "supplierStatuses": [
      {
        "id": "s1",
        "supplierShortName": "飞罗",
        "quoteDate": "[1.6]",
        "status": "quoted"
      },
      {
        "id": "s2",
        "supplierShortName": "昆同",
        "quoteDate": "[1.6]",
        "status": "pending"
      }
    ],
    "quotedStatuses": [
      {
        "id": "q1",
        "quoteDate": "[1.6]",
        "supplierShortName": "飞罗",
        "version": "a",
        "type": "quoted"
      }
    ],
    "createdAt": "2026-01-05T08:00:00.000Z",
    "updatedAt": "2026-01-06T09:00:00.000Z"
  }
]
```

---

## 三、Excel 格式

### 列定义

| 列名 | 对应字段 | 说明 |
|------|----------|------|
| `ID` | `id` | 必填，用于合并去重 |
| `询价编号` | `inquiryNo` | 必填 |
| `询价日期` | `inquiryDate` | `[m.D]` 格式 |
| `询价人` | `inquirer` | 客户简称 |
| `客户编号` | `customerNo` | 客户的询价参考号 |
| `内容简述` | `description` | 备件描述 |
| `订单编号` | `orderNo` | 可为空 |
| `供应商报价` | — | 可读文本，导入时不解析 |
| `已报客户` | — | 可读文本，导入时不解析 |
| `无法报价` | — | 可读文本，导入时不解析 |
| `创建时间` | `createdAt` | ISO 8601 |
| `更新时间` | `updatedAt` | ISO 8601 |
| `_供应商JSON` | `supplierStatuses` | JSON 字符串，**导入关键列** |
| `_报价JSON` | `quotedStatuses` | JSON 字符串，**导入关键列** |

导入时只读取 `ID`、`询价编号`、`_供应商JSON`、`_报价JSON` 及各文本字段；可读文本列（供应商报价/已报客户/无法报价）仅供人工查阅。

推荐做法：先用应用内「导出」生成标准 Excel，修改后再「导入」，避免列名拼写错误。

---

## 四、从外部表格转换（以询价登记表.docx 为例）

### 列映射

| 表格列 | 对应字段 | 备注 |
|--------|----------|------|
| 日期 | `inquiryDate` | `1.3` → `[1.3]` |
| 询价号码 | `inquiryNo` | 单元格第1行；如有换行第2行为 `orderNo` |
| 客户 | `inquirer` | 直接映射 |
| 客户询价号 | `customerNo` | 直接映射 |
| 备件描述 | `description` | 直接映射 |
| 状态列 | `supplierStatuses` + `quotedStatuses` | 解析规则见下 |

### 状态列解析规则

状态列格式示例：`飞罗(1.6),昆同(1.6)/1.6报价飞罗`

```
[供应商段] / [客户段]
```

**供应商段**（`/` 前）：逗号分隔

| 子串样式 | 解析结果 |
|----------|----------|
| `飞罗(1.6)` | supplierShortName=飞罗, quoteDate=[1.6] |
| `昆同` | supplierShortName=昆同，无日期 |

**客户段**（`/` 后，以数字开头）：

| 子串样式 | 解析结果 |
|----------|----------|
| `1.6报价飞罗` | quoteDate=[1.6], supplierShortName=飞罗, type=quoted |
| `1.14回复无法报价` | quoteDate=[1.14], type=unavailable |
| `1.21报价飞罗A,昆同B` | quoteDate=[1.21], supplierShortName=飞罗A,昆同B, type=quoted |

---

## 五、供应商状态颜色对照

| status 值 | 显示颜色 | 含义 |
|-----------|----------|------|
| `pending` | 粉红（无日期显示） | 已询价，等待回复 |
| `quoted` | 蓝色 | 已报价给我方 |
| `unavailable` | 灰色 | 回复无法报价 |
| `need_info` | 黄色 | 需补充资料 |

整行颜色规则：有 `quotedStatuses`（type=quoted/supplemented）→ 蓝；有 type=unavailable/closed → 灰；否则 → 粉红（待报价）。
