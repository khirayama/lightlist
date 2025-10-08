import { CrdtArray, CrdtObject, Snapshot, type SnapshotData } from '../src';

type Task = { id: string; text: string; completed: boolean; date?: string };
type TaskList = { id: string; name: string; tasks: Task[] };

const fakeDB = new Map<string, SnapshotData<Task>>();

let serverTasks: CrdtArray<Task> | null = null;
let serverMeta: CrdtObject | null = null;

function saveToDB(docId: string) {
  if (!serverTasks || !serverMeta) throw new Error('Server not initialized');
  const snapshot = Snapshot.create(serverTasks, serverMeta);
  fakeDB.set(docId, snapshot);
}

function loadFromDB(docId: string): SnapshotData<Task> | undefined {
  return fakeDB.get(docId);
}

function receiveFromClient(
  docId: string,
  client: { tasks: CrdtArray<Task>; meta: CrdtObject }
) {
  if (!serverTasks || !serverMeta) throw new Error('Server not initialized');

  serverTasks.applyRemote(client.tasks.exportOperations());
  serverMeta.applyRemote(client.meta.exportOperations());
  saveToDB(docId);
}

function loadClientDoc(
  docId: string,
  actorPrefix: string
): { tasks: CrdtArray<Task>; meta: CrdtObject } {
  const snapshot = loadFromDB(docId);
  if (!snapshot) throw new Error('Doc not found');
  const restored = Snapshot.restore<Task>(snapshot);
  const tasks = restored.array!;
  const meta = restored.object!;

  (tasks as any).actorId = `${actorPrefix}-arr`;
  (meta as any).actorId = `${actorPrefix}-obj`;
  return { tasks, meta };
}

function clientEdit(
  docId: string,
  actorPrefix: string,
  edit: (docs: { tasks: CrdtArray<Task>; meta: CrdtObject }) => void
) {
  const client = loadClientDoc(docId, actorPrefix);
  edit(client);
  receiveFromClient(docId, client);
}

function findIndexById(arr: CrdtArray<Task>, id: string): number {
  const list = arr.toArray();
  return list.findIndex(t => t.id === id);
}

function addTask(
  docs: { tasks: CrdtArray<Task> },
  taskId: string,
  text: string
) {
  const task: Task = { id: taskId, text, completed: false };
  docs.tasks.insert(docs.tasks.toArray().length, task);
}

function toggleTask(
  docs: { tasks: CrdtArray<Task> },
  taskId: string,
  completed: boolean
) {
  const idx = findIndexById(docs.tasks, taskId);
  if (idx >= 0) {
    docs.tasks.update(idx, t => ({ ...t, completed }));
  }
}

function moveTask(
  docs: { tasks: CrdtArray<Task> },
  taskId: string,
  beforeTaskId: string | null
) {
  const list = docs.tasks.toArray();
  const from = list.findIndex(t => t.id === taskId);
  const beforeIndex = beforeTaskId
    ? list.findIndex(t => t.id === beforeTaskId)
    : list.length;
  if (from === -1) return;
  const to = beforeIndex > from ? beforeIndex - 1 : beforeIndex;
  docs.tasks.move(from, to);
}

function sortTasks(docs: { tasks: CrdtArray<Task> }) {
  const list = docs.tasks.toArray();
  const sorted = [...list].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    const da = a.date ? new Date(a.date).getTime() : Infinity;
    const db = b.date ? new Date(b.date).getTime() : Infinity;
    if (da !== db) return da - db;
    return list.indexOf(a) - list.indexOf(b);
  });

  let currentOrder = list.map(t => t.id);
  sorted.forEach((task, targetIdx) => {
    const from = currentOrder.indexOf(task.id);
    if (from !== targetIdx) {
      docs.tasks.move(from, targetIdx);

      const [moved] = currentOrder.splice(from, 1);
      currentOrder.splice(targetIdx, 0, moved!);
    }
  });
}

function deleteCompletedTasks(docs: { tasks: CrdtArray<Task> }) {
  const list = docs.tasks.toArray();
  for (let i = list.length - 1; i >= 0; i--) {
    if (list[i]!.completed) docs.tasks.remove(i);
  }
}

function updateTaskText(
  docs: { tasks: CrdtArray<Task> },
  taskId: string,
  newText: string
) {
  const idx = findIndexById(docs.tasks, taskId);
  if (idx >= 0) docs.tasks.update(idx, t => ({ ...t, text: newText }));
}

function setTaskDate(
  docs: { tasks: CrdtArray<Task> },
  taskId: string,
  date: string
) {
  const idx = findIndexById(docs.tasks, taskId);
  if (idx >= 0) docs.tasks.update(idx, t => ({ ...t, date }));
}

function updateTaskListName(docs: { meta: CrdtObject }, newName: string) {
  docs.meta.set('name', newName);
}

function dump(): TaskList {
  const meta = serverMeta!.toJSON() as { id: string; name: string };
  return { id: meta.id, name: meta.name, tasks: serverTasks!.toArray() };
}

function initServer(docId: string) {
  serverTasks = new CrdtArray<Task>({ actorId: 'server-arr' });
  serverMeta = new CrdtObject({ actorId: 'server-obj' });
  serverMeta.set('id', docId);
  serverMeta.set('name', 'New TaskList');
  saveToDB(docId);
}

function usageExample(): void {
  const docId = 'tasklist-1';

  initServer(docId);
  console.log('📋 初期状態:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserA', docs => {
    addTask(docs, 't1', 'Buy milk');
    addTask(docs, 't2', 'Write report');
    updateTaskListName(docs, "UserA's TaskList");
  });
  console.log('📝 UserA: タスク追加 & リスト名変更後:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserB', docs => {
    addTask(docs, 't3', 'Clean desk');
    setTaskDate(docs, 't1', '2024-01-15');
    setTaskDate(docs, 't2', '2024-01-20');
    setTaskDate(docs, 't3', '2024-01-10');
  });
  console.log('🗓️ UserB: タスク追加 & 日付設定後:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserA', docs => {
    updateTaskText(docs, 't1', 'Buy organic milk');
    toggleTask(docs, 't1', true);
    toggleTask(docs, 't3', true);
  });
  console.log('✏️ UserA: テキスト変更 & 完了チェック後:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserB', docs => {
    sortTasks(docs);
  });
  console.log('🔄 UserB: タスクソート後（未完了→完了、日付順）:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserA', docs => {
    moveTask(docs, 't2', null);
  });
  console.log('🔄 UserA: タスク順序変更後（Write reportを末尾に移動）:');
  console.dir(dump(), { depth: null });

  clientEdit(docId, 'UserA', docs => {
    deleteCompletedTasks(docs);
  });
  console.log('🗑️ UserA: 完了済みタスク削除後:');
  console.dir(dump(), { depth: null });

  console.log('✅ 最終状態:');
  console.dir(dump(), { depth: null });
}

usageExample();
