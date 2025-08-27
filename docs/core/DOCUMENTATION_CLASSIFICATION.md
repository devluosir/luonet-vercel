# MLUONET 项目文档分类清单

## 📊 文档统计
- **总文档数**: 115个.md文件
- **根目录**: 89个
- **docs目录**: 19个
- **src目录**: 7个

## 📚 分类整理方案

### 1. 核心文档 (5个)
```
docs/core/
├── README.md                    # 项目主要说明
├── PROJECT_SUMMARY.md           # 项目总体总结
├── CHANGELOG.md                 # 更新日志
├── DEPLOYMENT_GUIDE.md          # 部署指南
└── ARCHITECTURE.md              # 架构说明
```

### 2. 功能模块文档 (45个)

#### 报价模块 (8个)
- `NOTES_CUSTOMIZATION_FEATURE.md` → `quotation_notes_customization.md`
- `QUOTATION_MODULARIZATION_*.md` (4个) → `quotation_modularization.md`
- `QUOTATION_UPGRADE_FEATURE.md` → `quotation_upgrade.md`
- `SHEET_QUOTATION_FEATURE_SUMMARY.md` → `quotation_sheet_features.md`

#### 采购模块 (12个)
- `PURCHASE_MODULARIZATION_*.md` (4个) → `purchase_modularization.md`
- `PURCHASE_PERFORMANCE_OPTIMIZATION.md` → `purchase_performance.md`
- `PURCHASE_SELECTOR_*.md` (3个) → `purchase_selector_optimization.md`
- `PURCHASE_FINAL_POLISH_TEST.md` → `purchase_final_polish.md`

#### 装箱单模块 (6个)
- `PACKING_MOBILE_*.md` (2个) → `packing_mobile_optimization.md`
- `PACKING_PDF_*.md` (2个) → `packing_pdf_fixes.md`
- `PACKING_MODULE_REFINEMENT.md` → `packing_refinement.md`

#### 邮件模块 (3个)
- `MAIL_MODULARIZATION_SUMMARY.md` → `mail_modularization.md`
- `MAIL_CONNECTION_FIX.md` → `mail_connection_fix.md`
- `MAIL_BUTTON_COLOR_FIX.md` → `mail_button_fix.md`

#### 游戏功能 (3个)
- `AI_PLAYER_FEATURE.md` → `games_ai_player.md`
- `AI_STATE_SYNC_FIX.md` → `games_state_sync.md`
- `RANDOM_MOVE_FEATURE.md` → `games_random_move.md`

### 3. 技术文档 (35个)

#### 性能优化 (12个)
- `FONT_OPTIMIZATION_SUMMARY.md` → `performance_font_optimization.md`
- `PDF_PERFORMANCE_OPTIMIZATION_*.md` (3个) → `performance_pdf_optimization.md`
- `PDF_PREVIEW_PERFORMANCE_*.md` (3个) → `performance_pdf_preview.md`
- `PRELOAD_*.md` (2个) → `performance_preload.md`
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md` → `performance_general.md`

#### 主题系统 (8个)
- `THEME_*.md` (3个) → `theme_system.md`
- `BUTTON_COLOR_*.md` (3个) → `theme_button_colors.md`
- `RESPONSIVE_*.md` (2个) → `theme_responsive_design.md`

#### 稳定性保障 (6个)
- `STABILITY_GUARDRAILS_*.md` (2个) → `stability_guardrails.md`
- `HYDRATION_FIX_*.md` (2个) → `stability_hydration_fix.md`
- `ERROR_FIX_SUMMARY.md` → `stability_error_handling.md`

#### 权限系统 (3个)
- `PERMISSION_SYSTEM_FINAL_SUMMARY.md` → `permissions_system.md`
- `PERMISSION_OPTIMIZATION_SUMMARY.md` → `permissions_optimization.md`

### 4. 问题修复文档 (20个)

#### PDF问题 (6个)
- `PDF_DOUBLE_DOWNLOAD_FIX.md` → `bugfix_pdf_download.md`
- `PDF_HEALTHCHECK_GUIDE.md` → `bugfix_pdf_healthcheck.md`
- `PDF_MERGE_CELL_*.md` (2个) → `bugfix_pdf_merge_cell.md`
- `PDF_PERFORMANCE_*.md` (3个) → `bugfix_pdf_performance.md`

#### 主题问题 (5个)
- `THEME_FIX_SUMMARY.md` → `bugfix_theme_issues.md`
- `THEME_OPTIMIZATION_SUMMARY.md` → `bugfix_theme_optimization.md`
- `THEME_TOGGLE_FIX_SUMMARY.md` → `bugfix_theme_toggle.md`
- `COLOR_FIX_SUMMARY.md` → `bugfix_color_issues.md`
- `CLASSIC_THEME_FIX_SUMMARY.md` → `bugfix_classic_theme.md`

#### 移动端问题 (4个)
- `PACKING_MOBILE_*.md` (2个) → `bugfix_mobile_packing.md`
- `RESPONSIVE_*.md` (2个) → `bugfix_responsive_layout.md`

#### 通用问题 (5个)
- `MERGE_*.md` (4个) → `bugfix_merge_features.md`
- `LOCALSTORAGE_JSON_PARSE_FIX.md` → `bugfix_localstorage.md`
- `INQUIRY_NO_PDF_FIX.md` → `bugfix_inquiry_pdf.md`
- `EXPORT_SELECTED_DOCUMENTS_FIX.md` → `bugfix_export_documents.md`
- `HISTORY_*.md` (3个) → `bugfix_history_features.md`

### 5. 测试文档 (10个)
- `PURCHASE_REGRESSION_TEST.md` → `testing_purchase_regression.md`
- `PURCHASE_FINAL_POLISH_TEST.md` → `testing_purchase_polish.md`
- `QUOTATION_MODULARIZATION_TEST_CHECKLIST.md` → `testing_quotation_checklist.md`
- `TEST_CHECKLIST_NOTES_SORT.md` → `testing_notes_sort.md`
- `FINAL_VERIFICATION_CHECKLIST.md` → `testing_final_verification.md`

## 🔄 整理步骤

### 第一阶段：创建目录结构
```
docs/
├── core/           # 核心文档
├── features/       # 功能模块
│   ├── quotation/
│   ├── purchase/
│   ├── packing/
│   ├── mail/
│   └── games/
├── technical/      # 技术文档
│   ├── performance/
│   ├── theme/
│   ├── stability/
│   └── permissions/
├── bugfixes/       # 问题修复
└── testing/        # 测试文档
```

### 第二阶段：文档合并
1. 按功能模块合并重复文档
2. 保留最新和最完整的内容
3. 删除冗余信息

### 第三阶段：重命名和迁移
1. 按新命名规范重命名文档
2. 移动到对应目录
3. 更新所有内部链接

### 第四阶段：创建索引
1. 创建主索引文档
2. 为每个分类创建索引
3. 更新README.md中的链接

## 📝 命名规范
```
[模块]_[功能]_[类型].md
```

## 🚀 预期效果
- 文档数量从115个减少到约50个
- 查找效率提升80%
- 维护成本降低60%
- 文档结构更清晰

---

*整理计划制定时间: 2025年1月*
*预计完成时间: 1周*
