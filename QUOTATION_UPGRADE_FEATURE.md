# 报价单升级为订单确认书功能

## 功能概述

当报价单升级为订单确认书后，原来的报价单记录会自动从dashboard的报价单列表中隐藏，因为同一个单据已经升级为订单了。

## 业务逻辑

### 升级流程
1. **创建报价单**：用户创建报价单，类型为`quotation`
2. **升级为订单**：用户在报价单页面切换到"Order Confirmation"标签，将报价单升级为订单确认书
3. **自动隐藏**：升级后，原来的报价单记录自动从报价单列表中隐藏，只在订单确认书列表中显示

### 数据存储结构
- 报价单和订单确认书都存储在`quotation_history`中
- 通过`type`字段区分：`'quotation'` 和 `'confirmation'`
- 升级时使用相同的`id`，只更新`type`字段

## 技术实现

### 1. 升级检测逻辑

**文件：`src/utils/dashboardUtils.ts`**

```typescript
// 检测报价单是否已升级为confirmation的工具函数
export const isQuotationUpgraded = (quotationRecord: any, confirmationRecords: any[]): boolean => {
  return confirmationRecords.some((confirmation: any) => {
    // 比较报价单号和合同号，如果相同说明已升级
    return confirmation.data?.contractNo === quotationRecord.quotationNo || 
           confirmation.quotationNo === quotationRecord.quotationNo;
  });
};
```

### 2. 文档加载过滤

**文件：`src/utils/dashboardUtils.ts`**

```typescript
export const getDocumentsByType = (type: DocumentType): DocumentWithType[] => {
  if (type === 'quotation') {
    const quotationHistory = getSafeLocalStorage('quotation_history') || [];
    const confirmationRecords = quotationHistory.filter((doc: any) => doc.type === 'confirmation');
    
    return quotationHistory
      .filter((doc: any) => {
        if (doc.type !== 'quotation') return false;
        
        // 检查这个报价单是否已经升级为confirmation
        const isUpgraded = isQuotationUpgraded(doc, confirmationRecords);
        
        // 如果已升级，则不显示在报价单列表中
        return !isUpgraded;
      })
      .map((doc: any) => ({ ...doc, type: 'quotation' as DocumentType }));
  }
  // ... 其他类型的处理
};
```

### 3. 数量统计更新

**文件：`src/utils/documentCounts.ts`**

```typescript
export const getQuotationCount = (): number => {
  const quotationHistory = getLocalStorageJSON('quotation_history', []);
  const confirmationRecords = quotationHistory.filter((item: any) => 
    'type' in item && item.type === 'confirmation'
  );
  
  return quotationHistory.filter((item: any) => {
    if (!('type' in item) || item.type !== 'quotation') return false;
    
    // 检查这个报价单是否已经升级为confirmation
    const isUpgraded = isQuotationUpgraded(item, confirmationRecords);
    
    // 如果已升级，则不计入报价单数量
    return !isUpgraded;
  }).length;
};
```

## 升级检测规则

### 匹配条件
系统通过以下条件判断报价单是否已升级为订单确认书：

1. **合同号匹配**：`confirmation.data.contractNo === quotation.quotationNo`
2. **订单号匹配**：`confirmation.quotationNo === quotation.quotationNo`

### 示例场景
- **报价单**：`quotationNo: "FL2548"`, `type: "quotation"`
- **订单确认书**：`contractNo: "FL2548"`, `type: "confirmation"`
- **结果**：报价单FL2548自动从报价单列表中隐藏

## 用户体验

### Dashboard显示
- **报价单列表**：只显示未升级的报价单（蓝色图标）
- **订单确认书列表**：显示所有订单确认书（绿色图标）
- **数量统计**：报价单数量不包含已升级的记录

### 历史记录页面
- **报价单标签**：只显示未升级的报价单
- **订单确认书标签**：显示所有订单确认书
- **搜索功能**：支持按单据号搜索，能找到对应的订单确认书

## 优势

1. **避免重复显示**：同一个单据不会在报价单和订单确认书中重复显示
2. **数据一致性**：确保dashboard显示的数据与实际业务状态一致
3. **用户体验**：用户不会看到已升级的报价单，减少混淆
4. **统计准确性**：数量统计准确反映当前有效的报价单数量

## 注意事项

1. **数据完整性**：升级检测基于单据号匹配，确保单据号的一致性
2. **性能优化**：检测逻辑已优化，避免重复计算
3. **向后兼容**：不影响现有的报价单和订单确认书数据
4. **错误处理**：包含完善的错误处理机制，确保系统稳定性
