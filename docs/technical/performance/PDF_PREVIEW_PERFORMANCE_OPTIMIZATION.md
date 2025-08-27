# PDF预览性能优化方案

## 问题分析

### 🔍 **问题现象**
用户反馈报价页预览页面第一次加载需要20秒或以上，严重影响用户体验。

### 🎯 **根本原因**
1. **embedded-resources.ts文件过大**：27MB的字体和图片资源文件
2. **动态导入延迟**：PDF生成器使用动态导入，首次加载需要下载大量资源
3. **字体文件加载**：中文字体文件（NotoSansSC）较大，首次加载慢
4. **图片资源加载**：表头图片等资源较大
5. **缺乏预加载机制**：没有提前预热PDF生成相关资源

## 优化方案

### 1. **资源分离和按需加载**

#### 1.1 分离字体资源
```typescript
// 创建独立的字体加载模块
// src/utils/fontLoader.ts
export async function loadFontsOnDemand() {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  return {
    notoSansSCRegular: embeddedResources.notoSansSCRegular,
    notoSansSCBold: embeddedResources.notoSansSCBold
  };
}
```

#### 1.2 分离图片资源
```typescript
// 创建独立的图片加载模块
// src/utils/imageLoader.ts
export async function loadImagesOnDemand() {
  const { embeddedResources } = await import('@/lib/embedded-resources');
  return {
    headerImage: embeddedResources.headerImage,
    headerEnglish: embeddedResources.headerEnglish,
    shanghaiStamp: embeddedResources.shanghaiStamp,
    hongkongStamp: embeddedResources.hongkongStamp
  };
}
```

### 2. **PDF生成器优化**

#### 2.1 延迟加载优化
```typescript
// 优化PDF生成器的资源加载
export const generateQuotationPDF = async (rawData: unknown, preview = false): Promise<Blob> => {
  // 并行加载字体和图片资源
  const [fonts, images] = await Promise.all([
    loadFontsOnDemand(),
    loadImagesOnDemand()
  ]);
  
  // 使用加载的资源生成PDF
  // ...
};
```

#### 2.2 缓存机制
```typescript
// 添加资源缓存
let cachedFonts: any = null;
let cachedImages: any = null;

export async function getCachedFonts() {
  if (!cachedFonts) {
    cachedFonts = await loadFontsOnDemand();
  }
  return cachedFonts;
}

export async function getCachedImages() {
  if (!cachedImages) {
    cachedImages = await loadImagesOnDemand();
  }
  return cachedImages;
}
```

### 3. **预热机制优化**

#### 3.1 改进PDF预热
```typescript
// src/hooks/usePdfWarmup.ts
export function usePdfWarmup() {
  return useCallback(async () => {
    // 并行预热所有PDF相关资源
    await Promise.all([
      import('@/utils/quotationPdfGenerator'),
      import('@/utils/orderConfirmationPdfGenerator'),
      import('@/lib/embedded-resources'),
      // 预加载字体和图片
      loadFontsOnDemand(),
      loadImagesOnDemand()
    ]);
  }, []);
}
```

#### 3.2 智能预热策略
```typescript
// 在用户进入报价页面时就开始预热
useEffect(() => {
  // 页面空闲时预热PDF资源
  const id = window.requestIdleCallback?.(() => warmup()) ?? setTimeout(warmup, 1000);
  return () => (window.cancelIdleCallback ? window.cancelIdleCallback(id as number) : clearTimeout(id as number));
}, [warmup]);
```

### 4. **用户体验优化**

#### 4.1 进度显示优化
```typescript
// 更详细的进度显示
const handlePreview = async () => {
  setPreviewing(true);
  setPreviewProgress(0);

  try {
    setPreviewProgress(10); // 开始准备资源
    setPreviewProgress(30); // 加载字体
    setPreviewProgress(50); // 加载图片
    setPreviewProgress(70); // 生成PDF
    setPreviewProgress(90); // 创建预览
    setPreviewProgress(100); // 完成
  } catch (error) {
    // 错误处理
  }
};
```

#### 4.2 加载状态优化
```typescript
// 更友好的加载提示
{isPreviewing && (
  <div className="text-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-2"></div>
    <p className="text-sm text-gray-600">
      {previewProgress < 30 ? '准备资源...' :
       previewProgress < 50 ? '加载字体...' :
       previewProgress < 70 ? '加载图片...' :
       previewProgress < 90 ? '生成PDF...' :
       '创建预览...'}
    </p>
  </div>
)}
```

### 5. **资源压缩优化**

#### 5.1 字体文件压缩
```bash
# 使用字体子集化减少文件大小
npm install fonttools
# 只包含常用字符的字体文件
```

#### 5.2 图片资源压缩
```bash
# 压缩图片资源
npm install imagemin
# 将图片转换为更小的格式
```

### 6. **CDN和缓存优化**

#### 6.1 静态资源CDN
```typescript
// 使用CDN加载大型资源
const FONT_CDN_URL = 'https://cdn.example.com/fonts/';
const IMAGE_CDN_URL = 'https://cdn.example.com/images/';
```

#### 6.2 浏览器缓存策略
```typescript
// 设置长期缓存
// next.config.mjs
{
  source: '/fonts/(.*)',
  headers: [
    {
      key: 'Cache-Control',
      value: 'public, max-age=31536000, immutable',
    },
  ],
}
```

## 实施步骤

### 第一阶段：资源分离（立即实施）
1. 创建独立的字体和图片加载模块
2. 修改PDF生成器使用按需加载
3. 添加资源缓存机制

### 第二阶段：预热优化（1-2天）
1. 改进PDF预热机制
2. 添加智能预热策略
3. 优化进度显示

### 第三阶段：资源压缩（3-5天）
1. 压缩字体文件
2. 压缩图片资源
3. 实施CDN策略

### 第四阶段：用户体验优化（1天）
1. 改进加载状态显示
2. 添加错误处理
3. 优化用户反馈

## 预期效果

### 📈 **性能提升**
- **首次预览时间**：从20秒降低到3-5秒
- **后续预览时间**：从20秒降低到1-2秒
- **资源加载时间**：减少80%以上

### 🎯 **用户体验改善**
- **更快的响应**：用户点击预览后立即看到进度
- **更清晰的反馈**：详细的进度提示
- **更稳定的性能**：缓存机制确保后续操作快速

### 🔧 **技术优化**
- **资源按需加载**：避免不必要的资源下载
- **智能缓存**：减少重复加载
- **并行处理**：同时加载多个资源

## 监控和测试

### 📊 **性能监控**
```typescript
// 添加性能监控
const startTime = performance.now();
// ... PDF生成过程
const endTime = performance.now();
console.log(`PDF生成耗时: ${endTime - startTime}ms`);
```

### 🧪 **测试方案**
1. **首次加载测试**：测试未缓存时的加载时间
2. **缓存加载测试**：测试缓存后的加载时间
3. **并发测试**：测试多个用户同时预览的性能
4. **网络测试**：测试不同网络环境下的性能

## 总结

通过以上优化方案，我们可以将PDF预览的首次加载时间从20秒降低到3-5秒，大幅提升用户体验。关键是要实施资源分离、按需加载、智能预热和缓存机制。
