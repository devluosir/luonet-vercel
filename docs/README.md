# MLUONET 文档索引

最后更新：2026-07-06

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

- [询报价登记](features/inquiry/INQUIRY_MODULE.md)
- [订单状态表](features/order/ORDER_STATUS_TABLE.md)
- [客户管理](features/customer/README.md)
- [报价模块](features/quotation/)
- [采购模块](features/purchase/)
- [装箱单模块](features/packing/)
- [发票模块](features/invoice/)
- [AI 邮件](features/mail/)
- [管理后台](features/admin/)
- [工具模块：时区汇率 / 全球假日](modules-world-clock-holidays.md)

### 技术专题

- [权限系统](technical/permissions/PERMISSION_SYSTEM_FINAL_SUMMARY.md)
- [稳定性保障](technical/stability/)
- [性能优化](technical/performance/)
- [主题系统](technical/theme/)

### 历史材料

- `docs/bugfixes/`：历史 bug 修复记录。
- `docs/archived/`：已归档旧方案。
- 各模块目录中的旧 `*_SUMMARY.md`、`*_FIX.md` 是历史证据，不作为当前事实源。

## 维护规则

1. 当前状态只更新 `docs/core/CURRENT_STATE.md`。
2. 完成用户可见功能或生产迁移时，同步更新 `docs/core/CHANGELOG.md`。
3. 任务过程只写入 `CODEX_TASKS.md`，不要再新增根目录 `CODEX_*.md` 临时文件。
4. 旧过程总结、重复报告、一次性排查文档应删除或归档，不继续散落在根目录和 `docs/core/`。
5. 模块 README 只保留当前可用行为，不记录过时实现细节。
