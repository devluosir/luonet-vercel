# 客户管理页面重新设计 — Codex 实现指令

> **目标文件**
> - `src/features/customer/app/CustomerPage.tsx`
> - `src/features/customer/components/CustomerList.tsx`
> - `src/features/customer/components/CustomerTabs.tsx`
> - `src/features/customer/components/FilterChipBar.tsx` ← **新建**

---

## 一、设计问题诊断（现状）

| 问题 | 位置 | 影响 |
|------|------|------|
| 操作按钮 hover 才出现 | CustomerList 卡片 | 移动端/触屏无法触发 |
| 无过滤/排序入口 | CustomerList 顶部 | 59 条数据无法快速筛选 |
| 统计卡片无趋势指标 | CustomerPage stats | 无法判断增减方向 |
| 标签页样式与卡片分离 | CustomerTabs / CustomerPage | 视觉层次割裂 |
| 搜索框位于顶部导航栏 | CustomerPage header | 与列表区域距离太远 |
| 客户卡片无头像/色彩区分 | CustomerList | 扫描成本高 |

---

## 二、目标布局（ASCII 线框图）

```
┌─────────────────────────────────────────────────────────────────────┐
│ NAVBAR  首页 > 客户管理              [🔍搜索] [↻] [+ 添加]          │
├─────────────────────────────────────────────────────────────────────┤
│ STATS ROW                                                           │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌───────────┐  │
│  │ 总客户数      │ │ 供应商        │ │ 收货人        │ │ 本月新增   │ │
│  │  59  ↑12%   │ │  10          │ │   7          │ │  59  ↑∞%  │ │
│  └──────────────┘ └──────────────┘ └──────────────┘ └───────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│ CONTENT CARD                                                        │
│  ┌─ TABS ──────────────────────────────────────────────────────┐   │
│  │ [● 客户管理]  [ 供应商管理]  [ 收货人管理]  [ 新客户跟进]    │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─ FILTER CHIP BAR ───────────────────────────────────────────┐   │
│  │ [全部 59]  [高活跃]  [需跟进 ●]  [本月新增]  │ 排序▼  ■≡   │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─ GRID VIEW (4-col xl / 3-col lg / 2-col md / 1-col sm) ────┐   │
│  │                                                              │   │
│  │  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │   │
│  │  │ ● [S] Sumanta  │  │ ● [S] SUMANTA  │  │ ● [P]Prateek │  │   │
│  │  │ ╠══ 高活跃 ════│  │ ╠══ 高活跃 ════│  │ ╠══ 中活跃 ══│  │   │
│  │  │ 📞 +91 ...     │  │ 📞 +91 ...     │  │ 📍 238B ...  │  │   │
│  │  │ ✉ info@...     │  │ ✉ info@...     │  │              │  │   │
│  │  │ ─────────────  │  │ ─────────────  │  │ ──────────── │  │   │
│  │  │ 📋 65  ⏰ 1    │  │ 📋 9   ⏰ 1    │  │ 📋 6   ⏰ 1  │  │   │
│  │  │ 创建 6月19日   │  │ 创建 6月18日   │  │ 创建 6月18日 │  │   │
│  │  │ [查看] [编辑] [删除]│  │ [查看] [编辑] [删除]│  │ [查看][✏][🗑]│  │   │
│  │  └────────────────┘  └────────────────┘  └──────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

**LIST VIEW（≡ 切换后）**

```
┌──────────────────────────────────────────────────────────────────────┐
│  客户名称           联系方式          活跃度    最近互动   操作        │
│ ─────────────────────────────────────────────────────────────────── │
│ [S] Sumanta Paul   📞+91 3340170000  🟢高活跃  6月19日  [查看][✏][🗑]│
│ [S] SUMANTA PAUL   📞+91 3340170000  🟢高活跃  6月18日  [查看][✏][🗑]│
│ [P] Prateek        📍238B AJC Bose…  🟡中活跃  6月18日  [查看][✏][🗑]│
│ [S] Samar Rustagi  —                 ⚫低活跃  6月18日  [查看][✏][🗑]│
└──────────────────────────────────────────────────────────────────────┘
```

---

## 三、用户交互泳道图

```
┌─────────────┬──────────────────────┬──────────────┬────────────────┐
│    用户       │    CustomerPage       │ CustomerList  │   API/Service  │
├─────────────┼──────────────────────┼──────────────┼────────────────┤
│             │                      │              │                │
│  访问页面   │                      │              │                │
│ ──────────→ │                      │              │                │
│             │  useCustomerData()   │              │                │
│             │ ───────────────────────────────────→│                │
│             │                      │              │ GET /customers  │
│             │                      │              │ GET /suppliers  │
│             │                      │              │ GET /consignees │
│             │ ←───────────────────────────────────│                │
│             │  setStats()          │              │                │
│ ←────────── │  render()            │              │                │
│  看到页面   │                      │              │                │
│             │                      │              │                │
├─────────────┼──────────────────────┼──────────────┼────────────────┤
│             │                      │              │                │
│  点击过滤   │                      │              │                │
│  [高活跃]  │                      │              │                │
│ ──────────→ │  setFilter('high')   │              │                │
│             │ ────────────────────→│              │                │
│             │                      │ filter()      │                │
│             │                      │ (本地计算)    │                │
│ ←────────── │ ←────────────────────│              │                │
│  卡片更新   │                      │              │                │
│             │                      │              │                │
├─────────────┼──────────────────────┼──────────────┼────────────────┤
│             │                      │              │                │
│  切换视图   │                      │              │                │
│  ■ → ≡     │                      │              │                │
│ ──────────→ │  setViewMode('list') │              │                │
│             │ ────────────────────→│              │                │
│             │                      │ 渲染 Table   │                │
│ ←────────── │ ←────────────────────│              │                │
│  列表视图   │                      │              │                │
│             │                      │              │                │
├─────────────┼──────────────────────┼──────────────┼────────────────┤
│             │                      │              │                │
│  点卡片名称  │                      │              │                │
│ ──────────→ │  handleViewDetail()  │              │                │
│             │  router.push(        │              │                │
│             │   /customer/detail)  │              │                │
│ ←────────── │                      │              │                │
│  跳转详情页 │                      │              │                │
│             │                      │              │                │
├─────────────┼──────────────────────┼──────────────┼────────────────┤
│             │                      │              │                │
│  点击 +添加 │                      │              │                │
│ ──────────→ │  handleAddNew()      │              │                │
│             │  setShowModal(true)  │              │                │
│ ←────────── │  <CustomerModal />   │              │                │
│  弹出表单   │                      │              │                │
│             │                      │              │                │
│  提交表单   │                      │              │                │
│ ──────────→ │  handleSubmit()      │              │                │
│             │  validateForm()      │              │                │
│             │ ───────────────────────────────────→│                │
│             │                      │              │ POST /customers │
│             │ ←───────────────────────────────────│                │
│             │  refreshData()       │              │                │
│ ←────────── │  setShowModal(false) │              │                │
│  卡片新增   │                      │              │                │
└─────────────┴──────────────────────┴──────────────┴────────────────┘
```

---

## 四、组件变更清单

### 4.1 `CustomerPage.tsx` — 主页面

**变更点：**

1. 新增 `viewMode` state：`'grid' | 'list'`，默认 `'grid'`
2. 新增 `activeFilter` state：`'all' | 'high' | 'needs_followup' | 'this_month'`，默认 `'all'`
3. 统计卡片加 `growthRate`（已有）和趋势箭头图标（新增）
4. 将 `searchQuery` 的 `<input>` 从顶部 navbar 移到 FilterChipBar（或保留 navbar 版本并在 FilterChipBar 复用同一 state）
5. 向 `<CustomerList>` 传递 `viewMode` 和 `activeFilter` props

**Props 传递示意：**

```tsx
<CustomerList
  customers={customers}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onViewDetail={handleViewDetail}
  searchQuery={searchQuery}
  viewMode={viewMode}          // 新增
  activeFilter={activeFilter}  // 新增
/>
```

**统计卡片趋势箭头（在现有卡片 JSX 内追加）：**

```tsx
// 在 p.text-2xl 之后加一行
<p className="text-xs text-green-600 flex items-center gap-1 mt-1">
  <TrendingUp className="w-3 h-3" />
  <span>+{stats.growthRate}% 较上月</span>
</p>
```

---

### 4.2 `FilterChipBar.tsx` — **新建组件**

```
路径: src/features/customer/components/FilterChipBar.tsx
```

```tsx
// 伪代码结构
interface FilterChipBarProps {
  total: number;
  activeFilter: FilterType;
  onFilterChange: (f: FilterType) => void;
  sortBy: SortType;
  onSortChange: (s: SortType) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
  highCount: number;
  needsFollowUpCount: number;
  thisMonthCount: number;
}

// 渲染结构
// <div flex justify-between>
//   <div flex gap-2>
//     <Chip label="全部 {total}" active={activeFilter==='all'} />
//     <Chip label="高活跃 {highCount}" active={...} dot="green" />
//     <Chip label="需跟进 {needsFollowUpCount}" active={...} dot="red" />
//     <Chip label="本月新增 {thisMonthCount}" active={...} />
//   </div>
//   <div flex gap-2>
//     <SortDropdown value={sortBy} onChange={onSortChange} />
//     <ViewToggle value={viewMode} onChange={onViewModeChange} />
//   </div>
// </div>
```

**在 `CustomerPage.tsx` 中调用位置（CustomerTabs 之后，数据列表之前）：**

```tsx
<CustomerTabs activeTab={activeTab} onTabChange={handleTabChange} />
<FilterChipBar
  total={filteredByTab.length}
  activeFilter={activeFilter}
  onFilterChange={setActiveFilter}
  sortBy={sortBy}
  onSortChange={setSortBy}
  viewMode={viewMode}
  onViewModeChange={setViewMode}
  highCount={highCount}
  needsFollowUpCount={needsFollowUpCount}
  thisMonthCount={thisMonthCount}
/>
```

---

### 4.3 `CustomerList.tsx` — 卡片 + 列表双视图

#### A. 卡片设计改动

**① 头像圆圈（取名字首字母）**

```tsx
// 在 h3 标题左侧加头像
const avatarColors = ['bg-blue-500','bg-green-500','bg-purple-500','bg-orange-500','bg-pink-500'];
const colorIndex = title.charCodeAt(0) % avatarColors.length;

<div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${avatarColors[colorIndex]}`}>
  {title.charAt(0).toUpperCase()}
</div>
```

**② 活跃度色条（左侧 border）**

```tsx
// 将卡片 div 的 className 改为：
const borderColor = {
  high: 'border-l-4 border-l-green-500',
  medium: 'border-l-4 border-l-yellow-400',
  low: 'border-l-4 border-l-gray-300',
}[activity.level];

<div className={`bg-white rounded-lg border border-gray-200 hover:shadow-md transition-all ${borderColor} ...`}>
```

**③ 操作按钮始终显示（移除 `opacity-0 group-hover:opacity-100`）**

```tsx
// 将操作按钮区域改为卡片底部固定区：
<div className="flex items-center justify-end gap-1 mt-3 pt-3 border-t border-gray-100">
  <button onClick={() => onViewDetail?.(customer)}
    className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">
    <Eye className="w-3 h-3" /> 查看
  </button>
  <button onClick={() => onEdit(customer)}
    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded">
    <Edit className="w-3 h-3" /> 编辑
  </button>
  <button onClick={() => onDelete(customer)}
    className="flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded">
    <Trash2 className="w-3 h-3" /> 删除
  </button>
</div>
```

#### B. 列表视图（`viewMode === 'list'` 时渲染）

```tsx
// 渲染 <table> 替代网格
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-gray-200 text-left text-xs text-gray-500 uppercase">
      <th className="pb-3 pr-4">客户名称</th>
      <th className="pb-3 pr-4">联系方式</th>
      <th className="pb-3 pr-4">活跃度</th>
      <th className="pb-3 pr-4">创建时间</th>
      <th className="pb-3">操作</th>
    </tr>
  </thead>
  <tbody>
    {filteredCustomers.map((customer) => (
      <tr key={customer.id} className="border-b border-gray-100 hover:bg-gray-50">
        <td className="py-3 pr-4">
          <div className="flex items-center gap-2">
            <Avatar name={title} />
            <span className="font-medium text-gray-900 cursor-pointer hover:text-blue-600"
              onClick={() => onViewDetail?.(customer)}>
              {title}
            </span>
          </div>
        </td>
        <td className="py-3 pr-4 text-gray-600">
          {contactInfo.phone || contactInfo.email || '—'}
        </td>
        <td className="py-3 pr-4">
          <span className={`px-2 py-1 text-xs rounded-full ${activity.color}`}>
            {activity.label}
          </span>
        </td>
        <td className="py-3 pr-4 text-gray-500">{formatDate(customer.createdAt)}</td>
        <td className="py-3">
          <div className="flex gap-1">
            <ActionButton icon={Eye} label="查看" onClick={() => onViewDetail?.(customer)} color="blue" />
            <ActionButton icon={Edit} label="编辑" onClick={() => onEdit(customer)} color="gray" />
            <ActionButton icon={Trash2} label="删除" onClick={() => onDelete(customer)} color="red" />
          </div>
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

#### C. 过滤逻辑（在现有 `filteredCustomers` 之后再过一层）

```tsx
// 在 const filteredCustomers = customers.filter(...) 后追加：
const displayCustomers = filteredCustomers.filter((customer) => {
  if (activeFilter === 'all') return true;
  const activity = getCustomerActivity(customer);
  if (activeFilter === 'high') return activity.level === 'high';
  if (activeFilter === 'needs_followup') return needsFollowUp(customer);
  if (activeFilter === 'this_month') {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const createdAt = customer.createdAt ? new Date(customer.createdAt) : null;
    return createdAt && createdAt >= lastMonth;
  }
  return true;
});
// 渲染时用 displayCustomers 替代 filteredCustomers
```

#### D. 排序逻辑

```tsx
const sortedCustomers = [...displayCustomers].sort((a, b) => {
  if (sortBy === 'name') return getCustomerInfo(a).title.localeCompare(getCustomerInfo(b).title);
  if (sortBy === 'activity') {
    const order = { high: 0, medium: 1, low: 2 };
    return order[getCustomerActivity(a).level] - order[getCustomerActivity(b).level];
  }
  if (sortBy === 'date_desc') {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  }
  return 0; // default: date_desc
});
```

---

### 4.4 `CustomerTabs.tsx` — 样式微调

将 tab 容器从灰色背景改为与卡片融合：

```tsx
// 原: className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50"
// 改: className="px-6 pt-4 pb-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
```

将各 tab 按钮改为底部下划线风格（underline tabs）：

```tsx
<button className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
  isActive
    ? 'border-blue-600 text-blue-600'
    : 'border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-300'
}`}>
```

---

## 五、新增 State 汇总（CustomerPage.tsx）

```tsx
// 现有
const [activeTab, setActiveTab] = useState<TabType | 'new_customers'>('customers');
const [showModal, setShowModal] = useState(false);
const [searchQuery, setSearchQuery] = useState('');

// 新增
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
const [activeFilter, setActiveFilter] = useState<'all' | 'high' | 'needs_followup' | 'this_month'>('all');
const [sortBy, setSortBy] = useState<'date_desc' | 'name' | 'activity'>('date_desc');
```

---

## 六、实现顺序

```
Step 1  新建 FilterChipBar.tsx（纯展示组件，无副作用）
Step 2  CustomerPage.tsx 增加 viewMode / activeFilter / sortBy state
        并向 CustomerList 和 FilterChipBar 传递 props
Step 3  CustomerList.tsx 实现：
        a) 过滤逻辑（activeFilter）
        b) 排序逻辑（sortBy）
        c) 网格卡片改版（头像 + 色条 + 固定操作栏）
        d) 列表视图 <table>（viewMode === 'list'）
Step 4  CustomerTabs.tsx 样式改为 underline tabs
Step 5  手动测试 4 个过滤 × 2 个视图 × 排序 = 功能覆盖
```

---

## 七、不变的约定

- 所有现有 prop 接口保持向后兼容（不删除已有 props）
- 不修改 hooks（`useCustomerData`、`useCustomerActions` 等）
- 活跃度计算逻辑不变（`getCustomerActivity` 阈值 10/5）
- Dark mode 支持：新增 className 均需同步加 `dark:` 变体
- 动画：卡片 `transition-all duration-200` 保持一致
