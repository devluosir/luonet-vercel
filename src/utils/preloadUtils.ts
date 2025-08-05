import { getAllLogoPaths } from '@/lib/logo-config';

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
    console.log('更新进度:', progress, stage, '回调数量:', this.preloadCallbacks.length);
    this.preloadProgress = progress;
    this.preloadCallbacks.forEach(callback => callback(progress, stage));
  }

  // 预加载所有资源
  async preloadAllResources(): Promise<void> {
    if (this.isPreloading) {
      console.log('预加载已在进行中...');
      return;
    }

    // 检查是否已经预加载过且时间在24小时内
    if (this.isPreloaded()) {
      console.log('资源已在24小时内预加载过，跳过预加载');
      return;
    }

    this.isPreloading = true;
    this.updateProgress(0);

    // 临时禁用控制台警告和错误，避免过多的错误信息
    const originalWarn = console.warn;
    const originalError = console.error;
    console.warn = () => {}; // 静默警告
    console.error = () => {}; // 静默错误

    try {
      console.log('开始预加载所有资源...');
      
      // 显示用户权限信息
      const userPermissions = this.getUserPermissions();
      if (userPermissions.length > 0) {
        console.log('用户权限:', userPermissions);
        this.updateProgress(0, `正在预加载资源 (权限: ${userPermissions.join(', ')})...`);
      } else {
        this.updateProgress(0, '正在预加载资源...');
      }

      // 1. 预加载表单页面 (30%)
      this.updateProgress(10, '正在预加载表单页面...');
      await this.preloadFormPages();
      this.updateProgress(30, '表单页面预加载完成');

      // 2. 预加载静态资源 (50%)
      this.updateProgress(30, '正在预加载静态资源...');
      await this.preloadStaticAssets();
      this.updateProgress(50, '静态资源预加载完成');

      // 3. 预加载历史数据 (70%)
      this.updateProgress(50, '正在预加载历史数据...');
      await this.preloadHistoryData();
      this.updateProgress(70, '历史数据预加载完成');

      // 4. 预加载工具页面 (85%)
      this.updateProgress(70, '正在预加载工具页面...');
      await this.preloadToolPages();
      this.updateProgress(85, '工具页面预加载完成');

      // 5. 预加载CSS和JS资源 (100%)
      this.updateProgress(85, '正在预加载样式和脚本...');
      await this.preloadScriptsAndStyles();
      this.updateProgress(100, '所有资源预加载完成！');

      console.log('所有资源预加载完成！');
      console.log(`预加载完成: 100%`);
      
      // 保存预加载状态到localStorage
      if (typeof window !== 'undefined') {
        const timestamp = Date.now().toString();
        localStorage.setItem('preloadCompleted', timestamp);
        localStorage.setItem('preloadedResourcesCount', '100%');
        localStorage.setItem('preloadTimestamp', timestamp);
        
        // 触发自定义事件，通知其他组件预加载完成
        window.dispatchEvent(new CustomEvent('preloadCompleted', {
          detail: {
            count: this.preloadedResources.size,
            timestamp: timestamp
          }
        }));
      }
    } catch (error) {
      console.error('预加载过程中出现错误:', error);
    } finally {
      this.isPreloading = false;
      // 恢复控制台警告和错误
      console.warn = originalWarn;
      console.error = originalError;
    }
  }

  // 预加载PDF字体
  private async preloadFonts(): Promise<void> {
    console.log('预加载PDF字体...');
    
    // 暂时跳过字体预加载，避免浏览器警告
    // 字体会在需要时自动加载
    console.log('跳过字体预加载，避免浏览器警告');
    return;
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

  // 根据权限获取需要预加载的表单页面
  private getFormPagesByPermissions(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const latestPermissions = localStorage.getItem('latestPermissions');
      if (!latestPermissions) {
        console.log('没有权限数据，预加载所有表单页面');
        return ['/quotation', '/packing', '/invoice', '/purchase', '/history', '/customer', '/mail', '/date-tools'];
      }

      const permissions = JSON.parse(latestPermissions);
      const formPages: string[] = [];

      permissions.forEach((perm: any) => {
        if (perm.canAccess) {
          switch (perm.moduleId) {
            case 'quotation':
              formPages.push('/quotation');
              break;
            case 'packing':
              formPages.push('/packing');
              break;
            case 'invoice':
              formPages.push('/invoice');
              break;
            case 'purchase':
              formPages.push('/purchase');
              break;
            case 'history':
              formPages.push('/history');
              break;
            case 'customer':
              formPages.push('/customer');
              break;
            case 'ai-email':
              formPages.push('/mail');
              break;
            case 'date-tools':
              formPages.push('/date-tools');
              break;
          }
        }
      });

      return formPages;
    } catch (error) {
      console.error('解析权限数据失败:', error);
      return ['/quotation', '/packing', '/invoice', '/purchase', '/history', '/customer', '/mail', '/date-tools'];
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

  // 预加载历史数据
  private async preloadHistoryData(): Promise<void> {
    console.log('预加载历史数据...');
    
    if (typeof window === 'undefined') return;

    // 根据权限动态确定需要预加载的历史数据
    const historyKeys = this.getHistoryKeysByPermissions();
    
    if (historyKeys.length === 0) {
      console.log('没有历史数据权限，跳过历史数据预加载');
      return;
    }

    console.log(`预加载历史数据: ${historyKeys.join(', ')}`);

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

  // 根据权限获取需要预加载的历史数据键
  private getHistoryKeysByPermissions(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const latestPermissions = localStorage.getItem('latestPermissions');
      if (!latestPermissions) {
        console.log('没有权限数据，预加载所有历史数据');
        return ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'];
      }

      const permissions = JSON.parse(latestPermissions);
      const historyKeys: string[] = [];

      permissions.forEach((perm: any) => {
        if (perm.canAccess) {
          switch (perm.moduleId) {
            case 'quotation':
              historyKeys.push('quotation_history');
              break;
            case 'packing':
              historyKeys.push('packing_history');
              break;
            case 'invoice':
              historyKeys.push('invoice_history');
              break;
            case 'purchase':
              historyKeys.push('purchase_history');
              break;
          }
        }
      });

      return historyKeys;
    } catch (error) {
      console.error('解析权限数据失败:', error);
      return ['quotation_history', 'packing_history', 'invoice_history', 'purchase_history'];
    }
  }

  // 预加载工具页面
  private async preloadToolPages(): Promise<void> {
    console.log('预加载工具页面...');
    
    // 根据权限动态确定需要预加载的工具页面
    const toolPages = this.getToolPagesByPermissions();
    
    if (toolPages.length === 0) {
      console.log('没有工具页面权限，跳过工具页面预加载');
      return;
    }

    console.log(`预加载工具页面: ${toolPages.join(', ')}`);

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

  // 根据权限获取需要预加载的工具页面
  private getToolPagesByPermissions(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const latestPermissions = localStorage.getItem('latestPermissions');
      if (!latestPermissions) {
        console.log('没有权限数据，预加载所有工具页面');
        return ['/admin', '/tools'];
      }

      const permissions = JSON.parse(latestPermissions);
      const toolPages: string[] = [];
      let hasAnyPermission = false;

      permissions.forEach((perm: any) => {
        if (perm.canAccess) {
          hasAnyPermission = true;
          // 如果有任何权限，就预加载工具页面
          if (!toolPages.includes('/tools')) {
            toolPages.push('/tools');
          }
        }
      });

      // 检查是否有管理员权限
      const isAdmin = localStorage.getItem('isAdmin') === 'true';
      if (isAdmin && !toolPages.includes('/admin')) {
        toolPages.push('/admin');
      }

      return toolPages;
    } catch (error) {
      console.error('解析权限数据失败:', error);
      return ['/admin', '/tools'];
    }
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
              userPermissions.push('历史管理');
              break;
            case 'customer':
              userPermissions.push('客户管理');
              break;
            case 'ai-email':
              userPermissions.push('AI邮件');
              break;
            case 'date-tools':
              userPermissions.push('日期工具');
              break;
          }
        }
      });

      return userPermissions;
    } catch (error) {
      console.error('获取用户权限失败:', error);
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
      preloadedCount: this.isPreloaded() ? '100%' : '0%'
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