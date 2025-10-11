import { CrdtArray, CrdtObject } from 'lib/crdt';
import { encodeOpsBase64, type UpdateOps } from './ops';

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

export interface TaskListDocDTO {
  id: string;
  name: string;
  background: string;
  createdAt: string;
  updatedAt: string;
  doc?: string;
  tasks?: Task[];
}


type FullState = {
  settings: SettingsDTO | null;
  taskLists: TaskListDocDTO[];
};

interface Task {
  id: string;
  text: string;
  completed: boolean;
  date?: string;
}

type DocEntry = { root: CrdtObject; tasks: CrdtArray<Task> };
const docs = new Map<string, DocEntry>();

function b64decode(input: string): string {
  if (typeof atob === 'function')
    return decodeURIComponent(escape(atob(input)));
  if (typeof (globalThis as any).Buffer !== 'undefined')
    return (globalThis as any).Buffer.from(input, 'base64').toString('utf-8');
  throw new Error('Base64 decode not supported');
}

function importDoc(id: string, base64Doc?: string): void {
  try {
    if (!base64Doc) return;
    const snap = JSON.parse(b64decode(base64Doc));
    const existing = docs.get(id);
    if (existing) {
      const localRoot = existing.root.toSnapshot();
      const localTasks = existing.tasks.toSnapshot();
      const remoteRoot = snap.root;
      const remoteTasks = snap.tasks;
      const useRemoteRoot =
        typeof remoteRoot?.lamport === 'number' &&
        remoteRoot.lamport > (localRoot?.lamport ?? -1);
      const useRemoteTasks =
        typeof remoteTasks?.lamport === 'number' &&
        remoteTasks.lamport > (localTasks?.lamport ?? -1);
      const nextRoot = useRemoteRoot
        ? CrdtObject.fromSnapshot(remoteRoot)
        : existing.root;
      const nextTasks = useRemoteTasks
        ? CrdtArray.fromSnapshot<Task>(remoteTasks)
        : existing.tasks;
      docs.set(id, { root: nextRoot, tasks: nextTasks });
    } else {
      const root = CrdtObject.fromSnapshot(snap.root);
      const tasks = CrdtArray.fromSnapshot<Task>(snap.tasks);
      docs.set(id, { root, tasks });
    }
  } catch {
    docs.set(id, {
      root: new CrdtObject({ actorId: 'sdk' }),
      tasks: new CrdtArray<Task>({ actorId: 'sdk' }),
    });
  }
}

function desiredSort(tasks: Task[], autoSort: boolean): Task[] {
  if (!autoSort) return tasks;
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const aHasDate = !!a.date;
    const bHasDate = !!b.date;
    if (aHasDate !== bHasDate) return aHasDate ? -1 : 1;
    if (aHasDate && bHasDate) return a.date! < b.date! ? -1 : 1;
    return 0;
  });
}

function reorderDocToDesired(doc: DocEntry, autoSort: boolean): boolean {
  if (!autoSort) return false;
  const current = doc.tasks.toArray();
  const desired = desiredSort(current, true);
  const currentIds = current.map(t => t.id);
  const desiredIds = desired.map(t => t.id);
  let moved = false;
  if (currentIds.length !== desiredIds.length) return false;
  for (let i = 0; i < desiredIds.length; i++) {
    const targetId = desiredIds[i]!;
    const j = currentIds.indexOf(targetId);
    if (j === -1) continue;
    if (j !== i) {
      doc.tasks.move(j, i);
      const [x] = currentIds.splice(j, 1);
      currentIds.splice(i, 0, x);
      moved = true;
    }
  }
  return moved;
}

type Listener = (state: FullState) => void;

let state: FullState = { settings: null, taskLists: [] };
const listeners = new Set<Listener>();
let pollTimer: ReturnType<typeof setInterval> | null = null;
let appStateSub: { remove: () => void } | null = null;
let subscribeAppStateChange:
  | ((
      handler: (state: 'active' | 'inactive' | 'background' | string) => void
    ) => { remove: () => void })
  | null = null;
let platformOS: 'android' | 'ios' | 'web' | 'node' | undefined = undefined;

let getTokenFn: (() => Promise<string | null>) | null = null;
let baseUrl: string | null = null;

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


function emit() {
  listeners.forEach(l => l(state));
}

export const store = {
  // config
  configure(
    opts: {
      getToken?: () => Promise<string | null>;
      baseUrl?: string;
      platformOS?: 'android' | 'ios' | 'web' | 'node';
      appStateSubscribe?: (
        handler: (state: 'active' | 'inactive' | 'background' | string) => void
      ) => { remove: () => void };
    } = {}
  ) {
    if (opts.getToken) getTokenFn = opts.getToken;
    if (opts.baseUrl) baseUrl = opts.baseUrl;
    if (opts.platformOS) platformOS = opts.platformOS;
    if (opts.appStateSubscribe)
      subscribeAppStateChange = opts.appStateSubscribe;
  },
  // accessors
  get(): FullState {
    return state;
  },
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    if (state.settings || state.taskLists.length) listener(state);
    return () => listeners.delete(listener);
  },
  // init: fetch settings and task lists in parallel
  async init(): Promise<FullState> {
    const [settings, taskLists] = await Promise.all([
      request<SettingsDTO>('/api/settings', { method: 'GET' }),
      request<TaskListDocDTO[]>('/api/tasklistdocs', { method: 'GET' }),
    ]);
    state = { settings, taskLists: taskLists.map(d => ({ ...d })) };
    for (const d of taskLists) importDoc(d.id, (d as any).doc);
    state = {
      ...state,
      taskLists: state.taskLists.map(d => ({
        ...d,
        tasks: docs.get(d.id)?.tasks.toArray() || [],
      })),
    };
    return state;
  },
  // settings
  async updateSettings(
    patch: Partial<Omit<SettingsDTO, 'id'>>
  ): Promise<SettingsDTO> {
    const prev = state.settings;
    if (prev) {
      state = { ...state, settings: { ...prev, ...patch } as SettingsDTO };
      emit();
    }
    try {
      const updated = await request<SettingsDTO>('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(patch),
      });
      state = { ...state, settings: updated };
      emit();
      return updated;
    } catch (e) {
      // rollback and refetch
      if (prev) state = { ...state, settings: prev };
      emit();
      const s = await request<SettingsDTO>('/api/settings', { method: 'GET' });
      state = { ...state, settings: s };
      emit();
      throw e;
    }
  },
  // task lists
  async refreshTaskLists(): Promise<TaskListDocDTO[]> {
    const lists = await request<TaskListDocDTO[]>('/api/tasklistdocs', {
      method: 'GET',
    });
    state = { ...state, taskLists: lists.map(d => ({ ...d })) };
    for (const d of lists) importDoc(d.id, (d as any).doc);
    state = {
      ...state,
      taskLists: state.taskLists.map(d => ({
        ...d,
        tasks: docs.get(d.id)?.tasks.toArray() || [],
      })),
    };
    return lists;
  },
  async createTaskListDoc(
    name: string,
    background: string = ''
  ): Promise<TaskListDocDTO & { doc: string }> {
    const created = await request<TaskListDocDTO & { doc: string }>(
      '/api/tasklistdocs',
      {
        method: 'POST',
        body: JSON.stringify({ name, background }),
      }
    );
    const exists = state.taskLists.some(tl => tl.id === created.id);
    const nextLists = exists
      ? state.taskLists.map(tl => (tl.id === created.id ? created : tl))
      : [...state.taskLists, created];
    state = { ...state, taskLists: nextLists };
    emit();
    return created;
  },
  async deleteTaskListDoc(taskListId: string): Promise<{ id: string }> {
    const res = await request<{ id: string }>(
      `/api/tasklistdocs/${taskListId}`,
      { method: 'DELETE' }
    );
    state = {
      ...state,
      taskLists: state.taskLists.filter(tl => tl.id !== taskListId),
    };
    emit();
    return res;
  },
  async updateTaskListDoc(
    taskListId: string,
    ops: UpdateOps
  ): Promise<{ id: string; updatedAt: string; doc: string }> {
    const updated = await request<{
      id: string;
      name: string;
      background: string;
      updatedAt: string;
      doc: string;
    }>(`/api/tasklistdocs/${taskListId}`, {
      method: 'PUT',
      body: JSON.stringify({ updates: encodeOpsBase64(ops) }),
    });
    state = {
      ...state,
      taskLists: state.taskLists.map(tl =>
        tl.id === taskListId
          ? { ...tl, updatedAt: updated.updatedAt, doc: updated.doc }
          : tl
      ),
    };
    emit();
    return { id: updated.id, updatedAt: updated.updatedAt, doc: updated.doc };
  },
  startPolling(opts: { intervalMs?: number; appState?: boolean } = {}) {
    const intervalMs = opts.intervalMs ?? 5000;
    const useAppState = opts.appState ?? true;
    if (!pollTimer) {
      pollTimer = setInterval(() => {
        // ignore errors
        this.refreshTaskLists().catch(() => void 0);
      }, intervalMs);
    }
    if (useAppState && !appStateSub && subscribeAppStateChange) {
      appStateSub = subscribeAppStateChange(s => {
        if (s === 'active') this.refreshTaskLists().catch(() => void 0);
      });
    }
  },
  stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }
  },
  async addTask(taskListId: string, text: string): Promise<void> {
    const s = state.settings;
    const doc = docs.get(taskListId);
    if (!doc) return;
    const newTask: Task = { id: `task_${Date.now()}`, text, completed: false };
    const idx =
      (s?.taskInsertPosition ?? 'top') === 'top'
        ? 0
        : doc.tasks.toArray().length;
    doc.tasks.insert(idx, newTask);
    // optimistic UI
    state = {
      ...state,
      taskLists: state.taskLists.map(tl =>
        tl.id === taskListId ? { ...tl, tasks: doc.tasks.toArray() } : tl
      ),
    };
    emit();
    try {
      const ops = { tasks: doc.tasks.exportOperations() } as { tasks?: unknown[] };
      const res = await request<{ id: string; updatedAt: string; doc: string }>(
        `/api/tasklistdocs/${taskListId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: encodeOpsBase64(ops) }),
        }
      );
      importDoc(taskListId, res.doc);
      if (reorderDocToDesired(docs.get(taskListId)!, !!s?.autoSort)) {
        const ops2 = {
          tasks: docs.get(taskListId)!.tasks.exportOperations(),
        } as { tasks?: unknown[] };
        if (ops2.tasks && ops2.tasks.length > 0) {
          const res2 = await request<{
            id: string;
            updatedAt: string;
            doc: string;
          }>(`/api/tasklistdocs/${taskListId}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: encodeOpsBase64(ops2),
            }),
          });
          importDoc(taskListId, res2.doc);
        }
      }
      state = {
        ...state,
        taskLists: state.taskLists.map(tl =>
          tl.id === taskListId
            ? { ...tl, tasks: docs.get(taskListId)!.tasks.toArray() }
            : tl
        ),
      };
      emit();
    } catch {
      // rollback by refresh
      await this.refreshTaskLists();
    }
  },

  async toggleTask(taskListId: string, taskId: string): Promise<void> {
    const s = state.settings;
    const doc = docs.get(taskListId);
    if (!doc) return;
    const arr = doc.tasks.toArray();
    const idx = arr.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    doc.tasks.update(idx, t => ({ ...t, completed: !t.completed }));
    state = {
      ...state,
      taskLists: state.taskLists.map(tl =>
        tl.id === taskListId ? { ...tl, tasks: doc.tasks.toArray() } : tl
      ),
    };
    emit();
    try {
      const ops = { tasks: doc.tasks.exportOperations() } as { tasks?: unknown[] };
      const res = await request<{ id: string; updatedAt: string; doc: string }>(
        `/api/tasklistdocs/${taskListId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: encodeOpsBase64(ops) }),
        }
      );
      importDoc(taskListId, res.doc);
      if (reorderDocToDesired(docs.get(taskListId)!, !!s?.autoSort)) {
        const ops2 = {
          tasks: docs.get(taskListId)!.tasks.exportOperations(),
        } as { tasks?: unknown[] };
        if (ops2.tasks && ops2.tasks.length > 0) {
          const res2 = await request<{
            id: string;
            updatedAt: string;
            doc: string;
          }>(`/api/tasklistdocs/${taskListId}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: encodeOpsBase64(ops2),
            }),
          });
          importDoc(taskListId, res2.doc);
        }
      }
      state = {
        ...state,
        taskLists: state.taskLists.map(tl =>
          tl.id === taskListId
            ? { ...tl, tasks: docs.get(taskListId)!.tasks.toArray() }
            : tl
        ),
      };
      emit();
    } catch {
      await this.refreshTaskLists();
    }
  },

  async deleteTask(taskListId: string, taskId: string): Promise<void> {
    const s = state.settings;
    const doc = docs.get(taskListId);
    if (!doc) return;
    const arr = doc.tasks.toArray();
    const idx = arr.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    doc.tasks.remove(idx);
    state = {
      ...state,
      taskLists: state.taskLists.map(tl =>
        tl.id === taskListId ? { ...tl, tasks: doc.tasks.toArray() } : tl
      ),
    };
    emit();
    try {
      const ops = { tasks: doc.tasks.exportOperations() } as { tasks?: unknown[] };
      const res = await request<{ id: string; updatedAt: string; doc: string }>(
        `/api/tasklistdocs/${taskListId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: encodeOpsBase64(ops) }),
        }
      );
      importDoc(taskListId, res.doc);
      if (reorderDocToDesired(docs.get(taskListId)!, !!s?.autoSort)) {
        const ops2 = {
          tasks: docs.get(taskListId)!.tasks.exportOperations(),
        } as { tasks?: unknown[] };
        if (ops2.tasks && ops2.tasks.length > 0) {
          const res2 = await request<{
            id: string;
            updatedAt: string;
            doc: string;
          }>(`/api/tasklistdocs/${taskListId}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: encodeOpsBase64(ops2),
            }),
          });
          importDoc(taskListId, res2.doc);
        }
      }
      state = {
        ...state,
        taskLists: state.taskLists.map(tl =>
          tl.id === taskListId
            ? { ...tl, tasks: docs.get(taskListId)!.tasks.toArray() }
            : tl
        ),
      };
      emit();
    } catch {
      await this.refreshTaskLists();
    }
  },
  async setTaskDate(
    taskListId: string,
    taskId: string,
    date: string | null
  ): Promise<void> {
    const s = state.settings;
    const doc = docs.get(taskListId);
    if (!doc) return;
    const arr = doc.tasks.toArray();
    const idx = arr.findIndex(t => t.id === taskId);
    if (idx < 0) return;
    doc.tasks.update(idx, t => ({ ...t, date: date || undefined }));
    state = {
      ...state,
      taskLists: state.taskLists.map(tl =>
        tl.id === taskListId ? { ...tl, tasks: doc.tasks.toArray() } : tl
      ),
    };
    emit();
    try {
      const ops = { tasks: doc.tasks.exportOperations() } as { tasks?: unknown[] };
      const res = await request<{ id: string; updatedAt: string; doc: string }>(
        `/api/tasklistdocs/${taskListId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ updates: encodeOpsBase64(ops) }),
        }
      );
      importDoc(taskListId, res.doc);
      if (reorderDocToDesired(docs.get(taskListId)!, !!s?.autoSort)) {
        const ops2 = {
          tasks: docs.get(taskListId)!.tasks.exportOperations(),
        } as { tasks?: unknown[] };
        if (ops2.tasks && ops2.tasks.length > 0) {
          const res2 = await request<{
            id: string;
            updatedAt: string;
            doc: string;
          }>(`/api/tasklistdocs/${taskListId}`, {
            method: 'PUT',
            body: JSON.stringify({
              updates: encodeOpsBase64(ops2),
            }),
          });
          importDoc(taskListId, res2.doc);
        }
      }
      state = {
        ...state,
        taskLists: state.taskLists.map(tl =>
          tl.id === taskListId
            ? { ...tl, tasks: docs.get(taskListId)!.tasks.toArray() }
            : tl
        ),
      };
      emit();
    } catch {
      await this.refreshTaskLists();
    }
  },
};
