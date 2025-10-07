import { CrdtArray, Snapshot } from './crdt';

// -------- Text array (string[]) example --------
function textArrayExample() {
  const server = new CrdtArray<string>({ actorId: 'server-text' });
  server.insert(0, 'X'); // seed to avoid identical positions

  const baseSnap = Snapshot.create(server);
  const arrA = Snapshot.restore<string>(baseSnap).array!;
  const arrB = Snapshot.restore<string>(baseSnap).array!;
  (arrA as any).actorId = 'userA-text';
  (arrB as any).actorId = 'userB-text';

  console.log('\n=== Text array: start ===');
  console.log('A0:', arrA.toArray());
  console.log('B0:', arrB.toArray());

  // Offline concurrent edits
  arrA.insert(0, 'A1'); // before X
  arrB.insert(1, 'B1'); // after X

  // Merge (exchange ops)
  const opsA1 = arrA.exportOperations();
  const opsB1 = arrB.exportOperations();
  console.log('Before merge#1');
  console.log('A1:', arrA.toArray());
  console.log('B1:', arrB.toArray());
  arrA.applyRemote(opsB1);
  arrB.applyRemote(opsA1);

  console.log('After merge#1');
  console.log('A1:', arrA.toArray());
  console.log('B1:', arrB.toArray());

  // Second round of concurrent edits
  arrA.insert(arrA.toArray().length, 'A2'); // append
  const xIdxB = arrB.toArray().indexOf('X');
  if (xIdxB >= 0) arrB.remove(xIdxB); // B deletes X

  // Merge again
  const opsA2 = arrA.exportOperations();
  const opsB2 = arrB.exportOperations();
  console.log('Before merge#2');
  console.log('A2:', arrA.toArray());
  console.log('B2:', arrB.toArray());
  arrA.applyRemote(opsB2);
  arrB.applyRemote(opsA2);

  console.log('After merge#2');
  console.log('A2:', arrA.toArray());
  console.log('B2:', arrB.toArray());
}

// -------- Object array ({ id, name })[] example --------
interface Item { id: string; name: string }

function objectArrayExample() {
  const server = new CrdtArray<Item>({ actorId: 'server-objarr' });
  server.insert(0, { id: 'i1', name: 'Item' });

  const baseSnap = Snapshot.create(server);
  const arrA = Snapshot.restore<Item>(baseSnap).array!;
  const arrB = Snapshot.restore<Item>(baseSnap).array!;
  (arrA as any).actorId = 'userA-objarr';
  (arrB as any).actorId = 'userB-objarr';

  const findIndexById = (arr: CrdtArray<Item>, id: string) =>
    arr.toArray().findIndex(x => x.id === id);

  console.log('\n=== Object array: start ===');
  console.log('A0:', arrA.toArray());
  console.log('B0:', arrB.toArray());

  // Concurrent updates to the same object (LWW by lamport, then actorId)
  const idxA = findIndexById(arrA, 'i1');
  const idxB = findIndexById(arrB, 'i1');
  if (idxA >= 0) arrA.update(idxA, v => ({ ...v, name: 'Item A' }));
  if (idxB >= 0) arrB.update(idxB, v => ({ ...v, name: 'Item B' }));

  // Also insert different items concurrently
  arrA.insert(1, { id: 'i2', name: 'A-only' });
  arrB.insert(0, { id: 'i3', name: 'B-only' });

  // Merge
  const opsA1 = arrA.exportOperations();
  const opsB1 = arrB.exportOperations();
  console.log('Before merge');
  console.log('A1:', arrA.toArray());
  console.log('B1:', arrB.toArray());
  arrA.applyRemote(opsB1);
  arrB.applyRemote(opsA1);

  console.log('After merge');
  console.log('A1:', arrA.toArray());
  console.log('B1:', arrB.toArray());

  // Show deterministic value for i1
  const pickName = (arr: CrdtArray<Item>) => arr.toArray().find(x => x.id === 'i1')?.name;
  console.log('i1 name A/B:', pickName(arrA), '/', pickName(arrB));
}

textArrayExample();
objectArrayExample();
