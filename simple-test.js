// 简单测试：验证数据流
console.log('=== 简单测试 ===');

// 模拟解析后的数据
const mockData = {
  items: [
    {
      id: 1,
      partName: 'hock Absorber, Anti-Vibration Rubber Isolator Mounts',
      quantity: 20,
      unit: 'pc',
      unitPrice: 8,
      amount: 160,
      remarks: 'we can only offer similar size, kindly see attached.'
    }
  ]
};

console.log('模拟数据:', mockData);
console.log('第一个项目的备注:', mockData.items[0].remarks);
console.log('备注字段类型:', typeof mockData.items[0].remarks);
console.log('备注字段长度:', mockData.items[0].remarks.length);

// 模拟条件判断
const effectiveVisibleCols = ['partName', 'quantity', 'unit', 'unitPrice', 'amount', 'remarks'];
const mergedRemarksCells = [];

console.log('\n条件判断:');
console.log('effectiveVisibleCols:', effectiveVisibleCols);
console.log('includes remarks:', effectiveVisibleCols.includes('remarks'));
console.log('mergedRemarksCells:', mergedRemarksCells);
console.log('shouldRenderRemarkCell(0, []):', true); // 空数组时返回true

const shouldShow = effectiveVisibleCols.includes('remarks') && true;
console.log('shouldShow:', shouldShow);
