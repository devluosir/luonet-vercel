import { getAllLogoPaths } from '@/lib/logo-config';

// 预加载工具函数
export class PreloadManager {
  private static instance: PreloadManager;
  private isPreloading = false;
  private preloadProgress = 0;
  private preloadCallbacks: ((progress: number, stage?: string) => void)[] = [];
  private preloadedResources = new Set<string>();
  private hasPreloaded = false; // ✅ 新增：标记是否已经预加载过
  private preloadTriggered = false; // ✅ 新增：标记是否已触发预加载
  private lastPermissionsHash = ''; // ✅ 新增：记录上次权限的哈希值

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
    console.log('更新进度:', progress, stage, '回调数量:', this.preloadCallbacks.length);
    this.preloadProgress = progress;
    this.preloadCallbacks.forEach(callback => callback(progress, stage));
  }

  // ✅ 优化：检查权限是否发生变化
  private checkPermissionsChanged(): boolean {
    try {
      const formPages = this.getFormPagesByPermissions();
      const currentHash = JSON.stringify(formPages.sort());
      
      if (this.lastPermissionsHash === currentHash) {
        // ✅ 优化：进一步减少重复日志
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
          console.log('权限未发生变化，跳过预加载');
        }
        return false;
      }
      
      // ✅ 优化：只在真正变化时输出日志
      if (process.env.NODE_ENV === 'development') {
        console.log('检测到权限变化，需要重新预加载', {
          oldHash: this.lastPermissionsHash,
          newHash: currentHash,
          formPages
        });
      }
      
      this.lastPermissionsHash = currentHash;
      return true;
    } catch (error) {
      console.error('检查权限变化失败:', error);
      return true; // 出错时保守地重新预加载
    }
  }

  // 预加载所有资源
  async preloadAllResources(): Promise<void> {
    // ✅ 优化：检查权限是否发生变化
    if (!this.checkPermissionsChanged()) {
      console.log('权限未变化，跳过预加载');
      return;
    }

    // ✅ 新增：如果已经预加载过，直接返回
    if (this.hasPreloaded) {
      console.log('资源已经预加载过，跳过重复预加载');
      return;
    }

    if (this.isPreloading) {
      console.log('预加载已在进行中，跳过重复请求');
      return;
    }

    this.isPreloading = true;
    this.updateProgress(0, '开始预加载...');

    try {
      // 1. 预加载静态资源（25%）
      await this.preloadStaticAssets();
      this.updateProgress(25);

      // 2. 预加载表单页面（45%）
      await this.preloadFormPages();
      this.updateProgress(45);

      // 3. 预加载CSS和JS资源（65%）
      await this.preloadScriptsAndStyles();
      this.updateProgress(65);

      // 4. 预加载PDF字体（最后一步）
      await this.preloadFonts();
      this.updateProgress(100, '预加载完成');

      // ✅ 新增：标记为已预加载
      this.hasPreloaded = true;
      console.log('所有资源预加载完成');
    } catch (error) {
      console.error('预加载过程中出错:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  // ✅ 优化：延迟预加载方法，只在权限变化时调用
  async delayedPreload(): Promise<void> {
    // ✅ 优化：检查权限是否发生变化
    if (!this.checkPermissionsChanged()) {
      console.log('权限未变化，跳过延迟预加载');
      return;
    }

    // ✅ 新增：如果已经预加载过或已触发，直接返回
    if (this.hasPreloaded || this.preloadTriggered) {
      console.log('预加载已触发或完成，跳过延迟预加载');
      return;
    }

    this.preloadTriggered = true;
    console.log('触发延迟预加载，检查权限数据...');
    
    // 等待一小段时间，确保权限数据已加载
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 检查是否有权限数据
    const formPages = this.getFormPagesByPermissions();
    if (formPages.length > 0) {
      console.log('检测到权限数据，开始延迟预加载');
      await this.preloadAllResources();
    } else {
      console.log('仍未检测到权限数据，跳过延迟预加载');
      this.preloadTriggered = false; // 重置触发状态，允许后续重试
    }
  }

  // ✅ 新增：重置预加载状态，允许重新预加载
  resetPreloadState(): void {
    this.hasPreloaded = false;
    this.isPreloading = false;
    this.preloadProgress = 0;
    this.preloadTriggered = false;
    this.lastPermissionsHash = ''; // ✅ 重置权限哈希
    console.log('预加载状态已重置');
  }

  // ✅ 新增：检查是否需要预加载
  shouldPreload(): boolean {
    return !this.hasPreloaded && !this.isPreloading && !this.preloadTriggered;
  }

  // ✅ 新增：检查是否需要重新预加载（基于权限变化）
  shouldPreloadBasedOnPermissions(): boolean {
    // 如果已经预加载过且权限未变化，不需要重新预加载
    if (this.hasPreloaded && !this.checkPermissionsChanged()) {
      console.log('已预加载且权限未变化，跳过预加载');
      return false;
    }
    
    // 如果正在预加载，不需要重新预加载
    if (this.isPreloading) {
      console.log('正在预加载中，跳过重复请求');
      return false;
    }
    
    // 检查本地缓存是否有效
    if (typeof window !== 'undefined') {
      try {
        const userCache = localStorage.getItem('userCache');
        if (userCache) {
          const cacheData = JSON.parse(userCache);
          const isRecent = cacheData.timestamp && (Date.now() - cacheData.timestamp) < 24 * 60 * 60 * 1000;
          
          if (isRecent && cacheData.permissions && Array.isArray(cacheData.permissions)) {
            console.log('本地缓存有效，检查权限变化');
            return this.checkPermissionsChanged();
          }
        }
      } catch (error) {
        console.error('检查本地缓存失败:', error);
      }
    }
    
    // 默认需要预加载
    return true;
  }

  // 预加载PDF字体
  private async preloadFonts(): Promise<void> {
    console.log('预加载PDF字体（最后一步）...');
    
    // ✅ 修复：检查是否有权限使用PDF功能，使用改进的权限检查
    const formPages = this.getFormPagesByPermissions();
    if (formPages.length === 0) {
      console.log('没有PDF功能权限，跳过字体预加载');
      return;
    }
    
    console.log(`有PDF功能权限，预加载字体。表单页面: ${formPages.join(', ')}`);
    
    try {
      // 确保字体CSS已加载，浏览器会自动处理字体加载
      if (!document.querySelector('link[href*="pdf-fonts.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/pdf-fonts.css'; // 使用public目录的路径
        document.head.appendChild(link);
        
        // 等待CSS加载完成
        await new Promise<void>((resolve) => {
          link.onload = () => {
            console.log('字体CSS加载成功');
            resolve();
          };
          link.onerror = () => {
            console.warn('字体CSS加载失败，但继续执行');
            resolve(); // 即使失败也继续
          };
        });
      }
      
      // 标记字体为已预加载
      this.preloadedResources.add('/fonts/NotoSansSC-Regular.ttf');
      this.preloadedResources.add('/fonts/NotoSansSC-Bold.ttf');
      
      console.log('PDF字体预加载完成（通过CSS自动加载）');
    } catch (error) {
      console.error('字体预加载过程中出错:', error);
      // 即使出错也标记字体为已加载
      this.preloadedResources.add('/fonts/NotoSansSC-Regular.ttf');
      this.preloadedResources.add('/fonts/NotoSansSC-Bold.ttf');
    }
  }

  // 预加载表单页面
  private async preloadFormPages(): Promise<void> {
    console.log('预加载表单页面...');
    
    // 根据权限动态确定需要预加载的页面
    const formPages = this.getFormPagesByPermissions();
    
    if (formPages.length === 0) {
      console.log('没有表单页面权限，跳过表单页面预加载');
      return;
    }

    console.log(`预加载表单页面: ${formPages.join(', ')}`);

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

  // ✅ 优化：根据权限获取表单页面
  private getFormPagesByPermissions(): string[] {
    try {
      // ✅ 优化：从多个来源获取权限数据，确保获取最新数据
      let permissions: any[] = [];
      
      // 1. 尝试从userCache获取
      if (typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            if (cacheData.permissions && Array.isArray(cacheData.permissions)) {
              permissions = cacheData.permissions;
              // ✅ 优化：进一步减少重复日志
              if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
                console.log('从userCache获取权限数据进行预加载');
              }
            }
          }
        } catch (error) {
          console.error('从userCache获取权限数据失败:', error);
        }
      }
      
      // 2. 如果userCache中没有，尝试从latestPermissions获取
      if (permissions.length === 0 && typeof window !== 'undefined') {
        try {
          const latestPermissions = localStorage.getItem('latestPermissions');
          if (latestPermissions) {
            permissions = JSON.parse(latestPermissions);
            // ✅ 优化：进一步减少重复日志
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
              console.log('从latestPermissions获取权限数据进行预加载');
            }
          }
        } catch (error) {
          console.error('从latestPermissions获取权限数据失败:', error);
        }
      }
      
      // 3. 如果还是没有，尝试从全局变量获取
      if (permissions.length === 0 && typeof window !== 'undefined') {
        const globalPermissions = (window as any).__SESSION_PERMISSIONS__;
        if (globalPermissions && Array.isArray(globalPermissions)) {
          permissions = globalPermissions;
          // ✅ 优化：进一步减少重复日志
          if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
            console.log('从全局变量获取权限数据进行预加载');
          }
        }
      }
      
      // 4. 最后尝试从Store获取
      if (permissions.length === 0) {
        try {
          const { usePermissionStore } = require('@/lib/permissions');
          const store = usePermissionStore.getState();
          if (store.user?.permissions) {
            permissions = store.user.permissions;
            // ✅ 优化：进一步减少重复日志
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
              console.log('从Store获取权限数据进行预加载');
            }
          }
        } catch (error) {
          console.error('从Store获取权限数据失败:', error);
        }
      }
      
      // 过滤出有访问权限的模块
      const accessibleModules = permissions
        .filter((p: any) => p.canAccess)
        .map((p: any) => p.moduleId);
      
      // 映射到对应的页面路径
      const formPages = accessibleModules
        .map((moduleId: string) => {
          switch (moduleId) {
            case 'quotation': return '/quotation';
            case 'packing': return '/packing';
            case 'invoice': return '/invoice';
            case 'purchase': return '/purchase';
            default: return null;
          }
        })
        .filter(Boolean) as string[];
      
      return formPages;
    } catch (error) {
      console.error('获取表单页面失败:', error);
      return [];
    }
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
        // 只检查响应状态，不读取完整内容以避免延迟
        console.log(`页面预加载成功: ${path} (状态: ${response.status})`);
      } else {
        console.warn(`页面预加载失败: ${path} (状态: ${response.status})`);
      }
    } catch (error) {
      console.warn(`页面预加载出错: ${path}`, error);
    }
  }

  // 预加载页面相关的API端点
  private async preloadPageAPIs(path: string): Promise<void> {
    // 暂时跳过API端点预加载，因为所有API都只支持POST请求
    // 避免405 Method Not Allowed错误
    console.log('跳过API端点预加载，避免405错误');
    return;
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
    
    // 使用logo配置文件获取所有logo路径
    const staticAssets = getAllLogoPaths();

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

  // 获取用户权限列表
  private getUserPermissions(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const latestPermissions = localStorage.getItem('latestPermissions');
      if (!latestPermissions) {
        return [];
      }

      const permissions = JSON.parse(latestPermissions);
      const userPermissions: string[] = [];

      permissions.forEach((perm: any) => {
        if (perm.canAccess) {
          switch (perm.moduleId) {
            case 'quotation':
              userPermissions.push('报价单');
              break;
            case 'packing':
              userPermissions.push('装箱单');
              break;
            case 'invoice':
              userPermissions.push('发票');
              break;
            case 'purchase':
              userPermissions.push('采购单');
              break;
            case 'history':
              userPermissions.push('历史记录');
              break;
            case 'customer':
              userPermissions.push('客户管理');
              break;
            case 'ai-email':
              userPermissions.push('AI邮件');
              break;
    
              userPermissions.push('日期工具');
              break;
          }
        }
      });

      return userPermissions;
    } catch (error) {
      console.error('解析权限数据失败:', error);
      return [];
    }
  }

  // 预加载CSS和JS资源
  private async preloadScriptsAndStyles(): Promise<void> {
    console.log('预加载CSS和JS资源...');
    
    // 暂时跳过CSS预加载，避免MIME类型错误
    const scriptAndStyleUrls: string[] = [];

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
      hasPreloaded: this.hasPreloaded,
      shouldPreload: this.shouldPreload(),
      shouldPreloadBasedOnPermissions: this.shouldPreloadBasedOnPermissions(),
      preloadTriggered: this.preloadTriggered,
      lastPermissionsHash: this.lastPermissionsHash
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
    
    // 检查预加载资源状态
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
      totalResources: this.isPreloaded() ? '100%' : '0%',
      isPreloading: this.isPreloading,
      progress: this.preloadProgress,
      isCompleted: this.isPreloaded()
    };
  }
}

// 导出单例实例
export const preloadManager = PreloadManager.getInstance(); 