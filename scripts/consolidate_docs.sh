#!/bin/bash

# MLUONET 项目文档整理脚本

echo "🚀 开始 MLUONET 项目文档整理..."

# 创建新的文档目录结构
echo "📁 创建新的文档目录结构..."
mkdir -p docs/core
mkdir -p docs/features/{quotation,purchase,packing,mail,games}
mkdir -p docs/technical/{performance,theme,stability,permissions}
mkdir -p docs/bugfixes
mkdir -p docs/testing

echo "✅ 目录结构创建完成"

# 备份原始文档
echo "💾 备份原始文档..."
mkdir -p docs_backup
cp *.md docs_backup/ 2>/dev/null || true
cp -r docs/* docs_backup/ 2>/dev/null || true

# 移动核心文档
echo "📄 整理核心文档..."
cp README.md docs/core/ 2>/dev/null || true
cp PROJECT_SUMMARY.md docs/core/ 2>/dev/null || true
cp CHANGELOG.md docs/core/ 2>/dev/null || true

# 移动功能模块文档
echo "📦 整理功能模块文档..."
cp NOTES_CUSTOMIZATION_FEATURE.md docs/features/quotation/ 2>/dev/null || true
cp QUOTATION_*.md docs/features/quotation/ 2>/dev/null || true
cp PURCHASE_*.md docs/features/purchase/ 2>/dev/null || true
cp PACKING_*.md docs/features/packing/ 2>/dev/null || true
cp MAIL_*.md docs/features/mail/ 2>/dev/null || true
cp AI_*.md docs/features/games/ 2>/dev/null || true
cp RANDOM_MOVE_FEATURE.md docs/features/games/ 2>/dev/null || true

# 移动技术文档
echo "🔧 整理技术文档..."
cp FONT_OPTIMIZATION_*.md docs/technical/performance/ 2>/dev/null || true
cp PDF_PERFORMANCE_*.md docs/technical/performance/ 2>/dev/null || true
cp PRELOAD_*.md docs/technical/performance/ 2>/dev/null || true
cp THEME_*.md docs/technical/theme/ 2>/dev/null || true
cp BUTTON_COLOR_*.md docs/technical/theme/ 2>/dev/null || true
cp STABILITY_*.md docs/technical/stability/ 2>/dev/null || true
cp PERMISSION_*.md docs/technical/permissions/ 2>/dev/null || true

# 移动问题修复文档
echo "🐛 整理问题修复文档..."
cp PDF_*.md docs/bugfixes/ 2>/dev/null || true
cp COLOR_*.md docs/bugfixes/ 2>/dev/null || true
cp MERGE_*.md docs/bugfixes/ 2>/dev/null || true
cp LOCALSTORAGE_*.md docs/bugfixes/ 2>/dev/null || true

# 移动测试文档
echo "🧪 整理测试文档..."
cp *_TEST.md docs/testing/ 2>/dev/null || true
cp *_CHECKLIST.md docs/testing/ 2>/dev/null || true

echo "✅ 文档整理完成！"
echo "📁 新结构: docs/{core,features,technical,bugfixes,testing}/"
echo "�� 备份: docs_backup/"
