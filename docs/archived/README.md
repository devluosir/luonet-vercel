# 已清理的历史文档

最后更新：2026-07-09

本目录**不再存放**过程总结、一次性 FIX、模块化迁移报告。

此前曾存在：

- `docs/bugfixes/`（约 39 篇）
- `docs/archived/2025-10/`、`docs/archived/2026-07/`（过程/重复文档）

上述内容已从工作树删除。需要查阅时用 git 历史找回，例如：

```bash
git log --diff-filter=D --summary -- docs/bugfixes docs/archived
git show <commit>:docs/bugfixes/HYDRATION_FIX.md
```

**当前事实源**：`docs/core/CURRENT_STATE.md`、`docs/core/CHANGELOG.md`、各模块入口文档。
