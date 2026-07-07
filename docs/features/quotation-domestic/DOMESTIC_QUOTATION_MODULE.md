# 内销报价单模块

> 状态：**已实现 / 维护中**  
> 最后更新：2026-07-07

---

## 概述

内销报价单是报价模块下的 `domestic` Tab，用于生成中文“产品购销合同式”报价文件。它复用 `/quotation` 页面、`quotation_history` 本地历史和 `quotation` 权限，不新增独立路由模块或 Document 类型。

---

## 路由 & 文件结构

```text
src/app/quotation/page.tsx                         # /quotation 入口
src/features/quotation/app/QuotationPage.tsx       # 根据 tab=domestic 切换中文表单
src/components/quotation/DomesticCustomerInfo.tsx  # 供方 / 需方中文录入区
src/components/quotation/ItemsTable.tsx            # 明细表，domestic 模式中文列名
src/features/quotation/components/NotesSection.tsx # 条款编辑区，domestic 模式显示合同条款
src/features/quotation/types/notes.ts              # DOMESTIC_NOTES_CONFIG 默认条款
src/features/quotation/services/generate.service.ts # PDF 分流入口
src/utils/domesticQuotationPdfGenerator.ts         # 内销中文 PDF 生成器
src/utils/rmbCapitalAmount.ts                      # RMB 金额大写转换工具
```

---

## 数据模型

内销报价单仍使用 `QuotationData`，通过 `mode: 'domestic'` 区分：

```typescript
interface DomesticPartyDetails {
  name?: string;
  address?: string;
  legalRepresentative?: string;
  agent?: string;
  phone?: string;
  fax?: string;
  taxNo?: string;
  bankName?: string;
  bankAccount?: string;
}

interface QuotationData {
  mode?: 'export' | 'domestic';
  domesticSeller?: DomesticPartyDetails;
  domesticBuyer?: DomesticPartyDetails;
  domesticTotalRemark?: string;
}
```

说明：

- 旧外贸报价单和销售确认不读取这些字段，历史数据向后兼容。
- `from` / `to` 仍保留，用于与现有历史、客户记录和通用逻辑兼容。
- 金额大写不持久化，PDF 生成和表单展示时实时通过 `convertToRmbCapital(totalAmount)` 计算。

---

## 表单行为

- 顶部字段显示为「报价单编号」「报价日期」「询价编号」。
- 客户信息区显示为「供方」「需方」，字段包括单位名称、单位地址、法定代表人、委托代理人、电话、传真、纳税人识别号、开户行、帐号。
- 明细表列名显示为产品名称、规格型号、单位、数量、单价(含税)、金额(含税)、备注。
- 合计区显示「金额大写」只读文本，并提供 `domesticTotalRemark` 可编辑备注，默认「价格含13个点专票及运费」。
- 条款区复用 `NotesConfig` / `NoteConfig` 机制，默认提供二至十四条款，可编辑、显示或隐藏。

---

## PDF 输出

`tab === 'domestic'` 时，`generatePdf()` 动态导入 `generateDomesticQuotationPDF()`，不会进入外贸报价单或销售确认 PDF 生成器。

PDF 结构：

- 标题「内 销 报 价 单」居中加粗。
- 顶部展示供方、需方、报价单编号、报价日期和可选询价编号。
- 产品明细表使用 `jspdf-autotable`，表头重复和分页由 AutoTable 处理。
- 合计区展示金额大写、合计备注和合计数字。
- 条款区渲染二至十四条款。
- 底部供方 / 需方双栏表格展示签章信息。
- `showBank` 控制开户行和帐号行。
- `showStamp` 为真时，在供方栏叠加上海或香港印章资源。
- 页脚显示 `Page X of Y`。

中文字体通过 `src/utils/pdf/ensureFont.ts` 的 `safeSetCnFont()` 设置。

---

## 权限与存储

- 权限：复用 `quotation` 模块权限。
- 路由：`/quotation?tab=domestic`。
- 历史：仍写入 `quotation_history`，类型保持 `quotation`，通过 `data.mode='domestic'` 区分。
- 编号：当前沿用报价单编号逻辑，未新增独立内销编号规则。

---

## 验证

```bash
npx tsc --noEmit
npx eslint src/utils/rmbCapitalAmount.ts src/features/rmb/app/RmbPage.tsx src/types/quotation.ts src/features/quotation/types/index.ts src/features/quotation/types/notes.ts src/utils/quotationInitialData.ts src/features/quotation/state/useQuotationStore.ts src/features/quotation/services/quotation.service.ts src/features/quotation/hooks/useInitQuotation.ts src/utils/sanitizeQuotation.ts src/components/quotation/DomesticCustomerInfo.tsx src/components/quotation/ItemsTable.tsx src/features/quotation/components/NotesSection.tsx src/features/quotation/app/QuotationPage.tsx src/utils/domesticQuotationPdfGenerator.ts src/features/quotation/services/generate.service.ts
npm run build
```
