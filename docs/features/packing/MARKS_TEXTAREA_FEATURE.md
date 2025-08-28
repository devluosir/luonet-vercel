# Packing模块Marks列换行功能

## 功能概述

在packing模块的marks列中，新增了支持单元格内换行的功能，让用户可以更方便地输入和编辑多行文本内容。

## 主要特性

### 1. 换行支持
- 支持在marks列单元格内按Enter键换行
- 自动调整单元格高度以适应内容
- 支持Shift+Enter强制换行

### 2. 自动高度调整
- 单元格高度根据内容自动调整
- 最小高度28px，最大高度根据内容自适应
- 平滑的高度变化动画

### 3. 多端支持
- **移动端卡片视图**: 支持textarea换行输入
- **桌面端表格视图**: 支持textarea换行输入
- **合并单元格模式**: 支持合并单元格内的换行输入

## 实现细节

### 1. 移动端卡片视图
```tsx
{/* Marks */}
{effectiveVisibleCols.includes('marks') && (
  <div>
    <label className="block text-xs font-medium text-[#86868B] dark:text-[#86868B] mb-1">Marks</label>
    <textarea
      value={item.marks || ''}
      onChange={(e) => {
        onItemChange(index, 'marks', e.target.value);
        e.target.style.height = '28px';
        e.target.style.height = `${e.target.scrollHeight}px`;
      }}
      className="w-full px-3 py-2 bg-transparent border border-[#E5E5EA] dark:border-[#2C2C2E] rounded-lg
        focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30
        text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7]
        placeholder:text-[#86868B] dark:placeholder:text-[#86868B]
        transition-all duration-200 resize-none overflow-hidden min-h-[60px]"
      placeholder="Marks"
    />
  </div>
)}
```

### 2. 桌面端表格视图
```tsx
{effectiveVisibleCols.includes('marks') && (
  hasGroupedItems ? (
    <td className="py-2 px-4 text-center text-sm">
      <textarea
        value={item.marks || ''}
        onChange={(e) => {
          onItemChange(index, 'marks', e.target.value);
          e.target.style.height = '28px';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        className="w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden ios-optimized-input"
        style={{ height: '28px' }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.stopPropagation();
          }
        }}
        placeholder="Marks"
      />
    </td>
  ) : (
    // 合并单元格模式下的实现...
  )
)}
```

### 3. 合并单元格模式
```tsx
<textarea
  value={marksIsMerged ? marksMergedInfo.content : (item.marks || '')}
  onChange={(e) => {
    const newValue = e.target.value;
    e.target.style.height = '28px';
    e.target.style.height = `${e.target.scrollHeight}px`;
    if (marksIsMerged && marksMergedInfo) {
      // 合并单元格的批量更新逻辑...
    } else {
      onItemChange(index, 'marks', newValue);
    }
  }}
  className={`w-full px-3 py-1.5 bg-transparent border border-transparent focus:outline-none focus:ring-[3px] focus:ring-[#0066CC]/30 dark:focus:ring-[#0A84FF]/30 hover:bg-[#F5F5F7]/50 dark:hover:bg-[#2C2C2E]/50 text-[12px] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B] dark:placeholder:text-[#86868B] transition-all duration-200 text-center whitespace-pre-wrap resize-y overflow-hidden ios-optimized-input ${item.highlight?.marks ? highlightClass : ''} ${marksIsMerged ? 'border-blue-200 dark:border-blue-700' : ''}`}
  style={{ height: '28px' }}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.stopPropagation();
    }
  }}
  placeholder="Marks"
/>
```

## 样式特性

### 1. 自动高度调整
- 初始高度28px
- 根据内容自动调整到scrollHeight
- 支持最小高度限制

### 2. 文本样式
- `whitespace-pre-wrap`: 保持换行和空格
- `resize-y`: 允许垂直调整大小
- `overflow-hidden`: 隐藏滚动条

### 3. 交互样式
- 焦点状态蓝色边框
- 悬停状态背景色变化
- 平滑的过渡动画

## 兼容性

### 1. 旧版本兼容
- 修改了旧的packing组件中的marks列
- 保持了所有现有功能
- 向后兼容现有数据

### 2. PDF导出兼容
- PDF生成器已支持marks列的换行内容
- 自动处理多行文本的显示
- 保持表格布局的完整性

## 使用方法

### 1. 基本换行
- 在marks列单元格中直接输入文本
- 按Enter键换行
- 单元格高度自动调整

### 2. 强制换行
- 使用Shift+Enter强制换行
- 避免触发其他快捷键

### 3. 高度调整
- 单元格高度根据内容自动调整
- 可以手动拖拽调整高度
- 最小高度28px

## 技术实现

### 1. 组件替换
- 将`input`元素替换为`textarea`元素
- 保持所有现有的事件处理逻辑
- 添加高度自动调整功能

### 2. 样式适配
- 保持与描述列相同的样式
- 适配深色模式
- 支持iOS优化

### 3. 事件处理
- 保持现有的onChange事件处理
- 添加高度调整逻辑
- 处理键盘事件

## 更新日志

### 2025-01-08
- ✅ **新增marks列换行功能**: 将marks列的input改为textarea，支持单元格内换行
- ✅ **移动端支持**: 移动端卡片视图中的marks列支持换行
- ✅ **桌面端支持**: 桌面端表格视图中的marks列支持换行
- ✅ **合并单元格支持**: 合并单元格模式下的marks列支持换行
- ✅ **旧版本兼容**: 修改旧的packing组件，保持功能一致性
- ✅ **样式统一**: 与描述列保持相同的换行样式和交互体验
