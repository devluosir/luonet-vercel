// 预加载工具函数
export class PreloadManager {
  private static instance: PreloadManager;
  private isPreloading = false;
  private preloadProgress = 0;
  private preloadCallbacks: ((progress: number, stage?: string) => void)[] = [];
  private preloadedResources = new Set<string>();

  static getInstance(): PreloadManager {
    if (!PreloadManager.instance) {
      PreloadManager.instance = new PreloadManager();
    }
    return PreloadManager.instance;
  }

  // 添加进度回调
  onProgress(callback: (progress: number, stage?: string) => void) {
    this.preloadCallbacks.push(callback);
  }

  // 移除进度回调
  offProgress(callback: (progress: number, stage?: string) => void) {
    const index = this.preloadCallbacks.indexOf(callback);
    if (index > -1) {
      this.preloadCallbacks.splice(index, 1);
    }
  }

  // 更新进度
  private updateProgress(progress: number, stage?: string) {
    this.preloadProgress = progress;
    this.preloadCallbacks.forEach(callback => callback(progress, stage));
  }

  // 预加载所有资源
  async preloadAllResources(): Promise<void> {
    if (this.isPreloading) {
      console.log('预加载已在进行中...');
      return;
    }

    this.isPreloading = true;
    this.updateProgress(0);

    // 临时禁用控制台警告，避免过多的错误信息
    const originalWarn = console.warn;
    console.warn = () => {}; // 静默警告

    try {
      console.log('开始预加载所有资源...');

      // 1. 预加载PDF字体 (15%)
      this.updateProgress(0, '正在预加载PDF字体...');
      await this.preloadFonts();
      this.updateProgress(15, 'PDF字体预加载完成');

      // 2. 预加载表单页面 (30%)
      this.updateProgress(15, '正在预加载表单页面...');
      await this.preloadFormPages();
      this.updateProgress(30, '表单页面预加载完成');

      // 3. 预加载静态资源 (50%)
      this.updateProgress(30, '正在预加载静态资源...');
      await this.preloadStaticAssets();
      this.updateProgress(50, '静态资源预加载完成');

      // 4. 预加载历史数据 (70%)
      this.updateProgress(50, '正在预加载历史数据...');
      await this.preloadHistoryData();
      this.updateProgress(70, '历史数据预加载完成');

      // 5. 预加载工具页面 (85%)
      this.updateProgress(70, '正在预加载工具页面...');
      await this.preloadToolPages();
      this.updateProgress(85, '工具页面预加载完成');

      // 6. 预加载CSS和JS资源 (100%)
      this.updateProgress(85, '正在预加载样式和脚本...');
      await this.preloadScriptsAndStyles();
      this.updateProgress(100, '所有资源预加载完成！');

      console.log('所有资源预加载完成！');
      console.log(`预加载资源总数: ${this.preloadedResources.size}`);
      
      // 保存预加载状态到localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('preloadCompleted', Date.now().toString());
        localStorage.setItem('preloadedResourcesCount', this.preloadedResources.size.toString());
      }
    } catch (error) {
      console.error('预加载过程中出现错误:', error);
    } finally {
      this.isPreloading = false;
      // 恢复控制台警告
      console.warn = originalWarn;
    }
  }

  // 预加载PDF字体
  private async preloadFonts(): Promise<void> {
    console.log('预加载PDF字体...');
    
    // 尝试多种字体文件格式
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

        // 直接尝试预加载，不进行HEAD检查
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/ttf';
        link.href = url;
        link.crossOrigin = 'anonymous';
        
        // 设置超时，避免长时间等待
        const timeout = setTimeout(() => {
          console.log(`字体预加载超时: ${url}`);
          resolve();
        }, 5000);
        
        link.onload = () => {
          clearTimeout(timeout);
          console.log(`字体预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        
        link.onerror = () => {
          clearTimeout(timeout);
          console.log(`字体预加载失败: ${url}`);
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
        // 使用多种方式预加载页面
        await this.preloadPageWithMultipleMethods(path);
      } catch (error) {
        console.warn(`页面预加载失败: ${path}`, error);
      }
    });

    await Promise.all(pagePromises);
  }

  // 使用多种方法预加载页面
  private async preloadPageWithMultipleMethods(path: string): Promise<void> {
    try {
      // 方法1: 使用GET请求预加载完整页面内容
      const response = await fetch(path, {
        method: 'GET',
        cache: 'force-cache',
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Cache-Control': 'max-age=3600'
        }
      });
      
      if (response.ok) {
        // 读取响应内容以确保真正预加载
        const content = await response.text();
        console.log(`页面预加载成功: ${path} (${content.length} bytes)`);
        this.preloadedResources.add(path);
        
        // 预加载页面相关的CSS和JS资源
        await this.preloadPageResources(path, content);
      }
      
      // 方法2: 使用Next.js的prefetch功能（如果可用）
      if (typeof window !== 'undefined' && (window as any).__NEXT_DATA__) {
        try {
          // 创建link标签进行预加载
          const link = document.createElement('link');
          link.rel = 'prefetch';
          link.href = path;
          document.head.appendChild(link);
          console.log(`Next.js prefetch成功: ${path}`);
        } catch (error) {
          console.warn(`Next.js prefetch失败: ${path}`, error);
        }
      }
      
      // 方法3: 预加载页面相关的API端点
      await this.preloadPageAPIs(path);
      
    } catch (error) {
      console.warn(`页面预加载失败: ${path}`, error);
    }
  }

  // 预加载页面相关的API端点
  private async preloadPageAPIs(path: string): Promise<void> {
    const apiEndpoints = [
      '/api/auth/get-latest-permissions',
      '/api/auth/update-session-permissions'
    ];
    
    const apiPromises = apiEndpoints.map(async (endpoint) => {
      try {
        const response = await fetch(endpoint, {
          method: 'HEAD',
          cache: 'force-cache'
        });
        
        if (response.ok) {
          console.log(`API端点预加载成功: ${endpoint}`);
          this.preloadedResources.add(endpoint);
        }
      } catch (error) {
        console.warn(`API端点预加载失败: ${endpoint}`, error);
      }
    });
    
    await Promise.all(apiPromises);
  }

  // 预加载页面相关的CSS和JS资源
  private async preloadPageResources(path: string, content: string): Promise<void> {
    try {
      // 从页面内容中提取CSS和JS资源链接
      const cssMatches = content.match(/href="([^"]*\.css[^"]*)"/g);
      const jsMatches = content.match(/src="([^"]*\.js[^"]*)"/g);
      
      const resources: string[] = [];
      
      if (cssMatches) {
        cssMatches.forEach(match => {
          const href = match.match(/href="([^"]*)"/)?.[1];
          if (href && !href.startsWith('http')) {
            resources.push(href);
          }
        });
      }
      
      if (jsMatches) {
        jsMatches.forEach(match => {
          const src = match.match(/src="([^"]*)"/)?.[1];
          if (src && !src.startsWith('http')) {
            resources.push(src);
          }
        });
      }
      
      // 预加载这些资源
      const resourcePromises = resources.map(async (resource) => {
        try {
          const response = await fetch(resource, {
            method: 'GET',
            cache: 'force-cache'
          });
          
          if (response.ok) {
            console.log(`页面资源预加载成功: ${resource}`);
            this.preloadedResources.add(resource);
          }
        } catch (error) {
          console.warn(`页面资源预加载失败: ${resource}`, error);
        }
      });
      
      await Promise.all(resourcePromises);
    } catch (error) {
      console.warn('预加载页面资源时出错:', error);
    }
  }

  // 预加载静态资源
  private async preloadStaticAssets(): Promise<void> {
    console.log('预加载静态资源...');
    
    // 尝试预加载所有可能的静态资源
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

        // 直接尝试预加载，不进行HEAD检查
        const img = new Image();
        
        // 设置超时，避免长时间等待
        const timeout = setTimeout(() => {
          console.log(`静态资源预加载超时: ${url}`);
          resolve();
        }, 3000);
        
        img.onload = () => {
          clearTimeout(timeout);
          console.log(`静态资源预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        img.onerror = () => {
          clearTimeout(timeout);
          console.log(`静态资源预加载失败: ${url}`);
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
          method: 'GET',
          cache: 'force-cache',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cache-Control': 'max-age=3600'
          }
        });
        
        if (response.ok) {
          const content = await response.text();
          console.log(`工具页面预加载成功: ${path} (${content.length} bytes)`);
          this.preloadedResources.add(path);
          
          // 预加载页面相关的CSS和JS资源
          await this.preloadPageResources(path, content);
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
    
    // 尝试预加载所有CSS文件
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

        // 直接尝试预加载，不进行HEAD检查
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.href = url;
        
        // 设置超时，避免长时间等待
        const timeout = setTimeout(() => {
          console.log(`CSS资源预加载超时: ${url}`);
          resolve();
        }, 3000);
        
        link.onload = () => {
          clearTimeout(timeout);
          console.log(`资源预加载成功: ${url}`);
          this.preloadedResources.add(url);
          resolve();
        };
        
        link.onerror = () => {
          clearTimeout(timeout);
          console.log(`资源预加载失败: ${url}`);
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
    
    // 检查预加载资源数量
    const hasPreloadedResources = this.preloadedResources.size > 0;
    
    return fontLoaded && logoLoaded && hasPreloadedResources;
  }

  // 检查特定页面是否已预加载
  isPagePreloaded(pagePath: string): boolean {
    if (typeof window === 'undefined') return false;
    
    // 检查localStorage中的预加载标记
    const preloadCompleted = localStorage.getItem('preloadCompleted');
    if (preloadCompleted) {
      const completedTime = parseInt(preloadCompleted);
      const now = Date.now();
      // 如果预加载完成时间在24小时内，认为有效
      if (now - completedTime < 24 * 60 * 60 * 1000) {
        return this.preloadedResources.has(pagePath);
      }
    }
    
    return false;
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