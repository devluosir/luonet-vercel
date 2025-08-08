/**
 * 通用 gzip 解压工具
 * 优先使用浏览器原生 DecompressionStream，兜底使用 pako
 */
export async function gunzip(compressed: Uint8Array): Promise<Uint8Array> {
  // 1) 原生 gzip 解压（DecompressionStream）
  if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
    try {
      const ds = new DecompressionStream('gzip');
      const stream = new Blob([compressed as BlobPart]).stream().pipeThrough(ds);
      const buf = await new Response(stream).arrayBuffer();
      console.log('[gunzip] 使用浏览器原生 DecompressionStream');
      return new Uint8Array(buf);
    } catch (e) {
      console.warn('[gunzip] 原生解压失败，降级到 pako:', (e as Error)?.message || e);
    }
  }

  // 2) pako 主入口（包含 ungzip）
  try {
    const pako = await import('pako');
    const ungzip = (pako as any).ungzip ?? (pako as any).default?.ungzip;
    if (typeof ungzip !== 'function') throw new Error('pako.ungzip not found');
    const result = ungzip(compressed);
    console.log(`[gunzip] pako 解压成功，输入: ${compressed.length} bytes，输出: ${result.length} bytes`);
    return result;
  } catch (e) {
    const msg = (e as Error)?.message || String(e);
    throw new Error('pako 解压失败: ' + msg);
  }
}
