# 预加载功能说明

## 功能概述

预加载功能可以提前将系统中的所有重要资源（表单页面、PDF字体、静态资源等）下载到本地缓存，提升用户体验和页面加载速度。

## 主要特性

### 1. 智能预加载
- **PDF字体预加载**: 预加载Noto Sans SC字体文件，确保PDF生成时字体可用
- **表单页面预加载**: 预加载所有表单页面（报价单、装箱单、发票、采购单等）
- **静态资源预加载**: 预加载logo、图片等静态资源
- **历史数据检查**: 检查并标记已存在的历史数据
- **工具页面预加载**: 预加载管理后台等工具页面

### 2. 进度显示
- 实时显示预加载进度（0-100%）
- 在用户菜单中显示当前状态
- 支持进度回调，可扩展更多UI反馈

### 3. 缓存管理
- 自动检查已预加载的资源，避免重复加载
- 预加载状态保存到localStorage，24小时内有效
- 支持手动清除预加载缓存

### 4. 自动预加载
- 首次访问dashboard时自动开始预加载
- 延迟2秒开始，避免影响初始页面加载
- 只在未预加载时执行自动预加载

## 使用方法

### 手动预加载
1. 登录dashboard后，点击右上角用户头像
2. 在下拉菜单中点击"预加载资源"按钮
3. 等待预加载完成（会显示进度百分比）

### 自动预加载
- 首次访问dashboard时会自动开始预加载
- 预加载完成后，按钮会显示"资源已预加载"

## 技术实现

### 核心类：PreloadManager
```typescript
// 单例模式，确保全局只有一个预加载管理器
const preloadManager = PreloadManager.getInstance();

// 开始预加载
await preloadManager.preloadAllResources();

// 检查预加载状态
const isPreloaded = preloadManager.isPreloaded();

// 获取预加载统计
const stats = preloadManager.getPreloadStats();
```

### 预加载流程
1. **PDF字体** (15%): 预加载Noto Sans SC字体文件
2. **表单页面** (30%): 预加载所有表单页面
3. **静态资源** (50%): 预加载logo、图片等
4. **历史数据** (70%): 检查历史数据状态
5. **工具页面** (85%): 预加载管理后台等
6. **CSS/JS资源** (100%): 预加载样式文件

### 缓存策略
- 使用Set数据结构记录已预加载的资源
- localStorage保存预加载完成时间戳
- 24小时内认为预加载状态有效
- 支持手动清除缓存

## 性能优化

### 资源去重
- 检查资源是否已预加载，避免重复加载
- 使用HEAD请求预加载页面，减少带宽消耗

### 错误处理
- 单个资源加载失败不影响整体预加载
- 详细的错误日志记录
- 优雅降级，确保用户体验

### 内存管理
- 及时清理事件监听器
- 避免内存泄漏
- 合理的资源释放策略

## 配置选项

### 预加载资源列表
可以在`src/utils/preloadUtils.ts`中修改以下配置：

```typescript
// 字体文件列表
const fontUrls = [
  '/fonts/NotoSansSC-Regular.ttf',
  '/fonts/NotoSansSC-Bold.ttf',
  // 添加更多字体...
];

// 表单页面列表
const formPages = [
  '/quotation',
  '/packing',
  '/invoice',
  '/purchase',
  // 添加更多页面...
];

// 静态资源列表
const staticAssets = [
  '/assets/logo/logo.png',
  '/assets/images/header-bilingual.png',
  // 添加更多资源...
];
```

### 预加载策略
- 可以调整各阶段的进度百分比
- 可以修改自动预加载的延迟时间
- 可以自定义预加载状态的有效期

## 监控和调试

### 控制台日志
预加载过程中会在控制台输出详细的日志信息：
- 开始预加载
- 各阶段完成情况
- 资源加载成功/失败
- 预加载完成

### 状态检查
```typescript
// 检查预加载状态
console.log(preloadManager.getPreloadStats());

// 检查是否已预加载
console.log(preloadManager.isPreloaded());

// 获取预加载进度
console.log(preloadManager.getPreloadStatus());
```

## 扩展功能

### 自定义预加载
可以扩展PreloadManager类，添加自定义的预加载逻辑：

```typescript
// 添加自定义预加载方法
private async preloadCustomResources(): Promise<void> {
  // 自定义预加载逻辑
}
```

### 进度回调
可以添加自定义的进度回调函数：

```typescript
preloadManager.onProgress((progress) => {
  // 自定义进度处理逻辑
  console.log(`预加载进度: ${progress}%`);
});
```

## 注意事项

1. **网络环境**: 预加载需要稳定的网络连接
2. **存储空间**: 预加载会占用一定的本地存储空间
3. **首次加载**: 首次预加载可能需要较长时间
4. **浏览器兼容**: 需要支持现代浏览器的预加载API

## 故障排除

### 预加载失败
1. 检查网络连接
2. 查看浏览器控制台错误信息
3. 尝试手动清除缓存后重新预加载

### 进度不更新
1. 检查进度回调是否正确注册
2. 确认UI组件是否正确响应状态变化

### 资源加载失败
1. 检查资源路径是否正确
2. 确认服务器是否正常响应
3. 查看网络请求状态 