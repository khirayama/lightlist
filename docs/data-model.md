# データモデル

Cloud Firestore に 4 つのトップレベルコレクションを持つ。ルール本体は `firestore.rules`（リポジトリルート）を正とする。

## コレクション

### settings/{uid}

ユーザー設定。本人のみ読み書き可能。

- `theme`: `"system" | "light" | "dark"`。欠損・`null` は `"system"` として扱う。
- `language`: サポート言語コード。欠損・`null` は `"ja"` として扱う。
- `taskInsertPosition`: `"top" | "bottom"`。欠損・`null` は `"top"` として扱う。
- `autoSort`: `boolean`。新規作成時の既定値は `true`。欠損・`null` も `true` として扱い、明示された `false` はそのまま保持する。
- `startupView`: `"taskList" | "calendar" | "taskLists"`。欠損・不正値は `"taskList"` として扱う。
- `createdAt` / `updatedAt`: 任意の Unix epoch milliseconds。設定の表示・同期に必須ではなく、欠損していても上記の既定値で設定を解決する。

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

### taskLists/{taskListId}/members/{uid}

タスクリストへの加入証明。表示順とは独立した認可の正本とする。

- `joinedAt`: 加入時の Unix epoch milliseconds
- `joinCode`: 所有者作成時は `null`、共有コード加入時は加入に使った正規化済みコード

Task の構造:

- `id`
- `text`: 文字列。日付ありまたはピン留めの場合は空文字を許可する
- `completed`
- `date`: 実在する端末ローカルの暦日を表す厳密な `"yyyy-MM-dd" | null`。不正な形式・存在しない日付は読み取り時に日付なしとして扱う
- `order`
- `pinned`

Task は「trim 後に 1 文字以上の `text`」「空でない `date`」「`pinned == true`」のいずれかを満たす。いずれも満たさないデータは不正 task として一覧・カレンダー・件数から除外し、既存 task の更新でこの状態になった場合は `tasks.<id>` を削除する。

Task の decode では `id` / `text` / `completed` / `date` / `order` / `pinned` の全fieldと型を検証する。他端末で削除された task ID へ古い端末がドット記法のfield更新を送ると、Firestore上で一部fieldだけのmapが再生成されることがある。この部分mapは task として表示せず、cache由来でもpending write由来でもないserver確定snapshotで検出した場合に `tasks.<id>` を削除する。

Web は `settings` / `taskListOrder` / `taskLists` / `shareCodes` の購読・単発取得を共通の境界検証へ通し、トップレベルfieldと動的mapの全要素を検証してからドメインモデルへ渡す。不正な `settings` / `taskListOrder` は読み込みエラーとし、不正な `taskLists` document は当該documentだけを表示対象から外す。task map 内の不正要素はリスト全体を無効にせず除外し、server確定snapshotで自動削除する。

iOS / Android の `taskLists` と `settings` の読み取りは型付きFirestoreドキュメントへ変換してからドメインモデルへ渡す。トップレベルの `taskLists` ドキュメントが型不正の場合は当該リストを表示対象から外し、空レコードへ劣化させない。動的なキーを持つ `taskListOrder`、部分mapの検証・削除、ドット記法の差分更新だけはFirestore APIの境界で動的データを使う。`theme` / `language` / `taskInsertPosition` / `autoSort` が不正な型・値の場合は設定画面を読み込みエラーとして扱い、`startupView` の不正値だけは `taskList` に正規化する。

- Android の release R8 縮小後も、リフレクションで変換する `FirestoreSettingsRecord` のクラス名・フィールド・アクセサ・no-arg constructor を保持する。指定は `apps/android/app/proguard-rules.pro` を正とする。

### taskListOrder/{uid}

ユーザーごとの保持リストと表示順。本人のみ読み書き可能。認可の根拠には使わない。

- `{ [taskListId]: { order } }`
- `createdAt` / `updatedAt`

### shareCodes/{shareCode}

共有コードから `taskListId` への逆引き。

- `taskListId`
- `createdAt`

## 参照関係

- 表示順は `taskListOrder/{uid}` が正。保持権限は `taskLists/{taskListId}/members/{uid}` が正。
- リスト実体は `taskLists/{taskListId}` が正。
- 共有コードは `shareCodes/{shareCode}` から `taskListId` を引く。
- `taskListOrder` と `taskLists` は別管理する。一方だけで順序と実体を兼ねない。加入・離脱時は order と membership、`memberCount` を同一 batch で更新する。

## 同期モデル

- 対象 `taskLists` は 10 件ずつ chunk に分けて購読する。
- `taskListOrder/{uid}` の ID は `taskLists/{taskListId}/members/{uid}` の存在を確認してから chunk 購読へ渡す。order にだけ残る ID は保持権限を持たないため購読対象から除外し、無権限 document を含む `whereIn` クエリ全体の拒否を防ぐ。
- Firestore のローカルキャッシュに実データがある場合は、placeholder / skeleton より cache hydrate 済み実データ表示を優先する。
- 起動時は永続 Firestore cache を有効にし、settings / taskListOrder / taskLists の cache 読み取りを初回 UI 構築と並行して開始する。iOS は cache 読み取りを並列実行し、Android は翻訳 JSON の preload と同じ background thread から開始する。
- taskListOrder の順序付き ID は uid ごとに Web の localStorage、iOS の UserDefaults、Android の SharedPreferences へ保持する。次回起動では Firestore の taskListOrder snapshot を待たずに、その ID から taskLists の chunk 先読み・購読を開始し、後続 snapshot で ID と表示を更新する。
- Web の通常購読は listener が返す初回 cache snapshot をそのまま hydrate に使い、同じ参照への明示的な cache get を重ねない。起動前 warm-up の cache get は IndexedDB と Firestore client の初期化だけを目的とする。
- settings listener は metadata change を受け取り、cache snapshot で即時表示を更新する。server 確定かつ pending write なしの snapshot だけを同期復旧・通常のキャッシュ更新の確定点とする。iOS の `startupView` だけは設定選択時に起動用 UserDefaults も即時更新し、書き込み失敗時は直前値へ戻す。設定画面の書き込み失敗は画面に表示し、更新中は別の設定変更を受け付けない。
- `taskLists` chunk は cache / live snapshot とも snapshot 全体を chunk 単位で反映する（差分適用しない）。
- Firestore listener がエラーを返した場合は、現在の購読を解除して同じ参照を再登録する。再試行は 1 秒から始め、2 倍ずつ最大 30 秒まで待ち、画面・ユーザーの購読スコープが終了するまで継続する。cache snapshot は復旧扱いにせず、server snapshot の受信で待ち時間を初期化する。
- UI 更新系は listener 反映より先に画面上の編集結果を捨てない。保存後も Firestore が同じ内容へ追いつくまで local pending 表示を優先する。詳細は [task-lists.md](./task-lists.md)。
- mutation の差分計算は server snapshot を優先し、オフライン時だけ cache snapshot にフォールバックする。オンライン中に古い cache を正として共同編集の変更を上書きしない。
- taskLists listener はmetadata changeを受け取り、部分mapの自動除去は `isFromCache/fromCache == false` かつ `hasPendingWrites == false` のsnapshotだけで行う。cacheの古い状態を根拠にserverデータを削除しない。

## createdAt / updatedAt

- `settings` / `taskLists` / `taskListOrder` / `shareCodes` の `createdAt` / `updatedAt` は Unix epoch milliseconds の number で書き込む。`settings` の時刻 field だけは表示・同期に必須ではない。
- server timestamp は使わない。Firestore Rules の `int` 型検証と pending snapshot の安定性に合わせるため。
- 読み取り側は timestamp-like 値が混在しても `estimate` として解決し、UI へ `null` を流さない。

## Firestore ルール

- `settings/{uid}` と `taskListOrder/{uid}` は本人のみ読み書き可能。
- `shareCodes/{shareCode}` は `get` のみ誰でも可能で、`list` は不可。作成は認証済みかつ対象リストを保持しているユーザーに限り、さらに同一 commit で `taskLists/{taskListId}.shareCode == shareCode` になることを要求する。更新は不可。
- `taskLists/{taskListId}` は、自分の membership document が存在するか、有効な `shareCode` がある場合に読み書きできる。
- `taskLists/{taskListId}` は共有コードを知っているだけでは更新できない。共有コードは未参加ユーザーのプレビュー読み取りに限り、更新には membership document が必要。
- `taskLists.shareCode` は `null` か `^[A-Z0-9]{8}$` のみ許可し、新しい値は同一 commit で作成される `shareCodes` doc と一致していなければならない。新規作成時は `null` 固定。
- `taskListOrder/{uid}` は表示順だけを保持し、本人の書き込み内容が `taskLists/{taskListId}` のアクセス権を付与することはない。新規作成・共有コード加入時は membership document の作成を同一 batch に含める。
- `taskLists` の削除は最後の保持者（`memberCount <= 1`）のみ可能。
- `memberCount` は参加時 `+1`、離脱時 `-1` のみ許可する。

## membership 移行

membership document 導入前に作成された既存リストには、信頼できる管理用 Admin SDK から `taskListOrder/{uid}` と `taskLists/{taskListId}.memberCount` を照合して、保持ユーザーごとの `taskLists/{taskListId}/members/{uid}` を backfill する。`taskListOrder` に残る実体不明の ID は membership を作成せず、実体の `memberCount` は backfill した membership 数へ補正する。

移行完了と件数照合を確認してから Firestore Rules をデプロイする。クライアント SDK には既存リストを安全に認定する権限がないため、Rules デプロイを先行すると既存ユーザーのリストが読めなくなる。
