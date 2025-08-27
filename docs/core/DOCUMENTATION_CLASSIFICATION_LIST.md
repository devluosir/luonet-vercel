# MLUONET 项目文档分类清单

## 📊 文档统计总览

### 按位置统计
- **根目录**: 89个.md文件
- **docs目录**: 19个.md文件  
- **src目录**: 7个.md文件
- **总计**: 115个.md文档

### 按类型统计
- **功能模块文档**: 45个
- **技术优化文档**: 35个
- **问题修复文档**: 20个
- **核心文档**: 5个
- **测试文档**: 10个

## 📚 详细分类清单

### 1. 核心文档 (Core) - 5个
```
docs/core/
├── README.md                           # 项目主要说明 (现有)
├── PROJECT_SUMMARY.md                  # 项目总体总结 (现有)
├── CHANGELOG.md                        # 更新日志 (现有)
├── DEPLOYMENT_GUIDE.md                 # 部署指南 (合并 VERCEL_ENV_SETUP.md)
└── ARCHITECTURE.md                     # 架构说明 (新建)
```

**需要合并的文档**:
- `VERCEL_ENV_SETUP.md` → 合并到 `DEPLOYMENT_GUIDE.md`

### 2. 功能模块文档 (Features) - 45个

#### 2.1 报价模块 (Quotation) - 8个
```
docs/features/quotation/
├── README.md                           # 模块说明 (新建)
├── NOTES_CUSTOMIZATION.md              # Notes自定义功能 (合并多个文档)
├── EXCEL_EXPORT.md                     # Excel导出功能 (合并多个文档)
├── MODULARIZATION.md                   # 模块化总结 (合并多个文档)
├── UPGRADE_FEATURES.md                 # 功能升级 (合并多个文档)
└── TEST_CHECKLIST.md                   # 测试清单 (合并多个文档)
```

**需要合并的文档**:
- `NOTES_CUSTOMIZATION_FEATURE.md`
- `NOTES_DRAG_DEBUG_CHECKLIST.md`
- `NOTES_OPTIMIZATION_SUMMARY.md`
- `QUOTATION_MODULARIZATION_*.md` (4个)
- `QUOTATION_UPGRADE_FEATURE.md`
- `SHEET_QUOTATION_FEATURE_SUMMARY.md`

#### 2.2 采购模块 (Purchase) - 12个
```
docs/features/purchase/
├── README.md                           # 模块说明 (新建)
├── MODULARIZATION.md                   # 模块化总结 (合并多个文档)
├── PERFORMANCE_OPTIMIZATION.md         # 性能优化 (合并多个文档)
├── FINAL_POLISH.md                     # 最终打磨 (合并多个文档)
├── SELECTOR_OPTIMIZATION.md            # 选择器优化 (合并多个文档)
└── REGRESSION_TEST.md                  # 回归测试 (合并多个文档)
```

**需要合并的文档**:
- `PURCHASE_MODULARIZATION_*.md` (4个)
- `PURCHASE_PERFORMANCE_OPTIMIZATION.md`
- `PURCHASE_OPTIMIZATION_COMPARISON.md`
- `PURCHASE_FINAL_POLISH_TEST.md`
- `PURCHASE_SELECTOR_*.md` (3个)
- `PURCHASE_REGRESSION_TEST.md`
- `PURCHASE_RESTORATION.md`
- `PURCHASE_SIMPLIFICATION.md`

#### 2.3 装箱单模块 (Packing) - 6个
```
docs/features/packing/
├── README.md                           # 模块说明 (新建)
├── MOBILE_OPTIMIZATION.md              # 移动端优化 (合并多个文档)
├── PDF_FIXES.md                        # PDF修复 (合并多个文档)
└── MODULE_REFINEMENT.md                # 模块优化 (合并多个文档)
```

**需要合并的文档**:
- `PACKING_MOBILE_*.md` (2个)
- `PACKING_PDF_*.md` (2个)
- `PACKING_MODULE_REFINEMENT.md`

#### 2.4 邮件模块 (Mail) - 3个
```
docs/features/mail/
├── README.md                           # 模块说明 (现有)
├── AI_ASSISTANT.md                     # AI助手功能 (合并多个文档)
└── CONNECTION_FIX.md                   # 连接修复 (合并多个文档)
```

**需要合并的文档**:
- `MAIL_MODULARIZATION_SUMMARY.md`
- `MAIL_CONNECTION_FIX.md`
- `MAIL_BUTTON_COLOR_FIX.md`

#### 2.5 游戏功能 (Games) - 3个
```
docs/features/games/
├── README.md                           # 游戏功能说明 (新建)
├── AI_PLAYER.md                        # AI玩家功能 (合并多个文档)
└── RANDOM_MOVE.md                      # 随机移动功能 (合并多个文档)
```

**需要合并的文档**:
- `AI_PLAYER_FEATURE.md`
- `AI_STATE_SYNC_FIX.md`
- `RANDOM_MOVE_FEATURE.md`

#### 2.6 其他功能模块 - 13个
```
docs/features/
├── customer/                           # 客户模块
│   ├── README.md                       # 现有
│   └── USER_GUIDE.md                   # 现有
├── invoice/                            # 发票模块
│   ├── README.md                       # 现有
│   └── MIGRATION.md                    # 合并多个文档
├── admin/                              # 管理模块
│   └── README.md                       # 现有
└── dashboard/                          # Dashboard模块
    ├── README.md                       # 新建
    └── MODULARIZATION.md               # 合并多个文档
```

**需要合并的文档**:
- `DASHBOARD_MODULARIZATION_SUMMARY.md`
- `CUSTOMER_MODULE_DOCUMENTATION_COMPLETE.md`
- `INVOICE_MODULE_MIGRATION_SUMMARY.md`

### 3. 技术文档 (Technical) - 35个

#### 3.1 性能优化 (Performance) - 12个
```
docs/technical/performance/
├── FONT_OPTIMIZATION.md                # 字体优化 (合并多个文档)
├── PDF_PERFORMANCE.md                  # PDF性能 (合并多个文档)
├── PRELOAD_OPTIMIZATION.md             # 预加载优化 (合并多个文档)
└── GENERAL_OPTIMIZATION.md             # 通用优化 (合并多个文档)
```

**需要合并的文档**:
- `FONT_OPTIMIZATION_SUMMARY.md`
- `PDF_PERFORMANCE_OPTIMIZATION_*.md` (3个)
- `PDF_PREVIEW_PERFORMANCE_*.md` (3个)
- `PRELOAD_*.md` (2个)
- `PERFORMANCE_OPTIMIZATION_SUMMARY.md`
- `SMART_DETECTION_OPTIMIZATION.md`

#### 3.2 主题系统 (Theme) - 8个
```
docs/technical/theme/
├── THEME_SYSTEM.md                     # 主题系统 (合并多个文档)
├── BUTTON_COLORS.md                    # 按钮颜色 (合并多个文档)
└── RESPONSIVE_DESIGN.md                # 响应式设计 (合并多个文档)
```

**需要合并的文档**:
- `THEME_*.md` (3个)
- `BUTTON_COLOR_*.md` (3个)
- `RESPONSIVE_*.md` (2个)

#### 3.3 稳定性保障 (Stability) - 6个
```
docs/technical/stability/
├── GUARDRAILS.md                       # 防护机制 (合并多个文档)
├── HYDRATION_FIX.md                    # 水合修复 (合并多个文档)
└── ERROR_HANDLING.md                   # 错误处理 (合并多个文档)
```

**需要合并的文档**:
- `STABILITY_GUARDRAILS_*.md` (2个)
- `HYDRATION_FIX_*.md` (2个)
- `ERROR_FIX_SUMMARY.md`
- `SC_TYPE_FIX_SUMMARY.md`

#### 3.4 权限系统 (Permissions) - 3个
```
docs/technical/permissions/
├── PERMISSION_SYSTEM.md                # 权限系统 (合并多个文档)
└── OPTIMIZATION.md                     # 优化总结 (合并多个文档)
```

**需要合并的文档**:
- `PERMISSION_SYSTEM_FINAL_SUMMARY.md`
- `PERMISSION_OPTIMIZATION_SUMMARY.md`

#### 3.5 开发指南 (Development) - 6个
```
docs/technical/development/
├── SETUP.md                            # 环境搭建 (新建)
├── CODING_STANDARDS.md                 # 编码规范 (新建)
├── TESTING.md                          # 测试指南 (合并多个文档)
└── MODULARIZATION_GUIDE.md             # 模块化指南 (合并多个文档)
```

**需要合并的文档**:
- `DOCUMENT_MODULARIZATION_PLAN.md`
- `TAB_PERSISTENCE_TEST.md`
- `COMPLEX_TABLE_TEST.md`
- `EXCEL_PARSE_TEST.md`

### 4. 问题修复文档 (Bugfixes) - 20个

#### 4.1 PDF相关问题 - 6个
```
docs/bugfixes/
├── PDF_ISSUES.md                       # PDF问题汇总 (合并多个文档)
└── PDF_DOWNLOAD_FIX.md                 # 下载修复 (合并多个文档)
```

**需要合并的文档**:
- `PDF_DOUBLE_DOWNLOAD_FIX.md`
- `PDF_HEALTHCHECK_GUIDE.md`
- `PDF_MERGE_CELL_*.md` (2个)
- `PDF_PERFORMANCE_*.md` (3个)

#### 4.2 主题相关问题 - 5个
```
docs/bugfixes/
└── THEME_ISSUES.md                     # 主题问题汇总 (合并多个文档)
```

**需要合并的文档**:
- `THEME_FIX_SUMMARY.md`
- `THEME_OPTIMIZATION_SUMMARY.md`
- `THEME_TOGGLE_FIX_SUMMARY.md`
- `COLOR_FIX_SUMMARY.md`
- `CLASSIC_THEME_FIX_SUMMARY.md`

#### 4.3 移动端问题 - 4个
```
docs/bugfixes/
└── MOBILE_ISSUES.md                    # 移动端问题汇总 (合并多个文档)
```

**需要合并的文档**:
- `PACKING_MOBILE_*.md` (2个)
- `RESPONSIVE_*.md` (2个)

#### 4.4 通用问题 - 5个
```
docs/bugfixes/
├── GENERAL_ISSUES.md                   # 通用问题汇总 (合并多个文档)
├── MERGE_ISSUES.md                     # 合并功能问题 (合并多个文档)
└── LOCALSTORAGE_ISSUES.md              # 本地存储问题 (合并多个文档)
```

**需要合并的文档**:
- `MERGE_*.md` (4个)
- `LOCALSTORAGE_JSON_PARSE_FIX.md`
- `INQUIRY_NO_PDF_FIX.md`
- `EXPORT_SELECTED_DOCUMENTS_FIX.md`
- `HISTORY_*.md` (3个)

### 5. 测试文档 (Testing) - 10个
```
docs/testing/
├── REGRESSION_TESTS.md                 # 回归测试 (合并多个文档)
├── FEATURE_TESTS.md                    # 功能测试 (合并多个文档)
├── PERFORMANCE_TESTS.md                # 性能测试 (合并多个文档)
└── CHECKLISTS.md                       # 测试清单 (合并多个文档)
```

**需要合并的文档**:
- `PURCHASE_REGRESSION_TEST.md`
- `PURCHASE_FINAL_POLISH_TEST.md`
- `QUOTATION_MODULARIZATION_TEST_CHECKLIST.md`
- `TEST_CHECKLIST_NOTES_SORT.md`
- `FINAL_VERIFICATION_CHECKLIST.md`

## 🔄 合并策略

### 合并原则
1. **按功能合并**: 相同功能的多个文档合并为一个
2. **保留最新**: 优先保留最新的内容和解决方案
3. **保留精华**: 删除重复内容，保留有价值的信息
4. **统一格式**: 合并后统一文档格式和风格

### 合并优先级
1. **高优先级**: 核心功能模块文档
2. **中优先级**: 技术优化和问题修复文档
3. **低优先级**: 测试和历史文档

## 📝 重命名规范

### 新命名规则
```
[模块]_[功能]_[类型].md
```

### 示例重命名
- `NOTES_CUSTOMIZATION_FEATURE.md` → `quotation_notes_customization.md`
- `PURCHASE_MODULARIZATION_SUMMARY.md` → `purchase_modularization_summary.md`
- `PDF_PERFORMANCE_OPTIMIZATION_FINAL.md` → `performance_pdf_optimization.md`
- `THEME_FIX_SUMMARY.md` → `bugfix_theme_issues.md`

## 🚀 实施计划

### 第一阶段：核心文档整理 (1天)
1. 整理核心文档
2. 创建主索引
3. 建立目录结构

### 第二阶段：功能模块整理 (2-3天)
1. 合并报价模块文档
2. 合并采购模块文档
3. 合并其他功能模块文档

### 第三阶段：技术文档整理 (2天)
1. 合并性能优化文档
2. 合并主题系统文档
3. 合并稳定性文档

### 第四阶段：问题修复整理 (1天)
1. 合并PDF问题文档
2. 合并主题问题文档
3. 合并其他问题文档

### 第五阶段：最终整理 (1天)
1. 更新所有链接
2. 创建分类索引
3. 验证文档完整性

---

*分类清单制定时间: 2025年1月*
*预计整理时间: 1周*
