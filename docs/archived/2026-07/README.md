# 2026-07 文档归档

归档日期：2026-07-09  
原因：清理 features/technical/core 中与 `docs/bugfixes/` 重复、或已过时的过程/修复/迁移总结；保留入口文档与 bugfixes 作为历史证据。

## 规则

1. **事实源仍在**：`docs/core/CURRENT_STATE.md`、`CHANGELOG.md`、各模块 `*_MODULE.md` / `README.md`。
2. **bugfixes 原位保留**：`docs/bugfixes/` 未移动，作为修复记录的 canonical 副本。
3. **本目录为历史证据**：不作为当前实现说明；查阅时以 CURRENT_STATE 为准。

## 本批内容（约 76 篇）

| 来源 | 说明 |
|------|------|
| `features/mail|packing|quotation/` 同名 FIX | 与 bugfixes 内容完全相同，features 侧移入此处 |
| `features/*` 模块化/优化/功能过程文档 | 迁移、打磨、一次性功能说明 |
| `features/games/` | 产品已无游戏入口，整夹归档 |
| `technical/performance|theme|permissions|stability/` | 与 bugfixes 重复或一次性优化记录 |
| `core/FONT|LOGO_OPTIMIZATION_SUMMARY.md` | 非入口优化总结 |
| `testing/FINAL_VERIFICATION_CHECKLIST.md` | 一次性验收清单 |

## 同期整理（未归档，改路径）

| 原路径 | 新路径 |
|--------|--------|
| `docs/INQUIRY_IMPORT_EXPORT.md` | `docs/features/inquiry/INQUIRY_IMPORT_EXPORT.md` |
| `docs/PDF_TABLE_RENDERER_GUIDE.md` | `docs/technical/pdf/PDF_TABLE_RENDERER_GUIDE.md` |

## 目录结构

```text
docs/archived/2026-07/
├── README.md          # 本文件
├── core/
├── features/          # admin, games, invoice, mail, packing, purchase, quotation, …
├── technical/         # performance, permissions, stability, theme
└── testing/
```
