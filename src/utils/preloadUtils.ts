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
  private lastCheckTime = 0; // ✅ 新增：记录上次检查时间，用于防抖
  private checkDebounceMs = 1000; // ✅ 新增：检查防抖时间（1秒）
  private permissionCheckCache = new Map<string, { result: boolean | string[]; timestamp: number }>(); // ✅ 新增：权限检查缓存

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

  // ✅ 优化：检查权限是否发生变化（添加防抖和缓存）
  private checkPermissionsChanged(): boolean {
    const now = Date.now();
    
    // 防抖：1秒内不重复检查
    if (now - this.lastCheckTime < this.checkDebounceMs) {
      return false;
    }
    
    this.lastCheckTime = now;
    
    try {
      const formPages = this.getFormPagesByPermissions();
      const currentHash = JSON.stringify(formPages.sort());
      
      // 检查缓存
      const cacheKey = `permissions_${currentHash}`;
      const cached = this.permissionCheckCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < 5000) { // 5秒缓存
        return cached.result as boolean;
      }
      
      // ✅ 优化：如果权限数据为空，不触发预加载
      if (formPages.length === 0) {
        // 缓存结果
        this.permissionCheckCache.set(cacheKey, { result: false, timestamp: now });
        return false;
      }
      
      if (this.lastPermissionsHash === currentHash) {
        // 缓存结果
        this.permissionCheckCache.set(cacheKey, { result: false, timestamp: now });
        return false;
      }

      this.lastPermissionsHash = currentHash;
      
      // 缓存结果
      this.permissionCheckCache.set(cacheKey, { result: true, timestamp: now });
      return true;
    } catch (error) {
      console.error('检查权限变化失败:', error);
      return false; // 出错时不重新预加载，避免无限循环
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
      // 1. 预加载静态资源（50%）
      await this.preloadStaticAssets();
      this.updateProgress(50);

      // 2. 预加载PDF字体（最后一步）
      await this.preloadFonts();
      this.updateProgress(100, '预加载完成');

      // ✅ 新增：标记为已预加载
      this.hasPreloaded = true;
      
      // ✅ 新增：设置localStorage标记
      if (typeof window !== 'undefined') {
        localStorage.setItem('preloadCompleted', Date.now().toString());
      }
      
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
    
    // 等待一小段时间，确保权限数据已加载
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // 检查是否有权限数据
    const formPages = this.getFormPagesByPermissions();
    if (formPages.length > 0) {
      await this.preloadAllResources();
    } else {
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
    this.lastCheckTime = 0; // ✅ 重置检查时间
    this.permissionCheckCache.clear(); // ✅ 清理权限检查缓存
    console.log('预加载状态已重置');
  }

  // ✅ 新增：检查是否需要预加载
  shouldPreload(): boolean {
    return !this.hasPreloaded && !this.isPreloading && !this.preloadTriggered;
  }

  // ✅ 优化：检查是否需要重新预加载（基于权限变化，添加防抖）
  shouldPreloadBasedOnPermissions(): boolean {
    const now = Date.now();
    
    // 防抖：1秒内不重复检查
    if (now - this.lastCheckTime < this.checkDebounceMs) {
      return false;
    }
    
    // 如果已经预加载过且权限未变化，不需要重新预加载
    if (this.hasPreloaded && !this.checkPermissionsChanged()) {
      // ✅ 优化：减少日志频率
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        console.log('已预加载且权限未变化，跳过预加载');
      }
      return false;
    }
    
    // 如果正在预加载，不需要重新预加载
    if (this.isPreloading) {
      // ✅ 优化：减少日志频率
      if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
        console.log('正在预加载中，跳过重复请求');
      }
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
            // ✅ 优化：减少日志频率
            if (process.env.NODE_ENV === 'development' && Math.random() < 0.01) {
              console.log('本地缓存有效，检查权限变化');
            }
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

  // ✅ 优化：根据权限获取表单页面（添加缓存）
  private getFormPagesByPermissions(): string[] {
    const now = Date.now();
    const cacheKey = 'formPagesCache';
    
    // 检查缓存（5秒有效期）
    if (this.permissionCheckCache.has(cacheKey)) {
      const cached = this.permissionCheckCache.get(cacheKey);
      if (cached && (now - cached.timestamp) < 5000) {
        return cached.result as string[];
      }
    }
    
    try {
      // ✅ 优化：从多个来源获取权限数据，确保获取最新数据
      let permissions: Array<{ moduleId: string; canAccess: boolean }> = [];
      
      // 1. 尝试从userCache获取
      if (typeof window !== 'undefined') {
        try {
          const userCache = localStorage.getItem('userCache');
          if (userCache) {
            const cacheData = JSON.parse(userCache);
            if (cacheData.permissions && Array.isArray(cacheData.permissions)) {
              permissions = cacheData.permissions;
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
          }
        } catch (error) {
          console.error('从latestPermissions获取权限数据失败:', error);
        }
      }
      
      // 3. 如果还是没有，尝试从全局变量获取
      if (permissions.length === 0 && typeof window !== 'undefined') {
        const globalPermissions = (window as { __SESSION_PERMISSIONS__?: unknown }).__SESSION_PERMISSIONS__;
        if (globalPermissions && Array.isArray(globalPermissions)) {
          permissions = globalPermissions;
        }
      }
      
      // 4. 最后尝试从Store获取
      if (permissions.length === 0) {
        try {
          const { usePermissionStore } = require('@/lib/permissions');
          const store = usePermissionStore.getState();
          if (store.user?.permissions) {
            permissions = store.user.permissions;
          }
        } catch (error) {
          console.error('从Store获取权限数据失败:', error);
        }
      }
      
      // ✅ 优化：如果权限数据为空，直接返回空数组，不输出日志
      if (permissions.length === 0) {
        // 缓存空结果
        this.permissionCheckCache.set(cacheKey, { result: [], timestamp: now });
        return [];
      }
      
      // 过滤出有访问权限的模块
      const accessibleModules = permissions
        .filter((p: { moduleId: string; canAccess: boolean }) => p.canAccess)
        .map((p: { moduleId: string; canAccess: boolean }) => p.moduleId);
      
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
      
      // 缓存结果
      this.permissionCheckCache.set(cacheKey, { result: formPages, timestamp: now });
      
      return formPages;
    } catch (error) {
      console.error('获取表单页面失败:', error);
      return [];
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
    
    // 首先检查内存中的标记
    if (this.hasPreloaded) {
      return true;
    }
    
    // 检查localStorage中的预加载标记
    const preloadCompleted = localStorage.getItem('preloadCompleted');
    if (preloadCompleted) {
      const completedTime = parseInt(preloadCompleted);
      const now = Date.now();
      // 如果预加载完成时间在24小时内，认为有效
      if (now - completedTime < 24 * 60 * 60 * 1000) {
        // 同步内存状态
        this.hasPreloaded = true;
        return true;
      }
    }
    
    // 检查关键资源是否已加载（作为备用检查）
    const fontLoaded = document.fonts.check('12px "Noto Sans SC"');
    
    // 检查预加载资源状态 - 只要有预加载的资源就认为有效
    const hasPreloadedResources = this.preloadedResources.size > 0;
    
    // 检查是否有任何页面被预加载
    const hasPreloadedPages = Array.from(this.preloadedResources).some(resource => 
      resource.startsWith('/quotation') || 
      resource.startsWith('/invoice') || 
      resource.startsWith('/packing') || 
      resource.startsWith('/purchase') || 
      resource.startsWith('/customer')
    );
    
    // 如果字体已加载或有预加载的资源，认为已预加载
    const isPreloaded = fontLoaded || hasPreloadedResources || hasPreloadedPages;
    
    // 如果检测到已预加载，同步状态
    if (isPreloaded && !this.hasPreloaded) {
      this.hasPreloaded = true;
      localStorage.setItem('preloadCompleted', Date.now().toString());
    }
    
    return isPreloaded;
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
      isPreloading: this.isPreloading,
      progress: this.preloadProgress,
      isCompleted: this.isPreloaded()
    };
  }
}

// 导出单例实例
export const preloadManager = PreloadManager.getInstance(); 
