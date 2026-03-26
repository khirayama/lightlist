# タスクリスト

## 概要

- タスクリストの状態は `taskLists` と `taskListOrder` に分かれます。
- 表示順は `taskListOrder/{uid}`、実体は `taskLists/{taskListId}` が正です。
- 共有中のリストも同じ `taskLists` を参照し、閲覧専用モードはありません。

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
  - 各 `taskListId -> { order }`
  - `createdAt`
  - `updatedAt`

## 順序管理

- タスクリスト並び替えは `updateTaskListOrder()` で常に全件を `1.0` 始まりの連番へ振り直します。
- タスク並び替えは `updateTasksOrder()` で原則 1 件だけ `order` を更新します。
- 前後ギャップを使えない場合のみ、対象リスト内の全タスクを再採番します。
- タスク追加は挿入後に順序を正規化します。
- `settings.autoSort` が有効な場合は、追加・更新・削除後の並びを `未完了 -> 日付 -> 現在 order` で整えます。

## タスク操作

- `addTask()` は入力文から日付表現を解析し、本文と日付に分離します。
- 日付解析は現在の UI 言語を基準に行います。
- 履歴 `history` は重複を潰しながら先頭追加し、最大 300 件を保持します。
- タスク追加入力は 2 文字以上で `history` 由来の補完候補を表示します。
- 補完候補を選ぶと入力欄へ反映するだけでなく、その場で `addTask()` を実行します。
- `updateTask()` は `autoSort` が無効なら対象タスクだけ更新します。
- `deleteTask()` は `autoSort` が無効なら対象タスクだけ削除します。
- `deleteCompletedTasks()` は完了済みタスクを削除し、残りを再採番します。

## リスト操作

- `createTaskList(name, background)` は新しい `taskLists` 実体と `taskListOrder` を同時に更新します。
- `updateTaskList()` は `name` と `background` だけを更新します。
- `deleteTaskList()` は「実体を必ず削除する」操作ではありません。
  - 先に自分の `taskListOrder` から外します。
  - `memberCount` を 1 減らします。
  - 0 以下になったときだけ `taskLists` 実体を削除します。
  - `shareCode` があれば同時に `shareCodes` も削除します。

## 共有

- 共有コードは `generateShareCode()` で 8 文字の英数字大文字を発行します。
- 既存コードがあれば置き換えます。
- `removeShareCode()` は `taskLists.shareCode` を `null` に戻し、`shareCodes/{code}` を削除します。
- `fetchTaskListIdByShareCode()` はコードから `taskListId` だけを解決します。
- `addSharedTaskListToOrder()` は次を transaction で行います。
  - 自分の `taskListOrder` に末尾追加
  - `taskLists.memberCount` を `+1`

## 共有権限の固定仕様

- 共有 URL を知っているユーザーは未認証でも共有リストを閲覧・編集できます。
- 共有ページから自分の一覧へ追加する操作だけは認証が必要です。
- production readiness 評価で挙がった認可モデル再設計は 2026-03 時点で対応しません。

## Web

- メイン画面は [app.tsx](/home/khirayama/Works/lightlist-poc/apps/web/src/pages/app.tsx) です。
- タスクリスト詳細は `TaskListCard`、一覧と作成・参加は `DrawerPanel` に集約しています。
- モバイルは Drawer、広い画面は常設サイドバーです。
- カルーセルは言語方向に追従し、RTL 時も配列順の index を保ったまま表示だけ反転します。
- 共有画面は [sharecodes/[sharecode].tsx](/home/khirayama/Works/lightlist-poc/apps/web/src/pages/sharecodes/[sharecode].tsx) です。
  - 共有コードから `taskListId` を解決
  - `appStore.subscribeToSharedTaskList()` で購読
  - ログイン済みなら自分の一覧へ追加可能

## iOS

- ネイティブ実装の一覧画面は `taskListOrder` の順でタスクリストを表示し、タップ時に選択した `taskListId` を詳細画面へ渡します。
- 詳細画面は同じ順序のまま横ページングし、一覧から開いた `taskListId` を初期ページにします。
- iOS は `TabView(.page)` を使い、ページ位置と選択中 `taskListId` を双方向に同期します。
- 詳細画面の v1 は閲覧専用で、タスクリスト名、件数、task 一覧、空状態を表示します。
- ページインジケータは 2 件以上のときだけ表示し、先頭・末尾ではそれ以上スクロールしません。
- iOS のタスクリスト並び替えとタスク並び替えは、行自身のローカル座標ではなく親 `ScrollView` の named coordinate space を基準にドラッグ量を計算します。
- iOS の並び替え判定に使う計測値は各行の高さのみです。`frame(in:)` による位置監視は使わず、ドラッグ中の再描画ループを避けます。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書きできます。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能です。`list` は許可しません。
- `taskLists/{taskListId}` は次のどちらかで読めます。
  - 自分の `taskListOrder` に含まれる
  - 有効な `shareCode` が紐付いている
- `taskLists` の削除は最後の保持者だけ可能です。
- `memberCount` は通常固定で、参加時 `+1`、離脱時 `-1` のみ許可します。
