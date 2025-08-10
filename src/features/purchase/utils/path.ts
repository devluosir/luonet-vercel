export function getIn<T = any>(obj: any, path: string, fallback?: T): T {
  return path.split('.').reduce((acc, k) => (acc?.[k] ?? undefined), obj) ?? (fallback as T);
}

export function setIn(obj: any, path: string, value: any) {
  const segs = path.split('.');
  const last = segs.pop()!;
  const target = segs.reduce((acc, k) => (acc[k] ??= {}), obj);
  target[last] = value;
  return obj;
}
