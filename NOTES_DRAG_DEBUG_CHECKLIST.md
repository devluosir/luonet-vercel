# Notes拖拽调试排查清单

## 🚨 当前问题
拖拽排序功能可能不工作，需要按以下步骤排查：

## 1️⃣ 事件是否触发？

### 检查点：
- [ ] `onDragEnd` 是否被调用？
- [ ] `event.active.id` 和 `event.over?.id` 是否都有值？
- [ ] 控件外层是否包了 `DndContext` / `SortableContext`？

### 调试代码：
```typescript
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  console.log('[dragEnd]', { 
    active: active?.id, 
    over: over?.id,
    visibleNotes: visibleNotes.map(n => n.id)
  });
};
```

### 可能的问题：
- `over` 是 `undefined` → 通常是容器没有 `Droppable`、元素被 `overflow: hidden` 裁掉、或拖动层级/遮罩挡住命中

---

## 2️⃣ 状态是否更新？

### 检查点：
- [ ] **Zustand** 更新是否返回了**新数组引用**？
- [ ] 你的**排序"真相源"**是什么？

### 推荐方案：
选择"**数组顺序就是顺序**"这一种真相源，简单、稳。

### 调试代码：
```typescript
updateNoteOrder: (fromIndex, toIndex) => set((state) => {
  console.log('[updateNoteOrder]', { fromIndex, toIndex, currentConfig: state.notesConfig.map(n => ({ id: n.id, order: n.order })) });
  const newConfig = [...state.notesConfig];
  const [movedItem] = newConfig.splice(fromIndex, 1);
  newConfig.splice(toIndex, 0, movedItem);
  console.log('[updateNoteOrder] result', { newConfig: newConfig.map(n => ({ id: n.id, order: n.order })) });
  return { notesConfig: newConfig };
}),
```

---

## 3️⃣ 渲染是否按新顺序？

### 检查点：
- [ ] 渲染时是否按 **数组顺序** map（或按 `order` 排序后再 map）？
- [ ] 子项的 `key` 是否用 **稳定的 id**，而不是 `index`？
- [ ] 拖拽子项是否用到了 `useSortable` 的 `attributes, listeners, setNodeRef, transform, transition`？

### 关键修复：
```typescript
// ✅ 整个卡片应该是可拖拽的
<div
  ref={setNodeRef}
  style={style}
  {...attributes}
  {...listeners}
  className="cursor-grab active:cursor-grabbing"
>
  {/* 内容 */}
</div>
```

---

## 🔧 当前修复内容

### 1. 拖拽区域修复
- ✅ 将 `{...attributes} {...listeners}` 移到整个卡片上
- ✅ 添加 `cursor-grab active:cursor-grabbing` 样式
- ✅ 添加 `e.stopPropagation()` 防止按钮点击触发拖拽

### 2. 调试日志添加
- ✅ `handleDragEnd` 中添加详细日志
- ✅ `updateNoteOrder` 中添加状态变化日志

### 3. 测试组件创建
- ✅ 创建 `NotesSectionTest.tsx` 简化版本
- ✅ 临时替换主组件进行测试

---

## 🧪 测试步骤

### 1. 打开浏览器控制台
访问 `http://localhost:3000/quotation` 并打开开发者工具

### 2. 尝试拖拽操作
- 拖拽任意Note卡片
- 观察控制台日志输出

### 3. 检查日志输出
应该看到类似：
```
[dragEnd] { active: "payment_terms", over: "delivery_terms", visibleNotes: [...] }
[dragEnd] indices { oldIndex: 0, newIndex: 1 }
[dragEnd] config indices { fromConfigIndex: 0, toConfigIndex: 1 }
[updateNoteOrder] { fromIndex: 0, toIndex: 1, currentConfig: [...] }
[updateNoteOrder] result { newConfig: [...] }
```

### 4. 验证状态更新
- 检查页面上的Note顺序是否改变
- 检查控制台中的配置数据是否更新

---

## 🚨 常见问题排查

### 问题1：拖拽无反应
**可能原因**：
- 没有 `DndContext` 包裹
- `SortableContext` 的 `items` 数组为空
- 元素被 `overflow: hidden` 遮挡

**解决方案**：
```typescript
// 确保有这些包裹
<DndContext sensors={sensors} onDragEnd={handleDragEnd}>
  <SortableContext items={visibleNotes.map(n => n.id)}>
    {/* 内容 */}
  </SortableContext>
</DndContext>
```

### 问题2：拖拽后顺序不变
**可能原因**：
- 状态更新没有返回新引用
- 渲染时使用了错误的排序依据
- `key` 使用了 `index` 而不是 `id`

**解决方案**：
```typescript
// 确保返回新数组引用
updateNoteOrder: (fromIndex, toIndex) => set((state) => {
  const newConfig = [...state.notesConfig]; // 新引用
  const [movedItem] = newConfig.splice(fromIndex, 1);
  newConfig.splice(toIndex, 0, movedItem);
  return { notesConfig: newConfig };
}),
```

### 问题3：拖拽时出现错误
**可能原因**：
- `useSortable` 没有正确使用
- 缺少必要的属性传递

**解决方案**：
```typescript
const {
  attributes, listeners, setNodeRef, transform, transition
} = useSortable({ id: note.id });

return (
  <div
    ref={setNodeRef}
    style={{ transform: CSS.Transform.toString(transform), transition }}
    {...attributes}
    {...listeners}
  >
    {/* 内容 */}
  </div>
);
```

---

## 📋 修复检查清单

- [ ] 拖拽事件触发（控制台有日志）
- [ ] 状态正确更新（返回新引用）
- [ ] 渲染按新顺序显示
- [ ] 拖拽手柄正确应用
- [ ] 按钮点击不触发拖拽
- [ ] 移动端支持正常
- [ ] 键盘导航支持正常

---

## 🎯 下一步

1. **测试简化版本**：使用 `NotesSectionTest` 验证基础功能
2. **修复主版本**：将修复应用到 `NotesSection`
3. **移除测试代码**：清理调试日志和测试组件
4. **完整测试**：测试所有功能和边界情况

---

**最后更新**：2024年12月
**状态**：调试中
**下一步**：验证拖拽事件是否触发
