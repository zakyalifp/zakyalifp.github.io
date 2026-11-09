export function clock(t: number): string {
  const sign = t < 0 ? '-' : '';
  const a = Math.abs(Math.floor(t));
  return `${sign}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}
export function num(n: number, digits = 2): string {
  return n.toLocaleString('id-ID', { maximumFractionDigits: digits });
}
export function dateStr(iso: string): string {
  try {
    return new Date(iso).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}
export function cx(...c: Array<string | false | null | undefined>): string {
  return c.filter(Boolean).join(' ');
}
