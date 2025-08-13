# MLUONET - 企业管理系统

[![版本](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/mluonet/mluonet)
[![许可证](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![构建状态](https://github.com/mluonet/mluonet/workflows/CI/badge.svg)](https://github.com/mluonet/mluonet/actions)

## 🚀 包含企业级预水合清理工具

本项目现在包含了一个**生产就绪的预水合清理工具**，专门解决Next.js应用中浏览器扩展导致的hydration警告问题。

### 📦 独立包发布

预水合清理工具已作为独立包发布：

```bash
npm install @mluonet/pre-hydration-cleanup
```

- 📚 **完整文档**: [packages/pre-hydration-cleanup/README.md](packages/pre-hydration-cleanup/README.md)
- 🔧 **使用示例**: [docs/USAGE_EXAMPLES.md](docs/USAGE_EXAMPLES.md)
- 🛡️ **CSP安全指南**: [docs/CSP_SECURITY_GUIDE.md](docs/CSP_SECURITY_GUIDE.md)
- 🚨 **故障排除**: [docs/TROUBLESHOOTING_GUIDE.md](docs/TROUBLESHOOTING_GUIDE.md)

## 项目概述

MLUONET是一个现代化的企业管理系统，提供完整的业务管理解决方案，包括报价、采购、发票、装箱单等核心功能。

## 主要功能

### 🎨 主题管理系统
- **多主题支持**: 支持 `colorful` 和 `classic` 两种按钮主题
- **深色模式**: 完整的深色模式支持，自动适配系统偏好
- **CSS变量系统**: 使用CSS变量统一管理颜色和样式
- **动态主题切换**: 实时主题切换，无需刷新页面
- **主题持久化**: 主题设置自动保存到localStorage
- **响应式设计**: 完美适配移动端和桌面端
- **主题组件**: 提供多种主题切换组件（按钮、下拉菜单、紧凑模式）
- **CSS级联优化**: 解决硬编码类与动态主题管理的冲突问题
- **调试工具**: 提供完整的主题调试和测试工具

### 核心业务模块
- **报价管理**: 创建和管理客户报价单
  - **Notes自定义排序**: 支持拖拽排序和显示控制
  - **默认排序**: Delivery time → Price based on → Delivery terms → Payment term → Validity
  - **完整Notes类型**: 包含9种Notes类型，支持质量条款、保修条款等
  - **序号开关合并**: 序号圆圈同时作为开关，点击切换显示/隐藏状态
  - **卡片式布局**: 单行展示，Label — 内容格式，视觉更整齐
  - **展开态强化**: 展开时背景色变化，箭头旋转，视觉层次清晰
  - **收缩态标签**: 显示选中选项的标签提示，无需展开即可预览
  - **分组选项**: 常用选项和其他选项分组展示，减少滚动压力
  - **搜索功能**: 支持选项搜索，快速定位所需内容
  - **拖拽编辑分离**: 拖拽句柄与编辑区域完全分离，避免冲突
  - **内联编辑**: 点击文本进入编辑模式，Enter保存Esc取消，支持所有Notes类型
  - **编辑状态提示**: 编辑时卡片高亮显示，拖拽句柄自动隐藏
  - **错误处理**: 自动保存失败时自动清理存储空间，PDF生成时处理未定义数据
  - **数据净化**: 统一的数据净化函数，确保PDF生成时数据格式正确
  - **存储优化**: 精简数据存储，避免localStorage配额超限
  - **进度提示**: PDF预览和生成时显示独立的进度条和加载状态
  - **性能优化**: 避免重复数据净化，减少不必要的处理开销
  - **批量操作**: 全选/全不选/仅常用/恢复默认顺序
  - **双语模板**: EXW工厂交货/FOB离岸价/CIF到岸价等一键套用
  - **内联选择器**: Payment Terms和Delivery Terms支持下拉选择
  - **空值防御**: 可见但内容为空的条款会显示提醒
  - **配置面板**: 可选择显示/隐藏特定Notes类型
  - **Excel导出功能**: 支持报价单和销售确认的Excel导出，包含完整的商品信息、费用明细和合同条款
- **采购管理**: 处理供应商采购订单
- **发票管理**: 生成和管理发票
- **装箱单管理**: 创建详细的装箱清单
- **邮件系统**: 集成邮件发送功能

### Dashboard 智能管理
- **模块化设计**: 清晰的模块按钮和权限控制
- **实时文档管理**: 支持时间筛选、类型筛选和搜索功能
- **智能预加载**: 悬停预加载和权限动态预加载
- **多源权限容错**: 支持 Store、Session、本地缓存三重权限源
- **搜索高亮**: 支持文档编号、客户名称等关键词搜索和高亮显示
- **响应式布局**: 完美适配移动端和桌面端

### 404页面娱乐功能
- **五子棋游戏**: 经典的五子棋对战游戏
- **2048游戏**: 数字合并游戏，支持AI推演功能

## Dashboard 页面优化

### 架构重构
- **模块化拆分**: 将大型组件拆分为独立的功能模块
  - `ModuleButton`: 模块按钮组件，支持徽章显示和快捷键
  - `RecentDocumentsList`: 最近文档列表，支持搜索和筛选
  - `dashboardModules.ts`: 模块配置常量
  - `documentCounts.ts`: 统一文档计数工具
  - `mapPermissions.ts`: 权限映射工具，使用 Map 加速判断

### 性能优化
- **统一缓存读取**: 合并所有文档类型的计数逻辑，避免重复解析
- **权限判断优化**: 使用 Map 数据结构加速权限判断
- **安全本地存储**: 封装 `getSafeLocalStorage` 工具，避免 SSR 错误
- **智能预加载**: 根据权限动态预加载组件，减少不必要的资源加载

### 用户体验提升
- **搜索功能**: 支持文档编号、客户名称、供应商名称搜索
- **关键词高亮**: 搜索结果中的匹配词自动高亮显示
- **空状态优化**: 根据搜索条件和筛选器显示相应的空状态提示
- **响应式筛选器**: 支持展开/收起筛选器，节省屏幕空间

### 代码质量改进
- **类型安全**: 完整的 TypeScript 类型定义
- **错误处理**: 完善的错误边界和异常处理
- **代码复用**: 提取公共逻辑到工具函数
- **可维护性**: 清晰的代码结构和注释

## 稳定性防回归机制

### 🛡️ 完整防护体系

项目建立了完整的"稳定引用 + 原子订阅"防回归机制，确保代码质量和性能稳定性：

#### 1. 循环哨兵监控
- **文件**: `src/debug/useRenderLoopGuard.ts`
- **功能**: 开发环境监控组件渲染次数
- **使用**: 在容器组件中调用 `useRenderLoopGuard('ComponentName', 80)`

#### 2. 稳定性测试
- **文件**: `src/features/purchase/state/__tests__/purchase.selectors.stability.test.ts`
- **覆盖**: 所有关键派生Hook的引用稳定性测试
- **验证**: 两次渲染引用相等，依赖变化时引用更新

#### 3. ESLint规则守护
- **文件**: `.eslintrc.json`
- **规则**: 
  - `no-new-object`: 禁止在selector中创建新对象
  - `no-array-constructor`: 禁止在selector中创建新数组
  - `@typescript-eslint/no-object-literal-type-assertion`: 禁止对象字面量断言

#### 4. 发版前自检脚本
- **文件**: `scripts/pre-release-check.js`
- **检查项**:
  - Selector中的时间戳生成
  - useEffect依赖中的现拼对象
  - 对象返回selector的shallow使用
  - useEffect依赖中的匿名函数
  - Selector中的Math.random
  - 稳定性测试通过

#### 5. 防回归指南
- **文件**: `docs/STABILITY_GUARDRAILS.md`
- **内容**: 6个复发点检查清单、最佳实践、故障排除

### 🔧 使用方式

#### 开发时
```bash
# 运行稳定性测试
npm test -- --testPathPattern=purchase.selectors.stability.test.ts

# 运行ESLint检查
npm run lint

# 在组件中使用循环哨兵
import { useRenderLoopGuard } from '@/debug/useRenderLoopGuard';
useRenderLoopGuard('ComponentName');
```

#### 发版前
```bash
# 运行完整自检
npm run check:selectors

# 或运行完整预发布检查
npm run pre-release
```

### 📋 6个"复发点"防护

1. **Selector中的时间戳生成** ❌
   ```ts
   // 错误: useStore(s => Date.now())
   // 正确: 传参或在触发时生成
   ```

2. **Selector中的map/filter返回新数组** ❌
   ```ts
   // 错误: useStore(s => s.items.filter(...))
   // 正确: 原子订阅 + useMemo
   ```

3. **useEffect依赖中的现拼对象** ❌
   ```ts
   // 错误: useEffect(() => {}, [{ id: 1 }])
   // 正确: useMemo稳定化
   ```

4. **对象返回selector未使用shallow** ❌
   ```ts
   // 错误: useStore(s => ({ a: s.a, b: s.b }))
   // 正确: useStore(s => ({ a: s.a, b: s.b }), shallow)
   ```

5. **PDF相关selector中的易变数据** ❌
   ```ts
   // 错误: selector中生成时间戳
   // 正确: 在触发动作时生成
   ```

6. **Selector中的字符串拼接** ❌
   ```ts
   // 错误: useStore(s => `$${s.amount}`)
   // 正确: 在展示层格式化
   ```

### 🎯 最佳实践

#### 原子订阅原则
```ts
// ✅ 原子订阅
const items = useStore(s => s.items);
const currency = useStore(s => s.currency);

// ❌ 复合订阅
const { items, currency } = useStore(s => ({ items: s.items, currency: s.currency }));
```

#### 派生数据使用useMemo
```ts
const useTotals = () => {
  const items = useStore(s => s.items);
  return useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.qty, 0);
  }, [items]);
};
```

#### 复杂对象使用shallow
```ts
const { buyer, seller } = useStore(s => ({
  buyer: s.buyer,
  seller: s.seller
}), shallow);
```

## 2048游戏推演功能

### 功能特点
- **AI自动推演**: 使用Expectimax算法和蒙特卡洛树搜索进行智能推演
- **随机演示**: 使用随机方向移动进行调试和演示
- **实时统计**: 显示推演步数、模拟次数、当前分数等
- **速度控制**: 支持快速、正常、慢速、极慢四种推演速度
- **手动干预**: 可随时暂停推演并进行手动操作
- **撤销功能**: 支持撤销到上一步状态
- **单步推演**: 可以手动控制AI走一步

### 使用方法
1. **开始推演**: 点击"开始推演"按钮，AI将自动进行游戏
2. **暂停推演**: 点击"暂停推演"按钮停止自动推演
3. **单步推演**: 点击"单步推演"按钮，AI走一步
4. **随机演示**: 点击"随机演示"按钮，使用随机方向移动
5. **撤销操作**: 点击"撤销"按钮回到上一步
6. **速度调节**: 使用下拉菜单调整推演速度
7. **手动干预**: 在推演过程中可以随时进行手动操作

### 算法说明
- **Expectimax算法**: 2层深度搜索，支持Alpha-Beta剪枝优化
- **蒙特卡洛树搜索**: 备选算法，支持100次随机模拟
- **综合评估函数**: 基于空格数量、合并潜力、单调性、平滑度、角落策略和死路惩罚
- **状态管理**: 完整的撤销栈和状态快照管理，使用JSON深拷贝确保状态隔离

### 技术实现
- **React Hooks**: 使用useState、useEffect、useRef管理状态
- **算法优化**: 避免阻塞主线程的计算密集型操作
- **响应式设计**: 适配移动端和桌面端
- **性能监控**: 实时显示推演统计信息

## 技术栈

- **前端框架**: Next.js 14 (App Router)
- **UI组件**: Tailwind CSS
- **图标库**: Lucide React
- **状态管理**: React Hooks + Zustand
- **主题管理**: 自定义主题系统 + CSS变量
- **部署平台**: Vercel

## 开发环境

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 项目结构

```
mluonet/
├── src/
│   ├── app/                 # Next.js App Router页面
│   │   └── dashboard/       # Dashboard 页面
│   ├── components/          # React组件
│   │   ├── dashboard/       # Dashboard 相关组件
│   │   │   ├── ModuleButton.tsx
│   │   │   └── RecentDocumentsList.tsx
│   │   ├── ThemeToggle.tsx  # 主题切换组件
│   │   └── ThemeProvider.tsx # 主题提供者
│   ├── constants/           # 常量配置
│   │   ├── dashboardModules.ts
│   │   └── colorMap.ts      # 颜色映射配置
│   ├── hooks/               # React Hooks
│   │   ├── useThemeManager.ts # 主题管理Hook
│   │   └── useThemeSettings.ts # 旧版主题设置Hook
│   ├── lib/                 # 工具库和配置
│   ├── types/               # TypeScript类型定义
│   │   └── permissions.ts   # 权限相关类型
│   └── utils/               # 工具函数
│       ├── documentCounts.ts
│       ├── mapPermissions.ts
│       ├── themeUtils.ts    # 主题管理工具类
│       └── themeStyles.ts   # 主题样式工具类
├── public/                  # 静态资源
└── scripts/                 # 构建脚本
```

## 部署

项目已配置为Vercel部署，包含以下优化：

- **字体优化**: 中文字体压缩和预加载
- **图片优化**: Logo和图标资源优化
- **性能监控**: 实时性能数据收集
- **错误处理**: 完善的错误边界和404页面

## 更新日志

### 最新版本 (2025-01-08)
- ✅ **类型错误修复**: 修复构建过程中的TypeScript类型错误
  - **权限类型统一**: 修复 `PermissionMap` 接口中缺少 `confirmation` 字段的问题
  - **DocumentType定义统一**: 统一两个不同文件中的 `DocumentType` 定义顺序
  - **类型安全**: 确保 `accessibleDocumentTypes` 返回正确的 `DocumentType[]` 类型
  - **构建成功**: 修复后构建过程顺利完成，无类型错误
- ✅ **报价模块Excel导出功能**: 为销售确认页面添加Excel导出功能
  - **Excel导出服务**: 创建专门的Excel导出服务，支持报价单和销售确认两种格式
  - **销售确认优化**: 针对销售确认页面的特殊需求，提供专门的Excel模板
  - **完整数据导出**: 包含文档基本信息、商品明细、费用明细、总计金额和合同条款
  - **用户界面集成**: 在报价页面添加Excel导出按钮，支持快速导出
  - **文件命名规范**: 自动生成包含文档编号和日期的文件名
  - **错误处理**: 完善的错误处理和用户提示机制
- ✅ **PDF健康检查优化**: 优化开发环境PDF性能监控
  - **阈值调整**: 将健康检查阈值从800ms调整为2000ms，更符合实际性能表现
  - **日志分级**: 区分警告和错误级别，避免误报
  - **延迟优化**: 增加健康检查延迟时间，减少对首屏加载的影响
  - **性能监控**: 实时监控PDF生成性能，确保用户体验
- ✅ **主题管理系统**: 完整的主题管理解决方案
  - **CSS变量系统**: 统一管理颜色和样式，支持动态主题切换
  - **主题管理器**: 单例模式的主题管理类，支持配置持久化
  - **React Hooks**: 响应式的主题状态管理，提供便捷的操作方法
  - **主题组件**: 多种主题切换组件（按钮、下拉菜单、紧凑模式）
  - **主题提供者**: 应用根级别的主题上下文管理
  - **样式工具类**: 提供常用的主题样式组合和生成器
  - **深色模式**: 完整的深色模式支持，自动适配系统偏好
  - **模块化设计**: 主题系统完全模块化，易于扩展和维护
- ✅ **采购模块最终打磨**: 完成采购模块的最终优化和功能完善
  - **表单绑定升级**: 统一 `numberField`、`boolField`、`selectField` 输入处理，支持右对齐和兜底
  - **错误提示组件**: 字段下方小红标 + 区块汇总，直观定位错误信息
  - **自动保存**: 300ms 防抖 + 存储配额兜底，溢出时降级为压缩或仅保存关键字段
  - **PDF负载选择器**: 集中确定导出数据结构，避免页面到处拼装
  - **服务层健壮性**: 保存/加载异常的 UI 反馈（toast）与回退策略
  - **Store迁移规范**: 版本号与迁移脚手架固定模板，支持字段演进
  - **快捷操作增强**: 保存后轻量 toast + 键盘提示（⌘/Ctrl+S）
  - **验证逻辑优化**: 完善字段验证，支持实时错误提示
  - **用户体验提升**: 统一的错误处理、Toast提示、快捷键支持

### 历史版本 (2024-01-15)
- ✅ **PDF性能优化**: 实现字体和图片缓存系统，大幅提升PDF生成性能
  - **字体缓存**: 使用IndexedDB持久化字体字节，冷启动只解压一次
  - **图片缓存**: 图片转换为dataURL并缓存，避免重复解码
  - **表格优化**: 解决AutoTable宽度溢出问题，添加自适应列宽和长文本处理
  - **性能监控**: 新增性能监控工具，实时跟踪字体预热和PDF生成性能
  - **测试页面**: 新增性能测试页面，可验证缓存效果和性能指标
- ✅ **字体预热优化**: 首轮字体加载从9.7s优化到150-180ms
- ✅ **PDF生成优化**: 表格生成从463ms优化到250ms左右
- ✅ **缓存系统**: 支持字体和图片的版本控制和缓存管理
- ✅ **错误处理**: 完善的缓存错误处理和降级机制

### 历史版本
- ✅ **PDF字体性能重大优化**: IndexedDB缓存 + pako解压优化
  - **冷启动优化**: 9.7s → 预计2-3s，通过IndexedDB持久化字体字节
  - **热启动优化**: 150-180ms，IndexedDB缓存命中
  - **智能解压**: 优先使用浏览器原生DecompressionStream，兜底pako.ungzip
  - **容错回退**: .gz失败自动回退到.ttf，确保字体加载稳定性
  - **并发控制**: single-flight防止重复加载，避免资源浪费
  - **性能监控**: 详细的加载时间和缓存状态追踪
- ✅ **表格生成优化**: 自适应宽度 + 溢出处理
  - **列宽优化**: 根据页面可用宽度自动调整，避免内容溢出
  - **文本换行**: 长文本自动换行，软断点处理异常长词
  - **性能提升**: 表格生成从463ms优化到预计<250ms
- ✅ **Dashboard 页面重构**: 模块化拆分，提升代码可维护性
- ✅ **性能优化**: 统一文档计数逻辑，使用 Map 加速权限判断
- ✅ **搜索功能**: 支持文档编号、客户名称搜索，关键词高亮显示
- ✅ **用户体验**: 响应式筛选器，智能空状态提示
- ✅ **代码质量**: 完整的 TypeScript 类型定义，完善的错误处理
- ✅ 新增2048游戏AI推演功能
- ✅ 实现Expectimax算法和蒙特卡洛树搜索
- ✅ 添加随机演示功能，用于调试和蒙特卡洛模拟
- ✅ 添加推演统计和速度控制
- ✅ 支持手动干预和撤销功能
- ✅ 优化移动端用户体验
- ✅ 修复状态同步问题，使用JSON深拷贝确保状态隔离
- ✅ 增强AI算法性能，支持Alpha-Beta剪枝优化
- ✅ 添加调试日志，便于问题排查
- ✅ 修复重新开始功能数据恢复问题，确保重新开始后刷新页面不会恢复老数据
- ✅ 增强全局粘贴功能，新增支持"名称，数量，单位，单价"4列格式智能识别，修复单价为0时的识别问题

## 贡献指南

欢迎提交Issue和Pull Request来改进项目。

## 许可证

MIT License