'use client';

/**
 * 通用 gzip 解压工具
 * 优先使用浏览器原生 DecompressionStream，兜底使用 pako
 */
export async function gunzip(compressed: Uint8Array): Promise<Uint8Array> {
  // 只在浏览器跑
  if (typeof window === 'undefined') {
    throw new Error('gunzip must run in the browser');
  }

  // 路径1：优先用浏览器原生 DecompressionStream
  if ('DecompressionStream' in window) {
    try {
      const ds = new DecompressionStream('gzip');
      const buffer = new Uint8Array(compressed).buffer;
      const blob = new Blob([buffer]);
      const stream = blob.stream().pipeThrough(ds);
      const out = await new Response(stream).arrayBuffer();
      console.log('[gunzip] 使用浏览器原生 DecompressionStream');
      return new Uint8Array(out);
    } catch (e) {
      console.warn('[gunzip] 原生解压失败，降级到 pako:', (e as Error)?.message || e);
    }
  }

  // 路径2：优先用 pako.ungzip（动态导入）
  try {
    const pako: any = await import('pako');
    const ungzip = pako?.ungzip ?? pako?.default?.ungzip;
    if (typeof ungzip === 'function') {
      const result = ungzip(compressed);
      console.log(`[gunzip] pako 解压成功，输入: ${compressed.length} bytes，输出: ${result.length} bytes`);
      return result;
    }
  } catch (e) {
    console.warn('[gunzip] pako 导入或执行失败:', (e as Error)?.message || e);
    // 继续尝试其他方法，不直接抛出错误
  }

  throw new Error('No gzip decompressor available (pako not loaded, no DecompressionStream)');
}
