# 单据管理模块 - 选中单据导出功能修复

## 问题描述

在单据管理模块中，用户无法导出选中的单据。原有的导出功能只支持：
- 导出当前选项卡的所有数据
- 导出所有历史记录  
- 导出筛选后的数据

但缺少了"导出选中单据"的功能。

## 解决方案

### 1. 更新导出函数 (`src/utils/historyImportExport.ts`)

**修改内容：**
- 在 `executeExport` 函数中添加了 `'selected'` 导出类型
- 新增 `selectedIds` 参数，用于接收选中的单据ID集合
- 实现了选中单据的过滤和导出逻辑

**新增功能：**
```typescript
case 'selected':
  // 导出选中的单据
  if (!selectedIds || selectedIds.size === 0) {
    throw new Error('请先选择要导出的单据');
  }
  
  // 根据当前选项卡过滤选中的单据
  let selectedData: HistoryItem[] = [];
  // ... 过滤逻辑
  
  const selectedExportData = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalRecords: selectedData.length,
      exportType: 'selected',
      activeTab: activeTab
    },
    records: selectedData
  };
```

### 2. 更新导出模态框 (`src/app/history/ExportModal.tsx`)

**修改内容：**
- 添加了 `selectedIds` 属性到 `ExportModalProps` 接口
- 在模态框中添加了"导出选中单据"按钮
- 更新了 `handleExport` 函数以支持 `'selected'` 类型
- 改进了错误处理，显示具体的错误信息

**新增UI元素：**
```typescript
{/* 选中单据导出按钮 */}
{selectedCount > 0 && (
  <button
    onClick={() => handleExport('selected')}
    disabled={isLoading}
    className="w-full p-4 text-left bg-gradient-to-r from-orange-50 to-red-50..."
  >
    <div className="flex items-center space-x-3">
      <CheckSquare className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      <div>
        <div className="font-medium text-gray-900 dark:text-white">
          导出选中单据 ({selectedCount} 条)
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          仅导出当前选中的单据数据
        </div>
      </div>
    </div>
  </button>
)}
```

### 3. 更新历史记录页面 (`src/features/history/app/HistoryPage.tsx`)

**修改内容：**
- 将 `selectedIds` 传递给 `ExportModal` 组件
- 确保选中的单据ID能够正确传递到导出功能

```typescript
{showExportModal && (
  <ExportModal
    isOpen={showExportModal}
    onClose={() => useHistoryStore.getState().setShowExportModal(false)}
    activeTab={activeTab}
    selectedIds={useHistoryStore.getState().selectedItems}
  />
)}
```

## 功能特点

### 1. 智能显示
- 只有当用户选中了单据时，"导出选中单据"按钮才会显示
- 按钮上会显示选中的单据数量

### 2. 数据过滤
- 根据当前激活的选项卡类型，只导出对应类型的选中单据
- 支持所有单据类型：报价单、销售确认、发票、采购单、装箱单

### 3. 错误处理
- 如果没有选中任何单据，会显示友好的错误提示
- 如果选中的单据ID在数据库中找不到，会显示相应错误信息

### 4. 导出格式
- 导出的JSON文件包含完整的元数据信息
- 文件名格式：`selected_{单据类型}_{日期}.json`
- 包含导出时间、记录数量、导出类型等信息

## 使用方法

1. **选择单据**：在单据管理页面，勾选要导出的单据
2. **点击导出**：点击页面右上角的导出按钮
3. **选择导出方式**：在弹出的模态框中，选择"导出选中单据"
4. **下载文件**：系统会自动下载包含选中单据的JSON文件

## 技术细节

### 数据结构
```typescript
interface ExportResult {
  jsonData: string;      // JSON格式的数据
  fileName: string;      // 文件名
  exportStats: string;   // 导出统计信息
}
```

### 导出文件格式
```json
{
  "metadata": {
    "exportDate": "2024-01-01T00:00:00.000Z",
    "totalRecords": 5,
    "exportType": "selected",
    "activeTab": "quotation"
  },
  "records": [
    // 选中的单据数据...
  ]
}
```

## 兼容性

- 完全向后兼容，不影响现有功能
- 支持所有现有的单据类型
- 与现有的选择、筛选、排序功能完美集成

## 测试建议

1. **基本功能测试**：
   - 选择单个单据并导出
   - 选择多个单据并导出
   - 在不同选项卡中测试选中导出

2. **边界情况测试**：
   - 未选择任何单据时尝试导出
   - 选择所有单据时导出
   - 在不同筛选条件下测试

3. **数据完整性测试**：
   - 验证导出的数据是否完整
   - 检查文件格式是否正确
   - 确认元数据信息是否准确
