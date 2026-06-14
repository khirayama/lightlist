# データモデル

Cloud Firestore に 4 つのトップレベルコレクションを持つ。ルール本体は `firestore.rules`（リポジトリルート）を正とする。

## コレクション

### settings/{uid}

ユーザー設定。本人のみ読み書き可能。

- `theme`: `"system" | "light" | "dark"`
- `language`: サポート言語コード
- `taskInsertPosition`: `"top" | "bottom"`
- `autoSort`: `boolean`

### taskLists/{taskListId}

タスクリスト実体。

- `id`
- `name`
- `tasks`: `{ [taskId]: Task }` のマップ
- `history`: 入力候補の文字列配列（最大 300 件）
- `shareCode`: `string | null`
- `background`: `string | null`
- `memberCount`: そのリストを保持しているユーザー数
- `createdAt` / `updatedAt`

Task の構造:

- `id`
- `text`
- `completed`
- `date`: `"yyyy-MM-dd" | null`
- `order`
- `pinned`

### taskListOrder/{uid}

ユーザーごとの保持リストと表示順。本人のみ読み書き可能。

- `{ [taskListId]: { order } }`
- `createdAt` / `updatedAt`

### shareCodes/{shareCode}

共有コードから `taskListId` への逆引き。

- `taskListId`
- `createdAt`

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。
- リスト実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。
- `taskListOrder` と `taskLists` は別管理する。一方だけで順序と実体を兼ねない。

## 同期モデル

- 対象 `taskLists` は 10 件ずつ chunk に分けて購読する。
- Firestore のローカルキャッシュに実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。
- `taskLists` chunk は cache / live snapshot とも snapshot 全体を chunk 単位で反映する（差分適用しない）。
- UI 更新系は listener 反映より先に画面上の編集結果を捨てない。保存後も Firestore が同じ内容へ追いつくまで local pending 表示を優先する。詳細は [task-lists.md](./task-lists.md)。

## createdAt / updatedAt

- `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Unix epoch milliseconds の number で書き込む。
- server timestamp は使わない。Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせるため。
- 読み取り側は timestamp-like 値が混在しても `estimate` として解決し、UI へ `null` を流さない。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。
- `taskLists/{taskListId}` は、自分の `taskListOrder` に含まれるか、有効な `shareCode` がある場合に読み書きできる。
- `taskListOrder/{uid}` の本人書き込み内容は制限しない。`taskListId` を保持リストへ追加した時点で `taskLists/{taskListId}` へのアクセス根拠になる。
- `taskLists` の削除は最後の保持者（`memberCount <= 1`）のみ可能。
- `memberCount` は参加時 `+1`、離脱時 `-1` のみ許可する。
