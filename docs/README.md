# MLUONET 文档索引

最后更新：2026-07-09

## 先看这里

- [当前系统现状](core/CURRENT_STATE.md)：最新事实源，说明当前代码、数据、权限、部署和风险。
- [更新日志](core/CHANGELOG.md)：按时间记录已完成变更。
- [项目总结](core/PROJECT_SUMMARY.md)：项目定位、模块概览和维护方式。
- [根 README](../README.md)：仓库快速说明、开发命令、部署入口。
- [AGENTS](../AGENTS.md)：给维护代理使用的工程规则和高风险区域。

## 文档分层

### 核心文档

`docs/core/` 只保留入口级文档：

- `CURRENT_STATE.md`：当前事实。
- `CHANGELOG.md`：变更历史。
- `PROJECT_SUMMARY.md`：项目摘要。
- `RELEASE_v1.2.0_SUMMARY.md`：版本发布摘要。
- `VERCEL_ENV_SETUP.md`：Vercel 环境说明。

### 功能模块

- [询报价登记](features/inquiry/INQUIRY_MODULE.md) · [导入导出格式](features/inquiry/INQUIRY_IMPORT_EXPORT.md)
- [订单状态表](features/order/ORDER_STATUS_TABLE.md)
- [客户管理](features/customer/README.md)
- [采购部登记](features/purchase-registration/PURCHASE_REGISTRATION_MODULE.md)
- [采购订单表](features/purchase-order-table/PURCHASE_ORDER_TABLE_MODULE.md)
- [内销报价](features/quotation-domestic/DOMESTIC_QUOTATION_MODULE.md)
- [报价 / 装箱 / 采购 / 发票 / 邮件 / 管理](features/README.md)（轻量入口，细节见 CURRENT_STATE）
- [预加载](features/PRELOAD_FEATURE.md)
- [工具模块：时区汇率 / 全球假日](modules-world-clock-holidays.md)

### 技术专题

- [权限系统](technical/permissions/PERMISSION_SYSTEM_FINAL_SUMMARY.md)
- [稳定性保障](technical/stability/engineering-guardrails.md) · [最终说明](technical/stability/STABILITY_GUARDRAILS_FINAL.md)
- [性能优化](technical/performance/performance_optimization.md)
- [主题系统](technical/theme/theme_system.md)
- [PDF 表格渲染](technical/pdf/PDF_TABLE_RENDERER_GUIDE.md)

### 历史材料

- `docs/bugfixes/`：历史 bug 修复记录（canonical）。
- `docs/archived/2025-10/`：销售确认→装箱单旧方案。
- `docs/archived/2026-07/`：过程/重复 FIX·SUMMARY 归档（见该目录 README）。

## 维护规则

1. 当前状态只更新 `docs/core/CURRENT_STATE.md`。
2. 完成用户可见功能或生产迁移时，同步更新 `docs/core/CHANGELOG.md`。
3. 任务过程只写入 `CODEX_TASKS.md`，不要再新增根目录 `CODEX_*.md` 临时文件。
4. 旧过程总结、重复报告、一次性排查文档应归档到 `docs/archived/YYYY-MM/`，不继续散落在 `docs/features/` 或 `docs/core/`。
5. 模块入口只保留当前可用行为；细节以 CURRENT_STATE 为准。
6. 与 `docs/bugfixes/` 内容相同的 features 副本不要再新增；修复记录只写 bugfixes 一处。
