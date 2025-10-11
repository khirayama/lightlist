const POS_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const POS_BASE = POS_ALPHABET.length;
function comparePos(a, b) {
    const len = Math.max(a.length, b.length);
    for (let i = 0; i < len; i++) {
        const ca = a.charCodeAt(i);
        const cb = b.charCodeAt(i);
        if (Number.isNaN(ca))
            return -1;
        if (Number.isNaN(cb))
            return 1;
        if (ca === cb)
            continue;
        return ca < cb ? -1 : 1;
    }
    return 0;
}
function charToDigit(ch) {
    const idx = POS_ALPHABET.indexOf(ch);
    if (idx === -1)
        throw new Error(`Invalid pos char: ${ch}`);
    return idx + 1;
}
function digitToChar(d) {
    if (d <= 0 || d > POS_BASE)
        throw new Error(`Invalid digit: ${d}`);
    return POS_ALPHABET[d - 1];
}
function decodePos(pos) {
    const out = [];
    for (let i = 0; i < pos.length; i++)
        out.push(charToDigit(pos[i]));
    return out;
}
function encodePos(digits) {
    let out = '';
    for (const d of digits)
        out += digitToChar(d);
    return out;
}
function generatePosBetween(a, b) {
    const A = a ? decodePos(a) : [];
    const B = b ? decodePos(b) : [];
    const boundaryLow = 0;
    const boundaryHigh = POS_BASE + 1;
    const result = [];
    let i = 0;
    while (true) {
        const ai = i < A.length ? A[i] : boundaryLow;
        const bi = i < B.length ? B[i] : boundaryHigh;
        if (bi - ai > 1) {
            const mid = Math.floor((ai + bi) / 2);
            if (mid <= 0 || mid >= boundaryHigh) {
                result.push(ai);
                i++;
                continue;
            }
            if (mid > 0 && mid <= POS_BASE)
                result.push(mid);
            return encodePos(result);
        }
        if (ai > 0 && ai <= POS_BASE)
            result.push(ai);
        i++;
    }
}
function makeElemId(actorId, lamport) {
    return `${actorId}:${lamport}`;
}
export class OperationLog {
    unsent = [];
    applied = new Set();
    record(op) {
        const key = `${op.actorId}:${op.lamport}`;
        if (this.applied.has(key))
            return;
        this.applied.add(key);
        this.unsent.push(op);
    }
    markApplied(op) {
        const key = `${op.actorId}:${op.lamport}`;
        this.applied.add(key);
    }
    applyRemote(ops) {
        const newOnes = [];
        for (const op of ops) {
            const key = `${op.actorId}:${op.lamport}`;
            if (this.applied.has(key))
                continue;
            this.applied.add(key);
            newOnes.push(op);
        }
        return newOnes;
    }
    exportOperations() {
        const out = this.unsent.slice();
        this.unsent.length = 0;
        return out;
    }
}
export class CrdtArray {
    actorId;
    lamport = 0;
    elementsById = new Map();
    orderedIds = [];
    log = new OperationLog();
    constructor(params) {
        this.actorId = params.actorId;
    }
    tick(remoteLamport) {
        this.lamport = Math.max(this.lamport, remoteLamport ?? 0) + 1;
        return {
            lamport: this.lamport,
            timestamp: Date.now(),
            actorId: this.actorId,
        };
    }
    indexToNeighbors(index) {
        const visible = this.visibleIds();
        const leftId = index > 0 ? visible[index - 1] : undefined;
        const rightId = index < visible.length ? visible[index] : undefined;
        return { left: leftId, right: rightId };
    }
    visibleIds() {
        const ids = [];
        for (const id of this.orderedIds) {
            const el = this.elementsById.get(id);
            if (el && !el.deleted)
                ids.push(id);
        }
        return ids;
    }
    findOrderedInsertIndexByPos(pos) {
        let lo = 0;
        let hi = this.orderedIds.length;
        while (lo < hi) {
            const mid = (lo + hi) >>> 1;
            const midEl = this.elementsById.get(this.orderedIds[mid]);
            if (!midEl) {
                lo = mid + 1;
                continue;
            }
            const cmp = comparePos(midEl.pos, pos);
            if (cmp < 0)
                lo = mid + 1;
            else
                hi = mid;
        }
        return lo;
    }
    insertElement(el) {
        this.elementsById.set(el.id, el);
        const idx = this.findOrderedInsertIndexByPos(el.pos);
        this.orderedIds.splice(idx, 0, el.id);
    }
    getElementByVisibleIndex(index) {
        const visible = this.visibleIds();
        const id = visible[index];
        if (!id)
            throw new Error('Index out of bounds');
        const el = this.elementsById.get(id);
        if (!el)
            throw new Error('Element not found');
        return el;
    }
    insert(index, value) {
        const clock = this.tick();
        const { left, right } = this.indexToNeighbors(index);
        const leftPos = left ? this.elementsById.get(left)?.pos : undefined;
        const rightPos = right ? this.elementsById.get(right)?.pos : undefined;
        const pos = generatePosBetween(leftPos, rightPos);
        const id = makeElemId(clock.actorId, clock.lamport);
        const el = { id, pos, value, clock };
        this.insertElement(el);
        const op = {
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
    remove(index) {
        const el = this.getElementByVisibleIndex(index);
        if (el.deleted)
            return;
        const clock = this.tick();
        el.deleted = true;
        const op = {
            type: 'remove',
            targetId: el.id,
            timestamp: clock.timestamp,
            lamport: clock.lamport,
            actorId: clock.actorId,
        };
        this.log.record(op);
    }
    move(from, to) {
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
        if (currentIndex >= 0)
            this.orderedIds.splice(currentIndex, 0);
        if (currentIndex >= 0)
            this.orderedIds.splice(currentIndex, 1);
        el.pos = newPos;
        const idx = this.findOrderedInsertIndexByPos(newPos);
        this.orderedIds.splice(idx, 0, el.id);
        const op = {
            type: 'move',
            targetId: el.id,
            pos: newPos,
            timestamp: clock.timestamp,
            lamport: clock.lamport,
            actorId: clock.actorId,
        };
        this.log.record(op);
    }
    update(index, updater) {
        const el = this.getElementByVisibleIndex(index);
        const clock = this.tick();
        const newValue = updater(el.value);
        if (el.clock.lamport < clock.lamport ||
            (el.clock.lamport === clock.lamport && el.clock.actorId < clock.actorId)) {
            el.value = newValue;
            el.clock = clock;
        }
        const op = {
            type: 'update',
            targetId: el.id,
            value: newValue,
            timestamp: clock.timestamp,
            lamport: clock.lamport,
            actorId: clock.actorId,
        };
        this.log.record(op);
    }
    get(index) {
        const el = this.getElementByVisibleIndex(index);
        return el.value;
    }
    toArray() {
        const out = [];
        for (const id of this.orderedIds) {
            const el = this.elementsById.get(id);
            if (el && !el.deleted)
                out.push(el.value);
        }
        return out;
    }
    applyRemote(ops) {
        const fresh = this.log.applyRemote(ops);
        for (const op of fresh) {
            this.tick(op.lamport);
            switch (op.type) {
                case 'insert': {
                    if (!op.targetId || !op.pos)
                        break;
                    if (this.elementsById.has(op.targetId))
                        break;
                    const el = {
                        id: op.targetId,
                        pos: op.pos,
                        value: op.value,
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
                    const el = this.elementsById.get(op.targetId);
                    if (el)
                        el.deleted = true;
                    break;
                }
                case 'update': {
                    const el = this.elementsById.get(op.targetId);
                    if (!el)
                        break;
                    const remoteClock = {
                        lamport: op.lamport,
                        timestamp: op.timestamp,
                        actorId: op.actorId,
                    };
                    const local = el.clock;
                    if (local.lamport < remoteClock.lamport ||
                        (local.lamport === remoteClock.lamport &&
                            local.actorId < remoteClock.actorId)) {
                        el.value = op.value;
                        el.clock = remoteClock;
                    }
                    break;
                }
                case 'move': {
                    const el = this.elementsById.get(op.targetId);
                    if (!el || !op.pos)
                        break;
                    const currentIndex = this.orderedIds.indexOf(el.id);
                    if (currentIndex >= 0)
                        this.orderedIds.splice(currentIndex, 1);
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
    exportOperations() {
        return this.log.exportOperations();
    }
    toSnapshot() {
        const elements = [];
        for (const id of this.orderedIds) {
            const el = this.elementsById.get(id);
            if (el)
                elements.push({ ...el });
        }
        return {
            actorId: this.actorId,
            lamport: this.lamport,
            elements,
        };
    }
    static fromSnapshot(data) {
        const arr = new CrdtArray({ actorId: data.actorId });
        arr.lamport = data.lamport;
        for (const el of data.elements) {
            arr.elementsById.set(el.id, { ...el });
            arr.orderedIds.push(el.id);
        }
        arr.orderedIds.sort((a, b) => {
            const ea = arr.elementsById.get(a);
            const eb = arr.elementsById.get(b);
            return comparePos(ea.pos, eb.pos);
        });
        return arr;
    }
}
export class CrdtObject {
    actorId;
    lamport = 0;
    fields = new Map();
    log = new OperationLog();
    constructor(params) {
        this.actorId = params.actorId;
    }
    tick(remoteLamport) {
        this.lamport = Math.max(this.lamport, remoteLamport ?? 0) + 1;
        return {
            lamport: this.lamport,
            timestamp: Date.now(),
            actorId: this.actorId,
        };
    }
    set(key, value) {
        const clock = this.tick();
        const prev = this.fields.get(key);
        if (!prev || this.isRemoteNewer(prev.clock, clock)) {
            this.fields.set(key, { value, clock });
        }
        const op = {
            type: 'obj_set',
            key,
            value,
            timestamp: clock.timestamp,
            lamport: clock.lamport,
            actorId: clock.actorId,
        };
        this.log.record(op);
    }
    update(key, updater) {
        const cur = this.fields.get(key)?.value;
        this.set(key, updater(cur));
    }
    get(key) {
        return this.fields.get(key)?.value;
    }
    toJSON() {
        const out = {};
        this.fields.forEach((v, k) => {
            out[k] = v.value;
        });
        return out;
    }
    applyRemote(ops) {
        const fresh = this.log.applyRemote(ops);
        for (const op of fresh) {
            this.tick(op.lamport);
            if (op.type !== 'obj_set')
                continue;
            const remoteClock = {
                lamport: op.lamport,
                timestamp: op.timestamp,
                actorId: op.actorId,
            };
            const prev = this.fields.get(op.key);
            if (!prev || this.isRemoteNewer(prev.clock, remoteClock)) {
                this.fields.set(op.key, { value: op.value, clock: remoteClock });
            }
        }
        return fresh;
    }
    exportOperations() {
        return this.log.exportOperations();
    }
    toSnapshot() {
        const fields = {};
        this.fields.forEach((v, k) => {
            fields[k] = { value: v.value, clock: { ...v.clock } };
        });
        return { actorId: this.actorId, lamport: this.lamport, fields };
    }
    static fromSnapshot(data) {
        const obj = new CrdtObject({ actorId: data.actorId });
        obj.lamport = data.lamport;
        for (const [k, v] of Object.entries(data.fields))
            obj.fields.set(k, { value: v.value, clock: { ...v.clock } });
        return obj;
    }
    isRemoteNewer(local, remote) {
        return (local.lamport < remote.lamport ||
            (local.lamport === remote.lamport && local.actorId < remote.actorId));
    }
}
export const Snapshot = {
    create(array, object) {
        const data = {};
        if (array)
            data.array = array.toSnapshot();
        if (object)
            data.object = object.toSnapshot();
        return data;
    },
    restore(snapshot) {
        const out = {};
        if (snapshot.array)
            out.array = CrdtArray.fromSnapshot(snapshot.array);
        if (snapshot.object)
            out.object = CrdtObject.fromSnapshot(snapshot.object);
        return out;
    },
};
export class Compressor {
    static compress(ops) {
        const lastUpdate = new Map();
        const lastMove = new Map();
        const inserts = new Map();
        const removed = new Set();
        const objSets = new Map();
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
        const out = [];
        inserts.forEach((ins, id) => {
            if (removed.has(id))
                return;
            const move = lastMove.get(id);
            const upd = lastUpdate.get(id);
            let current = ins;
            if (upd && upd.type === 'update')
                current = { ...current, value: upd.value };
            if (move && move.type === 'move')
                current = { ...current, pos: move.pos };
            out.push(current);
            if (upd &&
                upd.type === 'update' &&
                (!move || (move && upd.lamport > move.lamport))) {
                out.push(upd);
            }
            if (move && move.type === 'move')
                out.push(move);
        });
        lastUpdate.forEach((upd, id) => {
            if (!inserts.has(id) && !removed.has(id))
                out.push(upd);
        });
        lastMove.forEach((mv, id) => {
            if (!inserts.has(id) && !removed.has(id))
                out.push(mv);
        });
        removed.forEach(id => {
            if (!inserts.has(id))
                out.push({
                    type: 'remove',
                    targetId: id,
                    timestamp: 0,
                    lamport: 0,
                    actorId: '',
                });
        });
        objSets.forEach(setOp => out.push(setOp));
        out.sort((a, b) => a.lamport - b.lamport ||
            (a.actorId < b.actorId ? -1 : a.actorId > b.actorId ? 1 : 0));
        return out;
    }
    static gcArraySnapshot(snap) {
        const alive = snap.elements.filter(e => !e.deleted);
        alive.sort((a, b) => comparePos(a.pos, b.pos));
        return { actorId: snap.actorId, lamport: snap.lamport, elements: alive };
    }
}
