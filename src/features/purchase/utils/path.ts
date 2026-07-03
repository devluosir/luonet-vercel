export function getIn<T = unknown>(obj: unknown, path: string, fallback?: T): T {
  const value = path.split('.').reduce<unknown>((acc, key) => (
    isRecord(acc) ? acc[key] : undefined
  ), obj);

  return (value ?? fallback) as T;
}

export function setIn<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const segs = path.split('.');
  const last = segs.pop();
  if (!last) return obj;
  const target = segs.reduce<Record<string, unknown>>((acc, key) => {
    if (!isRecord(acc[key])) {
      acc[key] = {};
    }
    return acc[key] as Record<string, unknown>;
  }, obj);
  target[last] = value;
  return obj;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
