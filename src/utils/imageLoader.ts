// 图片加载工具 - 用于PDF生成时按需加载图片资源

// 图片版本控制
const IMAGE_VERSION = '1.0.0';
const IMAGE_CACHE_KEY = `PDF_IMAGE_v${IMAGE_VERSION}`;

// 全局单例Promise，只加载一次
let imageBytesPromise: Promise<{headerImage: string; headerEnglish: string; shanghaiStamp: string; hongkongStamp: string}> | null = null;

// 获取图片字节串（只加载一次）
async function getImageBytesOnce() {
  if (!imageBytesPromise) {
    imageBytesPromise = (async () => {
      // 只加载一次，后续内存命中
      const { embeddedResources } = await import('@/lib/embedded-resources');
      return {
        headerImage: embeddedResources.headerImage,
        headerEnglish: embeddedResources.headerEnglish,
        shanghaiStamp: embeddedResources.shanghaiStamp,
        hongkongStamp: embeddedResources.hongkongStamp
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
const imageCache = new WeakMap<Document, Map<string, string>>();

export async function getHeaderImage(headerType: 'bilingual' | 'english'): Promise<string> {
  const imageLoading = performanceMonitor.start('获取头部图片');
  
  try {
    const images = await getImageBytesOnce();
    let headerImage: string;
    
    switch (headerType) {
      case 'bilingual':
        headerImage = images.headerImage;
        break;
      case 'english':
        headerImage = images.headerEnglish;
        break;
      default:
        throw new Error(`不支持的头部类型: ${headerType}`);
    }
    
    performanceMonitor.end(imageLoading);
    return headerImage;
  } catch (error) {
    console.error('头部图片加载失败:', error);
    performanceMonitor.end(imageLoading);
    throw error;
  }
}

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

// 导出图片字节串获取函数（用于测试）
export { getImageBytesOnce };
