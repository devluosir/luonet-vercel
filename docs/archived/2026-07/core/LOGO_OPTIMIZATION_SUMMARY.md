# Logo路径优化总结

## 优化内容

### 1. 创建了统一的Logo配置文件
- 新建了 `src/lib/logo-config.ts` 文件
- 统一管理所有logo路径，包括Web、iOS和Android图标
- 提供了便捷的配置函数

### 2. 更新了manifest.json
- 添加了更多尺寸的图标配置
- 包含了从16x16到1024x1024的各种尺寸
- 支持maskable图标用于PWA

### 3. 优化了layout.tsx
- 使用logo配置文件管理图标
- 添加了更多尺寸的图标支持
- 改进了iOS和Android图标的配置

### 4. 更新了preloadUtils.ts
- 使用logo配置文件获取所有logo路径
- 自动预加载所有logo资源
- 包括Web、iOS和Android图标

### 5. 更新了组件中的logo引用
- Header.tsx: 使用logo配置
- page.tsx: 使用logo配置
- 统一了logo路径管理

## Logo文件结构

```
public/assets/logo/
├── logo.png                    # 主logo
├── icon.png                    # 32x32图标
├── favicon.ico                 # 网站图标
├── apple-icon.png              # Apple图标
├── appstore.png               # App Store图标
├── playstore.png              # Play Store图标
├── android/                   # Android图标
│   ├── mipmap-mdpi/
│   ├── mipmap-hdpi/
│   ├── mipmap-xhdpi/
│   ├── mipmap-xxhdpi/
│   └── mipmap-xxxhdpi/
└── Assets.xcassets/           # iOS图标
    └── AppIcon.appiconset/
        ├── 16.png
        ├── 20.png
        ├── 29.png
        ├── 32.png
        ├── 40.png
        ├── 48.png
        ├── 50.png
        ├── 55.png
        ├── 57.png
        ├── 58.png
        ├── 60.png
        ├── 64.png
        ├── 66.png
        ├── 72.png
        ├── 76.png
        ├── 80.png
        ├── 87.png
        ├── 88.png
        ├── 92.png
        ├── 100.png
        ├── 102.png
        ├── 108.png
        ├── 114.png
        ├── 120.png
        ├── 128.png
        ├── 144.png
        ├── 152.png
        ├── 167.png
        ├── 172.png
        ├── 180.png
        ├── 196.png
        ├── 216.png
        ├── 234.png
        ├── 256.png
        ├── 258.png
        ├── 512.png
        └── 1024.png
```

## 配置函数

### getAllLogoPaths()
返回所有logo路径的数组，用于预加载

### getManifestIcons()
返回manifest.json中使用的图标配置

### getLayoutIcons()
返回layout.tsx中使用的图标配置

## 优化效果

1. **统一管理**: 所有logo路径都在一个配置文件中管理
2. **易于维护**: 修改logo路径只需要更新配置文件
3. **完整支持**: 支持Web、iOS和Android的所有图标尺寸
4. **自动预加载**: 所有logo资源都会被自动预加载
5. **PWA支持**: 完整的PWA图标配置，支持各种设备

## 使用示例

```typescript
import { LOGO_CONFIG, getAllLogoPaths } from '@/lib/logo-config';

// 使用主logo
const logoPath = LOGO_CONFIG.web.logo;

// 获取所有logo路径用于预加载
const allPaths = getAllLogoPaths();
```

## 注意事项

1. 确保所有logo文件都存在于正确的路径
2. 图标尺寸应该与配置中的尺寸匹配
3. 预加载功能会自动处理不存在的文件
4. 配置文件中的路径都是相对于public目录的 