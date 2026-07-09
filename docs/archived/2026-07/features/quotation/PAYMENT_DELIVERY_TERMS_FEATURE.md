# 付款方式与交货期条款功能

## 📋 需求描述

在报价页面中，**付款方式（Payment Terms）** 和 **交货期（Delivery Time / Lead Time）** 字段需要支持 **从预定义条款列表中快速选择**，并且 **保存英文说明作为最终值**，以便在 PDF、保存记录等输出中直接使用。

## 🎯 实现方案

**付款方式和交货期已集成到Notes条款系统中**，作为特殊的Notes类型，支持动态选择预定义选项。

### ✅ 功能特性

- **集成到Notes系统** - 付款方式和交货期作为Notes条款显示
- **12种付款方式选项** - 从全额预付到第三方托管
- **16种交货期选项** - 从固定日期到弹性区间
- **中英文对照显示** - 中文说明 + 英文存储
- **备注信息** - 显示常用缩写和说明
- **拖拽排序** - 支持与其他Notes条款一起拖拽排序
- **显示/隐藏控制** - 可以独立控制是否显示
- **PDF集成** - 选择的条款正确显示在PDF中
- **紧凑界面** - 选项选择器占用最小空间，点击展开

### 🚀 使用方法

1. **访问Notes区域** - 在报价页面的Notes部分
2. **配置显示** - 点击设置按钮，确保"Payment Terms"和"Delivery Terms"已勾选
3. **选择条款** - 在Notes卡片中点击选项进行选择
4. **拖拽排序** - 可以调整条款的显示顺序
5. **生成PDF** - 选择的条款会正确显示在PDF中

### 📋 技术实现

#### 已更新的文件

1. **`src/features/quotation/types/notes.ts`** - 添加了付款方式和交货期选项
2. **`src/features/quotation/components/NotesSection.tsx`** - 支持特殊Notes的选项选择
3. **`src/features/quotation/state/useQuotationStore.ts`** - 添加了updateSpecialNoteOption action
4. **`src/features/quotation/services/generate.service.ts`** - 更新PDF生成逻辑

#### 核心功能

- **特殊Notes类型** - payment_terms和delivery_terms支持选项选择
- **选项数据** - 12种付款方式 + 16种交货期选项
- **状态管理** - 选择状态通过Zustand管理
- **PDF生成** - 根据选择的选项生成正确的条款内容

### 🎨 用户界面

- **Notes卡片** - 付款方式和交货期显示为Notes条款
- **紧凑选项选择器** - 点击展开，显示前8个选项
- **高亮选中** - 当前选中的选项高亮显示
- **拖拽支持** - 与其他Notes条款一起支持拖拽排序
- **空间优化** - 选项选择器占用最小空间，不影响整体布局

### 📝 数据流

1. **用户选择选项** → 更新notesConfig中的selectedOption
2. **Notes渲染** → 根据selectedOption显示对应的英文内容
3. **PDF生成** → 根据selectedOption生成最终的条款文本
4. **数据保存** → selectedOption状态随其他数据一起保存

---

**🎉 功能已完全集成到Notes系统中，提供统一的条款管理体验！**
