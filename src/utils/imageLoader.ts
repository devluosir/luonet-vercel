// 图片加载工具 - 用于PDF生成时按需加载图片资源

// 缓存机制
let cachedImages: any = null;
let imagesLoading = false;
let imagesLoadPromise: Promise<any> | null = null;

/**
 * 按需加载图片资源
 */
export async function loadImagesOnDemand() {
  // 如果已经有缓存的图片，直接返回
  if (cachedImages) {
    return cachedImages;
  }

  // 如果正在加载，返回现有的Promise
  if (imagesLoading && imagesLoadPromise) {
    return imagesLoadPromise;
  }

  // 开始加载图片
  imagesLoading = true;
  imagesLoadPromise = new Promise(async (resolve, reject) => {
    try {
      // 动态导入图片资源
      const { embeddedResources } = await import('@/lib/embedded-resources');
      
      const images = {
        headerImage: embeddedResources.headerImage,
        headerEnglish: embeddedResources.headerEnglish,
        shanghaiStamp: embeddedResources.shanghaiStamp,
        hongkongStamp: embeddedResources.hongkongStamp
      };
      
      // 缓存图片资源
      cachedImages = images;
      resolve(images);
    } catch (error) {
      console.error('图片加载失败:', error);
      reject(error);
    } finally {
      imagesLoading = false;
    }
  });

  return imagesLoadPromise;
}

/**
 * 获取表头图片
 */
export async function getHeaderImage(headerType: string): Promise<string> {
  try {
    const images = await loadImagesOnDemand();
    
    switch (headerType) {
      case 'bilingual':
        return images.headerImage;
      case 'english':
        return images.headerEnglish;
      default:
        return images.headerImage;
    }
  } catch (error) {
    console.error('获取表头图片失败:', error);
    throw error;
  }
}

/**
 * 获取印章图片
 */
export async function getStampImage(stampType: string): Promise<string> {
  try {
    const images = await loadImagesOnDemand();
    
    switch (stampType) {
      case 'shanghai':
        return images.shanghaiStamp;
      case 'hongkong':
        return images.hongkongStamp;
      default:
        return images.shanghaiStamp;
    }
  } catch (error) {
    console.error('获取印章图片失败:', error);
    throw error;
  }
}

/**
 * 预热图片资源
 */
export async function preloadImages() {
  try {
    await loadImagesOnDemand();
    console.log('图片资源预热完成');
  } catch (error) {
    console.error('图片资源预热失败:', error);
  }
}

/**
 * 清除图片缓存
 */
export function clearImageCache() {
  cachedImages = null;
  imagesLoading = false;
  imagesLoadPromise = null;
  console.log('图片缓存已清除');
}
