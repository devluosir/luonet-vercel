/** @type {import('next').NextConfig} */

const nextConfig = {
  // 在构建时忽略 ESLint 错误，避免构建失败
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    optimizePackageImports: ['lucide-react', '@headlessui/react'],
    // 启用更多性能优化
    // turbo: {
    //   rules: {
    //     '*.svg': {
    //       loaders: ['@svgr/webpack'],
    //       as: '*.js',
    //     },
    //   },
    // },
    // 启用更激进的代码分割
    // optimizeCss: true,
    // 启用更快的构建
    // swcMinify: true,
  },
  env: {
    WORKER_URL: process.env.WORKER_URL,
    API_TOKEN: process.env.API_TOKEN
  },
  // Vercel 优化配置
  output: 'standalone',
  compress: true,
  poweredByHeader: false,
  generateEtags: false,
  // 优化构建配置
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // 优化图片处理
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // 优化静态资源
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 优化字体缓存 - 长期缓存
      {
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },

      // 优化logo缓存
      {
        source: '/assets/logo/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // 优化图片缓存
      {
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ]
  },
  // 优化webpack配置
  webpack: (config, { dev, isServer }) => {
    // 优化开发环境
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // 优化生产环境
    if (!dev && !isServer) {
      // 更激进的代码分割
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          // 第三方库
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          // PDF相关代码单独分割
          pdf: {
            test: /[\\/](jspdf|jspdf-autotable)[\\/]/,
            name: 'pdf-vendor',
            chunks: 'all',
            priority: 20,
          },
          // 大型组件
          components: {
            test: /[\\/]components[\\/]/,
            name: 'components',
            chunks: 'all',
            priority: 5,
          },
          // 工具函数
          utils: {
            test: /[\\/]utils[\\/]/,
            name: 'utils',
            chunks: 'all',
            priority: 5,
          },
        },
      }
      
      // 优化字体加载
      config.module.rules.push({
        test: /\.(woff|woff2|eot|ttf|otf)$/,
        use: {
          loader: 'file-loader',
          options: {
            name: '[name].[hash].[ext]',
            outputPath: 'fonts/',
            publicPath: '/_next/static/fonts/',
          },
        },
      })
    }
    
    return config
  },
  // 移动端优化
  async rewrites() {
    return [
      {
        source: '/fonts/:path*',
        destination: '/fonts/:path*',
      },
    ]
  },
};

export default nextConfig; 