export type Theme = 'system' | 'light' | 'dark';
export type Language = 'ja' | 'en';
export type TaskInsertPosition = 'top' | 'bottom';

export interface SettingsDTO {
  id: string;
  theme: Theme;
  language: Language;
  taskInsertPosition: TaskInsertPosition;
  autoSort: boolean;
}

type Listener = (s: SettingsDTO) => void;

let current: SettingsDTO | null = null;
const listeners = new Set<Listener>();

let getTokenFn: (() => Promise<string | null>) | null = null;
let baseUrl: string | null = null;
let platformOS: 'android' | 'ios' | 'web' | 'node' | undefined = undefined;

function resolveApiUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  try {
    const url = new URL(envUrl);
    const isLocalhost = ['localhost', '127.0.0.1', '0.0.0.0'].includes(
      url.hostname
    );
    if (platformOS === 'android' && isLocalhost) {
      url.hostname = '10.0.2.2';
    }
    const basePath = url.pathname ? url.pathname.replace(/\/$/, '') : '';
    return `${url.protocol}//${url.host}${basePath}`;
  } catch {
    return envUrl.replace(/\/$/, '');
  }
}

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = getTokenFn ? await getTokenFn() : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const url = (baseUrl || resolveApiUrl()) + endpoint;
  const res = await fetch(url, { ...init, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || 'request failed');
  return data.data as T;
}

export const settingsStore = {
  configure(
    opts: {
      getToken?: () => Promise<string | null>;
      baseUrl?: string;
      platformOS?: 'android' | 'ios' | 'web' | 'node';
    } = {}
  ) {
    if (opts.getToken) getTokenFn = opts.getToken;
    if (opts.baseUrl) baseUrl = opts.baseUrl;
    if (opts.platformOS) platformOS = opts.platformOS;
  },
  async init(): Promise<SettingsDTO> {
    const data = await request<SettingsDTO>('/api/settings', { method: 'GET' });
    current = data;
    listeners.forEach(l => l(current!));
    return current!;
  },
  get(): SettingsDTO | null {
    return current;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (current) listener(current);
    return () => listeners.delete(listener);
  },
  async update(patch: Partial<Omit<SettingsDTO, 'id'>>): Promise<SettingsDTO> {
    const prev = current;
    if (current) {
      current = { ...current, ...patch } as SettingsDTO;
      listeners.forEach(l => l(current!));
    }
    try {
      const data = await request<SettingsDTO>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      current = data;
      listeners.forEach(l => l(current!));
      return data;
    } catch (e) {
      if (prev) {
        current = prev;
        listeners.forEach(l => l(current!));
      }
      await this.init();
      throw e;
    }
  },
};

export type { SettingsDTO as Settings };
