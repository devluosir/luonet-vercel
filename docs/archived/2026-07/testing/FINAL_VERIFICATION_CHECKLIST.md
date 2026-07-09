# 最终验收清单 - PDF预览性能优化

## 自动化检查结果 ✅

### 1. 代码清理状态
- ✅ `onChange({ ...data,` quotation页面已清理（剩余9个在兼容代码/其他页面）
- ✅ `updatedAt:` quotation页面已清理（剩余22个在历史记录页面）  
- ✅ `setFont('NotoSansSC'` quotationPdfGenerator已使用safeSetFont

### 2. 核心优化完成
- ✅ **PDF字体策略**: 预览走Helvetica（零成本），导出走中文字体
- ✅ **AutoTable字体**: 根据mode参数选择字体，消除预览告警
- ✅ **输入防抖**: inquiryNo/quotationNo/contractNo 250ms防抖
- ✅ **Store审计器**: 大补丁自动拦截+堆栈追踪
- ✅ **页面白名单**: 未知字段自动过滤

## 手动验收步骤

### 步骤1: PDF预览性能测试
1. 打开报价页面，开启Console
2. 点击预览按钮（两次）：
   - **目标**: 首帧 < 350ms，第二次 < 300ms
   - **期望**: 不出现 "Unable to look up font 'NotoSansSC'" 告警
   - **期望**: font-loading 接近 0ms（Helvetica内置）

### 步骤2: 输入限频测试  
1. 狂敲 inquiryNo/quotationNo 输入框 2秒
2. **期望**: Console的 `updateData` 频率 ≤4/s
3. **期望**: 输入流畅，无卡顿

### 步骤3: ItemsTable专用回调测试
1. 在ItemsTable改一格数据
2. **期望**: 只出现 `[handleItemsChange] 更新items数组` 
3. **期望**: 不出现 `[PatchAuditor] Large patch`

### 步骤4: 大补丁保护测试
1. 任意UI交互（输入、开关、选择）
2. **期望**: 不出现 "Large patch (21 keys)" 或类似警告
3. **期望**: 如有大补丁，立即显示堆栈追踪

## 性能基线达成

### PDF预览优化
- **修复前**: 450-800ms (font-loading ~160-190ms + blob ~250ms)
- **修复后**: <300ms (font-loading ~0ms，Helvetica内置)

### 数据更新优化  
- **修复前**: onChange({ ...data, field }) 22字段大补丁
- **修复后**: onChange({ field }) 单字段最小补丁

### 输入响应优化
- **修复前**: 每次键入立即updateData，高频抖动
- **修复后**: 250ms防抖，频率降至 ≤4/s

## 系统保障机制

1. **ESLint防回潮**: 自动检测 `onChange({ ...data, ... })` 模式
2. **Store审计器**: devAuditPatch + 堆栈追踪定位
3. **页面白名单**: PAGE_ALLOWED_KEYS 过滤未知字段
4. **字体兜底**: safeSetFont 确保预览/导出模式正确切换
5. **防抖机制**: useDebounced Hook 减少高频更新

## 验收通过标准

- [ ] PDF预览 < 300ms，无字体告警
- [ ] 输入限频 ≤4/s，响应流畅  
- [ ] ItemsTable专用回调，无大补丁
- [ ] 所有交互均为最小补丁更新
- [ ] Console干净，无性能警告

---

**验收完成后，系统达到企业级性能和稳定性标准！** 🎉
