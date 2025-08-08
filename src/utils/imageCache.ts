import { get, set, del } from 'idb-keyval';

// 图片缓存版本控制
const IMAGE_CACHE_VERSION = '1.0.0';
const CACHE_KEYS = {
  headerBilingual: `header-bilingual-${IMAGE_CACHE_VERSION}`,
  headerEnglish: `header-english-${IMAGE_CACHE_VERSION}`
};

/**
 * 获取缓存的图片 dataURL
 * @param cacheKey 缓存键名
 * @param loader 加载函数，返回 base64 字符串
 * @returns dataURL 字符串
 */
export async function getCachedImage(
  cacheKey: string,
  loader: () => Promise<string>
): Promise<string> {
  try {
    // 1. 尝试从 IndexedDB 读取缓存
    const cached = await get<string>(cacheKey);
    if (cached) {
      console.log(`[图片缓存] 命中缓存: ${cacheKey}`);
      return cached;
    }

    // 2. 缓存未命中，执行加载
    console.log(`[图片缓存] 缓存未命中，开始加载: ${cacheKey}`);
    const startTime = performance.now();
    
    const base64 = await loader();
    const dataURL = `data:image/png;base64,${base64}`;
    
    // 3. 写入 IndexedDB 缓存
    await set(cacheKey, dataURL);
    
    const endTime = performance.now();
    console.log(`[图片缓存] 加载完成并缓存: ${cacheKey} (${(endTime - startTime).toFixed(2)}ms)`);
    
    return dataURL;
  } catch (error) {
    console.error(`[图片缓存] 加载失败: ${cacheKey}`, error);
    throw error;
  }
}

/**
 * 获取头部图片
 * @param type 图片类型
 * @returns dataURL 字符串
 */
export async function getHeaderImage(type: 'bilingual' | 'english'): Promise<string> {
  const cacheKey = type === 'bilingual' ? CACHE_KEYS.headerBilingual : CACHE_KEYS.headerEnglish;
  
  return getCachedImage(cacheKey, async () => {
    const response = await fetch(`/images/header-${type}.png`);
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    return btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  });
}

/**
 * 清除图片缓存
 */
export async function clearImageCache(): Promise<void> {
  try {
    await Promise.all([
      del(CACHE_KEYS.headerBilingual),
      del(CACHE_KEYS.headerEnglish)
    ]);
    console.log('[图片缓存] 缓存已清除');
  } catch (error) {
    console.error('[图片缓存] 清除缓存失败:', error);
  }
}

/**
 * 获取缓存状态
 */
export async function getImageCacheStatus(): Promise<{
  headerBilingual: boolean;
  headerEnglish: boolean;
  version: string;
}> {
  try {
    const [bilingual, english] = await Promise.all([
      get<string>(CACHE_KEYS.headerBilingual),
      get<string>(CACHE_KEYS.headerEnglish)
    ]);

    return {
      headerBilingual: !!bilingual,
      headerEnglish: !!english,
      version: IMAGE_CACHE_VERSION
    };
  } catch (error) {
    console.error('[图片缓存] 获取状态失败:', error);
    return { headerBilingual: false, headerEnglish: false, version: IMAGE_CACHE_VERSION };
  }
}
