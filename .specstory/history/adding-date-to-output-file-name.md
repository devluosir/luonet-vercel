## SpecStory

## Adding Date to Output File Name (2025/1/9 20:59:03)

_**User**_

输出的文件名，后面加上日期

---

_**Assistant**_

要在输出的文件名后面加上日期，你可以在 `doc.save` 方法中修改文件名的格式。可以使用 JavaScript 的 `Date` 对象来获取当前日期，并将其格式化为你想要的格式。以下是修改后的代码片段：

```typescript:src/utils/quotationPdfGenerator.ts
    // 获取当前日期并格式化
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

    // 如果不是预览模式，下载文件
    doc.save(`Quotation-${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob(); // 返回空 Blob 以满足类型要求
  } catch (error) {
    console.error('Error generating PDF:', error);
```

### 解释
- 使用 `new Date()` 获取当前日期。
- 使用 `getFullYear()`、`getMonth()` 和 `getDate()` 方法获取年、月、日。
- `getMonth()` 返回的月份是从 0 开始的，所以需要加 1。
- 使用 `padStart(2, '0')` 确保月份和日期是两位数。
- 将格式化后的日期添加到文件名中。

---

_**User**_

订单确认输出的名称后加上日期

---

_**Assistant**_

要在订单确认输出的文件名后面加上日期，可以参考之前的修改方法。以下是更新后的代码片段：

```typescript:src/utils/orderConfirmationPdfGenerator.ts
    // 获取当前日期并格式化
    const currentDate = new Date();
    const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

    // 保存文件，文件名中包含日期
    doc.save(`Order-${data.quotationNo}-${formattedDate}.pdf`);
    return new Blob();
```

### 解释
- 使用 `new Date()` 获取当前日期。
- 使用 `getFullYear()`、`getMonth()` 和 `getDate()` 方法获取年、月、日。
- `getMonth()` 返回的月份是从 0 开始的，所以需要加 1。
- 使用 `padStart(2, '0')` 确保月份和日期是两位数。
- 将格式化后的日期添加到文件名中。

---

_**User**_

生成的发票名称后面加上日期

---

_**Assistant**_

要在生成的发票名称后面加上日期，可以按照之前的方式进行修改。以下是更新后的代码片段：

```typescript:src/utils/invoicePdfGenerator.ts
      return doc.output('bloburl');
    } else {
      // 获取当前日期并格式化
      const currentDate = new Date();
      const formattedDate = `${currentDate.getFullYear()}-${(currentDate.getMonth() + 1).toString().padStart(2, '0')}-${currentDate.getDate().toString().padStart(2, '0')}`;

      // 保存文件，文件名中包含日期
      doc.save(`${getInvoiceTitle(data)}-${data.invoiceNo}-${formattedDate}.pdf`);
    }
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
```

### 解释
- 使用 `new Date()` 获取当前日期。
- 使用 `getFullYear()`、`getMonth()` 和 `getDate()` 方法获取年、月、日。
- `getMonth()` 返回的月份是从 0 开始的，所以需要加 1。
- 使用 `padStart(2, '0')` 确保月份和日期是两位数。
- 将格式化后的日期添加到文件名中。

---



---

