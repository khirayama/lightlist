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
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeBase64Json<T = unknown>(b64: string): T {
  if (typeof (globalThis as any).Buffer !== 'undefined') {
    const txt = (globalThis as any).Buffer.from(b64, 'base64').toString(
      'utf-8'
    );
    return JSON.parse(txt) as T;
  }
  const txt = decodeURIComponent(escape(atob(b64)));
  return JSON.parse(txt) as T;
}
