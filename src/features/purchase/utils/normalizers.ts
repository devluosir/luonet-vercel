export const safeString = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
export const numberOrZero = (v: unknown) => (isNaN(Number(v)) ? 0 : Number(v));
export const safeBoolean = (v: unknown) => Boolean(v);
export const safeDate = (v: unknown) => {
  if (v instanceof Date) return v;
  if (typeof v === 'string') {
    const date = new Date(v);
    return isNaN(date.getTime()) ? new Date() : date;
  }
  return new Date();
};
