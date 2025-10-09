const POS_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz' as const;
const POS_BASE = POS_ALPHABET.length;

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

function comparePos(a: string, b: string): number {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const ca = a.charCodeAt(i);
    const cb = b.charCodeAt(i);

    if (Number.isNaN(ca)) return -1;
    if (Number.isNaN(cb)) return 1;
    if (ca === cb) continue;
    return ca < cb ? -1 : 1;
  }
  return 0;
}

function charToDigit(ch: string): number {
  const idx = POS_ALPHABET.indexOf(ch as (typeof POS_ALPHABET)[number]);
  if (idx === -1) throw new Error(`Invalid pos char: ${ch}`);

  return idx + 1;
}

function digitToChar(d: number): string {
  if (d <= 0 || d > POS_BASE) throw new Error(`Invalid digit: ${d}`);
  return POS_ALPHABET[d - 1];
}

function decodePos(pos: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < pos.length; i++) out.push(charToDigit(pos[i]!));
  return out;
}

function encodePos(digits: number[]): string {
  let out = '';
  for (const d of digits) out += digitToChar(d);
  return out;
}

function generatePosBetween(
  a: string | undefined,
  b: string | undefined
): string {
  const A = a ? decodePos(a) : [];
  const B = b ? decodePos(b) : [];
  const boundaryLow = 0;
  const boundaryHigh = POS_BASE + 1;

  const result: number[] = [];
  let i = 0;

  while (true) {
    const ai = i < A.length ? A[i]! : boundaryLow;
    const bi = i < B.length ? B[i]! : boundaryHigh;

    if (bi - ai > 1) {
      const mid = Math.floor((ai + bi) / 2);
      if (mid <= 0 || mid >= boundaryHigh) {
        result.push(ai);
        i++;
        continue;
      }

      if (mid > 0 && mid <= POS_BASE) result.push(mid);
      return encodePos(result);
    }

    if (ai > 0 && ai <= POS_BASE) result.push(ai);
    i++;
  }
}

function makeElemId(actorId: string, lamport: number): string {
  return `${actorId}:${lamport}`;
}

export class OperationLog<T = unknown> {
  private unsent: Operation<T>[] = [];
  private applied: Set<string> = new Set();

  record(op: Operation<T>): void {
    const key = `${op.actorId}:${op.lamport}`;
    if (this.applied.has(key)) return;
    this.applied.add(key);
    this.unsent.push(op);
  }

  markApplied(op: Operation<T>): void {
    const key = `${op.actorId}:${op.lamport}`;
    this.applied.add(key);
  }

  applyRemote(ops: Operation<T>[]): Operation<T>[] {
    const newOnes: Operation<T>[] = [];
    for (const op of ops) {
      const key = `${op.actorId}:${op.lamport}`;
      if (this.applied.has(key)) continue;
      this.applied.add(key);
      newOnes.push(op);
    }
    return newOnes;
  }

  exportOperations(): Operation<T>[] {
    const out = this.unsent.slice();
    this.unsent.length = 0;
    return out;
  }
}

export class CrdtArray<T> {
  private actorId: string;
  private lamport = 0;
  private elementsById: Map<string, CRDTElement<T>> = new Map();
  private orderedIds: string[] = [];
  private log: OperationLog<T> = new OperationLog<T>();

  constructor(params: { actorId: string }) {
    this.actorId = params.actorId;
  }

  private tick(remoteLamport?: number): Clock {
    this.lamport = Math.max(this.lamport, remoteLamport ?? 0) + 1;
    return {
      lamport: this.lamport,
      timestamp: Date.now(),
      actorId: this.actorId,
    };
  }

  private indexToNeighbors(index: number): { left?: string; right?: string } {
    const visible = this.visibleIds();
    const leftId = index > 0 ? visible[index - 1] : undefined;
    const rightId = index < visible.length ? visible[index] : undefined;
    return { left: leftId, right: rightId };
  }

  private visibleIds(): string[] {
    const ids: string[] = [];
    for (const id of this.orderedIds) {
      const el = this.elementsById.get(id);
      if (el && !el.deleted) ids.push(id);
    }
    return ids;
  }

  private findOrderedInsertIndexByPos(pos: string): number {
    let lo = 0;
    let hi = this.orderedIds.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      const midEl = this.elementsById.get(this.orderedIds[mid]!);
      if (!midEl) {
        lo = mid + 1;
        continue;
      }
      const cmp = comparePos(midEl.pos, pos);
      if (cmp < 0) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }

  private insertElement(el: CRDTElement<T>): void {
    this.elementsById.set(el.id, el);
    const idx = this.findOrderedInsertIndexByPos(el.pos);
    this.orderedIds.splice(idx, 0, el.id);
  }

  private getElementByVisibleIndex(index: number): CRDTElement<T> {
    const visible = this.visibleIds();
    const id = visible[index];
    if (!id) throw new Error('Index out of bounds');
    const el = this.elementsById.get(id);
    if (!el) throw new Error('Element not found');
    return el;
  }

  insert(index: number, value: T): void {
    const clock = this.tick();
    const { left, right } = this.indexToNeighbors(index);
    const leftPos = left ? this.elementsById.get(left)?.pos : undefined;
    const rightPos = right ? this.elementsById.get(right)?.pos : undefined;
    const pos = generatePosBetween(leftPos, rightPos);
    const id = makeElemId(clock.actorId, clock.lamport);
    const el: CRDTElement<T> = { id, pos, value, clock };
    this.insertElement(el);
    const op: Operation<T> = {
      type: 'insert',
      targetId: id,
      pos,
      value,
      timestamp: clock.timestamp,
      lamport: clock.lamport,
      actorId: clock.actorId,
    };
    this.log.record(op);
  }

  remove(index: number): void {
    const el = this.getElementByVisibleIndex(index);
    if (el.deleted) return;
    const clock = this.tick();
    el.deleted = true;
    const op: Operation<T> = {
      type: 'remove',
      targetId: el.id,
      timestamp: clock.timestamp,
      lamport: clock.lamport,
      actorId: clock.actorId,
    };
    this.log.record(op);
  }

  move(from: number, to: number): void {
    const el = this.getElementByVisibleIndex(from);
    const clock = this.tick();

    const prevDeleted = el.deleted;
    el.deleted = true;
    const { left, right } = this.indexToNeighbors(to);
    el.deleted = prevDeleted;

    const leftPos = left ? this.elementsById.get(left)?.pos : undefined;
    const rightPos = right ? this.elementsById.get(right)?.pos : undefined;
    const newPos = generatePosBetween(leftPos, rightPos);

    const currentIndex = this.orderedIds.indexOf(el.id);
    if (currentIndex >= 0) this.orderedIds.splice(currentIndex, 0);

    if (currentIndex >= 0) this.orderedIds.splice(currentIndex, 1);
    el.pos = newPos;
    const idx = this.findOrderedInsertIndexByPos(newPos);
    this.orderedIds.splice(idx, 0, el.id);

    const op: Operation<T> = {
      type: 'move',
      targetId: el.id,
      pos: newPos,
      timestamp: clock.timestamp,
      lamport: clock.lamport,
      actorId: clock.actorId,
    };
    this.log.record(op);
  }

  update(index: number, updater: (v: T) => T): void {
    const el = this.getElementByVisibleIndex(index);
    const clock = this.tick();
    const newValue = updater(el.value);

    if (
      el.clock.lamport < clock.lamport ||
      (el.clock.lamport === clock.lamport && el.clock.actorId < clock.actorId)
    ) {
      el.value = newValue;
      el.clock = clock;
    }
    const op: Operation<T> = {
      type: 'update',
      targetId: el.id,
      value: newValue,
      timestamp: clock.timestamp,
      lamport: clock.lamport,
      actorId: clock.actorId,
    };
    this.log.record(op);
  }

  get(index: number): T {
    const el = this.getElementByVisibleIndex(index);
    return el.value;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (const id of this.orderedIds) {
      const el = this.elementsById.get(id);
      if (el && !el.deleted) out.push(el.value);
    }
    return out;
  }

  applyRemote(ops: Operation<T>[]): Operation<T>[] {
    const fresh = this.log.applyRemote(ops);
    for (const op of fresh) {
      this.tick(op.lamport);
      switch (op.type) {
        case 'insert': {
          if (!op.targetId || !op.pos) break;
          if (this.elementsById.has(op.targetId)) break;
          const el: CRDTElement<T> = {
            id: op.targetId,
            pos: op.pos,
            value: op.value as T,
            deleted: false,
            clock: {
              lamport: op.lamport,
              timestamp: op.timestamp,
              actorId: op.actorId,
            },
          };
          this.insertElement(el);
          break;
        }
        case 'remove': {
          const el = this.elementsById.get(op.targetId!);
          if (el) el.deleted = true;
          break;
        }
        case 'update': {
          const el = this.elementsById.get(op.targetId!);
          if (!el) break;
          const remoteClock: Clock = {
            lamport: op.lamport,
            timestamp: op.timestamp,
            actorId: op.actorId,
          };
          const local = el.clock;
          if (
            local.lamport < remoteClock.lamport ||
            (local.lamport === remoteClock.lamport &&
              local.actorId < remoteClock.actorId)
          ) {
            el.value = op.value as T;
            el.clock = remoteClock;
          }
          break;
        }
        case 'move': {
          const el = this.elementsById.get(op.targetId!);
          if (!el || !op.pos) break;
          const currentIndex = this.orderedIds.indexOf(el.id);
          if (currentIndex >= 0) this.orderedIds.splice(currentIndex, 1);
          el.pos = op.pos;
          const idx = this.findOrderedInsertIndexByPos(op.pos);
          this.orderedIds.splice(idx, 0, el.id);
          break;
        }
        case 'obj_set':
          break;
      }
    }
    return fresh;
  }

  exportOperations(): Operation<T>[] {
    return this.log.exportOperations();
  }

  toSnapshot(): ArraySnapshotData<T> {
    const elements: CRDTElement<T>[] = [];
    for (const id of this.orderedIds) {
      const el = this.elementsById.get(id);
      if (el) elements.push({ ...el });
    }
    return {
      actorId: this.actorId,
      lamport: this.lamport,
      elements,
    };
  }

  static fromSnapshot<T>(data: ArraySnapshotData<T>): CrdtArray<T> {
    const arr = new CrdtArray<T>({ actorId: data.actorId });
    arr.lamport = data.lamport;
    for (const el of data.elements) {
      arr.elementsById.set(el.id, { ...el });
      arr.orderedIds.push(el.id);
    }

    arr.orderedIds.sort((a, b) => {
      const ea = arr.elementsById.get(a)!;
      const eb = arr.elementsById.get(b)!;
      return comparePos(ea.pos, eb.pos);
    });
    return arr;
  }
}

export interface ObjectFieldEntry {
  value: unknown;
  clock: Clock;
}

export class CrdtObject {
  private actorId: string;
  private lamport = 0;
  private fields: Map<string, ObjectFieldEntry> = new Map();
  private log: OperationLog = new OperationLog();

  constructor(params: { actorId: string }) {
    this.actorId = params.actorId;
  }

  private tick(remoteLamport?: number): Clock {
    this.lamport = Math.max(this.lamport, remoteLamport ?? 0) + 1;
    return {
      lamport: this.lamport,
      timestamp: Date.now(),
      actorId: this.actorId,
    };
  }

  set(key: string, value: unknown): void {
    const clock = this.tick();
    const prev = this.fields.get(key);
    if (!prev || this.isRemoteNewer(prev.clock, clock)) {
      this.fields.set(key, { value, clock });
    }
    const op: Operation = {
      type: 'obj_set',
      key,
      value,
      timestamp: clock.timestamp,
      lamport: clock.lamport,
      actorId: clock.actorId,
    };
    this.log.record(op);
  }

  update(key: string, updater: (v: unknown) => unknown): void {
    const cur = this.fields.get(key)?.value;
    this.set(key, updater(cur));
  }

  get<T = unknown>(key: string): T | undefined {
    return this.fields.get(key)?.value as T | undefined;
  }

  toJSON(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    this.fields.forEach((v, k) => {
      out[k] = v.value;
    });
    return out;
  }

  applyRemote(ops: Operation[]): Operation[] {
    const fresh = this.log.applyRemote(ops);
    for (const op of fresh) {
      this.tick(op.lamport);
      if (op.type !== 'obj_set') continue;
      const remoteClock: Clock = {
        lamport: op.lamport,
        timestamp: op.timestamp,
        actorId: op.actorId,
      };
      const prev = this.fields.get(op.key!);
      if (!prev || this.isRemoteNewer(prev.clock, remoteClock)) {
        this.fields.set(op.key!, { value: op.value, clock: remoteClock });
      }
    }
    return fresh;
  }

  exportOperations(): Operation[] {
    return this.log.exportOperations();
  }

  toSnapshot(): ObjectSnapshotData {
    const fields: Record<string, ObjectFieldEntry> = {};
    this.fields.forEach((v, k) => {
      fields[k] = { value: v.value, clock: { ...v.clock } };
    });
    return { actorId: this.actorId, lamport: this.lamport, fields };
  }

  static fromSnapshot(data: ObjectSnapshotData): CrdtObject {
    const obj = new CrdtObject({ actorId: data.actorId });
    obj.lamport = data.lamport;
    for (const [k, v] of Object.entries(data.fields))
      obj.fields.set(k, { value: v.value, clock: { ...v.clock } });
    return obj;
  }

  private isRemoteNewer(local: Clock, remote: Clock): boolean {
    return (
      local.lamport < remote.lamport ||
      (local.lamport === remote.lamport && local.actorId < remote.actorId)
    );
  }
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

export const Snapshot = {
  create<T>(array?: CrdtArray<T>, object?: CrdtObject): SnapshotData<T> {
    const data: SnapshotData<T> = {};
    if (array) data.array = array.toSnapshot();
    if (object) data.object = object.toSnapshot();
    return data;
  },
  restore<T>(snapshot: SnapshotData<T>): {
    array?: CrdtArray<T>;
    object?: CrdtObject;
  } {
    const out: { array?: CrdtArray<T>; object?: CrdtObject } = {};
    if (snapshot.array) out.array = CrdtArray.fromSnapshot<T>(snapshot.array);
    if (snapshot.object) out.object = CrdtObject.fromSnapshot(snapshot.object);
    return out;
  },
};

export class Compressor {
  static compress<T>(ops: Operation<T>[]): Operation<T>[] {
    const lastUpdate = new Map<string, Operation<T>>();
    const lastMove = new Map<string, Operation<T>>();
    const inserts = new Map<string, Operation<T>>();
    const removed = new Set<string>();
    const objSets = new Map<string, Operation>();

    for (const op of ops) {
      switch (op.type) {
        case 'insert':
          inserts.set(op.targetId, op);
          break;
        case 'update':
          lastUpdate.set(op.targetId, op);
          break;
        case 'move':
          lastMove.set(op.targetId, op);
          break;
        case 'remove':
          removed.add(op.targetId);
          break;
        case 'obj_set':
          objSets.set(op.key, op);
          break;
      }
    }

    const out: Operation<T>[] = [];

    inserts.forEach((ins, id) => {
      if (removed.has(id)) return;
      const move = lastMove.get(id);
      const upd = lastUpdate.get(id);
      let current: Operation<T> = ins;
      if (upd && upd.type === 'update')
        current = { ...current, value: upd.value as T } as Operation<T>;
      if (move && move.type === 'move')
        current = { ...(current as any), pos: move.pos } as Operation<T>;
      out.push(current);
      if (
        upd &&
        upd.type === 'update' &&
        (!move || (move && upd.lamport > move.lamport))
      ) {
        out.push(upd);
      }
      if (move && move.type === 'move') out.push(move);
    });

    lastUpdate.forEach((upd, id) => {
      if (!inserts.has(id) && !removed.has(id)) out.push(upd);
    });
    lastMove.forEach((mv, id) => {
      if (!inserts.has(id) && !removed.has(id)) out.push(mv);
    });

    removed.forEach(id => {
      if (!inserts.has(id))
        out.push({
          type: 'remove',
          targetId: id,
          timestamp: 0,
          lamport: 0,
          actorId: '',
        } as Operation<T>);
    });

    objSets.forEach(setOp => out.push(setOp as Operation<T>));

    out.sort(
      (a, b) =>
        a.lamport - b.lamport ||
        (a.actorId < b.actorId ? -1 : a.actorId > b.actorId ? 1 : 0)
    );
    return out;
  }

  static gcArraySnapshot<T>(snap: ArraySnapshotData<T>): ArraySnapshotData<T> {
    const alive = snap.elements.filter(e => !e.deleted);

    alive.sort((a, b) => comparePos(a.pos, b.pos));
    return { actorId: snap.actorId, lamport: snap.lamport, elements: alive };
  }
}
