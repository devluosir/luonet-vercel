# 功能模块文档

最后更新：2026-07-09

过程/修复/迁移类文档已归档至 [docs/archived/2026-07/](../archived/2026-07/README.md)。  
当前行为以 [CURRENT_STATE.md](../core/CURRENT_STATE.md) 为准。

## 有独立模块说明的入口

| 模块 | 文档 |
|------|------|
| 询报价登记 | [INQUIRY_MODULE.md](inquiry/INQUIRY_MODULE.md) · [导入导出](inquiry/INQUIRY_IMPORT_EXPORT.md) |
| 订单状态表 | [ORDER_STATUS_TABLE.md](order/ORDER_STATUS_TABLE.md) |
| 客户管理 | [README.md](customer/README.md) · [USER_GUIDE.md](customer/USER_GUIDE.md) |
| 采购部登记 | [PURCHASE_REGISTRATION_MODULE.md](purchase-registration/PURCHASE_REGISTRATION_MODULE.md) |
| 采购订单表 | [PURCHASE_ORDER_TABLE_MODULE.md](purchase-order-table/PURCHASE_ORDER_TABLE_MODULE.md) |
| 内销报价 | [DOMESTIC_QUOTATION_MODULE.md](quotation-domestic/DOMESTIC_QUOTATION_MODULE.md) |
| 预加载 | [PRELOAD_FEATURE.md](PRELOAD_FEATURE.md) |

## 轻量入口（细节见 CURRENT_STATE）

以下模块代码在 `src/features/{module}`；文档入口仅作导航，避免再堆过程总结。

| 模块 | 入口 | CURRENT_STATE 章节提示 |
|------|------|------------------------|
| 外贸报价 / 销售确认 | [quotation/README.md](quotation/README.md) | 路由与模块 · 数据存储 |
| 装箱单 | [packing/README.md](packing/README.md) | 路由与模块 |
| 采购订单（单据） | [purchase/README.md](purchase/README.md) | 路由与模块 |
| 财务发票 | [invoice/README.md](invoice/README.md) | 路由与模块 |
| AI 邮件 | [mail/README.md](mail/README.md) | 路由与模块 |
| 管理后台 | [admin/README.md](admin/README.md) | 权限现状 |

## 已归档

- 游戏功能文档 → `docs/archived/2026-07/features/games/`
- 各模块 `*_SUMMARY` / `*_FIX` / modularization 过程文档 → `docs/archived/2026-07/features/`
