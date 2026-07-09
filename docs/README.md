# MLUONET 文档索引

最后更新：2026-07-09

## 先看这里

- [当前系统现状](core/CURRENT_STATE.md)：最新事实源。
- [更新日志](core/CHANGELOG.md)：变更历史。
- [项目总结](core/PROJECT_SUMMARY.md)：定位与模块概览。
- [根 README](../README.md)：开发命令与部署。
- [AGENTS](../AGENTS.md)：维护代理规则与高风险区。

## 核心文档

- `CURRENT_STATE.md` / `CHANGELOG.md` / `PROJECT_SUMMARY.md` / `VERCEL_ENV_SETUP.md`

## 功能模块

- [询报价](features/inquiry/INQUIRY_MODULE.md) · [导入导出](features/inquiry/INQUIRY_IMPORT_EXPORT.md)
- [订单状态表](features/order/ORDER_STATUS_TABLE.md)
- [客户](features/customer/README.md) · [用户指南](features/customer/USER_GUIDE.md)
- [采购部登记](features/purchase-registration/PURCHASE_REGISTRATION_MODULE.md)
- [采购订单表](features/purchase-order-table/PURCHASE_ORDER_TABLE_MODULE.md)
- [内销报价](features/quotation-domestic/DOMESTIC_QUOTATION_MODULE.md)
- [报价 / 装箱 / 采购 / 发票 / 邮件 / 管理](features/README.md)
- [预加载](features/PRELOAD_FEATURE.md)
- [时区汇率 / 全球假日](modules-world-clock-holidays.md)

## 技术专题

- [权限](technical/permissions/PERMISSION_SYSTEM_FINAL_SUMMARY.md)
- [主题](technical/theme/theme_system.md)
- [工程守则（Hydration / Store）](technical/stability/engineering-guardrails.md)
- [PDF 表格渲染](technical/pdf/PDF_TABLE_RENDERER_GUIDE.md)

## 历史材料

过程 FIX / SUMMARY / 旧归档已从工作树删除，见 [archived/README.md](archived/README.md)（用 git 历史找回）。

## 维护规则

1. 现状只改 `CURRENT_STATE.md`；用户可见变更写 `CHANGELOG.md`。
2. 不要再新增 `*_FIX.md` / `*_SUMMARY.md` 过程文档；结论写入 CURRENT_STATE 或模块入口即可。
3. 任务过程写 `CODEX_TASKS.md`（保持精简），勿再堆根目录 `CODEX_*.md`。
