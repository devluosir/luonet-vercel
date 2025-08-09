'use client';

import { gunzip } from './gunzip';
import { logCacheHit, logCacheMiss } from './pdfLogger';

// 字体版本控制
const FONT_VERSION = '1.0.0';
const ASSET_PREFIX = process.env.NEXT_PUBLIC_ASSET_PREFIX ?? '';

// 安全的 IndexedDB 检查
const hasIDB = () =>
  typeof window !== 'undefined' && 'indexedDB' in window;

// 动态导入 idb-keyval 并提供降级
async function idb() {
  if (!hasIDB()) {
    // 提供最小降级实现，避免服务器/无IDB环境爆炸
    return {
      async get() { return undefined; },
      async set() { /* noop */ },
      async del() { /* noop */ },
    };
  }
  try {
    const m = await import('idb-keyval');
    return { get: m.get, set: m.set, del: m.del };
  } catch (error) {
    console.warn('[fontCache] idb-keyval 加载失败，使用降级方案:', error);
    return {
      async get() { return undefined; },
      async set() { /* noop */ },
      async del() { /* noop */ },
    };
  }
}

// 安全的缓存操作封装
export async function cacheGet<T>(key: string): Promise<T | undefined> {
  const { get } = await idb();
  try { 
    return await get(key); 
  } catch (error) {
    console.warn(`[fontCache] 缓存读取失败 ${key}:`, error);
    return undefined; 
  }
}

export async function cacheSet<T>(key: string, val: T) {
  const { set } = await idb();
  try { 
    await set(key, val); 
  } catch (error) {
    console.warn(`[fontCache] 缓存写入失败 ${key}:`, error);
  }
}

export async function cacheDel(key: string) {
  const { del } = await idb();
  try { 
    await del(key); 
  } catch (error) {
    console.warn(`[fontCache] 缓存删除失败 ${key}:`, error);
  }
}

// 缓存键定义
const CACHE_KEYS = {
  regular: 'NotoSansSC-Regular-1.0.0',
  bold: 'NotoSansSC-Bold-1.0.0',
  regularB64: 'NotoSansSC-Regular-1.0.0__b64',
  boldB64: 'NotoSansSC-Bold-1.0.0__b64',
};

async function fetchBytes(url: string) {
  const res = await fetch(url, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`fetch 失败 ${res.status} ${res.statusText} @ ${url}`);
  const buf = await res.arrayBuffer();
  if (!buf.byteLength) throw new Error(`空响应 @ ${url}`);
  return new Uint8Array(buf);
}

export async function getFontBytes(cacheKey: string, urlGz: string, urlTtfFallback: string): Promise<Uint8Array> {
  const cached = await cacheGet<Uint8Array>(cacheKey);
  if (cached?.byteLength) {
    logCacheHit(cacheKey, cached.byteLength);
    return cached;
  }

  const gzUrl = ASSET_PREFIX + urlGz;
  const startTime = performance.now();

  try {
    const gz = await fetchBytes(gzUrl);
    const bytes = await gunzip(gz);
    await cacheSet(cacheKey, bytes);
    const endTime = performance.now();
    logCacheMiss(`${cacheKey}[gz]`, endTime - startTime);
    return bytes;
  } catch (e) {
    console.warn(`[字体缓存] gz 加载/解压失败，回退 ttf:`, (e as Error)?.message || e);
    const ttfUrl = ASSET_PREFIX + urlTtfFallback;
    const fallbackStart = performance.now();
    const bytes = await fetchBytes(ttfUrl);
    await cacheSet(cacheKey, bytes);
    const fallbackEnd = performance.now();
    logCacheMiss(`${cacheKey}[ttf-fallback]`, fallbackEnd - fallbackStart);
    return bytes;
  }
}

export async function getChineseFontBytes(): Promise<{ regular: Uint8Array; bold: Uint8Array }> {
  const [regular, bold] = await Promise.all([
    getFontBytes(
      'NotoSansSC-Regular-1.0.0',
      '/fonts/compressed/NotoSansSC-Regular.ttf.gz',
      '/fonts/NotoSansSC-Regular.ttf',
    ),
    getFontBytes(
      'NotoSansSC-Bold-1.0.0',
      '/fonts/compressed/NotoSansSC-Bold.ttf.gz',
      '/fonts/NotoSansSC-Bold.ttf',
    ),
  ]);
  return { regular, bold };
}

/**
 * 获取或生成 Base64 编码字体（二级缓存）
 */
export async function getFontBase64(bytesKey: string, b64Key: string, urlGz: string, urlTtfFallback: string): Promise<string> {
  // 1) 先查 Base64 缓存
  const cachedB64 = await cacheGet<string>(b64Key);
  if (cachedB64) {
    logCacheHit(`${b64Key}[b64]`, cachedB64.length);
    return cachedB64;
  }

  // 2) 获取字节数据
  const bytes = await getFontBytes(bytesKey, urlGz, urlTtfFallback);
  
  // 3) 转换为 Base64 并缓存
  const startTime = performance.now();
  const { bytesToBase64 } = await import('./pdfFontRegistry');
  const b64 = bytesToBase64(bytes);
  await cacheSet(b64Key, b64);
  const endTime = performance.now();
  
  logCacheMiss(`${b64Key}[b64-encode]`, endTime - startTime);
  return b64;
}

/**
 * 获取中文字体 Base64 数据（二级缓存优化）
 */
export async function getChineseFontBase64(): Promise<{ regular: string; bold: string }> {
  const [regular, bold] = await Promise.all([
    getFontBase64(
      CACHE_KEYS.regular,
      CACHE_KEYS.regularB64,
      '/fonts/compressed/NotoSansSC-Regular.ttf.gz',
      '/fonts/NotoSansSC-Regular.ttf',
    ),
    getFontBase64(
      CACHE_KEYS.bold,
      CACHE_KEYS.boldB64,
      '/fonts/compressed/NotoSansSC-Bold.ttf.gz',
      '/fonts/NotoSansSC-Bold.ttf',
    ),
  ]);
  return { regular, bold };
}

/**
 * 清除字体缓存
 */
export async function clearFontCache(): Promise<void> {
  try {
    await Promise.all([
      cacheDel(CACHE_KEYS.regular),
      cacheDel(CACHE_KEYS.bold),
      cacheDel(CACHE_KEYS.regularB64),
      cacheDel(CACHE_KEYS.boldB64)
    ]);
    console.log('[字体缓存] 缓存已清除（包含 Base64）');
  } catch (error) {
    console.error('[字体缓存] 清除缓存失败:', error);
  }
}

/**
 * 获取缓存状态
 */
export async function getFontCacheStatus(): Promise<{
  regular: boolean;
  bold: boolean;
  regularB64: boolean;
  boldB64: boolean;
  version: string;
}> {
  try {
    const [regular, bold, regularB64, boldB64] = await Promise.all([
      cacheGet<Uint8Array>(CACHE_KEYS.regular),
      cacheGet<Uint8Array>(CACHE_KEYS.bold),
      cacheGet<string>(CACHE_KEYS.regularB64),
      cacheGet<string>(CACHE_KEYS.boldB64)
    ]);

    return {
      regular: !!regular?.byteLength,
      bold: !!bold?.byteLength,
      regularB64: !!regularB64?.length,
      boldB64: !!boldB64?.length,
      version: FONT_VERSION
    };
  } catch (error) {
    console.error('[字体缓存] 获取状态失败:', error);
    return { regular: false, bold: false, regularB64: false, boldB64: false, version: FONT_VERSION };
  }
}
