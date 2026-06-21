# 客户编辑表单"更新"保存失败 — Bug 修复指令

## 问题现象

打开「编辑客户」弹窗，修改任意字段后点击「更新」：
- 表面上没有报错
- 实际上不更新原记录，而是在 `localStorage` 中 **新增了一条重复记录**
- 刷新页面后客户列表出现两条同名客户（名称不完全相同）

---

## 根因分析（调用链）

```
handleEdit(customer)
  └─ setFormDataForEdit(item)          ← Bug A: name 字段填入了"合并字符串"
       formData.name = item.name       ← item.name = "Mr. Sumanta Paul\nIndian Chain Pvt Ltd..."
                                          但 <input type="text"> 只显示 \n 之前的部分

用户点击「更新」
  └─ handleSubmit()
       └─ saveCustomer(formData, editingCustomer)
            fullCustomerName = formData.name + "\n" + formData.address
            ← Bug B: name 本身已含 \n + address，再拼一次 → 双倍地址

            └─ customerService.saveCustomer(newCustomer)
                 findIndex(c => c.name === customer.name)
                 ← Bug C: 按 name 匹配（name 已被双倍拼接，找不到原记录）
                 ← 结果：existingIndex = -1 → push 新记录（产生重复）
```

### 涉及字段说明

`Customer.name` 在 `extractCustomersFromHistory` 中被设计为
`"联系人姓名\n地址"` 的合并格式（用 `\n` 分隔），同时 `address` 字段单独存储地址。

`setFormDataForEdit` 把整个 `item.name`（含 `\n` 及之后内容）赋给 `formData.name`，
导致后续 `saveCustomer` 再次拼接时地址被重复追加。

---

## 修复方案（3 处，互相独立，按顺序修改）

---

### Fix A — `src/features/customer/hooks/useCustomerForm.ts`

**`setFormDataForEdit` 中只取 name 的第一行（标题），不含 `\n` 之后的地址。**

```ts
// 修改前（第 27–41 行）
const setFormDataForEdit = (item: Customer | Supplier | Consignee) => {
  const customerFields = item as Partial<Customer>;
  setFormData({
    name: item.name,           // ← 问题根源：含 \n + 地址
    email: item.email,
    phone: item.phone,
    address: item.address,
    company: item.company,
    companyShortName: customerFields.companyShortName ?? '',
    contact1ShortName: customerFields.contact1ShortName ?? '',
    contact2Name: customerFields.contact2Name ?? '',
    contact2ShortName: customerFields.contact2ShortName ?? '',
    contact2Phone: customerFields.contact2Phone ?? '',
    contact2Email: customerFields.contact2Email ?? '',
  });
};

// 修改后
const setFormDataForEdit = (item: Customer | Supplier | Consignee) => {
  const customerFields = item as Partial<Customer>;
  // Customer.name 可能为 "姓名\n地址" 格式，只取第一行填入表单
  const nameTitle = item.name.split('\n')[0];
  setFormData({
    name: nameTitle,           // ← 只填标题行
    email: item.email,
    phone: item.phone,
    address: item.address,
    company: item.company,
    companyShortName: customerFields.companyShortName ?? '',
    contact1ShortName: customerFields.contact1ShortName ?? '',
    contact2Name: customerFields.contact2Name ?? '',
    contact2ShortName: customerFields.contact2ShortName ?? '',
    contact2Phone: customerFields.contact2Phone ?? '',
    contact2Email: customerFields.contact2Email ?? '',
  });
};
```

---

### Fix B — `src/features/customer/hooks/useCustomerActions.ts`

**`saveCustomer` 中比较"名称是否变更"时，要对比 editingCustomer.name 的第一行（而非整个合并字符串）。**

```ts
// 修改前（第 35 行）
if (editingCustomer && editingCustomer.name !== customerData.name) {

// 修改后
// editingCustomer.name 可能是 "姓名\n地址"，而 customerData.name 经过 Fix A 只含标题
const editingNameTitle = editingCustomer.name.split('\n')[0];
if (editingCustomer && editingNameTitle !== customerData.name) {
```

完整函数片段（`saveCustomer`，第 8–58 行）修改后关键部分：

```ts
const saveCustomer = async (customerData: CustomerFormData, editingCustomer: Customer | null) => {
  try {
    // 构建完整的客户信息（name 字段 = 姓名\n地址，供历史记录引用）
    let fullCustomerName = customerData.name;
    if (customerData.address && customerData.address.trim()) {
      fullCustomerName = `${customerData.name}\n${customerData.address.trim()}`;
    }

    const newCustomer: Customer = {
      id: editingCustomer ? editingCustomer.id : `customer_${Date.now()}`,
      name: fullCustomerName,
      email: customerData.email,
      phone: customerData.phone,
      address: customerData.address,
      company: customerData.company,
      companyShortName: customerData.companyShortName,
      contact1ShortName: customerData.contact1ShortName,
      contact2Name: customerData.contact2Name,
      contact2ShortName: customerData.contact2ShortName,
      contact2Phone: customerData.contact2Phone,
      contact2Email: customerData.contact2Email,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Fix B: 比较时只取 editingCustomer.name 第一行
    if (editingCustomer) {
      const editingNameTitle = editingCustomer.name.split('\n')[0];
      if (editingNameTitle !== customerData.name) {
        const usageCount = customerService.checkCustomerUsage(editingCustomer.name);
        if (usageCount > 0) {
          const confirmSave = confirm(
            `注意：客户名称从 "${editingNameTitle}" 更改为 "${customerData.name}"\n\n` +
            `该客户在 ${usageCount} 个历史记录中被引用。\n` +
            `历史记录中的客户名称将保持不变，只有新创建的记录会使用新的客户信息。\n\n` +
            `是否继续保存？`
          );
          if (!confirmSave) return false;
        }
      }
    }

    customerService.saveCustomer(newCustomer);
    return true;
  } catch (error) {
    console.error('保存客户失败:', error);
    alert('保存失败，请重试');
    return false;
  }
};
```

---

### Fix C — `src/features/customer/services/customerService.ts`

**`saveCustomer` 中用 `id` 匹配，而不是用 `name` 匹配。**（name 可能被用户修改，id 永远不变）

```ts
// 修改前（第 118 行）
const existingIndex = existingCustomers.findIndex((c: Customer) => c.name === customer.name);

// 修改后
const existingIndex = existingCustomers.findIndex((c: Customer) => c.id === customer.id);
```

仅改这一行即可，其余逻辑不变。

---

## 验证步骤

1. 打开客户列表，点击任意客户的「编辑」
2. 确认「名称」字段显示纯姓名（无 `\n` 或地址残留）
3. 修改电话或邮箱，点击「更新」
4. 弹窗关闭后，卡片数据已更新，且客户总数 **不增加**
5. 刷新页面后，数据仍保持更新状态（无重复记录）

---

## 影响范围

| 文件 | 改动行数 | 风险 |
|------|---------|------|
| `useCustomerForm.ts` | ~1 行（`name: nameTitle`） | 低 |
| `useCustomerActions.ts` | ~3 行（Fix B 比较逻辑） | 低 |
| `customerService.ts` | 1 行（`findIndex` 条件） | 低 |

三处修改均不影响新增客户流程（新增时 `editingCustomer` 为 null，Fix B 分支不执行；Fix C 按 id 匹配找不到时仍走 push 新增逻辑）。
