// 预加载工具函数
export class PreloadManager {
  private static instance: PreloadManager;
  private isPreloading = false;
  private preloadProgress = 0;
  private preloadCallbacks: ((progress: number) => void)[] = [];
  private preloadedResources = new Set<string>();

  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  // 添加进度回调
  onProgress(callback: (progress: number) => void) {
    this.preloadCallbacks.push(callback);
  }

  // 移除进度回调
  offProgress(callback: (progress: number) => void) {
    const index = this.preloadCallbacks.indexOf(callback);
    if (index > -1) {
      this.preloadCallbacks.splice(index, 1);
    }
  }

  // 更新进度
  private updateProgress(progress: number) {
    this.preloadProgress = progress;
    this.preloadCallbacks.forEach(callback => callback(progress));
  }

  // 预加载所有资源
  async preloadAllResources(): Promise<void> {
    if (this.isPreloading) {
      console.log('预加载已在进行中...');
      return;
    }

    this.isPreloading = true;
    this.updateProgress(0);

    try {
      console.log('开始预加载所有资源...');

      // 1. 预加载PDF字体 (15%)
      await this.preloadFonts();
      this.updateProgress(15);

      // 2. 预加载表单页面 (30%)
      await this.preloadFormPages();
      this.updateProgress(30);

      // 3. 预加载静态资源 (50%)
      await this.preloadStaticAssets();
      this.updateProgress(50);

      // 4. 预加载历史数据 (70%)
      await this.preloadHistoryData();
      this.updateProgress(70);

      // 5. 预加载工具页面 (85%)
      await this.preloadToolPages();
      this.updateProgress(85);

      // 6. 预加载CSS和JS资源 (100%)
      await this.preloadScriptsAndStyles();
      this.updateProgress(100);

      console.log('所有资源预加载完成！');
      
      // 保存预加载状态到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preloadCompleted', Date.now().toString());
      }
    } catch (error) {
      console.error('预加载过程中出现错误:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  // 预加载PDF字体
  private async preloadFonts(): Promise<void> {
    console.log('预加载PDF字体...');
    
    const fontUrls = [
      '/fonts/NotoSansSC-Regular.ttf',
      '/fonts/NotoSansSC-Bold.ttf',
      '/fonts/compressed/NotoSansSC-Regular.ttf.gz',
      '/fonts/compressed/NotoSansSC-Bold.ttf.gz'
    ];

    const fontPromises = fontUrls.map(url => {
      return new Promise<void>((resolve) => {
        // 检查是否已经预加载过
        if (this.preloadedResources.has(url)) {
          console.log(`字体已预加载: ${url}`);
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/ttf';
        link.href = url;
        link.crossOrigin = 'anonymous';
        
        link.onload = () => {
          console.log(`字体预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        
        link.onerror = () => {
          console.warn(`字体预加载失败: ${url}`);
          resolve(); // 即使失败也继续
        };
        
        document.head.appendChild(link);
      });
    });

    await Promise.all(fontPromises);
  }

  // 预加载表单页面
  private async preloadFormPages(): Promise<void> {
    console.log('预加载表单页面...');
    
    const formPages = [
      '/quotation',
      '/packing',
      '/invoice',
      '/purchase',
      '/history',
      '/customer',
      '/mail',
      '/date-tools'
    ];

    const pagePromises = formPages.map(async (path) => {
      try {
        // 使用fetch预加载页面
        const response = await fetch(path, {
          method: 'HEAD', // 只获取头部信息，不下载内容
          cache: 'force-cache'
        });
        
        if (response.ok) {
          console.log(`页面预加载成功: ${path}`);
          this.preloadedResources.add(path);
        }
      } catch (error) {
        console.warn(`页面预加载失败: ${path}`, error);
      }
    });

    await Promise.all(pagePromises);
  }

  // 预加载静态资源
  private async preloadStaticAssets(): Promise<void> {
    console.log('预加载静态资源...');
    
    const staticAssets = [
      '/assets/logo/logo.png',
      '/assets/logo/icon.png',
      '/assets/logo/apple-icon.png',
      '/assets/logo/favicon.ico',
      '/assets/images/header-bilingual.png',
      '/assets/images/header-english.png',
      '/assets/images/fallback-logo.png',
      '/assets/images/stamp-hongkong.png',
      '/assets/images/stamp-shanghai.png',
      '/assets/images/logo.svg',
      '/next.svg',
      '/vercel.svg'
    ];

    const assetPromises = staticAssets.map(url => {
      return new Promise<void>((resolve) => {
        // 检查是否已经预加载过
        if (this.preloadedResources.has(url)) {
          console.log(`静态资源已预加载: ${url}`);
          resolve();
          return;
        }

        const img = new Image();
        img.onload = () => {
          console.log(`静态资源预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        img.onerror = () => {
          console.warn(`静态资源预加载失败: ${url}`);
          resolve(); // 即使失败也继续
        };
        img.src = url;
      });
    });

    await Promise.all(assetPromises);
  }

  // 预加载历史数据
  private async preloadHistoryData(): Promise<void> {
    console.log('预加载历史数据...');
    
    if (typeof window === 'undefined') return;

    const historyKeys = [
      'quotation_history',
      'packing_history', 
      'invoice_history',
      'purchase_history'
    ];

    // 检查并预加载历史数据
    historyKeys.forEach(key => {
      const data = localStorage.getItem(key);
      if (data) {
        console.log(`历史数据已存在: ${key}`);
        this.preloadedResources.add(key);
      } else {
        console.log(`历史数据不存在: ${key}`);
      }
    });
  }

  // 预加载工具页面
  private async preloadToolPages(): Promise<void> {
    console.log('预加载工具页面...');
    
    const toolPages = [
      '/admin',
      '/tools'
    ];

    const toolPromises = toolPages.map(async (path) => {
      try {
        const response = await fetch(path, {
          method: 'HEAD',
          cache: 'force-cache'
        });
        
        if (response.ok) {
          console.log(`工具页面预加载成功: ${path}`);
          this.preloadedResources.add(path);
        }
      } catch (error) {
        console.warn(`工具页面预加载失败: ${path}`, error);
      }
    });

    await Promise.all(toolPromises);
  }

  // 预加载CSS和JS资源
  private async preloadScriptsAndStyles(): Promise<void> {
    console.log('预加载CSS和JS资源...');
    
    const scriptAndStyleUrls = [
      '/globals.css',
      '/pdf-fonts.css'
    ];

    const resourcePromises = scriptAndStyleUrls.map(url => {
      return new Promise<void>((resolve) => {
        // 检查是否已经预加载过
        if (this.preloadedResources.has(url)) {
          console.log(`资源已预加载: ${url}`);
          resolve();
          return;
        }

        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        
        link.onload = () => {
          console.log(`资源预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        
        link.onerror = () => {
          console.warn(`资源预加载失败: ${url}`);
          resolve(); // 即使失败也继续
        };
        
        document.head.appendChild(link);
      });
    });

    await Promise.all(resourcePromises);
  }

  // 获取预加载状态
  getPreloadStatus() {
    return {
      isPreloading: this.isPreloading,
      progress: this.preloadProgress,
      preloadedCount: this.preloadedResources.size
    };
  }

  // 检查是否已预加载
  isPreloaded(): boolean {
    if (typeof window === 'undefined') return false;
    
    // 检查localStorage中的预加载标记
    const preloadCompleted = localStorage.getItem('preloadCompleted');
    if (preloadCompleted) {
      const completedTime = parseInt(preloadCompleted);
      const now = Date.now();
      // 如果预加载完成时间在24小时内，认为有效
      if (now - completedTime < 24 * 60 * 60 * 1000) {
        return true;
      }
    }
    
    // 检查关键资源是否已加载
    const fontLoaded = document.fonts.check('12px "Noto Sans SC"');
    const logoLoaded = document.querySelector('img[src*="logo.png"]') !== null;
    
    return fontLoaded && logoLoaded;
  }

  // 清除预加载缓存
  clearPreloadCache(): void {
    this.preloadedResources.clear();
    if (typeof window !== 'undefined') {
      localStorage.removeItem('preloadCompleted');
    }
    console.log('预加载缓存已清除');
  }

  // 获取预加载统计信息
  getPreloadStats() {
    return {
      totalResources: this.preloadedResources.size,
      isPreloading: this.isPreloading,
      progress: this.preloadProgress,
      isCompleted: this.isPreloaded()
    };
  }
}

// 导出单例实例
export const preloadManager = PreloadManager.getInstance(); 