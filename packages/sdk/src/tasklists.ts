export interface TaskListDocDTO {
  id: string;
  name: string;
  background: string;
  createdAt: string;
  updatedAt: string;
  doc?: string; // base64
}

export interface UpdateOps {
  root?: unknown[];
  tasks?: unknown[];
  history?: unknown[];
}

type Listener = (lists: TaskListDocDTO[]) => void;

let current: TaskListDocDTO[] = [];
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
    if (platformOS === 'android' && isLocalhost) url.hostname = '10.0.2.2';
    const basePath = url.pathname ? url.pathname.replace(/\/$/, '') : '';
    return `${url.protocol}//${url.host}${basePath}`;
  } catch {
    return envUrl.replace(/\/$/, '');
  }
}

function base64Encode(input: string): string {
  if (typeof (globalThis as any).Buffer !== 'undefined')
    return (globalThis as any).Buffer.from(input, 'utf-8').toString('base64');
  // limited fallback
  return btoa(unescape(encodeURIComponent(input)));
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

export const taskListsStore = {
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
  get(): TaskListDocDTO[] {
    return current;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (current.length) listener(current);
    return () => listeners.delete(listener);
  },
  async init(): Promise<TaskListDocDTO[]> {
    const lists = await request<TaskListDocDTO[]>('/api/tasklistdocs', {
      method: 'GET',
    });
    current = lists;
    listeners.forEach(l => l(current));
    return current;
  },
  async refresh(): Promise<TaskListDocDTO[]> {
    return this.init();
  },
  async createTaskListDoc(
    name: string,
    background: string = ''
  ): Promise<{ id: string; doc: string } & TaskListDocDTO> {
    const created = await request<{
      id: string;
      name: string;
      background: string;
      createdAt: string;
      updatedAt: string;
      doc: string;
    }>('/api/tasklistdocs', {
      method: 'POST',
      body: JSON.stringify({ name, background }),
    });
    // upsert into cache
    const idx = current.findIndex(x => x.id === created.id);
    const item: TaskListDocDTO = { ...created };
    current =
      idx >= 0
        ? current.map(x => (x.id === item.id ? item : x))
        : [...current, item];
    listeners.forEach(l => l(current));
    return created as any;
  },
  async deleteTaskListDoc(taskListId: string): Promise<{ id: string }> {
    const res = await request<{ id: string }>(
      `/api/tasklistdocs/${taskListId}`,
      { method: 'DELETE' }
    );
    current = current.filter(x => x.id !== taskListId);
    listeners.forEach(l => l(current));
    return res;
  },
  async updateTaskListDoc(
    taskListId: string,
    ops: UpdateOps
  ): Promise<{ id: string; updatedAt: string; doc: string }> {
    const updates = base64Encode(JSON.stringify(ops));
    const updated = await request<{
      id: string;
      name: string;
      background: string;
      updatedAt: string;
      doc: string;
    }>(`/api/tasklistdocs/${taskListId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates }),
    });
    // update cache doc and updatedAt
    current = current.map(x =>
      x.id === taskListId
        ? { ...x, updatedAt: updated.updatedAt, doc: updated.doc }
        : x
    );
    listeners.forEach(l => l(current));
    return { id: updated.id, updatedAt: updated.updatedAt, doc: updated.doc };
  },
};
