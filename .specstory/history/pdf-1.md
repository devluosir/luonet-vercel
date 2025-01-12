## SpecStory

## PDF生成单位值问题分析 (2025/1/9 23:19:05)

_**User**_

这两个在生成pdf时，单位这一列，没有能效传递来自页面上显示的单位值

---

_**Assistant**_

我来帮你分析并解决这个问题。我看到在两个PDF生成器文件中，都是从`data.items`中获取单位值，使用的是`item.unit`。让我先搜索一下相关的类型定义，看看是否存在问题。

---

_**Assistant**_



---

_**Assistant**_



通过代码分析，我发现问题所在。在页面上，单位值是通过`getUnitDisplay`函数处理的，这个函数会根据数量自动处理单位的单复数形式。但在PDF生成器中，直接使用了`item.unit`的值，没有进行相同的单复数处理。

让我修复这个问题。我需要在两个PDF生成器中添加相同的单位处理逻辑。

---

_**Assistant**_

```
// 货币符号映射
const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  CNY: '¥'
};

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

// 生成报价单PDF
export const generateQuotationPDF
// ... existing code ...
          {
            content: item.quantity || '',
            styles: item.highlight?.quantity ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: getUnitDisplay(item.unit || '', item.quantity || 0),
            styles: item.highlight?.unit ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: item.unitPrice === 0 ? '' : item.unitPrice.toFixed(2),
            styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
```

---

_**Assistant**_

```
// 货币符号映射
const currencySymbols: { [key: string]: string } = {
  USD: '$',
  EUR: '€',
  CNY: '¥'
};

// 默认单位列表（需要单复数变化的单位）
const defaultUnits = ['pc', 'set', 'length'];

// 处理单位的单复数
const getUnitDisplay = (baseUnit: string, quantity: number) => {
  const singularUnit = baseUnit.replace(/s$/, '');
  if (defaultUnits.includes(singularUnit)) {
    return quantity > 1 ? `${singularUnit}s` : singularUnit;
  }
  return baseUnit; // 自定义单位不变化单复数
};

export const generateOrderConfirmationPDF
// ... existing code ...
          {
            content: item.quantity === 0 ? '' : item.quantity,
            styles: item.highlight?.quantity ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: getUnitDisplay(item.unit || '', item.quantity || 0),
            styles: item.highlight?.unit ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
          {
            content: item.unitPrice === 0 ? '' : item.unitPrice.toFixed(2),
            styles: item.highlight?.unitPrice ? { textColor: [255, 0, 0] as [number, number, number] } : {}
          },
```

---

_**Assistant**_



我已经修复了这个问题。主要做了以下改动：

1. 在两个PDF生成器文件中添加了相同的单位处理逻辑：
   - 添加了`defaultUnits`常量，定义需要单复数变化的单位列表
   - 添加了`getUnitDisplay`函数，用于处理单位的单复数形式

2. 修改了单位显示逻辑：
   - 将原来直接使用`item.unit`的地方改为使用`getUnitDisplay(item.unit || '', item.quantity || 0)`
   - 这样可以确保PDF中显示的单位与页面上显示的保持一致，都会根据数量自动处理单复数形式

现在，PDF中的单位显示将与页面上的显示保持一致，当数量大于1时，默认单位（pc、set、length）会自动显示为复数形式（pcs、sets、lengths）。

---



---

