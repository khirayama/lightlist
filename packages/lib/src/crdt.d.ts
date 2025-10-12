export interface Clock {
  lamport: number;
  timestamp: number;
  actorId: string;
}
export interface CRDTElement<T> {
  id: string;
  pos: string;
  value: T;
  deleted?: boolean;
  clock: Clock;
}
export type OperationType = 'insert' | 'remove' | 'update' | 'move' | 'obj_set';
export type Operation<T = unknown> =
  | {
      type: 'insert';
      targetId: string;
      pos: string;
      value: T;
      timestamp: number;
      lamport: number;
      actorId: string;
    }
  | {
      type: 'remove';
      targetId: string;
      timestamp: number;
      lamport: number;
      actorId: string;
    }
  | {
      type: 'update';
      targetId: string;
      value: T;
      timestamp: number;
      lamport: number;
      actorId: string;
    }
  | {
      type: 'move';
      targetId: string;
      pos: string;
      timestamp: number;
      lamport: number;
      actorId: string;
    }
  | {
      type: 'obj_set';
      key: string;
      value: unknown;
      timestamp: number;
      lamport: number;
      actorId: string;
    };
export declare class OperationLog<T = unknown> {
  private unsent;
  private applied;
  record(op: Operation<T>): void;
  markApplied(op: Operation<T>): void;
  applyRemote(ops: Operation<T>[]): Operation<T>[];
  exportOperations(): Operation<T>[];
}
export declare class CrdtArray<T> {
  private actorId;
  private lamport;
  private elementsById;
  private orderedIds;
  private log;
  constructor(params: { actorId: string });
  private tick;
  private indexToNeighbors;
  private visibleIds;
  private findOrderedInsertIndexByPos;
  private insertElement;
  private getElementByVisibleIndex;
  insert(index: number, value: T): void;
  remove(index: number): void;
  move(from: number, to: number): void;
  update(index: number, updater: (v: T) => T): void;
  get(index: number): T;
  toArray(): T[];
  applyRemote(ops: Operation<T>[]): Operation<T>[];
  exportOperations(): Operation<T>[];
  toSnapshot(): ArraySnapshotData<T>;
  static fromSnapshot<T>(data: ArraySnapshotData<T>): CrdtArray<T>;
}
export interface ObjectFieldEntry {
  value: unknown;
  clock: Clock;
}
export declare class CrdtObject {
  private actorId;
  private lamport;
  private fields;
  private log;
  constructor(params: { actorId: string });
  private tick;
  set(key: string, value: unknown): void;
  update(key: string, updater: (v: unknown) => unknown): void;
  get<T = unknown>(key: string): T | undefined;
  toJSON(): Record<string, unknown>;
  applyRemote(ops: Operation[]): Operation[];
  exportOperations(): Operation[];
  toSnapshot(): ObjectSnapshotData;
  static fromSnapshot(data: ObjectSnapshotData): CrdtObject;
  private isRemoteNewer;
}
export interface ArraySnapshotData<T> {
  actorId: string;
  lamport: number;
  elements: CRDTElement<T>[];
}
export interface ObjectSnapshotData {
  actorId: string;
  lamport: number;
  fields: Record<string, ObjectFieldEntry>;
}
export type SnapshotData<T = unknown> = {
  array?: ArraySnapshotData<T>;
  object?: ObjectSnapshotData;
};
export declare const Snapshot: {
  create<T>(array?: CrdtArray<T>, object?: CrdtObject): SnapshotData<T>;
  restore<T>(snapshot: SnapshotData<T>): {
    array?: CrdtArray<T>;
    object?: CrdtObject;
  };
};
export declare class Compressor {
  static compress<T>(ops: Operation<T>[]): Operation<T>[];
  static gcArraySnapshot<T>(snap: ArraySnapshotData<T>): ArraySnapshotData<T>;
}
//# sourceMappingURL=crdt.d.ts.map
