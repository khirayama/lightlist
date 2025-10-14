import { CrdtArray, CrdtObject } from '@lightlist/lib';
import type { Prisma } from '@prisma/client';

import { prisma } from '../lib/prisma';

export type Task = {
  id: string;
  text: string;
  completed?: boolean;
  date?: string | null;
};

export type TaskList = {
  id: string;
  name: string;
  background?: string | null;
  tasks: Task[];
  history: string[]; // task.name history for completion suggestions
};

export type TaskListDoc = {
  actorId: string;
  root: CrdtObject;
  tasks: CrdtArray<Task>;
  history: CrdtArray<unknown>;
};

export function createTaskListDoc(actorId: string): TaskListDoc {
  return {
    actorId,
    root: new CrdtObject({ actorId }),
    tasks: new CrdtArray<Task>({ actorId }),
    history: new CrdtArray<unknown>({ actorId }),
  };
}

export function exportSnapshot(doc: TaskListDoc): Uint8Array {
  const snapshot = {
    actorId: doc.actorId,
    root: doc.root.toSnapshot(),
    tasks: doc.tasks.toSnapshot(),
    history: doc.history.toSnapshot(),
  };
  return Buffer.from(JSON.stringify(snapshot));
}

export function importTaskListDoc(
  actorId: string,
  data: Uint8Array | Buffer
): TaskListDoc {
  const base = createTaskListDoc(actorId);
  const snapshot = JSON.parse(Buffer.from(data).toString());

  if (snapshot.root) base.root = CrdtObject.fromSnapshot(snapshot.root);
  if (snapshot.tasks) base.tasks = CrdtArray.fromSnapshot(snapshot.tasks);
  if (snapshot.history) base.history = CrdtArray.fromSnapshot(snapshot.history);
  if (snapshot.actorId) base.actorId = snapshot.actorId as string;
  return base;
}

export function applyUpdates(
  doc: TaskListDoc,
  updates: Uint8Array | Buffer
): void {
  const ops = JSON.parse(Buffer.from(updates).toString());
  if (ops.root) doc.root.applyRemote(ops.root);
  if (ops.tasks) doc.tasks.applyRemote(ops.tasks);
  if (ops.history) doc.history.applyRemote(ops.history);
}

export function toSnapshotBundle(doc: TaskListDoc) {
  return {
    name: (doc.root.get('name') as string) || '',
    background: (doc.root.get('background') as string) || '',
    tasks: doc.tasks.toArray() as unknown as Task[] as Prisma.InputJsonValue,
    history: doc.history.toArray() as Prisma.InputJsonValue,
  };
}

export async function loadOrderCrdt(
  userId: string
): Promise<CrdtArray<string>> {
  const orderDoc = await prisma.taskListDocOrderDoc.upsert({
    where: { userId },
    create: {
      userId,
      doc: Buffer.from(
        JSON.stringify(new CrdtArray<string>({ actorId: userId }).toSnapshot())
      ),
      order: [],
    },
    update: {},
  });
  let crdt = new CrdtArray<string>({ actorId: userId });
  const snapshot = JSON.parse(orderDoc.doc.toString());
  if (snapshot) crdt = CrdtArray.fromSnapshot<string>(snapshot);
  return crdt;
}

export async function saveOrderCrdt(
  userId: string,
  crdt: CrdtArray<string>
): Promise<void> {
  await prisma.taskListDocOrderDoc.upsert({
    where: { userId },
    create: {
      userId,
      doc: Buffer.from(JSON.stringify(crdt.toSnapshot())),
      order: crdt.toArray() as string[],
    },
    update: {
      doc: Buffer.from(JSON.stringify(crdt.toSnapshot())),
      order: crdt.toArray() as string[],
    },
  });
}
