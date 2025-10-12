import { CrdtArray, CrdtObject } from '@lightlist/lib';
import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

// 自作CRDTドキュメントのラッパークラス
export class TaskListDocument {
  private root: CrdtObject;
  private tasks: CrdtArray<unknown>;
  private history: CrdtArray<unknown>;
  private actorId: string;

  constructor(actorId: string) {
    this.actorId = actorId;
    this.root = new CrdtObject({ actorId });
    this.tasks = new CrdtArray<unknown>({ actorId });
    this.history = new CrdtArray<unknown>({ actorId });
  }

  getMap(name: string): CrdtObject {
    if (name === 'root') return this.root;
    throw new Error(`Unknown map: ${name}`);
  }

  getMovableList(name: string): CrdtArray<unknown> {
    if (name === 'tasks') return this.tasks;
    if (name === 'history') return this.history;
    throw new Error(`Unknown list: ${name}`);
  }

  export(): Uint8Array {
    const snapshot = {
      actorId: this.actorId,
      root: this.root.toSnapshot(),
      tasks: this.tasks.toSnapshot(),
      history: this.history.toSnapshot(),
    };
    return Buffer.from(JSON.stringify(snapshot));
  }

  import(data: Uint8Array | Buffer): void {
    const snapshot = JSON.parse(Buffer.from(data).toString());

    if (snapshot.root) {
      this.root = CrdtObject.fromSnapshot(snapshot.root);
    }
    if (snapshot.tasks) {
      this.tasks = CrdtArray.fromSnapshot(snapshot.tasks);
    }
    if (snapshot.history) {
      this.history = CrdtArray.fromSnapshot(snapshot.history);
    }

    if (snapshot.actorId) {
      this.actorId = snapshot.actorId;
    }
  }

  applyUpdates(updates: Uint8Array | Buffer): void {
    const ops = JSON.parse(Buffer.from(updates).toString());

    if (ops.root) {
      this.root.applyRemote(ops.root);
    }
    if (ops.tasks) {
      this.tasks.applyRemote(ops.tasks);
    }
    if (ops.history) {
      this.history.applyRemote(ops.history);
    }
  }

  exportOperations(): Uint8Array {
    const ops = {
      root: this.root.exportOperations(),
      tasks: this.tasks.exportOperations(),
      history: this.history.exportOperations(),
    };
    return Buffer.from(JSON.stringify(ops));
  }
}

export function toSnapshotBundle(doc: TaskListDocument) {
  const root = doc.getMap('root');
  const tasks = doc.getMovableList('tasks');
  return {
    name: (root.get('name') as string) || '',
    background: (root.get('background') as string) || '',
    tasks: tasks.toArray() as Prisma.InputJsonValue,
    history: doc.getMovableList('history').toArray() as Prisma.InputJsonValue,
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
