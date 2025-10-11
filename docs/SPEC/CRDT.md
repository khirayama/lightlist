# CRDT ライブラリ仕様

本ドキュメントは、フロントエンド（Web/React Native）で動作する軽量CRDTライブラリの最小実装仕様を示す。ローカル永続化は行わず、サーバサイドでの操作ログ永続化とスナップショット保存を前提とする。

## 構成

- CrdtArray<T>: 順序付き配列（要素更新はLWW）
- CrdtObject: フィールドごとの後勝ち（LWW）マップ
- OperationLog: 操作履歴を保持し、重複排除・未送信操作のエクスポート
- Snapshot: JSONスナップショットの生成/復元
- Compressor: 操作圧縮およびtombstone GC

外部依存なし。時間ソースは Date.now()。actorId は任意文字列。

## データ構造

```
interface Clock { lamport: number; timestamp: number; actorId: string }

interface CRDTElement<T> {
  id: string; // actorId:lamport
  pos: string; // 位置識別子（Base62の文字列）
  value: T;
  deleted?: boolean; // tombstone
  clock: Clock; // 値更新のLWW
}

// Operation は配列・オブジェクトの両用途に対応
// type: insert/remove/update/move/obj_set
```

pos は fractional indexing を採用。Base62文字列上で辞書順比較することで安定順序を保証する。between生成は決定的（乱数未使用）。

## API

### CrdtArray<T>

- insert(index, value)
- remove(index)
- move(from, to)
- update(index, updater)
- get(index)
- toArray()
- applyRemote(ops)
- exportOperations()
- toSnapshot() / fromSnapshot()

### CrdtObject

- set(key, value)
- update(key, updater)
- get(key)
- toJSON()
- applyRemote(ops)
- exportOperations()
- toSnapshot() / fromSnapshot()

### Snapshot

- create(array?, object?) => SnapshotData
- restore(snapshot) => { array?, object? }

### Compressor

- compress(ops): 冗長な update/move の圧縮、insert+remove の相殺、obj_set の後勝ち
- gcArraySnapshot(snap): tombstone除去

## 決定性とマージ

- Lamport時計 + actorId により LWW を決定
- pos 生成は generatePosBetween(leftPos, rightPos) で決定的
- OperationLog は actorId:lamport をキーに重複排除

## パフォーマンス指針

- 配列は pos による二分探索で挿入 O(log N)（orderedIds を使用）
- スナップショット+Compressorにより長期運用時のメモリを抑制

## 使用例（抜粋）

```ts
const a = new CrdtArray<string>({ actorId: 'A' });
a.insert(0, 'hello');
a.insert(1, 'world');
const ops = a.exportOperations();

const b = new CrdtArray<string>({ actorId: 'B' });
b.applyRemote(ops);
b.insert(1, ', ');

const merged = [...ops, ...b.exportOperations()];
const c = new CrdtArray<string>({ actorId: 'C' });
c.applyRemote(merged);
console.log(c.toArray()); // ['hello', ', ', 'world'] ただし同時更新はLWW
```

## 注意

- ライブラリは1ファイル（crdt.ts）で提供
- React Nativeでも動作可能な純粋なTypeScript
- テスト/ビルドは既存のルールに従う
