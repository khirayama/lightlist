# タスクリスト

## データモデル

- `taskLists/{taskListId}`
  - `id`
  - `name`
  - `tasks`
  - `history`
  - `shareCode`
  - `background`
  - `memberCount`
  - `createdAt`
  - `updatedAt`
- `taskListOrder/{uid}`
  - `{ [taskListId]: { order } }`
  - `createdAt`
  - `updatedAt`
- `shareCodes/{shareCode}`
  - `taskListId`
  - `createdAt`

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。
- 実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。
- `memberCount` はそのリストを保持しているユーザー数。

## 購読

- Web は `taskListOrder/{uid}` を購読して対象 `taskListId` を解決する。
- 対象 `taskLists` は 10 件ずつ chunk に分けて購読する。
- 共有ページは `subscribeToSharedTaskList(taskListId)` で個別購読する。
- iOS / Android も `taskListOrder` と `taskLists` を別購読し、順序付きリストを組み立てる。

## タスクリスト操作

- `createTaskList(name, background)` は `taskLists` 実体の作成と `taskListOrder` への追加を同時に行う。
- `updateTaskList()` は `name` と `background` を更新する。
- `updateTaskListOrder()` は並び替え後に `1.0` 始まりの連番へ振り直す。
- `deleteTaskList()` は次を transaction で行う。
  - 自分の `taskListOrder` から対象を外す。
  - `memberCount` を 1 減らす。
  - `memberCount` が 0 以下になる場合だけ `taskLists` 実体を削除する。
  - 現在の `shareCode` があれば `shareCodes/{code}` も削除する。

## タスク操作

- `tasks` は `id`, `text`, `completed`, `date`, `order` を持つ。
- Web の `addTask()` は入力先頭の日付表現を解析し、`text` と `date` に分離する。
- 日付解析は `yyyy-mm-dd` / `mm-dd` / `mm/dd` / `mm.dd` と各言語の相対表現を扱う。
- 数字はアラビア数字に加えてアラビア語、ペルシャ語、デーヴァナーガリー数字を正規化する。
- `taskInsertPosition` が `top` の場合は先頭、`bottom` の場合は末尾へ追加する。
- `autoSort` 有効時は `未完了 -> date -> order` の順で並べ直す。
- `history` は重複を除きつつ先頭追加し、最大 300 件を保持する。
- `updateTasksOrder()` は通常は対象 task の `order` だけを更新し、必要時のみ再採番する。
- `deleteCompletedTasks()` は完了済み task を削除し、残りを再採番する。

## 共有

- `generateShareCode()` は 8 文字の英数字大文字コードを生成する。
- 既存共有コードがあれば削除してから新しいコードへ置き換える。
- `removeShareCode()` は `taskLists.shareCode` を `null` に戻し、対応する `shareCodes` ドキュメントを削除する。
- `fetchTaskListIdByShareCode()` は共有コードから `taskListId` を解決する。
- `addSharedTaskListToOrder()` は transaction で次を行う。
  - 自分の `taskListOrder` に末尾追加する。
  - `memberCount` を `+1` する。

## 共有権限

- 共有 URL を知っているユーザーは、未認証でも共有リストを閲覧・編集できる。
- 自分の一覧へ追加する操作だけは認証が必要。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。
- `taskLists/{taskListId}` は、自分の `taskListOrder` に含まれるか、有効な `shareCode` がある場合に読み書きできる。
- `taskLists` の削除は最後の保持者のみ可能。
- `memberCount` は通常据え置きで、参加時 `+1`、離脱時 `-1` のみ許可する。
