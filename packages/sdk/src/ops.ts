// CRDT ops boundary utilities (no lib/crdt types exposed)
export type UpdateOps = {
  root?: unknown[];
  tasks?: unknown[];
  history?: unknown[];
};

export function encodeOpsBase64(input: unknown): string {
  const json = JSON.stringify(input);
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    return (globalThis as any).Buffer.from(json, 'utf-8').toString('base64');
  }
  // limited fallback (may throw on non-ASCII)
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeBase64Json<T = unknown>(b64: string): T {
  // Try atob first (browser)
  try {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (typeof atob === 'function') {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const txt = decodeURIComponent(escape(atob(b64)));
      return JSON.parse(txt) as T;
    }
  } catch {}
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    const txt = (globalThis as any).Buffer.from(b64, 'base64').toString('utf-8');
    return JSON.parse(txt) as T;
  }
  throw new Error('Base64 decode not supported');
}
