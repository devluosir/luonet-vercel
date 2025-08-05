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

    this.isPreloading = true;
    this.updateProgress(0, '开始预加载资源...');

    try {
      // 获取用户权限
      const permissions = this.getUserPermissions();
      console.log(`用户权限: ${permissions}`);

      this.updateProgress(5, `正在预加载资源 (权限: ${permissions.join(', ')})...`);

      // 异步预加载，不阻塞用户操作
      setTimeout(async () => {
        try {
          // 预加载静态资源（轻量级）
          await this.preloadStaticAssets();
          this.updateProgress(25);

          // 预加载表单页面（轻量级，只检查状态）
          await this.preloadFormPages();
          this.updateProgress(45);

          // 预加载脚本和样式（轻量级）
          await this.preloadScriptsAndStyles();
          this.updateProgress(65);

          // 预加载字体（最后执行）
          await this.preloadFonts();
          this.updateProgress(100, '预加载完成');

          console.log('所有资源预加载完成');
        } catch (error) {
          console.error('预加载过程中出错:', error);
        } finally {
          this.isPreloading = false;
        }
      }, 100); // 延迟100ms开始，让用户先看到界面

    } catch (error) {
      console.error('预加载初始化失败:', error);
      this.isPreloading = false;
    }
  }

  // 预加载PDF字体
  private async preloadFonts(): Promise<void> {
    console.log('预加载PDF字体（最后一步）...');
    
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
            case 'date-tools':
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