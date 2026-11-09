/** Akses localStorage yang aman (tidak melempar error di mode privat). */
export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh/diblokir — abaikan */
  }
}
export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* abaikan */
  }
}
