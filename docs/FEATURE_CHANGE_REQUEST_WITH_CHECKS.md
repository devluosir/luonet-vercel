# 功能 / 模块 / 页面调整需求模板（含自动测试清单）

> 使用方法：复制本模板，按段落填写。填完后可用 `node generate-test-checklist.js your-filled-file.md > TEST_CHECKLIST.md` 自动生成测试清单。

## 1. 背景与目标
- **背景**：
- **目标**：

---

## 2. 调整范围
- **涉及模块**（可多选）：
  - [ ] app（入口）
  - [ ] features/quotation/app/QuotationPage.tsx（装配层）
  - [ ] features/quotation/state/useQuotationStore.ts（状态管理）
  - [ ] features/quotation/services/*（业务服务）
  - [ ] features/quotation/components/*（展示组件）
  - [ ] features/quotation/hooks/*（副作用与组合逻辑）
  - [ ] PDF 相关（生成/下载/文件名）
  - [ ] Import/Export 相关（剪贴板/Excel/本地存储）
  - [ ] 其他：

- **关联功能标签（供自动生成测试用）**：在需要的标签前打勾
  - [ ] tab-switching
  - [ ] autosave
  - [ ] pdf-generate
  - [ ] pdf-filename
  - [ ] preview-flow
  - [ ] data-import
  - [ ] data-export
  - [ ] init-once
  - [ ] currency
  - [ ] items-table
  - [ ] other-fees
  - [ ] customer-info
  - [ ] notes/bank/payment-terms
  - [ ] error-handling
  - [ ] permissions
  - [ ] performance

---

## 3. 变更内容描述
### 3.1 新增
-

### 3.2 修改
-

### 3.3 删除
-

---

## 4. 数据与状态影响
- **新增状态字段**（名称 / 类型 / 默认值 / 受哪些流程影响）：
- **现有状态变化**（字段名 / 更新入口 / 影响面）：
- **初始化逻辑**（是否变更 `useInitQuotation`，如何变更）：
- **保存/加载逻辑**（是否变更 `quotation.service.ts`，如何变更）：

---

## 5. 依赖与联动
- **依赖的服务层**：
- **影响的UI组件**：
- **触发的副作用**（useEffect / useAutoSave / 监听器等）：

---

## 6. 风险与验证点（勾选 = 需要在测试清单中生成用例）
- **潜在风险**：
  - [ ] 性能回归（重渲染增加 / 初始化变慢）
  - [ ] 无限循环（选择器 / 副作用依赖）
  - [ ] 状态丢失（初始化 / 保存 / 切换 Tab）
  - [ ] PDF错误（金额、币种、文件名、印章等）
  - [ ] 导入导出异常（格式 / 兼容性 / 边界值）
  - [ ] UI 兼容（移动端 / 中屏 / 大屏）
  - [ ] 权限/会话（登录后权限同步 / 刷新权限）
  - [ ] 其他：

---

## 7. 测试要求（可增删）
- **基础功能测试**：
- **边界情况测试**：
- **性能压力测试**：
- **兼容性测试**：

> 参考：QUOTATION_MODULARIZATION_TEST_CHECKLIST.md

---

## 8. 文档与交付
- 是否需要更新：
  - [ ] 开发文档
  - [ ] API 文档
  - [ ] 测试文档
  - [ ] 使用手册

---

## 9. 验收口径（强烈建议明确）
- **功能口径**（什么算通过 / 什么算失败）：
- **性能口径**（阈值或定性描述）：
- **回归口径**（不可破坏的既有能力清单）：
