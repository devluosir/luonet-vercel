// 图片加载工具 - 用于PDF生成时按需加载图片资源

// 图片版本控制
const IMAGE_VERSION = '1.0.0';
const _IMAGE_CACHE_KEY = `PDF_IMAGE_v${IMAGE_VERSION}`;

// 全局单例Promise，只加载一次
let imageBytesPromise: Promise<{shanghaiStamp: string; hongkongStamp: string; logoIcon: string}> | null = null;

// 获取图片字节串（只加载一次）
async function getImageBytesOnce() {
  if (!imageBytesPromise) {
    imageBytesPromise = (async () => {
      // 只加载一次，后续内存命中
      const { embeddedResources } = await import('@/lib/embedded-resources');
      return {
        shanghaiStamp: embeddedResources.shanghaiStamp,
        hongkongStamp: embeddedResources.hongkongStamp,
        logoIcon: embeddedResources.logoIcon,
      };
    })();
  }
  return imageBytesPromise; // 微秒级返回
}

// 模块级预热函数
export function preloadImages() {
  getImageBytesOnce().catch(console.error);
}

// 性能监控
const performanceMonitor = {
  start: (name: string) => {
    const startTime = performance.now();
    return { name, startTime };
  },
  end: (metric: { name: string; startTime: number }) => {
    const endTime = performance.now();
    const duration = endTime - metric.startTime;
    console.log(`图片加载监控 [${metric.name}]: ${duration.toFixed(2)}ms`);
    return duration;
  }
};

// 文档级WeakMap缓存，避免重复加载
const _imageCache = new WeakMap<Document, Map<string, string>>();

export async function getStampImage(stampType: 'shanghai' | 'hongkong'): Promise<string> {
  const stampLoading = performanceMonitor.start('获取印章图片');

  try {
    const images = await getImageBytesOnce();
    let stampImage: string;

    switch (stampType) {
      case 'shanghai':
        stampImage = images.shanghaiStamp;
        break;
      case 'hongkong':
        stampImage = images.hongkongStamp;
        break;
      default:
        throw new Error(`不支持的印章类型: ${stampType}`);
    }

    performanceMonitor.end(stampLoading);
    return stampImage;
  } catch (error) {
    console.error('印章图片加载失败:', error);
    performanceMonitor.end(stampLoading);
    throw error;
  }
}

// 小尺寸 logo 图标（160x160 PNG，~13KB），供"logo+矢量文字"表头排版使用。
// 原先的整条表头横幅图（header-bilingual.jpg ~92KB / header-english.png ~24KB）已从
// 全部 6 个 PDF 生成器里替换下来，源图片文件和相关 getHeaderImage/getHeaderImageFormat
// 已一并删除（TASK-107 追加清理）。
export async function getLogoIcon(): Promise<string> {
  const images = await getImageBytesOnce();
  return images.logoIcon;
}

// 导出图片字节串获取函数（用于测试）
export { getImageBytesOnce };
