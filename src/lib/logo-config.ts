// Logo配置文件 - 统一管理所有logo路径
export const LOGO_CONFIG = {
  // Web应用图标
  web: {
    logo: '/assets/logo/logo.png',
    icon: '/assets/logo/icon.png',
    favicon: '/assets/logo/favicon.ico',
    appleIcon: '/assets/logo/apple-icon.png',
    appstore: '/assets/logo/appstore.png',
    playstore: '/assets/logo/playstore.png'
  },
  
  // iOS App图标
  ios: {
    icon20: '/assets/logo/Assets.xcassets/AppIcon.appiconset/20.png',
    icon29: '/assets/logo/Assets.xcassets/AppIcon.appiconset/29.png',
    icon32: '/assets/logo/Assets.xcassets/AppIcon.appiconset/32.png',
    icon40: '/assets/logo/Assets.xcassets/AppIcon.appiconset/40.png',
    icon48: '/assets/logo/Assets.xcassets/AppIcon.appiconset/48.png',
    icon50: '/assets/logo/Assets.xcassets/AppIcon.appiconset/50.png',
    icon55: '/assets/logo/Assets.xcassets/AppIcon.appiconset/55.png',
    icon57: '/assets/logo/Assets.xcassets/AppIcon.appiconset/57.png',
    icon58: '/assets/logo/Assets.xcassets/AppIcon.appiconset/58.png',
    icon60: '/assets/logo/Assets.xcassets/AppIcon.appiconset/60.png',
    icon64: '/assets/logo/Assets.xcassets/AppIcon.appiconset/64.png',
    icon66: '/assets/logo/Assets.xcassets/AppIcon.appiconset/66.png',
    icon72: '/assets/logo/Assets.xcassets/AppIcon.appiconset/72.png',
    icon76: '/assets/logo/Assets.xcassets/AppIcon.appiconset/76.png',
    icon80: '/assets/logo/Assets.xcassets/AppIcon.appiconset/80.png',
    icon87: '/assets/logo/Assets.xcassets/AppIcon.appiconset/87.png',
    icon88: '/assets/logo/Assets.xcassets/AppIcon.appiconset/88.png',
    icon92: '/assets/logo/Assets.xcassets/AppIcon.appiconset/92.png',
    icon100: '/assets/logo/Assets.xcassets/AppIcon.appiconset/100.png',
    icon102: '/assets/logo/Assets.xcassets/AppIcon.appiconset/102.png',
    icon108: '/assets/logo/Assets.xcassets/AppIcon.appiconset/108.png',
    icon114: '/assets/logo/Assets.xcassets/AppIcon.appiconset/114.png',
    icon120: '/assets/logo/Assets.xcassets/AppIcon.appiconset/120.png',
    icon128: '/assets/logo/Assets.xcassets/AppIcon.appiconset/128.png',
    icon144: '/assets/logo/Assets.xcassets/AppIcon.appiconset/144.png',
    icon152: '/assets/logo/Assets.xcassets/AppIcon.appiconset/152.png',
    icon167: '/assets/logo/Assets.xcassets/AppIcon.appiconset/167.png',
    icon172: '/assets/logo/Assets.xcassets/AppIcon.appiconset/172.png',
    icon180: '/assets/logo/Assets.xcassets/AppIcon.appiconset/180.png',
    icon196: '/assets/logo/Assets.xcassets/AppIcon.appiconset/196.png',
    icon216: '/assets/logo/Assets.xcassets/AppIcon.appiconset/216.png',
    icon234: '/assets/logo/Assets.xcassets/AppIcon.appiconset/234.png',
    icon256: '/assets/logo/Assets.xcassets/AppIcon.appiconset/256.png',
    icon258: '/assets/logo/Assets.xcassets/AppIcon.appiconset/258.png',
    icon512: '/assets/logo/Assets.xcassets/AppIcon.appiconset/512.png',
    icon1024: '/assets/logo/Assets.xcassets/AppIcon.appiconset/1024.png'
  },
  
  // Android App图标
  android: {
    mdpi: '/assets/logo/android/mipmap-mdpi/filenest.png',
    hdpi: '/assets/logo/android/mipmap-hdpi/filenest.png',
    xhdpi: '/assets/logo/android/mipmap-xhdpi/filenest.png',
    xxhdpi: '/assets/logo/android/mipmap-xxhdpi/filenest.png',
    xxxhdpi: '/assets/logo/android/mipmap-xxxhdpi/filenest.png'
  }
};

// 获取所有logo路径的数组
export const getAllLogoPaths = (): string[] => {
  const paths: string[] = [];
  
  // Web图标
  Object.values(LOGO_CONFIG.web).forEach(path => paths.push(path));
  
  // iOS图标 - 选择常用尺寸
  const iosKeys = ['icon48', 'icon72', 'icon128', 'icon144', 'icon152', 'icon167', 'icon180', 'icon512', 'icon1024'];
  iosKeys.forEach(key => {
    if (LOGO_CONFIG.ios[key as keyof typeof LOGO_CONFIG.ios]) {
      paths.push(LOGO_CONFIG.ios[key as keyof typeof LOGO_CONFIG.ios]);
    }
  });
  
  // Android图标
  Object.values(LOGO_CONFIG.android).forEach(path => paths.push(path));
  
  return paths;
};

// 获取manifest.json中使用的图标配置
export const getManifestIcons = () => [
  {
    src: LOGO_CONFIG.web.favicon,
    sizes: '16x16',
    type: 'image/x-icon'
  },
  {
    src: LOGO_CONFIG.web.icon,
    sizes: '32x32',
    type: 'image/png'
  },
  {
    src: LOGO_CONFIG.ios.icon48,
    sizes: '48x48',
    type: 'image/png'
  },
  {
    src: LOGO_CONFIG.ios.icon72,
    sizes: '72x72',
    type: 'image/png'
  },

  {
    src: LOGO_CONFIG.ios.icon128,
    sizes: '128x128',
    type: 'image/png'
  },
  {
    src: LOGO_CONFIG.ios.icon144,
    sizes: '144x144',
    type: 'image/png'
  },
  {
    src: LOGO_CONFIG.ios.icon152,
    sizes: '152x152',
    type: 'image/png'
  },

  {
    src: LOGO_CONFIG.ios.icon256,
    sizes: '256x256',
    type: 'image/png'
  },
  {
    src: LOGO_CONFIG.ios.icon512,
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable'
  },
  {
    src: LOGO_CONFIG.ios.icon1024,
    sizes: '1024x1024',
    type: 'image/png',
    purpose: 'any maskable'
  }
];

// 获取layout.tsx中使用的图标配置
export const getLayoutIcons = () => ({
  icon: [
    { url: LOGO_CONFIG.web.favicon },
    { url: LOGO_CONFIG.web.icon, sizes: '32x32', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon48, sizes: '48x48', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon72, sizes: '72x72', type: 'image/png' },

    { url: LOGO_CONFIG.ios.icon128, sizes: '128x128', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon144, sizes: '144x144', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon152, sizes: '152x152', type: 'image/png' },

    { url: LOGO_CONFIG.ios.icon256, sizes: '256x256', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon512, sizes: '512x512', type: 'image/png' }
  ],
  apple: [
    { url: LOGO_CONFIG.web.appleIcon },
    { url: LOGO_CONFIG.ios.icon120, sizes: '120x120', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon152, sizes: '152x152', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon167, sizes: '167x167', type: 'image/png' },
    { url: LOGO_CONFIG.ios.icon180, sizes: '180x180', type: 'image/png' }
  ]
}); 